import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

// رازهای یک‌بارمصرف (docs/backend/07 ۲). فقط هش در پایگاه داده؛ مقایسه زمان‌ثابت.

/** رمز تصادفی ۲۵۶ بیتی، امن برای نشانی و کوکی. */
export function randomSecret(): string {
  return randomBytes(32).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** مقایسهٔ زمان‌ثابت دو هش هگز هم‌طول. */
export function sameHash(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

/** کد شش‌رقمی W03. */
export function sixDigitCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/** هش کد OTP به چالش گره می‌خورد تا هش یکسان برای دو چالش ساخته نشود. */
export function otpCodeHash(challengeId: string, code: string): string {
  return sha256(`${challengeId}:${code}`);
}

/**
 * توکن‌های بیرونی با پیشوند سازمان: «orgId.بقیه». سازمان راز نیست؛ فقط می‌گوید ردیف را در کدام
 * سازمان با RLS جست‌وجو کنیم. پیشوند دست‌کاری‌شده هیچ ردیفی پیدا نمی‌کند.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function splitToken(token: string, parts: number): string[] | null {
  const segments = token.split('.');
  if (segments.length !== parts || segments.some((segment) => !segment)) return null;
  const [orgPart = ''] = segments;
  if (!UUID.test(orgPart)) return null;
  return segments;
}

export function isUuid(value: string): boolean {
  return UUID.test(value);
}
