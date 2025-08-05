import { pgTable, text, varchar, integer, timestamp, boolean, json, jsonb, uuid, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(),
});

export const insertUserSchema = createInsertSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  company: text("company"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCustomerSchema = createInsertSchema(customers);
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  website: text("website"),
  apiEndpoint: text("api_endpoint"),
  responseTimeHours: integer("response_time_hours"),
  successRate: integer("success_rate"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSupplierSchema = createInsertSchema(suppliers);
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

export const emails = pgTable("emails", {
  id: varchar("id").primaryKey(),
  messageId: text("message_id").unique(),
  subject: text("subject").notNull(),
  fromEmail: text("from_email").notNull(),
  toEmail: text("to_email"),
  content: text("content"),
  htmlContent: text("html_content"),
  receivedAt: timestamp("received_at").notNull(),
  processed: boolean("processed").default(false),
  customerId: varchar("customer_id").references(() => customers.id),
  createdAt: timestamp("created_at").defaultNow(),
  attachments: jsonb("attachments").$type<Array<{
    filename: string;
    contentType: string;
    size: number;
    path?: string;
  }>>().default([]),
});

export const insertEmailSchema = createInsertSchema(emails);
export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type Email = typeof emails.$inferSelect;

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerId: varchar("customer_id").references(() => customers.id),
  partNumber: text("part_number").notNull(),
  partDescription: text("part_description"),
  quantity: integer("quantity").notNull(),
  urgencyLevel: text("urgency_level"),
  status: text("status").notNull(),
  totalValue: text("total_value"),
  emailId: varchar("email_id").references(() => emails.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  positionId: text("position_id"),
  crNumber: text("cr_number"),
  requisitionNumber: text("requisition_number"),
  customerRequestDate: timestamp("customer_request_date"),
  uom: text("uom"),
  cheapExp: text("cheap_exp"),
  acType: text("ac_type"),
  engineType: text("engine_type"),
  comment: text("comment"),
  nq: text("nq"),
  requested: text("requested"),
  rfqDate: timestamp("rfq_date"),
  ils: text("ils"),
  rfqStatusIls: text("rfq_status_ils"),
  ilsRfqDate: timestamp("ils_rfq_date"),
  others: text("others"),
  rfqStatus: text("rfq_status"),
  supplierQuoteReceived: text("supplier_quote_received"),
  supplierQuoteNotes: text("supplier_quote_notes"),
  price: text("price"),
  poNumber: text("po_number"),
  condition: text("condition"),
});

export const insertOrderSchema = createInsertSchema(orders);
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export const quotes = pgTable("quotes", {
  id: varchar("id").primaryKey(),
  orderId: varchar("order_id").references(() => orders.id),
  supplierId: varchar("supplier_id").references(() => suppliers.id),
  price: integer("price").notNull(),
  leadTimeDays: integer("lead_time_days"),
  leadTime: integer("lead_time"),
  validUntil: timestamp("valid_until"),
  status: text("status").notNull(),
  supplierResponse: jsonb("supplier_response"),
  responseTimeHours: integer("response_time_hours"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertQuoteSchema = createInsertSchema(quotes);
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotes.$inferSelect;

export const activities = pgTable("activities", {
  id: varchar("id").primaryKey(),
  type: text("type").notNull(), // email_received, order_created, quote_received, etc.
  entityId: varchar("entity_id"), // Reference to order, quote, email, etc.
  entityType: text("entity_type"), // order, quote, email, etc.
  description: text("description").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertActivitySchema = createInsertSchema(activities);
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

export const procurementRequests = pgTable("procurement_requests", {
  id: varchar("id").primaryKey(),
  orderId: varchar("order_id").references(() => orders.id),
  supplierId: varchar("supplier_id").references(() => suppliers.id),
  requestData: jsonb("request_data").notNull(), // Full procurement request JSON
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProcurementRequestSchema = createInsertSchema(procurementRequests);
export type InsertProcurementRequest = z.infer<typeof insertProcurementRequestSchema>;
export type ProcurementRequest = typeof procurementRequests.$inferSelect;

export const draftOrders = pgTable("draft_orders", {
  id: varchar("id").primaryKey(),
  emailId: varchar("email_id").references(() => emails.id),
  customerId: varchar("customer_id").references(() => customers.id),
  customerReference: text("customer_reference").default(""),
  crNumber: text("cr_number").default(""),
  requisitionNumber: text("requisition_number").default(""),
  positionId: text("position_id").default(""), // Format: ID-00473
  customerRequestDate: timestamp("customer_request_date"),
  inputDate: timestamp("input_date").defaultNow(),
  partNumber: text("part_number").notNull(),
  partDescription: text("part_description"),
  quantity: integer("quantity").notNull().default(1),
  uom: text("uom").default("EA"), // EA, SET, KIT, etc.
  cheapExp: text("cheap_exp").default("CHEAP"), // CHEAP, EXP
  acType: text("ac_type").default(""), // B737, A320, etc.
  engineType: text("engine_type").default(""), // CFM56, V2500, etc.
  urgencyLevel: text("urgency_level").default("normal"), // aog, critical, normal
  condition: text("condition").default("NE"), // NE, NS, OH, SV, AR, etc.
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  notes: text("notes"),
  comment: text("comment").default(""),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  rejectionReason: text("rejection_reason"),
  aiGenerated: boolean("ai_generated").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDraftOrderSchema = createInsertSchema(draftOrders);
export type InsertDraftOrder = z.infer<typeof insertDraftOrderSchema>;
export type DraftOrder = typeof draftOrders.$inferSelect;

// New tables for AC Types and Engine Types
export const acTypes = pgTable("ac_types", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().unique(),
  normalized: text("normalized"), // Normalized version (e.g., B737 for B-737, 737, etc.)
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAcTypeSchema = createInsertSchema(acTypes);
export type InsertAcType = z.infer<typeof insertAcTypeSchema>;
export type AcType = typeof acTypes.$inferSelect;

export const engineTypes = pgTable("engine_types", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().unique(),
  manufacturer: text("manufacturer"),
  acTypes: text("ac_types").array(), // Which aircraft types use this engine
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEngineTypeSchema = createInsertSchema(engineTypes);
export type InsertEngineType = z.infer<typeof insertEngineTypeSchema>;
export type EngineType = typeof engineTypes.$inferSelect;

// Parts table for part number and description mapping
export const parts = pgTable("parts", {
  id: serial("id").primaryKey(),
  partNumber: text("part_number").notNull().unique(),
  description: text("description").notNull(),
  normalized: text("normalized"), // Normalized part number for searching
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPartSchema = createInsertSchema(parts);
export type InsertPart = z.infer<typeof insertPartSchema>;
export type Part = typeof parts.$inferSelect;

// Relations
export const emailRelations = relations(emails, ({ one, many }) => ({
  customer: one(customers, {
    fields: [emails.customerId],
    references: [customers.id],
  }),
  orders: many(orders),
  draftOrders: many(draftOrders),
}));

export const customerRelations = relations(customers, ({ many }) => ({
  emails: many(emails),
  orders: many(orders),
  draftOrders: many(draftOrders),
}));

export const orderRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  email: one(emails, {
    fields: [orders.emailId],
    references: [emails.id],
  }),
  quotes: many(quotes),
  procurementRequests: many(procurementRequests),
}));

export const quoteRelations = relations(quotes, ({ one }) => ({
  order: one(orders, {
    fields: [quotes.orderId],
    references: [orders.id],
  }),
  supplier: one(suppliers, {
    fields: [quotes.supplierId],
    references: [suppliers.id],
  }),
}));

export const supplierRelations = relations(suppliers, ({ many }) => ({
  quotes: many(quotes),
  procurementRequests: many(procurementRequests),
}));

export const procurementRequestRelations = relations(procurementRequests, ({ one }) => ({
  order: one(orders, {
    fields: [procurementRequests.orderId],
    references: [orders.id],
  }),
  supplier: one(suppliers, {
    fields: [procurementRequests.supplierId],
    references: [suppliers.id],
  }),
  approvedByUser: one(users, {
    fields: [procurementRequests.approvedBy],
    references: [users.id],
  }),
}));

export const draftOrderRelations = relations(draftOrders, ({ one }) => ({
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