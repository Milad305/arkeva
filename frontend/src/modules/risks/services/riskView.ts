import type { RiskLevel } from '@/config/constants';
import type { ResponseStrategy, RiskCloseReason, ReviewFrequency } from '../types';

// نمایش F14 — فقط رنگ و برچسب. امتیاز، سطح و وضعیت را سرور می‌سازد (D07).
// رنگ خانه‌های ماتریس از بوم W18 (risk.md ۶).

export const LEVEL_ZONE: Record<RiskLevel, { bg: string; fg: string }> = {
  low: { bg: '#E5EBF3', fg: '#1A3354' },
  medium: { bg: '#FEF0C7', fg: '#B45309' },
  high: { bg: '#FEE2E2', fg: '#B91C1C' },
  critical: { bg: '#FCA5A5', fg: '#7F1D1D' },
};

/** سطح خانهٔ ماتریس از امتیاز همان خانه — همان بازه‌های risk.md ۲ (فقط برای رنگ). */
export function cellLevel(probability: number, impact: number): RiskLevel {
  const score = probability * impact;
  return score >= 20 ? 'critical' : score >= 15 ? 'high' : score >= 9 ? 'medium' : 'low';
}

/** توضیح هر پله هنگام انتخاب در W44 (risk.md ۵.۲). */
export const PROBABILITY_SCALE = [
  '',
  'بسیار کم — تقریباً رخ نمی‌دهد',
  'کم — به‌ندرت رخ داده',
  'متوسط — گاهی رخ می‌دهد',
  'زیاد — در پروژه‌های مشابه رخ داده',
  'بسیار زیاد — تقریباً قطعی',
];
export const IMPACT_SCALE = [
  '',
  'ناچیز — بی‌اثر بر زمان و هزینه',
  'کم — چند روز یا مبلغ اندک',
  'متوسط — تأخیر یا هزینهٔ محسوس',
  'زیاد — اثر بر مسیر بحرانی یا بودجهٔ قلم',
  'بسیار شدید — تأخیر یا هزینهٔ عمدهٔ پروژه',
];

export const STRATEGY_LABEL: Record<ResponseStrategy, string> = {
  avoid: 'اجتناب',
  mitigate: 'کاهش',
  transfer: 'انتقال',
  accept: 'پذیرش',
};
export const CLOSE_REASON_LABEL: Record<RiskCloseReason, string> = {
  mitigated: 'کاهش‌یافته',
  not_applicable: 'منتفی',
  accepted: 'پذیرفته‌شده',
  other: 'سایر',
};
export const FREQUENCY_LABEL: Record<ReviewFrequency, string> = {
  weekly: 'هفتگی',
  biweekly: 'دوهفته‌ای',
  monthly: 'ماهانه',
};

const CATEGORY_COLORS: Record<string, string> = {
  تأمین: '#2563EB',
  مالی: '#E07A2C',
  قراردادی: '#B45309',
  محیطی: '#0891B2',
  ایمنی: '#DC2626',
  منابع: '#7C3AED',
  طراحی: '#71717A',
  فنی: '#52525B',
};
export const categoryColor = (category: string) => CATEGORY_COLORS[category] ?? '#71717A';
