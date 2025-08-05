// Service for creating orders with proper duplicate handling
import { db } from "../db";
import { orders, type InsertOrder } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export class OrderCreationService {
  async createOrder(orderData: {
    emailId: string;
    customerId: string;
    partNumber: string;
    quantity: number;
    condition: string;
    priority: string;
    description?: string;
  }) {
    // Check if order already exists for this email and part number
    const existingOrder = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.emailId, orderData.emailId),
          eq(orders.partNumber, orderData.partNumber)
        )
      )
      .limit(1);
    
    if (existingOrder.length > 0) {
      // Order already exists, skip creation
      return null;
    }
    
    // Generate unique order number
    const orderNumber = this.generateOrderNumber();
    
    const newOrder: InsertOrder = {
      orderNumber,
      emailId: orderData.emailId,
      customerId: orderData.customerId,
      partNumber: orderData.partNumber,
      quantity: orderData.quantity,
      urgencyLevel: orderData.priority === "URGENT" ? "urgent" : "normal",
      partDescription: orderData.description || "",
      status: "pending",
    };
    
    const [createdOrder] = await db.insert(orders).values(newOrder).returning();
    return createdOrder;
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

export const orderCreationService = new OrderCreationService();