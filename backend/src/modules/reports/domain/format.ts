import { toFaDigits } from '../../../platform/http/fa.js';
import { formatJalali } from '../../../platform/time/jalali.js';

// قالب‌بندی متن گزارش (management-reports.md ۷.۲: ارقام فارسی، تاریخ شمسی). فقط نمایش؛ عددها از جدول‌های مشتق.

const faNumber = (value: number, digits: number) => toFaDigits(String(Math.round(value * 10 ** digits) / 10 ** digits)).replace('.', '٫');
export const fa = (value: number | string) => toFaDigits(value);
export const pct = (value: number) => `${faNumber(value, 1)}٪`;
export const ratio = (value: number | null) => (value === null ? '—' : faNumber(value, 2));
export const jalali = (iso: string) => toFaDigits(formatJalali(iso));
/** ریال با جداکنندهٔ هزارگان فارسی. */
export const rial = (value: string | bigint) => toFaDigits(BigInt(value).toLocaleString('en-US')).replace(/,/g, '٬');
export const jalaliDateTime = (instant: Date) => {
  const tehran = new Date(instant.getTime() + 3.5 * 3_600_000);
  const time = tehran.toISOString().slice(11, 16);
  return `${jalali(tehran.toISOString().slice(0, 10))} ساعت ${fa(time)}`;
};
