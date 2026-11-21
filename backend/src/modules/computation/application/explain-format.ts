import { toFaDigits } from '../../../platform/http/fa.js';
import { formatJalali } from '../../../platform/time/jalali.js';

// قالب‌بندی متن «این عدد از کجا آمد؟» (G9؛ charts.md ۴). متن را سرور می‌سازد؛ عددها با ارقام فارسی (پیش‌فرض نمایش، `CLAUDE.md` ۵)،
// مبالغ به میلیون ریال `[پیش‌فرض فنی]`، نسبت‌ها چهار رقم مثل مثال مرجع.

export const EXPLAIN_METRICS = [
  'actual_percent',
  'planned_percent',
  'deviation',
  'pv',
  'ev',
  'ac',
  'cpi',
  'spi',
  'eac',
  'forecast_finish',
  'cbs_consumption',
] as const;
export type ExplainMetric = (typeof EXPLAIN_METRICS)[number];

/** معیارهایی که مبلغ‌اند — بی `cbs.view_amounts` مقدار و فرمول عددی ندارند (D11). */
export const AMOUNT_METRICS: ReadonlySet<ExplainMetric> = new Set(['pv', 'ev', 'ac', 'eac']);

export const DEFINITIONS: Record<ExplainMetric, { readonly title: string; readonly definition: string }> = {
  actual_percent: {
    title: 'پیشرفت فیزیکی واقعی',
    definition: 'جمع وزنی پیشرفت تأییدشدهٔ برگ‌ها با وزن هر آیتم در پروژه (D04). اعداد در انتظار تأیید حساب نمی‌شوند.',
  },
  planned_percent: {
    title: 'پیشرفت برنامه‌ای',
    definition: 'جایی که طبق نسخهٔ مرجع PV باید تا تاریخ داده رسیده باشیم؛ درون هر برگ خطی بر روزهای کاری توزیع می‌شود (OD-02).',
  },
  deviation: { title: 'انحراف از برنامه', definition: 'پیشرفت واقعی منهای برنامه‌ای، به واحد درصد. منفی یعنی عقب‌تر از برنامه.' },
  pv: { title: 'ارزش برنامه‌ای (PV)', definition: 'ارزش بودجه‌ای کاری که باید تا تاریخ داده انجام می‌شد.' },
  ev: { title: 'ارزش کسب‌شده (EV)', definition: 'ارزش بودجه‌ای کاری که واقعاً انجام و تأیید شد.' },
  ac: { title: 'هزینهٔ واقعی (AC)', definition: 'جمع ردیف‌های قطعی دفتر هزینه تا تاریخ شاخص‌های هزینه.' },
  cpi: { title: 'شاخص عملکرد هزینه (CPI)', definition: 'به ازای هر ریال خرج‌شده چند ریال کار کسب شده است. کمتر از ۱ یعنی بدتر از بودجه.' },
  spi: { title: 'شاخص عملکرد زمان (SPI)', definition: 'نسبت کار کسب‌شده به کار برنامه‌ای. کمتر از ۱ یعنی کندتر از برنامه.' },
  eac: { title: 'برآورد در اتمام (EAC)', definition: 'هزینهٔ کل پیش‌بینی‌شده با روش انتخاب‌شدهٔ پروژه.' },
  forecast_finish: {
    title: 'پیش‌بینی پایان',
    definition: 'روش Earned Schedule برای پروژه و نرخ ۱۴ روز اخیر برای برگ (OD-07). وابستگی‌ها و مسیر بحرانی در نظر گرفته نمی‌شود (D05).',
  },
  cbs_consumption: { title: 'بودجهٔ مصرف‌شده', definition: 'هزینهٔ واقعی تقسیم بر بودجه.' },
};

const group = (digits: string): string => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** عدد با حداکثر `decimals` رقم اعشار، صفرهای انتها حذف، ارقام فارسی. */
export function num(value: number, decimals = 2): string {
  const fixed = Math.abs(value)
    .toFixed(decimals)
    .replace(/\.?0+$/, '');
  const [whole = '0', fraction] = fixed.split('.');
  const text = `${value < 0 && Number(fixed) !== 0 ? '−' : ''}${group(whole)}${fraction ? `.${fraction}` : ''}`;
  return toFaDigits(text.replace(/,/g, '٬').replace('.', '٫'));
}

export const pct = (value: number): string => `${num(value, 2)}٪`;
export const ratio = (value: number | null): string => (value === null ? '—' : value.toFixed(4));
/** مبلغ ریال (رشتهٔ bigint) به میلیون ریال. */
export const million = (rials: string | bigint | number): string => num(Number(rials) / 1_000_000, 4);
export const amountText = (rials: string | bigint): string => `${million(rials)} میلیون ریال`;
export const jalali = (date: string | null): string => (date ? toFaDigits(formatJalali(date)) : '—');

/** «۱۰۰ × ۱ + ۳۰۰ × ۰٫۹ = ۴۹۰» — تا ۶ جمله کامل، بیشتر خلاصه با Σ. */
export function sumFormula(terms: readonly string[], total: string, summary: string): string {
  return terms.length > 0 && terms.length <= 6 ? `${terms.join(' + ')} = ${total}` : `${summary} = ${total}`;
}

/** هشدار تاریخ شاخص‌های هزینه (OD-19؛ charts.md ۴ بند ۵) — همیشه برای عددهای هزینه. */
export const costNote = (date: string | null): string | null => (date ? `شاخص‌های هزینه تا ${jalali(date)} (تاریخ کامل بودن هزینه‌ها) محاسبه شده‌اند.` : null);
