// قفل موقت پس از ورودهای ناموفق پیاپی (F01 ۵.۱؛ W02). تابع خالص با تست.

export interface LockoutPolicy {
  readonly maxFailed: number;
  readonly lockMinutes: number;
}

export interface FailureOutcome {
  readonly failedCount: number;
  /** اگر این شکست به قفل رسید، زمان پایان قفل. */
  readonly lockedUntil: Date | null;
  readonly remainingAttempts: number;
}

export function afterFailedLogin(previousFailures: number, policy: LockoutPolicy, now: Date): FailureOutcome {
  const failedCount = previousFailures + 1;
  const remainingAttempts = Math.max(0, policy.maxFailed - failedCount);
  if (remainingAttempts > 0) return { failedCount, lockedUntil: null, remainingAttempts };
  return { failedCount, lockedUntil: new Date(now.getTime() + policy.lockMinutes * 60_000), remainingAttempts: 0 };
}

/** دقیقه‌های باقی‌ماندهٔ قفل، گرد به بالا — برای پیام «… دقیقه قفل شد». */
export function minutesLeft(lockedUntil: Date, now: Date): number {
  return Math.max(1, Math.ceil((lockedUntil.getTime() - now.getTime()) / 60_000));
}
