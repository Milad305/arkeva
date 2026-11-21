import { SetMetadata } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/postgresql';
import type { DomainEventType } from '@projeyar/shared';

// مصرف‌کنندهٔ رویداد (docs/backend/08 ۲.۱). هر مصرف‌کننده نام یکتا، فهرست رویدادها و صف خودش را دارد.
// اجراکننده پیش از handle ردیف consumed_event را در همان تراکنش درج می‌کند؛ تحویل دوباره بی‌اثر است.

export interface DomainEventEnvelope {
  readonly id: string;
  readonly orgId: string;
  readonly projectId: string | null;
  readonly type: DomainEventType;
  readonly payload: Readonly<Record<string, unknown>> & { readonly v: number };
  readonly actorUserId: string | null;
  readonly traceId: string | null;
  readonly occurredAt: Date;
}

export interface EventConsumer {
  /** درون تراکنش کار؛ هر نوشتن و هر `jobs.send(tx, …)` با ثبت مصرف یک‌جا commit می‌شود. */
  handle(event: DomainEventEnvelope, tx: EntityManager): Promise<void>;
}

export interface EventConsumerSpec {
  /** نام یکتا، مثل `computation.on-facts-changed`؛ صف آن `consumer.<name>` است. */
  readonly name: string;
  readonly events: readonly DomainEventType[];
}

export const EVENT_CONSUMER_SPEC = 'projeyar:event-consumer';

/** روی کلاس provider که `EventConsumer` را پیاده می‌کند. ردیف‌ها باید همان ماتریس ج باشند (`03` ۵). */
export const OnEvents = (spec: EventConsumerSpec): ClassDecorator => SetMetadata(EVENT_CONSUMER_SPEC, spec);
