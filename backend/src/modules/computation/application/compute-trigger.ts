import { Injectable, type OnModuleInit } from '@nestjs/common';
import { EntityManager, MikroORM } from '@mikro-orm/postgresql';
import { Clock } from '../../../platform/clock/clock.js';
import { newId } from '../../../platform/database/ids.js';
import { txSql } from '../../../platform/database/tx-sql.js';
import { type JobData, Jobs } from '../../../platform/jobs/jobs.js';
import type { QueueDef } from '../../../platform/jobs/queues.js';
import { type DomainEventEnvelope, type EventConsumer, OnEvents } from '../../../platform/outbox/event-consumer.js';
import { OnTick, type TickHandler } from '../../../platform/scheduler/ticks.js';
import { FieldReads } from '../../field/index.js';
import { Periods } from './periods.js';
import { RecomputeProject } from './recompute-project.js';

// خط اجرا (progress-calculation.md ۵.۱؛ D07؛ 08 ۳): رویداد ← یک ردیف compute_run «در صف» برای هر پروژه با کمینهٔ fromDate و
// شناسهٔ رویدادها ← کار `compute.project` با کلید پروژه و پنجرهٔ ۲ ثانیه. صف stately: یکی در صف و یکی فعال برای هر پروژه
// (سریالی برای پروژه، موازی میان پروژه‌ها؛ AC-PC-10).

export const COMPUTE_QUEUE: QueueDef = {
  name: 'compute.project',
  policy: 'stately',
  retryLimit: 3,
  retryDelaySec: 5,
  retryBackoff: true,
  expireInSeconds: 600,
  priority: 60,
  concurrency: 2,
};

/** پنجرهٔ تجمیع رویدادهای نزدیک `[پیش‌فرض فنی]`. */
export const COMPUTE_DEBOUNCE_SEC = 2;

interface ComputeJob extends JobData {
  readonly orgId: string;
  readonly projectId: string;
}

@Injectable()
export class ComputeQueue implements OnModuleInit {
  constructor(
    private readonly jobs: Jobs,
    private readonly clock: Clock,
    private readonly recompute: RecomputeProject,
    private readonly periods: Periods,
  ) {}

  onModuleInit(): void {
    this.jobs.work<ComputeJob>(COMPUTE_QUEUE, async (job) => {
      // تا اجرای در صف باقی است ادامه (رویدادی که حین اجرا رسید اجرای بعدی را ساخته)
      for (let guard = 0; guard < 5 && (await this.recompute.runQueued(job.data.projectId)); guard += 1);
    });
  }

  /** درون تراکنش رویداد: ردیف در صف را بساز یا با کمینهٔ fromDate ادغام کن؛ تهی = بازسازی از شروع. */
  async request(tx: EntityManager, input: { readonly orgId: string; readonly projectId: string; readonly fromDate: string | null; readonly eventId?: string }) {
    // دوره‌های گزارش همراه هر رویداد و تیک کامل می‌شوند (فعال‌سازی، پروژه‌های پیش از برش ۹ب، تمدید ماهانه)
    await this.periods.ensure(tx, input.projectId);
    const sql = txSql(tx);
    await sql.executeSql(
      `insert into compute_run (id, org_id, project_id, from_date, trigger_event_ids, scope, status, created_at)
       values ($1, $2, $3, $4, $5::jsonb, 'project', 'queued', $6)
       on conflict (project_id) where status = 'queued' do update set
         from_date = case when compute_run.from_date is null or excluded.from_date is null then null
                          else least(compute_run.from_date, excluded.from_date) end,
         trigger_event_ids = compute_run.trigger_event_ids || excluded.trigger_event_ids`,
      [newId(), input.orgId, input.projectId, input.fromDate, JSON.stringify(input.eventId ? [input.eventId] : []), this.clock.now()],
    );
    // خوانندگان مقدار قبلی را با «در حال به‌روزرسانی» می‌بینند (۵.۱ ۴)
    await sql.executeSql(
      `insert into project_progress (project_id, org_id, compute_state) values ($1, $2, 'updating')
       on conflict (project_id) do update set compute_state = 'updating'`,
      [input.projectId, input.orgId],
    );
    await this.jobs.send(
      tx,
      COMPUTE_QUEUE,
      { orgId: input.orgId, projectId: input.projectId },
      { singletonKey: input.projectId, startAfterSec: COMPUTE_DEBOUNCE_SEC },
    );
  }
}

/** رویدادهای ماتریس ج که محاسبه را راه می‌اندازند (`03` ۵؛ ۵.۱ جدول fromDate). */
@Injectable()
@OnEvents({
  name: 'computation.on-facts-changed',
  events: [
    'FieldReportItemApproved',
    'FieldReportItemRevoked',
    'FieldReportItemSuperseded',
    'PlanVersionApplied',
    'CostEntryPosted',
    'CostsCompleteThroughChanged',
    'ProjectSettingsChanged',
    'ProjectActivated',
  ],
})
export class FactsChangedConsumer implements EventConsumer {
  constructor(
    private readonly queue: ComputeQueue,
    private readonly field: FieldReads,
  ) {}

  async handle(event: DomainEventEnvelope, tx: EntityManager): Promise<void> {
    if (!event.projectId) return;
    await this.queue.request(tx, { orgId: event.orgId, projectId: event.projectId, fromDate: await this.fromDate(event, tx), eventId: event.id });
  }

  private async fromDate(event: DomainEventEnvelope, tx: EntityManager): Promise<string | null> {
    const payload = event.payload as Record<string, unknown>;
    if (event.type === 'FieldReportItemApproved' || event.type === 'FieldReportItemRevoked' || event.type === 'FieldReportItemSuperseded') {
      return typeof payload['itemId'] === 'string' ? this.field.workDateOf(tx, event.projectId as string, payload['itemId']) : null;
    }
    if (event.type === 'CostsCompleteThroughChanged') {
      const [from, to] = [payload['from'], payload['to']];
      return typeof from === 'string' && typeof to === 'string' ? (from < to ? from : to) : null;
    }
    // تغییر نسخه، تنظیمات، فعال‌سازی و هزینه (تاریخ ردیف‌ها در رویداد نیست): از شروع `[پیش‌فرض فنی]`
    return null;
  }
}

/** کار هر پروژه در تیک: در زمینهٔ سازمان خودش (RLS) درخواست بازمحاسبه از تاریخ تیک. */
export const DAILY_COMPUTE_QUEUE: QueueDef = { ...COMPUTE_QUEUE, name: 'compute.daily', policy: 'standard', concurrency: 2 };

/** DailyTick (۰۰:۳۰): روز تازه و پیشرفت برنامه‌ای برای همهٔ پروژه‌های فعال (۵.۷)؛ متوقف و بایگانی منجمد (۱۱). */
@Injectable()
@OnTick('DailyTick')
export class DailyCompute implements TickHandler {
  constructor(
    private readonly orm: MikroORM,
    private readonly jobs: Jobs,
  ) {}

  async onTick(_tick: string, runDate: string): Promise<number> {
    const projects = await this.orm.em
      .fork()
      .getConnection()
      .execute<{ org_id: string; project_id: string }[]>('select org_id, project_id from active_projects_for_compute()');
    for (const row of projects) {
      await this.jobs.send(null, DAILY_COMPUTE_QUEUE, { orgId: row.org_id, projectId: row.project_id, fromDate: runDate });
    }
    return projects.length;
  }
}

@Injectable()
export class DailyComputeWorker implements OnModuleInit {
  constructor(
    private readonly jobs: Jobs,
    private readonly em: EntityManager,
    private readonly queue: ComputeQueue,
  ) {}

  onModuleInit(): void {
    this.jobs.work<ComputeJob & { readonly fromDate: string }>(DAILY_COMPUTE_QUEUE, (job) =>
      this.em.transactional((tx) => this.queue.request(tx, { orgId: job.data.orgId, projectId: job.data.projectId, fromDate: job.data.fromDate })),
    );
  }
}
