import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, integer, jsonb, uuid, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  phone: text("phone"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  website: text("website"),
  apiEndpoint: text("api_endpoint"),
  responseTimeHours: decimal("response_time_hours", { precision: 4, scale: 2 }),
  successRate: decimal("success_rate", { precision: 5, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const emails = pgTable("emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromEmail: text("from_email").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  bodyHtml: text("body_html"),
  attachments: jsonb("attachments").$type<Array<{
    filename: string;
    contentType: string;
    size: number;
    objectPath?: string;
  }>>(),
  processedAt: timestamp("processed_at"),
  receivedAt: timestamp("received_at").defaultNow(),
  status: text("status").notNull().default("pending"), // pending, processed, failed
  customerId: varchar("customer_id").references(() => customers.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").notNull().unique(),
  positionId: text("position_id"), // Format: ID000034
  customerId: varchar("customer_id").references(() => customers.id),
  partNumber: text("part_number").notNull(),
  partDescription: text("part_description"),
  quantity: integer("quantity").notNull(),
  urgencyLevel: text("urgency_level").notNull().default("normal"), // normal, urgent, critical
  status: text("status").notNull().default("pending"), // pending, quoted, processing, shipped, completed, cancelled
  totalValue: decimal("total_value", { precision: 12, scale: 2 }),
  emailId: varchar("email_id").references(() => emails.id),
  notes: text("notes"),
  
  // Fields from draft orders - Sales section
  crNumber: text("cr_number"),
  requisitionNumber: text("requisition_number"),
  customerRequestDate: timestamp("customer_request_date"),
  uom: text("uom").default("EA"),
  cheapExp: text("cheap_exp").default("CHEAP"),
  acType: text("ac_type"),
  engineType: text("engine_type"),
  comment: text("comment"),
  
  // Procurement fields
  nq: text("nq"),
  requested: text("requested"),
  rfqDate: text("rfq_date"),
  ils: text("ils"),
  rfqStatusIls: text("rfq_status_ils"),
  ilsRfqDate: text("ils_rfq_date"),
  others: text("others"),
  rfqStatus: text("rfq_status"),
  supplierQuoteReceived: text("supplier_quote_received"),
  supplierQuoteNotes: text("supplier_quote_notes"),
  price: text("price"),
  poNumber: text("po_number"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const quotes = pgTable("quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id),
  supplierId: varchar("supplier_id").references(() => suppliers.id),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  leadTimeDays: integer("lead_time_days"),
  validUntil: timestamp("valid_until"),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected, expired
  supplierResponse: jsonb("supplier_response"),
  responseTime: decimal("response_time_hours", { precision: 4, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // email_processed, quote_received, order_created, etc.
  description: text("description").notNull(),
  entityType: text("entity_type"), // order, quote, email, etc.
  entityId: varchar("entity_id"),
  userId: varchar("user_id").references(() => users.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Draft orders table - for customer requests that need review before becoming orders
export const draftOrders = pgTable("draft_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  emailId: varchar("email_id").references(() => emails.id),
  customerId: varchar("customer_id").references(() => customers.id),
  customerReference: text("customer_reference").default(""),
  crNumber: text("cr_number").default(""),
  requisitionNumber: text("requisition_number").default(""),
  positionId: text("position_id").default(""), // Format: ID000034
  customerRequestDate: timestamp("customer_request_date"),
  inputDate: timestamp("input_date").defaultNow(),
  partNumber: text("part_number").notNull(),
  partDescription: text("part_description"),
  quantity: integer("quantity").notNull(),
  uom: text("uom").default("EA"), // Unit of Measure
  cheapExp: text("cheap_exp").default("CHEAP"), // CHEAP/EXP
  acType: text("ac_type").default(""), // Aircraft Type
  engineType: text("engine_type").default(""), // Engine Type
  urgencyLevel: text("urgency_level").notNull().default("normal"), // normal, urgent, critical
  condition: text("condition").default("NE"), // NE, NS, OH, SV, AR, etc.
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  notes: text("notes"),
  comment: text("comment").default(""),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Procurement requests table
export const procurementRequests = pgTable("procurement_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestNumber: text("request_number").unique().notNull(),
  orderId: varchar("order_id").references(() => orders.id),
  emailId: varchar("email_id").references(() => emails.id),
  supplierId: varchar("supplier_id").references(() => suppliers.id),
  status: text("status").notNull().default("pending"), // pending, approved, rejected, processing, completed
  partNumber: text("part_number").notNull(),
  quantity: integer("quantity").notNull(),
  unitOfMeasure: text("unit_of_measure").notNull(),
  condition: text("condition").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  leadTimeDays: integer("lead_time_days").notNull(),
  moq: integer("moq").default(1),
  deliveryTerms: text("delivery_terms").notNull(),
  deliveryLocation: text("delivery_location").notNull(),
  supplierDetails: jsonb("supplier_details").notNull(),
  notes: text("notes"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
  emails: many(emails),
  draftOrders: many(draftOrders),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  quotes: many(quotes),
}));

export const emailsRelations = relations(emails, ({ one, many }) => ({
  customer: one(customers, {
    fields: [emails.customerId],
    references: [customers.id],
  }),
  orders: many(orders),
  draftOrders: many(draftOrders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  email: one(emails, {
    fields: [orders.emailId],
    references: [emails.id],
  }),
  quotes: many(quotes),
}));

export const quotesRelations = relations(quotes, ({ one }) => ({
  order: one(orders, {
    fields: [quotes.orderId],
    references: [orders.id],
  }),
  supplier: one(suppliers, {
    fields: [quotes.supplierId],
    references: [suppliers.id],
  }),
}));

export const procurementRequestsRelations = relations(procurementRequests, ({ one }) => ({
  order: one(orders, {
    fields: [procurementRequests.orderId],
    references: [orders.id],
  }),
  email: one(emails, {
    fields: [procurementRequests.emailId],
    references: [emails.id],
  }),
  supplier: one(suppliers, {
    fields: [procurementRequests.supplierId],
    references: [suppliers.id],
  }),
  approvedByUser: one(users, {
    fields: [procurementRequests.approvedBy],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [procurementRequests.createdBy],
    references: [users.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
}));

export const draftOrdersRelations = relations(draftOrders, ({ one }) => ({
  email: one(emails, {
    fields: [draftOrders.emailId],
    references: [emails.id],
  }),
  customer: one(customers, {
    fields: [draftOrders.customerId],
    references: [customers.id],
  }),
  reviewedByUser: one(users, {
    fields: [draftOrders.reviewedBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
});

export const insertEmailSchema = createInsertSchema(emails).omit({
  id: true,
  createdAt: true,
  processedAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDraftOrderSchema = createInsertSchema(draftOrders, {
  customerRequestDate: z.string().transform((val) => val ? new Date(val) : null).optional(),
  inputDate: z.string().transform((val) => val ? new Date(val) : null).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  createdAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertProcurementRequestSchema = createInsertSchema(procurementRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type DraftOrder = typeof draftOrders.$inferSelect;
export type InsertDraftOrder = z.infer<typeof insertDraftOrderSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

export type Email = typeof emails.$inferSelect;
export type InsertEmail = z.infer<typeof insertEmailSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type ProcurementRequest = typeof procurementRequests.$inferSelect;
export type InsertProcurementRequest = z.infer<typeof insertProcurementRequestSchema>;
