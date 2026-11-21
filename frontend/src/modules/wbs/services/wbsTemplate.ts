import { downloadCsv, toCsv } from '@/shared/utils/csv';

/**
 * قالب خالی ورود WBS — ستون‌ها دقیقاً از `design/features/wbs.md` بخش ۶.۱.
 *
 * CSV سمت مرورگر (تصمیم 1405/08/27؛ ورود سرور CSV می‌پذیرد) و ردیف‌های نمونه **مثال مرجع**
 * (`00-overview.md` بخش ۶) هستند — همان ساختاری که محاسبات با آن آزموده می‌شود.
 */
const COLUMNS = [
  'کد',
  'عنوان',
  'وزن در والد',
  'واحد',
  'مقدار کل',
  'شروع برنامه‌ای',
  'پایان برنامه‌ای',
  'روش اندازه‌گیری',
  'موبایل سرپرست',
  'نقطهٔ عطف',
] as const;

type TemplateRow = Record<(typeof COLUMNS)[number], string>;

const empty = (): TemplateRow =>
  Object.fromEntries(COLUMNS.map((column) => [column, ''])) as TemplateRow;

const REFERENCE_ROWS: Array<Partial<TemplateRow>> = [
  { کد: '1.1', عنوان: 'فونداسیون', 'وزن در والد': '40' },
  {
    کد: '1.1.1',
    عنوان: 'خاکبرداری',
    'وزن در والد': '30',
    واحد: 'مترمکعب',
    'مقدار کل': '500',
    'روش اندازه‌گیری': 'مقداری',
  },
  {
    کد: '1.1.2',
    عنوان: 'بتن‌ریزی فونداسیون',
    'وزن در والد': '70',
    واحد: 'مترمکعب',
    'مقدار کل': '200',
    'روش اندازه‌گیری': 'مقداری',
  },
  { کد: '1.2', عنوان: 'اسکلت', 'وزن در والد': '60' },
  { کد: '1.2.1', عنوان: 'ستون‌ها', 'وزن در والد': '50', 'روش اندازه‌گیری': 'گام‌ها' },
  { کد: '1.2.2', عنوان: 'سقف', 'وزن در والد': '50', 'روش اندازه‌گیری': 'درصدی' },
];

export function downloadWbsTemplate(): void {
  const rows = REFERENCE_ROWS.map((row) => ({ ...empty(), ...row }));
  const csv = toCsv(
    rows,
    COLUMNS.map((column) => ({ header: column, value: (row: TemplateRow) => row[column] })),
  );
  downloadCsv('projeyar-wbs-template', csv);
}
