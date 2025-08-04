import Imap from "imap";
import { simpleParser } from "mailparser";
import { db } from "../db";
import { emails, customers } from "@shared/schema";
import { eq } from "drizzle-orm";

interface TimwebMailConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  secure: boolean;
}

export class TimwebMailService {
  private imap: Imap;
  private config: TimwebMailConfig;
  private isConnected = false;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.config = {
      host: process.env.TIMWEB_MAIL_HOST || "",
      port: parseInt(process.env.TIMWEB_MAIL_PORT || "993"),
      user: process.env.TIMWEB_MAIL_USER || "",
      password: process.env.TIMWEB_MAIL_PASSWORD || "",
      secure: process.env.TIMWEB_MAIL_SECURE === "true",
    };

    this.imap = new Imap({
      host: this.config.host,
      port: this.config.port,
      tls: this.config.secure,
      user: this.config.user,
      password: this.config.password,
      keepalive: true,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.imap.once("ready", () => {
      console.log("📧 Connected to Timweb mail server");
      this.isConnected = true;
      this.openInbox();
    });

    this.imap.once("error", (err: Error) => {
      console.error("📧 IMAP connection error:", err.message);
      this.isConnected = false;
    });

    this.imap.once("end", () => {
      console.log("📧 IMAP connection ended");
      this.isConnected = false;
    });
  }

  public async startEmailMonitoring() {
    if (!this.config.host || !this.config.user || !this.config.password) {
      console.error("📧 Timweb mail configuration is incomplete");
      console.error("📧 Missing configuration:", {
        host: !this.config.host ? "missing" : "configured",
        user: !this.config.user ? "missing" : "configured", 
        password: !this.config.password ? "missing" : "configured"
      });
      return;
    }

    try {
      console.log(`📧 Starting Timweb email monitoring with config:`, {
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        secure: this.config.secure
      });
      
      this.imap.connect();
      
      // Check for new emails every 30 seconds
      this.checkInterval = setInterval(() => {
        if (this.isConnected) {
          this.checkForNewEmails();
        }
      }, 30000);
    } catch (error) {
      console.error("📧 Failed to start email monitoring:", error);
    }
  }

  public stopEmailMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    if (this.isConnected) {
      this.imap.end();
    }
  }

  private openInbox() {
    this.imap.openBox("INBOX", false, (err, box) => {
      if (err) {
        console.error("📧 Failed to open inbox:", err);
        return;
      }
      
      console.log(`📧 Inbox opened, ${box.messages.total} total messages`);
      this.checkForNewEmails();
    });
  }

  private checkForNewEmails() {
    // Search for unseen emails from the last 7 days
    const searchCriteria = [
      "UNSEEN",
      ["SINCE", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)]
    ];

    this.imap.search(searchCriteria, (err, uids) => {
      if (err) {
        console.error("📧 Email search error:", err);
        return;
      }

      if (!uids || uids.length === 0) {
        return;
      }

      console.log(`📧 Found ${uids.length} new emails`);
      
      const fetch = this.imap.fetch(uids, {
        bodies: "",
        markSeen: true,
        struct: true
      });

      fetch.on("message", (msg, seqno) => {
        this.processEmailMessage(msg, seqno);
      });

      fetch.once("error", (err) => {
        console.error("📧 Fetch error:", err);
      });
    });
  }

  private processEmailMessage(msg: any, seqno: number) {
    let emailBuffer = "";

    msg.on("body", (stream: any) => {
      stream.on("data", (chunk: any) => {
        emailBuffer += chunk.toString("utf8");
      });
    });

    msg.once("end", async () => {
      try {
        const parsed = await simpleParser(emailBuffer);
        await this.saveEmailToDatabase(parsed);
      } catch (error) {
        console.error("📧 Error processing email:", error);
      }
    });
  }

  private async saveEmailToDatabase(parsed: any) {
    try {
      const fromEmail = parsed.from?.text || parsed.from?.value?.[0]?.address || "";
      const subject = parsed.subject || "No Subject";
      const body = parsed.text || parsed.html || "";

      // Skip non-business emails (basic filtering)
      if (this.isSpamOrNonBusiness(subject, body, fromEmail)) {
        console.log(`📧 Skipping non-business email: ${subject}`);
        return;
      }

      // Find or create customer
      let customer = await this.findOrCreateCustomer(fromEmail, parsed);
      
      // Save email to database
      const [savedEmail] = await db
        .insert(emails)
        .values({
          fromEmail,
          subject,
          body: body.substring(0, 5000), // Limit body length
          status: "pending",
          customerId: customer.id,
          receivedAt: new Date(),
        })
        .returning();

      console.log(`📧 Saved email: ${subject} from ${fromEmail}`);

      // Process the email for aviation parts requests
      await this.processAviationPartsRequest(savedEmail, body);

    } catch (error) {
      console.error("📧 Error saving email to database:", error);
    }
  }

  private async findOrCreateCustomer(email: string, parsed: any) {
    // Try to find existing customer
    const [existingCustomer] = await db
      .select()
      .from(customers)
      .where(eq(customers.email, email));

    if (existingCustomer) {
      return existingCustomer;
    }

    // Extract name from email
    const name = parsed.from?.text?.split("<")[0]?.trim() || 
                 email.split("@")[0].replace(/[._-]/g, " ");

    // Create new customer
    const [newCustomer] = await db
      .insert(customers)
      .values({
        name,
        email,
        company: this.extractCompanyFromEmail(email),
        createdAt: new Date(),
      })
      .returning();

    console.log(`📧 Created new customer: ${name} (${email})`);
    return newCustomer;
  }

  private extractCompanyFromEmail(email: string): string {
    const domain = email.split("@")[1];
    if (!domain) return "";
    
    // Remove common email providers and extract company name
    const commonProviders = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "mail.ru"];
    if (commonProviders.includes(domain.toLowerCase())) {
      return "";
    }
    
    return domain.split(".")[0].replace(/[-_]/g, " ").toLowerCase();
  }

  private isSpamOrNonBusiness(subject: string, body: string, fromEmail: string): boolean {
    const spamKeywords = [
      "no-reply", "noreply", "unsubscribe", "marketing", "promotion",
      "newsletter", "automated", "notification", "system"
    ];
    
    const businessKeywords = [
      "part", "component", "aircraft", "aviation", "quote", "request",
      "rfq", "procurement", "supply", "order", "inquiry", "proposal"
    ];

    const lowerSubject = subject.toLowerCase();
    const lowerBody = body.toLowerCase();
    const lowerFrom = fromEmail.toLowerCase();

    // Check for spam indicators
    if (spamKeywords.some(keyword => 
      lowerSubject.includes(keyword) || lowerFrom.includes(keyword)
    )) {
      return true;
    }

    // Check for business relevance
    const hasBusinessKeywords = businessKeywords.some(keyword =>
      lowerSubject.includes(keyword) || lowerBody.includes(keyword)
    );

    // If it's a business-like email format and has relevant keywords, process it
    return !hasBusinessKeywords && !this.looksLikeBusiness(lowerFrom, lowerSubject);
  }

  private looksLikeBusiness(email: string, subject: string): boolean {
    // Check if email domain suggests business use
    const businessDomains = [".com", ".org", ".net", ".biz", ".co."];
    const hasBusinessDomain = businessDomains.some(domain => email.includes(domain));
    
    // Check if subject suggests a business inquiry
    const businessSubjects = ["inquiry", "request", "quote", "information", "help", "support"];
    const hasBusinessSubject = businessSubjects.some(word => subject.includes(word));
    
    return hasBusinessDomain && (hasBusinessSubject || subject.length > 10);
  }

  private async processAviationPartsRequest(email: any, body: string) {
    // Basic part number extraction (improved pattern)
    const partNumberPatterns = [
      /P\/N[:\s]*([A-Z0-9-]{6,20})/gi,
      /Part\s*Number[:\s]*([A-Z0-9-]{6,20})/gi,
      /Part[:\s]*([A-Z0-9-]{6,20})/gi,
      /([A-Z]{2,}\d{3,}[-]?[A-Z0-9]*)/g
    ];

    const quantities = body.match(/(?:quantity|qty|need|require)[:\s]*(\d+)/gi);
    const urgencyWords = ["urgent", "asap", "critical", "emergency", "aog"];
    
    let partNumbers: string[] = [];
    for (const pattern of partNumberPatterns) {
      const matches = body.match(pattern);
      if (matches) {
        partNumbers.push(...matches.map(match => 
          match.replace(/P\/N[:\s]*/gi, "").replace(/Part\s*Number[:\s]*/gi, "").trim()
        ));
      }
    }

    if (partNumbers.length > 0) {
      console.log(`📧 Detected aviation parts request:`, {
        partNumbers: partNumbers.slice(0, 5), // Limit log output
        hasQuantity: quantities !== null,
        isUrgent: urgencyWords.some(word => body.toLowerCase().includes(word))
      });

      // Update email status to processed
      await db
        .update(emails)
        .set({ 
          status: "processed",
          processedAt: new Date(),
          notes: `Detected ${partNumbers.length} part number(s): ${partNumbers.slice(0, 3).join(", ")}${partNumbers.length > 3 ? "..." : ""}`
        })
        .where(eq(emails.id, email.id));
    }
  }

  public getConnectionStatus() {
    return {
      connected: this.isConnected,
      config: {
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        secure: this.config.secure
      }
    };
  }
}

// Singleton instance
export const timwebMailService = new TimwebMailService();