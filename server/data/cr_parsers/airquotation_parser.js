const { JSDOM } = require('jsdom');
const cheerio = require('cheerio');


/**
 * Extracts part information from HTML email content
 * @param {string} htmlContent - The HTML content of the email
 * @returns {Array} An array of part objects with standardized fields
 */
function parseAirQuotationEmail(htmlContent, subject) {
        try {
          const $ = cheerio.load(htmlContent);
          const partMap = new Map(); // Use a map to organize parts by ID and handle alternates
          
          // Extract metadata
          const metadata = {
            supplierID: '',
            requestID: '',
          };
          
          // Extract priority
          const priorityText = $('td[valign="middle"][align="left"]:contains("Routine"), td[valign="middle"][align="left"]:contains("AOG"), td[valign="middle"][align="left"]:contains("Critical")').text().trim();
          
          // Extract supplier ID from URL
          const supplierLinks = $('a[href*="supplierId="]');
          if (supplierLinks.length > 0) {
            const href = supplierLinks.first().attr('href');
            if (href) {
              const match = href.match(/supplierId=(\d+)/);
              if (match && match[1]) {
                metadata.supplierID = match[1];
              }
            }
          }
          
          // Extract request ID from header
          const requestHeader = $('div:contains("Request R")').first().text().trim();
          if (requestHeader) {
            const match = requestHeader.match(/Request\s+(R\d+\w+)/);
            if (match && match[1]) {
              metadata.requestID = match[1];
            }
          }
          
          // First pass: Find all main part entries
          $('table tbody tr').each((_, row) => {
            const $row = $(row);
            
            // Get part number from cell with specific styling
            const partNumberCell = $row.find('td[width="296px"][valign="top"], td[style*="font-weight: 700"][valign="top"]').first();
            const partNumber = partNumberCell.text().trim();
            
            // Skip empty rows, header rows, or non-part rows
            if (!partNumber || partNumber === 'Part No / ID' || partNumber === '') {
              return;
            }
            
            // Find neighboring cells for description, aircraft type, quantity
            const descriptionCell = $row.find('td[width="310px"][valign="top"]').first();
            const acTypeCell = $row.find('td[width="72px"][valign="top"]').first();
            const quantityCell = $row.find('td[align="right"][valign="top"]').first();
            
            if (partNumber && quantityCell.length > 0) {
              // Get the full quantity text (like "12 EA")
              const quantityText = quantityCell.text().trim();
              
              // Split into number and unit of measure
              const quantityParts = quantityText.split(/\s+/);
              let quantity;
              if (quantityParts[0].includes('.') || quantityParts[0].includes(',')) {
                quantity = parseFloat(quantityParts[0].replace(',', '.'), 2);
              } else {
                quantity = parseInt(quantityParts[0], 10);
              }
              const unitMeasure = quantityParts[1] || 'EA'; // Default to EA if not specified
              
              // Get description and aircraft type
              const description = descriptionCell.text().trim();
              const acType = acTypeCell.text().trim();
              
              // Clean part number (remove ID prefix if present)
              const cleanPartNumber = partNumber.includes(':') 
                ? partNumber.split(':')[1].trim() 
                : partNumber;
              
              // Store in map with clean key for easy lookup
              partMap.set(cleanPartNumber, {
                part_number: cleanPartNumber,
                description: description,
                ac_type: acType,
                qty: quantity,
                um: unitMeasure,
                pn_alt: [] // Will populate in second pass
              });
            }
          });
          
          // Second pass: Find alternative part numbers and associate with main parts
          // Track which entry we're currently processing
          let currentMainPart = null;
          
          $('table tbody tr').each((_, row) => {
            const $row = $(row);
            
            // Check if this is a main part row (to track context)
            const partNumberCell = $row.find('td[width="296px"][valign="top"], td[style*="font-weight: 700"][valign="top"]').first();
            if (partNumberCell.length > 0) {
              const partNumber = partNumberCell.text().trim();
              if (partNumber && partNumber !== 'Part No / ID') {
                // Update current part context
                const cleanPart = partNumber.includes(':') 
                  ? partNumber.split(':')[1].trim() 
                  : partNumber;
                currentMainPart = cleanPart;
              }
            }
            
            // Check if this is an alt part number header row
            const altPartLabel = $row.find('th:contains("Alt Part No")');
            
            if (altPartLabel.length > 0 && currentMainPart) {
              // Get the alt part number from the next row
              const nextRow = $row.next();
              if (nextRow.length > 0) {
                const altPartNumber = nextRow.find('td:nth-child(2)').text().trim();
                
                // Only process if it's a valid part number
                if (altPartNumber && altPartNumber !== '-' && altPartNumber !== '') {
                  // Find the current main part and add this as an alternative
                  const mainPart = partMap.get(currentMainPart);
                  if (mainPart) {
                    mainPart.pn_alt.push(altPartNumber);
                  }
                }
              }
            }
          });

          let partsRequested = [];
          
          // Определяем приоритет один раз для всего письма
          let emailPriority = priorityText;
          if (emailPriority.toUpperCase().includes('AOG') 
            || emailPriority.toUpperCase().includes('NO-GO')) {
            emailPriority = 'AOG';
          } else if (emailPriority.toUpperCase().includes('CRITICAL') 
                || emailPriority.toUpperCase().includes('CRT!')) {
            emailPriority = 'WSP';
          } else if (emailPriority.toUpperCase().includes('ROUTINE') 
                || emailPriority.toUpperCase().includes('RTN')) {
            emailPriority = 'RTN';
          }

          if (subject.toUpperCase().includes('AOG') 
                || subject.toUpperCase().includes('NO-GO')) {
            emailPriority = 'AOG';
          } else if (subject.toUpperCase().includes('CRITICAL') 
                || subject.toUpperCase().includes('CRT!')) {
            emailPriority = 'WSP';
          } else if (subject.toUpperCase().includes('ROUTINE') 
                || subject.toUpperCase().includes('RTN')) {
            emailPriority = 'RTN';
          }
          
          // Преобразуем Map в массив
          partsRequested = Array.from(partMap.values()).map(part => {
            const altPartNumbersText = part.pn_alt.length > 0 ? `Alt P/N: ${part.pn_alt.join(', ')}` : '';
            return {
              ...metadata,
              ...part,
              priority: emailPriority,
              remarks: altPartNumbersText
            };
          });
          
          // Create final result with metadata and parts 
          return partsRequested;
        } catch (error) {
          console.error('Error extracting data from email:', error);
          return [];
        }
      }
      



module.exports = { parseAirQuotationEmail }; 