import { Injectable } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/postgresql';
import type { FileKind } from './object-storage.js';
import type { StoredFile } from './storage.entities.js';

// رجیستری نوع فایل: هر ماژول برای نوع خودش (عکس گزارش مال field) قاعدهٔ اجازه، سقف حجم و کار پس از تکمیل را ثبت می‌کند —
// زیرساخت به ماژول دامنه وابسته نمی‌شود (همان الگوی Jobs.work). نوع ثبت‌نشده بارگذاری نمی‌پذیرد.

export interface UploadRequest {
  readonly projectId: string;
  readonly subjectId: string | null;
  readonly userId: string;
}

export interface KindHandler {
  /** F20 ۷: عکس ۸، پیوست ۲۰، ورود MSP ۲۰ مگابایت. */
  readonly maxBytes: number;
  /** نوع‌های MIME پذیرفته؛ تهی = همه. */
  readonly contentTypes: readonly string[] | null;
  /** پیش از ساخت نشست؛ خطای دامنه برای رد. هش اعلام‌شدهٔ موضوع (عکس D10) اگر هست. */
  authorizeUpload(em: EntityManager, request: UploadRequest): Promise<{ readonly expectedSha256: string | null }>;
  /** پیش از لینک دانلود (AC-PL-07). */
  authorizeRead(em: EntityManager, file: StoredFile, userId: string): Promise<void>;
  /** درون تراکنش تکمیل، پس از ثبت StoredFile. */
  completed(tx: EntityManager, file: StoredFile): Promise<void>;
}

@Injectable()
export class UploadKinds {
  private readonly handlers = new Map<FileKind, KindHandler>();

  register(kind: FileKind, handler: KindHandler): void {
    if (this.handlers.has(kind)) throw new Error(`نوع فایل ${kind} دو بار ثبت شد`);
    this.handlers.set(kind, handler);
  }

  get(kind: FileKind): KindHandler | undefined {
    return this.handlers.get(kind);
  }
}
