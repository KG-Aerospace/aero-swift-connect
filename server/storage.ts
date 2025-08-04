import { 
  users, customers, suppliers, emails, orders, quotes, activities,
  type User, type InsertUser,
  type Customer, type InsertCustomer,
  type Supplier, type InsertSupplier,
  type Email, type InsertEmail,
  type Order, type InsertOrder,
  type Quote, type InsertQuote,
  type Activity, type InsertActivity
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, count, sql, and, gte, lte } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

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
  createEmail(email: InsertEmail): Promise<Email>;
  updateEmailStatus(id: string, status: string, customerId?: string): Promise<Email>;

  // Orders
  getOrders(limit?: number): Promise<(Order & { customer?: Customer | null; email?: Email | null })[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order>;
  updateOrderValue(id: string, value: string): Promise<Order>;

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
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
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

  async getEmails(limit = 50): Promise<Email[]> {
    return db.select().from(emails).orderBy(desc(emails.createdAt)).limit(limit);
  }

  async getEmail(id: string): Promise<Email | undefined> {
    const [email] = await db.select().from(emails).where(eq(emails.id, id));
    return email || undefined;
  }

  async createEmail(insertEmail: InsertEmail): Promise<Email> {
    const [email] = await db.insert(emails).values(insertEmail).returning();
    return email;
  }

  async updateEmailStatus(id: string, status: string, customerId?: string): Promise<Email> {
    const updateData: any = { status, processedAt: new Date() };
    if (customerId) updateData.customerId = customerId;
    
    const [email] = await db
      .update(emails)
      .set(updateData)
      .where(eq(emails.id, id))
      .returning();
    return email;
  }

  async getOrders(limit = 50): Promise<(Order & { customer?: Customer | null; email?: Email | null })[]> {
    return db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerId: orders.customerId,
        partNumber: orders.partNumber,
        partDescription: orders.partDescription,
        quantity: orders.quantity,
        urgencyLevel: orders.urgencyLevel,
        status: orders.status,
        totalValue: orders.totalValue,
        emailId: orders.emailId,
        notes: orders.notes,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        customer: customers,
        email: emails,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(emails, eq(orders.emailId, emails.id))
      .orderBy(desc(orders.createdAt))
      .limit(limit);
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

  async getQuotes(): Promise<(Quote & { order?: Order | null; supplier?: Supplier | null })[]> {
    return db
      .select({
        id: quotes.id,
        orderId: quotes.orderId,
        supplierId: quotes.supplierId,
        price: quotes.price,
        leadTimeDays: quotes.leadTimeDays,
        validUntil: quotes.validUntil,
        status: quotes.status,
        supplierResponse: quotes.supplierResponse,
        responseTime: quotes.responseTime,
        createdAt: quotes.createdAt,
        order: orders,
        supplier: suppliers,
      })
      .from(quotes)
      .leftJoin(orders, eq(quotes.orderId, orders.id))
      .leftJoin(suppliers, eq(quotes.supplierId, suppliers.id))
      .orderBy(desc(quotes.createdAt));
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
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Daily emails
    const [dailyEmailsResult] = await db
      .select({ count: count() })
      .from(emails)
      .where(and(gte(emails.createdAt, today), lte(emails.createdAt, tomorrow)));

    // Active orders
    const [activeOrdersResult] = await db
      .select({ count: count() })
      .from(orders)
      .where(sql`${orders.status} IN ('pending', 'quoted', 'processing')`);

    // Pending quotes
    const [pendingQuotesResult] = await db
      .select({ count: count() })
      .from(quotes)
      .where(eq(quotes.status, 'pending'));

    // Total revenue (completed orders)
    const [revenueResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${orders.totalValue}), 0)` })
      .from(orders)
      .where(eq(orders.status, 'completed'));

    // Email processing rate
    const [processedEmailsResult] = await db
      .select({ count: count() })
      .from(emails)
      .where(and(
        gte(emails.createdAt, today), 
        lte(emails.createdAt, tomorrow),
        eq(emails.status, 'processed')
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
    };
  }
}

export const storage = new DatabaseStorage();
