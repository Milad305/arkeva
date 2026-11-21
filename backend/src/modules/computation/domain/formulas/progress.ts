import { scheduleSpan, type WorkCalendar } from './schedule.js';

// پیشرفت برگ (D03؛ D06؛ `02` ۶ «قاعدهٔ پیشرفت برگ در تاریخ t»؛ progress-calculation.md ۵.۳). تابع خالص؛ دقت کامل،
// گرد کردن فقط در نمایش (C04).

export type ReportMethod = 'quantity' | 'percent' | 'steps';

export interface ProgressStep {
  readonly key: string;
  readonly weight: number;
}

/** یک آیتم گزارش برای محاسبهٔ پیشرفت (تأییدشده یا در حال ارزیابی). */
export interface ProgressEntry {
  readonly workDate: string;
  /** ترتیب «آخرین» در تساوی تاریخ (approval-workflow.md ۳.۱). */
  readonly recordedAt: string;
  readonly quantityToday: number | null;
  readonly reportedPercent: number | null;
  readonly stepsProgress: Readonly<Record<string, number>> | null;
}

export interface LeafShape {
  readonly method: ReportMethod;
  readonly totalQuantity: number | null;
  readonly steps: readonly ProgressStep[] | null;
}

const byRecency = (a: ProgressEntry, b: ProgressEntry): number =>
  a.workDate === b.workDate ? (a.recordedAt < b.recordedAt ? -1 : a.recordedAt > b.recordedAt ? 1 : 0) : a.workDate < b.workDate ? -1 : 1;

/** مقدار تجمعی تأییدشده (روش مقداری). */
export function approvedQuantity(entries: readonly ProgressEntry[]): number {
  return entries.reduce((sum, entry) => sum + (entry.quantityToday ?? 0), 0);
}

/** درصد هر گام: آخرین مقدار گزارش‌شده با ترتیب workDate و زمان ثبت — مستقل از ترتیب تأیید. */
export function stepPercents(entries: readonly ProgressEntry[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const entry of [...entries].sort(byRecency)) {
    for (const [key, percent] of Object.entries(entry.stepsProgress ?? {})) result.set(key, percent);
  }
  return result;
}

/** درصد برگ از آیتم‌ها (۰ تا ۱۰۰). */
export function leafPercent(leaf: LeafShape, entries: readonly ProgressEntry[]): number {
  if (entries.length === 0) return 0;
  if (leaf.method === 'quantity') {
    const total = leaf.totalQuantity ?? 0;
    return total > 0 ? Math.min(100, (approvedQuantity(entries) * 100) / total) : 0;
  }
  if (leaf.method === 'percent') {
    const latest = [...entries].sort(byRecency).at(-1);
    return Math.min(100, Math.max(0, latest?.reportedPercent ?? 0));
  }
  const percents = stepPercents(entries);
  return (leaf.steps ?? []).reduce((sum, step) => sum + (step.weight * (percents.get(step.key) ?? 0)) / 100, 0);
}

/**
 * پیشرفت برنامه‌ای برگ در تاریخ t (OD-02): پیش از شروع ۰، پس از پایان ۱۰۰، در بین خطی بر روزهای کاری (هر دو سر شامل).
 * نقطهٔ عطف تا روز پایان صفر و از آن روز ۱۰۰.
 */
export function plannedLeafPercent(
  input: { readonly start: string | null; readonly finish: string | null; readonly isMilestone: boolean },
  date: string,
  calendar: WorkCalendar,
): number {
  const { start, finish } = input;
  if (!start || !finish) return 0;
  if (input.isMilestone) return date >= finish ? 100 : 0;
  if (date < start) return 0;
  if (date >= finish) return 100;
  const total = scheduleSpan(start, finish, calendar)?.workDays ?? 0;
  if (total <= 0) return 0;
  const done = scheduleSpan(start, date, calendar)?.workDays ?? 0;
  return Math.min(100, (done / total) * 100);
}
