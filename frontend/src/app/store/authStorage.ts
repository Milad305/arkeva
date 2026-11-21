// تنها جایی که توکن نشست خوانده و نوشته می‌شود.
//
// سرور واقعی (docs/backend/07 ۲): توکن دسترسی فقط در **حافظه** است و تازه‌سازی با کوکی HttpOnly
// انجام می‌شود؛ پس پس از تازه‌کردن صفحه نشست از `POST /auth/refresh` برمی‌گردد، نه از localStorage.

const STORAGE_KEY = 'pj.auth';

export interface StoredSession {
  accessToken: string;
  refreshToken?: string;
  userId: string | number;
}

/** ورود از سرور واقعی است؟ آن‌وقت هیچ توکنی در ذخیره‌سازی مرورگر نمی‌ماند. */
export function usesServerSession(): boolean {
  return true;
}

let memoryToken: string | null = null;

export function readSession(): StoredSession | null {
  if (usesServerSession()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      'accessToken' in parsed &&
      typeof (parsed as StoredSession).accessToken === 'string'
    ) {
      return parsed as StoredSession;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeSession(session: StoredSession | null): void {
  memoryToken = session?.accessToken ?? null;
  try {
    // با سرور واقعی هرگز؛ نسخهٔ ماندهٔ قبلی هم پاک می‌شود
    if (session === null || usesServerSession()) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // حالت ناشناس مرورگر یا storage پر — نشست فقط در حافظه می‌ماند
  }
}

/** توکن جاری برای دانلودهایی که بیرون از RTK Query fetch می‌کنند. */
export function readAccessToken(): string | null {
  return memoryToken ?? readSession()?.accessToken ?? null;
}
