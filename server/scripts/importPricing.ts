import { db } from "../db";
import { parts as partsTable } from "@shared/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function importPricing() {
  console.log("Starting price import...");
  
  // Read the pricing file
  const filePath = path.join(process.cwd(), "attached_assets", "Pasted--DESCRIPTION-PART-NUMBER-UnitPrice-Currency-RIVET-CR3213-6-02-8-USD-RIVET-CR321-1754462332136_1754462332137.txt");
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  
  // Parse the TSV file
  const lines = fileContent.split('\n');
  let importedCount = 0;
  let skippedCount = 0;
  
  for (let i = 4; i < lines.length; i++) { // Start from line 4 to skip header rows
    const line = lines[i].trim();
    if (!line) continue;
    
    // Split by tab
    const columns = line.split('\t');
    if (columns.length < 4) continue;
    
    const description = columns[0]?.trim();
    const partNumber = columns[1]?.trim();
    const price = columns[2]?.trim();
    const currency = columns[3]?.trim();
    
    // Skip invalid entries
    if (!partNumber || partNumber === '#N/A' || !price || price === '' || price === 'USD') {
      skippedCount++;
      continue;
    }
    
    try {
      // Check if part already exists
      const [existingPart] = await db.select().from(partsTable).where(eq(partsTable.partNumber, partNumber));
      
      if (existingPart) {
        // Update existing part with price
        await db.update(partsTable)
          .set({ 
            price: price,
            currency: currency || 'USD'
          })
          .where(eq(partsTable.partNumber, partNumber));
        console.log(`Updated price for ${partNumber}: $${price} ${currency}`);
      } else {
        // Insert new part with price
        await db.insert(partsTable).values({
          partNumber: partNumber,
          description: description || '',
          price: price,
          currency: currency || 'USD',
          normalized: partNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase()
        });
        console.log(`Inserted new part ${partNumber}: $${price} ${currency}`);
      }
      
      importedCount++;
    } catch (error) {
      console.error(`Error processing part ${partNumber}:`, error);
      skippedCount++;
    }
  }
  
  console.log(`Import complete! Imported: ${importedCount}, Skipped: ${skippedCount}`);
  process.exit(0);
}

// Run the import
importPricing().catch(console.error);