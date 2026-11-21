import { Injectable, type OnModuleInit } from '@nestjs/common';
import { EntityManager, MikroORM } from '@mikro-orm/postgresql';
import { type JobData, Jobs } from '../../../platform/jobs/jobs.js';
import type { QueueDef } from '../../../platform/jobs/queues.js';
import { type DomainEventEnvelope, type EventConsumer, OnEvents } from '../../../platform/outbox/event-consumer.js';
import { OnTick, type TickHandler, type TickName } from '../../../platform/scheduler/ticks.js';
import { MembershipPort } from '../../identity/index.js';
import { AlertEvaluator } from './alert-evaluator.js';

// زمان ارزیابی (04-alert-engine ۲.۳؛ 08 ۳): پس از ComputeFinished و رویدادهای غیرمحاسباتی ماتریس ج، و تیک‌های ساعتی و روزانه.
// صف stately با کلید پروژه و پنجرهٔ ۲ ثانیه — یکی در صف و یکی فعال برای هر پروژه.

export const ALERTS_QUEUE: QueueDef = {
  name: 'alerts.evaluate',
  policy: 'stately',
  retryLimit: 3,
  retryDelaySec: 10,
  retryBackoff: true,
  expireInSeconds: 300,
  priority: 50,
  concurrency: 2,
};

interface EvaluateJob extends JobData {
  readonly orgId: string;
  readonly projectId: string;
}

@Injectable()
export class AlertQueue implements OnModuleInit {
  constructor(
    private readonly jobs: Jobs,
    private readonly evaluator: AlertEvaluator,
  ) {}

  onModuleInit(): void {
    this.jobs.work<EvaluateJob>(ALERTS_QUEUE, async (job) => {
      await this.evaluator.evaluate(job.data.projectId);
    });
  }

  request(tx: EntityManager | null, orgId: string, projectId: string): Promise<string | null> {
    return this.jobs.send(tx, ALERTS_QUEUE, { orgId, projectId }, { singletonKey: projectId, startAfterSec: 2 });
  }
}

/** رویدادهای ماتریس ج که قاعدهٔ هشدار دارند (`03` ۵). ضربان گوشی پروژه ندارد ← پروژه‌های همان کاربر. */
@Injectable()
@OnEvents({
  name: 'alerts.on-facts-changed',
  events: [
    'ComputeFinished',
    'FieldReportReceived',
    'FieldReportItemReturned',
    'FieldReportItemRejected',
    'AssignmentChanged',
    'ApprovalRouteChanged',
    'MemberChanged',
    'PeriodClosed',
    'CostsCompleteThroughChanged',
    'ProjectSettingsChanged',
    'ProjectStatusChanged',
    'DeviceQueueHeartbeat',
    'RiskChanged',
    'RiskActionChanged',
    'SiteIssueReported',
    'ScheduleChangeProposed',
    'SyncSessionApplied',
    'MspProgressExported',
  ],
})
export class AlertFactsConsumer implements EventConsumer {
  constructor(
    private readonly queue: AlertQueue,
    private readonly memberships: MembershipPort,
  ) {}

  async handle(event: DomainEventEnvelope, tx: EntityManager): Promise<void> {
    if (event.projectId) {
      await this.queue.request(tx, event.orgId, event.projectId);
      return;
    }
    const userId = event.payload['userId'];
    if (event.type !== 'DeviceQueueHeartbeat' || typeof userId !== 'string') return;
    const projects = new Set((await this.memberships.memberships([userId])).map((entry) => entry.projectId));
    for (const projectId of projects) await this.queue.request(tx, event.orgId, projectId);
  }
}

/** HourlyTick (AL-APR-01) و DailyTick (قواعد زمانی) برای همهٔ پروژه‌های فعال. */
@Injectable()
@OnTick('HourlyTick', 'DailyTick')
export class AlertTicks implements TickHandler {
  constructor(
    private readonly orm: MikroORM,
    private readonly jobs: Jobs,
  ) {}

  async onTick(_tick: TickName): Promise<number> {
    const projects = await this.orm.em
      .fork()
      .getConnection()
      .execute<{ org_id: string; project_id: string }[]>('select org_id, project_id from active_projects_for_compute()');
    for (const row of projects) await this.jobs.send(null, ALERTS_QUEUE, { orgId: row.org_id, projectId: row.project_id }, { singletonKey: row.project_id });
    return projects.length;
  }
}
