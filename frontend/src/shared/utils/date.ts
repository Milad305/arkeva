import { toJalaali, toGregorian } from 'jalaali-js';

import { getDisplayPrefs } from './displayPrefs';
import { toFaDigits, toEnDigits } from './num';

// تبدیل تاریخ — C03:
//   تاریخ کاری: `date` میلادی ·  لحظه: `timestamptz` به UTC
//   مرز «روز» همیشه با `Asia/Tehran` تعیین می‌شود، نه با ساعت مرورگر.
//   نمایش پیش‌فرض شمسی است؛ فقط ترجیح خود کاربر در W32 آن را میلادی می‌کند
//   (C03، اصلاح 1405/08/19). نام توابع «Jalali» به معنی «تقویم نمایش» است.
//
// چرا منطقهٔ زمانی صریح: اگر از `date.getFullYear()` استفاده شود، روی دستگاهی که
// ساعتش تهران نیست تاریخ شمسی یک روز جابه‌جا می‌شود و «گزارش امروز» اشتباه می‌افتد.

const TEHRAN = 'Asia/Tehran';

const TEHRAN_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: TEHRAN,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const TEHRAN_TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: TEHRAN,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const TEHRAN_WEEKDAY = new Intl.DateTimeFormat('en-US', {
  timeZone: TEHRAN,
  weekday: 'short',
});

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

/** هفتهٔ ایرانی از شنبه شروع می‌شود. */
export const JALALI_WEEKDAYS = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
] as const;

const WEEKDAY_INDEX: Record<string, number> = {
  Sat: 0,
  Sun: 1,
  Mon: 2,
  Tue: 3,
  Wed: 4,
  Thu: 5,
  Fri: 6,
};

/** جای‌گزین نمایشی وقتی تاریخ وجود ندارد یا نامعتبر است. */
const EMPTY = '—';

function toDate(input: string | Date): Date | null {
  const date = input instanceof Date ? input : new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** اجزای تاریخ میلادی در منطقهٔ زمانی تهران. */
function gregorianInTehran(date: Date): { gy: number; gm: number; gd: number } {
  const [year, month, day] = TEHRAN_DATE.format(date).split('-').map(Number);
  return { gy: year!, gm: month!, gd: day! };
}

const GREGORIAN_MONTHS = ['ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن', 'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'] as const;
const gregorianMode = () => getDisplayPrefs().calendar === 'gregorian';
const monthName = (month: number) => (gregorianMode() ? GREGORIAN_MONTHS : JALALI_MONTHS)[month - 1];

/** اجزای تاریخ در تقویم نمایش کاربر (شمسی پیش‌فرض) و منطقهٔ تهران. */
function toJalaaliParts(input: string | Date): { jy: number; jm: number; jd: number } | null {
  const date = toDate(input);
  if (!date) return null;
  const { gy, gm, gd } = gregorianInTehran(date);
  return gregorianMode() ? { jy: gy, jm: gm, jd: gd } : toJalaali(gy, gm, gd);
}

/**
 * تاریخ ISO اول هر ماه شمسی میان دو تاریخ (شامل) — تیک‌های محور زمان نمودارها.
 */
export function jalaliMonthStarts(fromIso: string, toIso: string): string[] {
  const from = toJalaaliParts(fromIso);
  const to = toJalaaliParts(toIso);
  if (!from || !to) return [];

  const result: string[] = [];
  if (gregorianMode()) {
    let year = from.jy;
    let month = from.jd > 1 ? from.jm + 1 : from.jm;
    while (year < to.jy || (year === to.jy && month <= to.jm)) {
      if (month > 12) {
        month = 1;
        year += 1;
        continue;
      }
      result.push(`${year}-${String(month).padStart(2, '0')}-01`);
      month += 1;
    }
    return result;
  }
  let { jy, jm } = from;
  if (from.jd > 1) {
    jm += 1;
    if (jm > 12) {
      jm = 1;
      jy += 1;
    }
  }
  while (jy < to.jy || (jy === to.jy && jm <= to.jm)) {
    const { gy, gm, gd } = toGregorian(jy, jm, 1);
    result.push(`${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`);
    jm += 1;
    if (jm > 12) {
      jm = 1;
      jy += 1;
    }
  }
  return result;
}

/** «مهر ۰۵» — برچسب محور زمانی نمودارها. */
export function formatJalaliMonthShort(isoDate: string | Date | null | undefined): string {
  if (!isoDate) return EMPTY;
  const parts = toJalaaliParts(isoDate);
  if (!parts) return EMPTY;
  return `${monthName(parts.jm)} ${toFaDigits(String(parts.jy % 100).padStart(2, '0'))}`;
}

/** ۱۴۰۳/۰۵/۰۱ */
export function formatJalaliDate(isoDate: string | Date | null | undefined): string {
  if (!isoDate) return EMPTY;
  const parts = toJalaaliParts(isoDate);
  if (!parts) return EMPTY;
  const mm = String(parts.jm).padStart(2, '0');
  const dd = String(parts.jd).padStart(2, '0');
  return toFaDigits(`${parts.jy}/${mm}/${dd}`);
}

/** ۱ مرداد ۱۴۰۳ */
export function formatJalaliDateLong(isoDate: string | Date | null | undefined): string {
  if (!isoDate) return EMPTY;
  const parts = toJalaaliParts(isoDate);
  if (!parts) return EMPTY;
  return `${toFaDigits(parts.jd)} ${monthName(parts.jm)} ${toFaDigits(parts.jy)}`;
}

/** شنبه ۱ خرداد ۱۴۰۴ */
export function formatJalaliDateWithWeekday(isoDate: string | Date | null | undefined): string {
  if (!isoDate) return EMPTY;
  const date = toDate(isoDate);
  if (!date) return EMPTY;
  const index = WEEKDAY_INDEX[TEHRAN_WEEKDAY.format(date)] ?? 0;
  return `${JALALI_WEEKDAYS[index]} ${formatJalaliDateLong(date)}`;
}

/** ۱۴:۲۲ — به وقت تهران */
export function formatTime(instant: string | Date | null | undefined): string {
  if (!instant) return EMPTY;
  const date = toDate(instant);
  if (!date) return EMPTY;
  return toFaDigits(TEHRAN_TIME.format(date));
}

/** ۱۴۰۳/۰۵/۰۱ · ۱۴:۲۲ */
export function formatJalaliDateTime(instant: string | Date | null | undefined): string {
  if (!instant) return EMPTY;
  const date = toDate(instant);
  if (!date) return EMPTY;
  return `${formatJalaliDate(date)} · ${formatTime(date)}`;
}

/** «۳۰ دقیقه پیش» · «دیروز · ۱۶:۴۰» */
export function formatRelativeTime(instant: string | Date | null | undefined): string {
  if (!instant) return EMPTY;
  const date = toDate(instant);
  if (!date) return EMPTY;

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return formatJalaliDateTime(date);

  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);

  if (minutes < 1) return 'همین الان';
  if (minutes < 60) return toFaDigits(`${minutes} دقیقه پیش`);
  if (hours < 24) return toFaDigits(`${hours} ساعت پیش`);
  if (days === 1) return `دیروز · ${formatTime(date)}`;
  if (days < 7) return toFaDigits(`${days} روز پیش`);
  if (days < 30) return toFaDigits(`${Math.floor(days / 7)} هفته پیش`);
  if (days < 365) return toFaDigits(`${Math.floor(days / 30)} ماه پیش`);
  return formatJalaliDate(date);
}

/**
 * رشتهٔ شمسی (با ارقام فارسی یا لاتین) → `IsoDate` میلادی برای ارسال به API.
 * ۱۴۰۳/۰۵/۰۱ → 2024-07-22 · نامعتبر → null
 */
export function jalaliToIso(jalaliDate: string): string | null {
  const parts = toEnDigits(jalaliDate.trim())
    .split(/[/\-.]/)
    .map(Number);
  const [jy, jm, jd] = parts;

  if (!jy || !jm || !jd || jm < 1 || jm > 12 || jd < 1 || jd > 31) return null;
  // ورودی میلادی (کاربر با ترجیح میلادی): سال‌ها هم‌پوشانی ندارند
  if (jy >= 1700) return `${jy}-${String(jm).padStart(2, '0')}-${String(jd).padStart(2, '0')}`;

  const g = toGregorian(jy, jm, jd);
  const mm = String(g.gm).padStart(2, '0');
  const dd = String(g.gd).padStart(2, '0');
  return `${g.gy}-${mm}-${dd}`;
}

/** امروز به وقت تهران، شمسی و قالب‌بندی‌شده. */
export function todayJalali(): string {
  return formatJalaliDate(new Date());
}

/** امروز به وقت تهران، `IsoDate` میلادی — برای مقدار پیش‌فرض فرم‌ها. */
export function todayIso(): string {
  return TEHRAN_DATE.format(new Date());
}

/** اختلاف روز تقویمی (به وقت تهران). مثبت یعنی `to` بعد از `from` است. */
export function diffInDays(from: string | Date, to: string | Date): number | null {
  const a = toDate(from);
  const b = toDate(to);
  if (!a || !b) return null;

  const pa = gregorianInTehran(a);
  const pb = gregorianInTehran(b);
  const utcA = Date.UTC(pa.gy, pa.gm - 1, pa.gd);
  const utcB = Date.UTC(pb.gy, pb.gm - 1, pb.gd);

  return Math.round((utcB - utcA) / 86_400_000);
}

/** «۲۶ روز تأخیر» / «۵ روز جلوتر» / «به‌موقع» */
export function formatDayDelta(planned: string | Date, forecast: string | Date): string {
  const days = diffInDays(planned, forecast);
  if (days === null) return EMPTY;
  if (days === 0) return 'به‌موقع';
  return days > 0 ? toFaDigits(`${days} روز تأخیر`) : toFaDigits(`${-days} روز جلوتر`);
}
