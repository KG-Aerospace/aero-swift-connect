import { db } from "../db";
import { acTypes, engineTypes } from "@shared/schema";
import { sql } from "drizzle-orm";

// Process the AC types from the file
const acTypesList = `B737
B737
B737
B737
All
B737
B737
B737
B737
B737
B-737
B-737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
SSJ-100
B737
B737
B737
B737
B737
Var
B-777
B-737
B737
various
various
various
various
various
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B737
B-737
B-737
B-737
B-737
various
various
ATR72
ALL
ATR72
737CL
737ALL
B-737
B-737
B-737
various
various
various
various
various
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
various
SSJ-100?
various
various
B-737
B-737
B-737
various
B-737
B-737
B-737
B-737
B-737
A-320
A-320
Various
B-737
B-737
B-737
A-320
A-320
A-320
A-320
A-320
A-320
A-320
A-320
A-320
A-320
A-320
Various
Various
Various
Various
Various
Various
Various
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
B-737
A320
B-737
B-737
B-757
various
B-737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
A-320
B737
B737
B767
B737
B737
B737
B737
A321
Dash 8
B737
B737
B757
B737
B757
B757
B757
B737
B757
UNK
UNK
UNK
B-777
А-330
B-737
B-737
B-737
B-737
B700-1A10
B300
Dash-8
BD-700-1A10
B757
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B757
B757
Tool
B737
Q300
Q300
Q300
Q300
Q300
Q300
Q300
B737
747
B737
B737
B737
B737
B737
B737
B737
airbus
B737
B737
B757
B737
B737
B737
B737
B737
B737
B757
B737
B737
B737
B757
B737
B737
B737
B737
B737
B737
B757
B737
B737
B757
B737
B757
B757
B737
B757
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B757
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B757
B-757
A320
A320
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
many
B-737
B757
B737
Embraer ERJ-190
B737
B737
B737
B737
B737
B757
B737
Beechcraft King Air B 350i
B737
B737
B777
B777
B-737
B-737
B757
B757
B737
B737
Bombardier
B737
B747
B737
B737
B737
Q300 Bombardier
B737
B737
B757
B737
B737
A330
RRJ95
B737
B737
B737
B737NG
Bombardier
B737
Q300
B737
B737
B757
B757
B757
Beechcraft King Air В300
B-737
B-737
Falcon 7X
A318
B757
A320N
Hawker
B737
B737
B737
B777
B737
B737
B737
B737
B737
B737
B777
B-737
B737
B737
B737
B737
B777
A320
A320
A320
A320
A320
A320
A320
A320
A320
A320
A320
A320
A320
A320
A320
A320
A320
A320
A320
A320
A320
A320
A320
A320
A320
A320
A320
A320
A320
A320
B737
B737
B737
a320
a320
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
B737
A32S
B737
B757
Challenger 850
Challenger 850`;

// Normalize function to create consistent naming
function normalizeAcType(type: string): string {
  if (!type || type === "UNK" || type === "various" || type === "Various" || type === "All" || type === "ALL" || type === "many" || type === "Tool") {
    return "";
  }
  
  // Normalize common patterns
  type = type.trim().toUpperCase();
  
  // Handle specific patterns
  if (type.includes("737")) return "B737";
  if (type.includes("757")) return "B757";
  if (type.includes("747")) return "B747";
  if (type.includes("767")) return "B767";
  if (type.includes("777")) return "B777";
  if (type.includes("A320") || type === "A-320" || type === "A32S") return "A320";
  if (type.includes("A321") || type === "A-321") return "A321";
  if (type.includes("A318") || type === "A-318") return "A318";
  if (type.includes("A330") || type === "A-330" || type === "А-330") return "A330";
  if (type.includes("SSJ-100") || type === "RRJ95") return "SSJ-100";
  if (type.includes("ATR72")) return "ATR72";
  if (type.includes("DASH") && type.includes("8")) return "DASH-8";
  if (type.includes("Q300")) return "Q300";
  if (type.includes("BOMBARDIER") && !type.includes("Q300")) return "BOMBARDIER";
  if (type.includes("EMBRAER") && type.includes("190")) return "ERJ-190";
  if (type.includes("BEECHCRAFT")) {
    if (type.includes("350")) return "BEECHCRAFT-350";
    if (type.includes("300")) return "BEECHCRAFT-300";
  }
  if (type.includes("FALCON") && type.includes("7X")) return "FALCON-7X";
  if (type.includes("CHALLENGER") && type.includes("850")) return "CHALLENGER-850";
  if (type.includes("HAWKER")) return "HAWKER";
  if (type.includes("BD-700") || type.includes("B700")) return "BD-700";
  if (type === "AIRBUS") return "AIRBUS";
  
  return type;
}

// Common engine types for aviation
const commonEngineTypes = [
  { type: "CFM56", manufacturer: "CFM International", acTypes: ["B737", "A320"] },
  { type: "V2500", manufacturer: "IAE", acTypes: ["A320", "A321"] },
  { type: "LEAP-1A", manufacturer: "CFM International", acTypes: ["A320NEO"] },
  { type: "LEAP-1B", manufacturer: "CFM International", acTypes: ["B737MAX"] },
  { type: "PW1000G", manufacturer: "Pratt & Whitney", acTypes: ["A320NEO", "A220"] },
  { type: "Trent 700", manufacturer: "Rolls-Royce", acTypes: ["A330"] },
  { type: "Trent 800", manufacturer: "Rolls-Royce", acTypes: ["B777"] },
  { type: "GE90", manufacturer: "General Electric", acTypes: ["B777"] },
  { type: "GEnx", manufacturer: "General Electric", acTypes: ["B787", "B747-8"] },
  { type: "Trent 1000", manufacturer: "Rolls-Royce", acTypes: ["B787"] },
  { type: "PW4000", manufacturer: "Pratt & Whitney", acTypes: ["B767", "B747", "A330"] },
  { type: "CF6", manufacturer: "General Electric", acTypes: ["B767", "B747", "A330"] },
  { type: "RB211", manufacturer: "Rolls-Royce", acTypes: ["B757", "B767"] },
  { type: "PW2000", manufacturer: "Pratt & Whitney", acTypes: ["B757"] },
  { type: "SaM146", manufacturer: "PowerJet", acTypes: ["SSJ-100"] },
  { type: "PW127", manufacturer: "Pratt & Whitney", acTypes: ["ATR72", "ATR42"] },
  { type: "PW120", manufacturer: "Pratt & Whitney", acTypes: ["DASH-8"] },
  { type: "PW123", manufacturer: "Pratt & Whitney", acTypes: ["Q300"] },
  { type: "CF34", manufacturer: "General Electric", acTypes: ["ERJ-190", "CRJ"] },
  { type: "PT6A", manufacturer: "Pratt & Whitney", acTypes: ["BEECHCRAFT-350", "BEECHCRAFT-300"] },
  { type: "TFE731", manufacturer: "Honeywell", acTypes: ["HAWKER", "FALCON"] },
  { type: "BR710", manufacturer: "Rolls-Royce", acTypes: ["BD-700"] },
  { type: "CF34-3B", manufacturer: "General Electric", acTypes: ["CHALLENGER-850"] },
];

async function populateData() {
  try {
    // Extract unique AC types
    const types = acTypesList.split('\n').map(t => t.trim()).filter(Boolean);
    const uniqueTypes = [...new Set(types)];
    
    // Process AC types
    const processedTypes = new Map<string, string>();
    uniqueTypes.forEach(type => {
      const normalized = normalizeAcType(type);
      if (normalized) {
        processedTypes.set(type, normalized);
      }
    });
    
    // Insert AC types
    console.log('Inserting AC types...');
    for (const [type, normalized] of processedTypes) {
      try {
        await db.insert(acTypes).values({
          type,
          normalized
        }).onConflictDoNothing();
      } catch (error) {
        console.log(`Skipping duplicate AC type: ${type}`);
      }
    }
    
    // Insert engine types
    console.log('Inserting engine types...');
    for (const engine of commonEngineTypes) {
      try {
        await db.insert(engineTypes).values(engine).onConflictDoNothing();
      } catch (error) {
        console.log(`Skipping duplicate engine type: ${engine.type}`);
      }
    }
    
    console.log('Data population completed!');
    
    // Show stats
    const acCount = await db.select({ count: sql<number>`count(*)` }).from(acTypes);
    const engineCount = await db.select({ count: sql<number>`count(*)` }).from(engineTypes);
    
    console.log(`Total AC types: ${acCount[0].count}`);
    console.log(`Total engine types: ${engineCount[0].count}`);
    
  } catch (error) {
    console.error('Error populating data:', error);
  } finally {
    process.exit(0);
  }
}

populateData();