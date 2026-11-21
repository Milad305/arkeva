import { Injectable, type OnModuleInit } from '@nestjs/common';
import { EntityManager, LockMode, MikroORM } from '@mikro-orm/postgresql';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { type JobData, type JobRun, Jobs } from '../../../platform/jobs/jobs.js';
import type { QueueDef } from '../../../platform/jobs/queues.js';
import { OnTick, type TickHandler } from '../../../platform/scheduler/ticks.js';
import { ObjectStorage, projectPrefix } from '../../../platform/storage/object-storage.js';
import { Project } from '../domain/project.entity.js';

// پاک‌سازی پروژهٔ حذف‌شده پس از مهلت ۱۴ روزه (F02 ۸.۴؛ AC-PS-09). تیک سراسری فقط شناسه‌ها را با تابع
// SECURITY DEFINER پیدا می‌کند و برای هر پروژه کار جدا در سازمان خودش صف می‌کند (docs/backend/08 ۴).

/** نگه‌داری پیش‌نویس ویزارد بی‌فعالیت (F02 ۵.۵ `[تأییدشده]`). */
export const WIZARD_DRAFT_TTL_DAYS = 90;

export const PROJECT_PURGE_QUEUE: QueueDef = {
  name: 'projects.purge',
  policy: 'standard',
  retryLimit: 3,
  retryDelaySec: 60,
  retryBackoff: true,
  expireInSeconds: 600,
  priority: 10,
  concurrency: 1,
};

interface PurgeJob extends JobData {
  readonly orgId: string;
  readonly projectId: string;
}

@Injectable()
@OnTick('PurgeTick')
export class ProjectPurge implements TickHandler, OnModuleInit {
  constructor(
    private readonly jobs: Jobs,
    private readonly orm: MikroORM,
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly audit: Audit,
    private readonly storage: ObjectStorage,
  ) {}

  onModuleInit(): void {
    this.jobs.work<PurgeJob>(PROJECT_PURGE_QUEUE, (job) => this.purge(job));
  }

  async onTick(): Promise<number> {
    // پیش‌نویس ویزارد پس از ۹۰ روز بی‌فعالیتی (F02 ۵.۵؛ AC-PS-12). یادآوری پیش از آن با F13.
    await this.orm.em
      .fork()
      .getConnection()
      .execute('select purge_stale_wizard_drafts(?) as purged', [new Date(this.clock.now().getTime() - WIZARD_DRAFT_TTL_DAYS * 86_400_000)]);
    const due = await this.orm.em
      .fork()
      .getConnection()
      .execute<{ org_id: string; project_id: string }[]>('select org_id, project_id from projects_due_for_purge(?)', [this.clock.now()]);
    for (const row of due) await this.jobs.send(null, PROJECT_PURGE_QUEUE, { orgId: row.org_id, projectId: row.project_id });
    return due.length;
  }

  /** حذف کامل؛ ردیف ممیزی با نام و کد می‌ماند (F02 ۸.۴). اعضا و نقش‌ها با کلید خارجی cascade می‌روند. */
  async purge(job: JobRun<PurgeJob>): Promise<void> {
    const purged = await this.em.transactional(async (tx) => {
      const project = await tx.findOne(
        Project,
        { id: job.data.projectId, deletionPurgeAt: { $lte: this.clock.now() } },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      );
      if (!project) return null; // لغو شد یا پیش‌تر پاک شد
      this.audit.record(tx, {
        actor: 'system',
        action: 'project.purged',
        entityType: 'Project',
        entityId: project.id,
        projectId: project.id,
        before: { code: project.code, name: project.name, status: project.status },
        reason: 'پایان مهلت ۱۴ روزهٔ حذف',
      });
      tx.remove(project);
      return { orgId: project.orgId, projectId: project.id };
    });
    // فایل‌های پروژه پس از commit (F20 ۷: پاک‌سازی همهٔ کلیدهای project/{projectId}/؛ بی کار شبکه در تراکنش)
    if (purged) await this.storage.deletePrefix(projectPrefix(purged.orgId, purged.projectId));
  }
}
