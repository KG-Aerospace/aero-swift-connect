import { storage } from "../storage";

export class EmailService {
  async processEmail(emailId: string): Promise<void> {
    try {
      const email = await storage.getEmail(emailId);
      if (!email) {
        throw new Error("Email not found");
      }

      // Parse email content to extract order information
      const orderData = this.parseEmailContent(email.body, email.subject);
      
      // Find or create customer
      let customer = await storage.getCustomerByEmail(email.fromEmail);
      if (!customer) {
        const customerName = this.extractCustomerName(email.fromEmail, email.body);
        customer = await storage.createCustomer({
          name: customerName,
          email: email.fromEmail,
          company: this.extractCompanyName(email.body),
        });
      }

      // Create order from parsed data
      if (orderData.partNumber) {
        const order = await storage.createOrder({
          orderNumber: `ORD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
          customerId: customer.id,
          partNumber: orderData.partNumber,
          partDescription: orderData.partDescription,
          quantity: orderData.quantity || 1,
          urgencyLevel: orderData.urgencyLevel || "normal",
          emailId: email.id,
          notes: orderData.notes,
        });

        // Create activity
        await storage.createActivity({
          type: "email_processed",
          description: `Email processed and order ${order.orderNumber} created`,
          entityType: "email",
          entityId: email.id,
        });
      }

      // Update email status
      await storage.updateEmailStatus(emailId, "processed", customer.id);

    } catch (error) {
      console.error("Failed to process email:", error);
      await storage.updateEmailStatus(emailId, "failed");
      
      await storage.createActivity({
        type: "email_processing_failed",
        description: `Failed to process email: ${error instanceof Error ? error.message : "Unknown error"}`,
        entityType: "email",
        entityId: emailId,
      });
    }
  }

  async processBatch(): Promise<{ processed: number; failed: number }> {
    const pendingEmails = await storage.getEmails(50);
    const unprocessedEmails = pendingEmails.filter(email => email.status === "pending");
    
    let processed = 0;
    let failed = 0;

    for (const email of unprocessedEmails) {
      try {
        await this.processEmail(email.id);
        processed++;
      } catch (error) {
        failed++;
        console.error(`Failed to process email ${email.id}:`, error);
      }
    }

    return { processed, failed };
  }

  private parseEmailContent(body: string, subject: string): {
    partNumber?: string;
    partDescription?: string;
    quantity?: number;
    urgencyLevel?: string;
    notes?: string;
  } {
    const result: any = {};

    // Extract part number (common patterns)
    const partNumberMatch = body.match(/(?:part\s*(?:number|#)|p\/n|PN)[:\s]*([A-Z0-9\-]+)/i);
    if (partNumberMatch) {
      result.partNumber = partNumberMatch[1];
    }

    // Extract description
    const descriptionMatch = body.match(/(?:description|part\s*name)[:\s]*([^\n\r]{10,100})/i);
    if (descriptionMatch) {
      result.partDescription = descriptionMatch[1].trim();
    }

    // Extract quantity
    const quantityMatch = body.match(/(?:quantity|qty|amount)[:\s]*(\d+)/i);
    if (quantityMatch) {
      result.quantity = parseInt(quantityMatch[1]);
    }

    // Detect urgency
    if (/urgent|asap|emergency|critical/i.test(subject + " " + body)) {
      result.urgencyLevel = "urgent";
    }

    if (/critical|emergency/i.test(subject + " " + body)) {
      result.urgencyLevel = "critical";
    }

    result.notes = `Extracted from email: ${subject}`;

    return result;
  }

  private extractCustomerName(email: string, body: string): string {
    // Try to extract name from email signature or content
    const nameMatch = body.match(/(?:best\s*regards|sincerely|thanks),?\s*\n?\s*([A-Za-z\s]{2,30})/i);
    if (nameMatch) {
      return nameMatch[1].trim();
    }

    // Fallback to email prefix
    return email.split("@")[0].replace(/[._]/g, " ");
  }

  private extractCompanyName(body: string): string | undefined {
    // Try to extract company name from signature
    const companyMatch = body.match(/(?:from|at)\s+([A-Za-z\s&.,]{2,50})(?:airlines|aviation|aerospace|corp|inc|ltd|llc)/i);
    if (companyMatch) {
      return companyMatch[1].trim() + (companyMatch[0].includes("airlines") ? " Airlines" : "");
    }

    return undefined;
  }
}

export const emailService = new EmailService();
