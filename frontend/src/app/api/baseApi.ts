import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';

import { env } from '@/config/env';
import { ENDPOINTS } from '@/config/endpoints';
import { logout, setCredentials, type AuthState } from '@/app/store/authSlice';
import { toCredentials } from '@/app/store/sessionCredentials';
import type { SessionDto } from '@/modules/auth/types';
import { TAG_TYPES } from './tagTypes';

const rawBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = fetchBaseQuery({
  baseUrl: env.VITE_API_BASE_URL,
  // کوکی تازه‌سازی HttpOnly از راه پراکسی هم‌مبدأ می‌رود (docs/backend/07 ۲)
  credentials: 'same-origin',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as { auth: AuthState }).auth.accessToken;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    headers.set('Accept', 'application/json');
    // مسیرهای کوکی‌محور سرور این سرآیند را می‌خواهند (دفاع دوم در برابر CSRF)
    headers.set('X-Requested-With', 'projeyar');
    return headers;
  },
});

const urlOf = (args: string | FetchArgs): string => (typeof args === 'string' ? args : args.url);

/** نشست منقضی؟ مسیرهای خود ورود و تازه‌سازی این را نمی‌گیرند تا حلقه نشود. */
function isExpired(result: { error?: FetchBaseQueryError }, args: string | FetchArgs): boolean {
  if (result.error?.status !== 401 || urlOf(args).startsWith('/auth/')) return false;
  const code = (result.error.data as { code?: unknown } | undefined)?.code;
  return code === 'SESSION_EXPIRED' || code === 'AUTH_REQUIRED';
}

/** یک تازه‌سازی مشترک برای همهٔ درخواست‌هایی که هم‌زمان ۴۰۱ گرفتند. */
let refreshing: Promise<boolean> | null = null;

/**
 * توکن دسترسی کوتاه‌عمر است (۱۰ دقیقه). اگر درخواستی با ۴۰۱ برگشت، یک بار با کوکی تازه‌سازی
 * نشست تازه می‌گیریم و همان درخواست را دوباره می‌فرستیم؛ اگر نشد، خروج.
 */
const baseQueryWithRefresh: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extra) => {
  const result = await rawBaseQuery(args, api, extra);
  if (!isExpired(result, args)) return result;

  refreshing ??= (async () => {
    const refreshed = await rawBaseQuery({ url: ENDPOINTS.AUTH_REFRESH, method: 'POST' }, api, extra);
    const session = (refreshed.data as { data?: SessionDto } | undefined)?.data;
    if (session) {
      api.dispatch(setCredentials(toCredentials(session)));
      return true;
    }
    api.dispatch(logout());
    return false;
  })().finally(() => {
    refreshing = null;
  });

  return (await refreshing) ? rawBaseQuery(args, api, extra) : result;
};

/**
 * تکهٔ مرکزی API. endpointها در پوشهٔ api هر ماژول با `injectEndpoints` اضافه می‌شوند
 * تا هر ماژول کد خودش را داشته باشد و lazy-load بماند.
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithRefresh,
  tagTypes: TAG_TYPES,
  refetchOnMountOrArgChange: false,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});
