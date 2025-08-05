import { db } from "../db";
import { parts } from "@shared/schema";
import { partService } from "../services/partService";

// Parse the parts data from the provided file
const partsData = [
  { partNumber: "CR3213-6-02", description: "RIVET" },
  { partNumber: "222K68-2", description: "NLG TIRE" },
  { partNumber: "DR26221T", description: "MLG TIRE" },
  { partNumber: "D717-01-100", description: "EMERGENCY BATTERY PACK" },
  { partNumber: "043046", description: "FILTER" },
  { partNumber: "4305890050", description: "TRANSMITTER-TPIS" },
  { partNumber: "63543-253-4", description: "DDRMI COMBINED" },
  { partNumber: "SLP5182A3-1", description: "PLUG" },
  { partNumber: "HA225-1", description: "LATCH" },
  { partNumber: "3959A0000K06", description: "CONTROLLER - CSAS" },
  { partNumber: "NAS1580V4T9", description: "BOLT, CSK HD" },
  { partNumber: "572757-1", description: "SWITCH" },
  { partNumber: "J100", description: "SWITCH" },
  { partNumber: "MS28889-2", description: "VALVE" },
  { partNumber: "NAS1580V4T14", description: "BOLT, CSK HD" },
  { partNumber: "6840023E18", description: "NOZZLE-FUEL LARGE TIP" },
  { partNumber: "67839", description: "VALV" },
  { partNumber: "BACP18BC03A08P", description: "Pin" },
  { partNumber: "TAAI3-998130-03", description: "COVER" },
  { partNumber: "216200-0", description: "infant life vest" },
  { partNumber: "411A4907-4189", description: "BLANKET ASSY" },
  { partNumber: "69-43230-5E", description: "GRILL" },
  { partNumber: "MS21260S3RH", description: "TERMINAL - TERMINAL WIRE ROPE STUD" },
  { partNumber: "NAS1974T23TP", description: "BOLT" },
  { partNumber: "BACT14A3", description: "TERMINAL - CYLINDRICAL, CABLE" },
  { partNumber: "M39029-30-217", description: "SOCKET" },
  { partNumber: "3888449-2", description: "WIRING HARNESS-BRANCHED" },
  { partNumber: "36400049-1", description: "VALVE" },
  { partNumber: "7578929", description: "FILTERS" },
  { partNumber: "3888448-2", description: "WIRING HARNESS-BRANCHED" },
  { partNumber: "622−7194−201", description: "RECEIVER, VHF NAVIGATION (VIR−432)" },
  { partNumber: "453-5004", description: "EMERGENCY LOCATOR TRANSMITTER (FIX)" },
  { partNumber: "2313M347-4", description: "MOTOR ASSY" },
  { partNumber: "2100M96P05", description: "HPT BLADE, CFM56 ENGINE" },
  { partNumber: "902013-01", description: "FIRE DETECTOR ASSY" },
  { partNumber: "724400-2", description: "PUMP, FUEL" },
  { partNumber: "90G97", description: "SWITCH" },
  { partNumber: "13TX-0115-A", description: "TRANSMITTER" },
  { partNumber: "30840002", description: "PROTECTIVE CAP" },
  { partNumber: "3455-42", description: "DUCT" },
  { partNumber: "1291M56P01", description: "PLUG DISCONNECT" },
  { partNumber: "L8006K9", description: "BOLT" },
  { partNumber: "NAS1102E3-14", description: "SCREW" },
  { partNumber: "69-77997-4", description: "BRACKET" },
  { partNumber: "285W0755-4", description: "SCREEN ASSY" },
  { partNumber: "1A087-0123", description: "TRACK ASSY-CAPTAIN" },
  { partNumber: "9-130-07", description: "SEAT CUP" },
  { partNumber: "3-049966", description: "HOSE" },
  { partNumber: "897776-01", description: "CARTRIDGE FIREX" },
  { partNumber: "S30310-218", description: "RING" },
  { partNumber: "21D10-2", description: "COALESCER ASSY" },
  { partNumber: "BACR15DR3AC4", description: "RIVET" },
  { partNumber: "1-899-29", description: "SENSOR" },
  { partNumber: "720752-58", description: "PACKING" },
  { partNumber: "2D2025-12", description: "FILLER" },
  { partNumber: "D5348015800700", description: "PLATE ASY" },
  { partNumber: "2313M-347-4", description: "MOTOR ASSY-CONVERTER L/H" },
  { partNumber: "76-167-4", description: "OIL QUANTITY TRANSMITTER (ДАТЧИК КОЛ" },
  { partNumber: "1020929-1", description: "ACTUATOR-LPC, BLEED VANE ACTUATION" },
  { partNumber: "D37008-107", description: "Aspirator" },
  { partNumber: "3810808-3", description: "HOUSING INL GDE VANE" },
  { partNumber: "335-023-810-0", description: "SKIN" },
  { partNumber: "340-001-036-0", description: "340-001-036-0" },
  { partNumber: "BACR15GF4D10", description: "RIVET" },
  { partNumber: "2D1025-1", description: "HINGE" },
  { partNumber: "D5463061900000", description: "SEAL" },
  { partNumber: "GG546-2125-5", description: "UNIT, HUMIDIFIER CONTROL" },
  { partNumber: "3510-0053-01", description: "COFFEEMAKER" },
  { partNumber: "ST6202-010", description: "seal" },
  { partNumber: "803163-23", description: "assembly regulator, transducer and coupling" },
  { partNumber: "C16221AA02", description: "INDICATOR, INTEGRATED STANDBY" },
  { partNumber: "3885091-3", description: "APU load control valve" },
  { partNumber: "60322-105", description: "Aspirator Assembly" },
  { partNumber: "790425A6", description: "STARTER V2500" },
  { partNumber: "66915-101", description: "Aspirator" },
  { partNumber: "66068-101", description: "Aspirator" },
  { partNumber: "863470-01", description: "Extinguisher" },
  { partNumber: "810483-2", description: "SEAL - CAP" },
  { partNumber: "DMPN19-1-1", description: "ANTENNA RADIO ALTIMETER" },
  { partNumber: "FRH280002", description: "VALVE-AIR RELEASE" },
  { partNumber: "41SG265-1", description: "TRANSDUCER" },
  { partNumber: "1306-918", description: "VALVE PRESSURE REGULATING" },
  { partNumber: "027−614−0", description: "TIRE, NOSEWHEEL" },
  { partNumber: "SEDL0C9C", description: "INDICATOR" },
  { partNumber: "P99C31-616", description: "BOOST PUMP" },
  { partNumber: "3810948-1", description: "DUCT" },
  { partNumber: "211691-00", description: "FACE SEAL" },
  { partNumber: "JR0E90", description: "GASKET" },
  { partNumber: "2LA007182-22", description: "NAV LIGHT, ASSY, GREEN" },
  { partNumber: "2950004-304", description: "SOV ACTUATOR ASSY, 28 VDC" },
  { partNumber: "MF10-05-11", description: "MASK - FULL FACE" },
  { partNumber: "20146-0102", description: "FUEL PROBE" },
  { partNumber: "NAS1473R3", description: "NUT" },
  { partNumber: "1982SP", description: "LAMP" },
  { partNumber: "4081600-940", description: "DEU" },
  { partNumber: "PPA1102-00", description: "DETECTOR-SMOKE CARGO" },
  { partNumber: "PPA1202-00", description: "SMOKE DETECTOR - LAV" },
];

async function seedParts() {
  try {
    console.log("Starting parts seeding...");
    
    // Check if parts table exists
    const count = await partService.getPartsCount();
    if (count > 0) {
      console.log(`Parts table already has ${count} entries. Skipping seed.`);
      return;
    }
    
    // Seed the parts
    await partService.seedParts(partsData);
    
    console.log("Parts seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding parts:", error);
  } finally {
    await db.$client.end();
  }
}

seedParts();