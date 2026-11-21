import { defineEntity, p } from '@mikro-orm/postgresql';

/**
 * DomainEvent — outbox (02 ۱۳؛ D07؛ docs/backend/08 ۲). در همان تراکنش تغییر اصلی درج می‌شود؛
 * فقط `processedAt` و `attempts` تغییرپذیرند (مجوز ستونی + تریگر پایگاه داده).
 */
const DomainEventSchema = defineEntity({
  name: 'DomainEvent',
  tableName: 'domain_event',
  properties: {
    id: p.uuid().primary(),
    orgId: p.uuid(),
    projectId: p.uuid().nullable(),
    type: p.string(),
    payload: p.json<Record<string, unknown>>(),
    actorUserId: p.uuid().nullable(),
    traceId: p.string().nullable(),
    occurredAt: p.datetime(),
    processedAt: p.datetime().nullable(),
    attempts: p.integer().default(0),
  },
});

export class DomainEvent extends DomainEventSchema.class {}
DomainEventSchema.setClass(DomainEvent);
