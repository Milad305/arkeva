import { Injectable } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/postgresql';
import { type DomainEventType, EVENT_PAYLOAD_MAX_BYTES, isDomainEventType } from '@projeyar/shared';
import { Clock } from '../clock/clock.js';
import { AppContext } from '../context/app-context.js';
import { newId } from '../database/ids.js';
import { Jobs } from '../jobs/jobs.js';
import { EVENT_DISPATCH_QUEUE, PLATFORM_QUEUES, type QueueDef } from '../jobs/queues.js';
import { DomainEvent } from './domain-event.entity.js';

export interface EmitInput {
  readonly type: DomainEventType;
  readonly projectId?: string | null;
  /** فقط شناسه و مقدار ضروری؛ بدون مبلغ (08 ۲)؛ `v` نسخهٔ قالب. */
  readonly payload: Readonly<Record<string, unknown>> & { readonly v: number };
  /** فقط وقتی زمینه سازمان ندارد (ورود، تیک). */
  readonly orgId?: string;
}

const DISPATCH = PLATFORM_QUEUES.find((queue) => queue.name === EVENT_DISPATCH_QUEUE) as QueueDef;

/**
 * تنها راه نوشتن رویداد دامنه (F20 ۳.۱). در همان تراکنش: ردیف domain_event + کار event.dispatch با
 * کلید پروژه. شکست تراکنش = نه رویداد نه کار (AC-PL-01).
 */
@Injectable()
export class Outbox {
  /**
   * کلیدهایی که در هر تراکنش کار پخش گرفته‌اند. دو کار هم‌کلید در یک تراکنش `created_on` یکسان می‌گیرند و صف
   * key_strict_fifo در pg-boss با این تساوی گیر می‌کند؛ پس هر تراکنش برای هر کلید یک کار می‌فرستد و پخش‌کننده
   * رویدادهای هم‌تراکنش را خودش پیدا می‌کند (EventDispatcher.dispatch؛ رفع 1405/08/25).
   */
  private readonly keyed = new WeakMap<object, Set<string>>();

  constructor(
    private readonly jobs: Jobs,
    private readonly context: AppContext,
    private readonly clock: Clock,
  ) {}

  async emit(tx: EntityManager, input: EmitInput): Promise<string> {
    if (!tx.isInTransaction()) throw new Error('رویداد فقط درون تراکنش تغییر اصلی ثبت می‌شود (D07)');
    if (!isDomainEventType(input.type)) throw new Error(`نوع رویداد ${String(input.type)} در کاتالوگ نیست`);
    if (!Number.isInteger(input.payload.v) || input.payload.v < 1) throw new Error('payload رویداد نسخهٔ v عددی می‌خواهد');
    if (Buffer.byteLength(JSON.stringify(input.payload)) > EVENT_PAYLOAD_MAX_BYTES) {
      throw new Error(`payload رویداد ${input.type} از ۶۴ کیلوبایت بیشتر است`);
    }
    const orgId = input.orgId ?? this.context.orgId;
    if (!orgId) throw new Error('رویداد بدون سازمان ثبت نمی‌شود');

    const id = newId();
    const projectId = input.projectId ?? null;
    tx.create(DomainEvent, {
      id,
      orgId,
      projectId,
      type: input.type,
      payload: { ...input.payload },
      actorUserId: this.context.actor?.userId ?? null,
      traceId: this.context.traceId,
      occurredAt: this.clock.now(),
      processedAt: null,
      attempts: 0,
    });
    const key = projectId ?? orgId;
    const context = tx.getTransactionContext<object>();
    const sent = context ? (this.keyed.get(context) ?? new Set<string>()) : new Set<string>();
    if (!sent.has(key)) {
      await this.jobs.send(tx, DISPATCH, { orgId, eventId: id }, { singletonKey: key });
      sent.add(key);
      if (context) this.keyed.set(context, sent);
    }
    return id;
  }
}
