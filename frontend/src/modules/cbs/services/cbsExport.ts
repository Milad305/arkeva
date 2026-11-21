import { downloadCsv, toCsv, type CsvColumn } from '@/shared/utils/csv';
import { COST_TYPE_LABELS } from '@/shared/types/tone';
import type { CbsItemDto } from '../types';
import { PRICING_LABEL } from './cbsView';

/**
 * خروجی دفتر CBS (cbs.md ۱۰) به CSV سمت مرورگر (تصمیم 1405/08/27): ستون‌های قالب ورود به‌علاوهٔ ستون‌های فقط‌خواندنی مصرف و
 * پیش‌بینی. مبلغ را سرور برای کاربر بی `cbs.view_amounts` حذف کرده است (AC-CBS-06).
 */
export function exportCbsExcel(
  project: { code: string },
  items: readonly CbsItemDto[],
  options: { includeAmounts: boolean },
): void {
  const fileName = `cbs-${project.code}`;

  const percent = (value: number | null | undefined) =>
    value == null ? '' : String(Math.round(value * 100) / 100);
  const columns: Array<CsvColumn<CbsItemDto>> = [
    { header: 'کد', value: (item) => item.code },
    { header: 'عنوان', value: (item) => item.title },
    { header: 'نوع هزینه', value: (item) => COST_TYPE_LABELS[item.costType] },
    {
      header: 'شیوهٔ قیمت',
      value: (item) => (item.pricingMode ? PRICING_LABEL[item.pricingMode] : ''),
    },
    { header: 'واحد', value: (item) => item.unit },
    { header: 'مقدار برآورد', value: (item) => item.estimatedQuantity },
  ];
  if (options.includeAmounts) {
    columns.push(
      { header: 'نرخ واحد ریال', value: (item) => item.unitRate },
      { header: 'مبلغ مقطوع ریال', value: (item) => item.lumpSumAmount },
      { header: 'بودجه ریال (فقط‌خواندنی)', value: (item) => item.budget },
      { header: 'هزینهٔ واقعی ریال (فقط‌خواندنی)', value: (item) => item.progress?.ac },
      { header: 'پیش‌بینی ریال (فقط‌خواندنی)', value: (item) => item.progress?.eac },
    );
  }
  columns.push(
    { header: 'درصد مصرف (فقط‌خواندنی)', value: (item) => percent(item.progress?.consumedPercent) },
    { header: 'شمار اتصال WBS (فقط‌خواندنی)', value: (item) => item.linkCount },
    { header: 'تأمین‌کننده', value: (item) => item.supplierNote },
  );
  downloadCsv(fileName, toCsv(items, columns));
}

/** قالب خالی ورود CBS (cbs.md ۱۰) با دو ردیف نمونه — همان سرستون‌های خروجی. */
export function downloadCbsTemplate(): void {
  const header = [
    'کد',
    'عنوان',
    'نوع هزینه',
    'شیوهٔ قیمت',
    'واحد',
    'مقدار برآورد',
    'نرخ واحد ریال',
    'مبلغ مقطوع ریال',
    'تأمین‌کننده',
  ];
  const rows = [
    ['C.7', 'تجهیزات ایمنی', 'سایر', '', '', '', '', '', ''],
    [
      'C.7.1',
      'کلاه و کفش ایمنی',
      'سایر',
      'نرخ واحد',
      'عدد',
      '120',
      '4500000',
      '',
      'تأمین ایمنی پارس',
    ],
    ['C.7.2', 'حصارکشی موقت', 'سایر', 'مقطوع', '', '', '', '850000000', ''],
  ];
  downloadCsv('cbs-template', [header, ...rows].map((cells) => cells.join(',')).join('\r\n'));
}
