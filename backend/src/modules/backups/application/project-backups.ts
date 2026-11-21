import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { AppConfig } from '../../../config/config.js';
import { memorySink, ZipWriter } from '../../../platform/archive/zip.js';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { newId } from '../../../platform/database/ids.js';
import { fileKey, ObjectStorage } from '../../../platform/storage/object-storage.js';
import { sealBackup } from '../domain/backup-crypto.js';
import { type BackupKind, ProjectBackup } from '../domain/backup.entities.js';
import { ProjectDump, type ProjectSnapshot } from './project-dump.js';

// ساخت نسخهٔ پشتیبان پروژه (F20 ۱۲؛ AC-PL-12): دامپ منطقی همهٔ دادهٔ پروژه (JSON Lines هر جدول) + فهرست فایل‌ها با کلید، اندازه و
// هش، فشرده در ZIP و رمزنگاری‌شده با کلید سازمان. نگه‌داری: ۳۰ خودکار و ۱۰ دستی آخر (تصمیم 1405/08/26). بازیابی فقط پشتیبانی
// (اسکریپت `backup:decrypt`؛ docs/backend/10-operations.md ۷).

export const BACKUP_RETENTION: Readonly<Record<BackupKind, number>> = { auto: 30, manual: 10 };

export interface BackupRequest {
  readonly orgId: string;
  readonly projectId: string;
  readonly kind: BackupKind;
  readonly runDate: string | null;
  readonly note: string | null;
  readonly userId: string | null;
}

@Injectable()
export class ProjectBackups {
  private readonly logger = new Logger('ProjectBackups');

  constructor(
    private readonly em: EntityManager,
    private readonly config: AppConfig,
    private readonly clock: Clock,
    private readonly audit: Audit,
    private readonly storage: ObjectStorage,
    private readonly dump: ProjectDump,
  ) {}

  private async archive(request: BackupRequest, snapshot: ProjectSnapshot, at: Date): Promise<Buffer> {
    const sink = memorySink();
    const zip = new ZipWriter(sink, at);
    const meta = {
      format: 'projeyar-project-backup',
      version: 1,
      orgId: request.orgId,
      projectId: request.projectId,
      kind: request.kind,
      note: request.note,
      createdAt: at.toISOString(),
      tables: snapshot.tables.map((table) => ({ name: table.name, rows: table.rows.length })),
      files: { count: snapshot.files.length, bytes: snapshot.files.reduce((sum, file) => sum + file.size, 0) },
    };
    await zip.add('meta.json', Buffer.from(JSON.stringify(meta, null, 2)));
    for (const table of snapshot.tables) {
      await zip.add(`data/${table.name}.jsonl`, Buffer.from(table.rows.map((row) => JSON.stringify(row)).join('\n')));
    }
    const manifest = snapshot.files.map((file) => ({
      table: file.table,
      id: file.row['id'] ?? null,
      key: file.storageKey,
      size: file.size,
      sha256: file.row['sha256'] ?? null,
    }));
    await zip.add('files.json', Buffer.from(JSON.stringify(manifest, null, 2)));
    await zip.finish();
    return sink.buffer();
  }

  /** نسخهٔ تازه و پاک‌سازی قدیمی‌ترها؛ خودکار تکراری همان روز ← همان ردیف. */
  async create(request: BackupRequest): Promise<ProjectBackup> {
    if (request.runDate) {
      const existing = await this.em.findOne(ProjectBackup, { projectId: request.projectId, kind: 'auto', runDate: request.runDate });
      if (existing) return existing;
    }
    const at = this.clock.now();
    const snapshot = await this.dump.snapshot(request.projectId, true);
    const key = this.config.backup.keys[0];
    if (!key) throw new Error('کلید پشتیبان (BACKUP_KEYS) تنظیم نشده است');
    const sealed = sealBackup(await this.archive(request, snapshot, at), key, request.orgId);
    const id = newId();
    const storageKey = fileKey(request.orgId, request.projectId, 'backup', `${id}.pyb`);
    await this.storage.put(storageKey, sealed, 'application/octet-stream');
    const { row, expired } = await this.em.transactional(async (tx) => {
      const created = tx.create(ProjectBackup, {
        id,
        orgId: request.orgId,
        projectId: request.projectId,
        kind: request.kind,
        runDate: request.runDate,
        note: request.note,
        storageKey,
        keyId: key.kid,
        sizeBytes: sealed.length,
        tableCount: snapshot.tables.length,
        rowCount: snapshot.tables.reduce((sum, table) => sum + table.rows.length, 0),
        fileCount: snapshot.files.length,
        fileBytes: snapshot.files.reduce((sum, file) => sum + file.size, 0),
        createdByUserId: request.userId,
        createdAt: at,
      });
      this.audit.record(tx, {
        ...(request.userId ? {} : { actor: 'system' as const, orgId: request.orgId }),
        action: 'backup.created',
        entityType: 'ProjectBackup',
        entityId: id,
        projectId: request.projectId,
        after: { kind: request.kind, note: request.note, sizeBytes: sealed.length },
      });
      return { row: created, expired: await this.retain(tx, request.projectId, request.kind, id) };
    });
    for (const old of expired)
      await this.storage.delete(old).catch((error: unknown) => this.logger.warn({ err: error, key: old }, 'backup file cleanup failed'));
    return row;
  }

  /** فراتر از سقف ← حذف ردیف؛ کلید فایل‌ها برای پاک‌کردن پس از commit. */
  private async retain(tx: EntityManager, projectId: string, kind: BackupKind, createdId: string): Promise<string[]> {
    const rows = await tx.find(ProjectBackup, { projectId, kind }, { orderBy: { createdAt: 'desc', id: 'desc' } });
    const kept = new Set([
      createdId,
      ...rows
        .filter((row) => row.id !== createdId)
        .slice(0, BACKUP_RETENTION[kind] - 1)
        .map((row) => row.id),
    ]);
    const expired = rows.filter((row) => !kept.has(row.id));
    for (const row of expired) tx.remove(row);
    return expired.map((row) => row.storageKey);
  }
}
