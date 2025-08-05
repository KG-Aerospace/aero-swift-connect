import { db } from "../db";
import { parts, type Part, type InsertPart } from "@shared/schema";
import { eq, ilike, or, sql } from "drizzle-orm";

export class PartService {
  // Normalize part number for searching (remove special characters, uppercase)
  private normalizePartNumber(partNumber: string): string {
    return partNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  async createPart(data: InsertPart): Promise<Part | null> {
    try {
      const normalized = this.normalizePartNumber(data.partNumber);
      
      const [part] = await db
        .insert(parts)
        .values({
          ...data,
          normalized,
        })
        .returning();
      
      return part;
    } catch (error) {
      console.error("Error creating part:", error);
      return null;
    }
  }

  async getAllParts(): Promise<Part[]> {
    return db.select().from(parts).orderBy(parts.partNumber);
  }

  async searchParts(query: string): Promise<Part[]> {
    if (!query || query.length < 2) return [];
    
    const normalizedQuery = this.normalizePartNumber(query);
    
    return db
      .select()
      .from(parts)
      .where(
        or(
          ilike(parts.partNumber, `%${query}%`),
          ilike(parts.description, `%${query}%`),
          ilike(parts.normalized, `%${normalizedQuery}%`)
        )
      )
      .limit(20);
  }

  async getPartByNumber(partNumber: string): Promise<Part | null> {
    const [part] = await db
      .select()
      .from(parts)
      .where(eq(parts.partNumber, partNumber))
      .limit(1);
    
    return part || null;
  }

  async seedParts(partsData: Array<{ partNumber: string; description: string }>): Promise<void> {
    try {
      // Insert in batches to avoid overwhelming the database
      const batchSize = 50;
      for (let i = 0; i < partsData.length; i += batchSize) {
        const batch = partsData.slice(i, i + batchSize);
        
        await db
          .insert(parts)
          .values(
            batch.map(p => ({
              partNumber: p.partNumber,
              description: p.description,
              normalized: this.normalizePartNumber(p.partNumber),
            }))
          )
          .onConflictDoNothing(); // Skip duplicates
      }
      
      console.log(`Successfully seeded ${partsData.length} parts`);
    } catch (error) {
      console.error("Error seeding parts:", error);
    }
  }

  async getPartsCount(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(parts);
    
    return result.count || 0;
  }
}

export const partService = new PartService();