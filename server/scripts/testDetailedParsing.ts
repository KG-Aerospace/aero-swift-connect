// Detailed test script for airline parsers
import { airlineParserService } from "../services/airlineParserService";
import { db } from "../db";
import { emails, customers, orders } from "@shared/schema";
import { eq, desc, and, isNotNull, sql } from "drizzle-orm";

async function testDetailedParsing() {
  console.log("🧪 Testing airline parsers with real email data...\n");
  
  // Get sample emails from different airlines
  const testEmails = await db
    .select({
      email: emails,
      customer: customers,
    })
    .from(emails)
    .innerJoin(customers, eq(emails.customerId, customers.id))
    .where(
      and(
        isNotNull(emails.body),
        sql`length(${emails.body}) > 100`
      )
    )
    .orderBy(desc(emails.receivedAt))
    .limit(10);
  
  console.log(`📧 Testing ${testEmails.length} emails\n`);
  
  for (const testData of testEmails) {
    const { email, customer } = testData;
    
    console.log("=".repeat(80));
    console.log(`📧 Email ID: ${email.id}`);
    console.log(`   From: ${customer.company} (${customer.email})`);
    console.log(`   Subject: ${email.subject}`);
    console.log(`\n📄 Email Body (first 500 chars):`);
    console.log("   " + email.body.substring(0, 500).replace(/\n/g, "\n   "));
    console.log("\n");
    
    // Parse email
    const parseResult = airlineParserService.parseEmailByAirline(email, email.body);
    
    console.log(`✈️  Parser Results:`);
    console.log(`   Detected Airline: ${parseResult.airline || "Unknown"}`);
    console.log(`   Is Aviation Request: ${parseResult.isAviationRequest ? "YES" : "NO"}`);
    console.log(`   Parts Found: ${parseResult.orders.length}`);
    
    if (parseResult.orders.length > 0) {
      console.log(`\n📦 Detected Parts:`);
      parseResult.orders.forEach((order, idx) => {
        console.log(`   ${idx + 1}. Part Number: "${order.partNumber}"`);
        console.log(`      Quantity: ${order.quantity}`);
        console.log(`      Condition: ${order.condition}`);
        console.log(`      Priority: ${order.priority}`);
        if (order.description) {
          console.log(`      Description: ${order.description}`);
        }
      });
    } else {
      console.log(`\n❌ No parts detected!`);
      
      // Try to find potential part numbers manually
      console.log(`\n🔍 Manual search for potential part numbers:`);
      
      // Look for common patterns
      const potentialPatterns = [
        /\b([A-Z0-9]{2,}[\-]?[A-Z0-9\-]+)\b/g,
        /P\/N[:\s]*([A-Z0-9\-]+)/gi,
        /PN[:\s]*([A-Z0-9\-]+)/gi,
        /Part[:\s]*([A-Z0-9\-]+)/gi,
        /\b(\d{3,}[A-Z]\d+[\-]\d+)\b/g,
      ];
      
      const foundPotential = new Set<string>();
      
      for (const pattern of potentialPatterns) {
        const matches = Array.from(email.body.matchAll(pattern));
        for (const match of matches) {
          if (match[1] && match[1].length >= 3 && match[1].length <= 30) {
            foundPotential.add(match[1]);
          }
        }
      }
      
      if (foundPotential.size > 0) {
        console.log(`   Found ${foundPotential.size} potential part numbers:`);
        Array.from(foundPotential).slice(0, 10).forEach(part => {
          console.log(`   - "${part}"`);
        });
      }
    }
    
    // Check existing orders for this email
    const existingOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.emailId, email.id))
      .limit(5);
    
    if (existingOrders.length > 0) {
      console.log(`\n📊 Existing orders in database for this email:`);
      existingOrders.forEach((order, idx) => {
        console.log(`   ${idx + 1}. Part: "${order.partNumber}" (Qty: ${order.quantity})`);
      });
    }
    
    console.log("\n");
  }
  
  // Summary statistics
  console.log("\n" + "=".repeat(80));
  console.log("📊 SUMMARY STATISTICS");
  console.log("=".repeat(80));
  
  const stats = await db
    .select({
      company: customers.company,
      totalEmails: sql<number>`count(distinct ${emails.id})`,
      totalOrders: sql<number>`count(distinct ${orders.id})`,
      avgOrdersPerEmail: sql<number>`avg((select count(*) from ${orders} o2 where o2.email_id = ${emails.id}))`,
    })
    .from(emails)
    .innerJoin(customers, eq(emails.customerId, customers.id))
    .leftJoin(orders, eq(orders.emailId, emails.id))
    .groupBy(customers.company)
    .orderBy(sql`count(distinct ${emails.id}) desc`)
    .limit(10);
  
  console.log("\n✈️  Orders by Airline:");
  stats.forEach(stat => {
    console.log(`   ${stat.company}: ${stat.totalEmails} emails, ${stat.totalOrders} orders (avg: ${Number(stat.avgOrdersPerEmail).toFixed(2)} orders/email)`);
  });
}

// Main execution
async function main() {
  try {
    await testDetailedParsing();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();