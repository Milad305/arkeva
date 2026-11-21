import type { AlertSeverity, SubjectType } from './alert.entities.js';

// قرارداد قاعدهٔ هشدار (04-alert-engine ۲.۱). قاعده خالص است: فقط از «واقعیت‌های» بارشدهٔ پروژه می‌خواند و یافته برمی‌گرداند.

export interface ParamDef {
  readonly key: string;
  readonly label: string;
  readonly default: number;
  readonly unit: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

export type Audience = { readonly role: 'pm' | 'planner' | 'finance' | 'org_admin' } | { readonly userId: string };

export interface Finding {
  readonly subjectType: SubjectType;
  readonly subjectId: string;
  readonly severity: AlertSeverity;
  /** مقادیر لحظهٔ ارزیابی (payload) و جای‌خالی‌های متن. */
  readonly values: Readonly<Record<string, string | number | null>>;
  readonly audience: readonly Audience[];
}

export interface LeafFact {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly isMilestone: boolean;
  readonly method: string | null;
  readonly supervisorUserId: string | null;
  readonly plannedStart: string | null;
  readonly planned: number;
  readonly actual: number;
  readonly hasPending: boolean;
  readonly linked: boolean;
  readonly routed: boolean;
  /** وزن در پروژه (کسر ۰ تا ۱) و سهم بودجه (کسر). */
  readonly weightShare: number;
  readonly budgetShare: number | null;
  /** روزهای کاری از شروع برنامه‌ای تا امروز (منفی = هنوز نرسیده). */
  readonly workDaysSinceStart: number | null;
}

export interface CbsLeafFact {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly budget: bigint;
  readonly eac: bigint;
  readonly ev: bigint;
  readonly consumedPercent: number | null;
}

export interface SupervisorFact {
  readonly userId: string;
  readonly name: string;
  readonly openLeafCount: number;
  /** روز کاری از آخرین گزارش (یا از فعال‌سازی اگر گزارشی نیست). */
  readonly workDaysSinceReport: number;
  /** پرچم‌های ۱۰ آیتم اخیر. */
  readonly recentFlags: readonly (readonly string[])[];
  readonly queue: { readonly hoursOldest: number; readonly queuedReports: number } | null;
  /** تأییدکننده‌های حوزهٔ برگ‌های این سرپرست. */
  readonly approvers: readonly string[];
}

export interface ApproverFact {
  readonly userId: string;
  readonly name: string;
  readonly overdueCount: number;
  readonly oldestOverdueHours: number;
  readonly decisions14d: number;
  readonly avgDecisionHours: number | null;
}

export interface ProjectFacts {
  readonly projectId: string;
  readonly today: string;
  readonly thresholds: { readonly warning: number; readonly critical: number };
  readonly reviewDeadlineHours: number;
  readonly weightGenerator: string;
  readonly daysActive: number | null;
  readonly progress: {
    readonly dataDate: string;
    readonly planned: number;
    readonly actual: number;
    readonly delayDays: number | null;
    readonly forecastFinish: string | null;
    readonly bac: bigint;
    readonly ac: bigint;
    /** EV در تاریخ شاخص‌های هزینه (OD-19). */
    readonly evAtCost: bigint;
    readonly cpi: number | null;
    readonly unallocatedBudget: bigint;
  } | null;
  readonly costsCompleteThrough: string | null;
  readonly leaves: readonly LeafFact[];
  readonly cbsLeaves: readonly CbsLeafFact[];
  readonly supervisors: readonly SupervisorFact[];
  readonly approvers: readonly ApproverFact[];
  readonly needsResolution: number;
  readonly fallbackApproverName: string;
  readonly openPeriods: readonly { readonly label: string; readonly endDate: string; readonly daysSinceEnd: number }[];
  readonly supervisorNames: ReadonlyMap<string, string>;
  /** لحظهٔ ارزیابی (ms) برای قاعده‌های ساعتی مثل AL-RSK-04. */
  readonly nowMs: number;
  /** ریسک‌های باز پروژه (F14؛ برش ۱۳ب). */
  readonly risks: readonly RiskFact[];
  /** پروژهٔ متصل به MSP: پیشرفت و پیشنهاد منتظر ارسال (AL-INT-02؛ برش ۱۷ب). */
  readonly mspPending: { readonly progress: number; readonly proposals: number } | null;
}

export interface RiskFact {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly status: string;
  readonly score: number | null;
  readonly source: 'manual' | 'field';
  readonly ownerUserId: string;
  readonly nextReviewDate: string | null;
  readonly createdAt: Date;
  readonly wbsItemIds: readonly string[];
  readonly actions: readonly { readonly id: string; readonly title: string; readonly ownerUserId: string; readonly dueDate: string; readonly status: string }[];
}

export interface RuleDef {
  readonly code: string;
  readonly name: string;
  readonly group: string;
  readonly severityText: string;
  readonly canDisable: boolean;
  readonly params: readonly ParamDef[];
  /** تا ساخت ماژول دادهٔ قاعده (ریسک، یکپارچه‌سازی) چیزی برنمی‌گرداند (تصمیم 1405/08/24). */
  readonly deferredUntil?: string;
  /** متن راهنما؛ `amounts = false` نسخهٔ بی مبلغ (AC-AL-07). */
  readonly guidance: (values: Finding['values'], amounts: boolean) => string;
  readonly title: (values: Finding['values']) => string;
  readonly link: (values: Finding['values']) => string;
  readonly evaluate: (facts: ProjectFacts, params: Readonly<Record<string, number>>) => Finding[];
}

export const SEVERITY_RANK: Record<AlertSeverity, number> = { info: 0, warning: 1, critical: 2 };
