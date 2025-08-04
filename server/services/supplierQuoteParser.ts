import { z } from "zod";
import { db } from "../db";
import { quotes, orders, suppliers, activities } from "@shared/schema";
import { eq } from "drizzle-orm";

// Validation schema for supplier quote data
const QuoteItemSchema = z.object({
  supplier: z.string().min(1, "Supplier name is required"),
  quote_id: z.string().nullable().optional(),
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
  customer_request_id: z.string().nullable().optional(),
  delivery_condition: z.enum(["EXW", "FCA", "CPT", "CIP", "DPU", "DAP", "DDP", "FAS", "FOB", "CFR", "CIF"]),
  delivery_place: z.string().min(1, "Delivery place is required"),
  item_note: z.string().optional().default(""),
  email_subject: z.string().min(1, "Email subject is required"),
  stk_qty: z.number().min(0).default(0),
  description: z.string().optional().default(""),
  from: z.string().email("Invalid email address"),
  moq: z.number().positive().default(1),
});

const QuoteArraySchema = z.array(QuoteItemSchema);

export class SupplierQuoteParser {
  /**
   * Parse and validate supplier quote data
   */
  public async parseQuoteData(rawData: string): Promise<z.infer<typeof QuoteArraySchema>> {
    try {
      // Parse JSON string
      const parsedData = JSON.parse(rawData);
      
      // Validate against schema
      const validatedData = QuoteArraySchema.parse(parsedData);
      
      // Additional transformations
      return validatedData.map(item => ({
        ...item,
        // Convert "IN" to "IT" for condition code if needed
        condition: item.condition === "IN" as any ? "IT" : item.condition,
        // Ensure lead_time is set to 1 if stock is available
        lead_time: item.lead_time === 0 && (item.item_note?.toLowerCase().includes("stock") || item.item_note?.toLowerCase().includes("stk")) ? 1 : item.lead_time,
      }));
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation error: ${error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ")}`);
      }
      throw new Error(`Failed to parse quote data: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Process parsed quotes and save to database
   */
  public async processQuotes(quoteData: z.infer<typeof QuoteArraySchema>, emailId?: string) {
    const processedQuotes = [];
    
    for (const quote of quoteData) {
      try {
        // Find or create supplier
        let supplier = await this.findOrCreateSupplier(quote.supplier, quote.from);
        
        // Find matching order by part number
        const [matchingOrder] = await db
          .select()
          .from(orders)
          .where(eq(orders.partNumber, quote.part_number))
          .limit(1);
        
        if (!matchingOrder) {
          console.log(`No matching order found for part number: ${quote.part_number}`);
          continue;
        }
        
        // Calculate lead time in days
        const leadTimeDays = this.calculateLeadTimeDays(quote.lead_time, quote.time_unit);
        
        // Create quote record
        const [savedQuote] = await db
          .insert(quotes)
          .values({
            orderId: matchingOrder.id,
            supplierId: supplier.id,
            price: quote.price.toString(),
            leadTimeDays,
            validUntil: new Date(quote.valid_to),
            status: "pending",
            supplierResponse: {
              quantity: quote.qty,
              moq: quote.moq,
              is_moq: quote.is_moq,
              unit_of_measure: quote.um,
              condition: quote.condition,
              currency: quote.currency,
              delivery_condition: quote.delivery_condition,
              delivery_place: quote.delivery_place,
              stock_quantity: quote.stk_qty,
              description: quote.description,
              notes: quote.item_note,
              email_subject: quote.email_subject,
              email_from: quote.from,
              quote_date: quote.date,
            },
            responseTime: this.calculateResponseTime(quote.date).toString(),
          })
          .returning();
        
        // Create activity log
        await db.insert(activities).values({
          type: "quote_received",
          description: `Quote received from ${quote.supplier} for part ${quote.part_number}`,
          entityType: "quote",
          entityId: savedQuote.id,
          metadata: {
            price: quote.price,
            currency: quote.currency,
            lead_time: `${quote.lead_time} ${quote.time_unit}`,
            condition: quote.condition,
          },
        });
        
        processedQuotes.push(savedQuote);
        
        // Update order status if needed
        if (matchingOrder.status === "pending") {
          await db
            .update(orders)
            .set({ status: "quoted", updatedAt: new Date() })
            .where(eq(orders.id, matchingOrder.id));
        }
        
      } catch (error) {
        console.error(`Error processing quote for ${quote.part_number}:`, error);
      }
    }
    
    return processedQuotes;
  }

  /**
   * Find or create supplier
   */
  private async findOrCreateSupplier(supplierName: string, email: string) {
    // Check if supplier exists
    const [existingSupplier] = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.email, email))
      .limit(1);
    
    if (existingSupplier) {
      return existingSupplier;
    }
    
    // Create new supplier
    const [newSupplier] = await db
      .insert(suppliers)
      .values({
        name: supplierName,
        email: email,
        isActive: true,
        responseTimeHours: "24", // Default 24 hours
        successRate: "100", // Start with 100% success rate
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
   * Calculate response time in hours from quote date
   */
  private calculateResponseTime(quoteDate: string): number {
    const quoteDateObj = new Date(quoteDate);
    const now = new Date();
    const diffMs = now.getTime() - quoteDateObj.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.max(1, Math.round(diffHours));
  }

  /**
   * Get quote template for suppliers
   */
  public getQuoteTemplate(): string {
    return `[{
  "supplier": "",            // Supplier name
  "quote_id": null,          // Leave empty
  "date": "",                // Proposal date in YYYY-MM-DD format
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
  "customer_request_id": null, // Leave empty
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

export const supplierQuoteParser = new SupplierQuoteParser();