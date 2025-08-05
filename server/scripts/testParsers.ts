// Script to test airline-specific parsers
import { airlineParserService } from "../services/airlineParserService";
import { db } from "../db";
import { emails, customers } from "@shared/schema";
import { eq } from "drizzle-orm";

async function testParsers() {
  console.log("🧪 Testing airline-specific parsers...\n");
  
  // Get sample emails from different airlines
  const testCases = await db
    .select()
    .from(emails)
    .innerJoin(customers, eq(emails.customerId, customers.id))
    .where(
      eq(customers.email, "aogdesk@nordwindairlines.ru")
    )
    .limit(5);
  
  for (const testCase of testCases) {
    const email = testCase.emails;
    const customer = testCase.customers;
    
    console.log("=" .repeat(60));
    console.log(`📧 Email from: ${email.fromEmail}`);
    console.log(`   Subject: ${email.subject}`);
    console.log(`   Customer: ${customer.company} (${customer.email})`);
    console.log("\n📄 Email Body Sample:");
    console.log(email.body.substring(0, 300) + "...\n");
    
    // Test parser
    const result = airlineParserService.parseEmailByAirline(email, email.body);
    
    console.log(`✈️  Detected Airline: ${result.airline || "Unknown"}`);
    console.log(`📦 Aviation Request: ${result.isAviationRequest ? "Yes" : "No"}`);
    console.log(`📋 Parts Found: ${result.orders.length}`);
    
    if (result.orders.length > 0) {
      console.log("\n   Detected Parts:");
      result.orders.forEach((order, idx) => {
        console.log(`   ${idx + 1}. Part Number: ${order.partNumber}`);
        console.log(`      Quantity: ${order.quantity}`);
        console.log(`      Condition: ${order.condition}`);
        console.log(`      Priority: ${order.priority}`);
        if (order.description) {
          console.log(`      Description: ${order.description}`);
        }
      });
    }
    console.log("");
  }
  
  // Test more airlines
  console.log("\n🧪 Testing other airlines...\n");
  
  const airlines = [
    { domain: "%s7.ru%", name: "S7 Airlines" },
    { domain: "%utair.ru%", name: "UTair Aviation" },
    { domain: "%pobeda.aero%", name: "Pobeda Airlines" },
  ];
  
  for (const airline of airlines) {
    const samples = await db
      .select()
      .from(emails)
      .innerJoin(customers, eq(emails.customerId, customers.id))
      .where(
        eq(customers.email, airline.domain.replace(/%/g, ''))
      )
      .limit(2);
    
    if (samples.length > 0) {
      console.log(`\n✈️  Testing ${airline.name}:`);
      for (const sample of samples) {
        const result = airlineParserService.parseEmailByAirline(sample.emails, sample.emails.body);
        console.log(`   - Email: ${sample.emails.subject.substring(0, 50)}...`);
        console.log(`     Parts found: ${result.orders.length}`);
        if (result.orders.length > 0) {
          console.log(`     First part: ${result.orders[0].partNumber}`);
        }
      }
    }
  }
}

// Main execution
async function main() {
  try {
    await testParsers();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();