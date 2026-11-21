// رنگ‌ها، badgeها و توابع کمکی اختصاصی WBS.
// مطابق frontend-react.md بخش ۱۲.۴: منطق domain اینجا، نه در کامپوننت.
// مرجع HEX: designs/WBS.html (statusMap lines 870-876, progressColor lines 761-764).

import { formatJalaliDate } from '@/shared/utils';
import type { WbsStatus } from '../types';

// ────────── Status styling (مطابق WBS.html statusMap + progressColor) ──────────

export interface WbsStatusStyle {
  label: string;
  bg: string;
  fg: string;
  dot: string;
  bar: string; // رنگ progress bar
}

// دقیقاً مطابق statusMap در WBS.html (lines 870-876) + progressColor (lines 761-764)
export const WBS_STATUS_STYLE: Record<WbsStatus, WbsStatusStyle> = {
  done: {
    label: 'تکمیل شده',
    bg: '#ECFDF3',
    fg: '#15803D',
    dot: '#16A34A',
    bar: '#15803D', // success-700
  },
  progress: {
    label: 'در حال انجام',
    bg: '#EFF6FF',
    fg: '#1D4ED8',
    dot: '#2563EB',
    bar: '#2563EB', // info-500
  },
  warn: {
    label: 'تأخیر هشدار',
    bg: '#FFF8EB',
    fg: '#B45309',
    dot: '#D97706',
    bar: '#D97706', // warning-500
  },
  late: {
    label: 'تأخیر بحرانی',
    bg: '#FEF2F2',
    fg: '#B91C1C',
    dot: '#DC2626',
    bar: '#DC2626', // error-500
  },
  pending: {
    label: 'شروع نشده',
    bg: '#F4F4F5',
    fg: '#52525B',
    dot: '#A1A1AA',
    bar: '#D4D4D8', // gray-300
  },
};

// رنگ progress bar یک گره بر اساس status
export function getProgressColor(status: WbsStatus): string {
  return WBS_STATUS_STYLE[status].bar;
}

// ────────── Variance badge (مطابق detail panel در WBS.html) ──────────

export interface VarianceBadgeStyle {
  label: string;
  bg: string;
  fg: string;
  iconName: 'trending-up' | 'trending-down';
}

export function getVarianceBadge(deviation: number, status: WbsStatus): VarianceBadgeStyle {
  if (deviation >= 0) {
    return {
      label: `+${toFa(deviation)}٪ جلو`,
      bg: '#ECFDF3',
      fg: '#15803D',
      iconName: 'trending-up',
    };
  }
  // منفی — رنگ بر اساس status
  return {
    label: `${toFa(deviation)}٪ از برنامه`,
    bg: WBS_STATUS_STYLE[status].bg,
    fg: WBS_STATUS_STYLE[status].fg,
    iconName: 'trending-down',
  };
}

// ────────── Weight mismatch badge ──────────

export const WEIGHT_MISMATCH_BADGE = {
  bg: '#FEF2F2',
  fg: '#B91C1C',
};

// ساخت tooltip برای weight mismatch
export function getWeightMismatchTooltip(actualSum: number): string {
  return `مجموع وزن فرزندان: ${toFa(actualSum)}٪ — باید ۱۰۰٪ باشد`;
}

// ────────── Date helpers ──────────

// نمایش تاریخ شمسی یا «—» اگه null
export function formatFaDateOrDash(iso: string | null): string {
  if (!iso) return '—';
  try {
    return formatJalaliDate(iso);
  } catch {
    return '—';
  }
}

// تعداد روز بین دو تاریخ Gregorian
export function daysBetween(startIso: string | null, endIso: string | null): number {
  if (!startIso || !endIso) return 0;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(1, Math.round((end - start) / 86_400_000));
}

// سطح (depth) از روی code
export function levelFromCode(code: string): number {
  return code.split('.').length;
}

// ────────── Internal helpers ──────────

function toFa(n: number): string {
  return String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]!);
}
