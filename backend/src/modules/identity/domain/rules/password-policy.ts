// سیاست رمز (F01 ۵.۱ `[تأییدشده]`): دست‌کم ۸ نویسه، یک عدد، یک حرف بزرگ لاتین؛ با ۵ رمز اخیر یکی نباشد.

export const PASSWORD_HISTORY_SIZE = 5;

/** پیام فارسی نخستین قاعدهٔ نقض‌شده، یا null. */
export function passwordPolicyError(password: string): string | null {
  if (password.length < 8) return 'رمز باید دست‌کم ۸ نویسه باشد.';
  if (password.length > 128) return 'رمز حداکثر ۱۲۸ نویسه است.';
  if (!/\d/.test(password)) return 'رمز باید دست‌کم یک عدد داشته باشد.';
  if (!/[A-Z]/.test(password)) return 'رمز باید دست‌کم یک حرف بزرگ لاتین داشته باشد.';
  return null;
}
