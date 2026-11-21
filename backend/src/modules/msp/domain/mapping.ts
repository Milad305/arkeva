import { toFaDigits } from '../../../platform/http/fa.js';
import { formatJalali } from '../../../platform/time/jalali.js';
import { leavesOf } from './checks.js';
import type { MspFile } from './mspdi.js';

// نگاشت ستون‌های MSP به فیلدهای پروژه‌یار (msp-integration.md ۷.۱ گام ۲؛ `02` ۱۱ FieldMappingTemplate).

export const TARGETS = [
  { value: 'title', label: 'عنوان آیتم WBS', hint: 'متن نمایشی هر آیتم' },
  { value: 'code', label: 'کد WBS', hint: 'کد نمایشی ساختار' },
  { value: 'outline', label: 'سطح درخت', hint: 'جای آیتم در سلسله‌مراتب' },
  { value: 'start', label: 'شروع برنامه‌ای', hint: 'مالک: MSP' },
  { value: 'finish', label: 'پایان برنامه‌ای', hint: 'مالک: MSP' },
  { value: 'baseline', label: 'برنامهٔ مبنا', hint: 'Baseline 0 فایل' },
  { value: 'cost', label: 'بودجهٔ CBS', hint: 'برای ساخت اقلام هزینه' },
  { value: 'quantity', label: 'مقدار کل', hint: 'روش اندازه‌گیری «مقداری»' },
  { value: 'unit', label: 'واحد مقدار', hint: 'مترمربع، تن، …' },
  { value: 'supervisor', label: 'سرپرست کارگاه', hint: 'از Resource Names' },
  { value: 'predecessors', label: 'وابستگی‌ها', hint: 'فقط نمایش؛ در برنامه ذخیره نمی‌شود' },
  { value: 'note', label: 'توضیح آیتم', hint: 'Notes فایل' },
  { value: 'skip', label: 'وارد نشود', hint: 'این ستون نادیده گرفته می‌شود' },
] as const;

export type MappingTarget = (typeof TARGETS)[number]['value'];
export const TARGET_VALUES: readonly string[] = TARGETS.map((target) => target.value);

export interface MappingRow {
  id: string;
  mspField: string;
  mspHint: string;
  target: string;
  sample: string;
  status: 'auto' | 'manual' | 'warning' | 'skipped';
}

/** نگاشت ذخیره‌شدهٔ الگو: شناسهٔ ردیف ← فیلد پروژه‌یار. */
export type TemplateMappings = { mspField: string; projeyarField: string }[];

export function buildMapping(file: MspFile, template: TemplateMappings | null): MappingRow[] {
  const leaves = leavesOf(file);
  const sample = leaves[0];
  const row = (id: string, mspField: string, mspHint: string, target: string, value: string, status: MappingRow['status'] = 'auto'): MappingRow => ({
    id,
    mspField,
    mspHint,
    target,
    sample: value,
    status,
  });
  const date = (iso: string | undefined) => (iso ? `${iso} ← ${toFaDigits(formatJalali(iso))}` : '—');
  const rows: MappingRow[] = [
    row('name', 'Name', 'عنوان فعالیت', 'title', sample?.name ?? '—'),
    row('wbs', 'WBS', 'کد ساختار', 'code', sample?.wbs ?? '—'),
    row('outline', 'Outline Level', 'سطح در درخت', 'outline', toFaDigits(sample?.outlineLevel ?? 1)),
    row('start', 'Start', 'تاریخ میلادی', 'start', date(sample?.start)),
    row('finish', 'Finish', 'تاریخ میلادی', 'finish', date(sample?.finish)),
  ];
  if (leaves.some((task) => task.cost > 0)) rows.push(row('cost', 'Cost', 'هزینهٔ کل فعالیت', 'cost', toFaDigits(sample?.cost ?? 0)));
  if (leaves.some((task) => task.quantity !== null)) {
    rows.push(row('qty', 'Number1 · Qty', 'فیلد سفارشی', 'quantity', toFaDigits(sample?.quantity ?? 0)));
    rows.push(row('unit', 'Text1 · Unit', 'فیلد سفارشی', 'unit', sample?.unit ?? '—', 'manual'));
  }
  if (file.resources.length > 0)
    rows.push(row('resource', 'Resource Names', 'نام منابع', 'supervisor', `${toFaDigits(file.resources.length)} نام متفاوت`, 'warning'));
  rows.push(
    row('percent', '% Complete', 'درصد پیشرفت فایل', 'skip', `${toFaDigits(leaves.filter((task) => task.percentComplete > 0).length)} فعالیت`, 'skipped'),
  );
  rows.push(row('pred', 'Predecessors', 'پیش‌نیازها', 'predecessors', 'فقط نمایش'));
  if (leaves.some((task) => task.notes)) rows.push(row('notes', 'Notes', 'یادداشت فعالیت', 'note', 'متن آزاد'));
  // الگوی سازمان نگاشت ستون‌های هم‌نام را از پیش تعیین می‌کند
  if (template) {
    for (const entry of rows) {
      const saved = template.find((mapping) => mapping.mspField === entry.mspField);
      if (saved && TARGET_VALUES.includes(saved.projeyarField) && saved.projeyarField !== entry.target) {
        entry.target = saved.projeyarField;
        entry.status = saved.projeyarField === 'skip' ? 'skipped' : 'manual';
      }
    }
  }
  return rows;
}

export const mappedTargets = (rows: readonly MappingRow[]) => new Set(rows.filter((row) => row.target !== 'skip').map((row) => row.target));
