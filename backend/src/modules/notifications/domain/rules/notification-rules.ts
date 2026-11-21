import type { NotificationCategory, NotificationSeverity } from '../notification.entity.js';

// قواعد خالص اعلان (notifications.md ۵.۳؛ تصمیم 1405/08/15 برای زبانه‌های W06). بی پایگاه داده و ساعت.

/** dedupe: همان کلید در این بازه دوباره ساخته نمی‌شود (۵.۳). */
export const DEDUPE_WINDOW_MS = 60 * 60_000;
/** ادغام: بیش از این شمار اعلان هم‌نوع در پنجره، بقیه در یک «N اعلان تازه» (AC-NT-04). */
export const MERGE_AFTER = 5;
export const MERGE_WINDOW_MS = 10 * 60_000;
/** نگه‌داری اعلان درون‌برنامه (۷ `[تأییدشده]`). */
export const RETENTION_DAYS = 180;

/** زبانه‌های W06: تأییدها = NT-APR، NT-FLD، AL-APR؛ ریسک‌ها = NT-RSK، AL-RSK؛ بقیه سیستم. */
export function categoryOf(code: string): NotificationCategory {
  if (code.startsWith('NT-APR') || code.startsWith('NT-FLD') || code.startsWith('AL-APR')) return 'approvals';
  if (code.startsWith('NT-RSK') || code.startsWith('AL-RSK')) return 'risks';
  return 'system';
}

/**
 * `userId:code:subjectId:severity:channel` — شدت در کلید است تا ارتقای شدت هشدار اعلان تازه بسازد ولی
 * ارزیابی دوبارهٔ همان شدت نه (AC-NT-03).
 */
export function dedupeKeyOf(input: { userId: string; code: string; subjectId: string; severity: NotificationSeverity | null; channel: string }): string {
  return `${input.userId}:${input.code}:${input.subjectId}:${input.severity ?? ''}:${input.channel}`;
}

/** هم‌نوع = همان کد در همان پروژه (یا سازمان). */
export function groupKeyOf(code: string, projectId: string | null): string {
  return `${code}:${projectId ?? 'org'}`;
}

export type MergeDecision = { readonly kind: 'separate' } | { readonly kind: 'open_merged' } | { readonly kind: 'add_to_merged'; readonly mergedId: string };

/**
 * ۵ اعلان هم‌نوع جدا؛ از ششمی یک ردیف ادغامی که بعدی‌ها به آن افزوده می‌شوند (AC-NT-04: ۸ ← ۵ جدا + ۱ ادغامی با ۳).
 * `recent` ردیف‌های هم‌گروه همین کاربر در پنجرهٔ ادغام است.
 */
export function mergeDecision(recent: readonly { readonly id: string; readonly mergedCount: number }[]): MergeDecision {
  const merged = recent.find((row) => row.mergedCount > 0);
  if (merged) return { kind: 'add_to_merged', mergedId: merged.id };
  return recent.length >= MERGE_AFTER ? { kind: 'open_merged' } : { kind: 'separate' };
}
