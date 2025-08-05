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
    /^[A-Z0-9]+-[A-Z0-9]+$/,  // Формат типа ABC-123 или 123-ABC
    /^[A-Z0-9]+\.[A-Z0-9]+$/, // Формат типа ABC.123 или 123.ABC
    /^[A-Z0-9]+\/[A-Z0-9]+$/, // Формат типа ABC/123 или 123/ABC
    /^[A-Z0-9]{2,}$/,         // Просто буквы и цифры длиной от 2 символов
    /^[0-9]+[A-Z]+[0-9]+$/,   // Начинается с цифр, содержит буквы и цифры
    /^[A-Z]+[0-9]+[A-Z0-9]*$/, // Начинается с букв, содержит цифры
    /^[A-Z]+,[A-Z]+$/,        // Формат типа ABC,DEF
    /^[A-Z]+,[A-Z]+-[A-Z0-9]+$/, // Формат типа ABC,DEF-123
    /^[A-Z]+,[A-Z]+\s[A-Z]+$/, // Формат типа ABC,DEF GHI
    /^[A-Z]+,[A-Z]+\s[A-Z]+-[A-Z0-9]+$/, // Формат типа ABC,DEF GHI-123
    /^[A-Z]+[0-9]+[A-Z]+[0-9]+[A-Z]*$/, // Формат типа ABC123DEF456
    /^[A-Z]+[0-9]+[A-Z]+[0-9]+[A-Z]*[0-9]*$/ // Формат типа ABC123DEF456GHI789
  ];
  
  // Проверяем, является ли строка типичным номером детали
  const isTypicalPartNumber = 
    hasDigits && // Содержит цифры
    (partNumberPatterns.some(pattern => pattern.test(str)) || // Соответствует паттернам
    (str.length >= 2 && !str.includes(' ') && /[A-Z0-9]/.test(str))); // Не содержит пробелов и содержит буквы/цифры
  
  return isTypicalPartNumber;
}

// Функция для определения, является ли строка описанием
function isDescription(str) {
  // Проверяем наличие типичных паттернов описаний
  const descriptionPatterns = [
    /^[A-Za-zА-Яа-яЁё\s-]+$/,  // Буквы (латиница и кириллица), пробелы и дефисы
    /^[A-ZА-ЯЁ]+$/,            // Одно слово заглавными буквами
    /^[A-ZА-ЯЁ]+-[A-ZА-ЯЁ]+$/, // Два слова через дефис заглавными буквами
    /^[A-ZА-ЯЁ]+,[A-ZА-ЯЁ]+$/, // Два слова через запятую заглавными буквами
    /^[A-ZА-ЯЁ]+,[A-ZА-ЯЁ]+\s[A-ZА-ЯЁ]+$/, // Три слова, первые два через запятую
    /^[A-ZА-ЯЁ\s]+$/,          // Любой текст заглавными буквами с пробелами
    /^[A-Za-z]+-[A-Za-z]+[0-9.]+[A-Za-z]+$/, // Формат типа Microlite-AA0.34pcf-1IN
    /^[A-Za-z]+-[A-Za-z]+[0-9.]+[A-Za-z]+-[0-9]+[A-Za-z]+$/, // Формат типа Microlite-AA0.34pcf-1IN
    /^[A-Za-z]+-[A-Za-z]+[0-9.]+[A-Za-z]+-[0-9]+[A-Za-z]+\s\(\d+\s[A-Z]+\)$/ // Формат типа Microlite-AA0.34pcf-1IN (2 EA)
  ];
  
  // Проверяем, является ли строка типичным описанием
  const isTypicalDescription = 
    descriptionPatterns.some(pattern => pattern.test(str)) || // Соответствует паттернам
    (str.length >= 2 && /^[A-Za-zА-Яа-яЁё]/.test(str) && str.includes('-')); // Начинается с буквы и содержит дефис
  
  return isTypicalDescription;
}

function iflyParser(htmlContent, subject) {
  logger.info('iflyParser');

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
    } else if (subject.includes('CRIT')) {
      priority = 'WSP';
    } else if (subject.toLowerCase().includes('urgent stock replenishment')) {
      priority = 'USR';
    } else {
      priority = 'RTN';
    }

    // Обрабатываем каждую таблицу
    tableData.forEach((table, tableIndex) => {
      logger.info(`Обработка таблицы #${tableIndex + 1}`);
      
      // Определяем формат таблицы по заголовкам
      const headers = table[0].map(h => h.toLowerCase());
      logger.info(`Заголовки таблицы: ${JSON.stringify(headers)}`);
      
      const isFormat1 = headers.includes('description') && headers.includes('p/n');
      const isFormat2 = headers.length === 4 && !headers.includes('description');
      
      logger.info(`Формат таблицы: ${isFormat1 ? 'Format1' : isFormat2 ? 'Format2' : 'Unknown'}`);
      
      table.forEach((row, rowIndex) => {
        // Определяем формат строки
        let description, partNumber, unit, quantity, priority, remarks = '';
        
        // Пропускаем заголовок таблицы
        if (rowIndex === 0) {
          return;
        }

        logger.info(`Обработка строки ${rowIndex}: ${JSON.stringify(row)}`);

        if (isFormat1) {
          // Формат: Description, P/N, Quantity
          const descIndex = headers.indexOf('description');
          const pnIndex = headers.indexOf('p/n');
          const qtyIndex = headers.indexOf('quantity');

          logger.info(`Индексы колонок: desc=${descIndex}, pn=${pnIndex}, qty=${qtyIndex}`);

          if (row[descIndex]) description = row[descIndex].trim();
          if (row[pnIndex]) partNumber = row[pnIndex].trim();
          if (row[qtyIndex]) {
            quantity = row[qtyIndex].trim();
            unit = 'EA'; // По умолчанию для этого формата
          }
        } else if (isFormat2) {
          // Формат: PN, Description, Qty+Unit, Remarks
          if (row[0]) partNumber = row[0].trim();
          if (row[1]) description = row[1].trim();
          if (row[2]) {
            const qtyMatch = row[2].match(/(\d+)\s*([A-Za-z]+)/);
            if (qtyMatch) {
              quantity = qtyMatch[1];
              unit = qtyMatch[2].toUpperCase();
            }
          }
          if (row[3]) remarks = row[3].trim();
        } else {
          // Пробуем определить формат по содержимому
          if (row[0] && isPartNumber(row[0])) {
            partNumber = row[0].trim();
            if (row[1]) description = row[1].trim();
            if (row[2]) {
              const qtyMatch = row[2].match(/(\d+)\s*([A-Za-z]+)/);
              if (qtyMatch) {
                quantity = qtyMatch[1];
                unit = qtyMatch[2].toUpperCase();
              } else {
                quantity = row[2].trim();
                unit = 'EA';
              }
            }
            if (row[3]) remarks = row[3].trim();
          } else if (row[0] && isDescription(row[0])) {
            description = row[0].trim();
            if (row[1] && isPartNumber(row[1])) {
              partNumber = row[1].trim();
              if (row[2]) {
                quantity = row[2].trim();
                unit = 'EA';
              }
            }
          }
        }

        logger.info(`Извлеченные данные: pn=${partNumber}, desc=${description}, qty=${quantity}, unit=${unit}`);

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
          priority: priority || 'RTN',
          remarks: remarks
        });

        logger.info(`Добавлена деталь: ${partNumber} (${qty} ${unit || 'EA'})`);
      });
    });

    logger.info(`Всего найдено деталей: ${parts.length}`);
    return parts;
  } catch (error) {
    console.error('Ошибка при извлечении данных из письма:', error);
    return [];
  }
}

module.exports = { iflyParser };

