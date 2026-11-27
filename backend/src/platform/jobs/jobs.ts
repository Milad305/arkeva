import { type BeforeApplicationShutdown, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { type EntityManager, MikroORM, RequestContext } from '@mikro-orm/postgresql';
import { ClsService } from 'nestjs-cls';
import { type Job, PgBoss } from 'pg-boss';
import { AppConfig } from '../../config/config.js';
import { JOB_SCHEMA } from '../../database/system-ids.js';
import { AppContext, type AppContextStore, newTraceId } from '../context/app-context.js';
import { applyTenant } from '../database/tenant.js';
import { txSql } from '../database/tx-sql.js';
import { DEAD_LETTER_QUEUE, PLATFORM_QUEUES, type QueueDef } from './queues.js';

// صف کار با pg-boss (docs/backend/08 ۳). سه قرارداد:
//   ۱. payload فقط شناسه + orgId + traceId؛ داده از پایگاه داده خوانده می‌شود.
//   ۲. هر کار در RequestContext و CLS تازه اجرا می‌شود، با فیلتر tenant و RLS همان orgId.
//   ۳. ارسال درون تراکنش با `send(tx, …)`: کار و تغییر اصلی با هم commit یا با هم رد می‌شوند.

export interface JobData {
  /** تهی فقط برای کار سراسری (تیک). */
  readonly orgId: string | null;
  readonly traceId?: string;
  readonly [key: string]: unknown;
}

export interface JobRun<T extends JobData> {
  readonly id: string;
  readonly data: T;
  /** تلاش چندم (۰ = اول). */
  readonly retryCount: number;
}

type Handler<T extends JobData> = (job: JobRun<T>) => Promise<void>;

export interface DeadLetterFailure {
  readonly queue: string;
  readonly jobId: string;
  readonly orgId: string | null;
  readonly error: unknown;
}
export type DeadLetterListener = (failure: DeadLetterFailure) => Promise<void>;

interface Registration {
  readonly queue: QueueDef;
  readonly handler: Handler<JobData>;
}

@Injectable()
export class Jobs implements OnApplicationBootstrap, BeforeApplicationShutdown {
  private readonly logger = new Logger('Jobs');
  private readonly queues = new Map<string, QueueDef>(PLATFORM_QUEUES.map((queue) => [queue.name, queue]));
  private readonly workers = new Map<string, Registration>();
  private readonly startHooks: (() => Promise<void>)[] = [];
  private readonly deadLetterListeners: DeadLetterListener[] = [];
  private readonly boss: PgBoss;
  private started = false;

  constructor(
    private readonly config: AppConfig,
    private readonly orm: MikroORM,
    private readonly cls: ClsService<AppContextStore>,
    private readonly context: AppContext,
  ) {
    this.boss = new PgBoss({
      connectionString: config.db.url,
      schema: JOB_SCHEMA,
      max: config.jobs.poolMax,
      application_name: 'projeyar-jobs',
      // schema را migration با نقش مالک می‌سازد؛ نقش اپ DDL نمی‌کند
      migrate: false,
      createSchema: false,
      supervise: this.runsWorkers,
      schedule: this.runsWorkers,
    });
    this.boss.on('error', (error) => this.logger.error({ err: error }, 'pg-boss error'));
  }

  /** نقش api فقط می‌فرستد؛ worker و all کار هم اجرا می‌کنند (01 ۲). */
  get runsWorkers(): boolean {
    return this.config.role === 'worker' || this.config.role === 'all';
  }

  /** ثبت صف ماژول؛ پیش از راه‌اندازی (onModuleInit). */
  define(queue: QueueDef): void {
    this.queues.set(queue.name, queue);
  }

  /** ثبت اجراکننده؛ پیش از راه‌اندازی. در نقش api نادیده گرفته می‌شود. */
  work<T extends JobData>(queue: QueueDef, handler: Handler<T>): void {
    this.define(queue);
    if (this.workers.has(queue.name)) throw new Error(`اجراکنندهٔ صف ${queue.name} دو بار ثبت شد`);
    this.workers.set(queue.name, { queue, handler: handler as Handler<JobData> });
  }

  /**
   * شنوندهٔ کار dead (همهٔ تلاش‌ها شکست خورد): اعلان به مدیر سازمان (12-implementation-plan برش ۱۲، §۷.۲ ردیف ۲۶). در زمینهٔ
   * همان کار (سازمان و traceId) اجرا می‌شود؛ شکستش فقط لاگ می‌شود و خطای اصلی را نمی‌پوشاند.
   */
  onDeadLetter(listener: DeadLetterListener): void {
    this.deadLetterListeners.push(listener);
  }

  /** پس از راه‌اندازی pg-boss و ثبت کارگرها (زمان‌بندی و جبران تیک‌ها). */
  afterStart(hook: () => Promise<void>): void {
    this.startHooks.push(hook);
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.boss.start();
    this.started = true;
    for (const queue of this.queues.values()) {
      await this.boss.createQueue(queue.name, {
        policy: queue.policy,
        retryLimit: queue.retryLimit,
        retryDelay: queue.retryDelaySec,
        retryBackoff: queue.retryBackoff,
        expireInSeconds: queue.expireInSeconds,
        ...(queue.name === DEAD_LETTER_QUEUE ? {} : { deadLetter: DEAD_LETTER_QUEUE }),
      });
    }
    if (!this.runsWorkers) return;
    for (const hook of this.startHooks) await hook();
    for (const { queue, handler } of this.workers.values()) {
      await this.boss.work<JobData>(
        queue.name,
        { batchSize: 1, localConcurrency: queue.concurrency, pollingIntervalSeconds: this.config.jobs.pollIntervalSec },
        async ([job]) => {
          if (job) await this.execute(queue, job, handler);
        },
      );
    }
  }

  async beforeApplicationShutdown(): Promise<void> {
    if (!this.started) return;
    this.started = false;
    await this.boss.stop({ graceful: true, timeout: 10_000 });
  }

  /**
   * ارسال کار. با `tx` درون همان تراکنش (AC-PL-01)؛ بی `tx` فوری و مستقل. orgId و traceId
   * اگر داده نشوند از زمینهٔ جاری می‌آیند.
   */
  async send(
    tx: EntityManager | null,
    queue: QueueDef,
    data: Omit<JobData, 'traceId'> & { traceId?: string },
    options: { singletonKey?: string; startAfterSec?: number } = {},
  ): Promise<string | null> {
    if (!this.queues.has(queue.name)) throw new Error(`صف ${queue.name} تعریف نشده است`);
    return this.boss.send(
      queue.name,
      { ...data, traceId: data.traceId ?? this.context.traceId },
      {
        priority: queue.priority,
        singletonKey: options.singletonKey,
        startAfter: options.startAfterSec,
        db: tx ? txSql(tx) : undefined,
      },
    );
  }

  /** شمار کارهایی که همهٔ تلاش‌هایشان شکست خورد (برای /ready؛ تصمیم کاربر 1405/08/22). */
  async deadLetterCount(): Promise<number> {
    if (!this.started) return 0;
    const queue = await this.boss.getQueue(DEAD_LETTER_QUEUE);
    return queue?.queuedCount ?? 0;
  }

  private async announceDead(failure: DeadLetterFailure): Promise<void> {
    for (const listener of this.deadLetterListeners) {
      try {
        await listener(failure);
      } catch (error) {
        this.logger.error({ err: error, queue: failure.queue, jobId: failure.jobId }, 'dead-letter listener failed');
      }
    }
  }

  /** زمان‌بندی تیک با pg-boss (تک‌اجرا در چند نمونه؛ 08 ۴). */
  async schedule(queue: QueueDef, cron: string, tz: string): Promise<void> {
    if (!this.runsWorkers) return;
    await this.boss.schedule(queue.name, cron, { orgId: null }, { tz });
  }

  private async execute(queue: QueueDef, job: Job<JobData>, handler: Handler<JobData>): Promise<void> {
    const traceId = job.data.traceId ?? newTraceId();
    const attempt = job.retryCount + 1;
    const startedAt = performance.now();
    await this.cls.run(async () => {
      this.context.setJobScope({ orgId: job.data.orgId, traceId });
      await RequestContext.create(this.orm.em, async () => {
        if (job.data.orgId) applyTenant(this.orm.em, job.data.orgId);
        try {
          await handler({ id: job.id, data: job.data, retryCount: job.retryCount });
          const durationMs = Math.round(performance.now() - startedAt);
          if (!queue.name.startsWith('tick.')) {
            const slowOrRetried = durationMs >= 2000 || attempt > 1;
            this.logger[slowOrRetried ? 'log' : 'debug'](
              { queue: queue.name, jobId: job.id, attempt, durationMs, result: 'ok' },
              `job completed ${queue.name} (${durationMs}ms)`,
            );
          }
        } catch (error) {
          const durationMs = Math.round(performance.now() - startedAt);
          const final = job.retryCount >= queue.retryLimit;
          // آخرین تلاش: کار به dead.letter می‌رود و /ready شمارش را نشان می‌دهد (F20 ۳.۱)
          this.logger[final ? 'error' : 'warn'](
            { err: error, queue: queue.name, jobId: job.id, attempt, durationMs, result: final ? 'dead_letter' : 'retry' },
            final ? `job failed permanently ${queue.name}; moved to dead letter` : `job failed ${queue.name}; will retry`,
          );
          if (final && queue.name !== DEAD_LETTER_QUEUE) await this.announceDead({ queue: queue.name, jobId: job.id, orgId: job.data.orgId ?? null, error });
          throw error;
        }
      });
    });
  }
}
