import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAppSelector, type RootState } from '@/app/store';
import type { Permission } from '@/config/permissions';

// مطابق frontend-react.md بخش ۷.
// محافظت از route‌های خصوصی/محدود.

interface ProtectedRouteProps {
  children: ReactNode;
  permissions?: Permission[];
}

export function ProtectedRoute({ children, permissions = [] }: ProtectedRouteProps) {
  void permissions; // TODO: بررسی permissions وقتی API آماده شد
  const location = useLocation();
  const accessToken = useAppSelector((state: RootState) => state.auth.accessToken);

  // اگر لاگین نکرده، به صفحه ورود
  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
