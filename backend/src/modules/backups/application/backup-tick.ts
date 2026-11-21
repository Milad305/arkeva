import { Injectable, type OnModuleInit } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/postgresql';
import { Clock } from '../../../platform/clock/clock.js';
import { type JobData, type JobRun, Jobs } from '../../../platform/jobs/jobs.js';
import type { QueueDef } from '../../../platform/jobs/queues.js';
import { DAILY_TICKS, latestDueDate, OnTick, type TickHandler } from '../../../platform/scheduler/ticks.js';
import { ProjectBackups } from './project-backups.js';

// پشتیبان خودکار (F20 ۱۲؛ AC-PL-12): BackupTick ساعت ۰۲:۰۰ تهران ← پروژه‌های «روزانه» هر شب و «هفتگی» بامداد جمعه (تصمیم
// 1405/08/26) ← هر پروژه کار جدا در سازمان خودش. بایگانی پشتیبان نمی‌گیرد و نسخه‌هایش می‌مانند. روزهای جاماندهٔ خاموشی جبران
// نمی‌شوند: فقط آخرین موعد پشتیبان می‌گیرد `[پیش‌فرض فنی]`.

export const BACKUP_QUEUE: QueueDef = {
  name: 'backups.project',
  policy: 'standard',
  retryLimit: 2,
  retryDelaySec: 120,
  retryBackoff: true,
  expireInSeconds: 1800,
  priority: 5,
  concurrency: 1,
};

const BACKUP_TICK = DAILY_TICKS.find((tick) => tick.name === 'BackupTick') ?? { name: 'BackupTick' as const, hour: 2, minute: 0 };
const FRIDAY = 5;

interface BackupJob extends JobData {
  readonly orgId: string;
  readonly projectId: string;
  readonly runDate: string;
}

@Injectable()
@OnTick('BackupTick')
export class BackupTick implements TickHandler, OnModuleInit {
  constructor(
    private readonly orm: MikroORM,
    private readonly clock: Clock,
    private readonly jobs: Jobs,
    private readonly backups: ProjectBackups,
  ) {}

  onModuleInit(): void {
    this.jobs.work<BackupJob>(BACKUP_QUEUE, (job) => this.run(job));
  }

  async onTick(_tick: string, runDate: string): Promise<number> {
    if (runDate !== latestDueDate(BACKUP_TICK, this.clock.now())) return 0;
    const weekly = new Date(`${runDate}T00:00:00Z`).getUTCDay() === FRIDAY;
    const due = await this.orm.em
      .fork()
      .getConnection()
      .execute<{ org_id: string; project_id: string }[]>('select org_id, project_id from due_project_backups(?)', [weekly]);
    for (const row of due) {
      await this.jobs.send(null, BACKUP_QUEUE, { orgId: row.org_id, projectId: row.project_id, runDate }, { singletonKey: `${row.project_id}:${runDate}` });
    }
    return due.length;
  }

  async run(job: JobRun<BackupJob>): Promise<void> {
    const { orgId, projectId, runDate } = job.data;
    await this.backups.create({ orgId, projectId, kind: 'auto', runDate, note: null, userId: null });
  }
}
