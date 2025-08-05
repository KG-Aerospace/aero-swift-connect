import { db } from "../db";
import { emails } from "@shared/schema";
import { eq } from "drizzle-orm";
import { airlineParserService } from "../services/airlineParserService";
import { draftOrderService } from "../services/draftOrderService";

async function processPendingEmails() {
  console.log("📧 Processing pending emails...");
  
  // Get pending emails
  const pendingEmails = await db
    .select()
    .from(emails)
    .where(eq(emails.status, "pending"))
    .limit(20); // Process 20 at a time
  
  console.log(`📧 Found ${pendingEmails.length} pending emails to process`);
  
  for (const email of pendingEmails) {
    try {
      console.log(`\n📧 Processing email: ${email.subject}`);
      
      // Parse email using airline parser service
      const parsingResult = airlineParserService.parseEmailByAirline(email, email.body);
      
      if (parsingResult.isAviationRequest && parsingResult.orders.length > 0) {
        console.log(`✅ Detected ${parsingResult.orders.length} parts from ${parsingResult.airline || "Unknown"} airline`);
        
        // Update email status to processing
        await db
          .update(emails)
          .set({ 
            status: "processing",
            processedAt: new Date()
          })
          .where(eq(emails.id, email.id));
        
        // Create draft orders
        let draftsCreated = 0;
        
        for (const parsedOrder of parsingResult.orders) {
          const draft = await draftOrderService.createDraftOrder({
            emailId: email.id,
            customerId: email.customerId!,
            partNumber: parsedOrder.partNumber,
            quantity: parsedOrder.quantity,
            condition: parsedOrder.condition,
            urgencyLevel: parsedOrder.priority === "URGENT" ? "urgent" : "normal",
            description: parsedOrder.description,
          });
          
          if (draft) {
            draftsCreated++;
            console.log(`  📋 Created draft for part: ${parsedOrder.partNumber}`);
          }
        }
        
        // Update email status to processed
        if (draftsCreated > 0) {
          await db
            .update(emails)
            .set({ 
              status: "processed",
              processedAt: new Date()
            })
            .where(eq(emails.id, email.id));
          
          console.log(`  ✅ Created ${draftsCreated} draft orders`);
        }
      } else {
        console.log(`  ❌ No aviation parts detected`);
      }
    } catch (error) {
      console.error(`  ❌ Error processing email ${email.id}:`, error);
    }
  }
  
  console.log("\n📧 Done processing pending emails");
  process.exit(0);
}

processPendingEmails().catch(console.error);