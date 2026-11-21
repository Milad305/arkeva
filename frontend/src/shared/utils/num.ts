// قالب‌بندی عدد — تنها جایی که ارقام فارسی تولید می‌شود.
//
// قاعدهٔ AGENTS.md بخش ۳: داده و منطق محاسباتی با ارقام انگلیسی است،
// نمایش با ارقام فارسی. هیچ کامپوننتی regex تبدیل رقم ننویسد؛ از اینجا import کند.
//
// نویسه‌های مورد استفاده در بوم:
//   ٬ U+066C جداکنندهٔ هزارگان    ٫ U+066B ممیز
//   ٪ U+066A درصد                 − U+2212 علامت منها (نه خط تیرهٔ ASCII)

import { getDisplayPrefs } from './displayPrefs';

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const;

const latin = () => getDisplayPrefs().digits === 'latin';
/** جداکننده‌ها با ترجیح ارقام کاربر (W32): فارسی «٬ ٫ ٪»، لاتین «, . %». */
const thousandsSep = () => (latin() ? ',' : '٬');
const decimalSep = () => (latin() ? '.' : '٫');
const percentSign = () => (latin() ? '%' : '٪');
const MINUS_SIGN = '−';

/**
 * ارقام لاتین → فارسی، و خط تیره → علامت منهای فارسی.
 * اگر کاربر در W32 «لاتین 123» را برگزیده باشد، ارقام لاتین می‌مانند (C03، اصلاح 1405/08/19).
 */
export function toFaDigits(value: string | number): string {
  const text = String(value);
  if (latin()) return text;
  return text.replace(/\d/g, (d) => FA_DIGITS[Number(d)]!).replace(/-/g, MINUS_SIGN);
}

/**
 * ارقام فارسی/عربی → لاتین، و ممیز فارسی → نقطه.
 * برای نرمال‌سازی ورودی فرم قبل از اعتبارسنجی و ارسال به API.
 */
export function toEnDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[٫,]/g, '.')
    .replace(/[٬‌\s]/g, '')
    .replace(/[−–—]/g, '-');
}

/** عدد با جداکنندهٔ هزارگان فارسی: ۱۹۰۵۰ → «۱۹٬۰۵۰» */
export function faNum(value: number, fractionDigits?: number): string {
  if (!Number.isFinite(value)) return '—';

  const negative = value < 0;
  const abs = Math.abs(value);
  const fixed = fractionDigits !== undefined ? abs.toFixed(fractionDigits) : String(abs);
  const [intPart = '0', fracPart] = fixed.split('.');

  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep());
  const joined = fracPart ? `${grouped}.${fracPart}` : grouped;

  return (negative ? (latin() ? '-' : MINUS_SIGN) : '') + toFaDigits(joined).replace(/\./g, decimalSep());
}

/** درصد: ۶۵ → «۶۵٪» */
export function formatPercent(value: number, fractionDigits = 0): string {
  if (!Number.isFinite(value)) return '—';
  return faNum(value, fractionDigits) + percentSign();
}

/** درصد با حداکثر یک رقم اعشار و بدون صفر اضافه: ۵۵ → «۵۵٪»، ۴۹٫۲ → «۴۹٫۲٪». */
export function formatPercentAuto(value: number, maxFraction = 1): string {
  if (!Number.isFinite(value)) return '—';
  const factor = 10 ** maxFraction;
  const rounded = Math.round(value * factor) / factor;
  const digits = rounded % 1 === 0 ? 0 : maxFraction;
  return faNum(rounded, digits) + percentSign();
}

/** انحراف با علامت: ۳ → «+۳٪» ، ‎-۱۵ → «−۱۵٪» ، ۰ → «۰٪» */
export function formatDelta(value: number, fractionDigits = 0): string {
  if (!Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return sign + formatPercent(value, fractionDigits);
}

/** نسبت بی‌واحد مثل CPI/SPI: ۰٫۹۲ */
export function formatRatio(value: number, fractionDigits = 2): string {
  return faNum(value, fractionDigits);
}

const BILLION = 1_000_000_000;
const MILLION = 1_000_000;

/**
 * ورودی مبلغ.
 * C02: مبالغ `bigint` ریال‌اند و در JSON به‌صورت **رشته** می‌آیند.
 * اینجا فقط برای نمایش به `number` تبدیل می‌شوند — هیچ محاسبهٔ کسب‌وکاری
 * روی این مقدار انجام نمی‌شود (D07).
 */
export type RialInput = string | number | bigint;

function toRialNumber(amount: RialInput): number {
  if (typeof amount === 'number') return amount;
  if (typeof amount === 'bigint') return Number(amount);
  const parsed = Number(amount);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

/**
 * مبلغ ریالی. ورودی همیشه ریال کامل است (C02)؛
 * نمایش به مقیاس خوانا جمع می‌شود.
 *   "850000000000" → «۸۵۰ میلیارد ریال»
 */
export function formatRial(amount: RialInput, options?: { unit?: boolean }): string {
  const amountInRial = toRialNumber(amount);
  if (!Number.isFinite(amountInRial)) return '—';
  const withUnit = options?.unit !== false;

  const abs = Math.abs(amountInRial);
  // واحد نمایش ترجیحی کاربر (W32)؛ «خودکار» از بزرگی مبلغ
  const scale = getDisplayPrefs().amountScale;
  if (scale === 'billion' || (scale === 'auto' && abs >= BILLION)) {
    const billions = amountInRial / BILLION;
    const value = faNum(billions, billions % 1 === 0 ? 0 : Math.abs(billions) < 1 ? 2 : 1);
    return withUnit ? `${value} میلیارد ریال` : value;
  }
  if (scale === 'million' || (scale === 'auto' && abs >= MILLION)) {
    const millions = amountInRial / MILLION;
    const value = faNum(millions, millions % 1 === 0 ? 0 : Math.abs(millions) < 1 ? 2 : 1);
    return withUnit ? `${value} میلیون ریال` : value;
  }
  const value = faNum(amountInRial);
  return withUnit ? `${value} ریال` : value;
}

/** مبلغ به دو تکهٔ عدد و واحد برای کارت KPI: «۵۲۰» + «میلیون ریال». */
export function formatRialParts(amount: RialInput): { value: string; unit: string } {
  const full = formatRial(amount);
  const value = formatRial(amount, { unit: false });
  return { value, unit: full.slice(value.length).trim() };
}

/** فقط عدد میلیارد، بدون واحد — برای ستون‌هایی که واحد را در سرستون دارند. */
export function toBillions(amount: RialInput, fractionDigits = 1): string {
  const amountInRial = toRialNumber(amount);
  if (!Number.isFinite(amountInRial)) return '—';
  const billions = amountInRial / BILLION;
  return faNum(billions, billions % 1 === 0 ? 0 : fractionDigits);
}

/** مقدار و واحد اندازه‌گیری WBS: «۱٬۴۵۰ مترمربع» */
export function formatQuantity(value: number | null | undefined, unit?: string | null): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return unit ? `${faNum(value)} ${unit}` : faNum(value);
}

/** حجم فایل: ۱۳۰۰۰۰۰ → «۱٫۲ مگابایت» */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${faNum(bytes)} بایت`;
  if (bytes < 1024 ** 2) return `${faNum(bytes / 1024, 0)} کیلوبایت`;
  return `${faNum(bytes / 1024 ** 2, 1)} مگابایت`;
}

/** درصد را به بازهٔ ۰ تا ۱۰۰ محدود می‌کند — برای عرض نوار پیشرفت. */
export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}
