import { Injectable, type OnModuleInit } from '@nestjs/common';
import { EntityManager, MikroORM } from '@mikro-orm/postgresql';
import { Clock } from '../../../platform/clock/clock.js';
import { type JobData, Jobs } from '../../../platform/jobs/jobs.js';
import type { QueueDef } from '../../../platform/jobs/queues.js';
import { type DomainEventEnvelope, type EventConsumer, OnEvents } from '../../../platform/outbox/event-consumer.js';
import { OnTick, type TickHandler } from '../../../platform/scheduler/ticks.js';
import { IdentityService } from '../../identity/index.js';
import { Notifier } from '../../notifications/index.js';
import { ReportSchedule } from '../domain/report.entities.js';
import { ReportSchedules } from './report-schedules.js';

// راه‌اندازهای زمان‌بندی گزارش (management-reports.md ۷.۴، ۱۲):
//   • تیک ساعتی ← زمان‌بندی‌های سررسیده، هر کدام کار صف خودش (AC-MR-05؛ `[پیش‌فرض فنی]` به‌جای تیک ۱۵ دقیقه‌ای).
//   • PeriodClosed ← `on_period_close` همان پروژه با همان دوره (AC-MR-06).
//   • حذف عضو ← کنار رفتن از گیرندگان با اعلان به سازنده؛ بایگانی پروژه ← توقف زمان‌بندی‌ها.

export const SCHEDULE_QUEUE: QueueDef = {
  name: 'report.schedule',
  policy: 'standard',
  retryLimit: 2,
  retryDelaySec: 30,
  retryBackoff: true,
  expireInSeconds: 300,
  priority: 20,
  concurrency: 1,
};

interface ScheduleJob extends JobData {
  readonly orgId: string;
  readonly scheduleId: string;
}

@Injectable()
@OnTick('HourlyTick')
export class ReportScheduleTick implements TickHandler, OnModuleInit {
  constructor(
    private readonly em: EntityManager,
    private readonly orm: MikroORM,
    private readonly clock: Clock,
    private readonly jobs: Jobs,
    private readonly schedules: ReportSchedules,
  ) {}

  onModuleInit(): void {
    this.jobs.work<ScheduleJob>(SCHEDULE_QUEUE, (job) => this.runDue(job.data.scheduleId));
  }

  async onTick(): Promise<number> {
    const due = await this.orm.em
      .fork()
      .getConnection()
      .execute<{ id: string; org_id: string }[]>('select id, org_id from due_report_schedules(?)', [this.clock.now()]);
    for (const row of due) await this.jobs.send(null, SCHEDULE_QUEUE, { orgId: row.org_id, scheduleId: row.id }, { singletonKey: row.id });
    return due.length;
  }

  /** هنوز سررسیده و فعال ← اجرا و نوبت بعد. */
  async runDue(scheduleId: string): Promise<void> {
    await this.em.transactional(async (tx) => {
      const schedule = await tx.findOne(ReportSchedule, { id: scheduleId });
      if (!schedule?.enabled || !schedule.nextRunAt || schedule.nextRunAt > this.clock.now()) return;
      await this.schedules.execute(tx, schedule, null, null, true);
    });
  }
}

@Injectable()
@OnEvents({ name: 'reports.on-period-closed', events: ['PeriodClosed'] })
export class ReportPeriodClosed implements EventConsumer {
  constructor(private readonly schedules: ReportSchedules) {}

  async handle(event: DomainEventEnvelope, tx: EntityManager): Promise<void> {
    const periodId = event.payload['periodId'];
    if (!event.projectId || typeof periodId !== 'string') return;
    const rows = await tx.find(ReportSchedule, { projectId: event.projectId, frequency: 'on_period_close', enabled: true });
    for (const schedule of rows) await this.schedules.execute(tx, schedule, periodId, null);
  }
}

@Injectable()
@OnEvents({ name: 'reports.on-project-changes', events: ['MemberChanged', 'ProjectStatusChanged'] })
export class ReportScheduleUpkeep implements EventConsumer {
  constructor(
    private readonly clock: Clock,
    private readonly notifier: Notifier,
    private readonly identity: IdentityService,
  ) {}

  async handle(event: DomainEventEnvelope, tx: EntityManager): Promise<void> {
    if (!event.projectId) return;
    const rows = await tx.find(ReportSchedule, { projectId: event.projectId });
    if (rows.length === 0) return;
    const now = this.clock.now();
    if (event.type === 'ProjectStatusChanged') {
      if (event.payload['to'] !== 'archived') return;
      for (const row of rows)
        Object.assign(row, {
          enabled: false,
          nextRunAt: null,
          note: { text: 'پروژه بایگانی شد و زمان‌بندی متوقف است.', tone: 'wrn', icon: 'pause-circle' },
          updatedAt: now,
        });
      return;
    }
    const userId = event.payload['userId'];
    if (event.payload['change'] !== 'removed' || typeof userId !== 'string') return;
    const name = (await this.identity.personRefs([userId])).get(userId)?.fullName ?? 'یک گیرنده';
    for (const row of rows) {
      if (!row.recipients.some((entry) => entry.kind === 'user' && entry.id === userId)) continue;
      row.recipients = row.recipients.filter((entry) => !(entry.kind === 'user' && entry.id === userId));
      row.note = { text: `${name} از پروژه حذف شد و از گیرندگان کنار رفت.`, tone: 'wrn', icon: 'user-minus' };
      row.updatedAt = now;
      await this.notifier.notify(tx, {
        code: 'NT-RPT-01',
        projectId: event.projectId,
        recipients: [row.createdByUserId],
        subjectId: row.id,
        title: `${name} از گیرندگان زمان‌بندی گزارش کنار رفت.`,
        body: 'گیرنده از پروژه حذف شده است.',
        link: '/reports',
      });
    }
  }
}
