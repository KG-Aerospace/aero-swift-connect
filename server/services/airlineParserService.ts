// Airline-specific email parsing service
import { Email } from "@shared/schema";

// Map of email domains to airline companies
const AIRLINE_DOMAIN_MAP: Record<string, string> = {
  // Russian Airlines
  "nordwindairlines.ru": "Nordwind Airlines",
  "s7.ru": "S7 Airlines",
  "aeroflot.ru": "Aeroflot",
  "utair.ru": "UTair Aviation",
  "pobeda.aero": "Pobeda Airlines",
  "rossiya-airlines.com": "Rossiya Airlines",
  "yakutia.aero": "Yakutia Airlines",
  "azimuth.aero": "Azimuth Airlines",
  "smartavia.ru": "Smartavia",
  "pegas-fly.ru": "Pegas Fly",
  "ifly-rus.ru": "iFly Airlines",
  "redwings.aero": "Red Wings Airlines",
  
  // International Airlines
  "emirates.com": "Emirates",
  "lufthansa.com": "Lufthansa",
  "airfrance.fr": "Air France",
  "klm.com": "KLM",
  "ba.com": "British Airways",
  "turkishairlines.com": "Turkish Airlines",
  "qatarairways.com": "Qatar Airways",
  "etihad.com": "Etihad Airways",
  
  // Add more airlines as needed
};

// Aviation part patterns for different companies
export interface ParsedOrder {
  partNumber: string;
  quantity: number;
  condition: string;
  priority: string;
  description?: string;
  alternatePartNumbers?: string[];
  notes?: string;
}

export class AirlineParserService {
  /**
   * Detect airline company from email address
   */
  detectAirlineFromEmail(email: string): string | null {
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) return null;
    
    // Check direct domain mapping
    if (AIRLINE_DOMAIN_MAP[domain]) {
      return AIRLINE_DOMAIN_MAP[domain];
    }
    
    // Check for subdomain matches (e.g., mail.airline.com)
    for (const [airlineDomain, airlineName] of Object.entries(AIRLINE_DOMAIN_MAP)) {
      if (domain.includes(airlineDomain) || airlineDomain.includes(domain)) {
        return airlineName;
      }
    }
    
    return null;
  }

  /**
   * Parse email based on detected airline company
   */
  parseEmailByAirline(email: Email, emailBody: string): {
    airline: string | null;
    orders: ParsedOrder[];
    isAviationRequest: boolean;
  } {
    const airline = this.detectAirlineFromEmail(email.fromEmail);
    
    // Select parser based on airline
    let orders: ParsedOrder[] = [];
    let isAviationRequest = false;
    
    if (airline) {
      switch (airline) {
        case "Nordwind Airlines":
          const nordwindResult = this.parseNordwindEmail(emailBody);
          orders = nordwindResult.orders;
          isAviationRequest = nordwindResult.isAviationRequest;
          break;
          
        case "S7 Airlines":
          const s7Result = this.parseS7Email(emailBody);
          orders = s7Result.orders;
          isAviationRequest = s7Result.isAviationRequest;
          break;
          
        case "UTair Aviation":
          const utairResult = this.parseUTairEmail(emailBody);
          orders = utairResult.orders;
          isAviationRequest = utairResult.isAviationRequest;
          break;
          
        case "Aeroflot":
          const aeroflotResult = this.parseAeroflotEmail(emailBody);
          orders = aeroflotResult.orders;
          isAviationRequest = aeroflotResult.isAviationRequest;
          break;
          
        default:
          // Use generic parser for other airlines
          const genericResult = this.parseGenericAirlineEmail(emailBody);
          orders = genericResult.orders;
          isAviationRequest = genericResult.isAviationRequest;
          break;
      }
    } else {
      // Use generic parser for unknown domains
      const genericResult = this.parseGenericAirlineEmail(emailBody);
      orders = genericResult.orders;
      isAviationRequest = genericResult.isAviationRequest;
    }
    
    return { airline, orders, isAviationRequest };
  }

  /**
   * Nordwind Airlines specific parser
   */
  private parseNordwindEmail(body: string): { orders: ParsedOrder[]; isAviationRequest: boolean } {
    const orders: ParsedOrder[] = [];
    
    // Nordwind specific patterns
    const patterns = [
      // Pattern: DRIVE UNIT ASSY-ANT P/N 622-5135-802 recovery
      /(?:P\/N|PN|Part\s*Number)[:\s]*([A-Z0-9\-]+)(?:\s+recovery)?/gi,
      // Pattern: Request for P/N: 123-456-789
      /Request\s+for\s+P\/N[:\s]*([A-Z0-9\-]+)/gi,
      // Pattern: NWA//NTF with part codes
      /NWA\/\/NTF.*?(?:P\/N|PN)?[:\s]*([A-Z0-9\-]+)/gi,
    ];
    
    const foundParts = new Set<string>();
    
    for (const pattern of patterns) {
      const matches = Array.from(body.matchAll(pattern));
      for (const match of matches) {
        if (match[1]) {
          const partNumber = match[1].trim();
          if (partNumber.length >= 3 && !foundParts.has(partNumber)) {
            foundParts.add(partNumber);
            
            // Extract quantity for this part
            const quantity = this.extractQuantityNearPart(body, partNumber);
            const condition = this.extractCondition(body);
            const priority = body.match(/recovery|urgent|AOG/i) ? "URGENT" : "STANDARD";
            
            orders.push({
              partNumber,
              quantity,
              condition,
              priority,
              description: this.extractDescription(body, partNumber),
            });
          }
        }
      }
    }
    
    return { 
      orders, 
      isAviationRequest: orders.length > 0 || /aircraft|aviation|part|component/i.test(body)
    };
  }

  /**
   * S7 Airlines specific parser
   */
  private parseS7Email(body: string): { orders: ParsedOrder[]; isAviationRequest: boolean } {
    const orders: ParsedOrder[] = [];
    
    // S7 specific patterns (often use Cyrillic)
    const patterns = [
      // Standard P/N pattern
      /(?:P\/N|PN|Part\s*Number)[:\s]*([A-Z0-9\-]+)/gi,
      // Pattern with dashes and mixed format
      /\b([A-Z]{2,4}[\-\s]?\d{3,6}[\-\s]?[A-Z0-9]{0,6})\b/g,
    ];
    
    const foundParts = new Set<string>();
    
    for (const pattern of patterns) {
      const matches = Array.from(body.matchAll(pattern));
      for (const match of matches) {
        if (match[1]) {
          const partNumber = match[1].trim();
          if (this.isValidPartNumber(partNumber) && !foundParts.has(partNumber)) {
            foundParts.add(partNumber);
            
            orders.push({
              partNumber,
              quantity: this.extractQuantityNearPart(body, partNumber),
              condition: this.extractCondition(body),
              priority: body.match(/срочно|urgent|AOG/i) ? "URGENT" : "STANDARD",
              description: this.extractDescription(body, partNumber),
            });
          }
        }
      }
    }
    
    return { 
      orders, 
      isAviationRequest: orders.length > 0 || /aircraft|самолет|part|запчасть/i.test(body)
    };
  }

  /**
   * UTair Aviation specific parser
   */
  private parseUTairEmail(body: string): { orders: ParsedOrder[]; isAviationRequest: boolean } {
    const orders: ParsedOrder[] = [];
    
    // UTair often uses structured format
    const patterns = [
      // Pattern: Item: 123-456 Qty: 2
      /Item[:\s]*([A-Z0-9\-]+).*?Qty[:\s]*(\d+)/gi,
      // Standard patterns
      /(?:P\/N|PN|Part\s*Number)[:\s]*([A-Z0-9\-]+)/gi,
    ];
    
    const foundParts = new Set<string>();
    
    // First try structured pattern
    const structuredMatches = Array.from(body.matchAll(patterns[0]));
    for (const match of structuredMatches) {
      if (match[1] && match[2]) {
        const partNumber = match[1].trim();
        const quantity = parseInt(match[2]) || 1;
        
        if (!foundParts.has(partNumber)) {
          foundParts.add(partNumber);
          orders.push({
            partNumber,
            quantity,
            condition: this.extractCondition(body),
            priority: this.extractPriority(body),
            description: this.extractDescription(body, partNumber),
          });
        }
      }
    }
    
    // If no structured matches, try standard patterns
    if (orders.length === 0) {
      const standardMatches = Array.from(body.matchAll(patterns[1]));
      for (const match of standardMatches) {
        if (match[1]) {
          const partNumber = match[1].trim();
          if (this.isValidPartNumber(partNumber) && !foundParts.has(partNumber)) {
            foundParts.add(partNumber);
            orders.push({
              partNumber,
              quantity: this.extractQuantityNearPart(body, partNumber),
              condition: this.extractCondition(body),
              priority: this.extractPriority(body),
              description: this.extractDescription(body, partNumber),
            });
          }
        }
      }
    }
    
    return { 
      orders, 
      isAviationRequest: orders.length > 0 || /aircraft|part|component|заказ/i.test(body)
    };
  }

  /**
   * Aeroflot specific parser
   */
  private parseAeroflotEmail(body: string): { orders: ParsedOrder[]; isAviationRequest: boolean } {
    const orders: ParsedOrder[] = [];
    
    // Aeroflot patterns - often very formal
    const patterns = [
      // Pattern: Part Number: 123-456-789
      /Part\s*Number[:\s]*([A-Z0-9\-]+)/gi,
      // Pattern: P/N 123-456-789
      /P\/N\s+([A-Z0-9\-]+)/gi,
      // Pattern with quantity: 123-456-789 - 2 pcs
      /([A-Z0-9\-]+)\s*[\-–]\s*(\d+)\s*(?:pcs?|шт|pieces?)/gi,
    ];
    
    const foundParts = new Set<string>();
    
    // Check for parts with quantities first
    const qtyMatches = Array.from(body.matchAll(patterns[2]));
    for (const match of qtyMatches) {
      if (match[1] && match[2]) {
        const partNumber = match[1].trim();
        const quantity = parseInt(match[2]) || 1;
        
        if (this.isValidPartNumber(partNumber) && !foundParts.has(partNumber)) {
          foundParts.add(partNumber);
          orders.push({
            partNumber,
            quantity,
            condition: this.extractCondition(body),
            priority: this.extractPriority(body),
            description: this.extractDescription(body, partNumber),
          });
        }
      }
    }
    
    // Then check other patterns
    for (let i = 0; i < 2; i++) {
      const matches = Array.from(body.matchAll(patterns[i]));
      for (const match of matches) {
        if (match[1]) {
          const partNumber = match[1].trim();
          if (this.isValidPartNumber(partNumber) && !foundParts.has(partNumber)) {
            foundParts.add(partNumber);
            orders.push({
              partNumber,
              quantity: this.extractQuantityNearPart(body, partNumber),
              condition: this.extractCondition(body),
              priority: this.extractPriority(body),
              description: this.extractDescription(body, partNumber),
            });
          }
        }
      }
    }
    
    return { 
      orders, 
      isAviationRequest: orders.length > 0 || /aircraft|aviation|component|техническое обслуживание/i.test(body)
    };
  }

  /**
   * Generic airline email parser
   */
  private parseGenericAirlineEmail(body: string): { orders: ParsedOrder[]; isAviationRequest: boolean } {
    const orders: ParsedOrder[] = [];
    
    // Generic aviation part patterns
    const patterns = [
      /(?:P\/N|PN|Part\s*(?:Number|No\.|#)?)[:\s]*([A-Z0-9\-\/]+)/gi,
      /\b([A-Z]{2,4}[\-\s]?\d{3,6}[\-\s]?[A-Z0-9]*)\b/g,
      /\b(\d{3,6}[\-\s]?[A-Z]{2,4}[\-\s]?\d{0,4})\b/g,
    ];
    
    const foundParts = new Set<string>();
    
    for (const pattern of patterns) {
      const matches = Array.from(body.matchAll(pattern));
      for (const match of matches) {
        if (match[1]) {
          const partNumber = match[1].trim();
          if (this.isValidPartNumber(partNumber) && !foundParts.has(partNumber)) {
            foundParts.add(partNumber);
            orders.push({
              partNumber,
              quantity: this.extractQuantityNearPart(body, partNumber),
              condition: this.extractCondition(body),
              priority: this.extractPriority(body),
              description: this.extractDescription(body, partNumber),
            });
          }
        }
      }
    }
    
    return { 
      orders, 
      isAviationRequest: orders.length > 0 || this.isAviationRelated(body)
    };
  }

  /**
   * Helper methods
   */
  private isValidPartNumber(partNumber: string): boolean {
    // Basic validation
    if (!partNumber || partNumber.length < 3) return false;
    
    // Must contain both letters and numbers
    if (!/[A-Z]/i.test(partNumber) || !/\d/.test(partNumber)) return false;
    
    // Exclude common false positives
    const excludePatterns = [
      /^(RFQ|REQ|QTY|FOB|USD|EUR|RUB)\d*$/i,
      /^\d{1,2}[\-\/]\d{1,2}[\-\/]\d{2,4}$/,  // Dates
      /^[A-Z]{1,2}\d{1,2}$/,  // Simple codes like A1, B2
    ];
    
    for (const pattern of excludePatterns) {
      if (pattern.test(partNumber)) return false;
    }
    
    return true;
  }

  private extractQuantityNearPart(body: string, partNumber: string): number {
    // Look for quantity near the part number (within 50 characters)
    const index = body.indexOf(partNumber);
    if (index === -1) return 1;
    
    const nearText = body.substring(Math.max(0, index - 50), index + partNumber.length + 50);
    
    const patterns = [
      /(\d+)\s*(?:pcs?|pieces?|units?|ea|each|шт)/i,
      /(?:qty|quantity|кол-во)[:\s]*(\d+)/i,
      /\b(\d+)\s*(?:required|needed|требуется)/i,
    ];
    
    for (const pattern of patterns) {
      const match = nearText.match(pattern);
      if (match && match[1]) {
        const qty = parseInt(match[1]);
        if (qty > 0 && qty < 10000) return qty;
      }
    }
    
    return 1;
  }

  private extractCondition(body: string): string {
    const conditions = [
      { pattern: /\bnew\b/i, code: "NE" },
      { pattern: /\bused\b/i, code: "US" },
      { pattern: /\bserviceable\b/i, code: "SV" },
      { pattern: /\boverhauled?\b/i, code: "OH" },
      { pattern: /\brepaired?\b/i, code: "RP" },
      { pattern: /\bas[\-\s]removed?\b/i, code: "AR" },
    ];
    
    for (const { pattern, code } of conditions) {
      if (pattern.test(body)) return code;
    }
    
    return "NE"; // Default to new
  }

  private extractPriority(body: string): string {
    const urgentPatterns = [
      /urgent/i,
      /AOG/i,
      /aircraft\s+on\s+ground/i,
      /asap/i,
      /immediately/i,
      /critical/i,
      /recovery/i,
      /срочно/i,
    ];
    
    for (const pattern of urgentPatterns) {
      if (pattern.test(body)) return "URGENT";
    }
    
    return "STANDARD";
  }

  private extractDescription(body: string, partNumber: string): string {
    // Try to find description near part number
    const index = body.indexOf(partNumber);
    if (index === -1) return "";
    
    // Look for description patterns
    const patterns = [
      /Description[:\s]*([^\n\r]{10,100})/i,
      /\bfor\s+([^\n\r]{10,50})/i,
    ];
    
    const nearText = body.substring(Math.max(0, index - 100), index + partNumber.length + 100);
    
    for (const pattern of patterns) {
      const match = nearText.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return "";
  }

  private isAviationRelated(body: string): boolean {
    const aviationKeywords = [
      /aircraft/i,
      /aviation/i,
      /aerospace/i,
      /component/i,
      /spare\s*part/i,
      /maintenance/i,
      /repair/i,
      /overhaul/i,
      /самолет/i,
      /авиа/i,
      /запчаст/i,
      /компонент/i,
    ];
    
    for (const keyword of aviationKeywords) {
      if (keyword.test(body)) return true;
    }
    
    return false;
  }
}

export const airlineParserService = new AirlineParserService();