import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { EntityManager, MikroORM } from '@mikro-orm/postgresql';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { newId } from '../../../platform/database/ids.js';
import { DomainError, ForbiddenError, NotFoundError, UnauthorizedError } from '../../../platform/http/errors.js';
import { type JobData, type JobRun, Jobs } from '../../../platform/jobs/jobs.js';
import type { QueueDef } from '../../../platform/jobs/queues.js';
import { OnTick, tehranClock, type TickHandler } from '../../../platform/scheduler/ticks.js';
import { fileKey, ObjectStorage } from '../../../platform/storage/object-storage.js';
import { type BackupsView, ProjectBasicsCatalog } from '../../projects/index.js';
import { ProjectExport } from '../domain/backup.entities.js';
import { BackupSettings } from './backup-settings.js';
import { ExportBuilder } from './export-builder.js';

// «دریافت بکاپ کامل پروژه» (F20 ۱۲؛ تصمیم 1405/08/26: `export.full`): درخواست ← کار صف ← ZIP در ذخیره‌سازی ← لینک تا ۲۴ ساعت
// پس از ساخت؛ درخواست و دانلود ممیزی می‌شوند. PurgeTick فایل منقضی را پاک می‌کند.

export const EXPORT_QUEUE: QueueDef = {
  name: 'backups.full-export',
  policy: 'standard',
  retryLimit: 1,
  retryDelaySec: 60,
  retryBackoff: false,
  expireInSeconds: 3600,
  priority: 5,
  concurrency: 1,
};

const LINK_HOURS = 24;

interface ExportJob extends JobData {
  readonly orgId: string;
  readonly exportId: string;
}

@Injectable()
@OnTick('PurgeTick')
export class FullExports implements TickHandler, OnModuleInit {
  private readonly logger = new Logger('FullExports');

  constructor(
    private readonly em: EntityManager,
    private readonly orm: MikroORM,
    private readonly clock: Clock,
    private readonly context: AppContext,
    private readonly audit: Audit,
    private readonly jobs: Jobs,
    private readonly storage: ObjectStorage,
    private readonly catalog: ProjectBasicsCatalog,
    private readonly builder: ExportBuilder,
    private readonly settings: BackupSettings,
  ) {}

  onModuleInit(): void {
    this.jobs.work<ExportJob>(EXPORT_QUEUE, (job) => this.run(job));
  }

  private amounts(projectId: string): boolean {
    const access = this.context.access;
    return !!access && (access.isOrgAdmin || (access.projects.get(projectId)?.has('cbs.view_amounts') ?? false));
  }

  /** `POST /projects/:pid/exports/full` — خروجی در جریان ← همان. */
  async request(projectId: string): Promise<BackupsView> {
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError('AUTH_REQUIRED');
    const code = (await this.catalog.cards([projectId]))[0]?.code ?? 'project';
    const now = this.clock.now();
    await this.em.transactional(async (tx) => {
      if (await tx.findOne(ProjectExport, { projectId, status: { $in: ['queued', 'running'] } })) return;
      const id = newId();
      const includesAmounts = this.amounts(projectId);
      tx.create(ProjectExport, {
        id,
        orgId: actor.orgId,
        projectId,
        status: 'queued',
        includesAmounts,
        storageKey: null,
        fileName: `${code}-full-${tehranClock(now).date}.zip`,
        sizeBytes: null,
        error: null,
        requestedByUserId: actor.userId,
        createdAt: now,
        finishedAt: null,
        expiresAt: null,
      });
      this.audit.record(tx, { action: 'export.full.requested', entityType: 'ProjectExport', entityId: id, projectId, after: { includesAmounts } });
      await this.jobs.send(tx, EXPORT_QUEUE, { orgId: actor.orgId, exportId: id });
    });
    return this.settings.view(projectId);
  }

  async run(job: JobRun<ExportJob>): Promise<void> {
    const row = await this.em.findOne(ProjectExport, { id: job.data.exportId });
    if (!row || row.status === 'done' || row.status === 'expired') return;
    await this.em.transactional(async (tx) => {
      (await tx.findOneOrFail(ProjectExport, { id: row.id })).status = 'running';
    });
    const path = join(tmpdir(), `projeyar-export-${row.id}.zip`);
    try {
      const size = await this.builder.build(row, path, this.clock.now());
      const storageKey = fileKey(row.orgId, row.projectId, 'export', `${row.id}.zip`);
      await this.storage.putFile(storageKey, path, 'application/zip');
      const finishedAt = this.clock.now();
      await this.em.transactional(async (tx) => {
        Object.assign(await tx.findOneOrFail(ProjectExport, { id: row.id }), {
          status: 'done',
          storageKey,
          sizeBytes: size,
          finishedAt,
          expiresAt: new Date(finishedAt.getTime() + LINK_HOURS * 3_600_000),
        });
        this.audit.record(tx, {
          actor: 'system',
          action: 'export.full.created',
          entityType: 'ProjectExport',
          entityId: row.id,
          projectId: row.projectId,
          after: { sizeBytes: size },
        });
      });
    } catch (error) {
      this.logger.error({ err: error, exportId: row.id }, 'full export failed');
      if (job.retryCount >= EXPORT_QUEUE.retryLimit) {
        await this.em.transactional(async (tx) => {
          Object.assign(await tx.findOneOrFail(ProjectExport, { id: row.id }), {
            status: 'failed',
            error: 'ساخت خروجی کامل انجام نشد. دوباره درخواست کنید؛ اگر تکرار شد با پشتیبانی تماس بگیرید.',
            finishedAt: this.clock.now(),
          });
        });
      }
      throw error;
    } finally {
      await rm(path, { force: true });
    }
  }

  /** `GET /projects/:pid/exports/full/:id/download` — لینک تا پایان مهلت ۲۴ ساعته؛ با مبلغ فقط برای دارندهٔ مجوز مبلغ. */
  async download(projectId: string, id: string): Promise<{ url: string; fileName: string; expiresAt: string }> {
    const row = await this.em.findOne(ProjectExport, { id, projectId });
    if (!row) throw new NotFoundError('BACKUP_NOT_FOUND');
    const now = this.clock.now();
    if (row.status === 'expired' || (row.expiresAt && row.expiresAt <= now)) {
      throw new DomainError('BACKUP_INVALID', 409, { reason: 'مهلت ۲۴ ساعتهٔ این خروجی گذشته است. خروجی تازه بگیرید.' });
    }
    if (row.status !== 'done' || !row.storageKey || !row.expiresAt)
      throw new DomainError('BACKUP_INVALID', 409, { reason: 'این خروجی هنوز آماده نیست. کمی بعد دوباره سر بزنید.' });
    if (row.includesAmounts && !this.amounts(projectId)) {
      throw new ForbiddenError('PERMISSION_DENIED', {
        requiredPermission: 'cbs.view_amounts',
        reason: 'این خروجی مبلغ دارد. خروجی تازه بگیرید تا بی مبلغ ساخته شود.',
      });
    }
    const { storageKey, expiresAt, fileName } = row;
    await this.em.transactional((tx) => {
      this.audit.record(tx, { action: 'export.full.downloaded', entityType: 'ProjectExport', entityId: id, projectId });
      return Promise.resolve();
    });
    const ttlSec = Math.max(1, Math.min(LINK_HOURS * 3600, Math.floor((expiresAt.getTime() - now.getTime()) / 1000)));
    return {
      url: await this.storage.signedUrl(storageKey, { ttlSec, fileName, contentType: 'application/zip' }),
      fileName,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /** PurgeTick: خروجی منقضی ← حذف فایل (تابع SECURITY DEFINER بیرون از سازمان؛ فقط شناسه و کلید). */
  async onTick(): Promise<number> {
    const rows = await this.orm.em
      .fork()
      .getConnection()
      .execute<{ storage_key: string | null }[]>('select storage_key from expire_project_exports(?)', [this.clock.now()]);
    for (const row of rows) if (row.storage_key) await this.storage.delete(row.storage_key);
    return rows.length;
  }
}
