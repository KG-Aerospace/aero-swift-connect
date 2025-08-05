import { db } from "../db";
import { draftOrders, orders, customers, emails } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import type { DraftOrder, InsertDraftOrder, Order } from "@shared/schema";

class DraftOrderService {
  async createDraftOrder(data: {
    emailId: string;
    customerId: string;
    partNumber: string;
    quantity: number;
    condition?: string;
    urgencyLevel?: string;
    description?: string;
  }): Promise<DraftOrder | null> {
    try {
      const [draft] = await db
        .insert(draftOrders)
        .values({
          emailId: data.emailId,
          customerId: data.customerId,
          partNumber: data.partNumber,
          partDescription: data.description || "",
          quantity: data.quantity,
          condition: data.condition || "NE",
          urgencyLevel: data.urgencyLevel || "normal",
          status: "pending",
          notes: "",
          customerReference: "",
          crNumber: "",
          requisitionNumber: "",
          uom: "EA",
          cheapExp: "CHEAP",
          acType: "",
          engineType: "",
          comment: "",
        })
        .returning();
      
      return draft;
    } catch (error) {
      console.error("Error creating draft order:", error);
      return null;
    }
  }

  async getAllDrafts(): Promise<(DraftOrder & { 
    customer?: { name: string; company: string | null } | null; 
    email?: { subject: string; fromEmail: string } | null 
  })[]> {
    const results = await db
      .select({
        draft: draftOrders,
        customer: customers,
        email: emails,
      })
      .from(draftOrders)
      .leftJoin(customers, eq(draftOrders.customerId, customers.id))
      .leftJoin(emails, eq(draftOrders.emailId, emails.id))
      .orderBy(desc(draftOrders.createdAt));
    
    return results.map(row => ({
      ...row.draft,
      customer: row.customer ? {
        name: row.customer.name,
        company: row.customer.company,
      } : null,
      email: row.email ? {
        subject: row.email.subject,
        fromEmail: row.email.fromEmail,
      } : null,
    }));
  }

  async getDraftsByEmail(emailId: string): Promise<DraftOrder[]> {
    return db
      .select()
      .from(draftOrders)
      .where(eq(draftOrders.emailId, emailId))
      .orderBy(desc(draftOrders.createdAt));
  }

  async updateDraft(id: string, updates: Partial<InsertDraftOrder>): Promise<DraftOrder | null> {
    try {
      const [updated] = await db
        .update(draftOrders)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(draftOrders.id, id))
        .returning();
      
      return updated || null;
    } catch (error) {
      console.error("Error updating draft order:", error);
      return null;
    }
  }

  async approveDraft(id: string): Promise<Order | null> {
    try {
      // Get the draft
      const [draft] = await db
        .select()
        .from(draftOrders)
        .where(eq(draftOrders.id, id));
      
      if (!draft || draft.status !== "pending") {
        return null;
      }

      // Generate order number
      const orderNumber = this.generateOrderNumber();

      // Create the order
      const [order] = await db
        .insert(orders)
        .values({
          orderNumber,
          customerId: draft.customerId,
          emailId: draft.emailId,
          partNumber: draft.partNumber,
          partDescription: draft.partDescription || "",
          quantity: draft.quantity,
          urgencyLevel: draft.urgencyLevel,
          status: "verified", // Mark as verified since it went through manual review
          notes: draft.notes || "",
        })
        .returning();

      // Update draft status
      await db
        .update(draftOrders)
        .set({
          status: "approved",
          reviewedBy: "system", // Would be actual user ID in production
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(draftOrders.id, id));

      return order;
    } catch (error) {
      console.error("Error approving draft order:", error);
      return null;
    }
  }

  async rejectDraft(id: string, rejectedBy?: string, notes?: string): Promise<boolean> {
    try {
      await db
        .update(draftOrders)
        .set({
          status: "rejected",
          reviewedBy: rejectedBy || "system",
          reviewedAt: new Date(),
          updatedAt: new Date(),
          notes: notes || "Rejected by user",
        })
        .where(eq(draftOrders.id, id));
      
      return true;
    } catch (error) {
      console.error("Error rejecting draft order:", error);
      return false;
    }
  }

  private generateOrderNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    return `ORD-${year}${month}${day}-${timestamp}${random}`;
  }
}

export const draftOrderService = new DraftOrderService();