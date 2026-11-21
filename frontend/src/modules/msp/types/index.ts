import type { WeightGenerator } from '@/config/constants';
import type { EntityId, IsoDate, IsoInstant, Percent, RialAmount } from '@/shared/types/api';
import type { CostType, Tone } from '@/shared/types/tone';
import type { IconName } from '@/shared/components/ui/Icon';

// F15 — یکپارچه‌سازی MS Project (W34، W35، W49، W36).
// مالکیت فیلدها طبق جدول ۶ (OD-03): ساختار و تاریخ از MSP، وزن و روش و اتصال CBS و
// پیشرفت از پروژه‌یار. تحلیل فایل کار «سرور» است؛ React فقط نتیجه را نشان می‌دهد.

/** منبع تحلیل: فایل واقعی MSPDI یا نمونهٔ آماده وقتی فایل خوانده نشد (MPP). */
export type AnalysisSource = 'xml' | 'sample';

export type CheckSeverity = 'ok' | 'warning' | 'error';

export interface ImportCheckDto {
  id: string;
  severity: CheckSeverity;
  title: string;
  detail: string | null;
  /** کد فعالیت‌های مربوط، برای پیوند «مشاهدهٔ فعالیت‌ها». */
  items: string[];
  /** خطای قابل‌تعیین‌تکلیف: تا یکی انتخاب نشود ادامه مسدود است (AC-MS-03). */
  resolutions: Array<{ id: string; label: string; blocks: boolean }>;
  resolution: string | null;
}

export interface ImportStatsDto {
  phases: number;
  tasks: number;
  leaves: number;
  milestones: number;
  levels: number;
  resources: number;
  spanLabel: string;
  totalCost: RialAmount;
  statusDate: IsoDate | null;
  /** درصد پیشرفت غیرصفر در فایل. */
  tasksWithProgress: number;
}

export interface ImportOptionsDto {
  /** ساخت CBS از هزینه‌های فایل (۷.۱ گام ۲). */
  buildCbs: boolean;
  /** ذخیرهٔ Baseline فایل به‌عنوان برنامهٔ مبنا. */
  importBaseline: boolean;
  /** ورود `% Complete` به‌عنوان پیشرفت اولیه (OD-16). */
  importProgress: boolean;
}

export type MappingStatus = 'auto' | 'manual' | 'warning' | 'skipped';

export interface MappingRowDto {
  id: string;
  /** نام ستون در فایل MSP. */
  mspField: string;
  mspHint: string;
  /** فیلد پروژه‌یار؛ `skip` یعنی وارد نمی‌شود. */
  target: string;
  sample: string;
  status: MappingStatus;
}

export interface ResourceRowDto {
  id: string;
  /** نام منبع در فایل. */
  name: string;
  taskCount: number;
  /** کاربر نگاشت‌شده؛ `null` یعنی بدون تطبیق. */
  userId: EntityId | null;
  userName: string | null;
  initials: string | null;
  avatarTone: string | null;
  /** `invite` یعنی برنامه‌ریز خواسته این نام دعوت شود (F01). */
  action: 'match' | 'invite' | 'skip';
}

export interface ImportSessionDto {
  id: EntityId;
  projectId: EntityId;
  projectName: string;
  projectCode: string;
  fileName: string;
  fileSizeLabel: string;
  source: AnalysisSource;
  /** وقتی فایل MPP یا XML ناخوانا بود و نمونه به‌کار رفت. */
  sourceNote: string | null;
  uploadedAt: IsoInstant;
  stats: ImportStatsDto;
  checks: ImportCheckDto[];
  options: ImportOptionsDto;
  mapping: MappingRowDto[];
  resources: ResourceRowDto[];
  weightGenerator: WeightGenerator;
  saveTemplate: boolean;
  templateName: string;
  /** تا وقتی خطای تعیین‌تکلیف‌نشده هست، ادامه مسدود است. */
  canContinue: boolean;
  blockingReason: string | null;
  /** پس از ساخت پر می‌شود. */
  builtAt: IsoInstant | null;
  rollbackUntil: IsoInstant | null;
}

/** گزینه‌های فهرست‌های تطبیق — فیلدهای پروژه‌یار و کاربران سازمان. */
export interface MappingOptionsDto {
  targets: Array<{ value: string; label: string; hint: string }>;
  users: Array<{ id: EntityId; fullName: string; initials: string; avatarTone: string }>;
  templates: Array<{ id: EntityId; name: string }>;
}

// ── پیش‌نمایش و ساخت (W49) ──

export interface PreviewNodeDto {
  id: string;
  code: string;
  title: string;
  weightInParent: Percent;
  isMilestone: boolean;
  isLeaf: boolean;
  budget: RialAmount;
  start: IsoDate;
  finish: IsoDate;
  supervisorName: string | null;
  childCount: number;
  unit: string | null;
  quantity: number | null;
  children?: PreviewNodeDto[];
}

export interface OpeningProgressRowDto {
  id: string;
  code: string;
  title: string;
  /** درصد خود فایل. */
  filePercent: Percent;
  /** درصدی که وارد می‌شود (قابل ویرایش). */
  percent: Percent;
  selected: boolean;
  method: string;
}

export interface ImportPreviewDto {
  sessionId: EntityId;
  summary: Array<{ label: string; value: string; hint: string }>;
  tree: PreviewNodeDto[];
  checks: Array<{ severity: CheckSeverity; text: string; link: { label: string; to: string } | null }>;
  openingProgress: OpeningProgressRowDto[];
  statusDate: IsoDate | null;
  /** شمار برگ‌های بدون سرپرست. */
  withoutSupervisor: number;
  totalBudget: RialAmount;
  cbsItemCount: number;
  linkCount: number;
}

export interface BuildImportRequest {
  sessionId: EntityId;
  /** درصدهای ویرایش‌شدهٔ پیشرفت اولیه. */
  openingProgress: Array<{ id: string; percent: Percent; selected: boolean }>;
}

export interface BuildImportResultDto {
  projectId: EntityId;
  itemCount: number;
  leafCount: number;
  cbsItemCount: number;
  openingItems: number;
  versionLabel: string;
  rollbackUntil: IsoInstant;
}

// ── همگام‌سازی (W36) ──

export type SyncChangeKind = 'add' | 'update' | 'delete' | 'move' | 'conflict';
export type ConflictResolution = 'keep_projeyar' | 'accept_msp';

export interface SyncChangeDto {
  id: string;
  kind: SyncChangeKind;
  kindLabel: string;
  tone: Tone;
  icon: IconName;
  code: string;
  title: string;
  /** فیلدی که عوض شده: «پایان برنامه‌ای»، «وزن در والد»، «کل آیتم». */
  field: string;
  current: string;
  incoming: string;
  /** اثر جانبی: «انحراف از −۳۳٪ به −۱۸٪ می‌رسد». */
  effect: string | null;
  effectTone: Tone | null;
  selected: boolean;
  /** فقط برای تعارض. */
  resolution: ConflictResolution | null;
  /** حذف آیتمی که گزارش تأییدشده دارد (OD-04). */
  hasApprovedReports: boolean;
}

export interface SyncSessionDto {
  id: EntityId;
  projectId: EntityId;
  fileName: string;
  uploadedByName: string;
  uploadedAt: IsoInstant;
  comparedWith: string;
  source: AnalysisSource;
  sourceNote: string | null;
  status: 'analyzing' | 'review' | 'applied' | 'blocked';
  /** AC-MS-12: بازنگری کاری دستی باز ← مسدود. */
  blockedReason: string | null;
  changes: SyncChangeDto[];
  counts: Array<{ kind: SyncChangeKind | 'date' | 'weight' | 'title'; label: string; count: number; tone: Tone }>;
  /** اثر تغییرهای انتخاب‌شده روی پروژه. */
  impact: Array<{ label: string; before: string; after: string; tone: Tone }>;
  nextRevisionNumber: number;
  /** جهت دوم: پیشرفت‌های آمادهٔ ارسال. */
  pendingExport: { count: number; sinceLabel: string };
}

export interface ApplySyncResultDto {
  versionId: EntityId;
  number: number;
  appliedCount: number;
  /** آیتم‌های در صف گوشی که بلاتکلیف شدند (AC-MS-11). */
  needsResolution: number;
}

// ── خروجی به MSP (۷.۴) ──

export interface ProgressExportRowDto {
  id: string;
  uid: number | null;
  code: string;
  title: string;
  percent: Percent;
  asOfDate: IsoDate;
  actualStart: IsoDate | null;
  actualFinish: IsoDate | null;
  /** برگ ساخته‌شده در پروژه‌یار بدون UID — به پیشنهاد ساختاری می‌رود. */
  withoutUid: boolean;
}

export interface ExportPreviewDto {
  projectId: EntityId;
  fileName: string;
  rows: ProgressExportRowDto[];
  /** پیشنهادهای تغییر ساختاری که در فایل نوشته نمی‌شوند (۷.۴). */
  proposals: Array<{ id: string; code: string; title: string; text: string }>;
  sinceLabel: string;
  /** جایگزینی تقویم پروژه‌یار در فایل، فقط با تیک. */
  calendarReplaceable: boolean;
}

export interface ExportRequest {
  projectId: EntityId;
  replaceCalendar: boolean;
}

export interface ExportResultDto {
  fileName: string;
  xml: string;
  exportedCount: number;
}

/** یک ردیف جدول CBS ساخته‌شده از فایل — فقط برای پیش‌نمایش W49. */
export interface ImportCbsRowDto {
  code: string;
  title: string;
  costType: CostType;
  budget: RialAmount;
}
