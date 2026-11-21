import { WBS_PROGRESS_STATUS, type WbsProgressStatus } from '@/config/constants';
import type { LegendEntry } from '@/shared/components/ui/Legend';
import { formatPercentAuto, toFaDigits } from '@/shared/utils/num';

// نمایش وضعیت پیشرفت آیتم — فقط رنگ و کلاس. وضعیت را سرور با آستانه‌های پروژه
// می‌سازد (`WbsItemProgress.status`)؛ اینجا هیچ آستانه‌ای تکرار نمی‌شود (D07).
//
// رنگ‌ها از `00-overview.md` ۴.۴: بحرانی قرمز، هشدار نارنجی، طبق برنامه سرمه‌ای،
// جلوتر سبز. «تمام‌شده» سبز و «شروع‌نشده» خاکستری مثل آرت‌بورد W11.

export const STATUS_COLOR: Record<WbsProgressStatus, string> = {
  completed: '#16A34A',
  ahead: '#16A34A',
  on_track: '#2C4A73',
  warning: '#D97706',
  critical: '#DC2626',
  not_started: '#D4D4D8',
};

/** کلاس نوار وضعیت ردیف `.tree tr.s-*` در kit.css. */
export const STATUS_ROW_CLASS: Record<WbsProgressStatus, string> = {
  completed: 's-done',
  ahead: 's-done',
  on_track: 's-prog',
  warning: 's-warn',
  critical: 's-late',
  not_started: 's-none',
};

/** انحراف به واحد درصد با علامت: «−۳۳٪»، «+۲٪»، «۰٪» (C04). */
export function formatDeviation(deviation: number): string {
  if (deviation === 0) return formatPercentAuto(0);
  return deviation > 0 ? `+${formatPercentAuto(deviation)}` : formatPercentAuto(deviation);
}

/** «۱۰ از ۲۳ آیتم» یا «۲۳ آیتم». */
export function itemCountLabel(shown: number, total: number, filtered: boolean): string {
  return filtered
    ? `${toFaDigits(shown)} از ${toFaDigits(total)} آیتم`
    : `${toFaDigits(total)} آیتم`;
}

/** راهنمای رنگ‌های نوار پایین درخت — به ترتیب شدت. */
export const STATUS_LEGEND: LegendEntry[] = (
  ['completed', 'ahead', 'on_track', 'warning', 'critical', 'not_started'] as WbsProgressStatus[]
).map((status) => ({
  label: WBS_PROGRESS_STATUS[status],
  color: STATUS_COLOR[status],
  shape: 'square',
}));
