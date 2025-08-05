// Script to reprocess all emails with new airline-specific parsers
import { db } from "../db";
import { emails, orders, activities } from "@shared/schema";
import { eq } from "drizzle-orm";
import { airlineParserService } from "../services/airlineParserService";

async function deleteAllOrders() {
  console.log("🗑️  Deleting all existing orders...");
  
  // Delete all orders
  const deletedOrders = await db.delete(orders).returning();
  console.log(`🗑️  Deleted ${deletedOrders.length} orders`);
  
  // Log activity
  await db.insert(activities).values({
    type: "bulk_delete",
    description: `Deleted ${deletedOrders.length} orders for reprocessing`,
    entityType: "order",
    createdAt: new Date()
  });
  
  return deletedOrders.length;
}

async function reprocessAllEmails() {
  console.log("📧 Fetching all emails for reprocessing...");
  
  // Get all emails
  const allEmails = await db.select().from(emails);
  console.log(`📧 Found ${allEmails.length} emails to reprocess`);
  
  let totalOrdersCreated = 0;
  const airlineStats: Record<string, number> = {};
  
  for (const email of allEmails) {
    console.log(`\n📧 Processing email from: ${email.fromEmail}`);
    console.log(`   Subject: ${email.subject}`);
    
    // Use airline-specific parser
    const parsingResult = airlineParserService.parseEmailByAirline(email, email.body);
    
    if (parsingResult.airline) {
      airlineStats[parsingResult.airline] = (airlineStats[parsingResult.airline] || 0) + 1;
    }
    
    console.log(`   ✈️  Detected airline: ${parsingResult.airline || "Unknown"}`);
    console.log(`   📦 Found ${parsingResult.orders.length} parts`);
    
    if (parsingResult.isAviationRequest && parsingResult.orders.length > 0) {
      // Update email status
      await db
        .update(emails)
        .set({ 
          status: "processing",
          processedAt: new Date()
        })
        .where(eq(emails.id, email.id));
      
      // Create orders
      for (const parsedOrder of parsingResult.orders) {
        try {
          const orderNumber = generateOrderNumber();
          
          const [newOrder] = await db.insert(orders).values({
            orderNumber,
            customerId: email.customerId,
            emailId: email.id,
            partNumber: parsedOrder.partNumber,
            partDescription: parsedOrder.description || "",
            quantity: parsedOrder.quantity,
            urgencyLevel: parsedOrder.priority === "URGENT" ? "critical" : "normal",
            status: "pending",
            notes: `Airline: ${parsingResult.airline || "Unknown"}, Condition: ${parsedOrder.condition}, Priority: ${parsedOrder.priority}`,
          }).returning();
          
          console.log(`   ✅ Created order ${orderNumber} for part ${parsedOrder.partNumber}`);
          totalOrdersCreated++;
        } catch (error) {
          console.error(`   ❌ Error creating order for part ${parsedOrder.partNumber}:`, error);
        }
      }
      
      // Update email status to processed
      await db
        .update(emails)
        .set({ 
          status: "processed",
          processedAt: new Date()
        })
        .where(eq(emails.id, email.id));
    } else {
      // Update email status to processed even if no parts found
      await db
        .update(emails)
        .set({ 
          status: parsingResult.isAviationRequest ? "processed" : "pending",
          processedAt: parsingResult.isAviationRequest ? new Date() : null
        })
        .where(eq(emails.id, email.id));
    }
  }
  
  return { totalOrdersCreated, airlineStats };
}

function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `ORD-${year}${month}${day}-${random}`;
}

// Main execution
async function main() {
  try {
    console.log("🚀 Starting email reprocessing with airline-specific parsers...\n");
    
    // Step 1: Delete all orders
    const deletedCount = await deleteAllOrders();
    
    // Step 2: Reprocess all emails
    const { totalOrdersCreated, airlineStats } = await reprocessAllEmails();
    
    // Summary
    console.log("\n📊 REPROCESSING COMPLETE!");
    console.log("=" .repeat(50));
    console.log(`🗑️  Deleted orders: ${deletedCount}`);
    console.log(`✅ Created orders: ${totalOrdersCreated}`);
    console.log("\n✈️  Airlines detected:");
    
    for (const [airline, count] of Object.entries(airlineStats)) {
      console.log(`   ${airline}: ${count} emails`);
    }
    
    // Get final stats
    const finalOrderCount = await db.select().from(orders);
    console.log(`\n📦 Total orders in database: ${finalOrderCount.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during reprocessing:", error);
    process.exit(1);
  }
}

// Run the script
main();