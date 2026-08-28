export interface ParsedCsvRow {
  [key: string]: string;
}

export function parseCSV(csvText: string): ParsedCsvRow[] {
  const lines = parseCSVToRows(csvText);
  if (lines.length < 2) return [];

  const rawHeaders = lines[0];
  const headers = rawHeaders.map((h) => normalizeHeaderName(h));

  const results: ParsedCsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    // Skip empty lines
    if (row.length === 0 || (row.length === 1 && row[0].trim() === '')) {
      continue;
    }

    const rowObj: ParsedCsvRow = {};
    headers.forEach((header, index) => {
      if (header) {
        rowObj[header] = row[index] ? row[index].trim() : '';
      }
    });

    results.push(rowObj);
  }

  return results;
}

/**
 * Splits CSV string into rows and cells while respecting quoted values and nested commas/newlines.
 */
export function parseCSVToRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuote = false;

  const pushCell = () => {
    currentRow.push(currentCell);
    currentCell = '';
  };

  const pushRow = () => {
    pushCell();
    rows.push(currentRow);
    currentRow = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      pushCell();
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      pushRow();
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    pushRow();
  }

  return rows;
}

/**
 * Maps various human header names (e.g. "Product Name (REQUIRED)") to canonical object keys
 */
export function normalizeHeaderName(header: string): string {
  let clean = header.trim();
  // Strip out (REQUIRED), (Optional...), [Required], [Optional], etc. cleanly without backtracking
  clean = clean.replace(/\([^()]*\)/g, '').replace(/\[[^[\]]*\]/g, '').trim();
  clean = clean.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (clean === 'id' || clean.includes('itemid') || clean.includes('productid')) return 'id';
  if (clean.includes('vendorid')) return 'vendorId';
  if (clean.includes('categoryid') || clean.includes('producttypeid')) return 'productTypeId';

  // Specific entity names (MUST check before generic 'name' keyword)
  if (clean.includes('vendor') || clean.includes('supplier')) return 'vendorName';
  if (clean.includes('category') || clean.includes('producttype') || clean.includes('type')) return 'productTypeName';
  if (clean.includes('spanish')) return 'spanishName';

  // Units
  if (clean.includes('displayunit') || clean.includes('packunit') || clean.includes('secondaryunit') || clean.includes('pack')) return 'displayUnitName';
  if (clean.includes('baseunit') || clean === 'unit' || clean.includes('stockunit')) return 'baseUnitName';

  // Product Code / SKU
  if (clean.includes('productcode') || clean.includes('sku') || clean.includes('itemcode') || clean === 'code') return 'productCode';

  // Multiplier / Ratio
  if (clean.includes('multiplier') || clean.includes('conversion') || clean.includes('ratio')) return 'multiplier';

  // Note / Description
  if (clean.includes('note') || clean.includes('notes') || clean.includes('description')) return 'note';

  // PAR Level
  if (clean.includes('par')) return 'parLevel';

  // Status / Active
  if (clean.includes('status') || clean.includes('active') || clean.includes('isactive')) return 'isActive';

  // Product Name (fallback for general product name/displayname/title)
  if (clean.includes('productname') || clean.includes('displayname') || clean.includes('product') || clean.includes('item') || clean.includes('name') || clean.includes('title')) return 'displayName';

  return clean;
}

/**
 * Generates CSV string populated with products for a specific vendor
 */
export function generateVendorProductsCsv(items: any[], defaultVendorName?: string): string {
  const headers = [
    'Product ID (Do Not Change for Existing)',
    'Product Code (Optional)',
    'Product Name (REQUIRED)',
    'Vendor Name (REQUIRED)',
    'Category (Optional)',
    'Base Unit (REQUIRED)',
    'Display Unit (Optional)',
    'Multiplier (Optional)',
    'Spanish Name (Optional)',
    'Note (Optional)',
    'PAR Level (Optional)',
    'Status (Optional: active/inactive)'
  ];

  const formatCell = (val: string | number | undefined | null) => {
    if (val === undefined || val === null) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows: string[] = [headers.map((h) => formatCell(h)).join(',')];

  if (items && items.length > 0) {
    items.forEach((item) => {
      const row = [
        item.id || '',
        item.productCode || '',
        item.displayName || '',
        item.vendor?.displayName || item.vendorName || defaultVendorName || '',
        item.productType?.name || item.productTypeName || '',
        item.baseUnitName || '',
        item.displayUnitName || '',
        item.multiplier !== undefined && item.multiplier !== null ? String(item.multiplier) : '',
        item.spanishName || '',
        item.note || '',
        item.parLevel !== undefined && item.parLevel !== null ? String(item.parLevel) : '0',
        item.isActive === false ? 'inactive' : 'active'
      ];
      rows.push(row.map((cell) => formatCell(cell)).join(','));
    });
  } else {
    // Add sample blank row with vendor name prefilled
    const sampleRow = [
      '',
      'SKU-1001',
      'Example New Product',
      defaultVendorName || 'Vendor Name',
      'General',
      'EA',
      'Case (12)',
      '12',
      '',
      '',
      '10',
      'active'
    ];
    rows.push(sampleRow.map((cell) => formatCell(cell)).join(','));
  }

  return rows.join('\n');
}

/**
 * Generates downloadable CSV template string with clear headers & example rows
 */
export function generateProductsCsvTemplate(): string {
  const headers = [
    'Product ID (Do Not Change for Existing)',
    'Product Code (Optional)',
    'Product Name (REQUIRED)',
    'Vendor Name (REQUIRED)',
    'Category (Optional)',
    'Base Unit (REQUIRED)',
    'Display Unit (Optional)',
    'Multiplier (Optional)',
    'Spanish Name (Optional)',
    'Note (Optional)',
    'PAR Level (Optional)',
    'Status (Optional: active/inactive)'
  ];

  const exampleRow1 = [
    '',
    'SKU-1001',
    'Chicken Breast',
    'Roma Food Service',
    'Poultry',
    'LB',
    'Case (40lb)',
    '40',
    'Pechuga de Pollo',
    'Keep frozen below 0F',
    '15',
    'active'
  ];

  const exampleRow2 = [
    '',
    'SKU-1002',
    'Basmati Rice',
    'US Foods',
    'Dry Goods',
    'BAG',
    'Bag (20lb)',
    '1',
    'Arroz Basmati',
    '20 lb bag, extra long grain',
    '10',
    'active'
  ];

  const formatCell = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  return [
    headers.map(formatCell).join(','),
    exampleRow1.map(formatCell).join(','),
    exampleRow2.map(formatCell).join(',')
  ].join('\n');
}

/**
 * Triggers browser file download of CSV string
 */
export function downloadCsvFile(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
