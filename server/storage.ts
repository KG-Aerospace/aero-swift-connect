import { 
  users, customers, suppliers, emails, orders, quotes, activities, draftOrders, parts,
  type User, type InsertUser,
  type Customer, type InsertCustomer,
  type Supplier, type InsertSupplier,
  type Email, type InsertEmail,
  type Order, type InsertOrder,
  type Quote, type InsertQuote,
  type Activity, type InsertActivity,
  type DraftOrder, type InsertDraftOrder,
  type Part, type InsertPart
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, desc, count, sql, and, gte, lte } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(id: string, password: string): Promise<void>;

  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;

  // Suppliers
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier>;

  // Emails
  getEmails(limit?: number): Promise<Email[]>;
  getEmail(id: string): Promise<Email | undefined>;
  getEmailById(id: string): Promise<Email | undefined>;
  createEmail(email: InsertEmail): Promise<Email>;
  updateEmailStatus(id: string, status: string, customerId?: string): Promise<Email>;
  getUnprocessedEmails(limit?: number): Promise<Email[]>;
  assignEmailToUser(emailId: string, userId: string): Promise<Email>;
  getAssignedEmails(userId: string): Promise<Email[]>;
  markEmailAsProcessed(emailId: string): Promise<Email>;

  // Orders
  getOrders(limit?: number): Promise<(Order & { customer?: Customer | null; email?: Email | null })[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order>;
  updateOrderValue(id: string, value: string): Promise<Order>;
  updateOrder(id: string, updates: Partial<InsertOrder>): Promise<Order>;

  // Quotes
  getQuotes(): Promise<(Quote & { order?: Order | null; supplier?: Supplier | null })[]>;
  getQuote(id: string): Promise<Quote | undefined>;
  getQuotesByOrder(orderId: string): Promise<Quote[]>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuoteStatus(id: string, status: string): Promise<Quote>;

  // Activities
  getRecentActivities(limit?: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;

  // Dashboard stats
  getDashboardStats(): Promise<{
    dailyEmails: number;
    activeOrders: number;
    pendingQuotes: number;
    totalRevenue: string;
    emailProcessingRate: number;
  }>;

  // Parts
  getPartByNumber(partNumber: string): Promise<Part | undefined>;
  getParts(): Promise<Part[]>;
  createPart(part: InsertPart): Promise<Part>;
  updatePartPrice(partNumber: string, price: string, currency?: string): Promise<Part>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      id: insertUser.id || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...insertUser,
    }).returning();
    return user;
  }

  async updateUserPassword(id: string, password: string): Promise<void> {
    await db.update(users).set({ password }).where(eq(users.id, id));
  }

  async getCustomers(): Promise<Customer[]> {
    return db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.email, email));
    return customer || undefined;
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const [customer] = await db.insert(customers).values(insertCustomer).returning();
    return customer;
  }

  async getSuppliers(): Promise<Supplier[]> {
    return db.select().from(suppliers).orderBy(desc(suppliers.successRate));
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier || undefined;
  }

  async createSupplier(insertSupplier: InsertSupplier): Promise<Supplier> {
    const [supplier] = await db.insert(suppliers).values(insertSupplier).returning();
    return supplier;
  }

  async updateSupplier(id: string, supplierData: Partial<InsertSupplier>): Promise<Supplier> {
    const [supplier] = await db
      .update(suppliers)
      .set(supplierData)
      .where(eq(suppliers.id, id))
      .returning();
    return supplier;
  }

  async getEmails(limit = 200): Promise<Email[]> {
    const result = await db
      .select({
        email: emails,
        assignedToUser: users
      })
      .from(emails)
      .leftJoin(users, eq(emails.assignedToUserId, users.id))
      .orderBy(desc(emails.receivedAt))
      .limit(limit);
    
    return result.map(row => ({
      ...row.email,
      assignedToUser: row.assignedToUser
    }));
  }

  async getEmailById(id: string): Promise<Email | undefined> {
    return this.getEmail(id);
  }

  async createEmail(insertEmail: InsertEmail): Promise<Email> {
    const [email] = await db.insert(emails).values(insertEmail).returning();
    return email;
  }

  async updateEmailStatus(id: string, customerId?: string): Promise<Email> {
    const updateData: any = { processed: true };
    if (customerId) updateData.customerId = customerId;
    
    const [email] = await db
      .update(emails)
      .set(updateData)
      .where(eq(emails.id, id))
      .returning();
    return email;
  }

  async getUnprocessedEmails(limit?: number): Promise<Email[]> {
    const query = db
      .select()
      .from(emails)
      .where(eq(emails.processed, false))
      .orderBy(desc(emails.receivedAt));
    
    if (limit) {
      query.limit(limit);
    }
    
    return query;
  }

  async getPendingEmails(limit: number = 10): Promise<Email[]> {
    const pendingEmails = await db
      .select()
      .from(emails)
      .where(eq(emails.processed, false))
      .limit(limit)
      .orderBy(emails.receivedAt);
    return pendingEmails;
  }

  async assignEmailToUser(emailId: string, userId: string): Promise<Email> {
    const [email] = await db
      .update(emails)
      .set({ 
        assignedToUserId: userId,
        assignedAt: new Date()
      })
      .where(eq(emails.id, emailId))
      .returning();
    return email;
  }

  async getAssignedEmails(userId: string): Promise<Email[]> {
    const result = await db
      .select({
        email: emails,
        assignedToUser: users
      })
      .from(emails)
      .leftJoin(users, eq(emails.assignedToUserId, users.id))
      .where(eq(emails.assignedToUserId, userId))
      .orderBy(desc(emails.assignedAt));
    
    return result.map(row => ({
      ...row.email,
      assignedToUser: row.assignedToUser
    }));
  }

  async markEmailAsProcessed(emailId: string): Promise<Email> {
    // First delete all draft orders associated with this email
    await db
      .delete(draftOrders)
      .where(eq(draftOrders.emailId, emailId));
    
    // Then mark the email as processed
    const [email] = await db
      .update(emails)
      .set({ 
        processed: true
      })
      .where(eq(emails.id, emailId))
      .returning();
    return email;
  }

  async getOrders(limit = 50): Promise<(Order & { customer?: Customer | null; email?: Email | null })[]> {
    const result = await db
      .select()
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(emails, eq(orders.emailId, emails.id))
      // Show all orders, not just verified
      .orderBy(desc(orders.createdAt))
      .limit(limit);

    return result.map(row => ({
      ...row.orders,
      customer: row.customers,
      email: row.emails,
    }));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values({
      ...insertOrder,
      orderNumber: `ORD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
    }).returning();
    return order;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order> {
    const [order] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async updateOrderValue(id: string, value: string): Promise<Order> {
    const [order] = await db
      .update(orders)
      .set({ totalValue: value, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async updateOrder(id: string, updates: Partial<InsertOrder>): Promise<Order> {
    const [order] = await db
      .update(orders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async getQuotes(): Promise<(Quote & { order?: Order | null; supplier?: Supplier | null })[]> {
    const result = await db
      .select()
      .from(quotes)
      .leftJoin(orders, eq(quotes.orderId, orders.id))
      .leftJoin(suppliers, eq(quotes.supplierId, suppliers.id))
      .orderBy(desc(quotes.createdAt));

    return result.map(row => ({
      ...row.quotes,
      order: row.orders,
      supplier: row.suppliers,
    }));
  }

  async getQuote(id: string): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
    return quote || undefined;
  }

  async getQuotesByOrder(orderId: string): Promise<Quote[]> {
    return db.select().from(quotes).where(eq(quotes.orderId, orderId));
  }

  async createQuote(insertQuote: InsertQuote): Promise<Quote> {
    const [quote] = await db.insert(quotes).values(insertQuote).returning();
    return quote;
  }

  async updateQuoteStatus(id: string, status: string): Promise<Quote> {
    const [quote] = await db
      .update(quotes)
      .set({ status })
      .where(eq(quotes.id, id))
      .returning();
    return quote;
  }

  async getRecentActivities(limit = 10): Promise<Activity[]> {
    return db.select().from(activities).orderBy(desc(activities.createdAt)).limit(limit);
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db.insert(activities).values(insertActivity).returning();
    return activity;
  }

  async getDashboardStats(): Promise<{
    dailyEmails: number;
    activeOrders: number;
    pendingQuotes: number;
    totalRevenue: string;
    emailProcessingRate: number;
    pendingDrafts: number;
    processedEmails: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Daily emails - count emails received today
    const [dailyEmailsResult] = await db
      .select({ count: count() })
      .from(emails)
      .where(and(gte(emails.receivedAt, today), lte(emails.receivedAt, tomorrow)));

    // Active orders (verified orders only)
    const [activeOrdersResult] = await db
      .select({ count: count() })
      .from(orders)
      .where(eq(orders.status, 'verified'));

    // Pending draft orders
    const [pendingDraftsResult] = await db
      .select({ count: count() })
      .from(draftOrders)
      .where(eq(draftOrders.status, 'pending'));

    // Total processed emails
    const [totalProcessedResult] = await db
      .select({ count: count() })
      .from(emails)
      .where(eq(emails.processed, true));

    // Pending quotes
    const [pendingQuotesResult] = await db
      .select({ count: count() })
      .from(quotes)
      .where(eq(quotes.status, 'pending'));

    // Total revenue (completed orders)
    const [revenueResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(total_value), 0)` })
      .from(orders)
      .where(eq(orders.status, 'completed'));

    // Email processing rate - count emails received and processed today
    const [processedEmailsResult] = await db
      .select({ count: count() })
      .from(emails)
      .where(and(
        gte(emails.receivedAt, today), 
        lte(emails.receivedAt, tomorrow),
        eq(emails.processed, true)
      ));

    const emailProcessingRate = dailyEmailsResult.count > 0 
      ? (processedEmailsResult.count / dailyEmailsResult.count) * 100 
      : 0;

    return {
      dailyEmails: dailyEmailsResult.count,
      activeOrders: activeOrdersResult.count,
      pendingQuotes: pendingQuotesResult.count,
      totalRevenue: revenueResult.total || "0",
      emailProcessingRate: Math.round(emailProcessingRate * 10) / 10,
      pendingDrafts: pendingDraftsResult.count,
      processedEmails: totalProcessedResult.count,
    };
  }

  async getEmail(id: string): Promise<any> {
    try {
      // Use pool directly to get all columns including body and body_html
      const { rows } = await pool.query(`
        SELECT 
          e.*,
          c.id as customer_id,
          c.name as customer_name,
          c.email as customer_email,
          c.phone as customer_phone,
          c.company as customer_company,
          c.created_at as customer_created_at
        FROM emails e
        LEFT JOIN customers c ON e.customer_id = c.id
        WHERE e.id = $1
      `, [id]);
      
      if (rows.length === 0) return undefined;
      
      const emailRow = rows[0];
      
      const customer = emailRow.customer_id ? {
        id: emailRow.customer_id,
        name: emailRow.customer_name,
        email: emailRow.customer_email,
        phone: emailRow.customer_phone,
        company: emailRow.customer_company,
        createdAt: emailRow.customer_created_at,
      } : undefined;
      
      // Return all email fields including body and body_html
      return {
        id: emailRow.id,
        messageId: emailRow.message_id,
        subject: emailRow.subject,
        fromEmail: emailRow.from_email,
        toEmail: emailRow.to_email,
        content: emailRow.content || emailRow.body,
        htmlContent: emailRow.html_content || emailRow.body_html,
        body: emailRow.body,
        bodyHtml: emailRow.body_html,
        receivedAt: emailRow.received_at,
        processed: emailRow.processed,
        customerId: emailRow.customer_id,
        createdAt: emailRow.created_at,
        attachments: emailRow.attachments,
        customer,
      };
    } catch (error) {
      console.error("Error fetching email:", error);
      return undefined;
    }
  }

  async getOrdersByEmail(emailId: string): Promise<Order[]> {
    try {
      const result = await db
        .select({
          order: orders,
          customer: customers,
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .where(eq(orders.emailId, emailId))
        .orderBy(desc(orders.createdAt));
      
      return result.map(row => ({
        ...row.order,
        customer: row.customer || undefined,
      })) as any[];
    } catch (error) {
      console.error("Error fetching orders by email:", error);
      return [];
    }
  }

  // Parts methods
  async getPartByNumber(partNumber: string): Promise<Part | undefined> {
    const normalizedPN = partNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const [part] = await db.select().from(parts)
      .where(eq(parts.normalized, normalizedPN));
    return part || undefined;
  }

  async getParts(): Promise<Part[]> {
    return db.select().from(parts).orderBy(desc(parts.partNumber));
  }

  async createPart(insertPart: InsertPart): Promise<Part> {
    const [part] = await db.insert(parts).values({
      id: insertPart.id || `part-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...insertPart,
      normalized: insertPart.partNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase()
    }).returning();
    return part;
  }

  async updatePartPrice(partNumber: string, price: string, currency?: string): Promise<Part> {
    const normalizedPN = partNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const [part] = await db.update(parts)
      .set({ price, currency: currency || 'USD' })
      .where(eq(parts.normalized, normalizedPN))
      .returning();
    return part;
  }
}

export const storage = new DatabaseStorage();
