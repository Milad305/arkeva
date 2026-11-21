import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// cn() — ادغام کلاس‌ها (twMerge + clsx) — مطابق frontend-react.md بخش ۵
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Re-export توابع تاریخ شمسی (مطابق frontend-react.md بخش ۹)
export {
  formatJalaliDate,
  formatJalaliDateLong,
  formatJalaliDateTime,
  formatRelativeTime,
  jalaliToIso,
  todayJalali,
  formatFaNumber,
  JALALI_MONTHS,
} from './date';

// تبدیل ارقام انگلیسی به فارسی برای نمایش
const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]!);
}

// تبدیل ارقام فارسی/عربی به انگلیسی (برای ورودی کاربر و ذخیره)
export function toEnglishDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

// فرمت عدد با جداکننده هزارگان + ارقام فارسی
export function formatNumber(value: number): string {
  return toPersianDigits(value.toLocaleString('en-US'));
}

// فرمت مبلغ ریال با suffix «میلیارد ﷼» برای مبالغ بزرگ (مطابق designs/CBS.html)
export function formatRials(amount: number): string {
  if (amount >= 1_000_000_000) {
    const billions = amount / 1_000_000_000;
    const formatted = billions % 1 === 0 ? billions.toString() : billions.toFixed(1);
    return `${toPersianDigits(formatted)} میلیارد ﷼`;
  }
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `${toPersianDigits(millions.toFixed(0))} میلیون ﷼`;
  }
  return `${formatNumber(amount)} ﷼`;
}

// فرمت درصد با علامت + برای افزایش
export function formatPercent(value: number, withSign = false): string {
  const sign = withSign && value > 0 ? '+' : '';
  return `${sign}${toPersianDigits(value)}٪`;
}

// محاسبه انحراف پیشرفت
export function calcDeviation(actual: number, planned: number): number {
  return actual - planned;
}

// تعیین رنگ پیشرفت بر اساس انحراف (مطابق designs/WBS.html statusOf)
export type ProgressStatus = 'done' | 'progress' | 'warn' | 'late' | 'pending';

export function getProgressStatus(actual: number, planned: number): ProgressStatus {
  if (actual >= 100) return 'done';
  if (actual === 0) return 'pending';
  const diff = actual - planned;
  if (diff >= -5) return 'progress';
  if (diff >= -15) return 'warn';
  return 'late';
}

export const PROGRESS_STATUS_STYLES: Record<ProgressStatus, { bar: string; badge: string; label: string }> = {
  done: {
    bar: 'bg-success-500',
    badge: 'bg-success-50 text-success-700',
    label: 'تکمیل شده',
  },
  progress: {
    bar: 'bg-info-500',
    badge: 'bg-info-50 text-info-700',
    label: 'در حال انجام',
  },
  warn: {
    bar: 'bg-warning-500',
    badge: 'bg-warning-50 text-warning-700',
    label: 'تأخیر هشدار',
  },
  late: {
    bar: 'bg-error-500',
    badge: 'bg-error-50 text-error-700',
    label: 'تأخیر بحرانی',
  },
  pending: {
    bar: 'bg-gray-300',
    badge: 'bg-gray-100 text-gray-600',
    label: 'شروع نشده',
  },
};
