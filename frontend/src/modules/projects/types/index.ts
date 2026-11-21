import type {
  Computed,
  EntityId,
  IsoDate,
  IsoInstant,
  Percent,
  RialAmount,
} from '@/shared/types/api';
import type { PlanVersionKind, PlanVersionSource, ProjectStatus } from '@/config/constants';

// تایپ‌ها از `design/02-domain-model.md` بخش ۳ و ۷ و `design/features/project-setup.md` بخش ۴.
// نام فیلدها عیناً از سند گرفته شده تا نگاشت به DTO بک‌اند یک‌به‌یک باشد.

/** `ProjectType` — پایه؛ فهرست سازمان (F02 ۴). */
export interface ProjectTypeDto {
  id: EntityId;
  name: string;
  active: boolean;
}

/** Project — پایه (۰۲ بخش ۳ + افزوده‌های F02 ۴). */
export interface ProjectDto {
  id: EntityId;
  /** C05: `PRJ-<سال شمسی>-<سه رقم>`؛ تغییرناپذیر. */
  code: string;
  name: string;
  clientName: string;
  projectTypeId: EntityId;
  description: string | null;
  status: ProjectStatus;
  managerUserId: EntityId;
  siteLat: number | null;
  siteLng: number | null;
  /** پیش‌فرض ۳۰۰. */
  gpsRadiusM: number;
  location: string | null;
  imageKey: string | null;
  plannedStart: IsoDate | null;
  plannedFinish: IsoDate | null;
  /** بودجهٔ کل ورودی ویزارد؛ تا پیش از فعال‌سازی راهنماست. */
  plannedTotalBudget: RialAmount | null;
  /** ذخیرهٔ احتیاطی، بیرون از CBS و BAC. */
  contingencyReserve: RialAmount;
  displayCurrencyUnit: 'rial' | 'toman';
  baselineVersionId: EntityId | null;
  currentVersionId: EntityId | null;
  pvReferenceVersionId: EntityId | null;
  /** آیا برنامه از MSP می‌آید (D05). */
  mspLinked: boolean;
  activatedAt: IsoInstant | null;
  pausedAt: IsoInstant | null;
  completedAt: IsoInstant | null;
  archivedAt: IsoInstant | null;
  /** تاریخ کامل بودن هزینه‌ها (OD-19). */
  costsCompleteThrough: IsoDate | null;
}

/**
 * ProjectProgress — مشتق (۰۲ بخش ۷). فقط ماژول محاسبات می‌نویسد.
 *
 * D07: صفحه‌ها هیچ‌کدام از این مقادیر را حساب نمی‌کنند؛ فقط می‌خوانند.
 * مبالغ بدون `cbs.view_amounts` در لایهٔ خروجی API حذف می‌شوند (D11)،
 * پس همه اختیاری‌اند.
 */
export interface ProjectProgressDto extends Computed {
  dataDate: IsoDate;
  plannedPercent: Percent;
  actualPercent: Percent;
  /** پیشرفت ریالی = EV ÷ BAC. */
  financialPercent: Percent;
  /** انحراف به واحد درصد = واقعی − برنامه‌ای (C04). */
  deviation: Percent;
  bac?: RialAmount;
  pv?: RialAmount;
  ev?: RialAmount;
  ac?: RialAmount;
  eac?: RialAmount;
  /** نسبت‌ها مبلغ حساب نمی‌شوند (F01 ۵.۵) — همیشه می‌آیند. */
  cpi: number | null;
  spi: number | null;
  forecastFinish: IsoDate | null;
  delayDays: number | null;
  /** تاریخ محاسبهٔ شاخص‌های هزینه، `min(dataDate, costsCompleteThrough)` (ب25). */
  costIndicesDate: IsoDate | null;
}

/** خلاصهٔ شخص برای نمایش — مدیر پروژه و اعضا. */
export interface PersonRef {
  id: EntityId;
  fullName: string;
  /** یکی از `a1`…`a8` kit.css؛ از سرور یا پایدار از نام. */
  avatarTone?: string;
}

/**
 * ردیف فهرست پروژه‌ها (W07، W08) — مدل خواندنی که `GET /projects` برمی‌گرداند.
 *
 * ترکیبی از `Project`، خلاصهٔ `ProjectProgress` و چند مقدار نمایشی که
 * ب24 «تجمیع ساده» را مجاز می‌داند. هیچ‌کدام در فرانت حساب نمی‌شود.
 */
export interface ProjectListItemDto {
  id: EntityId;
  code: string;
  name: string;
  clientName: string;
  projectTypeId: EntityId;
  /** نام نوع از فهرست سازمان — مثل `manager` برای خواندن ساده در فهرست آمده است. */
  projectTypeName: string;
  status: ProjectStatus;
  manager: PersonRef;
  /** چند عضو اول برای ردیف آواتار کارت‌ها. */
  memberPreview: PersonRef[];
  memberCount: number;
  plannedFinish: IsoDate | null;
  mspLinked: boolean;
  /** `null` برای پیش‌نویس — پیشرفتی هنوز محاسبه نشده. */
  progress: ProjectProgressDto | null;
  /** درصد مصرف بودجه = AC ÷ BAC؛ بدون `cbs.view_amounts` نمی‌آید. */
  budgetConsumedPercent?: Percent;
  /**
   * شاخص «در خطر» (ب24): انحراف ≤ −۱۵ یا CPI < ۰٫۹، فقط برای پروژه‌های فعال.
   * **وضعیت نیست** — `status` همچنان یکی از پنج مقدار ۰۲ بخش ۳ است.
   */
  atRisk: boolean;
  /** پیش‌نویس ویزاردِ تمام‌نشده؛ فقط برای سازنده دیده می‌شود (F02 ۵.۵). */
  wizardIncomplete: boolean;
}

/** شاخص‌های پرتفوی برای نوار آمار W07 (ب24). */
export interface PortfolioSummaryDto extends Computed {
  totalCount: number;
  countByStatus: Record<ProjectStatus, number>;
  /** میانگین پیشرفت واقعی پروژه‌های فعال. */
  avgActualPercent: Percent;
  /** تغییر نسبت به ماه گذشته، به واحد درصد. */
  avgActualPercentDelta: number;
  totalBac?: RialAmount;
  totalAc?: RialAmount;
  totalAcPercent?: Percent;
  atRiskCount: number;
  atRiskDelta: number;
}

/** پارامترهای `GET /projects?status=&q=` (F02 ۱۲). */
export interface ProjectListParams {
  status?: ProjectStatus;
  q?: string;
}

// ── جزئیات پروژه و پوستهٔ پروژه (W10 و همهٔ زبانه‌ها) ──

/** ارجاع خلاصه به یک `PlanVersion` (۰۲ بخش ۴) — برای نمایش «مبنا / R2». */
export interface PlanVersionRef {
  id: EntityId;
  kind: PlanVersionKind;
  /** مبنا = ۰؛ بازنگری‌ها ۱، ۲، … */
  number: number;
  source: PlanVersionSource;
  appliedAt: IsoInstant | null;
}

/**
 * خلاصهٔ نسخهٔ کاری (`GET /projects/:pid/plan-draft`، F04 ۱۲).
 * در پروژهٔ پیش‌نویس همان مبنای کاری است (`kind = baseline`).
 */
export interface PlanDraftSummary {
  versionId: EntityId;
  kind: PlanVersionKind;
  number: number;
  draftRevision: number;
  changeCount: number;
  lastSavedAt: IsoInstant;
  lastSavedBy: PersonRef;
}

/** وضعیت نسخه‌های برنامهٔ پروژه — D05، `features/plan-versions.md` ۲. */
export interface ProjectPlanState {
  baseline: PlanVersionRef | null;
  /** آخرین نسخهٔ اعمال‌شده؛ جدول‌های جاری آینهٔ آن‌اند. */
  current: PlanVersionRef | null;
  /** مبنای PV و انحراف‌ها؛ پیش‌فرض مبنا (W29). */
  pvReference: PlanVersionRef | null;
  /** حداکثر یک نسخهٔ کاری در هر لحظه. */
  draft: PlanDraftSummary | null;
}

/** شمارنده‌های زبانه‌های سربرگ پروژه. */
export interface ProjectNavCounts {
  /** آیتم‌های گزارش در انتظار تأیید در این پروژه. */
  pendingReports: number;
  /** ریسک‌های باز (identified + assessed + in_action). */
  openRisks: number;
  /** ریسک‌های باز با سطح بالا یا بحرانی. */
  openHighRisks: number;
  members: number;
  /**
   * فقط پروژهٔ متصل به MSP: پیشنهادهای تغییر منتظر + پیشرفت صادرنشده — عدد دکمهٔ
   * «همگام‌سازی با MSP» در W11 (`features/wbs.md` ۸). `[پیش‌فرض فنی]` جای این عدد.
   */
  mspPendingChanges: number | null;
}

/**
 * `GET /projects/:pid` — مدل خواندنی پوستهٔ پروژه.
 * ردیف فهرست + فیلدهای کامل `Project` + خلاصهٔ نسخه‌ها و چند تنظیم نمایشی.
 */
export interface ProjectDetailDto
  extends ProjectListItemDto,
    Omit<ProjectDto, keyof ProjectListItemDto> {
  plan: ProjectPlanState;
  counts: ProjectNavCounts;
  /** زیرمجموعهٔ `ProjectSettings` که صفحه‌های خواندنی لازم دارند. */
  display: {
    warningThreshold: number;
    criticalThreshold: number;
    /** D04: پیشرفت ریالی کنار فیزیکی (W29 «هر دو شاخص»). */
    showFinancialProgress: boolean;
  };
}

/** یک بند پیش‌شرط یا هشدار فعال‌سازی (F02 ۸.۱). */
export interface ActivationCheckItem {
  code: string;
  label: string;
  passed: boolean;
  /** توضیح وقتی رد شده: کدام گروه، چند برگ. */
  detail: string | null;
  /** زبانه‌ای که مشکل آنجا رفع می‌شود. */
  fixAt: 'wbs' | 'cbs' | 'links' | 'members' | 'assignment' | 'settings' | 'calendar' | null;
}

/** `GET /projects/:pid/activation-check` — F02 ۸.۱ و ۱۲. */
export interface ActivationCheckDto {
  canActivate: boolean;
  /** پیش‌شرط‌های مانع — همه باید `passed` باشند. */
  blockers: ActivationCheckItem[];
  /** هشدارها مانع نیستند ولی همه نمایش داده می‌شوند و باید دیده شوند. */
  warnings: ActivationCheckItem[];
}
