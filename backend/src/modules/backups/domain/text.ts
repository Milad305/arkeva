import { toFaDigits } from '../../../platform/http/fa.js';

// متن نمایشی و CSV خروجی پشتیبان (F20 ۱۲).

/** «۲۴ کیلوبایت»، «۲٫۴ گیگابایت». */
export function sizeText(bytes: number): string {
  if (bytes < 1024) return `${toFaDigits(Math.max(bytes, 0))} بایت`;
  const units = [
    [1024 ** 3, 'گیگابایت'],
    [1024 ** 2, 'مگابایت'],
    [1024, 'کیلوبایت'],
  ] as const;
  const [size, unit] = units.find(([limit]) => bytes >= limit) ?? units[2];
  const value = bytes / size;
  return `${toFaDigits(value >= 10 ? Math.round(value) : Number(value.toFixed(1))).replace('.', '٫')} ${unit}`;
}

const cell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const text =
    typeof value === 'string'
      ? value
      : typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint'
        ? value.toString()
        : JSON.stringify(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** CSV با BOM تا Excel فارسی را درست بخواند؛ ستون‌ها اجتماع کلیدهای ردیف‌ها. */
export function toCsv(rows: readonly Record<string, unknown>[]): Buffer {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const lines = [columns.map(cell).join(','), ...rows.map((row) => columns.map((column) => cell(row[column])).join(','))];
  return Buffer.from(`${BOM}${lines.join('\r\n')}\r\n`, 'utf8');
}

/** نشان ترتیب بایت تا Excel و Notepad متن را UTF-8 بخوانند. */
export const BOM = String.fromCharCode(0xfeff);

/** نام امن ورودی ZIP. */
export const safeName = (name: string): string =>
  name
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\p{Cc}/gu, '_')
    .slice(0, 120) || 'file';
