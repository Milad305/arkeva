import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { MikroORM } from '@mikro-orm/postgresql';
import { ClsService } from 'nestjs-cls';
import { Clock } from '../clock/clock.js';
import { AppContext, type AppContextStore, newTraceId } from '../context/app-context.js';
import { Jobs } from '../jobs/jobs.js';
import { tickQueue } from '../jobs/queues.js';
import {
  cronOf,
  DAILY_TICKS,
  HOURLY_TICKS,
  latestDueDate,
  missedDates,
  TEHRAN,
  TICK_HANDLER_SPEC,
  type TickDef,
  type TickHandler,
  type TickName,
} from './ticks.js';

// زمان‌بند (F20 ۵؛ docs/backend/08 ۴). pg-boss هر تیک را در چند نمونه یک بار می‌فرستد؛ tick_run با کلید
// (tick, run_date) اجرای دوباره را بی‌اثر و جبران روزهای از دست‌رفته را تکرارناپذیر می‌کند (AC-PL-04).

/** اجرای نیمه‌کاره‌ای که این‌قدر قدیمی است دوباره گرفته می‌شود (کارگر وسط کار مرده). */
const STALE_RUN_MS = 60 * 60 * 1000;

function isTickHandler(value: unknown): value is TickHandler {
  return typeof (value as Partial<TickHandler> | null)?.onTick === 'function';
}

@Injectable()
export class TickRunner implements OnModuleInit {
  private readonly logger = new Logger('Scheduler');
  private readonly handlers = new Map<TickName, TickHandler[]>();

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly reflector: Reflector,
    private readonly jobs: Jobs,
    private readonly orm: MikroORM,
    private readonly clock: Clock,
    private readonly cls: ClsService<AppContextStore>,
    private readonly context: AppContext,
  ) {}

  onModuleInit(): void {
    for (const wrapper of this.discovery.getProviders()) {
      const metatype = wrapper.metatype;
      const instance: unknown = wrapper.instance;
      if (typeof metatype !== 'function' || !instance) continue;
      const ticks = this.reflector.get<TickName[] | undefined>(TICK_HANDLER_SPEC, metatype);
      if (!ticks) continue;
      if (!isTickHandler(instance)) throw new Error(`${metatype.name} با @OnTick نشانه خورده ولی onTick ندارد`);
      for (const tick of ticks) this.handlers.set(tick, [...(this.handlers.get(tick) ?? []), instance]);
    }
    for (const tick of DAILY_TICKS) {
      this.jobs.work(tickQueue(tick.name), async () => {
        await this.run(tick, latestDueDate(tick, this.clock.now()));
      });
    }
    for (const tick of HOURLY_TICKS) {
      this.jobs.work(tickQueue(tick.name), async () => {
        await this.runHourly(tick.name);
      });
    }
    this.jobs.afterStart(async () => {
      for (const tick of DAILY_TICKS) await this.jobs.schedule(tickQueue(tick.name), cronOf(tick), TEHRAN);
      for (const tick of HOURLY_TICKS) await this.jobs.schedule(tickQueue(tick.name), `${tick.minute} * * * *`, TEHRAN);
      await this.catchUp();
    });
  }

  /** جبران تیک‌های روزانهٔ از دست‌رفته، به ترتیب و هر روز یک بار (F20 ۵). */
  async catchUp(): Promise<void> {
    for (const tick of DAILY_TICKS) {
      const dates = missedDates(await this.lastSuccess(tick.name), latestDueDate(tick, this.clock.now()));
      for (const date of dates) {
        await this.cls.run(async () => {
          this.context.setJobScope({ orgId: null, traceId: newTraceId() });
          await this.run(tick, date);
        });
      }
    }
  }

  /** یک اجرا؛ false یعنی همین روز قبلاً اجرا شده یا در حال اجراست. */
  async run(tick: TickDef, runDate: string): Promise<boolean> {
    const connection = this.orm.em.fork().getConnection();
    const now = this.clock.now();
    const claimed = await connection.execute<{ tick: string }[]>(
      `insert into tick_run (tick, run_date, started_at) values (?, ?, ?)
       on conflict (tick, run_date) do update set started_at = excluded.started_at
         where tick_run.finished_at is null and tick_run.started_at < ?
       returning tick`,
      [tick.name, runDate, now, new Date(now.getTime() - STALE_RUN_MS)],
    );
    if (claimed.length === 0) return false;

    let processed = 0;
    try {
      for (const handler of this.handlers.get(tick.name) ?? []) processed += await handler.onTick(tick.name, runDate);
    } catch (error) {
      // اجرا آزاد می‌شود تا تلاش دوباره یا جبران بعدی همین روز را بگیرد
      await connection.execute(`update tick_run set started_at = '-infinity' where tick = ? and run_date = ?`, [tick.name, runDate]);
      this.logger.error({ err: error, tick: tick.name, runDate, traceId: this.context.traceId }, 'tick failed');
      throw error;
    }
    await connection.execute(`update tick_run set finished_at = ?, projects_processed = ? where tick = ? and run_date = ?`, [
      this.clock.now(),
      processed,
      tick.name,
      runDate,
    ]);
    this.logger.log({ tick: tick.name, runDate, processed }, 'tick finished');
    return true;
  }

  /** اجرای تیک ساعتی؛ تکرار و جاافتادن بی‌خطرند چون کار مصرف‌کننده‌ها از وضعیت فعلی است. */
  async runHourly(tick: TickName): Promise<number> {
    let processed = 0;
    const at = this.clock.now().toISOString();
    for (const handler of this.handlers.get(tick) ?? []) processed += await handler.onTick(tick, at);
    this.logger.log({ tick, at, processed }, 'tick finished');
    return processed;
  }

  private async lastSuccess(tick: TickName): Promise<string | null> {
    const [row] = await this.orm.em
      .fork()
      .getConnection()
      .execute<{ last: string | null }[]>(`select max(run_date)::text as last from tick_run where tick = ? and finished_at is not null`, [tick]);
    return row?.last ?? null;
  }
}
