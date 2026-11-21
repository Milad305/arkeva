// کاتالوگ دسترسی‌ها — منبع حقیقت سمت فرانت (مطابق docs/rules/backend-nestjs.md بخش ۴.۲).
// بک‌اند هم همین کاتالوگ را دارد (permissions.catalog.ts).
//
// قاعده توسعه‌پذیری (AGENTS.md بخش ۵.۱):
//   هر فیچر جدید که قابل محدودسازی به نقش است، باید کلید <module>.<action> اضافه شود.

export const PERMISSIONS = {
  // ── Project ──
  'project.view': 'مشاهده پروژه و داشبورد',
  'project.create': 'ساخت پروژه جدید',
  'project.edit': 'ویرایش اطلاعات پروژه',
  'project.delete': 'حذف پروژه',
  'project.archive': 'آرشیو و بازیابی پروژه',
  'project.export': 'خروجی Excel/PDF پروژه',

  // ── WBS ──
  'wbs.view': 'مشاهده درخت WBS',
  'wbs.create': 'افزودن آیتم WBS',
  'wbs.edit': 'ویرایش عنوان/وزن/تاریخ WBS',
  'wbs.delete': 'حذف آیتم WBS',
  'wbs.reorder': 'جابه‌جایی آیتم‌ها (drag-drop)',
  'wbs.import': 'آپلود WBS از MSP/Excel',
  'wbs.export': 'خروجی WBS به XML/Excel',

  // ── CBS ──
  'cbs.view': 'مشاهده درخت CBS',
  'cbs.create': 'افزودن آیتم CBS',
  'cbs.edit': 'ویرایش نرخ/بودجه CBS',
  'cbs.delete': 'حذف آیتم CBS',
  'cbs.import': 'آپلود CBS از Excel',
  'cbs.export': 'خروجی CBS',

  // ── Links (WBS↔CBS) ──
  'links.view': 'مشاهده اتصالات',
  'links.edit': 'افزودن/ویرایش/حذف اتصال',

  // ── Members ──
  'members.view': 'مشاهده لیست اعضا',
  'members.invite': 'دعوت کاربر جدید',
  'members.manage_role': 'تغییر نقش عضو',
  'members.remove': 'حذف یا غیرفعال‌سازی عضو',

  // ── Assignments ──
  'assignments.view': 'مشاهده تخصیص‌ها',
  'assignments.manage': 'تخصیص WBS به سرپرستان',

  // ── Field reports ──
  'reports.view': 'مشاهده گزارش‌ها',
  'reports.submit': 'ثبت گزارش فیلد',
  'reports.approve': 'تأیید/رد آیتم گزارش (مرحله ۲)',
  'reports.final_approve': 'تأیید نهایی کل گزارش (مرحله ۳)',
  'reports.bulk_action': 'اقدام دسته‌جمعی',
  'reports.export': 'خروجی Excel گزارش‌ها',

  // ── Charts ──
  'charts.view': 'مشاهده نمودارها',
  'charts.export': 'خروجی PNG/PDF/Excel نمودارها',

  // ── Settings ──
  'settings.view': 'مشاهده تنظیمات',
  'settings.edit': 'ویرایش تنظیمات پروژه',
  'settings.manage_integrations': 'مدیریت یکپارچه‌سازی‌ها',
  'settings.backup': 'مدیریت بکاپ',
} as const;

export type Permission = keyof typeof PERMISSIONS;

// دسترسی‌های نقش‌های پیش‌فرض (سیستمی). ادمین می‌تواند این‌ها را در کتابخانه نقش‌ها تغییر دهد.
export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  manager: [
    'project.view', 'project.edit', 'project.export', 'project.archive',
    'wbs.view', 'wbs.create', 'wbs.edit', 'wbs.delete', 'wbs.reorder', 'wbs.import', 'wbs.export',
    'cbs.view', 'cbs.create', 'cbs.edit', 'cbs.delete', 'cbs.import', 'cbs.export',
    'links.view', 'links.edit',
    'members.view', 'members.invite', 'members.manage_role', 'members.remove',
    'assignments.view', 'assignments.manage',
    'reports.view', 'reports.final_approve', 'reports.bulk_action', 'reports.export',
    'charts.view', 'charts.export',
    'settings.view', 'settings.edit', 'settings.manage_integrations', 'settings.backup',
  ],
  monitor: [
    'project.view', 'project.export',
    'wbs.view', 'cbs.view', 'links.view',
    'members.view',
    'assignments.view',
    'reports.view', 'reports.approve', 'reports.bulk_action', 'reports.export',
    'charts.view', 'charts.export',
    'settings.view',
  ],
  supervisor: [
    'project.view',
    'reports.view', 'reports.submit',
  ],
  planner: [
    'project.view', 'project.export',
    'wbs.view', 'wbs.create', 'wbs.edit', 'wbs.delete', 'wbs.reorder', 'wbs.import', 'wbs.export',
    'cbs.view', 'cbs.create', 'cbs.edit', 'cbs.delete', 'cbs.import', 'cbs.export',
    'links.view', 'links.edit',
    'members.view',
    'assignments.view', 'assignments.manage',
    'reports.view', 'reports.export',
    'charts.view', 'charts.export',
    'settings.view',
  ],
};
