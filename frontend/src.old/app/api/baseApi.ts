import {
  createApi,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';

import { env } from '@/config/env';
import type { ApiResponse } from '@/shared/types/api';

// ────────── رفتار سراسری API (مطابق frontend-react.md بخش ۴) ──────────
// هر endpoint می‌تواند extraOptions داشته باشد که توسط middleware پردازش می‌شود:
//   showGlobalLoading, loadingMessage, showSuccessToast, successMessage, showErrorToast
export interface ApiBehaviorConfig {
  showGlobalLoading?: boolean;
  loadingMessage?: string;
  showSuccessToast?: boolean;
  successMessage?: string;
  showErrorToast?: boolean;
}

// RTK Query به‌صورت پیش‌فرض extraOptions را به‌صورت نامحدود می‌پذیرد (نوع: any).
// برای ایمنی نوع، در زمان تعریف endpointها به‌صورت دستی extraOptions را تایپ می‌کنیم.

// fetchBaseQuery داخلی — مستقیماً fetch را صدا می‌زند
const fetchBaseQueryInternal = async (args: FetchArgs) => {
  try {
    const response = await fetch(args.url, {
      method: args.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(args.headers as Record<string, string> | undefined),
      },
      body: args.body ? JSON.stringify(args.body) : undefined,
      credentials: 'include',
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      return {
        error: {
          status: response.status,
          data: data ?? { message: 'خطای ناشناخته رخ داد' },
        } as FetchBaseQueryError,
      };
    }

    return { data };
  } catch (err) {
    return {
      error: {
        status: 'FETCH_ERROR',
        error: err instanceof Error ? err.message : 'خطای شبکه',
      } as FetchBaseQueryError,
    };
  }
};

const baseQuery = async (args: string | FetchArgs) => {
  // حالت demo/mock: هیچ fetch واقعی نمی‌کنیم.
  // داده‌ها از transformResponse هر endpoint (که mock برمی‌گرداند) تأمین می‌شوند.
  // وقتی بک‌اند آماده شد، VITE_USE_MOCK_API=false قرار دهید.
  if (env.VITE_USE_MOCK_API) {
    return { data: null };
  }

  const baseUrl = env.VITE_API_BASE_URL;
  const url = typeof args === 'string' ? args : args.url;
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

  const fetchArgs: FetchArgs =
    typeof args === 'string' ? { url: fullUrl } : { ...args, url: fullUrl };

  // تزریق توکن احراز هویت
  const token = localStorage.getItem('access_token');
  if (token) {
    fetchArgs.headers = {
      ...(fetchArgs.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${token}`,
    };
  }

  // TODO: هندل refresh token در صورت 401 — در فاز auth پیاده می‌شود
  return fetchBaseQueryInternal(fetchArgs);
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: [
    'Auth',
    'Organization',
    'User',
    'Role',
    'Project',
    'ProjectMember',
    'WbsItem',
    'CbsCatalog',
    'CbsItem',
    'Link',
    'Assignment',
    'FieldReport',
    'FieldReportItem',
    'ProjectSettings',
    'ActivityLog',
    'Alert',
    'Dashboard',
  ],
  endpoints: () => ({}),
});

// helper برای استخراج data از ApiResponse wrapper
export function unwrapApiResponse<T>(response: ApiResponse<T>): T {
  return response.data;
}
