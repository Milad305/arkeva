// پنل ممکن است زیر یک زیرمسیر سرو شود (مثلاً `/panel/` روی IP پیش از دامنه؛ deploy/README.md).
// Vite زیرمسیر را از `VITE_BASE_PATH` در `base` می‌گذارد و `BASE_URL` همیشه با `/` تمام می‌شود.
// مسیریاب و هر پیوندی که بیرون از مسیریاب ساخته می‌شود (کپی پیوند، برگهٔ تازه) از همین‌جا می‌خوانند.

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** basename مسیریاب: `/` یا مثلاً `/panel`. */
export const ROUTER_BASENAME = BASE || '/';

/** مسیر برنامه با زیرمسیر استقرار: `/projects/1` ← `/panel/projects/1`. */
export function appPath(path: string): string {
  return `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

/** پیوند کامل برای کپی یا اشتراک: مبدأ + زیرمسیر + مسیر. */
export function appLink(path: string): string {
  return `${window.location.origin}${appPath(path)}`;
}
