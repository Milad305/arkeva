import { SYSTEM_ROLES, type SystemRole } from '@projeyar/shared';

import type { Tone } from '@/shared/types/tone';

// ثابت‌ها و واژگان دامنه — برگرفته از `design/01-foundation-decisions.md` و فایل‌های ویژگی.
//
// قاعدهٔ D07: هیچ فرمول کسب‌وکاری اینجا نیست. این فایل فقط واژگان، برچسب‌ها و
// **پیش‌فرض‌ها** را دارد؛ مقدار مؤثر هر پارامتر از تنظیمات پروژه می‌آید.
//
// برچسب‌های مخصوص یک ماژول وقتی آن ماژول ساخته شد به `modules/<name>/types/` منتقل می‌شوند.

export const APP_NAME = 'پروژه‌یار';

// ────────────────────────────────────────────────────────────
// روش اندازه‌گیری پیشرفت برگ  (D03 + D03-الف)
// ────────────────────────────────────────────────────────────
// هر برگ WBS دقیقاً یکی از این‌ها را دارد. این با «مولد وزن» پایین فرق دارد.

export const LEAF_MEASUREMENT_METHODS = {
  quantity: 'مقداری',
  percent: 'درصدی',
  steps: 'گام‌های وزنی',
  time_based: 'پیشرفت زمانی',
} as const;

export type LeafMeasurementMethod = keyof typeof LEAF_MEASUREMENT_METHODS;

export const LEAF_MEASUREMENT_HINTS: Record<LeafMeasurementMethod, string> = {
  quantity: 'سرپرست مقدار انجام‌شدهٔ امروز را ثبت می‌کند؛ مقادیر روزانه جمع می‌شوند.',
  percent: 'سرپرست درصد تجمعی را ثبت می‌کند؛ آخرین درصد تأییدشده مرجع است.',
  steps: 'هر گام وزن خودش را دارد؛ درصد برگ از جمع وزن‌دار گام‌ها می‌آید.',
  time_based:
    'برای هزینه‌های غیرمستقیم؛ پیشرفت واقعی برابر برنامه‌ای است و گزارش کارگاه ندارد.',
};

/** برگ `time_based` سرپرست و گزارش کارگاه ندارد و در اپ دیده نمی‌شود (D03-الف). */
export const REPORTABLE_METHODS: LeafMeasurementMethod[] = ['quantity', 'percent', 'steps'];

// ────────────────────────────────────────────────────────────
// مولد وزن  (D04)
// ────────────────────────────────────────────────────────────
// این‌ها فقط وزن تولید می‌کنند؛ بعد از تولید، تجمیع همیشه یک فرمول دارد.

export const WEIGHT_GENERATORS = {
  manual: 'وزن دستی',
  cost: 'از هزینه',
  duration: 'از مدت',
  equal: 'مساوی',
} as const;

export type WeightGenerator = keyof typeof WEIGHT_GENERATORS;

export const WEIGHT_GENERATOR_HINTS: Record<WeightGenerator, string> = {
  manual: 'وزن هر آیتم را خودتان وارد می‌کنید؛ جمع فرزندان هر والد باید ۱۰۰ باشد.',
  cost: 'وزن از سهم بودجهٔ هر آیتم ساخته می‌شود؛ برگ‌های «پیشرفت زمانی» وزن صفر می‌گیرند.',
  duration: 'وزن از روزهای کاری برنامه‌ای هر آیتم در تقویم پروژه ساخته می‌شود.',
  equal: 'همهٔ هم‌سطح‌ها وزن برابر می‌گیرند.',
};

/**
 * «هر دو شاخص» روش وزن‌دهی **نیست** (D04).
 * یک تنظیم نمایشی است که پیشرفت فیزیکی و ریالی (EV ÷ BAC) را کنار هم نشان می‌دهد.
 */
export const SHOW_FINANCIAL_PROGRESS_LABEL = 'نمایش پیشرفت ریالی کنار پیشرفت فیزیکی';

/** جمع وزن فرزندان هر والد باید دقیقاً این مقدار باشد (D04). */
export const WEIGHT_SUM = 100;

// ────────────────────────────────────────────────────────────
// آستانه‌های انحراف  (04-alert-engine.md ۲.۴ و ۳.۱)
// ────────────────────────────────────────────────────────────
/**
 * این‌ها فقط **پیش‌فرض کد** هستند. ترتیب غلبه: پیش‌فرض کد ← پیش‌فرض سازمان ← تنظیم پروژه.
 * UI باید همان آستانه‌ای را برای رنگ‌بندی به‌کار ببرد که موتور هشدار استفاده کرده،
 * وگرنه رنگ ردیف با هشدار نمی‌خواند.
 */
export const DEVIATION_DEFAULTS = {
  warningThreshold: 5,
  criticalThreshold: 15,
} as const;

export interface DeviationThresholds {
  warningThreshold: number;
  criticalThreshold: number;
}

// ────────────────────────────────────────────────────────────
// ریسک  (AL-RSK-01)
// ────────────────────────────────────────────────────────────
export const RISK_LEVELS = {
  MEDIUM_MIN: 9,
  HIGH_MIN: 15,
  CRITICAL_MIN: 20,
  MAX: 25,
} as const;

/** `Risk.level` — مشتق از امتیاز، سرور ذخیره می‌کند (۰۲ بخش ۹). */
export const RISK_LEVEL = {
  low: 'کم',
  medium: 'متوسط',
  high: 'بالا',
  critical: 'بحرانی',
} as const;

export type RiskLevel = keyof typeof RISK_LEVEL;

export const RISK_LEVEL_TONES: Record<RiskLevel, Tone> = {
  low: 'pri',
  medium: 'wrn',
  high: 'err',
  critical: 'err',
};

/** `Risk.status` — OD-10، `features/risk.md` ۵.۱. «باز» = سه وضعیت اول. */
export const RISK_STATUS = {
  identified: 'ارزیابی‌نشده',
  assessed: 'ارزیابی‌شده',
  in_action: 'در اقدام',
  occurred: 'رخ‌داده',
  closed: 'بسته‌شده',
} as const;

export type RiskStatus = keyof typeof RISK_STATUS;

export const RISK_STATUS_TONES: Record<RiskStatus, Tone> = {
  identified: 'neu',
  assessed: 'neu',
  in_action: 'inf',
  occurred: 'err',
  closed: 'ok',
};

// ────────────────────────────────────────────────────────────
// گزارش کارگاه  (D08 · D10)
// ────────────────────────────────────────────────────────────
/** پیش‌فرض‌ها؛ همه در W29 قابل تنظیم‌اند. */
export const REPORT_RULE_DEFAULTS = {
  /** تأیید خودکار: تغییر کمتر از این مقدار، با عکس کافی و GPS معتبر. */
  autoApproveBelowPoints: 2,
  /** حداقل عکس؛ کمتر از این پرچم «عکس ناکافی» می‌گیرد. */
  minPhotos: 2,
  /** شعاع مجاز کارگاه بر حسب متر. */
  siteRadiusMeters: 300,
  /** جهش بیش از این مقدار در یک گزارش پرچم «جهش غیرعادی» می‌گیرد. */
  abnormalJumpPoints: 20,
  /** مهلت هر مرحلهٔ بررسی؛ پس از آن یادآوری یا ارجاع به جایگزین. */
  reviewDeadlineHours: 24,
} as const;

/**
 * شرط‌های رفتن به مرحلهٔ دوم تأیید (D08).
 * گردش‌کار **یک‌مرحله‌ای** است و مرحلهٔ دوم فقط با برقراری یکی از این‌ها فعال می‌شود.
 */
export const SECOND_STAGE_TRIGGERS = {
  /** تغییر بیش از آستانهٔ بحرانی. */
  aboveCriticalThreshold: true,
  abnormalJump: true,
  gpsOutOfRange: true,
  /** فقط پروژه‌های متصل به MSP؛ پیش‌فرض خاموش. */
  onCriticalPath: false,
} as const;

/** آفلاین در اپ سرپرست (D10). */
export const OFFLINE_RULES = {
  /** فاصلهٔ ثبت در گوشی تا دریافت در سرور؛ بیشتر از این پرچم «ثبت با تأخیر». گزارش حذف نمی‌شود. */
  lateSubmissionHours: 72,
} as const;

/** ماشین حالت آیتم گزارش (D08). فقط `approved` روی پیشرفت اثر دارد. */
export const FIELD_REPORT_ITEM_STATUS = {
  draft: 'پیش‌نویس',
  queued: 'در صف ارسال',
  submitted: 'ارسال‌شده',
  stage1: 'در انتظار تأیید ناظر',
  stage2: 'در انتظار تأیید نهایی',
  approved: 'تأییدشده',
  needs_revision: 'نیاز اصلاح',
  rejected: 'رد شده',
  needs_resolution: 'نیاز تعیین تکلیف',
  superseded: 'جایگزین‌شده',
} as const;

export type FieldReportItemStatus = keyof typeof FIELD_REPORT_ITEM_STATUS;

export const FIELD_REPORT_ITEM_STATUS_TONES: Record<FieldReportItemStatus, Tone> = {
  draft: 'neu',
  queued: 'neu',
  submitted: 'inf',
  stage1: 'inf',
  stage2: 'inf',
  approved: 'ok',
  needs_revision: 'wrn',
  rejected: 'err',
  needs_resolution: 'wrn',
  superseded: 'neu',
};

/** حالت‌هایی که فقط در گوشی وجود دارند و در پنل وب دیده نمی‌شوند. */
export const DEVICE_ONLY_STATUSES: FieldReportItemStatus[] = ['draft', 'queued'];

/** پرچم‌های کنترل گزارش. */
export const REPORT_FLAGS = {
  abnormal_jump: 'جهش غیرعادی',
  insufficient_photos: 'عکس ناکافی',
  gps_out_of_range: 'خارج از محدوده',
  late_submission: 'ثبت با تأخیر',
  over_total_quantity: 'فراتر از مقدار کل',
  carried_effect: 'اثر منتقل‌شده',
  // approval-workflow.md ۳.۲ — بقیهٔ پرچم‌های آیتم
  photos_pending: 'عکس در حال بارگذاری',
  decrease: 'کاهش درصد',
  mock_location: 'مکان جعلی',
  clock_skew: 'ساعت گوشی نامعتبر',
  photo_time_mismatch: 'زمان عکس ناهمخوان',
  needs_resolution: 'نیاز تعیین تکلیف',
  method_conversion: 'تبدیل روش',
} as const;

export type ReportFlag = keyof typeof REPORT_FLAGS;

// ────────────────────────────────────────────────────────────
// پروژه و نسخهٔ برنامه  (D05)
// ────────────────────────────────────────────────────────────
export const PROJECT_STATUS = {
  draft: 'پیش‌نویس',
  active: 'فعال',
  paused: 'متوقف',
  completed: 'تمام‌شده',
  archived: 'بایگانی',
} as const;

export type ProjectStatus = keyof typeof PROJECT_STATUS;

export const PROJECT_STATUS_TONES: Record<ProjectStatus, Tone> = {
  draft: 'neu',
  active: 'ok',
  paused: 'wrn',
  completed: 'pri',
  archived: 'neu',
};

/**
 * جدول‌های جاری فقط با **اعمال یک نسخه** تغییر می‌کنند (D05).
 * هر صفحهٔ ویرایش ساختار در واقع نسخهٔ پیش‌نویس را ویرایش می‌کند، نه درخت جاری.
 */
/** `PlanVersion.kind` — ۰۲ بخش ۴. «پیش‌نویس» نوع نیست، وضعیت است. */
export const PLAN_VERSION_KIND = {
  baseline: 'برنامهٔ مبنا',
  revision: 'بازنگری',
} as const;

export type PlanVersionKind = keyof typeof PLAN_VERSION_KIND;

/** `PlanVersion.status` — ۰۲ بخش ۴. */
export const PLAN_VERSION_STATUS = {
  draft: 'نسخهٔ کاری',
  applied: 'اعمال‌شده',
  discarded: 'کنار گذاشته',
} as const;

export type PlanVersionStatus = keyof typeof PLAN_VERSION_STATUS;

/** `PlanVersion.source` — ۰۲ بخش ۴. */
export const PLAN_VERSION_SOURCE = {
  wizard: 'ویزارد',
  template: 'قالب',
  manual_edit: 'ویرایش دستی',
  msp_import: 'ورود MSP',
  msp_sync: 'همگام‌سازی MSP',
  budget_revision: 'بازنگری بودجه',
} as const;

export type PlanVersionSource = keyof typeof PLAN_VERSION_SOURCE;

// ────────────────────────────────────────────────────────────
// پیشرفت آیتم  (۰۲ بخش ۷ — WbsItemProgress.status)
// ────────────────────────────────────────────────────────────
/** وضعیت را موتور محاسبه از آستانه‌های پروژه می‌سازد؛ فرانت فقط برچسب می‌زند. */
export const WBS_PROGRESS_STATUS = {
  not_started: 'شروع‌نشده',
  on_track: 'طبق برنامه',
  ahead: 'جلوتر از برنامه',
  warning: 'هشدار',
  critical: 'بحرانی',
  completed: 'تمام‌شده',
} as const;

export type WbsProgressStatus = keyof typeof WBS_PROGRESS_STATUS;

export const WBS_PROGRESS_STATUS_TONES: Record<WbsProgressStatus, Tone> = {
  not_started: 'neu',
  on_track: 'pri',
  ahead: 'ok',
  warning: 'wrn',
  critical: 'err',
  completed: 'ok',
};

// ────────────────────────────────────────────────────────────
// هشدار  (D09)
// ────────────────────────────────────────────────────────────
export const ALERT_SEVERITY = {
  info: 'اطلاع',
  warning: 'هشدار',
  critical: 'بحرانی',
} as const;

export type AlertSeverity = keyof typeof ALERT_SEVERITY;

export const ALERT_SEVERITY_TONES: Record<AlertSeverity, Tone> = {
  info: 'inf',
  warning: 'wrn',
  critical: 'err',
};

export const ALERT_STATUS = {
  open: 'باز',
  seen: 'دیده‌شده',
  resolved: 'رفع‌شده',
  dismissed: 'رد‌شده',
} as const;

export type AlertStatus = keyof typeof ALERT_STATUS;

// ────────────────────────────────────────────────────────────
// نقش‌ها  (features/access-control.md ۵.۴)
// ────────────────────────────────────────────────────────────
// نقش‌های سیستمی در بستهٔ مشترک‌اند (یک منبع با بک‌اند)؛ رنگ‌ها کار رابط کاربری است و اینجا می‌ماند.
export { SYSTEM_ROLES, type SystemRole };

export const SYSTEM_ROLE_TONES: Record<SystemRole, Tone> = {
  org_admin: 'vio',
  project_manager: 'acc',
  planner: 'pri',
  reviewer: 'inf',
  supervisor: 'ok',
  client_reviewer: 'cya',
  finance: 'wrn',
};

// ────────────────────────────────────────────────────────────
// نوع هزینه و مصرف بودجه
// ────────────────────────────────────────────────────────────
/** آستانه‌های رنگ نوار مصرف بودجهٔ قلم CBS (AL-CST-01 پیش‌فرض ۹۰٪). */
export const CBS_CONSUMPTION_THRESHOLDS = {
  LOW: 50,
  MEDIUM: 80,
  HIGH: 90,
  CRITICAL: 100,
} as const;

// ────────────────────────────────────────────────────────────
// رابط کاربری
// ────────────────────────────────────────────────────────────
export const PAGE_SIZE_OPTIONS = [8, 20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 8;

/** مدت نمایش پیام کوتاه؛ پیام خطا تا بستن دستی می‌ماند (W46). */
export const TOAST_DURATION_MS = 5000;


/** پایان نشست وب پس از بی‌فعالیتی (features/access-control.md ۵.۱). */
export const WEB_SESSION_IDLE_MINUTES = 30;
