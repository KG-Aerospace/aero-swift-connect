import { storage } from "../storage";

export class SupplierService {
  async processOrderQuotes(orderId: string): Promise<{ sent: number; failed: number }> {
    try {
      const order = await storage.getOrder(orderId);
      if (!order) {
        throw new Error("Order not found");
      }

      const suppliers = await storage.getSuppliers();
      const activeSuppliers = suppliers.filter(s => s.isActive);

      let sent = 0;
      let failed = 0;

      for (const supplier of activeSuppliers) {
        try {
          await this.sendQuoteRequest(supplier.id, order);
          sent++;
        } catch (error) {
          failed++;
          console.error(`Failed to send quote request to supplier ${supplier.id}:`, error);
        }
      }

      // Create activity
      await storage.createActivity({
        type: "supplier_requests_sent",
        description: `Quote requests sent to ${sent} suppliers for order ${order.orderNumber}`,
        entityType: "order",
        entityId: orderId,
      });

      return { sent, failed };
    } catch (error) {
      console.error("Failed to process order quotes:", error);
      return { sent: 0, failed: 1 };
    }
  }

  private async sendQuoteRequest(supplierId: string, order: any): Promise<void> {
    const supplier = await storage.getSupplier(supplierId);
    if (!supplier) {
      throw new Error("Supplier not found");
    }

    // In a real implementation, this would make HTTP requests to supplier APIs
    // For now, we'll simulate the process and create mock quotes
    
    const mockQuote = {
      orderId: order.id,
      supplierId: supplier.id,
      price: this.generateMockPrice(order.partNumber),
      leadTimeDays: this.generateMockLeadTime(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      status: "pending" as const,
      responseTime: supplier.responseTimeHours || "2.5",
      supplierResponse: {
        timestamp: new Date().toISOString(),
        method: "api",
        success: true,
      },
    };

    // Simulate API delay
    setTimeout(async () => {
      try {
        await storage.createQuote(mockQuote);
        
        await storage.createActivity({
          type: "quote_received",
          description: `Quote received from ${supplier.name} for order ${order.orderNumber}`,
          entityType: "quote",
          entityId: mockQuote.orderId,
        });
      } catch (error) {
        console.error("Failed to create mock quote:", error);
      }
    }, Math.random() * 5000 + 1000); // 1-6 seconds delay
  }

  private generateMockPrice(partNumber: string): string {
    // Generate realistic prices based on part number patterns
    const basePrice = partNumber.length * 1000 + Math.random() * 50000;
    
    if (/boeing.*777|airbus.*380/i.test(partNumber)) {
      return (basePrice * 3).toFixed(2);
    } else if (/boeing.*737|airbus.*320/i.test(partNumber)) {
      return (basePrice * 2).toFixed(2);
    } else if (/cessna|piper/i.test(partNumber)) {
      return (basePrice * 0.5).toFixed(2);
    }
    
    return basePrice.toFixed(2);
  }

  private generateMockLeadTime(): number {
    // Generate realistic lead times (1-90 days)
    const baseDays = Math.floor(Math.random() * 60) + 1;
    return baseDays;
  }

  async updateSupplierMetrics(supplierId: string, responseTime: number, success: boolean): Promise<void> {
    const supplier = await storage.getSupplier(supplierId);
    if (!supplier) return;

    // Update response time (simple moving average approach)
    const currentResponseTime = parseFloat(supplier.responseTimeHours || "0");
    const newResponseTime = currentResponseTime > 0 
      ? (currentResponseTime + responseTime) / 2 
      : responseTime;

    // Update success rate (simple moving average approach)
    const currentSuccessRate = parseFloat(supplier.successRate || "0");
    const newSuccessRate = currentSuccessRate > 0 
      ? (currentSuccessRate + (success ? 100 : 0)) / 2 
      : (success ? 100 : 0);

    await storage.updateSupplier(supplierId, {
      responseTimeHours: newResponseTime.toFixed(2),
      successRate: newSuccessRate.toFixed(2),
    });
  }
}

export const supplierService = new SupplierService();
