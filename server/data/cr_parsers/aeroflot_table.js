const { JSDOM } = require('jsdom');
const cheerio = require('cheerio');
const {logger} = require('./logger');

// Определяем возможные названия колонок
const acTypeHeaders = ['F/A Type', 'A/C Type', 'A/C', 'AC', 'Receiver'];
const partNumberHeaders = [
  'P/N', 'Part No.', 'Part Number', 'PARTNO', 'Part No',
  'PN', 'PART #'
];
const descriptionHeaders = [
  'Description', 'DESCRIPTION', 'Desc', 'DISCRIPTION', 'Name'
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
  'PN_SUBST', 'ALT', 'ATL', 'PN_SUBST_1', 'PN_SUBST_2', 'ALT PN'
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

function aeroflotTableParser(htmlContent, subject) {
  try {
    const $ = cheerio.load(htmlContent);
    const parts = [];
    console.log('aeroflotTableParser')
    // Логируем исходный HTML для отладки
    //logger.info('Исходный HTML:' +  htmlContent);

    // Ищем подходящую таблицу
    const tableResult = findValidTable($);
    if (!tableResult) {
      logger.info('Не найдены таблицы с необходимыми заголовками');
      return [];
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

    const notesIndex = headers.findIndex(header =>
      notesHeaders.some(h => header.toUpperCase().includes(h.toUpperCase()))
    );

    const orderNumberIndex = headers.findIndex(header =>
      orderNumberHeaders.some(h => header.toUpperCase().includes(h.toUpperCase()))
    );

    const unitIndex = headers.findIndex((header, index) => {
      // Исключаем заголовки, которые уже определены как другие типы колонок
      if (index === partNumberIndex || index === descriptionIndex || 
          index === quantityIndex || index === acTypeIndex || 
          index === notesIndex || index === orderNumberIndex ||
          altPartNumberIndices.includes(index)) {
        return false;
      }
      return unitHeaders.some(h => header.toUpperCase().includes(h.toUpperCase()));
    });

    // Обрабатываем строки данных
    let currentPart = null;
    let rowspanCount = 0;
    let currentRowspan = 0;
    
    dataTable.find('tr').each((rowIndex, row) => {
      // Пропускаем первую строку с заголовками
      if (rowIndex === 0) return;

      const $row = $(row);
      const $cells = $row.find('td');

      logger.info(`Обработка строки ${rowIndex}:`);
      logger.info(`Количество ячеек: ${$cells.length}`);
      $cells.each((i, cell) => {
        logger.info(`Ячейка ${i}: ${$(cell).text().trim()}`);
      });

      // Проверяем, есть ли в строке основные данные (part_number)
      const hasMainData = $cells.length >= Math.max(partNumberIndex, descriptionIndex, quantityIndex) + 1;
      
      if (hasMainData) {
        // Если это новая основная строка, создаем новый объект детали
        const partNumber = $cells.eq(partNumberIndex).text().trim();
        const description = $cells.eq(descriptionIndex).text().trim();
        const quantity = $cells.eq(quantityIndex).text().trim();
        const acType = acTypeIndex !== -1 ? $cells.eq(acTypeIndex).text().trim() : '';
        const notes = notesIndex !== -1 ? $cells.eq(notesIndex).text().trim() : '';
        const orderNumber = orderNumberIndex !== -1 ? $cells.eq(orderNumberIndex).text().trim() : '';

        // Пропускаем пустые строки
        if (!partNumber || !quantity) {
          return;
        }

        // Парсим количество
        const qty = parseFloat(quantity.replace(',', '.').replace(/[^\d.]/g, ''));
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

        // Создаем новый объект детали
        currentPart = {
          part_number: partNumber,
          ac_type: acType,
          description: description.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim() || partNumber,
          qty: qty,
          um: um,
          priority: priority,
          pn_alt: [],
          remarks: notes ? notes.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim() : ''
        };

        // Добавляем альтернативный номер, если он есть в этой строке
        if (altPartNumberIndices.length > 0) {
          const altPn = $cells.eq(altPartNumberIndices[0]).text().trim();
          if (altPn) {
            currentPart.pn_alt.push(altPn);
          }
        }

        // Определяем количество строк для текущей детали
        const rowspanAttr = $cells.eq(partNumberIndex).attr('rowspan');
        currentRowspan = rowspanAttr ? parseInt(rowspanAttr) : 1;
        logger.info(`Найдена новая деталь ${partNumber} с rowspan=${currentRowspan}`);

        parts.push(currentPart);
      } else if (currentPart && $cells.length > 0) {
        // Если это строка только с альтернативным номером
        const altPn = $cells.eq(0).text().trim();
        if (altPn && currentRowspan > 0) {
          logger.info(`Добавляем альтернативный номер ${altPn} к детали ${currentPart.part_number}`);
          currentPart.pn_alt.push(altPn);
          currentRowspan--;
        }
      }
    });

    // Форматируем remarks для всех деталей
    parts.forEach(part => {
      const altPartNumbersText = part.pn_alt.length > 0 ? `Alt P/N: ${part.pn_alt.join(', ')}` : '';
      part.remarks = [part.remarks, altPartNumbersText].filter(Boolean).join('; ');
      logger.info(`Деталь ${part.part_number} имеет альтернативные номера: ${part.pn_alt.join(', ')}`);
    });

    logger.info(`Всего найдено деталей: ${parts.length}`);
    return parts || [];
  } catch (error) {
    console.error('Ошибка при извлечении данных из письма:', error);
    return [];
  }
}

module.exports = { aeroflotTableParser };