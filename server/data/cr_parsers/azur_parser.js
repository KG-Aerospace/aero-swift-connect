const { JSDOM } = require('jsdom');
const cheerio = require('cheerio');
const {logger} = require('./logger');
const { yamalParser } = require('./yamal_parser.js');

// Определяем возможные названия колонок
const acTypeHeaders = ['F/A Type', 'A/C Type', 'A/C', 'AC'];
const partNumberHeaders = [
  'P/N', 'Part No.', 'Part Number', 'PARTNO', 'Part No',
  'PN', 'PART #', 'p/n'
];
const descriptionHeaders = [
  'Description', 'DESCRIPTION', 'Desc', 'DISCRIPTION', 'Name', 'nomenclature', 'Expendable Material'
];
const quantityHeaders = [
  'QTY', 'Qty', 'Qty.', 'QTE', 'Кол-во к заказу', 'quantity',
  'Q-ty', 'Q-ty.', 'Qty', 'Qty.', 'Кол-во', 'QL', 'QTY.'
];
const unitHeaders = [
  'Measure Unit', 'MEASURE_UNIT', 'UNIT', 'Ext. Measure Unit',
  'UOM', 'Measure Unit', 'Unit', 'UM', 'MU'
];
const notesHeaders = [  
  'Notes', 'NOTES', 'Note', 'NOTE'
];
const altPartNumberHeaders = [
  'PN_SUBST', 'ALT', 'ATL', 'PN_SUBST_1', 'PN_SUBST_2', 'ALT PN', 'Interchangeability'
];

const orderNumberHeaders = [
  'Order No.', 'Order Number', 'ORDER'
];

/**
 * Extracts part information from HTML email content
 * @param {string} htmlContent - The HTML content of the email
 * @param {string} subject - The subject of the email
 * @returns {Array} An array of part objects with standardized fields
 */
function findValidTable($) {
  const allTables = $('table');
  logger.info(`Найдено всех таблиц: ${allTables.length}`);

  for (let i = 0; i < allTables.length; i++) {
    const table = $(allTables[i]);
    const headers = [];
    
    // Получаем заголовки из первой строки
    table.find('tr').first().find('th, td').each((_, cell) => {
      headers.push($(cell).text().replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim());
    });
    logger.info('headers ' + headers);
    // Проверяем наличие обязательных заголовков
    const hasPartNumber = headers.some(header => 
      partNumberHeaders.some(h => header.toUpperCase().includes(h.toUpperCase()))
    );
 
    const hasQuantity = headers.some(header => 
      quantityHeaders.some(h => header.toUpperCase().includes(h.toUpperCase()))
    );

    if (hasPartNumber && hasQuantity) {
      logger.info(`Найдена подходящая таблица #${i + 1}`);
      return { table, headers };
    }
  }

  return null;
}

function azurParser(htmlContent, subject) {
  try {
    const $ = cheerio.load(htmlContent);
    const parts = [];

    // Логируем исходный HTML для отладки
    //logger.info('Исходный HTML:' +  htmlContent);

    // Ищем подходящую таблицу
    const tableResult = findValidTable($);
    if (!tableResult) {
      logger.info('Не найдены таблицы с необходимыми заголовками, пробуем парсить как табло без заголовков');
      return yamalParser(htmlContent, subject);
      //return [];
    }

    const { table: dataTable, headers } = tableResult;
    logger.info('headers ' + headers);

    // Проверяем наличие ключевых слов в заголовках
    const hasPartNumber = headers.some(header => 
      partNumberHeaders.some(h => header.toUpperCase().includes(h.toUpperCase()))
    );
  
    const hasQuantity = headers.some(header => 
      quantityHeaders.some(h => header.toUpperCase().includes(h.toUpperCase()))
    );
    
 
    logger.info('hasPartNumber ' + hasPartNumber);
    logger.info('hasQuantity ' + hasQuantity);
    
    if (!hasPartNumber || !hasQuantity) {
      logger.info('Не найдены обязательные заголовки (Part Number, Quantity), возвращаем null');
      return [];
    }

    logger.info('Заголовки:');
    logger.info(headers);

    // Определяем индексы колонок
    const acTypeIndex = headers.findIndex(header =>
      acTypeHeaders.some(h => header.toUpperCase().includes(h.toUpperCase()))
    );

    const partNumberIndex = headers.findIndex(header =>
      partNumberHeaders.some(h => header.toUpperCase().includes(h.toUpperCase()))
    );

    const altPartNumberIndices = headers
      .map((header, index) => ({
        index,
        header: header.toUpperCase()
      }))
      .filter(({ header }) => 
        altPartNumberHeaders.some(h => header.includes(h.toUpperCase()))
      )
      .map(({ index }) => index);

    const descriptionIndex = headers.findIndex(header =>
      descriptionHeaders.some(h => header.toUpperCase().includes(h.toUpperCase()))
    );

    const quantityIndex = headers.findIndex(header =>
      quantityHeaders.some(h => header.toUpperCase().includes(h.toUpperCase()))
    );

    const unitIndex = headers.findIndex(header =>
      unitHeaders.some(h => header.toUpperCase().includes(h.toUpperCase()))
    );

    const notesIndex = headers.findIndex(header =>
      notesHeaders.some(h => header.toUpperCase().includes(h.toUpperCase()))
    );

    const orderNumberIndex = headers.findIndex(header =>
      orderNumberHeaders.some(h => header.toUpperCase().includes(h.toUpperCase()))
    );

    // Обрабатываем строки данных
    dataTable.find('tr').each((rowIndex, row) => {
      // Пропускаем первую строку с заголовками
      if (rowIndex === 0) return;

      const $row = $(row);
      const $cells = $row.find('td');

      if ($cells.length >= Math.max(partNumberIndex, descriptionIndex, quantityIndex) + 1) {
        // Извлекаем данные из соответствующих колонок
        const partNumber = $cells.eq(partNumberIndex).text().trim();
        const description = $cells.eq(descriptionIndex).text().trim();
        const quantity = $cells.eq(quantityIndex).text().trim();
        const acType = acTypeIndex !== -1 ? $cells.eq(acTypeIndex).text().trim() : '';
        const notes = notesIndex !== -1 ? $cells.eq(notesIndex).text().trim() : '';
        const orderNumber = orderNumberIndex !== -1 ? $cells.eq(orderNumberIndex).text().trim() : '';
        // Пропускаем пустые строки
        if (!partNumber  || !quantity) {
          return;
        }

        // Парсим количество
        const qty = parseFloat(quantity.replace(',', '.').replace(/[^\d.]/g, ''));
        // logger.info('qty ' + qty);
        // Проверяем, что количество - это действительно число
        if (isNaN(qty)) {
          logger.info('Некорректное количество:' + quantity);
          return;
        }

        // Определяем единицу измерения
        let um = 'EA'; // По умолчанию
        if (unitIndex !== -1 && $cells.length > unitIndex) {
          const unitText = $cells.eq(unitIndex).text().trim();
          if (unitText && unitText !== '') {
            um = unitText;
          }
        }

        //Определяем приоритет на основе темы письма
        let priority;
        if (subject.toLowerCase().includes('asap')) {
          priority = 'AOG';
        } else if (subject.toLowerCase().includes('urgent')) {
          priority = 'WSP';
        } else if (subject.includes('AOG')) {
          priority = 'AOG';
        } else if (subject.includes('NO-GO')) {
          priority = 'AOG';
        } else if (subject.toLowerCase().includes('critical')) {
          priority = 'WSP';
        } else if (subject.includes('CRT!')) {
          priority = 'WSP';
        } else if (subject.toLowerCase().includes('urgent stock replenishment')) {
          priority = 'USR';
        } else {
          priority = 'RTN';
        }

        let altPartNumbers = altPartNumberIndices
          .map(index => $cells.eq(index).text().trim())
          .filter(pn => pn && pn !== '' && pn !== '-');

        if (altPartNumbers.length > 0 && altPartNumbers.some(pn => pn.includes('\n'))) {
          let altPartNumbersNew = [];
          for (let pn of altPartNumbers) {
            if (pn.includes('\n')) {
              altPartNumbersNew = pn.split('\n').map(p => p.trim()).filter(p => p);
            } else {
              altPartNumbersNew.push(pn.trim());
            }
          }
          altPartNumbers = [...new Set(altPartNumbersNew)];
        }

        const altPartNumbersText = altPartNumbers.length > 0 ? `Alt P/N: ${altPartNumbers.join(', ')}` : '';
        const remarksText = [orderNumber, notes, altPartNumbersText].filter(Boolean).join('; ');

        parts.push({
          part_number: partNumber,
          ac_type: acType,
          description: description.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim() || partNumber,
          qty: qty,
          um: um,
          priority: priority,
          pn_alt: altPartNumbers,
          remarks: remarksText ? remarksText.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim() : ''
        });

        //logger.info('Добавлена деталь:', parts[parts.length - 1]);
      }
    });

    logger.info(`Всего найдено деталей: ${parts.length}`);
    //logger.info(parts);
    
    return parts || [];
  } catch (error) {
    console.error('Ошибка при извлечении данных из письма:', error);
    return [];
  }
}

module.exports = { azurParser };