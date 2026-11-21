// ذخیره‌سازی شیء (F20 ۷؛ D12). رابط سازگار با S3؛ دو راه‌انداز: دیسک (توسعه، تست، نصب تک‌سرور؛ تصمیم 1405/08/24) و S3/MinIO.
import type { Readable } from 'node:stream';

// کار شبکه‌ای درون تراکنش نیست (04 ۶): فراخواننده پیش یا پس از تراکنش صدا می‌زند.

export interface SignedLinkOptions {
  readonly ttlSec: number;
  /** نام فایل در Content-Disposition. */
  readonly fileName: string;
  readonly contentType: string;
}

export abstract class ObjectStorage {
  abstract put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** فایل بزرگ از دیسک محلی، بی بارگذاری در حافظه (خروجی کامل پروژه، F20 ۱۲). */
  abstract putFile(key: string, path: string, contentType: string): Promise<void>;
  /** خواندن جریانی؛ نبود ← null. */
  abstract openRead(key: string): Promise<Readable | null>;
  /** نبود ← null. */
  abstract get(key: string): Promise<Buffer | null>;
  abstract delete(key: string): Promise<void>;
  /** همهٔ کلیدهای زیر پیشوند (پاک‌سازی پروژه در PurgeTick)؛ شمار حذف‌شده. */
  abstract deletePrefix(prefix: string): Promise<number>;
  /** لینک کوتاه‌مدت دانلود؛ هیچ فایلی عمومی نیست (AC-PL-07). */
  abstract signedUrl(key: string, options: SignedLinkOptions): Promise<string>;
}

export const FILE_KINDS = ['photo', 'issue_photo', 'attachment', 'import', 'export', 'report', 'backup'] as const;
export type FileKind = (typeof FILE_KINDS)[number];

/** `org/{orgId}/project/{projectId}/{kind}/{uuid}` (F20 ۷). */
export const fileKey = (orgId: string, projectId: string, kind: FileKind, id: string): string => `org/${orgId}/project/${projectId}/${kind}/${id}`;
export const projectPrefix = (orgId: string, projectId: string): string => `org/${orgId}/project/${projectId}/`;
/** پارچه‌های بارگذاری ناتمام، بیرون از کلید نهایی. */
export const partKey = (orgId: string, uploadId: string, part: number): string => `org/${orgId}/uploads/${uploadId}/${String(part).padStart(5, '0')}`;
export const partPrefix = (orgId: string, uploadId: string): string => `org/${orgId}/uploads/${uploadId}/`;

/** کلید فقط از بخش‌های امن؛ هیچ «..» یا مسیر مطلق (راه‌انداز دیسک). */
export function assertSafeKey(key: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9/_.-]*$/.test(key) || key.split('/').some((part) => part === '..' || part === '.' || part === '')) {
    throw new Error(`کلید ذخیره‌سازی نامعتبر: ${key}`);
  }
}
