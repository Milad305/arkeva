import type { AlertSeverity, AlertStatus } from './alert.entities.js';
import { SEVERITY_RANK } from './rule-types.js';

// چرخهٔ هشدار (04-alert-engine ۲.۲؛ D09) — تابع خالص: یافته‌های این ارزیابی + هشدارهای موجود ← کارها.
//   • کلید `ruleCode:subjectType:subjectId`؛ تا open یا seen است نمونهٔ تازه ساخته نمی‌شود (AC-AL-02).
//   • ارتقای شدت ← همان هشدار + یک اعلان تازه؛ کاهش شدت اعلان نمی‌سازد (AC-AL-03).
//   • شرط رفع شد ← resolved؛ برقراری دوباره در ۲۴ ساعت ← بازگشایی همان هشدار بی اعلان (AC-AL-04).
//   • ردشده تا شرطش رفع و دوباره برقرار نشود باز نمی‌شود.

export const REOPEN_WINDOW_MS = 24 * 3_600_000;

export interface ExistingAlert {
  readonly id: string;
  readonly dedupeKey: string;
  readonly status: AlertStatus;
  readonly severity: AlertSeverity;
  readonly resolvedAt: Date | null;
  readonly conditionClearedAt: Date | null;
}

export interface Candidate {
  readonly dedupeKey: string;
  readonly severity: AlertSeverity;
}

export type Action =
  | { readonly kind: 'create'; readonly dedupeKey: string; readonly notify: true }
  | { readonly kind: 'update'; readonly id: string; readonly dedupeKey: string; readonly severity: AlertSeverity; readonly notify: boolean }
  | { readonly kind: 'reopen'; readonly id: string; readonly dedupeKey: string; readonly notify: false }
  | { readonly kind: 'resolve'; readonly id: string }
  | { readonly kind: 'clear_dismissed'; readonly id: string };

export const dedupeKeyOf = (ruleCode: string, subjectType: string, subjectId: string): string => `${ruleCode}:${subjectType}:${subjectId}`;

/** `existing`: هشدارهای همین قواعد در پروژه (فعال، ردشده، و رفع‌شده‌های ۲۴ ساعت اخیر). */
export function plan(candidates: readonly Candidate[], existing: readonly ExistingAlert[], now: Date): Action[] {
  const actions: Action[] = [];
  const found = new Map(candidates.map((candidate) => [candidate.dedupeKey, candidate]));
  const active = new Map(existing.filter((alert) => alert.status === 'open' || alert.status === 'seen').map((alert) => [alert.dedupeKey, alert]));
  const dismissed = existing.filter((alert) => alert.status === 'dismissed');
  const recentlyResolved = existing
    .filter((alert) => alert.status === 'resolved' && alert.resolvedAt && now.getTime() - alert.resolvedAt.getTime() <= REOPEN_WINDOW_MS)
    .sort((a, b) => (b.resolvedAt?.getTime() ?? 0) - (a.resolvedAt?.getTime() ?? 0));

  for (const candidate of found.values()) {
    const current = active.get(candidate.dedupeKey);
    if (current) {
      const escalated = SEVERITY_RANK[candidate.severity] > SEVERITY_RANK[current.severity];
      actions.push({ kind: 'update', id: current.id, dedupeKey: candidate.dedupeKey, severity: candidate.severity, notify: escalated });
      continue;
    }
    // ردشده‌ای که شرطش هنوز رفع نشده: ساکت می‌ماند
    if (dismissed.some((alert) => alert.dedupeKey === candidate.dedupeKey && !alert.conditionClearedAt)) continue;
    const reopen = recentlyResolved.find((alert) => alert.dedupeKey === candidate.dedupeKey);
    if (reopen) actions.push({ kind: 'reopen', id: reopen.id, dedupeKey: candidate.dedupeKey, notify: false });
    else actions.push({ kind: 'create', dedupeKey: candidate.dedupeKey, notify: true });
  }
  for (const alert of active.values()) if (!found.has(alert.dedupeKey)) actions.push({ kind: 'resolve', id: alert.id });
  for (const alert of dismissed) if (!alert.conditionClearedAt && !found.has(alert.dedupeKey)) actions.push({ kind: 'clear_dismissed', id: alert.id });
  return actions;
}
