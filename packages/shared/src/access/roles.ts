// نقش‌های سیستمی (`design/02-domain-model.md` ۲؛ `features/access-control.md` ۵.۴).
//
// منبع واحد برای فرانت و بک‌اند (docs/backend/02-stack.md ۴). برچسب‌ها فارسی‌اند چون
// در ماتریس W27 و پیام خطای ۴۰۳ («نقش لازم») هر دو سمت همان را نشان می‌دهند.
//
// یادداشت: `02` ۲ کد سرپرست را `site_supervisor` نوشته و فقط چهار نقش سیستمی آورده؛
// پیاده‌سازی (و ۵.۴) شش نقش دارد و کد `supervisor`. ثبت در code-mapping §۷.۳ ردیف ۱۵.

export const SYSTEM_ROLES = {
  org_admin: 'مدیر سازمان',
  project_manager: 'مدیر پروژه',
  planner: 'برنامه‌ریز',
  reviewer: 'ناظر',
  supervisor: 'سرپرست کارگاه',
  client_reviewer: 'ناظر کارفرما',
  finance: 'واحد مالی',
} as const;

export type SystemRole = keyof typeof SYSTEM_ROLES;

/** نقش‌هایی که در سطح پروژه تخصیص می‌یابند (مدیر سازمان نقش سطح سازمان است). */
export type ProjectRoleCode = Exclude<SystemRole, 'org_admin'>;

/** فهرست نقش‌های پروژه برای اعتبارسنجی ورودی (W48، W16). */
export const PROJECT_ROLE_CODES = ['project_manager', 'planner', 'reviewer', 'supervisor', 'client_reviewer', 'finance'] as const satisfies readonly ProjectRoleCode[];
