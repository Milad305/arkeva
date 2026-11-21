import { toJalaali, toGregorian } from 'jalaali-js';

// تبدیل تاریخ‌ها — مطابق AGENTS.md بخش ۳:
// در DB به‌صورت Gregorian (ISO/DATE) ذخیره، تبدیل به شمسی فقط در لایه نمایش.

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

// نام ماه‌های شمسی
export const JALALI_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

// تبدیل ارقام انگلیسی به فارسی
function toFaDigits(s: string | number): string {
  return String(s).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]!);
}

// تبدیل نقطه اعشار لاتین به ممیز فارسی (٫) برای اعداد اعشاری نمایشی.
function toFaDecimal(s: string): string {
  return s.replace(/\./g, '٫');
}

// تجزیهٔ ورودی به یک آبجکت Date معتبر.
function toDate(input: string | Date): Date {
  if (input instanceof Date) return input;
  // پذیرش YYYY-MM-DD یا ISO کامل.
  return new Date(input);
}

// استخراج {jy, jm, jd} از ورودی.
function toJalaaliParts(input: string | Date): { jy: number; jm: number; jd: number } {
  const date = toDate(input);
  if (Number.isNaN(date.getTime())) {
    // fallback کوتی: امروز
    return toJalaali(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      new Date().getDate(),
    );
  }
  return toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** فرمت کامل شمسی: ۱۴۰۳/۰۵/۰۱ */
export function formatJalaliDate(isoDate: string | Date): string {
  const { jy, jm, jd } = toJalaaliParts(isoDate);
  const mm = String(jm).padStart(2, '0');
  const dd = String(jd).padStart(2, '0');
  return toFaDigits(`${jy}/${mm}/${dd}`);
}

/** فرمت شمسی با نام ماه: ۱ مرداد ۱۴۰۳ */
export function formatJalaliDateLong(isoDate: string | Date): string {
  const { jy, jm, jd } = toJalaaliParts(isoDate);
  return `${toFaDigits(jd)} ${JALALI_MONTHS[jm - 1]} ${toFaDigits(jy)}`;
}

/** فرمت شمسی با ساعت: ۱۴۰۳/۰۵/۰۱ — ۱۴:۲۲ */
export function formatJalaliDateTime(isoDate: string | Date): string {
  const date = toDate(isoDate);
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${formatJalaliDate(isoDate)} — ${toFaDigits(`${hh}:${mi}`)}`;
}

/** زمان نسبی: «۲ ساعت پیش»، «دیروز» */
export function formatRelativeTime(isoDate: string | Date): string {
  const date = toDate(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMinutes < 1) return 'همین الان';
  if (diffMinutes < 60) return toFaDigits(`${diffMinutes} دقیقه پیش`);
  if (diffHours < 24) return toFaDigits(`${diffHours} ساعت پیش`);
  if (diffDays === 1) return 'دیروز';
  if (diffDays < 7) return toFaDigits(`${diffDays} روز پیش`);
  if (diffDays < 30) return toFaDigits(`${Math.floor(diffDays / 7)} هفته پیش`);
  if (diffDays < 365) return toFaDigits(`${Math.floor(diffDays / 30)} ماه پیش`);
  return formatJalaliDate(isoDate);
}

/** تبدیل تاریخ شمسی (رشته) به ISO برای ارسال به API */
export function jalaliToIso(jalaliDate: string): string {
  // ورودی مورد انتظار: 1403/05/01
  const [jy, jm, jd] = jalaliDate.split('/').map((x) => Number(x));
  if (!jy || !jm || !jd) {
    throw new Error(`تاریخ شمسی نامعتبر: ${jalaliDate}`);
  }
  const g = toGregorian(jy, jm, jd);
  const mm = String(g.gm).padStart(2, '0');
  const dd = String(g.gd).padStart(2, '0');
  return `${g.gy}-${mm}-${dd}`;
}

/** امروز به شمسی */
export function todayJalali(): string {
  return formatJalaliDate(new Date());
}

/** فرمت عدد اعشاری فارسی (برای درصد‌ها و CPI/SPI): ۶۴٫۷ */
export function formatFaNumber(value: number, fractionDigits?: number): string {
  const str =
    fractionDigits !== undefined ? value.toFixed(fractionDigits) : String(value);
  return toFaDecimal(toFaDigits(str));
}
