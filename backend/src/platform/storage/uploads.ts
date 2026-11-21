import { Injectable } from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/postgresql';
import { createHash } from 'node:crypto';
import { AppConfig } from '../../config/config.js';
import { Clock } from '../clock/clock.js';
import { AppContext } from '../context/app-context.js';
import { newId } from '../database/ids.js';
import { AccessResolver } from '../security/access.js';
import { ConflictError, DomainError, ForbiddenError, NotFoundError, UnauthorizedError } from '../http/errors.js';
import { fileKey, type FileKind, ObjectStorage, partKey, partPrefix } from './object-storage.js';
import { StoredFile, UploadSession } from './storage.entities.js';
import { UploadKinds } from './upload-kinds.js';

// بارگذاری قابل‌ادامه (F20 ۷؛ D10؛ AC-PL-06): نشست ← پارچه‌ها (هر کدام جدا و تکرارپذیر) ← تکمیل با SHA-256. هش نادرست
// پارچه‌ها را پاک می‌کند و ارسال دوباره می‌خواهد. کار ذخیره‌سازی بیرون از تراکنش (04 ۶)؛ تراکنش فقط ردیف‌ها.

/** اندازهٔ هر پارچه `[پیش‌فرض فنی]` — عکس ۸ مگابایتی در ۸ پارچه. */
export const PART_SIZE = 1024 * 1024;
/** عمر نشست ناتمام `[پیش‌فرض فنی]`؛ پس از آن PurgeTick پاکش می‌کند. */
export const UPLOAD_TTL_HOURS = 24;

const invalid = (reason: string) => new DomainError('UPLOAD_INVALID', 422, { reason });

export interface UploadView {
  readonly uploadId: string;
  readonly status: 'open' | 'complete';
  readonly partSize: number;
  readonly partCount: number;
  readonly receivedParts: number[];
  readonly missingParts: number[];
  readonly fileId: string | null;
}

@Injectable()
export class Uploads {
  constructor(
    private readonly em: EntityManager,
    private readonly config: AppConfig,
    private readonly clock: Clock,
    private readonly context: AppContext,
    private readonly storage: ObjectStorage,
    private readonly kinds: UploadKinds,
    private readonly resolver: AccessResolver,
  ) {}

  private actor() {
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError();
    return actor;
  }

  /** مسیرهای فایل `authenticated`‌اند؛ دسترسی پروژه را خودمان حل می‌کنیم تا نوع فایل کد موضوع را بسنجد. */
  private async withAccess() {
    const actor = this.actor();
    if (!this.context.access) this.context.setAccess(await this.resolver.resolve(actor));
    return actor;
  }

  /** `POST /uploads` */
  async create(input: {
    readonly projectId: string;
    readonly kind: FileKind;
    readonly subjectId?: string | null;
    readonly fileName: string;
    readonly contentType: string;
    readonly size: number;
  }): Promise<UploadView> {
    const actor = await this.withAccess();
    const handler = this.kinds.get(input.kind);
    if (!handler) throw invalid('این نوع فایل هنوز بارگذاری نمی‌پذیرد.');
    if (input.size <= 0 || input.size > handler.maxBytes) throw invalid(`حجم فایل باید حداکثر ${Math.round(handler.maxBytes / 1024 / 1024)} مگابایت باشد.`);
    if (handler.contentTypes && !handler.contentTypes.includes(input.contentType.toLowerCase())) throw invalid('نوع فایل پذیرفته نیست.');
    await handler.authorizeUpload(this.em, { projectId: input.projectId, subjectId: input.subjectId ?? null, userId: actor.userId });
    const now = this.clock.now();
    const session = this.em.create(UploadSession, {
      id: newId(),
      orgId: actor.orgId,
      projectId: input.projectId,
      userId: actor.userId,
      kind: input.kind,
      subjectId: input.subjectId ?? null,
      fileName: input.fileName.trim().slice(0, 200) || 'file',
      contentType: input.contentType.toLowerCase(),
      size: input.size,
      partSize: PART_SIZE,
      partCount: Math.ceil(input.size / PART_SIZE),
      receivedParts: [],
      status: 'open',
      fileId: null,
      expiresAt: new Date(now.getTime() + UPLOAD_TTL_HOURS * 3_600_000),
      createdAt: now,
      updatedAt: now,
    });
    await this.em.flush();
    return view(session);
  }

  /** `GET /uploads/:id` — پارچه‌های رسیده تا ادامه از همان‌جا (AC-PL-06). */
  async status(uploadId: string): Promise<UploadView> {
    return view(await this.own(this.em, uploadId));
  }

  /** `PUT /uploads/:id/parts/:n` — تکرار همان پارچه بی‌اثر است. */
  async putPart(uploadId: string, part: number, body: Buffer): Promise<UploadView> {
    const session = await this.own(this.em, uploadId);
    if (session.status !== 'open') throw new ConflictError('UPLOAD_INVALID', { reason: 'این بارگذاری تمام شده است.' });
    if (!Number.isInteger(part) || part < 1 || part > session.partCount) throw invalid(`شمارهٔ پارچه باید ۱ تا ${session.partCount} باشد.`);
    const expected = part < session.partCount ? session.partSize : session.size - (session.partCount - 1) * session.partSize;
    if (body.length !== expected) throw invalid(`پارچهٔ ${part} باید ${expected} بایت باشد.`);
    await this.storage.put(partKey(session.orgId, session.id, part), body, 'application/octet-stream');
    return this.em.transactional(async (tx) => {
      const locked = await this.own(tx, uploadId, true);
      if (!locked.receivedParts.includes(part)) locked.receivedParts = [...locked.receivedParts, part].sort((a, b) => a - b);
      locked.updatedAt = this.clock.now();
      return view(locked);
    });
  }

  /** `POST /uploads/:id/complete {sha256}` — هش هم با اعلام کاربر و هم با موضوع (عکس D10) باید بخواند. */
  async complete(uploadId: string, sha256: string): Promise<UploadView> {
    const session = await this.own(this.em, uploadId);
    if (session.status === 'complete') return view(session);
    const missing = missingOf(session);
    if (missing.length > 0) throw new ConflictError('UPLOAD_INCOMPLETE', { missingParts: missing });
    const handler = this.kinds.get(session.kind);
    if (!handler) throw invalid('این نوع فایل هنوز بارگذاری نمی‌پذیرد.');
    await this.withAccess();
    const { expectedSha256 } = await handler.authorizeUpload(this.em, {
      projectId: session.projectId,
      subjectId: session.subjectId ?? null,
      userId: session.userId,
    });

    const parts: Buffer[] = [];
    for (let part = 1; part <= session.partCount; part += 1) {
      const chunk = await this.storage.get(partKey(session.orgId, session.id, part));
      if (!chunk) throw new ConflictError('UPLOAD_INCOMPLETE', { missingParts: [part] });
      parts.push(chunk);
    }
    const body = Buffer.concat(parts);
    const actual = createHash('sha256').update(body).digest('hex');
    const declared = sha256.trim().toLowerCase();
    if (actual !== declared || (expectedSha256 !== null && actual !== expectedSha256.toLowerCase())) {
      // ارسال دوباره از اول (F20 ۷)
      await this.storage.deletePrefix(partPrefix(session.orgId, session.id));
      await this.em.nativeUpdate(UploadSession, { id: session.id }, { receivedParts: [], updatedAt: this.clock.now() });
      throw new DomainError('UPLOAD_HASH_MISMATCH', 422, { expected: declared, received: actual }, true);
    }

    const fileId = newId();
    const key = fileKey(session.orgId, session.projectId, session.kind, fileId);
    await this.storage.put(key, body, session.contentType);
    try {
      const result = await this.em.transactional(async (tx) => {
        const locked = await this.own(tx, uploadId, true);
        if (locked.status === 'complete') return view(locked);
        const file = tx.create(StoredFile, {
          id: fileId,
          orgId: locked.orgId,
          projectId: locked.projectId,
          kind: locked.kind,
          subjectId: locked.subjectId ?? null,
          storageKey: key,
          fileName: locked.fileName,
          contentType: locked.contentType,
          size: locked.size,
          sha256: actual,
          uploadedByUserId: locked.userId,
          createdAt: this.clock.now(),
        });
        await tx.flush();
        await handler.completed(tx, file);
        Object.assign(locked, { status: 'complete', fileId, updatedAt: this.clock.now() });
        return view(locked);
      });
      await this.storage.deletePrefix(partPrefix(session.orgId, session.id));
      return result;
    } catch (error) {
      await this.storage.delete(key);
      throw error;
    }
  }

  /** `GET /files/:fileId/link` — لینک ۵ دقیقه‌ای پس از بررسی پروژه و دسترسی (AC-PL-07). */
  async link(fileId: string): Promise<{ url: string; expiresAt: string; fileName: string; contentType: string; size: number }> {
    const actor = await this.withAccess();
    const file = await this.em.findOne(StoredFile, { id: fileId });
    if (!file) throw new NotFoundError('FILE_NOT_FOUND');
    const handler = this.kinds.get(file.kind);
    if (!handler) throw new ForbiddenError();
    await handler.authorizeRead(this.em, file, actor.userId);
    const ttlSec = this.config.storage.linkTtlSec;
    const url = await this.storage.signedUrl(file.storageKey, { ttlSec, fileName: file.fileName, contentType: file.contentType });
    return {
      url,
      expiresAt: new Date(this.clock.now().getTime() + ttlSec * 1000).toISOString(),
      fileName: file.fileName,
      contentType: file.contentType,
      size: file.size,
    };
  }

  private async own(em: EntityManager, uploadId: string, lock = false): Promise<UploadSession> {
    const actor = this.actor();
    const session = await em.findOne(UploadSession, { id: uploadId }, lock ? { lockMode: LockMode.PESSIMISTIC_WRITE } : {});
    // نشست دیگران مثل نبود (بی نشت وجود)
    if (!session || session.userId !== actor.userId || (session.status === 'open' && session.expiresAt < this.clock.now())) {
      throw new NotFoundError('UPLOAD_NOT_FOUND');
    }
    return session;
  }
}

function missingOf(session: UploadSession): number[] {
  const received = new Set(session.receivedParts);
  return Array.from({ length: session.partCount }, (_, index) => index + 1).filter((part) => !received.has(part));
}

function view(session: UploadSession): UploadView {
  return {
    uploadId: session.id,
    status: session.status,
    partSize: session.partSize,
    partCount: session.partCount,
    receivedParts: [...session.receivedParts],
    missingParts: missingOf(session),
    fileId: session.fileId ?? null,
  };
}
