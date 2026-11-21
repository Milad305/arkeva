import { getApiError } from '@/shared/utils/apiError';

// رمز منقضی (F01 ۵.۱؛ تصمیم کاربر 1405/08/22): سرور پس از احراز کامل به‌جای نشست خطای PASSWORD_EXPIRED
// با توکن «رمز تازه» می‌دهد و کاربر یک‌راست به مرحلهٔ ۳ صفحهٔ W04 می‌رود، بی کد.

export interface ResetLocationState {
  resetToken: string;
  expired: true;
}

/** توکن «رمز تازه» اگر خطا PASSWORD_EXPIRED باشد. */
export function expiredResetToken(error: unknown): string | null {
  const apiError = getApiError(error);
  if (apiError?.code !== 'PASSWORD_EXPIRED') return null;
  const token = apiError.details?.['resetToken'];
  return typeof token === 'string' ? token : null;
}
