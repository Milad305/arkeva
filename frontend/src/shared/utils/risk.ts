import { RISK_LEVELS } from '@/config/constants';
import type { Tone } from '@/shared/types/tone';

// امتیاز ریسک = احتمال × اثر (هر کدام ۱ تا ۵، حاصل ۱ تا ۲۵).
// سطوح: کم ۱–۸ · متوسط ۹–۱۴ · بالا ۱۵–۱۹ · بحرانی ۲۰–۲۵
// ریسک ۱۵ به بالا اعلان فوری دارد.

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export function riskScore(probability: number, impact: number): number {
  return probability * impact;
}

export function riskLevel(score: number): RiskLevel {
  if (score >= RISK_LEVELS.CRITICAL_MIN) return 'critical';
  if (score >= RISK_LEVELS.HIGH_MIN) return 'high';
  if (score >= RISK_LEVELS.MEDIUM_MIN) return 'medium';
  return 'low';
}

/** ریسک‌های ۱۵ به بالا اعلان فوری می‌گیرند. */
export function needsImmediateAlert(score: number): boolean {
  return score >= RISK_LEVELS.HIGH_MIN;
}

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: 'کم',
  medium: 'متوسط',
  high: 'بالا',
  critical: 'بحرانی',
};

/**
 * tone هر سطح — مطابق بوم (W05 و W18).
 * «بالا» و «بحرانی» هر دو قرمزند و با برچسب متنی از هم جدا می‌شوند.
 */
export const RISK_LEVEL_TONES: Record<RiskLevel, Tone> = {
  low: 'pri',
  medium: 'wrn',
  high: 'err',
  critical: 'err',
};

/** رنگ خانهٔ ماتریس ریسک ۵×۵ در W18 / W24. */
export function riskMatrixColor(score: number): string {
  switch (riskLevel(score)) {
    case 'critical':
      return '#DC2626';
    case 'high':
      return '#E07A2C';
    case 'medium':
      return '#D97706';
    default:
      return '#2C4A73';
  }
}

export const RISK_SCALE_LABELS = {
  probability: ['خیلی کم', 'کم', 'متوسط', 'زیاد', 'خیلی زیاد'],
  impact: ['ناچیز', 'جزئی', 'متوسط', 'شدید', 'بحرانی'],
} as const;
