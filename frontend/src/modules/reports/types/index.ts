import type { FieldReportItemStatus, LeafMeasurementMethod, ReportFlag } from '@/config/constants';
import type { EntityId, IsoDate, IsoInstant, Percent } from '@/shared/types/api';
import type { PersonRef } from '@/modules/projects/types';

// F09 — گزارش کارگاه و تأیید (`features/approval-workflow.md`، `02-domain-model.md` ۶).
// همهٔ درصدها، تغییر، پرچم‌ها، مرحلهٔ دوم، مهلت و «معوق» را سرور می‌سازد (D07)؛ صفحه فقط
// نمایش می‌دهد. وضعیت گزارش ذخیره نمی‌شود و از آیتم‌ها مشتق است (D08).

/** یک آیتم گزارش در صف تأیید کاربر جاری (مرحلهٔ اول یا دوم) — W05. */
export interface PendingApprovalDto {
  itemId: EntityId;
  reportId: EntityId;
  projectId: EntityId;
  projectName: string;
  wbsItemId: EntityId;
  wbsCode: string;
  wbsTitle: string;
  submittedBy: PersonRef | null;
  submittedAt: IsoInstant;
  /** درصد تجمعی پس از این آیتم (`computedPercent`). */
  toPercent: Percent;
  /** از مهلت تأیید پروژه (`reviewDeadlineHours`، W29) گذشته است — تصمیم 1405/08/15. */
  overdue: boolean;
}

export type InboxTab = 'pending' | 'approved' | 'needs_revision' | 'rejected' | 'all';
export type ReportSource = 'app' | 'web_manual' | 'import_opening' | 'correction';

export interface FieldPhotoDto {
  id: EntityId;
  /** مهر زمان روی عکس (M07). */
  takenAt: IsoInstant;
  caption: string | null;
  /** فاصله از مرکز کارگاه از مهر مکان عکس. */
  distanceM: number | null;
  uploadStatus: 'pending' | 'complete';
  markedUnsuitable: boolean;
}

export interface RequiredActionDto {
  key: string;
  text: string;
  type: 'check' | 'photo';
  minPhotos?: number;
}

export type ReviewDecision = 'approve' | 'request_revision' | 'reject' | 'auto_approve' | 'revoke_auto' | 'escalate' | 'resolve_assignment';

export interface ReviewDto {
  id: EntityId;
  stage: 1 | 2;
  decision: ReviewDecision | null;
  /** تهی برای تأیید خودکار و مرحلهٔ باز. */
  reviewer: PersonRef | null;
  /** تأییدکنندهٔ مسئول این مرحله (پیش از تصمیم). */
  assignee: PersonRef | null;
  note: string | null;
  requiredActions: RequiredActionDto[] | null;
  dueAt: IsoInstant;
  decidedAt: IsoInstant | null;
  escalatedTo: PersonRef | null;
}

export interface FieldStepValueDto {
  key: string;
  title: string;
  weight: Percent;
  fromPercent: Percent;
  toPercent: Percent;
}

export interface FieldItemDto {
  id: EntityId;
  reportId: EntityId;
  projectId: EntityId;
  wbsItemId: EntityId;
  wbsCode: string;
  wbsTitle: string;
  method: Exclude<LeafMeasurementMethod, 'time_based'>;
  unit: string | null;
  totalQuantity: number | null;
  /** روش مقداری: مقدار امروز. */
  quantityToday: number | null;
  /** روش درصدی: مقدار اطلاعاتی. */
  reportedQuantityInfo: number | null;
  stepsProgress: FieldStepValueDto[] | null;
  lastApprovedPercent: Percent;
  computedPercent: Percent;
  deltaPercent: Percent;
  plannedPercentAtDate: Percent;
  /** `computedPercent − plannedPercentAtDate` (۳.۱). */
  deviationAfter: Percent;
  status: FieldReportItemStatus;
  currentStage: 1 | 2 | null;
  requiresStage2: boolean;
  autoApproved: boolean;
  flags: ReportFlag[];
  /** شرح هر پرچم از سرور: «جهش غیرعادی: +۳۵٪ در یک روز…». */
  flagMessages: string[];
  revisionCount: number;
  supersedesItemId: EntityId | null;
  supersededBy: EntityId | null;
  crewCount: number | null;
  note: string | null;
  approvedAt: IsoInstant | null;
  photos: FieldPhotoDto[];
  reviews: ReviewDto[];
  /** مهلت مرحلهٔ باز. */
  dueAt: IsoInstant | null;
  overdue: boolean;
  /** آیتم ناتمام (ثبت دستی خود کاربر) نزد چه کسی است — AC-AP-11. */
  heldBy: PersonRef | null;
  /** علت تعیین تکلیف (۴.۸). */
  resolution: 'leaf_removed' | 'reassigned' | null;
  can: { decide: boolean; revokeAuto: boolean; correct: boolean; resolve: boolean };
}

export interface FieldReportSummaryDto {
  id: EntityId;
  reportNo: string;
  projectId: EntityId;
  projectName: string;
  source: ReportSource;
  workDate: IsoDate;
  author: PersonRef;
  serverReceivedAt: IsoInstant;
  offline: boolean;
  itemCount: number;
  /** شمار آیتم‌ها در هر زبانه (به جز «همه»). */
  counts: Record<Exclude<InboxTab, 'all'>, number>;
  flagged: boolean;
  /** پرچم برجستهٔ گزارش برای ردیف فهرست: «جهش +۳۵٪». */
  flagLabel: string | null;
  photoCount: number;
  /** قدیمی‌ترین انتظار آیتم باز — برای مرتب‌سازی «قدیمی‌ترین انتظار». */
  waitingSince: IsoInstant | null;
}

export interface FieldReportDto extends FieldReportSummaryDto {
  deviceRecordedAt: IsoInstant;
  /** فاصلهٔ ثبت تا دریافت به دقیقه. */
  delayMinutes: number;
  appVersion: string | null;
  weather: string | null;
  temperatureC: number | null;
  /** جمع نفرات آیتم‌ها (OD-05). */
  crewCount: number | null;
  distanceFromSiteM: number | null;
  siteRadiusM: number;
  gpsAccuracyM: number | null;
  /** مهر مکان گزارش (`02-domain-model.md` ۶: `gpsLat`، `gpsLng`). */
  gpsLat: number | null;
  gpsLng: number | null;
  /** جهت نقطهٔ گزارش از مرکز کارگاه، از شمال و ساعتگرد — در سرور محاسبه می‌شود. */
  gpsBearingDeg: number | null;
  /** مرکز کارگاه پروژه، برای طرح شعاع و نقشه. */
  siteLat: number | null;
  siteLng: number | null;
  note: string | null;
  attested: boolean;
  items: FieldItemDto[];
}

export interface InboxQuery {
  /** `null` = صندوق میان‌پروژه‌ای (۵.۱). */
  projectId: EntityId | null;
  tab: InboxTab;
  supervisorId: EntityId | null;
  /** زیردرخت WBS (فقط با یک پروژه). */
  wbsRootId: EntityId | null;
  wbsItemId: EntityId | null;
  range: '7d' | '30d' | 'all';
  flagged: boolean;
  sort: 'newest' | 'oldest_waiting';
}

export interface InboxDto {
  reports: FieldReportSummaryDto[];
  tabCounts: Record<InboxTab, number>;
  flaggedCount: number;
  kpis: {
    pendingItems: number;
    pendingReports: number;
    pendingProjects: number;
    overdueItems: number;
    approvedByMeToday: number;
    returnedItems: number;
    returnedReports: number;
  };
  filters: {
    projects: Array<{ id: EntityId; name: string }>;
    supervisors: PersonRef[];
    wbsRoots: Array<{ id: EntityId; code: string; title: string }>;
  };
}

export interface DecisionRequest {
  projectId: EntityId;
  itemId: EntityId;
  decision: 'approve' | 'request_revision' | 'reject';
  note?: string | null;
  requiredActions?: RequiredActionDto[];
  unsuitablePhotoIds?: EntityId[];
  /** تأیید آیتم «فراتر از مقدار کل» پیام تأییدی دارد (۹.۳). */
  confirmOverTotal?: boolean;
}

export interface DecisionResultDto {
  item: FieldItemDto;
  /** پیام سرور، مثل رفتن به مرحلهٔ دوم پس از دوباره‌ارزیابی (۳.۳). */
  message: string | null;
}

export interface ApproveCleanResultDto {
  approved: number;
  movedToStage2: number;
  skipped: number;
}

export interface FieldValuesInput {
  quantityToday?: number | null;
  reportedPercent?: number | null;
  reportedQuantityInfo?: number | null;
  steps?: Record<string, number> | null;
}

export interface ManualEntryRequest extends FieldValuesInput {
  projectId: EntityId;
  wbsItemId: EntityId;
  workDate: IsoDate;
  note: string;
}

/** `GET /projects/:pid/wbs/:itemId/report-context` — آنچه فرم G10 و اصلاح لازم دارد. */
export interface LeafReportContextDto {
  wbsItemId: EntityId;
  code: string;
  title: string;
  method: LeafMeasurementMethod;
  unit: string | null;
  totalQuantity: number | null;
  approvedPercent: Percent;
  approvedQuantity: number | null;
  steps: Array<{ key: string; title: string; weight: Percent; approvedPercent: Percent }> | null;
}
