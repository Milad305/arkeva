import { DEVIATION_DEFAULTS, type DeviationThresholds } from '@/config/constants';
import type { Tone } from '@/shared/types/tone';
import { deviationTone } from '@/shared/utils/deviation';
import { formatDelta, toFaDigits } from '@/shared/utils/num';
import type { ProjectListItemDto } from '../types';

// نگاشت مقادیر سرور به رنگ و برچسب — فقط نمایش، بدون هیچ محاسبه (D07).

export interface BadgeView {
  tone: Tone;
  label: string;
}

/**
 * نشان ستون «انحراف» در W07 و کارت W08.
 * منطق همان `renderVals()` آرت‌بورد است، با آستانه‌های پروژه به‌جای اعداد ثابت.
 */
export function deviationBadge(
  project: ProjectListItemDto,
  thresholds: DeviationThresholds = DEVIATION_DEFAULTS,
): BadgeView {
  const progress = project.progress;

  if (!progress) return { tone: 'neu', label: 'شروع نشده' };

  if (project.status === 'completed') {
    const delay = progress.delayDays ?? 0;
    return delay > 0
      ? { tone: 'wrn', label: `${toFaDigits(delay)} روز تأخیر` }
      : { tone: 'ok', label: 'به‌موقع' };
  }

  const d = progress.deviation;
  const tone = deviationTone(d, thresholds);

  if (d > 0) return { tone, label: `${formatDelta(d)} جلو` };
  if (d <= -thresholds.criticalThreshold) return { tone, label: `${formatDelta(d)} بحرانی` };
  return { tone, label: formatDelta(d) };
}

/**
 * رنگ CPI بر اساس قاعدهٔ AL-CST-04: کمتر از ۰٫۹۵ هشدار، کمتر از ۰٫۹۰ بحرانی.
 * فقط رنگ متن است؛ هشدار واقعی را موتور هشدار می‌سازد.
 */
export function cpiTone(cpi: number | null): Tone | null {
  if (cpi === null) return null;
  if (cpi < 0.9) return 'err';
  if (cpi < 0.95) return 'wrn';
  return null;
}
