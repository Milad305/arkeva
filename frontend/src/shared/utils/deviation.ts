import { DEVIATION_DEFAULTS, type DeviationThresholds } from '@/config/constants';
import type { Tone } from '@/shared/types/tone';

// انحراف پیشرفت — رنگ و برچسب، نه محاسبهٔ کسب‌وکاری.
//
// D07: هیچ فرمول کسب‌وکاری در React نیست. مقدار `planned` و `actual` از سرور
// می‌آید؛ این فایل فقط تصمیم می‌گیرد آن مقدار با چه رنگی و چه برچسبی دیده شود.
//
// C04: انحراف همیشه به **واحد درصد** است (واقعی − برنامه‌ای).
//
// بازه‌ها طبق `00-overview.md` ۴.۴ — مرزها دقیقاً این‌طورند و `[تأییدشده]`:
//   بحرانی      d ≤ −۱۵
//   هشدار       −۱۵ < d ≤ −۵     ← دقیقاً −۵ هشدار است، نه «طبق برنامه»
//   طبق برنامه  −۵ < d ≤ ۰
//   جلوتر       d > ۰
// در مثال مرجع، آیتم ۱.۲ با انحراف دقیقاً −۵ «هشدار» است.
// طبقه‌بندی همیشه با مقدار گردنشده انجام می‌شود.
//
// آستانه‌ها پارامتر قاعده‌اند (`04-alert-engine.md` ۲.۴) با سه سطح غلبه:
// پیش‌فرض کد ← پیش‌فرض سازمان ← تنظیم پروژه. هر صفحه باید آستانهٔ پروژهٔ جاری را
// بدهد، وگرنه رنگ ردیف با هشداری که موتور ساخته نمی‌خواند.

export type ProgressStatus = 'done' | 'notStarted' | 'onTrack' | 'warning' | 'late';

/** اختلاف پیشرفت واقعی از برنامه‌ای، به واحد درصد. مثبت = جلوتر از برنامه. */
export function deviation(planned: number, actual: number): number {
  return actual - planned;
}

export function progressStatus(
  planned: number,
  actual: number,
  thresholds: DeviationThresholds = DEVIATION_DEFAULTS,
): ProgressStatus {
  if (actual >= 100) return 'done';
  if (planned === 0 && actual === 0) return 'notStarted';

  const d = deviation(planned, actual);
  if (d <= -thresholds.criticalThreshold) return 'late';
  if (d <= -thresholds.warningThreshold) return 'warning';
  return 'onTrack';
}

/** رنگ متن و نوار بر اساس انحراف — مقادیر دقیقاً از بوم. */
export function deviationColor(
  d: number,
  thresholds: DeviationThresholds = DEVIATION_DEFAULTS,
): string {
  if (d <= -thresholds.criticalThreshold) return '#DC2626';
  if (d <= -thresholds.warningThreshold) return '#D97706';
  if (d > 0) return '#16A34A';
  return '#2C4A73';
}

/** رنگ نوار پیشرفت با در نظر گرفتن «تمام‌شده» و «شروع‌نشده». */
export function progressColor(
  planned: number,
  actual: number,
  thresholds: DeviationThresholds = DEVIATION_DEFAULTS,
): string {
  const status = progressStatus(planned, actual, thresholds);
  if (status === 'done') return '#16A34A';
  if (status === 'notStarted') return '#D4D4D8';
  return deviationColor(deviation(planned, actual), thresholds);
}

export function deviationTone(
  d: number,
  thresholds: DeviationThresholds = DEVIATION_DEFAULTS,
): Tone {
  if (d <= -thresholds.criticalThreshold) return 'err';
  if (d <= -thresholds.warningThreshold) return 'wrn';
  if (d > 0) return 'ok';
  return 'pri';
}

export const PROGRESS_STATUS_LABELS: Record<ProgressStatus, string> = {
  done: 'تکمیل',
  onTrack: 'در حال انجام',
  warning: 'عقب‌تر از برنامه',
  late: 'تأخیر بحرانی',
  notStarted: 'شروع‌نشده',
};

export const PROGRESS_STATUS_TONES: Record<ProgressStatus, Tone> = {
  done: 'ok',
  onTrack: 'inf',
  warning: 'wrn',
  late: 'err',
  notStarted: 'neu',
};

/** کلاس ردیف درخت در kit.css — نوار وضعیت کنار ردیف را رنگ می‌کند. */
export const PROGRESS_STATUS_ROW_CLASS: Record<ProgressStatus, string> = {
  done: 's-done',
  onTrack: 's-prog',
  warning: 's-warn',
  late: 's-late',
  notStarted: 's-none',
};

/** برچسب خوانای انحراف برای ستون «انحراف». */
export function deviationLabel(
  d: number,
  thresholds: DeviationThresholds = DEVIATION_DEFAULTS,
): string {
  if (d > 0) return 'جلوتر از برنامه';
  if (d === 0) return 'مطابق برنامه';
  if (d <= -thresholds.criticalThreshold) return 'بحرانی';
  if (d <= -thresholds.warningThreshold) return 'هشدار';
  return 'قابل قبول';
}
