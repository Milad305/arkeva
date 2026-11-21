import type { LeafMeasurementMethod } from '@/config/constants';
import type { EntityId, IsoDate, IsoInstant, Percent, RialAmount } from '@/shared/types/api';
import type { CostType } from '@/shared/types/tone';
import type { IconName } from '@/shared/components/ui/Icon';
import type { ProjectSettingsRecord } from '@/modules/settings/types';

/** تنظیماتی که قالب نگه می‌دارد (templates.md ۴). */
export type TemplateSettings = Pick<
  ProjectSettingsRecord,
  | 'weightGenerator'
  | 'warningThreshold'
  | 'criticalThreshold'
  | 'eacMethod'
  | 'minPhotos'
  | 'maxJumpPct'
  | 'allowDecrease'
  | 'approvalMode'
  | 'stage2OnCritical'
  | 'stage2OnJump'
  | 'stage2OnGpsOut'
  | 'stage2OnCriticalPath'
  | 'reviewDeadlineHours'
  | 'onDeadline'
  | 'autoApproveEnabled'
  | 'autoApproveMaxDelta'
>;

// F16 — قالب‌ها (W31). شکل `content` دقیقاً `features/templates.md` بخش ۴ است؛ اینجا
// فقط DTOهایی هست که صفحه می‌بیند. محتوا تغییرناپذیر است و هر انتشار یک
// `TemplateVersion` تازه می‌سازد (۵.۴).

/** چرخهٔ عمر قالب (۵.۴). */
export type TemplateStatus = 'draft' | 'published' | 'archived';

/** `pricingMode` قلم CBS — قلم ساخته‌شده از قالب همیشه `lump_sum` است (۴). */
export type TemplatePricingMode = 'lump_sum' | 'unit_rate';

/** کارت فهرست قالب‌ها (ستون چپ W31). */
export interface TemplateListItemDto {
  id: EntityId;
  name: string;
  icon: IconName;
  /** نوع پروژه — کلید `PROJECT_TYPE_NAMES`. */
  projectTypeId: string;
  projectTypeName: string;
  status: TemplateStatus;
  /** شمارهٔ آخرین نسخهٔ منتشرشده؛ قالب بی‌انتشار `null` است. */
  version: number | null;
  maintainerName: string;
  lastChangedAt: IsoDate;
  /** از `Project.templateRef` — فقط برای آمار (۴). */
  usedInProjects: number;
  wbsCount: number;
  cbsCount: number;
  /** قالب پیش‌فرض این نوع پروژه (۵.۴) — در W37 پیشنهاد می‌شود. */
  isDefaultForType: boolean;
  /** منبع ساخت قالب، برای خط زیر نام کارت. */
  originNote: string | null;
}

export interface TemplateListDto {
  items: TemplateListItemDto[];
  /** شمار هر نوع برای نوار بخش‌بندی («همه»، ساختمانی، …) — فقط نوع‌های دارای قالب. */
  typeCounts: Array<{ projectTypeId: string; name: string; count: number }>;
  /** همهٔ نوع‌های پروژهٔ سازمان — برای ساخت قالب تازه. */
  projectTypes: Array<{ id: string; name: string }>;
  /** شمار قالب‌های بایگانی‌شده — برای کلید «شامل بایگانی‌شده». */
  archivedCount: number;
}

export interface TemplateVersionDto {
  version: number;
  publishedAt: IsoInstant;
  authorName: string;
  note: string;
  wbsCount: number;
  cbsCount: number;
}

/** سرِ پنل پیش‌نمایش + تنظیمات همراه + تاریخچهٔ نسخه‌ها. */
export interface TemplateDetailDto extends TemplateListItemDto {
  /** مدت مرجع قالب به روز کاری (۴). */
  referenceDurationWd: number;
  levels: number;
  leafCount: number;
  linkCount: number;
  areas: Array<{ key: string; name: string; rootTitles: string[] }>;
  settings: TemplateSettings;
  versions: TemplateVersionDto[];
  /** پیش‌نویسِ نسخهٔ بعد دارد؟ (۵.۴ — تا انتشار، W38 نسخهٔ قبلی را می‌دهد.) */
  hasUnpublishedDraft: boolean;
  weightsOk: boolean;
  /** پروژه‌هایی که از این قالب ساخته شده‌اند (AC-TP-05، AC-TP-08). */
  usedInProjectNames: string[];
}

export interface TemplateLinkedCbsDto {
  code: string;
  title: string;
  costType: CostType;
  /** ضریب تقسیم — عدد صحیح ≥ ۱ (۲). */
  parts: number;
}

/** گرهٔ درخت WBS قالب — بدون تاریخ مطلق، بدون مقدار کل و بدون سرپرست (۴). */
export interface TemplateWbsNodeDto {
  id: EntityId;
  code: string;
  title: string;
  weightInParent: Percent;
  isMilestone: boolean;
  measurementMethod: LeafMeasurementMethod | null;
  unit: string | null;
  stepCount: number;
  startOffsetWd: number;
  durationWd: number;
  areaName: string | null;
  linkedCbs: TemplateLinkedCbsDto[];
  /** جمع وزن فرزندان؛ برای نشان «Σ ۹۵٪» وزن نامتعادل. */
  childWeightSum: number | null;
  /** روز کاری شروع و پایان در پروژه‌ای با مدت `projectWorkdays` (۵.۳ گام ۲). */
  previewStartWd: number;
  previewFinishWd: number;
  /** BAC این آیتم از اتصال‌ها با بودجهٔ CBS پیش‌نمایش (۵.۳ گام ۴ · AC-TP-01). */
  previewBac: RialAmount;
  children?: TemplateWbsNodeDto[];
}

export interface TemplateCbsNodeDto {
  id: EntityId;
  code: string;
  title: string;
  costType: CostType;
  unit: string | null;
  pricingMode: TemplatePricingMode;
  /** سهم بودجه — فقط برگ؛ جمع برگ‌ها ۱۰۰ (۴). */
  sharePct: Percent | null;
  linkCount: number;
  /** بودجهٔ قلم با بودجهٔ CBS پیش‌نمایش (۵.۳ گام ۳). */
  previewBudget: RialAmount;
  children?: TemplateCbsNodeDto[];
}

/** پیش‌نمایش محتوای یک نسخه با بودجه و مدت دلخواه (۵.۳). */
export interface TemplatePreviewDto {
  templateId: EntityId;
  version: number | null;
  wbs: TemplateWbsNodeDto[];
  cbs: TemplateCbsNodeDto[];
  /** جمع بودجهٔ برگ‌های CBS — باید دقیقاً بودجهٔ CBS ورودی باشد (AC-TP-01). */
  cbsTotal: RialAmount;
  /** جمع BAC برگ‌های WBS از اتصال‌ها. */
  wbsTotal: RialAmount;
  /** مدت پروژهٔ پیش‌نمایش به روز کاری و ضریب مقیاس. */
  projectWorkdays: number;
  scaleFactor: number;
}

export type TemplateIssueSeverity = 'error' | 'warning';

export interface TemplateIssueDto {
  severity: TemplateIssueSeverity;
  /** شناسهٔ قاعده — برای تست و ردگیری. */
  rule: string;
  message: string;
  /** آیتم یا قلم مربوط، اگر مشخص باشد. */
  at: string | null;
}

export interface TemplateValidationDto {
  templateId: EntityId;
  canPublish: boolean;
  errors: TemplateIssueDto[];
  warnings: TemplateIssueDto[];
  /** جمع وزن هر گروه و سطح اول ۱۰۰ است؟ (D04) */
  weightsOk: boolean;
  /** جمع `sharePct` برگ‌های CBS. */
  cbsShareSum: number;
}

export interface PublishTemplateRequest {
  templateId: EntityId;
  note: string;
}

export interface ImportTemplateRequest {
  name: string;
  projectTypeId: string;
  /** برگهٔ WBS — در نسخهٔ نمایشی CSV (۵.۱). */
  wbsFile: File;
  /** برگهٔ CBS؛ قالب بی‌CBS هم مجاز است (۱۰). */
  cbsFile: File | null;
  referenceDurationWd: number;
  commit: boolean;
}

export interface ImportTemplateRowDto {
  row: number;
  code: string;
  title: string;
  depth: number;
  isParent: boolean;
  weight: number | null;
  startOffsetWd: number | null;
  durationWd: number | null;
  status: 'ok' | 'warning' | 'error';
  error: string | null;
}

export interface ImportTemplateResultDto {
  wbsRows: ImportTemplateRowDto[];
  cbsRows: ImportTemplateRowDto[];
  issues: TemplateIssueDto[];
  wbsCount: number;
  cbsCount: number;
  linkCount: number;
  cbsShareSum: number;
  /** فقط وقتی `commit` بود و خطایی نبود. */
  templateId: EntityId | null;
}
