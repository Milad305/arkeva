import { fromJalali } from '../../../platform/time/jalali.js';
import type { MeasurementMethod } from '../../planning/index.js';
import { faNumber, faPercent, FULL, toUnits, type TreeNode } from './tree.js';

// ورود WBS از فایل (W39؛ wbs.md ۶.۱ و ۶.۲). فقط CSV UTF-8 (تصمیم کاربر 1405/08/23؛ همان W26): کاربر قالب را در
// Excel پر می‌کند و «CSV UTF-8» ذخیره می‌کند. تابع خالص؛ شناسه را فراخواننده می‌دهد.

export const IMPORT_MAX_BYTES = 20 * 1024 * 1024;
const PREVIEW_ROWS = 10;

const METHOD_BY_LABEL: Record<string, MeasurementMethod> = {
  مقداری: 'quantity',
  درصدی: 'percent',
  گام‌ها: 'steps',
  گام: 'steps',
  زمانی: 'time_based',
  quantity: 'quantity',
  percent: 'percent',
  steps: 'steps',
  time_based: 'time_based',
};

export interface ImportRowView {
  readonly row: number;
  readonly code: string;
  readonly title: string;
  readonly depth: number;
  readonly isParent: boolean;
  readonly weight: number | null;
  readonly weightWasEmpty: boolean;
  readonly status: 'ok' | 'warning' | 'error' | 'skipped';
}

export interface ImportIssue {
  readonly severity: 'ok' | 'warning' | 'error' | 'info';
  readonly message: string;
  readonly codes: string[];
}

export interface ParsedImport {
  readonly rows: ImportRowView[];
  readonly totalRows: number;
  readonly importCount: number;
  readonly issues: ImportIssue[];
  /** جنگل وارد‌شدنی؛ شناسه‌ها خالی، فراخواننده می‌دهد. */
  readonly forest: TreeNode[];
}

/** خطای خود فایل (نه ردیف): پیام کامل برای کاربر. */
export class ImportFileError extends Error {}

export const toEn = (value: string): string =>
  value.replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));

export function parseCsv(text: string): string[][] {
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index] as string;
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
  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((value) => value.trim()));
}

/** شمسی `1404/01/10` یا میلادی `2025-03-30` ← میلادی ISO؛ `undefined` خالی، `null` نامعتبر. */
export function parseDate(text: string): string | null | undefined {
  const value = toEn(text).trim();
  if (!value) return undefined;
  const match = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (year < 1700) return fromJalali(year, month, day);
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const date = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(date.getTime()) || date.getUTCDate() !== day ? null : iso;
}

interface ImportRecord {
  readonly row: number;
  readonly code: string;
  readonly title: string;
  readonly weight: number | null;
  readonly node: TreeNode;
  status: ImportRowView['status'];
  parent: string | null;
  error: string | null;
  hasMobile: boolean;
}

export function parseWbsCsv(text: string, mode: 'replace' | 'append'): ParsedImport {
  const table = parseCsv(text);
  if (table.length < 2) throw new ImportFileError('فایل ردیفی ندارد. قالب را دانلود کنید و دست‌کم یک ردیف بنویسید.');
  const header = (table[0] as string[]).map((cell) => cell.trim());
  const col = (name: string) => header.findIndex((cell) => cell.startsWith(name));
  const columns = {
    code: col('کد'),
    title: col('عنوان'),
    weight: col('وزن'),
    unit: col('واحد'),
    qty: col('مقدار'),
    start: col('شروع'),
    finish: col('پایان'),
    method: col('روش'),
    mobile: col('موبایل'),
    milestone: col('نقطهٔ عطف'),
  };
  if (columns.code < 0 || columns.title < 0) throw new ImportFileError('ستون «کد» یا «عنوان» در سرستون فایل نیست. از «دانلود قالب» استفاده کنید.');

  const records: ImportRecord[] = [];
  const byCode = new Map<string, ImportRecord>();
  const duplicates: string[] = [];
  const withMobile: string[] = [];

  table.slice(1).forEach((cells, index) => {
    const get = (column: number) => (column >= 0 ? (cells[column] ?? '').trim() : '');
    const code = toEn(get(columns.code));
    const title = get(columns.title);
    const weightText = toEn(get(columns.weight)).replace('٫', '.');
    const record: ImportRecord = {
      row: index + 2,
      code,
      title,
      weight: weightText === '' ? null : Number(weightText),
      node: {
        id: '',
        code,
        codeMode: mode === 'replace' ? 'custom' : 'auto',
        title,
        isMilestone: false,
        weight: 0,
        start: null,
        finish: null,
        unit: null,
        qty: null,
        method: null,
        steps: null,
        isCritical: null,
        totalFloatDays: null,
        children: [],
      },
      status: 'ok',
      parent: code.includes('.') ? code.slice(0, code.lastIndexOf('.')) : null,
      error: null,
      hasMobile: false,
    };
    if (!code || !/^\d+(\.\d+)*$/.test(code)) record.error = `ردیف ${faNumber(record.row)}: کد «${code || '—'}» نامعتبر است.`;
    else if (!title) record.error = `ردیف ${faNumber(record.row)} عنوان ندارد.`;
    else if (record.weight !== null && !(record.weight >= 0 && record.weight <= 100)) record.error = `وزن ردیف ${code} باید بین ۰ و ۱۰۰ باشد.`;
    if (byCode.has(code) && !record.error) {
      duplicates.push(code);
      record.status = 'skipped';
      records.push(record);
      return;
    }

    const unit = get(columns.unit);
    const qty = Number(toEn(get(columns.qty)).replace(/[,٬]/g, '').replace('٫', '.')) || null;
    const start = parseDate(get(columns.start));
    const finish = parseDate(get(columns.finish));
    const milestone = /^(بله|yes|1|true)$/i.test(get(columns.milestone));
    if (!record.error && (start === null || finish === null)) {
      record.error = `تاریخ ردیف ${code} نامعتبر است؛ شمسی مثل 1404/01/10 یا میلادی مثل 2025-03-30 بنویسید.`;
    } else if (!record.error && start && finish && finish < start) record.error = `پایان ردیف ${code} پیش از شروعش است.`;
    const methodText = get(columns.method);
    const method = methodText ? METHOD_BY_LABEL[methodText] : undefined;
    if (!record.error && methodText && !method) record.error = `روش «${methodText}» در ردیف ${code} شناخته نشد؛ مقداری، درصدی، گام‌ها یا زمانی.`;

    Object.assign(record.node, {
      unit: unit || null,
      qty,
      start: start ?? null,
      finish: milestone ? (start ?? null) : (finish ?? null),
      isMilestone: milestone,
      method: milestone ? 'percent' : (method ?? (unit && qty ? 'quantity' : 'percent')),
    });
    record.hasMobile = toEn(get(columns.mobile)).replace(/\D/g, '') !== '';
    if (record.hasMobile) withMobile.push(code);
    records.push(record);
    if (!record.error) byCode.set(code, record);
  });

  // کدهای `1.x` زیر ریشهٔ ضمنی پروژه‌اند؛ اگر فایل ردیف «1» داشته باشد، همان یک آیتم سطح اول است
  if (!byCode.has('1')) {
    for (const record of records) if (record.parent === '1') record.parent = null;
  }
  const accepted = records.filter((record) => record.status !== 'skipped');
  const excluded = new Set<string>();
  const rejected = (record: ImportRecord): boolean => {
    if (record.error || excluded.has(record.code)) return true;
    if (record.parent === null) return false;
    const parent = byCode.get(record.parent);
    if (!parent) {
      record.error = `والد «${record.parent}» برای ردیف ${record.code} در فایل نیست؛ این ردیف و زیرشاخه‌اش وارد نمی‌شوند.`;
      return true;
    }
    return rejected(parent);
  };
  for (const record of accepted) {
    if (rejected(record)) {
      record.status = 'error';
      excluded.add(record.code);
    }
  }
  const good = accepted.filter((record) => record.status !== 'error');

  const forest: TreeNode[] = [];
  for (const record of good) {
    const parent = record.parent ? byCode.get(record.parent)?.node : undefined;
    (parent ? parent.children : forest).push(record.node);
  }
  // والد فایل داده‌های خاص برگ ندارد
  for (const record of good) {
    if (record.node.children.length > 0) Object.assign(record.node, { unit: null, qty: null, method: null, start: null, finish: null, isMilestone: false });
  }

  // وزن خالی: باقی‌ماندهٔ ۱۰۰ مساوی بین بی‌وزن‌ها؛ جمع ≠ ۱۰۰ هشدار (wbs.md ۶.۲)
  const emptyWeights: string[] = [];
  const badGroups: ImportIssue[] = [];
  const recordOf = new Map(good.map((record) => [record.node, record]));
  const balance = (siblings: TreeNode[], parentTitle: string | null, level: number) => {
    const given = siblings.map((node) => (recordOf.get(node) as ImportRecord).weight);
    const blanks = given.filter((weight) => weight === null).length;
    const sumGiven = given.reduce<number>((sum, weight) => sum + toUnits(weight ?? 0), 0);
    const share = blanks > 0 ? Math.max(0, Math.round((FULL - sumGiven) / blanks)) : 0;
    siblings.forEach((node, index) => {
      const record = recordOf.get(node) as ImportRecord;
      if (given[index] === null) {
        emptyWeights.push(record.code);
        node.weight = share;
        record.status = 'warning';
      } else node.weight = toUnits(given[index] as number);
    });
    const sum = siblings.reduce((total, node) => total + node.weight, 0);
    if (sum !== FULL && siblings.length > 0) {
      badGroups.push({
        severity: 'warning',
        message: `مجموع وزن سطح ${faNumber(level)}${parentTitle ? ` زیر «${parentTitle}»` : ''} برابر ${faPercent(sum)}٪ است و باید بازبینی شود؛ نسخه تا اصلاح اعمال نمی‌شود.`,
        codes: siblings.map((node) => node.code),
      });
    }
    for (const node of siblings) if (node.children.length > 0) balance(node.children, node.title, level + 1);
  };
  balance(forest, null, 1);

  const issues: ImportIssue[] = [{ severity: 'ok', message: `${faNumber(good.length)} آیتم با موفقیت شناسایی شد`, codes: [] }];
  if (emptyWeights.length > 0) {
    issues.push({
      severity: 'warning',
      message: `${faNumber(emptyWeights.length)} آیتم وزن خالی دارند؛ باقی‌ماندهٔ ۱۰۰ به‌طور مساوی تقسیم می‌شود`,
      codes: emptyWeights,
    });
  }
  issues.push(...badGroups);
  for (const code of duplicates) issues.push({ severity: 'warning', message: `کد تکراری ${code}؛ ردیف دوم نادیده گرفته می‌شود`, codes: [code] });
  for (const record of accepted) if (record.status === 'error') issues.push({ severity: 'error', message: record.error as string, codes: [record.code] });
  // تخصیص سرپرست مال F07 است (برش تیم و تخصیص)؛ ستون موبایل فعلاً فقط گزارش می‌شود
  if (withMobile.length > 0) {
    issues.push({
      severity: 'info',
      message: `موبایل سرپرست ${faNumber(withMobile.length)} ردیف از فایل تخصیص داده نمی‌شود؛ پس از ورود از «تخصیص» بدهید.`,
      codes: withMobile,
    });
  }

  const rows: ImportRowView[] = records.slice(0, PREVIEW_ROWS).map((record) => ({
    row: record.row,
    code: record.code,
    title: record.title,
    depth: record.code.split('.').length - 1,
    isParent: record.node.children.length > 0,
    weight: record.status === 'skipped' || record.status === 'error' ? record.weight : record.node.weight / 10_000,
    weightWasEmpty: record.weight === null,
    status: record.status,
  }));
  return { rows, totalRows: records.length, importCount: good.length, issues, forest };
}
