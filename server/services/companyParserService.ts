import * as cheerio from 'cheerio';
import { ExtractedPart } from './aiAnalysisService';

interface CompanyParser {
  name: string;
  emailDomains: string[];
  parser: (htmlContent: string, subject: string) => ExtractedPart[];
}

export class CompanyParserService {
  private parsers: CompanyParser[] = [];

  constructor() {
    this.initializeParsers();
  }

  private initializeParsers() {
    // Aeroflot parser
    this.parsers.push({
      name: 'Aeroflot',
      emailDomains: ['@aeroflot.ru', '@atechnics.ru'],
      parser: this.aeroflotParser.bind(this)
    });

    // Azur Air parser
    this.parsers.push({
      name: 'Azur Air',
      emailDomains: ['@azurair.ru'],
      parser: this.azurParser.bind(this)
    });

    // Pobeda parser
    this.parsers.push({
      name: 'Pobeda',
      emailDomains: ['@pobeda.aero'],
      parser: this.pobedaParser.bind(this)
    });

    // Ural Airlines parser
    this.parsers.push({
      name: 'Ural Airlines',
      emailDomains: ['@u6.ru'],
      parser: this.uralParser.bind(this)
    });

    // Rossiya Airlines parser
    this.parsers.push({
      name: 'Rossiya Airlines',
      emailDomains: ['@rossiya-airlines.com'],
      parser: this.rossiyaParser.bind(this)
    });

    // Yakutia parser
    this.parsers.push({
      name: 'Yakutia',
      emailDomains: ['@yakutia.aero'],
      parser: this.yakutiaParser.bind(this)
    });

    // S7 Airlines parser
    this.parsers.push({
      name: 'S7 Airlines',
      emailDomains: ['@s7.ru'],
      parser: this.s7Parser.bind(this)
    });

    // Nordwind parser
    this.parsers.push({
      name: 'Nordwind',
      emailDomains: ['@nordwindairlines.ru'],
      parser: this.nordwindParser.bind(this)
    });

    // Lukoil parser
    this.parsers.push({
      name: 'Lukoil',
      emailDomains: ['@lukoil.com'],
      parser: this.lukoilParser.bind(this)
    });

    // Generic table parser for unknown companies
    this.parsers.push({
      name: 'Generic',
      emailDomains: [], // Matches all
      parser: this.genericTableParser.bind(this)
    });
  }

  parseEmail(htmlContent: string, subject: string, fromEmail: string): ExtractedPart[] | null {
    // Find matching parser by email domain
    const parser = this.parsers.find(p => {
      if (p.emailDomains.length === 0) return true; // Generic parser
      return p.emailDomains.some(domain => fromEmail.toLowerCase().includes(domain));
    });

    if (!parser) {
      console.log(`No parser found for email: ${fromEmail}`);
      return null;
    }

    console.log(`Using ${parser.name} parser for email from ${fromEmail}`);
    
    try {
      const parts = parser.parser(htmlContent, subject);
      console.log(`${parser.name} parser found ${parts.length} parts`);
      return parts;
    } catch (error) {
      console.error(`Error in ${parser.name} parser:`, error);
      return null;
    }
  }

  private determinePriority(subject: string): string {
    const subjectLower = subject.toLowerCase();
    
    if (subjectLower.includes('asap') || subject.includes('AOG') || 
        subject.includes('NO-GO') || subjectLower.includes('aircraft on ground')) {
      return 'AOG';
    } else if (subjectLower.includes('urgent') || subjectLower.includes('critical') || 
               subject.includes('CRT!') || subjectLower.includes('wsp')) {
      return 'WSP';
    } else if (subjectLower.includes('urgent stock replenishment')) {
      return 'USR';
    } else {
      return 'RTN';
    }
  }

  private parseQuantity(qtyText: string): number {
    const qty = parseInt(qtyText.replace(/[^\d]/g, ''));
    return isNaN(qty) ? 1 : qty;
  }

  private cleanText(text: string): string {
    return text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Aeroflot specific parser
  private aeroflotParser(htmlContent: string, subject: string): ExtractedPart[] {
    const $ = cheerio.load(htmlContent);
    const parts: ExtractedPart[] = [];
    
    const headers = {
      acType: ['F/A Type', 'A/C Type', 'A/C', 'AC', 'AC Type'],
      partNumber: ['P/N', 'Part No.', 'Part Number', 'PARTNO', 'Part No', 'PN', 'PARTNUMBER'],
      description: ['Description', 'DESCRIPTION', 'Desc', 'DISCRIPTION', 'Name'],
      quantity: ['QTY', 'Qty', 'Qty.', 'QTE', 'quantity', 'Q-ty', 'Q-ty.', 'QL', 'QTY REQ'],
      unit: ['Measure Unit', 'MEASURE_UNIT', 'UNIT', 'UOM', 'Unit', 'UM', 'MU', 'UOM'],
      notes: ['Notes', 'NOTES', 'Note', 'NOTE']
    };

    // Find tables
    const tables = $('table.v1MsoTableGrid, table[border="1"], table[style*="border"], table');
    
    tables.each((_, table) => {
      const $table = $(table);
      const tableHeaders: string[] = [];
      
      // Get headers
      $table.find('tr').first().find('th, td').each((_, cell) => {
        tableHeaders.push($(cell).text().trim());
      });

      // Find column indices
      const indices = this.findColumnIndices(tableHeaders, headers);
      
      if (indices.partNumber === -1 || indices.quantity === -1) {
        return; // Skip this table
      }

      // Process data rows
      $table.find('tr').slice(1).each((_, row) => {
        const $row = $(row);
        const cells = $row.find('td');
        
        if (cells.length > Math.max(indices.partNumber, indices.quantity)) {
          const partNumber = $(cells[indices.partNumber]).text().trim();
          const quantity = $(cells[indices.quantity]).text().trim();
          
          if (!partNumber || !quantity) return;
          
          const part: ExtractedPart = {
            part_number: partNumber.replace(/–/, '-'),
            description: indices.description !== -1 ? this.cleanText($(cells[indices.description]).text()) : '',
            qty: this.parseQuantity(quantity),
            um: indices.unit !== -1 ? $(cells[indices.unit]).text().trim() || 'EA' : 'EA',
            ac_type: indices.acType !== -1 ? $(cells[indices.acType]).text().trim() : '',
            priority: this.determinePriority(subject),
            pn_alt: [],
            remarks: indices.notes !== -1 ? this.cleanText($(cells[indices.notes]).text()) : ''
          };
          
          parts.push(part);
        }
      });
    });

    return parts;
  }

  // Azur Air parser - similar to Aeroflot but with specific adaptations
  private azurParser(htmlContent: string, subject: string): ExtractedPart[] {
    const $ = cheerio.load(htmlContent);
    const parts: ExtractedPart[] = [];
    
    // First try standard table parsing
    const tableParts = this.genericTableParser(htmlContent, subject);
    if (tableParts.length > 0) {
      return tableParts;
    }

    // Azur sometimes sends plain text format
    const text = $.text();
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    // Look for patterns like "PART# DESCRIPTION QTY"
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match pattern: part number (alphanumeric with dashes) followed by description and quantity
      const match = line.match(/^([A-Z0-9\-]+)\s+(.+?)\s+(\d+)\s*(EA|PC|SET|KIT)?$/i);
      if (match) {
        parts.push({
          part_number: match[1],
          description: match[2],
          qty: parseInt(match[3]),
          um: match[4] || 'EA',
          ac_type: '',
          priority: this.determinePriority(subject),
          pn_alt: [],
          remarks: ''
        });
      }
    }

    return parts;
  }

  // Pobeda parser - handles AMOS format
  private pobedaParser(htmlContent: string, subject: string): ExtractedPart[] {
    const $ = cheerio.load(htmlContent);
    const parts: ExtractedPart[] = [];
    
    // Pobeda often sends orders, not RFQs, so we might need to extract differently
    // Look for ORDER references in subject
    const orderMatch = subject.match(/ORDER:\s*"([^"]+)"/);
    const externalRef = subject.match(/EXTERNAL REFERENCE:\s*"([^"]+)"/);
    
    // Try standard table parsing first
    return this.genericTableParser(htmlContent, subject);
  }

  // Ural Airlines parser
  private uralParser(htmlContent: string, subject: string): ExtractedPart[] {
    return this.genericTableParser(htmlContent, subject);
  }

  // Rossiya Airlines parser
  private rossiyaParser(htmlContent: string, subject: string): ExtractedPart[] {
    const $ = cheerio.load(htmlContent);
    const parts: ExtractedPart[] = [];
    
    // Rossiya often uses simple format without tables
    const text = $.text();
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    let currentPart: Partial<ExtractedPart> | null = null;
    
    for (const line of lines) {
      // Check for part number pattern (e.g., "68689-2 BUTTON-COLD")
      const partMatch = line.match(/^([A-Z0-9\-]+)\s+([A-Z\-\s]+)$/);
      if (partMatch) {
        if (currentPart && currentPart.part_number) {
          parts.push(currentPart as ExtractedPart);
        }
        currentPart = {
          part_number: partMatch[1],
          description: partMatch[2],
          qty: 1,
          um: 'EA',
          ac_type: '',
          priority: this.determinePriority(subject),
          pn_alt: [],
          remarks: ''
        };
      }
      // Check for quantity (e.g., "1ea", "2 EA", "5")
      else if (currentPart && line.match(/^\d+\s*(ea|pc|set|kit)?$/i)) {
        const qtyMatch = line.match(/^(\d+)\s*(ea|pc|set|kit)?$/i);
        if (qtyMatch) {
          currentPart.qty = parseInt(qtyMatch[1]);
          currentPart.um = qtyMatch[2]?.toUpperCase() || 'EA';
        }
      }
      // Check for A/C type
      else if (line.match(/^(A|B)\d{3}/i)) {
        if (currentPart) {
          currentPart.ac_type = line;
        }
      }
    }
    
    // Add last part
    if (currentPart && currentPart.part_number) {
      parts.push(currentPart as ExtractedPart);
    }
    
    // If no parts found, try table parsing
    if (parts.length === 0) {
      return this.genericTableParser(htmlContent, subject);
    }
    
    return parts;
  }

  // Yakutia parser
  private yakutiaParser(htmlContent: string, subject: string): ExtractedPart[] {
    const $ = cheerio.load(htmlContent);
    const parts: ExtractedPart[] = [];
    
    // Yakutia uses a specific format with labels
    const text = $.text();
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    let currentPart: Partial<ExtractedPart> = {
      qty: 1,
      um: 'EA',
      ac_type: '',
      priority: this.determinePriority(subject),
      pn_alt: [],
      remarks: ''
    };
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1] || '';
      
      if (line === 'Description:' && nextLine) {
        currentPart.description = nextLine;
        i++;
      } else if (line === 'PN:' && nextLine) {
        currentPart.part_number = nextLine;
        i++;
      } else if (line === 'Qty:' && nextLine) {
        currentPart.qty = this.parseQuantity(nextLine);
        i++;
      } else if (line === 'Store_Unit:' && nextLine) {
        currentPart.um = nextLine.toUpperCase();
        i++;
      } else if (line === 'Alt/ PN:' && nextLine) {
        currentPart.pn_alt = [nextLine];
        i++;
      }
      
      // Check if we have a complete part
      if (currentPart.part_number && currentPart.description && 
          (i === lines.length - 1 || lines[i + 1] === 'Description:')) {
        parts.push(currentPart as ExtractedPart);
        currentPart = {
          qty: 1,
          um: 'EA',
          ac_type: '',
          priority: this.determinePriority(subject),
          pn_alt: [],
          remarks: ''
        };
      }
    }
    
    return parts;
  }

  // S7 Airlines parser
  private s7Parser(htmlContent: string, subject: string): ExtractedPart[] {
    return this.genericTableParser(htmlContent, subject);
  }

  // Nordwind parser
  private nordwindParser(htmlContent: string, subject: string): ExtractedPart[] {
    return this.genericTableParser(htmlContent, subject);
  }

  // Lukoil parser
  private lukoilParser(htmlContent: string, subject: string): ExtractedPart[] {
    const $ = cheerio.load(htmlContent);
    const parts: ExtractedPart[] = [];
    
    // Lukoil uses specific table format with Russian headers sometimes
    const headers = {
      acType: ['F/A Type', 'A/C Type', 'A/C', 'AC'],
      partNumber: ['P/N', 'Part No.', 'Part Number', 'PARTNO', 'Партийный номер'],
      description: ['Description', 'DESCRIPTION', 'Desc', 'Name', 'Наименование'],
      quantity: ['QTY', 'Qty', 'Кол-во к заказу', 'Кол-во', 'quantity'],
      unit: ['Measure Unit', 'UNIT', 'UOM', 'Ед', 'UM'],
      notes: ['Notes', 'NOTES', 'Note', 'Примечания']
    };
    
    return this.parseWithHeaders(htmlContent, subject, headers);
  }

  // Generic table parser for unknown companies
  private genericTableParser(htmlContent: string, subject: string): ExtractedPart[] {
    const headers = {
      acType: ['F/A Type', 'A/C Type', 'A/C', 'AC', 'AC Type', 'Aircraft'],
      partNumber: ['P/N', 'Part No.', 'Part Number', 'PARTNO', 'Part No', 'PN', 'Part #', 'p/n'],
      description: ['Description', 'DESCRIPTION', 'Desc', 'DISCRIPTION', 'Name', 'nomenclature', 'Expendable Material'],
      quantity: ['QTY', 'Qty', 'Qty.', 'QTE', 'quantity', 'Q-ty', 'Q-ty.', 'QL', 'QTY.'],
      unit: ['Measure Unit', 'MEASURE_UNIT', 'UNIT', 'UOM', 'Unit', 'UM', 'MU', 'M/U'],
      notes: ['Notes', 'NOTES', 'Note', 'NOTE', 'COMMENT', 'Remarks']
    };
    
    return this.parseWithHeaders(htmlContent, subject, headers);
  }

  private parseWithHeaders(htmlContent: string, subject: string, headers: any): ExtractedPart[] {
    const $ = cheerio.load(htmlContent);
    const parts: ExtractedPart[] = [];
    
    // Find all tables
    const tables = $('table');
    
    tables.each((_, table) => {
      const $table = $(table);
      const tableHeaders: string[] = [];
      
      // Get headers from first row
      $table.find('tr').first().find('th, td').each((_, cell) => {
        tableHeaders.push($(cell).text().trim());
      });
      
      // Find column indices
      const indices = this.findColumnIndices(tableHeaders, headers);
      
      // Must have at least part number and quantity
      if (indices.partNumber === -1 || indices.quantity === -1) {
        return;
      }
      
      // Process data rows
      $table.find('tr').slice(1).each((_, row) => {
        const $row = $(row);
        const cells = $row.find('td');
        
        if (cells.length > Math.max(indices.partNumber, indices.quantity)) {
          const partNumber = $(cells[indices.partNumber]).text().trim();
          const quantity = $(cells[indices.quantity]).text().trim();
          
          if (!partNumber || !quantity) return;
          
          // Extract alternates from part number (e.g., "642-1000-505 (ALT 642-1000-501)")
          let mainPartNumber = partNumber;
          const altParts: string[] = [];
          
          const altMatch = partNumber.match(/^([^\(]+)\s*\(ALT\s+([^\)]+)\)/i);
          if (altMatch) {
            mainPartNumber = altMatch[1].trim();
            altParts.push(altMatch[2].trim());
          }
          
          // Extract notes and additional alternates
          let notes = indices.notes !== -1 ? this.cleanText($(cells[indices.notes]).text()) : '';
          const notesAltMatch = notes.match(/ALT\s+([A-Z0-9\-]+)/gi);
          if (notesAltMatch) {
            notesAltMatch.forEach(match => {
              const alt = match.replace(/ALT\s+/i, '').trim();
              if (!altParts.includes(alt)) {
                altParts.push(alt);
              }
            });
          }
          
          const part: ExtractedPart = {
            part_number: mainPartNumber.replace(/–/, '-'),
            description: indices.description !== -1 ? this.cleanText($(cells[indices.description]).text()) : '',
            qty: this.parseQuantity(quantity),
            um: indices.unit !== -1 ? $(cells[indices.unit]).text().trim() || 'EA' : 'EA',
            ac_type: indices.acType !== -1 ? $(cells[indices.acType]).text().trim() : '',
            priority: this.determinePriority(subject),
            pn_alt: altParts,
            remarks: notes
          };
          
          // Add alternates to remarks if present
          if (altParts.length > 0) {
            const altText = `Alt P/N: ${altParts.join(', ')}`;
            part.remarks = part.remarks ? `${part.remarks}, ${altText}` : altText;
          }
          
          parts.push(part);
        }
      });
    });
    
    return parts;
  }

  private findColumnIndices(headers: string[], headerMap: any): any {
    const indices: any = {
      acType: -1,
      partNumber: -1,
      description: -1,
      quantity: -1,
      unit: -1,
      notes: -1
    };
    
    for (const [key, variations] of Object.entries(headerMap)) {
      indices[key] = headers.findIndex(header => 
        (variations as string[]).some(v => 
          header.toUpperCase().includes(v.toUpperCase())
        )
      );
    }
    
    return indices;
  }
}