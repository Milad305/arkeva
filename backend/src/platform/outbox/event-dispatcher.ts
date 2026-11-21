import { Injectable, type OnModuleInit } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { EntityManager, LockMode, MikroORM } from '@mikro-orm/postgresql';
import { isDomainEventType } from '@projeyar/shared';
import { Clock } from '../clock/clock.js';
import { applyTenant } from '../database/tenant.js';
import { txSql } from '../database/tx-sql.js';
import { type JobData, type JobRun, Jobs } from '../jobs/jobs.js';
import { consumerQueue, EVENT_DISPATCH_QUEUE, PLATFORM_QUEUES, type QueueDef } from '../jobs/queues.js';
import { DomainEvent } from './domain-event.entity.js';
import { type DomainEventEnvelope, EVENT_CONSUMER_SPEC, type EventConsumer, type EventConsumerSpec } from './event-consumer.js';

// پخش و مصرف رویداد (docs/backend/08 ۲.۱):
//   event.dispatch (سریالی به ازای پروژه) ← برای هر مصرف‌کنندهٔ ثبت‌شده یک کار در صف خودش ← handle.
// تحویل حداقل یک‌بار است؛ consumed_event (consumer, event_id) آن را برای مصرف‌کننده دقیقاً یک‌بار می‌کند.

interface EventJob extends JobData {
  readonly orgId: string;
  readonly eventId: string;
}

interface Registered {
  readonly spec: EventConsumerSpec;
  readonly instance: EventConsumer;
}

const DISPATCH = PLATFORM_QUEUES.find((queue) => queue.name === EVENT_DISPATCH_QUEUE) as QueueDef;

function isConsumer(value: unknown): value is EventConsumer {
  return typeof (value as Partial<EventConsumer> | null)?.handle === 'function';
}

function envelope(event: DomainEvent): DomainEventEnvelope {
  if (!isDomainEventType(event.type)) throw new Error(`نوع رویداد ناشناخته: ${event.type}`);
  return {
    id: event.id,
    orgId: event.orgId,
    projectId: event.projectId ?? null,
    type: event.type,
    payload: event.payload as DomainEventEnvelope['payload'],
    actorUserId: event.actorUserId ?? null,
    traceId: event.traceId ?? null,
    occurredAt: event.occurredAt,
  };
}

@Injectable()
export class EventDispatcher implements OnModuleInit {
  private readonly consumers = new Map<string, Registered>();

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly reflector: Reflector,
    private readonly jobs: Jobs,
    private readonly em: EntityManager,
    private readonly orm: MikroORM,
    private readonly clock: Clock,
  ) {}

  onModuleInit(): void {
    for (const wrapper of this.discovery.getProviders()) {
      const metatype = wrapper.metatype;
      const instance: unknown = wrapper.instance;
      if (typeof metatype !== 'function' || !instance) continue;
      const spec = this.reflector.get<EventConsumerSpec | undefined>(EVENT_CONSUMER_SPEC, metatype);
      if (!spec) continue;
      if (!isConsumer(instance)) throw new Error(`${metatype.name} با @OnEvents نشانه خورده ولی handle ندارد`);
      if (this.consumers.has(spec.name)) throw new Error(`نام مصرف‌کنندهٔ ${spec.name} تکراری است`);
      for (const type of spec.events) {
        if (!isDomainEventType(type)) throw new Error(`مصرف‌کنندهٔ ${spec.name} رویداد ناشناختهٔ ${String(type)} را می‌خواهد`);
      }
      this.consumers.set(spec.name, { spec, instance });
      this.jobs.work<EventJob>(consumerQueue(spec.name), (job) => this.consume(spec.name, job));
    }
    this.jobs.work<EventJob>(DISPATCH, (job) => this.dispatch(job));
  }

  /** نام مصرف‌کننده‌های یک نوع رویداد (برای تست رفتار رویداد، 09 ۲). */
  consumersOf(type: string): string[] {
    return [...this.consumers.values()].filter(({ spec }) => spec.events.includes(type as never)).map(({ spec }) => spec.name);
  }

  private async dispatch(job: JobRun<EventJob>): Promise<void> {
    const attempt = job.retryCount + 1;
    try {
      const first = await this.dispatchOne(job.data.eventId, attempt, true);
      if (!first) return;
      // رویدادهای هم‌تراکنشِ همان کلید کار پخش جدا ندارند (Outbox)؛ هر کدام در تراکنش خودش تا کارهای مصرف‌کنندهٔ
      // هم‌کلید created_on یکسان نگیرند. صف پخش به ازای کلید سریالی است، پس ترتیب شناسه (UUID v7) همان ترتیب ثبت است.
      // همان em کار (سازمان و RLS تنظیم‌شده)؛ refresh چون نقشهٔ هویت ردیف‌های پیش از پخش را دارد
      const siblings = await this.em.find(
        DomainEvent,
        { orgId: first.orgId, projectId: first.projectId, processedAt: null },
        { orderBy: { id: 'asc' }, refresh: true },
      );
      for (const sibling of siblings) await this.dispatchOne(sibling.id, attempt, false);
    } catch (error) {
      await this.recordAttempt(job.data, attempt);
      throw error;
    }
  }

  /** یک رویداد در تراکنش خودش؛ برمی‌گرداند کلید آن را یا تهی اگر پیش‌تر پخش شده بود. */
  private async dispatchOne(eventId: string, attempt: number, required: boolean): Promise<{ orgId: string; projectId: string | null } | null> {
    return this.em.transactional(async (tx) => {
      const event = await tx.findOne(DomainEvent, { id: eventId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!event) {
        if (required) throw new Error(`رویداد ${eventId} پیدا نشد`);
        return null;
      }
      if (event.processedAt) return null; // تحویل دوبارهٔ کار پخش
      for (const name of this.consumersOf(event.type)) {
        await this.jobs.send(
          tx,
          consumerQueue(name),
          { orgId: event.orgId, eventId: event.id, traceId: event.traceId ?? undefined },
          { singletonKey: event.projectId ?? event.orgId },
        );
      }
      event.attempts = attempt;
      event.processedAt = this.clock.now();
      return { orgId: event.orgId, projectId: event.projectId ?? null };
    });
  }

  /** شمار تلاش حتی وقتی تراکنش پخش برگشت خورد (نمایش وضعیت تحویل، 08 ۲.۱). */
  private async recordAttempt(data: EventJob, attempt: number): Promise<void> {
    const fork = this.orm.em.fork();
    applyTenant(fork, data.orgId);
    await fork.nativeUpdate(DomainEvent, { id: data.eventId, processedAt: null }, { attempts: attempt });
  }

  private async consume(name: string, job: JobRun<EventJob>): Promise<void> {
    const registered = this.consumers.get(name);
    if (!registered) throw new Error(`مصرف‌کنندهٔ ${name} ثبت نشده است`);
    await this.em.transactional(async (tx) => {
      const inserted = await txSql(tx).executeSql(
        `insert into consumed_event (consumer, event_id, org_id, consumed_at) values ($1, $2, $3, $4)
         on conflict (consumer, event_id) do nothing`,
        [name, job.data.eventId, job.data.orgId, this.clock.now()],
      );
      if (inserted.rowCount === 0) return; // AC-PL-02: قبلاً مصرف شده
      const event = await tx.findOneOrFail(DomainEvent, { id: job.data.eventId });
      await registered.instance.handle(envelope(event), tx);
    });
  }
}
