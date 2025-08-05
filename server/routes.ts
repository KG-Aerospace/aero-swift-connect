import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertCustomerSchema, insertSupplierSchema, insertOrderSchema, insertQuoteSchema, insertEmailSchema, insertProcurementRequestSchema } from "@shared/schema";
import { emailService } from "./services/emailService";
import { supplierService } from "./services/supplierService";
import { timwebMailService } from "./services/timwebMailService";
import { supplierQuoteParser } from "./services/supplierQuoteParser";
import { procurementRequestService } from "./services/procurementRequestService";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

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

  app.post("/api/orders", async (req, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(orderData);
      
      // Create activity
      await storage.createActivity({
        type: "order_created",
        description: `New order created: ${order.orderNumber}`,
        entityType: "order",
        entityId: order.id,
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

  app.patch("/api/orders/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const order = await storage.updateOrderStatus(req.params.id, status);
      
      // Create activity
      await storage.createActivity({
        type: "order_status_updated",
        description: `Order ${order.orderNumber} status updated to ${status}`,
        entityType: "order",
        entityId: order.id,
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
      
      const { orderCreationService } = await import("./services/orderCreationService");
      const updatedOrder = await orderCreationService.updateOrder(id, updates);
      
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

  return httpServer;
}
