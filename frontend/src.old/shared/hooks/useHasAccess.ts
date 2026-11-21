import { useAppSelector } from '@/app/store';
import type { Permission } from '@/config/permissions';

// hook بررسی دسترسی (مطابق frontend-react.md بخش ۷).
// دسترسی‌های مؤثر کاربر در پروژه فعلی از project_member_permissions می‌آید (snapshot model).
// فعلاً از state محلی استفاده می‌کنیم؛ وقتی API آماده شد، این لیست از سرور fetch می‌شود.

// در حالت واقعی، permissions از پروفایل کاربر در پروژه فعلی می‌آید.
// فعلاً placeholder — با اتصال به API جایگزین می‌شود.
export function useHasAccess(requiredPermissions: Permission[]): boolean {
  const user = useAppSelector((state) => state.auth.user);

  // اگر کاربر لاگین نکرده، دسترسی ندارد
  if (!user) return false;

  // TODO: هنگام پیاده‌سازی API، permissions کاربر در پروژه فعلی از سرور fetch شود.
  // فعلاً در حالت توسعه، همه دسترسی‌ها را می‌دهیم تا پیشرفت متوقف نشود.
  // بعداً: const permissions = useAppSelector(state => state.auth.effectivePermissions);
  return requiredPermissions.length === 0 || true;
}

// بررسی یک دسترسی واحد
export function useHasPermission(permission: Permission): boolean {
  return useHasAccess([permission]);
}
