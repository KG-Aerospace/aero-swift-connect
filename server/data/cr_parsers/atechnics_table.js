const { JSDOM } = require('jsdom');
const cheerio = require('cheerio');
const {logger} = require('./logger');


/**
 * Extracts part information from HTML email content
 * @param {string} htmlContent - The HTML content of the email
 * @param {string} subject - The subject of the email
 * @returns {Array} An array of part objects with standardized fields
 */


function extractTableData(html) {
  const $ = cheerio.load(html);
  const tables = $('table');
  const allRows = [];
  
  tables.each((tableIndex, table) => {
    const rows = [];
    $(table).find('tr').each((i, row) => {
      const cells = [];
      $(row).find('td').each((j, cell) => {
        cells.push($(cell).text().trim());
      });
      if (cells.length > 0) {
        rows.push(cells);
      }
    });
    if (rows.length > 0) {
      allRows.push(rows);
    }
  });
  
  logger.info(`Найдено таблиц: ${allRows.length}`);
  logger.info(allRows);
  return allRows;

}

// Функция для определения, является ли строка номером детали
function isPartNumber(str) {
  // Проверяем наличие цифр в строке
  const hasDigits = /\d/.test(str);
  
  // Проверяем наличие типичных паттернов номеров деталей
  const partNumberPatterns = [
    /^[A-Z0-9]+-[A-Z0-9]+$/,  // Формат типа ABC-123
    /^[A-Z0-9]+\.[A-Z0-9]+$/, // Формат типа ABC.123
    /^[A-Z0-9]+\/[A-Z0-9]+$/, // Формат типа ABC/123
    /^[A-Z0-9]{2,}$/,         // Просто буквы и цифры длиной от 2 символов
    /^[A-Z]+[0-9]+[A-Z0-9]*$/, // Начинается с букв, содержит цифры
    /^[A-Z]+,[A-Z]+$/,        // Формат типа ABC,DEF
    /^[A-Z]+,[A-Z]+-[A-Z0-9]+$/, // Формат типа ABC,DEF-123
    /^[A-Z]+,[A-Z]+\s[A-Z]+$/, // Формат типа ABC,DEF GHI
    /^[A-Z]+,[A-Z]+\s[A-Z]+-[A-Z0-9]+$/ // Формат типа ABC,DEF GHI-123
  ];
  
  // Проверяем, является ли строка типичным номером детали
  const isTypicalPartNumber = 
    hasDigits || // Содержит цифры
    partNumberPatterns.some(pattern => pattern.test(str)) || // Соответствует паттернам
    (str.length >= 2 && /^[A-Z]/.test(str) && !str.includes(' ')); // Начинается с заглавной буквы, не содержит пробелов
  
  return isTypicalPartNumber;
}

// Функция для определения, является ли строка описанием
function isDescription(str) {
  // Проверяем наличие типичных паттернов описаний
  const descriptionPatterns = [
    /^[A-Za-z\s-]+$/,         // Только буквы, пробелы и дефисы
    /^[A-Z]+$/,               // Одно слово заглавными буквами
    /^[A-Z]+-[A-Z]+$/,        // Два слова через дефис заглавными буквами
    /^[A-Z]+,[A-Z]+$/,        // Два слова через запятую заглавными буквами
    /^[A-Z]+,[A-Z]+\s[A-Z]+$/ // Три слова, первые два через запятую, заглавными буквами
  ];
  
  // Проверяем, является ли строка типичным описанием
  const isTypicalDescription = 
    descriptionPatterns.some(pattern => pattern.test(str)) || // Соответствует паттернам
    (str.length >= 2 && /^[A-Z]/.test(str) && str.includes(' ')); // Начинается с заглавной буквы, содержит пробелы
  
  return isTypicalDescription;
}

function atechTableParser(htmlContent, subject) {
  logger.info('atechTableParsers');

  try {
    const parts = [];
    const tableData = extractTableData(htmlContent);
    
    if (tableData.length === 0) {
      logger.info('Таблицы не найдены');
      return [];
    }

    // Определяем приоритет на основе темы письма
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

    // Обрабатываем каждую таблицу
    tableData.forEach((table, tableIndex) => {
      logger.info(`Обработка таблицы #${tableIndex + 1}`);
      
      table.forEach((row, rowIndex) => {
        // Определяем формат строки
        let description, partNumber, unit, quantity;
        
        // Проверяем, есть ли первые две колонки с индексами
        if (row.length >= 6 && /^\d+$/.test(row[0]) && /^\d+$/.test(row[1])) {
          // Формат с индексами
          let col1 = row[2];
          let col2 = row[3];
          
          // Проверяем и исправляем порядок колонок если нужно
          if (isPartNumber(col1) && isDescription(col2)) {
            description = col2;
            partNumber = col1;
          } else {
            description = col1;
            partNumber = col2;
          }
          
          unit = row[4];
          quantity = row[5];
        } else if (row.length >= 3) {
          // Формат без индексов
          let col1 = row[0];
          let col2 = row[1];
          
          // Проверяем и исправляем порядок колонок если нужно
          if (isPartNumber(col1) && isDescription(col2)) {
            description = col2;
            partNumber = col1;
          } else {
            description = col1;
            partNumber = col2;
          }
          
          quantity = row[2];
          unit = row[3] || 'EA';
        } else {
          logger.info(`Пропуск строки ${rowIndex + 1}: недостаточно колонок (${row.length})`);
          return;
        }

        // Пропускаем пустые строки
        if (!partNumber || !description || !quantity) {
          logger.info(`Пропуск строки ${rowIndex + 1}: пустые обязательные поля`);
          return;
        }

        // Парсим количество
        const qty = parseFloat(quantity.replace(',', '.').replace(/[^\d.]/g, ''));
        if (isNaN(qty)) {
          logger.info(`Пропуск строки ${rowIndex + 1}: некорректное количество: ${quantity}`);
          return;
        }

        parts.push({
          part_number: partNumber,
          description: description.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim(),
          qty: qty,
          um: unit || 'EA',
          priority: priority,
          remarks: ''
        });

        logger.info(`Добавлена деталь: ${partNumber} (${qty} ${unit || 'EA'})`);
      });
    });

    logger.info(`Всего найдено деталей: ${parts.length}`);
    logger.info(parts);
    
    return parts;
  } catch (error) {
    console.error('Ошибка при извлечении данных из письма:', error);
    return [];
  }
}

module.exports = { atechTableParser };
