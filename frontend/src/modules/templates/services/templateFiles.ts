import { downloadCsv, toCsv } from '@/shared/utils/csv';

/**
 * قالب خالی ورود **قالب** (`features/templates.md` ۵.۱): ستون‌های ورود WBS
 * (`wbs.md` ۶.۱) به‌علاوهٔ «شروع نسبی»، «مدت نسبی»، «اقلام CBS» و «ضریب تقسیم»،
 * و یک برگهٔ CBS با «سهم بودجه».
 *
 * سمت مرورگر دو فایل CSV جدا دانلود می‌شود، چون CSV برگه ندارد (تصمیم 1405/08/27؛ `[پیش‌فرض فنی]`).
 * ردیف‌های نمونه **مثال مرجع** (`00-overview.md` ۶) است: با بودجهٔ CBS ۱٬۰۰۰ میلیون،
 * BAC برگ‌ها ۱۰۰/۳۰۰/۳۰۰/۳۰۰ می‌شود (AC-TP-01).
 */

const WBS_COLUMNS = [
  'کد',
  'عنوان',
  'وزن در والد',
  'واحد',
  'روش اندازه‌گیری',
  'نقطهٔ عطف',
  'شروع نسبی',
  'مدت نسبی',
  'اقلام CBS',
  'ضریب تقسیم',
] as const;

const CBS_COLUMNS = ['کد', 'عنوان', 'نوع هزینه', 'واحد', 'سهم بودجه'] as const;

type WbsRow = Record<(typeof WBS_COLUMNS)[number], string>;
type CbsRow = Record<(typeof CBS_COLUMNS)[number], string>;

const emptyWbs = (): WbsRow =>
  Object.fromEntries(WBS_COLUMNS.map((column) => [column, ''])) as WbsRow;
const emptyCbs = (): CbsRow =>
  Object.fromEntries(CBS_COLUMNS.map((column) => [column, ''])) as CbsRow;

const WBS_ROWS: Array<Partial<WbsRow>> = [
  { کد: '1.1', عنوان: 'فونداسیون', 'وزن در والد': '40' },
  {
    کد: '1.1.1',
    عنوان: 'خاکبرداری',
    'وزن در والد': '30',
    واحد: 'مترمکعب',
    'روش اندازه‌گیری': 'مقداری',
    'شروع نسبی': '0',
    'مدت نسبی': '26',
    'اقلام CBS': 'C1',
    'ضریب تقسیم': '1',
  },
  {
    کد: '1.1.2',
    عنوان: 'بتن‌ریزی فونداسیون',
    'وزن در والد': '70',
    واحد: 'مترمکعب',
    'روش اندازه‌گیری': 'مقداری',
    'شروع نسبی': '26',
    'مدت نسبی': '39',
    'اقلام CBS': 'C2,C3',
    'ضریب تقسیم': '4,1',
  },
  { کد: '1.2', عنوان: 'اسکلت', 'وزن در والد': '60' },
  {
    کد: '1.2.1',
    عنوان: 'ستون‌ها',
    'وزن در والد': '50',
    'روش اندازه‌گیری': 'درصدی',
    'شروع نسبی': '52',
    'مدت نسبی': '52',
    'اقلام CBS': 'C2,C3,C4',
    'ضریب تقسیم': '1,1,3',
  },
  {
    کد: '1.2.2',
    عنوان: 'سقف',
    'وزن در والد': '50',
    'روش اندازه‌گیری': 'درصدی',
    'شروع نسبی': '104',
    'مدت نسبی': '52',
    'اقلام CBS': 'C2,C3,C4',
    'ضریب تقسیم': '3,1,1',
  },
];

const CBS_ROWS: Array<Partial<CbsRow>> = [
  { کد: 'C1', عنوان: 'خاکبرداری (پیمانکار جزء)', 'نوع هزینه': 'پیمانکار جزء', 'سهم بودجه': '10' },
  { کد: 'C2', عنوان: 'بتن آماده', 'نوع هزینه': 'مصالح', واحد: 'مترمکعب', 'سهم بودجه': '40' },
  { کد: 'C3', عنوان: 'آرماتور', 'نوع هزینه': 'مصالح', واحد: 'تن', 'سهم بودجه': '30' },
  { کد: 'C4', عنوان: 'نیروی انسانی اسکلت', 'نوع هزینه': 'نیروی انسانی', 'سهم بودجه': '20' },
];

export function downloadTemplateFiles(): void {
  downloadCsv(
    'projeyar-template-wbs',
    toCsv(
      WBS_ROWS.map((row) => ({ ...emptyWbs(), ...row })),
      WBS_COLUMNS.map((column) => ({ header: column, value: (row: WbsRow) => row[column] })),
    ),
  );
  downloadCsv(
    'projeyar-template-cbs',
    toCsv(
      CBS_ROWS.map((row) => ({ ...emptyCbs(), ...row })),
      CBS_COLUMNS.map((column) => ({ header: column, value: (row: CbsRow) => row[column] })),
    ),
  );
}
