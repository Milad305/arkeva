import type { RiskLevel, RiskStatus } from '@/config/constants';
import type { EntityId, IsoDate, IsoInstant, RialAmount } from '@/shared/types/api';
import type { PersonRef } from '@/modules/projects/types';

// F14 — ریسک (`features/risk.md`، `02-domain-model.md` ۹). امتیاز، سطح، وضعیت خودکار،
// اثر بالقوه، «معوق» و باقی‌ماندهٔ ذخیره را سرور می‌سازد (D07). مبالغ بدون
// `cbs.view_amounts` تهی‌اند (AC-RK-10).

export type ResponseStrategy = 'avoid' | 'mitigate' | 'transfer' | 'accept';
export type RiskCloseReason = 'mitigated' | 'not_applicable' | 'accepted' | 'other';
export type RiskActionStatus = 'open' | 'in_progress' | 'done' | 'cancelled';
export type ReviewFrequency = 'weekly' | 'biweekly' | 'monthly';

export interface RiskListItemDto {
  id: EntityId;
  projectId: EntityId;
  projectName: string;
  code: string;
  title: string;
  category: string;
  probability: number | null;
  impact: number | null;
  score: number | null;
  level: RiskLevel | null;
  status: RiskStatus;
  responseStrategy: ResponseStrategy | null;
  /** «کاهش: سفارش از تأمین‌کنندهٔ دوم» — راهبرد و اولین اقدام باز. */
  responseSummary: string | null;
  owner: PersonRef;
  /** نزدیک‌ترین موعد اقدام باز. */
  nextDueDate: IsoDate | null;
  hasOverdueAction: boolean;
  source: 'manual' | 'field';
  /** خلاصهٔ اولین پیوند: «WBS 1.2.3.1 · قالب‌بندی سقف». */
  linkSummary: { kind: 'wbs_item' | 'cbs_item' | 'field_report' | 'none'; text: string };
  /** برگ‌های WBS پیوندخورده — فیلتر `?wbsItem=` از W11. */
  wbsItemIds: EntityId[];
  costImpact: RialAmount | null;
  scheduleImpactDays: number | null;
}

export interface RiskRegisterDto {
  items: RiskListItemDto[];
  summary: {
    open: number;
    openFromFieldThisMonth: number;
    highOrCritical: number;
    overdueActions: number;
    /** Σ اثر مالی ریسک‌های باز (۵.۶)؛ بدون مجوز مبلغ `null`. */
    costImpact: RialAmount | null;
    /** بیشینه بدون MSP، جمع روی مسیر بحرانی با MSP (۵.۶). */
    scheduleImpactDays: number;
    scheduleImpactBasis: 'critical_path_sum' | 'max';
    unassessedOpen: number;
  };
  /** شمار ریسک‌های باز ارزیابی‌شده در هر خانه — کلید `${probability}-${impact}` (AC-RK-09). */
  matrix: Record<string, number>;
  byCategory: Array<{ category: string; count: number }>;
  overdueActionTitles: string[];
  categories: string[];
  /** شناسهٔ بعدی برای W44 (C05). فقط در دفتر یک پروژه. */
  nextCode: string | null;
}

export interface RiskActionDto {
  id: EntityId;
  title: string;
  owner: PersonRef;
  dueDate: IsoDate | null;
  status: RiskActionStatus;
  overdue: boolean;
  costNote: string | null;
  completedAt: IsoInstant | null;
  completionNote: string | null;
}

export interface RiskLinkDto {
  kind: 'wbs_item' | 'cbs_item' | 'field_report';
  targetId: EntityId;
  code: string | null;
  title: string;
  /** WBS: انحراف پیشرفت از F10؛ CBS: درصد مصرف. */
  metric: string | null;
  metricTone: 'err' | 'wrn' | 'neu' | null;
  removed: boolean;
}

export interface RiskHistoryEntryDto {
  kind: 'note' | 'score' | 'status' | 'created' | 'action' | 'contingency';
  text: string;
  by: string;
  at: IsoInstant;
}

export interface RiskDetailDto extends RiskListItemDto {
  cause: string | null;
  event: string | null;
  consequence: string | null;
  triggerText: string | null;
  nextReviewDate: IsoDate | null;
  reviewFrequency: ReviewFrequency | null;
  targetProbability: number | null;
  targetImpact: number | null;
  targetScore: number | null;
  targetLevel: RiskLevel | null;
  scoreHistory: Array<{ at: IsoInstant; score: number }>;
  actions: RiskActionDto[];
  links: RiskLinkDto[];
  history: RiskHistoryEntryDto[];
  followers: PersonRef[];
  isFollowing: boolean;
  contingency: {
    allocated: RialAmount | null;
    consumed: RialAmount | null;
    /** باقی‌ماندهٔ ذخیرهٔ پروژه (۵.۷). */
    projectRemaining: RialAmount | null;
    coveragePercent: number | null;
  };
  createdBy: string;
  createdAt: IsoInstant;
  closeReason: RiskCloseReason | null;
  occurredAt: IsoInstant | null;
  actualCost: RialAmount | null;
  actualDelayDays: number | null;
  sourceReportedBy: string | null;
}

export interface RiskInput {
  title: string;
  category: string;
  probability: number | null;
  impact: number | null;
  cause?: string | null;
  event?: string | null;
  consequence?: string | null;
  responseStrategy: ResponseStrategy | null;
  ownerUserId: EntityId;
  triggerText?: string | null;
  costImpact?: RialAmount | null;
  scheduleImpactDays?: number | null;
  targetProbability?: number | null;
  targetImpact?: number | null;
  nextReviewDate?: IsoDate | null;
  reviewFrequency?: ReviewFrequency | null;
  links: Array<{ kind: 'wbs_item' | 'cbs_item'; targetId: EntityId }>;
}

export interface CreateRiskRequest extends RiskInput {
  projectId: EntityId;
  /** W44 «برنامهٔ اقدام» و «سررسید اقدام» ← اولین `RiskAction` با مالک ریسک. */
  firstAction: { title: string; dueDate: IsoDate | null } | null;
  /** اعلان برای امتیاز کمتر از ۱۵ (≥ ۱۵ همیشه، AC-RK-02). */
  notifyBelowThreshold: boolean;
}

export interface RiskStatusRequest {
  riskId: EntityId;
  status: 'occurred' | 'closed' | 'assessed';
  closeReason?: RiskCloseReason;
  actualCost?: RialAmount | null;
  actualDelayDays?: number | null;
  note?: string;
}

export interface RiskPeopleDto {
  /** اعضای پروژه برای مالک، مسئول اقدام و @نام. */
  members: PersonRef[];
  managerId: EntityId;
}
