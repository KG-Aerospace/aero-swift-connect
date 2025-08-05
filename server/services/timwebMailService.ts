import Imap from "imap";
import { simpleParser } from "mailparser";
import { db } from "../db";
import { emails, customers, orders } from "@shared/schema";
import { eq } from "drizzle-orm";
import { ObjectStorageService } from "../objectStorage";
import { airlineParserService } from "./airlineParserService";

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
  private testMode = false;

  constructor() {
    this.config = {
      host: process.env.TIMWEB_MAIL_HOST || "",
      port: parseInt(process.env.TIMWEB_MAIL_PORT || "993"),
      user: process.env.TIMWEB_MAIL_USER || "",
      password: process.env.TIMWEB_MAIL_PASSWORD || "",
      secure: true, // Always use TLS for port 993
    };

    this.imap = new Imap({
      host: this.config.host,
      port: this.config.port,
      tls: true,
      user: this.config.user,
      password: this.config.password,
      keepalive: true,
      authTimeout: 30000, // 30 seconds timeout
      connTimeout: 30000,
      tlsOptions: { 
        rejectUnauthorized: false // Allow self-signed certificates
      }
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
      console.error("📧 Full error details:", err);
      this.isConnected = false;
    });

    this.imap.once("end", () => {
      console.log("📧 IMAP connection ended");
      this.isConnected = false;
    });

    this.imap.once("close", (hadError: boolean) => {
      console.log("📧 IMAP connection closed", hadError ? "with error" : "normally");
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
        secure: this.config.secure,
        tls: true
      });
      
      console.log("📧 Attempting to connect to IMAP server...");
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
    
    this.testMode = false;
    
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
      const body = parsed.text || "";
      const bodyHtml = parsed.html || "";

      // Skip non-business emails (basic filtering)
      if (this.isSpamOrNonBusiness(subject, body, fromEmail)) {
        console.log(`📧 Skipping non-business email: ${subject}`);
        return;
      }

      // Find or create customer
      let customer = await this.findOrCreateCustomer(fromEmail, parsed);
      
      // Process attachments
      const attachmentData = [];
      if (parsed.attachments && parsed.attachments.length > 0) {
        const objectStorageService = new ObjectStorageService();
        
        for (const attachment of parsed.attachments) {
          try {
            // Upload attachment to object storage
            const objectPath = await objectStorageService.uploadEmailAttachment(
              attachment.filename || "attachment",
              attachment.content,
              attachment.contentType || "application/octet-stream"
            );
            
            attachmentData.push({
              filename: attachment.filename || "attachment",
              contentType: attachment.contentType || "application/octet-stream",
              size: attachment.size || attachment.content.length,
              objectPath: objectPath
            });
          } catch (error) {
            console.error(`📧 Error uploading attachment ${attachment.filename}:`, error);
          }
        }
      }
      
      // Save email to database
      const [savedEmail] = await db
        .insert(emails)
        .values({
          fromEmail: fromEmail,
          subject,
          body: body.substring(0, 5000), // Limit body length
          bodyHtml: bodyHtml ? bodyHtml.substring(0, 50000) : null, // Store HTML version
          attachments: attachmentData.length > 0 ? attachmentData : null,
          status: "pending",
          customerId: customer.id,
          receivedAt: new Date(),
        })
        .returning();

      console.log(`📧 Saved email: ${subject} from ${fromEmail}`);

      // Process the email for aviation parts requests
      await this.processAviationPartsRequest(savedEmail, body || bodyHtml);

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
    // Use airline-specific parser
    const parsingResult = airlineParserService.parseEmailByAirline(email, body);
    
    console.log(`📧 Detected airline: ${parsingResult.airline || "Unknown"}`);
    
    if (parsingResult.isAviationRequest && parsingResult.orders.length > 0) {
      console.log(`📧 Detected aviation parts request with ${parsingResult.orders.length} parts`);
      
      // Update email status to processing
      await db
        .update(emails)
        .set({ 
          status: "processing",
          processedAt: new Date()
        })
        .where(eq(emails.id, email.id));

      // Create orders from parsed results
      const { orderCreationService } = await import("./orderCreationService");
      const ordersCreated = [];
      
      for (const parsedOrder of parsingResult.orders) {
        try {
          const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.id, email.customerId));
          
          if (!customer) {
            console.error("Customer not found for email:", email.id);
            continue;
          }

          const orderNumber = this.generateOrderNumber();
          
          const [newOrder] = await db.insert(orders).values({
            orderNumber,
            customerId: email.customerId,
            emailId: email.id,
            partNumber: parsedOrder.partNumber,
            partDescription: parsedOrder.description || "",
            quantity: parsedOrder.quantity,
            urgencyLevel: parsedOrder.priority === "URGENT" ? "critical" : "normal",
            status: "pending",
            notes: `Condition: ${parsedOrder.condition}, Priority: ${parsedOrder.priority}`,
          }).returning();
          
          ordersCreated.push(newOrder);
          console.log(`📦 Created order ${orderNumber} for part ${parsedOrder.partNumber}`);
        } catch (error) {
          console.error(`Error creating order for part ${parsedOrder.partNumber}:`, error);
        }
      }
      
      if (ordersCreated.length > 0) {
        console.log(`📦 Automatically created ${ordersCreated.length} orders from email`);
        
        // Update email status to processed
        await db
          .update(emails)
          .set({ 
            status: "processed",
            processedAt: new Date()
          })
          .where(eq(emails.id, email.id));
      }
    } else if (parsingResult.isAviationRequest) {
      console.log(`📧 Aviation-related email detected but no specific parts found`);
    }
  }

  private generateOrderNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `ORD-${year}${month}${day}-${random}`;
  }

  public getConnectionStatus() {
    return {
      connected: this.isConnected || this.testMode,
      config: {
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        secure: this.config.secure
      },
      testMode: this.testMode
    };
  }

  public enableTestMode() {
    console.log("📧 Enabling test mode for email service");
    this.testMode = true;
    this.isConnected = false;
    
    // Simulate email processing in test mode
    this.simulateEmailProcessing();
  }

  public disableTestMode() {
    console.log("📧 Disabling test mode for email service");
    this.testMode = false;
  }

  private simulateEmailProcessing() {
    if (!this.testMode) return;
    
    console.log("📧 Simulating email processing in test mode");
    
    // Simulate processing emails every 60 seconds in test mode
    this.checkInterval = setInterval(async () => {
      if (this.testMode) {
        console.log("📧 Test mode: Simulating new email processing");
        await this.simulateNewEmail();
      }
    }, 60000);
  }

  private async simulateNewEmail() {
    try {
      // Create a simulated aviation parts request email
      const testEmails = [
        {
          from: "maintenance@testairline.com",
          subject: "Urgent: Need P/N ABC123-45 for Boeing 737",
          body: "Hello, we need part number ABC123-45 for our Boeing 737. Quantity: 2 units. This is urgent (AOG situation). Please provide quote ASAP.",
          company: "Test Airline"
        },
        {
          from: "procurement@helicopter-ops.com", 
          subject: "RFQ for Helicopter Parts - Multiple Items",
          body: "We require the following parts: P/N HEL789-10 (Qty: 1), P/N ROT456-25 (Qty: 3). Please send your best quote.",
          company: "Helicopter Operations"
        },
        {
          from: "parts@cargo-air.com",
          subject: "Part Request - Engine Component",
          body: "Need urgent quote for part ENG-987-XZ. Required for Airbus A320. Quantity: 1 piece. Original manufacturer preferred.",
          company: "Cargo Air"
        }
      ];

      const randomEmail = testEmails[Math.floor(Math.random() * testEmails.length)];
      
      // Find or create customer
      let customer = await this.findOrCreateCustomer(randomEmail.from, {
        from: { text: `${randomEmail.company} <${randomEmail.from}>` }
      });
      
      // Save test email to database
      const { emails } = await import("@shared/schema");
      const { db } = await import("../db");
      
      const [savedEmail] = await db
        .insert(emails)
        .values({
          fromEmail: randomEmail.from,
          subject: randomEmail.subject,
          body: randomEmail.body,
          status: "pending",
          customerId: customer.id,
        })
        .returning();

      console.log(`📧 Test mode: Created simulated email from ${randomEmail.from}`);
      
      // Process the simulated email
      await this.processAviationPartsRequest(savedEmail, randomEmail.body);
      
    } catch (error) {
      console.error("📧 Error simulating email:", error);
    }
  }
}

// Singleton instance
export const timwebMailService = new TimwebMailService();