import { Injectable } from '@nestjs/common';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { addDays, DAILY_TICKS, latestDueDate, OnTick, type TickHandler, type TickName } from '../../src/platform/scheduler/ticks.js';
import { TickRunner } from '../../src/platform/scheduler/tick-runner.js';
import { startTestApp, type TestApp } from './support/app.js';

// زمان‌بند (F20 ۵؛ docs/backend/08 ۴): AC-PL-04 تیک از دست‌رفته یک بار جبران می‌شود.

const runs: string[] = [];
let failNext = false;

@Injectable()
@OnTick('DailyTick')
class DailyRecorder implements TickHandler {
  onTick(_tick: TickName, runDate: string): Promise<number> {
    if (failNext) {
      failNext = false;
      return Promise.reject(new Error('شکست عمدی تیک'));
    }
    runs.push(runDate);
    return Promise.resolve(2);
  }
}

const daily = DAILY_TICKS.find((tick) => tick.name === 'DailyTick');
if (!daily) throw new Error('DailyTick تعریف نشده است');

let test: TestApp;

async function tickRuns(): Promise<{ run_date: string; finished: boolean; projects_processed: number | null }[]> {
  const { rows } = await test.owner.query<{ run_date: string; finished: boolean; projects_processed: number | null }>(
    `select run_date::text as run_date, finished_at is not null as finished, projects_processed
       from tick_run where tick = 'DailyTick' order by run_date`,
  );
  return rows;
}

beforeAll(async () => {
  test = await startTestApp({ providers: [DailyRecorder] });
});

afterAll(async () => {
  await test?.close();
});

describe('AC-PL-04 — جبران تیک از دست‌رفته', () => {
  beforeEach(() => {
    failNext = false;
  });

  it('AC-PL-04 — نصب تازه: راه‌اندازی کارگر فقط آخرین موعد را یک بار اجرا می‌کند', async () => {
    const due = latestDueDate(daily, test.clock.now());
    expect(runs).toEqual([due]);
    expect(await tickRuns()).toEqual([{ run_date: due, finished: true, projects_processed: 2 }]);
  });

  it('AC-PL-04 — پس از سه روز خاموشی، روزهای جاافتاده به ترتیب و هر کدام یک بار اجرا می‌شوند', async () => {
    const due = latestDueDate(daily, test.clock.now());
    await test.owner.query('delete from tick_run');
    await test.owner.query(
      `insert into tick_run (tick, run_date, started_at, finished_at, projects_processed) values ('DailyTick', $1, now(), now(), 0)`,
      [addDays(due, -3)],
    );
    runs.length = 0;

    const runner = test.app.get(TickRunner);
    await runner.catchUp();
    expect(runs).toEqual([addDays(due, -2), addDays(due, -1), due]);

    // دوباره: هیچ روزی دو بار اجرا نمی‌شود
    await runner.catchUp();
    await runner.run(daily, due);
    expect(runs).toHaveLength(3);
    expect((await tickRuns()).map((row) => row.run_date)).toEqual([addDays(due, -3), addDays(due, -2), addDays(due, -1), due]);
  });

  it('AC-PL-04 — اجرای شکست‌خورده روز را آزاد می‌کند تا تلاش بعدی همان روز را بگیرد', async () => {
    const day = addDays(latestDueDate(daily, test.clock.now()), 1);
    runs.length = 0;
    failNext = true;
    const runner = test.app.get(TickRunner);
    await expect(runner.run(daily, day)).rejects.toThrow('شکست عمدی تیک');
    expect((await tickRuns()).find((row) => row.run_date === day)).toMatchObject({ finished: false });

    await expect(runner.run(daily, day)).resolves.toBe(true);
    expect(runs).toEqual([day]);
    expect((await tickRuns()).find((row) => row.run_date === day)).toMatchObject({ finished: true, projects_processed: 2 });
  });

  it('F20 ۵ — DailyTick به وقت تهران در pg-boss زمان‌بندی شده است', async () => {
    const { rows } = await test.owner.query<{ name: string; cron: string; timezone: string }>(
      `select name, cron, timezone from pgboss.schedule where name = 'tick.DailyTick'`,
    );
    expect(rows).toEqual([{ name: 'tick.DailyTick', cron: '30 0 * * *', timezone: 'Asia/Tehran' }]);
  });
});
