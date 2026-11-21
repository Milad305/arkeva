import type { ReactNode } from 'react';

import type { Permission } from '@/config/permissions';
import { useHasAccess } from '@/shared/hooks/useHasAccess';

export interface GuardProps {
  permissions: Permission[];
  children: ReactNode;
  /** چیزی که جای محتوا می‌نشیند وقتی دسترسی نیست؛ پیش‌فرض هیچ. */
  fallback?: ReactNode;
}

/**
 * نمایش مشروط بر اساس دسترسی.
 *
 * هیچ‌جا `{user.role === 'admin' ? <Button/> : null}` نوشته نشود —
 * همیشه این کامپوننت یا هوک `useHasAccess` (قاعدهٔ AGENTS.md بخش ۳).
 */
export function Guard({ permissions, children, fallback = null }: GuardProps) {
  return useHasAccess(permissions) ? <>{children}</> : <>{fallback}</>;
}
