import { defineEntity, p } from '@mikro-orm/postgresql';
import { FILE_KINDS } from './object-storage.js';

// بارگذاری قابل‌ادامه و فهرست فایل‌ها (F20 ۷؛ D10). زیرساخت؛ هر ماژول فقط از راه رجیستری نوع فایل (UploadKinds) به آن
// وصل می‌شود.

export const UPLOAD_STATUSES = ['open', 'complete'] as const;

const UploadSessionSchema = defineEntity({
  name: 'UploadSession',
  tableName: 'upload_session',
  properties: {
    id: p.uuid().primary(),
    orgId: p.uuid(),
    projectId: p.uuid(),
    userId: p.uuid(),
    kind: p.enum(FILE_KINDS),
    /** موضوع نوع فایل، مثل شناسهٔ FieldPhoto برای عکس. */
    subjectId: p.uuid().nullable(),
    fileName: p.string(),
    contentType: p.string(),
    size: p.integer(),
    partSize: p.integer(),
    partCount: p.integer(),
    receivedParts: p.json<number[]>(),
    status: p.enum(UPLOAD_STATUSES).default('open'),
    fileId: p.uuid().nullable(),
    expiresAt: p.datetime(),
    createdAt: p.datetime(),
    updatedAt: p.datetime(),
  },
});
export class UploadSession extends UploadSessionSchema.class {}
UploadSessionSchema.setClass(UploadSession);

const StoredFileSchema = defineEntity({
  name: 'StoredFile',
  tableName: 'stored_file',
  properties: {
    id: p.uuid().primary(),
    orgId: p.uuid(),
    projectId: p.uuid(),
    kind: p.enum(FILE_KINDS),
    subjectId: p.uuid().nullable(),
    storageKey: p.string(),
    fileName: p.string(),
    contentType: p.string(),
    size: p.integer(),
    sha256: p.string(),
    uploadedByUserId: p.uuid(),
    createdAt: p.datetime(),
  },
});
export class StoredFile extends StoredFileSchema.class {}
StoredFileSchema.setClass(StoredFile);

export const STORAGE_ENTITIES = [UploadSession, StoredFile];
