import { useAppSelector } from '@/app/store/hooks';
import {
  widerScope,
  type GrantedPermission,
  type Permission,
  type PermissionScope,
} from '@/config/permissions';

/**
 * بررسی دسترسی (D11).
 *
 * فرانت فقط تصمیم می‌گیرد چه چیزی **نشان داده شود**؛ اعمال واقعی در API است
 * و دامنهٔ داده و حذف فیلدهای مبلغ هم آنجا انجام می‌شود
 * (`features/access-control.md` ۵.۲ و ۵.۵). پس اینجا فقط وجود کد بررسی می‌شود.
 *
 * فعلاً تا آماده‌شدن بک‌اند همیشه `true` برمی‌گرداند — ولی ساختار از روز اول کامل است.
 * با اتصال، فقط شرط «فهرست خالی» برداشته می‌شود.
 *
 * هیچ‌جا `user.role === '…'` نوشته نشود؛ همه‌جا همین هوک یا `<Guard>`.
 */
export function useHasAccess(required: Permission[]): boolean {
  const granted = useAppSelector((state) => state.auth.effectivePermissions);

  if (required.length === 0) return true;

  // ── حالت توسعه: تا وقتی بک‌اند دسترسی‌ها را نفرستاده، همه‌چیز باز است ──
  if (granted.length === 0) return true;

  const codes = new Set(granted.map((item) => item.code));
  return required.every((code) => codes.has(code));
}

export function useHasPermission(permission: Permission): boolean {
  return useHasAccess([permission]);
}

/**
 * دامنهٔ مؤثر یک دسترسی.
 *
 * کاربر با چند نقش، **اجتماع** دسترسی‌ها را دارد و اگر یک کد در دو نقش با دو
 * دامنه باشد وسیع‌تر برنده است (۵.۲). صفحه‌ها از این برای تصمیم‌های نمایشی
 * استفاده می‌کنند — مثلاً سرپرست با `own_assigned` فیلتر «همهٔ سرپرستان» نمی‌بیند.
 *
 * `null` یعنی کاربر این کد را ندارد.
 */
export function useScopeFor(permission: Permission): PermissionScope | null {
  const granted = useAppSelector((state) => state.auth.effectivePermissions);

  // حالت توسعه، هم‌راستا با useHasAccess
  if (granted.length === 0) return 'all';

  return effectiveScope(granted, permission);
}

/** تابع خالص؛ بیرون از React هم قابل استفاده است (مثلاً در تست). */
export function effectiveScope(
  granted: readonly GrantedPermission[],
  permission: Permission,
): PermissionScope | null {
  let result: PermissionScope | null = null;

  for (const item of granted) {
    if (item.code !== permission) continue;
    result = result === null ? item.scope : widerScope(result, item.scope);
  }

  return result;
}
