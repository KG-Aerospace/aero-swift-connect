import { db } from "../db";
import { draftOrders, orders, customers, emails } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import type { DraftOrder, InsertDraftOrder, Order } from "@shared/schema";

class DraftOrderService {
  async createDraftOrderWithCR(data: {
    emailId: string;
    customerId: string;
    crNumber: string;
    partNumber: string;
    partDescription: string;
    quantity: number;
    condition?: string;
    urgencyLevel?: string;
    emailFrom?: string;
    emailDate?: Date;
  }): Promise<DraftOrder | null> {
    try {
      // Generate unique Requisition Number (count all draft orders)
      const [reqCountResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(draftOrders);
      
      const reqNumber = (reqCountResult.count || 0) + 1;
      const requisitionNumber = `ID-${reqNumber.toString().padStart(5, '0')}`;
      
      const draftId = `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const [draft] = await db
        .insert(draftOrders)
        .values({
          id: draftId,
          emailId: data.emailId,
          customerId: data.customerId,
          partNumber: data.partNumber,
          partDescription: data.partDescription,
          quantity: data.quantity,
          condition: data.condition || "NE",
          urgencyLevel: data.urgencyLevel || "normal",
          status: "pending",
          notes: "",
          customerReference: data.emailFrom || "",
          crNumber: data.crNumber, // Use provided CR Number
          requisitionNumber: requisitionNumber, // Unique per item
          positionId: requisitionNumber,
          customerRequestDate: data.emailDate || new Date(),
          uom: "EA",
          cheapExp: "CHEAP",
          acType: "",
          engineType: "",
          comment: "",
        })
        .returning();
      
      return draft;
    } catch (error) {
      console.error("Error creating draft order with CR:", error);
      return null;
    }
  }

  async createDraftOrder(data: {
    emailId: string;
    customerId: string;
    partNumber: string;
    quantity: number;
    condition?: string;
    urgencyLevel?: string;
    description?: string;
    emailFrom?: string;
    emailDate?: Date;
    lineNumber?: number;
  }): Promise<DraftOrder | null> {
    try {
      // First check if we already have drafts for this email to reuse CR Number
      const existingDrafts = await db
        .select({ crNumber: draftOrders.crNumber })
        .from(draftOrders)
        .where(eq(draftOrders.emailId, data.emailId))
        .limit(1);
      
      let crNumber = "";
      let requisitionNumber = "";
      
      if (existingDrafts.length > 0 && existingDrafts[0].crNumber) {
        // Use existing CR Number for this email
        crNumber = existingDrafts[0].crNumber;
      } else {
        // Generate new CR Number for this email (count unique emails with drafts)
        const [emailCountResult] = await db
          .select({ count: sql<number>`count(distinct email_id)` })
          .from(draftOrders);
        
        const emailNumber = (emailCountResult.count || 0) + 1;
        crNumber = `CR-${emailNumber.toString().padStart(5, '0')}`;
      }
      
      // Generate unique Requisition Number (count all draft orders)
      const [reqCountResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(draftOrders);
      
      const reqNumber = (reqCountResult.count || 0) + 1;
      requisitionNumber = `ID-${reqNumber.toString().padStart(5, '0')}`;
      
      const draftId = `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const [draft] = await db
        .insert(draftOrders)
        .values({
          id: draftId,
          emailId: data.emailId,
          customerId: data.customerId,
          partNumber: data.partNumber,
          partDescription: data.description || "",
          quantity: data.quantity,
          condition: data.condition || "NE",
          urgencyLevel: data.urgencyLevel || "normal",
          status: "pending",
          notes: "",
          customerReference: data.emailFrom || "",  // Email sender
          crNumber: crNumber,  // One per email
          requisitionNumber: requisitionNumber,  // Unique per item
          positionId: requisitionNumber, // Same as requisition for consistency
          customerRequestDate: data.emailDate || new Date(),  // Email date
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
    email?: { subject: string; fromEmail: string; receivedAt?: string } | null 
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
        receivedAt: row.email.receivedAt?.toISOString(),
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

      // Create the order with all fields from draft
      const orderId = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const [order] = await db
        .insert(orders)
        .values({
          id: orderId,
          orderNumber,
          customerId: draft.customerId,
          emailId: draft.emailId,
          partNumber: draft.partNumber,
          partDescription: draft.partDescription || "",
          quantity: draft.quantity,
          urgencyLevel: draft.urgencyLevel,
          status: "verified", // Mark as verified since it went through manual review
          notes: draft.notes || "",
          // Transfer all sales fields from draft
          positionId: draft.positionId,
          crNumber: draft.crNumber,
          requisitionNumber: draft.requisitionNumber,
          customerRequestDate: draft.customerRequestDate,
          uom: draft.uom,
          cheapExp: draft.cheapExp,
          acType: draft.acType,
          engineType: draft.engineType,
          comment: draft.comment,
        })
        .returning();

      // Update draft status
      await db
        .update(draftOrders)
        .set({
          status: "approved",
          reviewedBy: "627da808-4f41-45ac-9597-29a6c8471b3b", // Would be actual user ID in production
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
          reviewedBy: rejectedBy || "627da808-4f41-45ac-9597-29a6c8471b3b", // Use admin user ID instead of "system"
          reviewedAt: new Date(),
          updatedAt: new Date(),
          rejectionReason: notes || "No reason provided",
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

  async getRejectedDrafts(): Promise<any[]> {
    const rejectedDrafts = await db
      .select({
        id: draftOrders.id,
        partNumber: draftOrders.partNumber,
        partDescription: draftOrders.partDescription,
        quantity: draftOrders.quantity,
        uom: draftOrders.uom,
        condition: draftOrders.condition,
        urgencyLevel: draftOrders.urgencyLevel,
        status: draftOrders.status,
        notes: draftOrders.notes,
        rejectionReason: draftOrders.rejectionReason,
        reviewedAt: draftOrders.reviewedAt,
        positionId: draftOrders.positionId,
        crNumber: draftOrders.crNumber,
        customer: {
          name: customers.name,
          company: customers.company,
        },
        email: {
          subject: emails.subject,
          fromEmail: emails.fromEmail,
        },
      })
      .from(draftOrders)
      .leftJoin(customers, eq(draftOrders.customerId, customers.id))
      .leftJoin(emails, eq(draftOrders.emailId, emails.id))
      .where(eq(draftOrders.status, "rejected"))
      .orderBy(desc(draftOrders.reviewedAt));
    
    return rejectedDrafts;
  }
}

export const draftOrderService = new DraftOrderService();