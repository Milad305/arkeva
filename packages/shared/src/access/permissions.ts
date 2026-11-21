import type { ProjectRoleCode, SystemRole } from './roles.js';

// کاتالوگ دسترسی‌ها — بازتولید کامل از `design/features/access-control.md` بخش ۵.۴.
// منتقل‌شده از `frontend/src/config/permissions.ts` (1405/08/21) تا فرانت و بک‌اند یک منبع داشته باشند؛
// آن فایل حالا فقط از اینجا re-export می‌کند.
//
// D11: فهرست ثابتی از کدها در کد تعریف می‌شود و هر endpoint دقیقاً یک کد لازم دارد.
// بک‌اند همین فایل را وارد می‌کند و تست قرارداد هر endpoint را با این فهرست تطبیق می‌دهد (docs/backend/09 ۵).
//
// قاعدهٔ توسعه: هر فیچر تازه که قابل محدودسازی به نقش است، کد خودش را اینجا می‌گیرد.
// «دسترسی‌ای که کد ندارد وجود ندارد» (۵.۲).

export const PERMISSIONS = {
  // ── پروژه ──
  'project.create': 'ایجاد پروژهٔ جدید',
  'project.view': 'مشاهدهٔ پروژه',
  'project.settings.edit': 'ویرایش تنظیمات پروژه',
  'project.activate': 'فعال‌سازی پروژه و ساخت برنامهٔ مبنا',
  'project.pause': 'توقف موقت و ادامهٔ پروژه',
  'project.complete': 'اعلام پایان پروژه',
  'project.archive': 'بایگانی پروژه',
  'project.restore': 'بازگردانی پروژهٔ بایگانی‌شده',
  'project.transfer_manager': 'انتقال مدیریت پروژه',
  'project.delete': 'حذف پروژه',

  // ── ساختار و نسخه‌های برنامه ──
  'wbs.view': 'مشاهدهٔ درخت WBS',
  'wbs.edit': 'ویرایش ساختار و وزن‌های WBS',
  'wbs.edit_note': 'ویرایش یادداشت آیتم',
  'wbs.export': 'خروجی WBS',
  'plan.view_versions': 'مشاهدهٔ نسخه‌های برنامه',
  'plan.edit_draft': 'ویرایش نسخهٔ پیش‌نویس',
  'plan.apply': 'اعمال نسخه',
  'plan.discard': 'دور ریختن نسخهٔ پیش‌نویس',
  'plan.set_pv_reference': 'تعیین مبنای مقایسه برای PV',
  'templates.view': 'مشاهدهٔ قالب‌ها',
  'templates.manage': 'مدیریت قالب‌های WBS و CBS',
  'templates.publish': 'انتشار نسخهٔ قالب',

  // ── هزینه ──
  'cbs.view': 'مشاهدهٔ درخت CBS',
  'cbs.view_amounts': 'مشاهدهٔ مبالغ',
  'cbs.revise_budget': 'ثبت بازنگری بودجه',
  'cbs.approve_revision': 'تأیید بازنگری بودجه',
  'cbs.request_revision': 'درخواست بازنگری بودجه',
  'cost.view': 'مشاهدهٔ دفتر هزینه',
  'cost.create': 'ثبت ردیف هزینه',
  'cost.post': 'قطعی‌کردن ردیف هزینه',
  'cost.reverse': 'ثبت ردیف برگشتی',
  'cost.import': 'ورود هزینه از Excel',
  'cost.set_cutoff': 'تعیین تاریخ کامل بودن هزینه‌ها',

  // ── تیم و کاربران ──
  'team.view': 'مشاهدهٔ اعضای پروژه',
  'team.manage': 'مدیریت اعضای پروژه',
  'approval_routes.manage': 'مدیریت حوزه‌های تأیید',
  'assignment.manage': 'تخصیص فعالیت به سرپرستان',
  'users.invite': 'دعوت کاربر',
  'users.manage': 'مدیریت کاربران سازمان',
  'roles.edit': 'ویرایش نقش‌ها و ماتریس دسترسی',
  'org.settings': 'تنظیمات سازمان',
  'org.integrations': 'یکپارچه‌سازی‌های سازمان',

  // ── گزارش کارگاه ──
  'report.view': 'مشاهدهٔ گزارش‌های کارگاه',
  'report.submit': 'ثبت گزارش پیشرفت',
  'report.approve.stage1': 'تأیید مرحلهٔ اول',
  'report.approve.stage2': 'تأیید نهایی',
  'report.correct': 'اصلاح گزارش تأییدشده',
  'report.resolve': 'تعیین تکلیف گزارش بلاتکلیف',
  'report.manual_entry': 'ثبت دستی پیشرفت در وب',

  // ── ریسک ──
  'risk.view': 'مشاهدهٔ دفتر ریسک',
  'risk.create': 'ثبت ریسک',
  'risk.create_site_issue': 'ثبت مشکل کارگاه',
  'risk.edit': 'ویرایش ریسک',
  'risk.change_status_owner': 'تغییر وضعیت و مالک ریسک',
  'risk.allocate_contingency': 'تخصیص ذخیرهٔ احتیاطی',

  // ── تحلیل و گزارش ──
  'progress.view': 'مشاهدهٔ پیشرفت',
  'charts.view': 'مشاهدهٔ نمودارها',
  'charts.view_summary': 'مشاهدهٔ خلاصهٔ نمودارها',
  'dashboard.view': 'مشاهدهٔ داشبورد سازمان',
  'reports.view': 'مشاهدهٔ گزارش‌های مدیریتی',
  'reports.generate': 'تولید گزارش مدیریتی',
  'reports.schedule': 'زمان‌بندی و ارسال گزارش',
  'reports.custom_template': 'ساخت قالب گزارش سفارشی',
  'reports.send_external': 'ارسال به گیرندهٔ بیرون از سازمان',
  'reports.send_amounts_external': 'ارسال مبلغ به بیرون از سازمان',
  'reports.schedule_financial': 'زمان‌بندی گزارش مالی',
  'period.view': 'مشاهدهٔ دوره‌های گزارش',
  'period.close': 'بستن دوره',
  'alerts.view': 'مشاهدهٔ هشدارها',
  'alerts.dismiss': 'رد کردن هشدار',
  'alerts.configure': 'تنظیم قواعد هشدار',
  'notifications.configure_project': 'تنظیم اعلان‌های پروژه',
  // notifications.md ۸؛ §۷.۳ ردیف ۱۴ گزینهٔ الف (تصمیم کاربر 1405/08/22)
  'notifications.view_own': 'مشاهدهٔ اعلان‌های خود',
  'notifications.configure_org': 'تنظیم اعلان‌های سازمان',

  // ── MSP ──
  'msp.import': 'ورود از Microsoft Project',
  'msp.sync': 'همگام‌سازی با Microsoft Project',
  'msp.export': 'خروجی به Microsoft Project',
  'msp.templates.manage': 'مدیریت قالب‌های تطبیق فیلد',

  // ── زیرساخت ──
  'audit.view': 'مشاهدهٔ لاگ ممیزی',
  'backup.manage': 'مدیریت پشتیبان‌گیری',
  'org.backup': 'پشتیبان‌گیری سازمان',
  'export.full': 'خروجی کامل داده',

  // ── یکپارچه‌سازی (F19؛ integrations.md ۱۰) ──
  'integrations.view': 'مشاهدهٔ یکپارچه‌سازی‌ها',
  'integrations.manage': 'تنظیم اتصال یکپارچه‌سازی',
  'integrations.run': 'اجرای همگام‌سازی یکپارچه‌سازی',
  'integrations.map_accounts': 'نگاشت حساب‌های بیرونی به CBS',
  'integrations.export_p6': 'خروجی XER برای Primavera P6',
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * دامنهٔ داده (`features/access-control.md` ۵.۲).
 * یک کد می‌تواند در دو نقش با دو دامنه باشد؛ **وسیع‌تر برنده است**.
 */
export type PermissionScope = 'all' | 'own_area' | 'own_assigned' | 'own_projects';

export const SCOPE_LABELS: Record<PermissionScope, string> = {
  all: 'همهٔ دادهٔ پروژه',
  own_area: 'حوزهٔ تأیید خود کاربر',
  own_assigned: 'فقط فعالیت‌های تخصیص‌یافته',
  own_projects: 'فقط پروژه‌هایی که عضو است',
};

/** `all` ⊃ `own_area` ⊃ `own_assigned`. `own_projects` برای عملیات سازمانی است. */
const SCOPE_BREADTH: Record<PermissionScope, number> = {
  all: 3,
  own_area: 2,
  own_assigned: 1,
  own_projects: 1,
};

/** از بین دو دامنه، وسیع‌تر را برمی‌گرداند (قاعدهٔ اجتماع نقش‌ها). */
export function widerScope(a: PermissionScope, b: PermissionScope): PermissionScope {
  return SCOPE_BREADTH[a] >= SCOPE_BREADTH[b] ? a : b;
}

/** یک دسترسی اعطاشده: کد به‌علاوهٔ دامنهٔ داده‌اش. */
export interface GrantedPermission {
  code: Permission;
  scope: PermissionScope;
}

/**
 * کدهایی که «همهٔ کاربران» دارند (notifications.md ۸)، آخر فهرست هر نقش تا شناسهٔ قطعی ردیف‌های پیشین
 * migration اولیه جابه‌جا نشود؛ migration `…_notifications` همین ردیف‌ها را به پایگاه دادهٔ موجود می‌افزاید.
 */
export const EVERYONE_PERMISSIONS: Permission[] = ['notifications.view_own'];

/**
 * یکپارچه‌سازی (F19؛ integrations.md ۱۰): پس از `dashboard.view` و پیش از «همهٔ کاربران»؛ `integrations.manage` فقط مدیر سازمان.
 * migration `…_backups` آن را با فضای شناسهٔ جدا به پایگاه دادهٔ موجود می‌افزاید (برش ۱۹، 1405/08/26).
 */
export const INTEGRATION_ROLE_PERMISSIONS: Partial<Record<ProjectRoleCode, Permission[]>> = {
  project_manager: ['integrations.view', 'integrations.run', 'integrations.export_p6'],
  planner: ['integrations.view', 'integrations.export_p6'],
  finance: ['integrations.view', 'integrations.run', 'integrations.map_accounts'],
};

/**
 * پیش‌فرض نقش‌های سیستمی.
 *
 * مدیر سازمان همهٔ کدها را دارد و ماتریسش غیرقابل‌تغییر است (D11)، پس اینجا نمی‌آید.
 * نقش سیستمی قابل‌تنظیم است ولی حذف نمی‌شود و «بازگشت به پیش‌فرض» دارد.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<ProjectRoleCode, GrantedPermission[]> = withEveryone(
  withIntegrations(
    withDashboard({
      project_manager: grant('all', [
        'project.view',
        'project.settings.edit',
        'project.activate',
        'project.pause',
        'project.complete',
        'project.archive',
        'project.transfer_manager',
        'wbs.view',
        'wbs.edit',
        'wbs.edit_note',
        'wbs.export',
        'plan.view_versions',
        'plan.edit_draft',
        'plan.apply',
        'plan.discard',
        'plan.set_pv_reference',
        'templates.view',
        'cbs.view',
        'cbs.view_amounts',
        'cbs.revise_budget',
        'cbs.approve_revision',
        'cost.view',
        'cost.create',
        'cost.post',
        'cost.reverse',
        'team.view',
        'team.manage',
        'approval_routes.manage',
        'assignment.manage',
        'report.view',
        'report.approve.stage1',
        'report.approve.stage2',
        'report.correct',
        'report.resolve',
        'report.manual_entry',
        'risk.view',
        'risk.create',
        'risk.edit',
        'risk.change_status_owner',
        'risk.allocate_contingency',
        'progress.view',
        'charts.view',
        'reports.view',
        'reports.generate',
        'reports.schedule',
        'reports.custom_template',
        'reports.send_external',
        'period.view',
        'period.close',
        'alerts.view',
        'alerts.dismiss',
        'alerts.configure',
        'notifications.configure_project',
        'msp.import',
        'msp.sync',
        'msp.export',
        'audit.view',
        'export.full',
      ])
        .concat(grant('own_projects', ['users.invite']))
        // F02 ۱۱: مدیر پروژه فقط پیش‌نویس را حذف می‌کند؛ محدودیت وضعیت قاعدهٔ دامنه است (تصمیم کاربر 1405/08/22).
        // آخر فهرست تا شناسهٔ قطعی ردیف‌های پیشین migration اولیه جابه‌جا نشود.
        .concat(grant('all', ['project.delete'])),

      planner: grant('all', [
        'project.view',
        'wbs.view',
        'wbs.edit',
        'wbs.edit_note',
        'wbs.export',
        'plan.view_versions',
        'plan.edit_draft',
        'plan.apply',
        'plan.discard',
        'templates.view',
        'templates.manage',
        'templates.publish',
        'cbs.view',
        'cbs.view_amounts',
        'cbs.request_revision',
        'cost.view',
        'team.view',
        'assignment.manage',
        'report.view',
        'report.manual_entry',
        'risk.view',
        'risk.create',
        'progress.view',
        'charts.view',
        'reports.view',
        'reports.generate',
        'reports.schedule',
        'reports.custom_template',
        'period.view',
        'period.close',
        'alerts.view',
        'msp.import',
        'msp.sync',
        'msp.export',
        'msp.templates.manage',
      ]),

      reviewer: grant('all', [
        'project.view',
        'wbs.view',
        'wbs.edit_note',
        'plan.view_versions',
        'cbs.view',
        'team.view',
        'report.manual_entry',
        'risk.view',
        'risk.create',
        'progress.view',
        'charts.view',
        'alerts.view',
      ]).concat(grant('own_area', ['report.view', 'report.approve.stage1', 'report.correct', 'report.resolve'])),

      supervisor: grant('own_assigned', [
        'project.view',
        'wbs.view',
        'report.submit',
        'risk.view',
        'risk.create_site_issue',
        'progress.view',
        'charts.view',
        'alerts.view',
      ]),

      client_reviewer: grant('all', [
        'project.view',
        'wbs.view',
        'cbs.view',
        'team.view',
        'report.view',
        'risk.view',
        'progress.view',
        'charts.view_summary',
        'reports.view',
        'period.view',
      ]),

      finance: grant('all', [
        'project.view',
        'wbs.view',
        'cbs.view',
        'cbs.view_amounts',
        'cbs.request_revision',
        'cost.view',
        'cost.create',
        'cost.post',
        'cost.reverse',
        'cost.import',
        'cost.set_cutoff',
        'team.view',
        'risk.view',
        'progress.view',
        'charts.view',
        'reports.view',
        'reports.generate',
        'reports.schedule_financial',
        'period.view',
        'alerts.view',
      ]),
    }),
  ),
);

/**
 * `dashboard.view` (W05؛ charts.md ۸): همهٔ نقش‌های وب، نه سرپرست. پس از کدهای خود نقش و پیش از «همهٔ کاربران» (که آخر فهرست
 * می‌مانند)؛ migration `…_charts` آن را با فضای شناسهٔ جدا به پایگاه دادهٔ موجود می‌افزاید (access-control ۵.۴، اصلاح 1405/08/22).
 */
function withDashboard(roles: Record<ProjectRoleCode, GrantedPermission[]>): Record<ProjectRoleCode, GrantedPermission[]> {
  return Object.fromEntries(
    Object.entries(roles).map(([role, grants]) => [role, role === 'supervisor' ? grants : [...grants, ...grant('all', ['dashboard.view'])]]),
  ) as Record<ProjectRoleCode, GrantedPermission[]>;
}

function withIntegrations(roles: Record<ProjectRoleCode, GrantedPermission[]>): Record<ProjectRoleCode, GrantedPermission[]> {
  return Object.fromEntries(
    Object.entries(roles).map(([role, grants]) => [role, [...grants, ...grant('all', INTEGRATION_ROLE_PERMISSIONS[role as ProjectRoleCode] ?? [])]]),
  ) as Record<ProjectRoleCode, GrantedPermission[]>;
}

function withEveryone(roles: Record<ProjectRoleCode, GrantedPermission[]>): Record<ProjectRoleCode, GrantedPermission[]> {
  return Object.fromEntries(Object.entries(roles).map(([role, grants]) => [role, [...grants, ...grant('all', EVERYONE_PERMISSIONS)]])) as Record<
    ProjectRoleCode,
    GrantedPermission[]
  >;
}

function grant(scope: PermissionScope, codes: Permission[]): GrantedPermission[] {
  return codes.map((code) => ({ code, scope }));
}

/**
 * ناظر کارفرما هیچ مبلغی نمی‌بیند (فاقد `cbs.view_amounts`).
 * سرپرست هیچ دسترسی وب ندارد؛ فقط اپ اندروید.
 */
export const WEB_PANEL_ROLES: SystemRole[] = ['org_admin', 'project_manager', 'planner', 'reviewer', 'client_reviewer', 'finance'];

/** همهٔ کدها به‌صورت آرایه — برای اعتبارسنجی، seed و تست قرارداد. */
export const PERMISSION_CODES = Object.keys(PERMISSIONS) as Permission[];

export function isPermission(value: string): value is Permission {
  return Object.prototype.hasOwnProperty.call(PERMISSIONS, value);
}
