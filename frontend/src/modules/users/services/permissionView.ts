import type { PermissionScope } from '@/config/permissions';

/** برچسب کوتاه دامنهٔ داده در خانه‌های W27 (۵.۲). */
export const SCOPE_SHORT: Record<PermissionScope, string> = {
  all: 'کامل',
  own_area: 'فقط حوزهٔ خودش',
  own_assigned: 'فقط فعالیت‌های خودش',
  own_projects: 'فقط پروژه‌های خودش',
};
