import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import type { Permission } from '@/config/permissions';
import { useAppSelector } from '@/app/store/hooks';
import { usesServerSession } from '@/app/store/authStorage';
import { SessionRestore } from '@/modules/auth/components/SessionRestore';
import { useHasAccess } from '@/shared/hooks/useHasAccess';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { AppButton, LinkButton } from '@/shared/components/ui/AppButton';
import { Content } from '@/shared/components/layout/AppShell';

export interface ProtectedRouteProps {
  children: ReactNode;
  /** دسترسی‌های لازم برای این مسیر. خالی یعنی فقط ورود کافی است. */
  permissions?: Permission[];
}

/**
 * نگهبان مسیر.
 *
 * بدون نشست → صفحهٔ ورود، با نگه‌داشتن مسیر مقصد.
 * با نشست ولی بدون دسترسی → صفحهٔ «نبود دسترسی» مطابق W46،
 * نه ریدایرکت خاموش؛ کاربر باید بداند چرا نمی‌تواند وارد شود.
 */
export function ProtectedRoute({ children, permissions = [] }: ProtectedRouteProps) {
  const location = useLocation();
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const allowed = useHasAccess(permissions);

  // سرور واقعی: توکن در حافظه است و پس از تازه‌کردن صفحه از کوکی برمی‌گردد
  if (!accessToken && usesServerSession()) return <SessionRestore />;

  if (!accessToken) {
    return <Navigate to={ROUTES.login} state={{ from: location.pathname }} replace />;
  }

  if (!allowed) {
    return (
      <Content>
        <EmptyState
          inCard
          icon="lock"
          iconStyle={{ background: 'var(--warning-100, #FEF0C7)', color: 'var(--warning-700)' }}
          title="این بخش برای نقش شما باز نیست"
          description="برای دیدن این صفحه به دسترسی بیشتری نیاز دارید. می‌توانید از مدیر پروژه درخواست کنید."
          actions={
            <>
              <AppButton variant="primary" size="sm" icon="send">
                درخواست دسترسی
              </AppButton>
              <LinkButton variant="ghost" size="sm" to={ROUTES.dashboard}>
                بازگشت به داشبورد
              </LinkButton>
            </>
          }
        />
      </Content>
    );
  }

  return <>{children}</>;
}
