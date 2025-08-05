import { db } from "../db";
import { orders, customers, emails, type Email } from "@shared/schema";
import { eq } from "drizzle-orm";

export class OrderCreationService {
  /**
   * Generate a unique order number
   */
  private generateOrderNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `ORD-${year}${month}${day}-${random}`;
  }

  /**
   * Extract quantity from text using various patterns
   */
  private extractQuantity(text: string): number {
    const patterns = [
      /(\d+)\s*(?:pcs?|pieces?|units?|ea|each)/i,
      /qty[:\s]+(\d+)/i,
      /quantity[:\s]+(\d+)/i,
      /need\s+(\d+)/i,
      /require\s+(\d+)/i,
      /(\d+)\s+required/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return parseInt(match[1]);
      }
    }

    return 1; // Default quantity
  }

  /**
   * Extract delivery requirements from email
   */
  private extractDeliveryRequirements(text: string): string {
    const urgentPatterns = [
      /urgent/i,
      /asap/i,
      /immediately/i,
      /rush/i,
      /aog/i, // Aircraft on Ground
      /critical/i,
    ];

    const deliveryPatterns = [
      /deliver(?:y)?\s+(?:by|before|on)\s+([^,.]+)/i,
      /need(?:ed)?\s+(?:by|before|on)\s+([^,.]+)/i,
      /require(?:d)?\s+(?:by|before|on)\s+([^,.]+)/i,
    ];

    for (const pattern of urgentPatterns) {
      if (pattern.test(text)) {
        return "URGENT - AOG";
      }
    }

    for (const pattern of deliveryPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return `Required by: ${match[1].trim()}`;
      }
    }

    return "Standard delivery";
  }

  /**
   * Extract condition from text (New, Used, etc.)
   */
  private extractCondition(text: string): string {
    const conditionPatterns = [
      { pattern: /new\s+condition/i, value: "NE" },
      { pattern: /new/i, value: "NE" },
      { pattern: /used/i, value: "US" },
      { pattern: /overhauled/i, value: "OH" },
      { pattern: /serviceable/i, value: "SV" },
      { pattern: /as\s+removed/i, value: "AR" },
      { pattern: /repaired/i, value: "RP" },
    ];

    for (const { pattern, value } of conditionPatterns) {
      if (pattern.test(text)) {
        return value;
      }
    }

    return "NE"; // Default to new
  }

  /**
   * Create order from parsed email data
   */
  public async createOrderFromEmail(
    email: Email,
    partNumbers: string[],
    emailBody: string
  ): Promise<any[]> {
    const createdOrders = [];

    try {
      // Get customer information
      if (!email.customerId) {
        console.error("No customer ID found for email:", email.id);
        return [];
      }

      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, email.customerId));

      if (!customer) {
        console.error("Customer not found for email:", email.id);
        return [];
      }

      // Create an order for each part number found
      for (const partNumber of partNumbers) {
        const orderNumber = this.generateOrderNumber();
        const quantity = this.extractQuantity(emailBody);
        const deliveryNotes = this.extractDeliveryRequirements(emailBody);
        const urgencyLevel = deliveryNotes.includes("URGENT") ? "urgent" : "normal";

        const [newOrder] = await db
          .insert(orders)
          .values({
            orderNumber,
            customerId: customer.id,
            emailId: email.id,
            partNumber,
            quantity,
            status: "pending",
            urgencyLevel,
            notes: deliveryNotes,
          })
          .returning();

        console.log(`📦 Created order ${orderNumber} for part ${partNumber}`);
        createdOrders.push(newOrder);
      }

      // Update email status
      await db
        .update(emails)
        .set({ 
          status: "processed",
          processedAt: new Date()
        })
        .where(eq(emails.id, email.id));

    } catch (error) {
      console.error("Error creating orders from email:", error);
    }

    return createdOrders;
  }

  /**
   * Update order details (for manual corrections by sales team)
   */
  public async updateOrder(
    orderId: string,
    updates: {
      partNumber?: string;
      quantity?: number;
      urgencyLevel?: string;
      notes?: string;
      status?: string;
      partDescription?: string;
    }
  ) {
    try {
      const [updatedOrder] = await db
        .update(orders)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId))
        .returning();

      return updatedOrder;
    } catch (error) {
      console.error("Error updating order:", error);
      throw error;
    }
  }
}

export const orderCreationService = new OrderCreationService();