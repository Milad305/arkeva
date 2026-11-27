import { z } from 'zod';

import { toEnDigits } from '@/shared/utils/num';

// اعتبارسنجی فرم‌های ورود — قواعد از `design/features/access-control.md` ۵.۱.
//
// همهٔ ورودی‌های عددی با `.transform(toEnDigits)` نرمال می‌شوند، چون کاربر
// ممکن است با صفحه‌کلید فارسی تایپ کند و API ارقام لاتین می‌خواهد.

/** شمارهٔ موبایل ایران: ۱۱ رقم با شروع ۰۹. */
const MOBILE_PATTERN = /^09\d{9}$/;

export const passwordPolicy = {
  minLength: 8,
  /** الزامی: دست‌کم یک عدد و یک حرف بزرگ لاتین. */
  requireDigit: true,
  requireUppercase: true,
  /** نماد فقط برای رمز «قوی» توصیه می‌شود، الزامی نیست. */
  recommendSymbol: true,
  /** رمز با ۵ رمز اخیر یکی نباشد — بررسی در سرور. */
  historyDepth: 5,
} as const;

export const passwordSchema = z
  .string()
  .min(passwordPolicy.minLength, `رمز عبور باید دست‌کم ${passwordPolicy.minLength} نویسه باشد.`)
  .refine((value) => /\d/.test(value), 'رمز عبور باید دست‌کم یک عدد داشته باشد.')
  .refine((value) => /[A-Z]/.test(value), 'رمز عبور باید دست‌کم یک حرف بزرگ لاتین داشته باشد.');

/** قدرت رمز برای نوار چهارخانهٔ W04. */
export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

export interface PasswordRuleState {
  minLength: boolean;
  digit: boolean;
  uppercase: boolean;
  symbol: boolean;
}

export function passwordRuleState(value: string): PasswordRuleState {
  return {
    minLength: value.length >= passwordPolicy.minLength,
    digit: /\d/.test(value),
    uppercase: /[A-Z]/.test(value),
    symbol: /[^\w\s]/.test(value),
  };
}

/** سه قاعدهٔ اول الزامی‌اند؛ نماد رمز را از «متوسط» به «قوی» می‌برد. */
export function passwordStrength(value: string): PasswordStrength {
  const rules = passwordRuleState(value);
  const met = [rules.minLength, rules.digit, rules.uppercase, rules.symbol].filter(Boolean).length;

  if (met <= 1) return 'weak';
  if (met === 2) return 'fair';
  if (met === 3) return 'good';
  return 'strong';
}

export const PASSWORD_STRENGTH_LABELS: Record<PasswordStrength, string> = {
  weak: 'ضعیف',
  fair: 'متوسط',
  good: 'خوب',
  strong: 'قوی',
};

/** تعداد خانه‌های پرشدهٔ نوار قدرت و رنگشان. */
export const PASSWORD_STRENGTH_METER: Record<PasswordStrength, { filled: number; color: string }> =
  {
    weak: { filled: 1, color: '#DC2626' },
    fair: { filled: 2, color: '#D97706' },
    good: { filled: 3, color: '#2563EB' },
    strong: { filled: 4, color: '#16A34A' },
  };

export const mobileSchema = z
  .string()
  .transform(toEnDigits)
  .refine((value) => MOBILE_PATTERN.test(value), 'شمارهٔ موبایل باید ۱۱ رقم و با ۰۹ شروع شود.');

/** W01 و W02 — شناسه می‌تواند ایمیل یا موبایل باشد. */
export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'نام کاربری یا شمارهٔ موبایل را وارد کنید.')
    .transform((value) => (/^[۰-۹0-9]+$/.test(value) ? toEnDigits(value) : value)),
  password: z.string().min(1, 'رمز عبور را وارد کنید.'),
  rememberIdentifier: z.boolean(),
});

export type LoginForm = z.infer<typeof loginSchema>;

/** W03 — کد ۶ رقمی، مهلت ۵ دقیقه، ارسال دوباره پس از ۶۰ ثانیه. */
export const OTP_LENGTH = 6;
export const OTP_TTL_SECONDS = 5 * 60;
export const OTP_RESEND_AFTER_SECONDS = 60;

export const otpSchema = z.object({
  code: z
    .string()
    .transform(toEnDigits)
    .refine((value) => value.length === OTP_LENGTH, `کد باید ${OTP_LENGTH} رقم باشد.`)
    .refine((value) => /^\d+$/.test(value), 'کد فقط عدد است.'),
  trustDevice: z.boolean(),
});

export type OtpForm = z.infer<typeof otpSchema>;

/** W04 مرحلهٔ ۱ — شمارهٔ موبایل. */
export const forgotPasswordSchema = z.object({
  mobile: mobileSchema,
});

export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

/** W04 مرحلهٔ ۳ — رمز جدید و تکرارش. */
export const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    repeatPassword: z.string(),
    revokeOtherSessions: z.boolean(),
  })
  .refine((data) => data.newPassword === data.repeatPassword, {
    path: ['repeatPassword'],
    message: 'دو رمز یکسان نیستند.',
  });

export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

/** ثبت‌نام خودکار سازمان جدید — مرحلهٔ ۱ (شماره موبایل) و مرحلهٔ ۳ (مشخصات سازمان و مدیر). */
export const signupMobileSchema = z.object({
  mobile: mobileSchema,
});

export type SignupMobileForm = z.infer<typeof signupMobileSchema>;

export const signupCompleteSchema = z
  .object({
    organizationName: z
      .string()
      .trim()
      .min(2, 'نام شرکت یا سازمان باید دست‌کم ۲ نویسه باشد.')
      .max(120, 'نام سازمان حداکثر ۱۲۰ نویسه است.'),
    fullName: z
      .string()
      .trim()
      .min(3, 'نام و نام خانوادگی را کامل بنویسید.')
      .max(80, 'نام و نام خانوادگی حداکثر ۸۰ نویسه است.'),
    email: z
      .string()
      .trim()
      .max(120, 'نشانی ایمیل حداکثر ۱۲۰ نویسه است.')
      .refine((value) => value === '' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value), 'نشانی ایمیل معتبر نیست.'),
    password: passwordSchema,
    repeatPassword: z.string(),
  })
  .refine((data) => data.password === data.repeatPassword, {
    path: ['repeatPassword'],
    message: 'دو رمز یکسان نیستند.',
  });

export type SignupCompleteForm = z.infer<typeof signupCompleteSchema>;

/** قفل موقت پس از ۵ ورود ناموفق، به مدت ۱۵ دقیقه. */
export const LOCKOUT = {
  maxAttempts: 5,
  lockMinutes: 15,
} as const;
