import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { useAppDispatch } from '@/app/store/hooks';
import { setCredentials } from '@/app/store/authSlice';
import { toCredentials } from '@/app/store/sessionCredentials';
import { Spinner } from '@/shared/components/ui/Spinner';
import { useRefreshSessionMutation } from '../api/authApi';

/**
 * فرزندان مسیر تا رسیدن توکن mount نمی‌شوند تا پرس‌وجوهایشان بی‌توکن نروند؛ پس از setCredentials،
 * ProtectedRoute خودش آن‌ها را نشان می‌دهد.
 *
 * توکن دسترسی سرور فقط در حافظه است (docs/backend/07 ۲)، پس پس از تازه‌کردن صفحه یک بار با
 * کوکی تازه‌سازی نشست را برمی‌گردانیم. اگر کوکی معتبر نبود، صفحهٔ ورود با نگه‌داشتن مقصد.
 */
export function SessionRestore() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const [refresh] = useRefreshSessionMutation();
  const [state, setState] = useState<'pending' | 'failed'>('pending');
  const started = useRef(false);

  useEffect(() => {
    // StrictMode اثر را دو بار اجرا می‌کند؛ دومی کوکی چرخانده‌شده را دوباره می‌فرستاد
    if (started.current) return;
    started.current = true;
    refresh()
      .unwrap()
      .then((session) => dispatch(setCredentials(toCredentials(session))))
      .catch(() => setState('failed'));
  }, [dispatch, refresh]);

  if (state === 'failed') {
    return <Navigate to={ROUTES.login} state={{ from: location.pathname }} replace />;
  }
  return (
    <div className="row" style={{ minHeight: '100vh', justifyContent: 'center', alignItems: 'center', gap: 10 }} role="status">
      <Spinner />
      <span className="t-13 tx6">در حال بازگرداندن نشست…</span>
    </div>
  );
}
