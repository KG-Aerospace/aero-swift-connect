import { z } from "zod";
import { db } from "../db";
import { procurementRequests, orders, suppliers, activities } from "@shared/schema";
import { eq } from "drizzle-orm";

// Validation schema for procurement request data
const ProcurementRequestSchema = z.object({
  supplier: z.string().min(1, "Supplier name is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  part_number: z.string().min(1, "Part number is required"),
  qty: z.number().positive("Quantity must be positive"),
  is_moq: z.boolean().default(false),
  um: z.enum(["EA", "M", "FT", "YD", "KG", "LB", "G", "L", "OZ", "RO", "KT", "CA", "PR", "PK", "ML", "IN"]),
  condition: z.enum(["NE", "NS", "OH", "SV", "IT", "FN", "RP"]),
  lead_time: z.number().min(0, "Lead time cannot be negative"),
  time_unit: z.enum(["D", "W", "M"]).default("D"),
  price: z.number().positive("Price must be positive"),
  currency: z.string().length(3, "Currency must be 3 characters"),
  valid_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Valid to date must be in YYYY-MM-DD format"),
  delivery_condition: z.enum(["EXW", "FCA", "CPT", "CIP", "DPU", "DAP", "DDP", "FAS", "FOB", "CFR", "CIF"]),
  delivery_place: z.string().min(1, "Delivery place is required"),
  item_note: z.string().optional().default(""),
  email_subject: z.string().min(1, "Email subject is required"),
  stk_qty: z.number().min(0).default(0),
  description: z.string().optional().default(""),
  from: z.string().email("Invalid email address"),
  moq: z.number().positive().default(1),
});

const ProcurementRequestArraySchema = z.array(ProcurementRequestSchema);

export class ProcurementRequestService {
  /**
   * Generate a unique request number
   */
  private generateRequestNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `PR-${year}${month}${day}-${random}`;
  }

  /**
   * Parse and validate procurement request data
   */
  public async parseProcurementData(rawData: string): Promise<z.infer<typeof ProcurementRequestArraySchema>> {
    try {
      const parsedData = JSON.parse(rawData);
      const validatedData = ProcurementRequestArraySchema.parse(parsedData);
      
      return validatedData.map(item => ({
        ...item,
        condition: item.condition === ("IN" as any) ? "IT" : item.condition,
        lead_time: item.lead_time === 0 && (item.item_note?.toLowerCase().includes("stock") || item.item_note?.toLowerCase().includes("stk")) ? 1 : item.lead_time,
      }));
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ")}`);
      }
      throw new Error(`Failed to parse procurement data: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Create procurement requests from parsed data
   */
  public async createProcurementRequests(
    requestData: z.infer<typeof ProcurementRequestArraySchema>,
    emailId?: string,
    userId?: string
  ) {
    const processedRequests = [];
    
    for (const request of requestData) {
      try {
        // Find or create supplier
        let supplier = await this.findOrCreateSupplier(request.supplier, request.from);
        
        // Find matching order by part number
        const matchingOrder = await db
          .select()
          .from(orders)
          .where(eq(orders.partNumber, request.part_number));
        
        // Calculate lead time in days
        const leadTimeDays = this.calculateLeadTimeDays(request.lead_time, request.time_unit);
        
        // Create procurement request
        const requestNumber = this.generateRequestNumber();
        const [savedRequest] = await db
          .insert(procurementRequests)
          .values({
            requestNumber,
            orderId: matchingOrder[0]?.id || null,
            emailId: emailId || null,
            supplierId: supplier.id,
            status: "pending",
            partNumber: request.part_number,
            quantity: request.qty,
            unitOfMeasure: request.um,
            condition: request.condition,
            price: request.price.toString(),
            currency: request.currency,
            leadTimeDays,
            moq: request.moq,
            deliveryTerms: request.delivery_condition,
            deliveryLocation: request.delivery_place,
            supplierDetails: {
              name: request.supplier,
              email: request.from,
              stockQuantity: request.stk_qty,
              isMinimumOrderQuantity: request.is_moq,
              description: request.description,
              notes: request.item_note,
              emailSubject: request.email_subject,
              quoteDate: request.date,
              validUntil: request.valid_to,
            },
            notes: request.item_note,
            createdBy: userId || null,
          })
          .returning();
        
        // Create activity log
        await db.insert(activities).values({
          type: "procurement_request_created",
          description: `Procurement request ${requestNumber} created for ${request.part_number} from ${request.supplier}`,
          entityType: "procurement_request",
          entityId: savedRequest.id,
          userId: userId || null,
          metadata: {
            partNumber: request.part_number,
            supplier: request.supplier,
            quantity: request.qty,
            price: request.price,
            currency: request.currency,
            leadTime: `${request.lead_time} ${request.time_unit}`,
          },
        });
        
        processedRequests.push(savedRequest);
        
        // Update order status if matched
        if (matchingOrder[0] && matchingOrder[0].status === "pending") {
          await db
            .update(orders)
            .set({ status: "processing", updatedAt: new Date() })
            .where(eq(orders.id, matchingOrder[0].id));
        }
        
      } catch (error) {
        console.error(`Error processing procurement request for ${request.part_number}:`, error);
      }
    }
    
    return processedRequests;
  }

  /**
   * Get all procurement requests with filters
   */
  public async getProcurementRequests(filters?: {
    status?: string;
    supplierId?: string;
    orderId?: string;
  }) {
    let query = db.select().from(procurementRequests);
    
    if (filters?.status) {
      query = query.where(eq(procurementRequests.status, filters.status));
    }
    
    if (filters?.supplierId) {
      query = query.where(eq(procurementRequests.supplierId, filters.supplierId));
    }
    
    if (filters?.orderId) {
      query = query.where(eq(procurementRequests.orderId, filters.orderId));
    }
    
    return await query;
  }

  /**
   * Approve a procurement request
   */
  public async approveProcurementRequest(requestId: string, userId: string) {
    const [updated] = await db
      .update(procurementRequests)
      .set({
        status: "approved",
        approvedBy: userId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(procurementRequests.id, requestId))
      .returning();
    
    if (updated) {
      await db.insert(activities).values({
        type: "procurement_request_approved",
        description: `Procurement request ${updated.requestNumber} approved`,
        entityType: "procurement_request",
        entityId: requestId,
        userId,
        metadata: {
          requestNumber: updated.requestNumber,
          partNumber: updated.partNumber,
        },
      });
    }
    
    return updated;
  }

  /**
   * Reject a procurement request
   */
  public async rejectProcurementRequest(requestId: string, userId: string, reason: string) {
    const [updated] = await db
      .update(procurementRequests)
      .set({
        status: "rejected",
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(procurementRequests.id, requestId))
      .returning();
    
    if (updated) {
      await db.insert(activities).values({
        type: "procurement_request_rejected",
        description: `Procurement request ${updated.requestNumber} rejected: ${reason}`,
        entityType: "procurement_request",
        entityId: requestId,
        userId,
        metadata: {
          requestNumber: updated.requestNumber,
          partNumber: updated.partNumber,
          reason,
        },
      });
    }
    
    return updated;
  }

  /**
   * Find or create supplier
   */
  private async findOrCreateSupplier(supplierName: string, email: string) {
    const [existingSupplier] = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.email, email))
      .limit(1);
    
    if (existingSupplier) {
      return existingSupplier;
    }
    
    const [newSupplier] = await db
      .insert(suppliers)
      .values({
        name: supplierName,
        email: email,
        isActive: true,
        responseTimeHours: "24",
        successRate: "100",
      })
      .returning();
    
    return newSupplier;
  }

  /**
   * Calculate lead time in days
   */
  private calculateLeadTimeDays(leadTime: number, timeUnit: string): number {
    switch (timeUnit) {
      case "D":
        return leadTime;
      case "W":
        return leadTime * 7;
      case "M":
        return leadTime * 30;
      default:
        return leadTime;
    }
  }

  /**
   * Get procurement request template
   */
  public getRequestTemplate(): string {
    return `[{
  "supplier": "",            // Supplier name
  "date": "",                // Quote date in YYYY-MM-DD format
  "part_number": "",         // Part number
  "qty": 0,                  // Quantity (number only)
  "is_moq": false,           // Is this a minimum order quantity
  "um": "",                  // Unit of measure - allowed values: EA, M, FT, YD, KG, LB, G, L, OZ, RO, KT, CA, PR, PK, ML, IN
  "condition": "",           // Condition codes: NE, NS, OH, SV, IT, FN, RP
  "lead_time": 0,            // Delivery time (number only). If "Stock"/"STK", use 1. For ranges, use the higher value.
  "time_unit": "",           // Time unit: D (days), W (weeks), M (months). Default: D
  "price": 0.0,              // Price per unit (floating point)
  "currency": "",            // Currency (USD, EUR, etc.) - 3 character code
  "valid_to": "",            // Validity period in YYYY-MM-DD format
  "delivery_condition": "",  // Delivery terms: EXW, FCA, CPT, CIP, DPU, DAP, DDP, FAS, FOB, CFR, CIF
  "delivery_place": "",      // Delivery location (country)
  "item_note": "",           // Item notes
  "email_subject": "",       // Email subject
  "stk_qty": 0,              // Stock quantity (number only)
  "description": "",         // Item description
  "from": "",                // Supplier email address
  "moq": 1                   // Minimum order quantity (number only)
}]`;
  }
}

export const procurementRequestService = new ProcurementRequestService();