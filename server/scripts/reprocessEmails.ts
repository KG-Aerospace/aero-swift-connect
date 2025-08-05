// Script to reprocess all emails with improved airline parsers
import { db } from "../db";
import { emails, customers, orders, activities } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { airlineParserService } from "../services/airlineParserService";
import { orderCreationService } from "../services/orderCreationService";

async function reprocessEmails() {
  console.log("🔄 Starting email reprocessing with improved parsers...\n");
  
  try {
    // Get all emails from database
    const allEmails = await db
      .select()
      .from(emails)
      .innerJoin(customers, eq(emails.customerId, customers.id))
      .orderBy(desc(emails.receivedAt));
    
    console.log(`📧 Found ${allEmails.length} total emails to process\n`);
    
    // Statistics
    let totalProcessed = 0;
    let totalAviationEmails = 0;
    let totalOrdersCreated = 0;
    let totalPartsFound = 0;
    const airlineStats: Record<string, number> = {};
    
    // Process each email
    for (const emailData of allEmails) {
      const email = emailData.emails;
      const customer = emailData.customers;
      
      totalProcessed++;
      
      // Parse email with airline-specific parser
      const parseResult = airlineParserService.parseEmailByAirline(email, email.body);
      
      // Update airline statistics
      const airline = parseResult.airline || "Unknown";
      airlineStats[airline] = (airlineStats[airline] || 0) + 1;
      
      if (parseResult.isAviationRequest && parseResult.orders.length > 0) {
        totalAviationEmails++;
        totalPartsFound += parseResult.orders.length;
        
        console.log(`✈️  Processing email from ${customer.company} (${airline})`);
        console.log(`   Subject: ${email.subject.substring(0, 60)}...`);
        console.log(`   Parts found: ${parseResult.orders.length}`);
        
        // Create orders for each part
        for (const orderData of parseResult.orders) {
          try {
            const newOrder = await orderCreationService.createOrder({
              emailId: email.id,
              customerId: customer.id,
              partNumber: orderData.partNumber,
              quantity: orderData.quantity,
              condition: orderData.condition || "NE",
              priority: orderData.priority || "STANDARD",
              description: orderData.description || "",
            });
            
            if (newOrder) {
              totalOrdersCreated++;
              console.log(`   ✅ Created order ${newOrder.orderNumber} for part ${orderData.partNumber}`);
            }
          } catch (error: any) {
            console.error(`   ❌ Error creating order for part ${orderData.partNumber}:`, error.message);
          }
        }
      }
      
      // Progress update every 100 emails
      if (totalProcessed % 100 === 0) {
        console.log(`\n📊 Progress: ${totalProcessed}/${allEmails.length} emails processed`);
        console.log(`   Aviation emails: ${totalAviationEmails}`);
        console.log(`   Orders created: ${totalOrdersCreated}`);
        console.log(`   Parts found: ${totalPartsFound}\n`);
      }
    }
    
    // Final statistics
    console.log("\n" + "=".repeat(60));
    console.log("📊 FINAL STATISTICS");
    console.log("=".repeat(60));
    console.log(`📧 Total emails processed: ${totalProcessed}`);
    console.log(`✈️  Aviation-related emails: ${totalAviationEmails}`);
    console.log(`📦 Total orders created: ${totalOrdersCreated}`);
    console.log(`🔧 Total parts detected: ${totalPartsFound}`);
    console.log(`📈 Average parts per aviation email: ${(totalPartsFound / (totalAviationEmails || 1)).toFixed(2)}`);
    
    console.log("\n✈️  Airline Distribution:");
    Object.entries(airlineStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([airline, count]) => {
        console.log(`   ${airline}: ${count} emails`);
      });
    
    // Log activity
    await db.insert(activities).values({
      type: "bulk_processing",
      entityType: "email",
      entityId: null,
      userId: null,
      description: `Reprocessed ${totalProcessed} emails with improved parsers. Created ${totalOrdersCreated} orders from ${totalPartsFound} detected parts.`,
      metadata: {
        totalEmails: totalProcessed,
        aviationEmails: totalAviationEmails,
        ordersCreated: totalOrdersCreated,
        partsFound: totalPartsFound,
        airlineStats,
      },
    });
    
    console.log("\n✅ Email reprocessing completed successfully!");
    
  } catch (error) {
    console.error("❌ Error during reprocessing:", error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await reprocessEmails();
    process.exit(0);
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

main();