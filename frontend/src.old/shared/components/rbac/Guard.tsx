import type { ReactNode } from 'react';

import { useHasAccess } from '@/shared/hooks/useHasAccess';
import type { Permission } from '@/config/permissions';

interface GuardProps {
  permissions: Permission[];
  children: ReactNode;
  fallback?: ReactNode | null;
}

// wrapper RBAC (مطابق frontend-react.md بخش ۷ — ممنوع {user.role === 'admin' ? ... : null})
// اگر کاربر دسترسی نداشت، children رندر نمی‌شود (یا fallback نمایش داده می‌شود).
export function Guard({ permissions, children, fallback = null }: GuardProps) {
  const hasAccess = useHasAccess(permissions);
  if (!hasAccess) return <>{fallback}</>;
  return <>{children}</>;
}
