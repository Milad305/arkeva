import { Injectable } from '@nestjs/common';
import { type EntityManager, MikroORM, RequestContext } from '@mikro-orm/postgresql';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { applyTenant } from '../../src/platform/database/tenant.js';
import { Jobs } from '../../src/platform/jobs/jobs.js';
import { consumerQueue } from '../../src/platform/jobs/queues.js';
import { type DomainEventEnvelope, type EventConsumer, OnEvents } from '../../src/platform/outbox/event-consumer.js';
import { DomainEvent } from '../../src/platform/outbox/domain-event.entity.js';
import { Outbox } from '../../src/platform/outbox/outbox.js';
import { seedOrg, type SeededOrg } from '../fixtures/organizations.js';
import { startTestApp, type TestApp } from './support/app.js';
import { waitFor } from './support/wait.js';

// outbox، پخش و مصرف (F20 ۳؛ docs/backend/08 ۲): AC-PL-01، AC-PL-02، AC-PL-03.

interface Seen {
  readonly eventId: string;
  readonly projectId: string | null;
  readonly marker: string;
}

/** حالت مشترک مصرف‌کنندهٔ تست: هر رویداد را ثبت می‌کند و رویداد «gate» را تا آزادشدن نگه می‌دارد. */
const recorder = {
  started: [] as Seen[],
  finished: [] as Seen[],
  gate: null as Promise<void> | null,
  reset() {
    this.started = [];
    this.finished = [];
    this.gate = null;
  },
};

@Injectable()
@OnEvents({ name: 'test.recorder', events: ['ProjectSettingsChanged', 'MemberChanged'] })
class RecorderConsumer implements EventConsumer {
  async handle(event: DomainEventEnvelope): Promise<void> {
    const seen = { eventId: event.id, projectId: event.projectId, marker: String(event.payload['marker']) };
    recorder.started.push(seen);
    if (event.payload['marker'] === 'gate' && recorder.gate) await recorder.gate;
    recorder.finished.push(seen);
  }
}

let test: TestApp;
let org: SeededOrg<'admin', 'alpha' | 'beta'>;

beforeAll(async () => {
  test = await startTestApp({ providers: [RecorderConsumer] });
  org = await seedOrg(test.owner, {
    name: 'سازمان رویداد',
    users: { admin: { mobile: '09128000001', orgAdmin: true } },
    projects: { alpha: { code: 'PRJ-1405-101', manager: 'admin' }, beta: { code: 'PRJ-1405-102', manager: 'admin' } },
  });
});

afterAll(async () => {
  await test?.close();
});

beforeEach(() => recorder.reset());

/** کار درون تراکنش سازمان، مثل یک فرمان (RequestContext + tenant + RLS). */
function inOrg<T>(work: (tx: EntityManager) => Promise<T>): Promise<T> {
  const orm = test.app.get(MikroORM);
  return RequestContext.create(orm.em, () => {
    applyTenant(orm.em, org.orgId);
    return orm.em.transactional(work);
  });
}

function emit(projectId: string, marker: string): Promise<string> {
  return inOrg((tx) =>
    test.app.get(Outbox).emit(tx, { type: 'ProjectSettingsChanged', orgId: org.orgId, projectId, payload: { v: 1, marker } }),
  );
}

async function eventRow(id: string) {
  const { rows } = await test.owner.query<{ processed_at: Date | null; attempts: number; trace_id: string | null }>(
    'select processed_at, attempts, trace_id from domain_event where id = $1',
    [id],
  );
  return rows[0];
}

async function dispatchJobs(eventId: string): Promise<number> {
  const { rows } = await test.owner.query<{ count: string }>(
    `select count(*)::text as count from pgboss.job where name = 'event.dispatch' and data->>'eventId' = $1`,
    [eventId],
  );
  return Number(rows[0]?.count ?? 0);
}

describe('AC-PL-01 — رویداد و تغییر اصلی اتمی‌اند', () => {
  it('AC-PL-01 — تراکنش شکست‌خورده نه رویداد می‌سازد نه کار event.dispatch', async () => {
    let eventId = '';
    await expect(
      inOrg(async (tx) => {
        eventId = await test.app.get(Outbox).emit(tx, {
          type: 'ProjectSettingsChanged',
          orgId: org.orgId,
          projectId: org.projects.alpha,
          payload: { v: 1, marker: 'rolled-back' },
        });
        throw new Error('شکست عمدی پس از emit');
      }),
    ).rejects.toThrow('شکست عمدی');

    expect(eventId).not.toBe('');
    expect(await eventRow(eventId)).toBeUndefined();
    expect(await dispatchJobs(eventId)).toBe(0);
  });

  it('AC-PL-01 — تراکنش موفق: یک ردیف، یک کار پخش، و مصرف‌کننده رویداد را می‌گیرد', async () => {
    const eventId = await emit(org.projects.alpha, 'committed');
    expect(await dispatchJobs(eventId)).toBe(1);

    await waitFor(() => recorder.finished.some((seen) => seen.eventId === eventId));
    await waitFor(async () => (await eventRow(eventId))?.processed_at != null);
    expect(await eventRow(eventId)).toMatchObject({ attempts: 1 });
  });

  it('F20 ۳.۱ — emit بیرون از تراکنش، نوع ناشناخته، v نادرست یا payload بزرگ رد می‌شود', async () => {
    const outbox = test.app.get(Outbox);
    const orm = test.app.get(MikroORM);
    await RequestContext.create(orm.em, async () => {
      await expect(
        outbox.emit(orm.em, { type: 'MemberChanged', orgId: org.orgId, payload: { v: 1 } }),
      ).rejects.toThrow(/درون تراکنش/);
    });
    await expect(inOrg((tx) => outbox.emit(tx, { type: 'NoSuchEvent' as never, orgId: org.orgId, payload: { v: 1 } }))).rejects.toThrow(/کاتالوگ/);
    await expect(inOrg((tx) => outbox.emit(tx, { type: 'MemberChanged', orgId: org.orgId, payload: { v: 0 } }))).rejects.toThrow(/نسخهٔ v/);
    const big = 'x'.repeat(70 * 1024);
    await expect(inOrg((tx) => outbox.emit(tx, { type: 'MemberChanged', orgId: org.orgId, payload: { v: 1, big } }))).rejects.toThrow(/۶۴ کیلوبایت/);
  });
});

describe('AC-PL-02 — تحویل دوباره نتیجهٔ یکسان', () => {
  it('AC-PL-02 — همان رویداد دو بار به مصرف‌کننده برسد، فقط یک بار اثر دارد', async () => {
    const eventId = await emit(org.projects.alpha, 'once');
    await waitFor(() => recorder.finished.some((seen) => seen.eventId === eventId));

    // تحویل دوباره، همان‌طور که pg-boss پس از مرگ کارگر میان commit و تکمیل کار می‌فرستد
    const jobs = test.app.get(Jobs);
    const redelivery = await jobs.send(null, consumerQueue('test.recorder'), { orgId: org.orgId, eventId }, { singletonKey: org.projects.alpha });
    await waitFor(async () => {
      const { rows } = await test.owner.query<{ state: string }>('select state from pgboss.job where id = $1', [redelivery]);
      return rows[0]?.state === 'completed';
    });

    expect(recorder.started.filter((seen) => seen.eventId === eventId)).toHaveLength(1);
    const { rows } = await test.owner.query<{ count: string }>(
      `select count(*)::text as count from consumed_event where event_id = $1 and consumer = 'test.recorder'`,
      [eventId],
    );
    expect(rows[0]?.count).toBe('1');
  });
});

describe('AC-PL-03 — موازی میان پروژه‌ها، سریالی در یک پروژه', () => {
  it('AC-PL-03 — رویداد پروژهٔ دیگر منتظر نمی‌ماند؛ رویداد دوم همان پروژه تا پایان اولی شروع نمی‌شود', async () => {
    let release = (): void => undefined;
    recorder.gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const a1 = await emit(org.projects.alpha, 'gate');
    await waitFor(() => recorder.started.some((seen) => seen.eventId === a1));
    const a2 = await emit(org.projects.alpha, 'a2');
    const b1 = await emit(org.projects.beta, 'b1');

    // پروژهٔ دیگر آزاد است
    await waitFor(() => recorder.finished.some((seen) => seen.eventId === b1));
    // همان پروژه پشت اولی مانده است
    expect(recorder.started.some((seen) => seen.eventId === a2)).toBe(false);

    release();
    await waitFor(() => recorder.finished.some((seen) => seen.eventId === a2));
    const order = recorder.finished.filter((seen) => seen.projectId === org.projects.alpha).map((seen) => seen.eventId);
    expect(order.indexOf(a1)).toBeLessThan(order.indexOf(a2));
  });
});

describe('05 ۲ — زمینهٔ جدا برای هر کار', () => {
  it('05 ۲ — پرس‌وجو بیرون از RequestContext خطا می‌دهد (allowGlobalContext: false)', async () => {
    const orm = test.app.get(MikroORM);
    await expect(orm.em.find(DomainEvent, {})).rejects.toThrow(/global/i);
  });

  it('F20 ۳.۱ — /ready شمار کارهای dead را گزارش می‌کند', async () => {
    const response = await test.http('10.9.9.1').get('/ready').expect(200);
    expect(response.body).toEqual({ status: 'ready', deadLetters: 0 });
  });
});
