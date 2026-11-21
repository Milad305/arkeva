// ثابت‌های سراسری اپلیکیشن

export const APP_NAME = 'پروژه‌یار';

// نگاشت نقش‌های پروژه‌ای (مطابق designs/Members.html)
export const MEMBER_ROLE_LABELS = {
  manager: 'مدیر پروژه',
  monitor: 'ناظر',
  supervisor: 'سرپرست کارگاه',
  planner: 'برنامه‌ریز',
} as const;

export const MEMBER_ROLE_COLORS = {
  manager: 'bg-accent-100 text-accent-700',
  monitor: 'bg-info-50 text-info-700',
  supervisor: 'bg-success-50 text-success-700',
  planner: 'bg-primary-100 text-primary-700',
} as const;

// وضعیت پروژه (مطابق designs/Projects.html)
export const PROJECT_STATUS_LABELS = {
  draft: 'پیش‌نویس',
  active: 'فعال',
  paused: 'متوقف',
  completed: 'تمام‌شده',
  archived: 'آرشیو',
} as const;

export const PROJECT_STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-success-50 text-success-700',
  paused: 'bg-warning-50 text-warning-700',
  completed: 'bg-primary-100 text-primary-700',
  archived: 'bg-gray-100 text-gray-600',
} as const;

// نوع هزینه CBS (مطابق designs/Links.html — ۶ مقدار)
export const COST_TYPE_LABELS = {
  material: 'مصالح',
  labor: 'نیروی انسانی',
  equip: 'تجهیزات',
  sub: 'پیمانکار جزء',
  overhead: 'سربار',
  transport: 'حمل و نقل',
} as const;

export const COST_TYPE_COLORS = {
  material: 'bg-primary-100 text-primary-700',
  labor: 'bg-accent-100 text-accent-700',
  equip: 'bg-success-50 text-success-700',
  sub: 'bg-info-50 text-info-700',
  overhead: 'bg-gray-100 text-gray-700',
  transport: 'bg-info-50 text-info-700',
} as const;

// وضعیت آیتم گزارش فیلد (مطابق designs/FieldReports v2.html)
export const REPORT_ITEM_STATUS_LABELS = {
  pending: 'در انتظار',
  approved: 'تأییدشده',
  rejected: 'رد شده',
  edit: 'نیاز اصلاح',
} as const;

export const REPORT_ITEM_STATUS_COLORS = {
  pending: 'bg-info-50 text-info-700',
  approved: 'bg-success-50 text-success-700',
  rejected: 'bg-error-50 text-error-700',
  edit: 'bg-warning-50 text-warning-700',
} as const;

// کدگذاری رنگ نوار پیشرفت بر اساس انحراف (مطابق designs/WBS.html statusOf)
export const PROGRESS_COLOR_THRESHOLDS = {
  // actual - planned >= threshold => رنگ
  ON_TRACK: -5, // >= -5 => سبز/آبی (در حال انجام)
  WARNING: -15, // >= -15 => زرد (تأخیر هشدار)
  // < -15 => قرمز (تأخیر بحرانی)
} as const;

// آستانه‌های رنگ نوار مصرف CBS (مطابق designs/CBS.html)
export const CBS_CONSUMPTION_THRESHOLDS = {
  LOW: 50, // ۰-۵۰٪ سبز
  MEDIUM: 80, // ۵۰-۸۰٪ آبی
  HIGH: 90, // ۸۰-۹۰٪ کهربایی
  CRITICAL: 100, // ۹۰-۱۰۰٪ نارنجی، > ۱۰۰٪ قرمز
} as const;

// رویدادهای فعالیت (مطابق designs/Project.html feed و designs/Dashboard.html)
export const ACTIVITY_EVENT_TYPES = {
  report_submitted: 'ثبت گزارش',
  report_approved: 'تأیید گزارش',
  report_rejected: 'رد گزارش',
  status_changed: 'تغییر وضعیت',
  member_added: 'افزودن عضو',
  file_uploaded: 'آپلود فایل',
  budget_updated: 'به‌روزرسانی بودجه',
} as const;

// شدت هشدار (مطابق designs/Dashboard.html «نیاز به توجه»)
export const ALERT_SEVERITY_COLORS = {
  red: 'bg-error-500',
  orange: 'bg-accent-500',
  yellow: 'bg-warning-500',
} as const;

// تعداد آیتم‌ها در هر صفحه (مطابق designs/Projects.html pagination)
export const PAGE_SIZE_OPTIONS = [8, 20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 8;
