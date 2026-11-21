import type { ActionStatus, RiskLevel, RiskStatus } from './risk.entities.js';

// قواعد خالص ریسک (risk.md ۵): امتیاز و سطح (ب22)، چرخهٔ خودکار (OD-10)، معوق، نام‌بردن، اثر بالقوه (ب23).

export const OPEN_STATUSES: readonly RiskStatus[] = ['identified', 'assessed', 'in_action'];
export const isOpen = (status: RiskStatus): boolean => OPEN_STATUSES.includes(status);

/** سطح از امتیاز: ۱–۸ کم، ۹–۱۴ متوسط، ۱۵–۱۹ بالا، ۲۰–۲۵ بحرانی `[تأییدشده]`. */
export function levelOf(score: number): RiskLevel {
  if (score >= 20) return 'critical';
  if (score >= 15) return 'high';
  if (score >= 9) return 'medium';
  return 'low';
}

export function scoreOf(probability: number | null, impact: number | null): { score: number | null; level: RiskLevel | null } {
  if (probability === null || impact === null) return { score: null, level: null };
  const score = probability * impact;
  return { score, level: levelOf(score) };
}

/** ریسک تازه یا با امتیاز ≥ ۱۵ (NT-RSK-02؛ AC-RK-02). */
export const URGENT_SCORE = 15;

export const isActiveAction = (status: ActionStatus): boolean => status === 'open' || status === 'in_progress';

/** «معوق» (۵.۴): موعد گذشته و باز یا در جریان؛ امروز به وقت تهران. */
export const isOverdue = (action: { readonly status: ActionStatus; readonly dueDate: string }, today: string): boolean =>
  isActiveAction(action.status) && action.dueDate < today;

/**
 * وضعیت خودکار (۵.۱؛ AC-RK-06): فقط برای ریسک باز. بی امتیاز ← identified؛ با اقدام باز ← in_action؛ وگرنه assessed.
 */
export function autoStatus(current: RiskStatus, scored: boolean, actions: readonly { readonly status: ActionStatus }[]): RiskStatus {
  if (!isOpen(current)) return current;
  if (!scored) return 'identified';
  return actions.some((action) => isActiveAction(action.status)) ? 'in_action' : 'assessed';
}

/** اعضای نام‌برده با `@نام کامل` در متن (۵.۸)؛ نام بلندتر اول تا «@علی رضایی» با «@علی» اشتباه نشود. */
export function mentionedIn(text: string, members: readonly { readonly id: string; readonly fullName: string }[]): string[] {
  const found = new Set<string>();
  let rest = text;
  for (const member of [...members].sort((a, b) => b.fullName.length - a.fullName.length)) {
    const token = `@${member.fullName}`;
    if (member.fullName && rest.includes(token)) {
      found.add(member.id);
      rest = rest.split(token).join(' ');
    }
  }
  return [...found];
}

/**
 * اثر زمانی بالقوه (۵.۶): پروژهٔ متصل به MSP ← جمع ریسک‌های باز پیوندخورده به برگ بحرانی؛ بی MSP ← بیشینه.
 */
export function scheduleImpact(
  risks: readonly { readonly days: number | null; readonly critical: boolean }[],
  mspLinked: boolean,
): { days: number; basis: 'critical_path_sum' | 'max' } {
  if (mspLinked) return { days: risks.filter((risk) => risk.critical).reduce((sum, risk) => sum + (risk.days ?? 0), 0), basis: 'critical_path_sum' };
  return { days: risks.reduce((max, risk) => Math.max(max, risk.days ?? 0), 0), basis: 'max' };
}

/** پیش‌فرض دسته‌های سازمان (۵.۹). */
export const DEFAULT_CATEGORIES = ['فنی', 'تأمین', 'مالی', 'ایمنی', 'محیطی', 'قراردادی', 'منابع', 'طراحی'] as const;

export const STRATEGY_LABEL = { avoid: 'اجتناب', mitigate: 'کاهش', transfer: 'انتقال', accept: 'پذیرش' } as const;
export const CLOSE_LABEL = { mitigated: 'کاهش‌یافته', not_applicable: 'منتفی', accepted: 'پذیرفته‌شده', other: 'سایر' } as const;
