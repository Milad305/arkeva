/**
 * خروجی CSV سازگار با Excel.
 *
 * BOM اول فایل لازم است تا Excel متن فارسی UTF-8 را درست بخواند؛ بدون آن
 * حروف به هم می‌ریزند. جداکننده کاما است و هر خانه در صورت نیاز نقل‌قول می‌شود.
 */
export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv<T>(rows: readonly T[], columns: Array<CsvColumn<T>>): string {
  const header = columns.map((column) => escapeCell(column.header)).join(',');
  const body = rows.map((row) => columns.map((column) => escapeCell(column.value(row))).join(','));
  return [header, ...body].join('\r\n');
}

/**
 * خواندن CSV — کاما، نقل‌قول دوگانه و BOM اول فایل.
 * خروجی آرایهٔ سطرها؛ سطر خالی انتهای فایل حذف می‌شود.
 */
export function parseCsv(text: string): string[][] {
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index]!;
    if (quoted) {
      if (char === '"' && clean[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && clean[index + 1] === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += char;
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((value) => value.trim() !== ''));
}

/** ساخت و دانلود فایل در مرورگر. */
export function downloadCsv(fileName: string, csv: string): void {
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
