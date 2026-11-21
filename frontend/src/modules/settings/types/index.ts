import type { ProjectStatus } from '@/config/constants';
import type { EntityId, IsoDate, IsoInstant, RialAmount } from '@/shared/types/api';

// تنظیمات پروژه — W28، W29، W30 (F02 ۶–۸، F09، F07 ۶، F10، F11 ۵، F12 ۲.۴، F13 ۴.۲، platform ۱۲).
// همه با `project.settings.edit` جز آنچه کنار هر بخش آمده است.

/** تنظیمات خام پروژه (W28–W30) — شکل مشترک بخش‌های تنظیمات. */
export type WeightGenerator = 'manual' | 'cost' | 'duration' | 'equal';
export type EacMethod = 'cpi' | 'remaining' | 'composite';

export interface ProjectSettingsRecord {
  warningThreshold: number;
  criticalThreshold: number;
  weightGenerator: WeightGenerator;
  showFinancialProgress: boolean;
  eacMethod: EacMethod;
  minPhotos: number;
  maxJumpPct: number;
  allowDecrease: boolean;
  offlineEnabled: boolean;
  lateAfterHours: number;
  dailyReminderEnabled: boolean;
  dailyReminderTime: string;
  gpsMode: 'flag_only' | 'block';
  gpsRadiusM: number;
  /** موقعیت کارگاه (02 ۳) — یک منبع برای W28 و W29. */
  siteLat: number | null;
  siteLng: number | null;
  approvalMode: 'single_stage' | 'two_stage';
  stage2OnCritical: boolean;
  stage2OnJump: boolean;
  stage2OnGpsOut: boolean;
  stage2OnCriticalPath: boolean;
  reviewDeadlineHours: number;
  onDeadline: 'remind_only' | 'escalate';
  autoApproveEnabled: boolean;
  autoApproveMaxDelta: number;
}

export interface GeneralSettingsDto {
  code: string;
  name: string;
  clientName: string;
  projectTypeId: EntityId;
  description: string;
  status: ProjectStatus;
  manager: { id: EntityId; fullName: string; avatarTone?: string };
  plannedStart: IsoDate;
  plannedFinish: IsoDate | null;
  forecastFinish: IsoDate | null;
  delayWorkingDays: number | null;
  /** «همگام با MSP» — تاریخ‌ها فقط‌خواندنی (F02 ۷). */
  mspLinked: boolean;
  /** برآورد اولیهٔ ویزارد. */
  plannedTotalBudget: RialAmount | null;
  /** بودجهٔ کل واقعی = جمع اقلام CBS + ذخیره (cbs.md ۶.۱). */
  actualTotalBudget: RialAmount | null;
  /** اختلاف بیش از ۱٪ ← هشدار نرم (F02 ۵.۲). */
  budgetMismatchPercent: number | null;
  currency: 'rial' | 'toman';
  location: string;
  siteLat: number | null;
  siteLng: number | null;
  gpsRadiusM: number;
  imageName: string | null;
}

export type WeekdayKey = 'sat' | 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri';

export interface CalendarDto {
  workWeek: Array<{ day: WeekdayKey; mode: 'full' | 'half' | 'off' }>;
  dayStart: string;
  dayEnd: string;
  halfDayEnd: string;
  holidays: Array<{ date: IsoDate; title: string; type: 'official' | 'manual'; enabled: boolean }>;
  /** سال‌های پوشش پروژه که تعطیلات رسمی‌شان هنوز اضافه نشده. */
  missingOfficialYears: number[];
}

/** بدنهٔ `PATCH /settings {general}`؛ تاریخ‌ها فقط وقتی پروژه به MSP وصل نیست (F02 ۷). */
export type GeneralSettingsInput = Partial<
  Pick<
    GeneralSettingsDto,
    | 'name'
    | 'clientName'
    | 'projectTypeId'
    | 'description'
    | 'currency'
    | 'location'
    | 'siteLat'
    | 'siteLng'
    | 'imageName'
  >
> & { plannedStart?: IsoDate | null; plannedFinish?: IsoDate | null };

export interface ProgressSettingsDto {
  weightGenerator: WeightGenerator;
  showFinancialProgress: boolean;
  warningThreshold: number;
  criticalThreshold: number;
  eacMethod: EacMethod;
  /** سه روش با عدد همین پروژه برای مقایسه (evm.md ۵). مبلغ بدون مجوز تهی. */
  eacPreview: Array<{
    method: EacMethod;
    label: string;
    formula: string;
    value: RialAmount | null;
  }>;
  pvReferenceVersionId: EntityId | null;
  versions: Array<{ id: EntityId; label: string; appliedAt: IsoInstant | null }>;
}

/** بدنهٔ `PATCH /settings {progress}`. */
export type ProgressSettingsInput = Omit<ProgressSettingsDto, 'eacPreview' | 'versions'>;

export type FieldRulesDto = Pick<
  ProjectSettingsRecord,
  | 'minPhotos'
  | 'maxJumpPct'
  | 'allowDecrease'
  | 'offlineEnabled'
  | 'lateAfterHours'
  | 'dailyReminderEnabled'
  | 'dailyReminderTime'
  | 'gpsMode'
  | 'gpsRadiusM'
>;

export type WorkflowSettingsDto = Pick<
  ProjectSettingsRecord,
  | 'approvalMode'
  | 'stage2OnCritical'
  | 'stage2OnJump'
  | 'stage2OnGpsOut'
  | 'stage2OnCriticalPath'
  | 'reviewDeadlineHours'
  | 'onDeadline'
  | 'autoApproveEnabled'
  | 'autoApproveMaxDelta'
> & { avgApprovalHours: number | null; mspLinked: boolean };

/** بدنهٔ `PATCH /settings {workflow}`. */
export type WorkflowSettingsInput = Omit<WorkflowSettingsDto, 'avgApprovalHours' | 'mspLinked'>;

export interface AreaDto {
  id: EntityId | null;
  areaName: string;
  rootIds: EntityId[];
  reviewerUserId: EntityId | null;
}

export interface AreasDto {
  areas: Array<AreaDto & { rootCodes: string[]; reviewerName: string | null }>;
  fallbackApproverId: EntityId;
  unroutedLeafCount: number;
  /** گزینه‌های ریشه: دو سطح اول WBS. */
  wbsRoots: Array<{ id: EntityId; code: string; title: string; depth: number }>;
  /** ناظران و مدیر پروژه برای انتخاب. */
  reviewers: Array<{ userId: EntityId; fullName: string; avatarTone: string; isManager: boolean }>;
}

export interface PeriodDto {
  id: EntityId;
  label: string;
  startDate: IsoDate;
  endDate: IsoDate;
  status: 'open' | 'closed';
  closedAt: IsoInstant | null;
  closedBy: string | null;
  /** AL-PER-01: بیش از ۳ روز از پایان گذشته و باز. */
  overdue: boolean;
  /** فقط اولین دورهٔ باز گذشته قابل بستن است (دوره‌ها پیوسته‌اند). */
  closable: boolean;
}

export type ChannelState = 'on' | 'off' | 'na' | 'locked_on';
export type ChannelKey = 'in_app' | 'email' | 'sms' | 'push';

export interface NotificationMatrixRowDto {
  code: string;
  label: string;
  recipients: string;
  channels: Record<ChannelKey, ChannelState>;
}

export interface AlertRuleDto {
  code: string;
  name: string;
  group: string;
  enabled: boolean;
  /** AL-INT-01 و AL-STR-06 غیرقابل‌خاموش (04 ۲.۴). */
  canDisable: boolean;
  severityText: string;
  params: Array<{
    key: string;
    label: string;
    value: number;
    unit: string;
    min: number;
    max: number;
    step: number;
  }>;
}

export interface IntegrationCardDto {
  key: 'msp' | 'erp' | 'accounting' | 'p6';
  title: string;
  description: string;
  status: 'connected' | 'not_linked' | 'soon' | 'export_only';
  message: string;
}

/** آخرین «خروجی کامل پروژه» (F20 ۱۲)؛ فقط برای دارندهٔ `export.full`. */
export interface FullExportDto {
  id: EntityId;
  status: 'queued' | 'running' | 'done' | 'failed' | 'expired';
  includesAmounts: boolean;
  createdAt: IsoInstant;
  /** لینک تا این لحظه (۲۴ ساعت پس از ساخت). */
  expiresAt: IsoInstant | null;
  sizeText: string | null;
  error: string | null;
}

export interface BackupsDto {
  schedule: 'daily' | 'weekly' | 'off';
  items: Array<{
    id: EntityId;
    at: IsoInstant;
    sizeText: string;
    kind: 'auto' | 'manual';
    note: string | null;
  }>;
  fullBackupSizeText: string;
  fullExport: FullExportDto | null;
}

/** لینک امضاشدهٔ دانلود (خروجی کامل، XER). */
export interface FileLinkDto {
  url: string;
  fileName: string;
}

export interface ProjectSettingsDto {
  general: GeneralSettingsDto;
  calendar: CalendarDto;
  progress: ProgressSettingsDto;
  field: FieldRulesDto;
  workflow: WorkflowSettingsDto;
  periods: PeriodDto[];
  notifications: NotificationMatrixRowDto[];
  alertRules: AlertRuleDto[];
  integrations: IntegrationCardDto[];
  backups: BackupsDto;
  members: Array<{ userId: EntityId; fullName: string; avatarTone: string; isManager: boolean }>;
  /** فهرست انواع پروژهٔ سازمان (F02 ۴). */
  projectTypes: Array<{ id: EntityId; name: string }>;
}
