import type { ApiErrorResponse } from '@/shared/types/api';

/**
 * استخراج خطای استاندارد از هر چیزی که RTK Query برمی‌گرداند.
 *
 * قالب خطا در `CLAUDE.md` بخش ۴ تعریف شده: `{code, message(fa), details?, traceId, retryable}`.
 */
export function getApiError(error: unknown): ApiErrorResponse | null {
  if (!error || typeof error !== 'object') return null;

  const data = 'data' in error ? (error as { data: unknown }).data : null;
  if (!data || typeof data !== 'object') return null;
  if (!('message' in data)) return null;

  const payload = data as Partial<ApiErrorResponse>;

  return {
    code: payload.code ?? 'unknown',
    message: String(payload.message),
    details: payload.details,
    traceId: payload.traceId ?? '',
    retryable: payload.retryable ?? false,
  };
}

/** پیام خطا، یا یک پیام جایگزین بدون سرزنش کاربر. */
export function getApiErrorMessage(error: unknown, fallback = 'انجام نشد. دوباره تلاش کنید.'): string {
  return getApiError(error)?.message ?? fallback;
}

/** یک مقدار عددی از `details` — مثل تعداد تلاش باقی‌مانده. */
export function getErrorDetailNumber(error: unknown, key: string): number | null {
  const value = getApiError(error)?.details?.[key];
  return typeof value === 'number' ? value : null;
}
