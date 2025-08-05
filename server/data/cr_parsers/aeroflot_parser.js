const { JSDOM } = require('jsdom');
const cheerio = require('cheerio');
const {logger} = require('./logger');
/**
 * Extracts part information from HTML email content
 * @param {string} htmlContent - The HTML content of the email
 * @param {string} subject - The subject of the email
 * @returns {Array} An array of part objects with standardized fields
 */
function aeroflotParser(htmlContent, subject) {
  try {
    const $ = cheerio.load(htmlContent);
    const parts = [];

    // Логируем исходный HTML для отладки
    //logger.info('Исходный HTML:', htmlContent);
    const acTypeHeaders = ['F/A Type', 'A/C Type', 'A/C', 'AC', 'AC Type'];
    // Определяем возможные названия колонок
    const partNumberHeaders = [
      'P/N', 'Part No.', 'Part Number', 'PARTNO', 'Part No',
      'PN', 'PARTNUMBER',
    ];

    const descriptionHeaders = [
      'Description', 'DESCRIPTION', 'Desc', 'DISCRIPTION', 'Name'
    ];

    const quantityHeaders = [
      'QTY', 'Qty', 'Qty.', 'QTE', 'Кол-во к заказу', 'quantity',
      'Q-ty', 'Q-ty.', 'Qty', 'Qty.', 'Кол-во', 'QL', 'QTY REQ'
    ];

    const unitHeaders = [
      'Measure Unit', 'MEASURE_UNIT', 'UNIT', 'Ext. Measure Unit',
      'UOM', 'Measure Unit', 'Unit', 'UM', 'MU', 'Ед', 'UOM'
    ];

    const notesHeaders = [  
      'Notes', 'NOTES', 'Note', 'NOTE'
    ]

    // Ищем таблицы в разных форматах
    const tables = $('table.v1MsoTableGrid, table[border="1"], table[style*="border"], table');
    //logger.info(`Найдено таблиц: ${tables.length}`);

    // Проверяем, есть ли две таблицы, где первая содержит только заголовки
    let headers = [];
    let dataTable = null;

    if (tables.length >= 2) {
      const firstTable = $(tables[0]);
      const secondTable = $(tables[1]);
      
      // Проверяем, содержит ли первая таблица только заголовки
      const firstTableRows = firstTable.find('tr').length;
      const secondTableRows = secondTable.find('tr').length;
      
      if (firstTableRows === 1 && secondTableRows > 1) {
        // Получаем заголовки из первой таблицы
        firstTable.find('tr').first().find('th, td').each((_, cell) => {
          headers.push($(cell).text().trim());
        });
        dataTable = secondTable;
      }
    }

    // Если не нашли разделенные таблицы, обрабатываем как обычно
    if (!dataTable) {
      tables.each((tableIndex, table) => {
        const $table = $(table);
        // Получаем заголовки таблицы
        headers = [];
        $table.find('tr').first().find('th, td').each((_, cell) => {
          headers.push($(cell).text().trim());
        });
        
        dataTable = $table;
      });
    }

    if (!dataTable) {
      logger.info('Не найдены таблицы с данными');
      return [];
    }

    // Проверяем наличие ключевых слов в заголовках
    const hasPartNumber = headers.some(header => 
      partNumberHeaders.some(h => header.toUpperCase().includes(h.toUpperCase()))
    );
    const hasDescription = headers.some(header => 
      descriptionHeaders.some(h => header.toUpperCase().includes(h.toUpperCase()))
    );
    const hasQuantity = headers.some(header => 
      quantityHeaders.some(h => header.toUpperCase().includes(h.toUpperCase()))
    );
    
    if (!hasPartNumber || !hasDescription || !hasQuantity) {
      logger.info('Не найдены обязательные заголовки (Part Number, Description, Quantity), возвращаем null');
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

    // Обрабатываем строки данных
    dataTable.find('tr').each((rowIndex, row) => {
      const $row = $(row);
      const $cells = $row.find('td');

      if ($cells.length >= Math.max(partNumberIndex, descriptionIndex, quantityIndex) + 1) {
        // Извлекаем данные из соответствующих колонок
        let partNumber = $cells.eq(partNumberIndex).text().trim();
        const description = $cells.eq(descriptionIndex).text().trim();
        const quantity = $cells.eq(quantityIndex).text().trim();
        const acType = acTypeIndex !== -1 ? $cells.eq(acTypeIndex).text().trim() : '';
        const notes = notesIndex !== -1 ? $cells.eq(notesIndex).text().trim() : '';
        // Пропускаем пустые строки
        if (!partNumber || !description || !quantity) {
          //logger.info('Пропуск пустой строки:', { partNumber, description, quantity });
          return;
        }

        // Парсим количество
        const qty = parseInt(quantity.replace(/[^\d]/g, ''));

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

        const remarksText = notes ? notes.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim() : '';
        partNumber = partNumber.replace(/–/, '-');
        
        parts.push({
          part_number: partNumber,
          ac_type: acType,
          description: description.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim(),
          qty: qty,
          um: um,
          priority: priority,
          pn_alt: [],
          remarks: remarksText
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

module.exports = { aeroflotParser };