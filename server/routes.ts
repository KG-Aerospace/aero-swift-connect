import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { db, pool } from "./db";
import { orders, emails, activities, suppliers, quotes, customers, procurementRequests, draftOrders, acTypes, engineTypes, insertCustomerSchema, insertSupplierSchema, insertOrderSchema, insertQuoteSchema, insertEmailSchema, insertProcurementRequestSchema, insertDraftOrderSchema } from "@shared/schema";
import { emailService } from "./services/emailService";
import { supplierService } from "./services/supplierService";
import { timwebMailService } from "./services/timwebMailService";
import { supplierQuoteParser } from "./services/supplierQuoteParser";
import { procurementRequestService } from "./services/procurementRequestService";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { draftOrderService } from "./services/draftOrderService";
import { authService } from "./services/authService";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

// Extend Express Request type to include user
declare module 'express-serve-static-core' {
  interface Request {
    session?: session.Session & Partial<session.SessionData> & {
      userId?: string;
    };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Configure session middleware
  const pgStore = connectPgSimple(session);
  app.use(
    session({
      store: new pgStore({
        pool,
        tableName: 'sessions',
      }),
      secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      },
    })
  );

  // Authentication middleware
  const requireAuth = async (req: any, res: any, next: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  };

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const user = await authService.authenticateUser(username, password);
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      req.session!.userId = user.id;
      
      res.json({ 
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session?.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session!.userId!);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ 
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // User management routes (admin only)
  app.post("/api/users", requireAuth, async (req, res) => {
    try {
      // Check if current user is admin
      const currentUser = await storage.getUser(req.session!.userId!);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { username, password, name, role } = req.body;
      
      if (!username || !password || !name || !role) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      const user = await authService.createUser({
        username,
        password,
        name,
        role
      });

      res.json({ 
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // API endpoints for AC Types and Engine Types
  app.get("/api/ac-types", async (req, res) => {
    try {
      const types = await db.select().from(acTypes).orderBy(acTypes.type);
      res.json(types);
    } catch (error) {
      console.error("Error fetching AC types:", error);
      res.status(500).json({ error: "Failed to fetch AC types" });
    }
  });

  app.get("/api/engine-types", async (req, res) => {
    try {
      const types = await db.select().from(engineTypes).orderBy(engineTypes.type);
      res.json(types);
    } catch (error) {
      console.error("Error fetching engine types:", error);
      res.status(500).json({ error: "Failed to fetch engine types" });
    }
  });

  // WebSocket setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
  });

  // Broadcast function for real-time updates
  const broadcast = (data: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };

  // Dashboard API
  app.get("/api/dashboard/stats", async (_req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Orders API
  app.get("/api/orders", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const orders = await storage.getOrders(limit);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.post("/api/orders", requireAuth, async (req, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(orderData);
      
      // Create activity
      await storage.createActivity({
        type: "order_created",
        description: `New order created: ${order.orderNumber}`,
        entityType: "order",
        entityId: order.id,
        userId: req.session!.userId,
      });
      
      // Broadcast real-time update
      broadcast({ type: "order_created", data: order });
      
      // Start supplier integration process
      supplierService.processOrderQuotes(order.id);
      
      res.status(201).json(order);
    } catch (error) {
      res.status(400).json({ message: "Invalid order data" });
    }
  });

  app.patch("/api/orders/:id/status", requireAuth, async (req, res) => {
    try {
      const { status } = req.body;
      const order = await storage.updateOrderStatus(req.params.id, status);
      
      // Create activity
      await storage.createActivity({
        type: "order_status_updated",
        description: `Order ${order.orderNumber} status updated to ${status}`,
        entityType: "order",
        entityId: order.id,
        userId: req.session!.userId,
      });
      
      // Broadcast real-time update
      broadcast({ type: "order_updated", data: order });
      
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  app.patch("/api/orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Convert date strings to Date objects if they exist and are not null/empty
      const processedUpdates = { ...updates };
      if (updates.createdAt && updates.createdAt !== '') {
        processedUpdates.createdAt = new Date(updates.createdAt);
      } else if (updates.createdAt === '') {
        processedUpdates.createdAt = null;
      }
      
      if (updates.updatedAt && updates.updatedAt !== '') {
        processedUpdates.updatedAt = new Date(updates.updatedAt);
      } else if (updates.updatedAt === '') {
        processedUpdates.updatedAt = null;
      }
      
      if (updates.customerRequestDate && updates.customerRequestDate !== '') {
        processedUpdates.customerRequestDate = new Date(updates.customerRequestDate);
      } else if (updates.customerRequestDate === '') {
        processedUpdates.customerRequestDate = null;
      }
      
      if (updates.rfqDate && updates.rfqDate !== '') {
        processedUpdates.rfqDate = new Date(updates.rfqDate);
      } else if (updates.rfqDate === '') {
        processedUpdates.rfqDate = null;
      }
      
      if (updates.ilsRfqDate && updates.ilsRfqDate !== '') {
        processedUpdates.ilsRfqDate = new Date(updates.ilsRfqDate);
      } else if (updates.ilsRfqDate === '') {
        processedUpdates.ilsRfqDate = null;
      }
      
      const updatedOrder = await storage.updateOrder(id, processedUpdates);
      
      if (!updatedOrder) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Create activity
      await storage.createActivity({
        type: "order_updated",
        description: `Order ${updatedOrder.orderNumber} was updated`,
        entityType: "order",
        entityId: updatedOrder.id,
      });
      
      // Broadcast real-time update
      broadcast({ type: "order_updated", data: updatedOrder });
      
      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ message: "Failed to update order" });
    }
  });

  // Customers API
  app.get("/api/customers", async (_req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(customerData);
      res.status(201).json(customer);
    } catch (error) {
      res.status(400).json({ message: "Invalid customer data" });
    }
  });

  // Suppliers API
  app.get("/api/suppliers", async (_req, res) => {
    try {
      const suppliers = await storage.getSuppliers();
      res.json(suppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ message: "Failed to fetch suppliers" });
    }
  });

  app.post("/api/suppliers", async (req, res) => {
    try {
      const supplierData = insertSupplierSchema.parse(req.body);
      const supplier = await storage.createSupplier(supplierData);
      res.status(201).json(supplier);
    } catch (error) {
      res.status(400).json({ message: "Invalid supplier data" });
    }
  });

  app.patch("/api/suppliers/:id", async (req, res) => {
    try {
      const supplierData = insertSupplierSchema.partial().parse(req.body);
      const supplier = await storage.updateSupplier(req.params.id, supplierData);
      res.json(supplier);
    } catch (error) {
      res.status(400).json({ message: "Invalid supplier data" });
    }
  });

  // Quotes API
  app.get("/api/quotes", async (_req, res) => {
    try {
      const quotes = await storage.getQuotes();
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  app.get("/api/orders/:orderId/quotes", async (req, res) => {
    try {
      const quotes = await storage.getQuotesByOrder(req.params.orderId);
      res.json(quotes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch quotes for order" });
    }
  });

  app.post("/api/quotes", async (req, res) => {
    try {
      const quoteData = insertQuoteSchema.parse(req.body);
      const quote = await storage.createQuote(quoteData);
      
      // Create activity
      await storage.createActivity({
        type: "quote_received",
        description: `New quote received from supplier`,
        entityType: "quote",
        entityId: quote.id,
      });
      
      // Broadcast real-time update
      broadcast({ type: "quote_created", data: quote });
      
      res.status(201).json(quote);
    } catch (error) {
      res.status(400).json({ message: "Invalid quote data" });
    }
  });

  app.patch("/api/quotes/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const quote = await storage.updateQuoteStatus(req.params.id, status);
      
      // Create activity
      await storage.createActivity({
        type: "quote_status_updated",
        description: `Quote status updated to ${status}`,
        entityType: "quote",
        entityId: quote.id,
      });
      
      // Broadcast real-time update
      broadcast({ type: "quote_updated", data: quote });
      
      res.json(quote);
    } catch (error) {
      res.status(500).json({ message: "Failed to update quote status" });
    }
  });

  // Emails API
  app.get("/api/emails", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const emails = await storage.getEmails(limit);
      res.json(emails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch emails" });
    }
  });

  // Assign email to user
  app.post("/api/emails/:id/assign", requireAuth, async (req, res) => {
    try {
      const emailId = req.params.id;
      const userId = req.session!.userId!;
      
      console.log("Assigning email:", { emailId, userId, session: req.session });
      
      const email = await storage.assignEmailToUser(emailId, userId);
      
      console.log("Email assigned successfully:", email);
      
      // Create activity
      const user = await storage.getUser(userId);
      await storage.createActivity({
        type: "email_assigned",
        description: `Email assigned to ${user?.name || 'user'}`,
        entityType: "email",
        entityId: emailId,
        userId: userId
      });
      
      // Broadcast real-time update
      broadcast({ type: "email_assigned", data: { emailId, userId, userName: user?.name } });
      
      res.json(email);
    } catch (error) {
      console.error("Failed to assign email:", error);
      res.status(500).json({ message: "Failed to assign email" });
    }
  });

  // Mark email as processed (skip)
  app.post("/api/emails/:id/mark-processed", requireAuth, async (req, res) => {
    try {
      const emailId = req.params.id;
      const userId = req.session!.userId!;
      
      const email = await storage.markEmailAsProcessed(emailId);
      
      // Create activity
      const user = await storage.getUser(userId);
      await storage.createActivity({
        type: "email_skipped",
        description: `Email marked as processed by ${user?.name || 'user'}`,
        entityType: "email",
        entityId: emailId,
        userId: userId
      });
      
      // Broadcast real-time update
      broadcast({ type: "email_processed", data: { emailId, userId, userName: user?.name } });
      
      res.json(email);
    } catch (error) {
      console.error("Failed to mark email as processed:", error);
      res.status(500).json({ message: "Failed to mark email as processed" });
    }
  });

  // Get user's assigned emails
  app.get("/api/emails/my-assigned", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const emails = await storage.getAssignedEmails(userId);
      res.json(emails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assigned emails" });
    }
  });

  app.get("/api/emails/:id", async (req, res) => {
    try {
      const email = await storage.getEmail(req.params.id);
      if (!email) {
        return res.status(404).json({ message: "Email not found" });
      }
      res.json(email);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email" });
    }
  });

  app.get("/api/emails/:id/orders", async (req, res) => {
    try {
      const orders = await storage.getOrdersByEmail(req.params.id);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders for email" });
    }
  });

  app.post("/api/emails", async (req, res) => {
    try {
      const emailData = insertEmailSchema.parse(req.body);
      const email = await storage.createEmail(emailData);
      
      // Process email asynchronously
      emailService.processEmail(email.id);
      
      res.status(201).json(email);
    } catch (error) {
      res.status(400).json({ message: "Invalid email data" });
    }
  });

  // Activities API
  app.get("/api/activities", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const activities = await storage.getRecentActivities(limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // Email processing endpoint
  app.post("/api/emails/process-batch", async (req, res) => {
    try {
      const result = await emailService.processBatch();
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to process email batch" });
    }
  });

  // Supplier integration endpoint
  app.post("/api/suppliers/send-requests", async (req, res) => {
    try {
      const { orderId } = req.body;
      const result = await supplierService.processOrderQuotes(orderId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to send supplier requests" });
    }
  });

  // Timweb Mail Service API
  app.get("/api/mail/status", async (req, res) => {
    try {
      const status = timwebMailService.getConnectionStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to get mail service status" });
    }
  });

  app.post("/api/mail/start", async (req, res) => {
    try {
      await timwebMailService.startEmailMonitoring();
      res.json({ message: "Email monitoring started", status: "active" });
    } catch (error) {
      res.status(500).json({ message: "Failed to start email monitoring" });
    }
  });

  app.post("/api/mail/stop", async (req, res) => {
    try {
      timwebMailService.stopEmailMonitoring();
      res.json({ message: "Email monitoring stopped", status: "inactive" });
    } catch (error) {
      res.status(500).json({ message: "Failed to stop email monitoring" });
    }
  });

  app.post("/api/mail/test", async (req, res) => {
    try {
      // Test basic connection parameters
      const testConfig = {
        host: process.env.TIMWEB_MAIL_HOST,
        port: parseInt(process.env.TIMWEB_MAIL_PORT || "993"),
        user: process.env.TIMWEB_MAIL_USER,
        password: process.env.TIMWEB_MAIL_PASSWORD ? "configured" : "missing",
        secure: process.env.TIMWEB_MAIL_SECURE === "true"
      };

      res.json({
        message: "Configuration test completed",
        config: testConfig,
        isConfigured: !!(testConfig.host && testConfig.user && process.env.TIMWEB_MAIL_PASSWORD)
      });
    } catch (error) {
      res.status(500).json({ message: "Configuration test failed" });
    }
  });

  app.post("/api/mail/enable-test-mode", async (req, res) => {
    try {
      timwebMailService.enableTestMode();
      res.json({ message: "Test mode enabled", status: "test_active" });
    } catch (error) {
      res.status(500).json({ message: "Failed to enable test mode" });
    }
  });

  app.post("/api/mail/disable-test-mode", async (req, res) => {
    try {
      timwebMailService.disableTestMode();
      res.json({ message: "Test mode disabled", status: "test_inactive" });
    } catch (error) {
      res.status(500).json({ message: "Failed to disable test mode" });
    }
  });

  // Procurement request endpoints
  app.get("/api/procurement/template", async (req, res) => {
    const template = procurementRequestService.getRequestTemplate();
    res.json({ template });
  });

  app.post("/api/procurement/create", async (req, res) => {
    try {
      const { requestData, emailId } = req.body;
      
      if (!requestData) {
        return res.status(400).json({ error: "Request data is required" });
      }

      // Parse and validate procurement data
      const parsedData = await procurementRequestService.parseProcurementData(
        typeof requestData === "string" ? requestData : JSON.stringify(requestData)
      );

      // Create procurement requests
      const createdRequests = await procurementRequestService.createProcurementRequests(
        parsedData, 
        emailId
      );

      res.json({
        success: true,
        created: createdRequests.length,
        requests: createdRequests,
      });
    } catch (error) {
      console.error("Error creating procurement requests:", error);
      res.status(400).json({
        error: error instanceof Error ? error.message : "Failed to create procurement requests",
      });
    }
  });

  app.get("/api/procurement/requests", async (req, res) => {
    try {
      const { status, supplierId, orderId } = req.query;
      const requests = await procurementRequestService.getProcurementRequests({
        status: status as string,
        supplierId: supplierId as string,
        orderId: orderId as string,
      });
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch procurement requests" });
    }
  });

  app.post("/api/procurement/approve/:id", async (req, res) => {
    try {
      const { id } = req.params;
      // For now, use a default user ID - in production, get from session
      const userId = "system";
      
      const approved = await procurementRequestService.approveProcurementRequest(id, userId);
      if (approved) {
        res.json({ success: true, request: approved });
      } else {
        res.status(404).json({ error: "Procurement request not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to approve procurement request" });
    }
  });

  app.post("/api/procurement/reject/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ error: "Rejection reason is required" });
      }
      
      // For now, use a default user ID - in production, get from session
      const userId = "system";
      
      const rejected = await procurementRequestService.rejectProcurementRequest(id, userId, reason);
      if (rejected) {
        res.json({ success: true, request: rejected });
      } else {
        res.status(404).json({ error: "Procurement request not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to reject procurement request" });
    }
  });

  // Object storage routes
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Process unprocessed emails endpoint
  app.post("/api/emails/process-unprocessed", async (_req, res) => {
    try {
      const unprocessedEmails = await storage.getUnprocessedEmails(100);
      let processed = 0;
      
      for (const email of unprocessedEmails) {
        try {
          // Process the email for aviation parts requests
          const body = email.body || email.content || '';
          await timwebMailService.processAviationPartsRequest(email, body);
          processed++;
        } catch (error) {
          console.error(`Error processing email ${email.id}:`, error);
        }
      }
      
      res.json({ message: `Processed ${processed} emails`, processed });
    } catch (error) {
      console.error("Error processing unprocessed emails:", error);
      res.status(500).json({ message: "Failed to process emails" });
    }
  });

  // Draft Orders API
  app.get("/api/draft-orders", async (_req, res) => {
    try {
      const drafts = await draftOrderService.getAllDrafts();
      res.json(drafts);
    } catch (error) {
      console.error("Error fetching draft orders:", error);
      res.status(500).json({ message: "Failed to fetch draft orders" });
    }
  });

  // Get rejected draft orders
  app.get("/api/draft-orders/rejected", async (_req, res) => {
    try {
      const rejectedDrafts = await draftOrderService.getRejectedDrafts();
      res.json(rejectedDrafts);
    } catch (error) {
      console.error("Error fetching rejected draft orders:", error);
      res.status(500).json({ message: "Failed to fetch rejected draft orders" });
    }
  });
  
  app.get("/api/draft-orders/email/:emailId", async (req, res) => {
    try {
      const drafts = await draftOrderService.getDraftsByEmail(req.params.emailId);
      res.json(drafts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch draft orders" });
    }
  });
  
  app.patch("/api/draft-orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertDraftOrderSchema.partial().parse(req.body);
      const updatedDraft = await draftOrderService.updateDraft(id, updates);
      res.json(updatedDraft);
    } catch (error) {
      console.error("Error updating draft order:", error);
      res.status(400).json({ message: "Failed to update draft order" });
    }
  });
  
  app.post("/api/draft-orders/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;
      const order = await draftOrderService.approveDraft(id);
      
      if (order) {
        // Create activity
        await storage.createActivity({
          type: "draft_approved",
          description: `Draft order approved and created order ${order.orderNumber}`,
          entityType: "order",
          entityId: order.id,
        });
        
        // Broadcast real-time update
        broadcast({ type: "draft_approved", data: order });
      }
      
      res.json({ success: true, order });
    } catch (error) {
      console.error("Error approving draft order:", error);
      res.status(500).json({ message: "Failed to approve draft order" });
    }
  });
  
  app.post("/api/draft-orders/:id/reject", async (req, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      await draftOrderService.rejectDraft(id, undefined, notes);
      
      // Create activity
      await storage.createActivity({
        type: "draft_rejected",
        description: `Draft order rejected: ${notes || "No reason provided"}`,
        entityType: "draft_order",
        entityId: id,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error rejecting draft order:", error);
      res.status(500).json({ message: "Failed to reject draft order" });
    }
  });

  // Add new item to existing draft group (same CR Number)
  app.post("/api/draft-orders/add-item", async (req, res) => {
    try {
      const { emailId, crNumber, partNumber, partDescription, quantity } = req.body;
      
      if (!emailId || !crNumber || !partNumber || !quantity) {
        return res.status(400).json({ 
          error: "emailId, crNumber, partNumber and quantity are required" 
        });
      }

      // Get the customer ID from existing drafts with same emailId
      const existingDrafts = await draftOrderService.getDraftsByEmail(emailId);
      if (!existingDrafts || existingDrafts.length === 0) {
        return res.status(404).json({ error: "No drafts found for this email" });
      }

      const customerId = existingDrafts[0].customerId;
      const customerReference = existingDrafts[0].customerReference || "";
      const customerRequestDate = existingDrafts[0].customerRequestDate || new Date();

      // Create new draft with same CR Number
      const newDraft = await draftOrderService.createDraftOrderWithCR({
        emailId,
        customerId,
        crNumber,
        partNumber,
        partDescription: partDescription || "",
        quantity,
        condition: "NE",
        urgencyLevel: "normal",
        emailFrom: customerReference,
        emailDate: customerRequestDate,
      });

      if (newDraft) {
        res.json({ success: true, draft: newDraft });
      } else {
        res.status(500).json({ error: "Failed to create draft item" });
      }
    } catch (error) {
      console.error("Error adding draft item:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to add draft item" 
      });
    }
  });

  // Parts endpoints
  app.get("/api/parts", async (req, res) => {
    const { partService } = await import("./services/partService");
    const partsData = await partService.getAllParts();
    res.json(partsData);
  });

  app.get("/api/parts/search", async (req, res) => {
    const { partService } = await import("./services/partService");
    const query = req.query.q as string;
    const partsData = await partService.searchParts(query);
    res.json(partsData);
  });

  app.get("/api/parts/:partNumber", async (req, res) => {
    const { partService } = await import("./services/partService");
    const part = await partService.getPartByNumber(req.params.partNumber);
    if (part) {
      res.json(part);
    } else {
      res.status(404).json({ error: "Part not found" });
    }
  });

  // AI Analysis endpoint for draft orders
  app.post("/api/draft-orders/analyze-ai", async (req, res) => {
    try {
      const { emailId, crNumber } = req.body;

      if (!emailId || !crNumber) {
        return res.status(400).json({ error: "Email ID and CR Number are required" });
      }

      // Check if API key is configured
      if (!process.env.DEEPSEEK_API_KEY) {
        return res.status(503).json({ 
          error: "AI analysis is not configured. Please add DEEPSEEK_API_KEY to environment variables." 
        });
      }

      // Get email content
      const email = await storage.getEmailById(emailId);
      if (!email) {
        return res.status(404).json({ error: "Email not found" });
      }



      // Import AI analysis service
      const { AIAnalysisService } = await import("./services/aiAnalysisService");
      const aiService = new AIAnalysisService();

      // Analyze email content - use content field, fallback to htmlContent, then empty string
      const emailContent = email.content || email.htmlContent || "";
      if (!emailContent.trim()) {
  
        return res.json({ 
          success: true, 
          message: "Email has no content to analyze",
          extractedParts: [] 
        });
      }


      
      const extractedParts = await aiService.analyzeEmailContent(
        emailContent,
        email.subject,
        email.fromEmail
      );

      if (extractedParts.length === 0) {
        console.log(`🤖 AI returned no parts for email ${email.id}`);
        return res.json({ 
          success: true, 
          message: "AI analysis completed but no aviation parts found in email",
          extractedParts: [] 
        });
      }



      // Create draft orders from extracted parts
      const createdIds = await aiService.createDraftOrdersFromAnalysis(
        emailId,
        crNumber,
        extractedParts
      );

      res.json({ 
        success: true, 
        message: `Created ${createdIds.length} draft items from AI analysis`,
        createdIds,
        extractedParts
      });
    } catch (error) {
      console.error("AI analysis error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "AI analysis failed" 
      });
    }
  });

  return httpServer;
}
