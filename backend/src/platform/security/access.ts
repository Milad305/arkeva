import type { Permission, PermissionScope } from '@projeyar/shared';
import type { Actor } from '../context/app-context.js';

// دسترسی حل‌شدهٔ یک کاربر (access-control.md ۵.۲): اجتماع نقش‌ها در هر پروژه با وسیع‌ترین scope.
// پیاده‌سازی را ماژول team می‌دهد (عضویت مال اوست)؛ platform فقط این قرارداد را می‌شناسد.

export interface ResolvedAccess {
  readonly isOrgAdmin: boolean;
  /** اجتماع کد نقش‌ها در همهٔ پروژه‌ها — فقط نمایشی («rolesInProject» نشست). */
  readonly roleCodes: ReadonlySet<string>;
  /** پروژه ← کد ← دامنه. فقط عضویت‌های فعال. */
  readonly projects: ReadonlyMap<string, ReadonlyMap<Permission, PermissionScope>>;
}

export abstract class AccessResolver {
  abstract resolve(actor: Actor): Promise<ResolvedAccess>;
}

/** پروژه‌هایی که کاربر در آن‌ها این کد را دارد — برای فهرست‌های سطح سازمان. */
export function projectsWith(access: ResolvedAccess, code: Permission): string[] {
  return [...access.projects].filter(([, codes]) => codes.has(code)).map(([projectId]) => projectId);
}
