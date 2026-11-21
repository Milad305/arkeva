import type { WbsProgressStatus } from '@/config/constants';
import type { EntityId, IsoDate, IsoInstant, Percent, RialAmount } from '@/shared/types/api';
import type { CostType, Tone } from '@/shared/types/tone';
import type { IconName } from '@/shared/components/ui/Icon';

// F18 — گزارش‌های مدیریتی (W25). هر بخش فقط از مقادیر ذخیره‌شده می‌خواند و هیچ
// فرمولی ندارد (بخش ۴ سند)؛ محاسبه و قالب‌بندی متن در «سرور» است، نه React (D07).

/** بخش‌های قابل‌استفاده (جدول بخش ۴) به‌علاوهٔ بخش پرتفوی سازمانی. */
export type ReportSectionKey =
  | 'summary'
  | 'progress'
  | 'cost'
  | 'cost_ledger'
  | 'risks'
  | 'resources'
  | 'field'
  | 'photos'
  | 'milestones'
  | 'integration'
  | 'portfolio';

export type ReportCategory = 'project' | 'financial' | 'resources' | 'risk' | 'integration' | 'internal';

/** `client` یعنی هیچ‌گاه مبلغ ندارد (۶ و ۷.۳). */
export type ReportAudience = 'internal' | 'client';

export type ReportFormat = 'pdf' | 'xlsx';

/** گزارش یک پروژه یا همهٔ پروژه‌های سازمان. */
export type ReportScope = 'project' | 'portfolio';

export type ReportTemplateStatus = 'ready' | 'preview';

export interface ReportTemplateDto {
  id: EntityId;
  name: string;
  description: string;
  icon: IconName;
  category: ReportCategory;
  categoryLabel: string;
  audience: ReportAudience;
  scope: ReportScope;
  sections: ReportSectionKey[];
  formats: ReportFormat[];
  /** از بخش‌ها می‌آید؛ قالب کارفرما همیشه `false` (۷.۳). */
  includesAmounts: boolean;
  isSystem: boolean;
  status: ReportTemplateStatus;
  pageCount: number;
  lastGeneratedAt: IsoInstant | null;
}

export interface ReportTemplateListDto {
  items: ReportTemplateDto[];
  categoryCounts: Array<{ category: ReportCategory; label: string; count: number }>;
  sections: Array<{ key: ReportSectionKey; label: string; description: string; hasAmounts: boolean }>;
}

// ── زمان‌بندی ──

export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'on_period_close';
export type ScheduleRunStatus = 'ok' | 'failed' | 'never' | 'paused';
export type RecipientKind = 'user' | 'role' | 'email';

export interface ReportRecipientDto {
  kind: RecipientKind;
  /** شناسهٔ کاربر، کد نقش یا خود نشانی ایمیل. */
  id: string;
  label: string;
  initials: string | null;
  avatarTone: string | null;
  /** بیرون از سازمان — نیاز به `reports.send_external` (۷.۳). */
  external: boolean;
  /** نسخهٔ با مبلغ می‌گیرد؟ (D11 · AC-MR-03) */
  canViewAmounts: boolean;
}

export interface ReportScheduleDto {
  id: EntityId;
  templateId: EntityId;
  templateName: string;
  /** پروژه یا «همهٔ پروژه‌ها». */
  scopeLabel: string;
  projectId: EntityId | null;
  format: ReportFormat;
  frequency: ReportFrequency;
  frequencyLabel: string;
  weekday: number | null;
  dayOfMonth: number | null;
  timeOfDay: string;
  timezone: string;
  workingDaysOnly: boolean;
  recipients: ReportRecipientDto[];
  /** «کارفرما · ۲ نفر» — متن کنار آواتارها. */
  recipientSummary: string;
  enabled: boolean;
  nextRunAt: IsoInstant | null;
  nextRunLabel: string;
  lastRunAt: IsoInstant | null;
  lastRunStatus: ScheduleRunStatus;
  /** پیام وضعیت ردیف (ارسال ناموفق، توقف پروژه). */
  note: { text: string; tone: Tone; icon: IconName } | null;
  /** دو نسخه ساخته می‌شود چون گیرندگان مختلط‌اند (۷.۳). */
  splitAmounts: boolean;
}

export interface ScheduleInput {
  id: EntityId | null;
  templateId: EntityId;
  projectId: EntityId | null;
  format: ReportFormat;
  frequency: ReportFrequency;
  weekday: number | null;
  dayOfMonth: number | null;
  timeOfDay: string;
  workingDaysOnly: boolean;
  recipients: Array<{ kind: RecipientKind; id: string }>;
  enabled: boolean;
}

// ── خروجی‌های تولیدشده ──

export type GeneratedStatus = 'queued' | 'running' | 'done' | 'failed';
export type ReportSourceKind = 'live' | 'period_snapshot';
export type ReportWatermark = 'none' | 'open_period';

export interface GeneratedReportDto {
  id: EntityId;
  templateId: EntityId;
  templateName: string;
  scopeLabel: string;
  rangeLabel: string;
  format: ReportFormat;
  sourceKind: ReportSourceKind;
  includesAmounts: boolean;
  watermark: ReportWatermark;
  status: GeneratedStatus;
  error: string | null;
  requestedByName: string;
  createdAt: IsoInstant;
  pageCount: number;
  /** «۱٫۲ مگابایت» — از سرور. */
  sizeLabel: string | null;
}

// ── بازه ──

export type RangeKind = 'last_week' | 'period' | 'custom';

export interface ReportRangeOptionDto {
  id: string;
  kind: RangeKind;
  label: string;
  from: IsoDate;
  to: IsoDate;
  /** بازه کاملاً داخل دورهٔ بسته است (۷.۱). */
  closed: boolean;
}

// ── پیش‌نمایش ──

export interface PreviewCurvePointDto {
  planned: Percent | null;
  actual: Percent | null;
}

interface SectionBase {
  title: string;
  /** «داده‌ای در این بازه نیست» یا دلیل حذف بخش (۱۲). */
  empty: string | null;
}

export type ReportPreviewSectionDto =
  | (SectionBase & {
      key: 'summary';
      kpis: Array<{ label: string; value: string; sub: string | null; tone: Tone }>;
      /** متن از قالب ثابت، بدون هوش مصنوعی (۴ و فرض ۶). */
      text: string;
    })
  | (SectionBase & {
      key: 'progress';
      curve: PreviewCurvePointDto[];
      todayIndex: number;
      plannedPercent: Percent;
      actualPercent: Percent;
      deviations: Array<{ code: string; title: string; deviation: Percent }>;
    })
  | (SectionBase & {
      key: 'cost';
      bac: RialAmount;
      ac: RialAmount;
      ev: RialAmount;
      eac: RialAmount;
      cpi: number | null;
      tcpi: number | null;
      byType: Array<{ type: CostType; label: string; percent: Percent }>;
    })
  | (SectionBase & {
      key: 'cost_ledger';
      rows: Array<{ code: string; title: string; type: CostType; budget: RialAmount; ac: RialAmount; consumedPercent: Percent }>;
      total: RialAmount;
    })
  | (SectionBase & {
      key: 'risks';
      items: Array<{ code: string; title: string; score: number | null; tone: Tone }>;
      openCount: number;
      criticalCount: number;
    })
  | (SectionBase & {
      key: 'resources';
      reportCount: number;
      coveragePercent: Percent;
      avgApprovalHours: number;
      supervisors: Array<{ name: string; reports: number; coveragePercent: Percent | null }>;
    })
  | (SectionBase & {
      key: 'field';
      submitted: number;
      approved: number;
      returned: number;
      pending: number;
      text: string;
    })
  | (SectionBase & {
      key: 'photos';
      items: Array<{ code: string; title: string; takenAt: IsoDate }>;
    })
  | (SectionBase & {
      key: 'milestones';
      items: Array<{ title: string; plannedDate: IsoDate; status: WbsProgressStatus; delayWorkingDays: number | null }>;
    })
  | (SectionBase & {
      key: 'integration';
      rows: Array<{ label: string; value: string; tone: Tone }>;
    })
  | (SectionBase & {
      key: 'portfolio';
      rows: Array<{
        id: EntityId;
        code: string;
        name: string;
        plannedPercent: Percent;
        actualPercent: Percent;
        deviation: Percent;
        cpi: number | null;
        spi: number | null;
        atRisk: boolean;
      }>;
    });

export interface ReportPreviewDto {
  templateId: EntityId;
  templateName: string;
  audience: ReportAudience;
  scope: ReportScope;
  includesAmounts: boolean;
  /** مبلغ به‌خاطر نبود `cbs.view_amounts` کاربر حذف شد؟ (D11) */
  amountsHiddenByPermission: boolean;
  header: {
    orgName: string;
    projectName: string;
    projectCode: string;
    clientName: string;
    managerName: string;
    rangeLabel: string;
    generatedAtLabel: string;
  };
  sourceKind: ReportSourceKind;
  watermark: ReportWatermark;
  /** برچسب پایین صفحه برای بازهٔ باز (۷.۱ · AC-MR-07). */
  openPeriodNote: string | null;
  pageCount: number;
  sections: ReportPreviewSectionDto[];
}

export interface PreviewQuery {
  templateId: EntityId;
  projectId: EntityId | null;
  rangeId: string;
  /** بخش‌هایی که کاربر در پیش‌نمایش خاموش کرده. */
  disabledSections: ReportSectionKey[];
  canViewAmounts: boolean;
}

export interface GenerateReportRequest extends PreviewQuery {
  format: ReportFormat;
}

export interface SendReportRequest {
  templateId: EntityId;
  projectId: EntityId | null;
  rangeId: string;
  recipients: Array<{ kind: RecipientKind; id: string }>;
}

export interface SendReportResultDto {
  internalCount: number;
  externalCount: number;
  /** دو نسخه ساخته شد چون گیرندگان مختلط بودند (۷.۳). */
  splitAmounts: boolean;
  message: string;
}

export interface CustomTemplateInput {
  name: string;
  description: string;
  category: ReportCategory;
  audience: ReportAudience;
  scope: ReportScope;
  sections: ReportSectionKey[];
  formats: ReportFormat[];
}

/** گزینه‌های فرم‌ها — پروژه‌ها، کاربران، نقش‌ها. */
export interface ReportOptionsDto {
  projects: Array<{ id: EntityId; name: string; code: string }>;
  users: Array<{ id: EntityId; fullName: string; initials: string; avatarTone: string; canViewAmounts: boolean }>;
  roles: Array<{ code: string; label: string; canViewAmounts: boolean }>;
}
