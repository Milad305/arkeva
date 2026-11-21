import { defineEntity, p } from '@mikro-orm/postgresql';

export const AUDIT_ACTOR_KINDS = ['user', 'system'] as const;

/**
 * AuditLog — واقعیت (02 ۱۳؛ F20 ۶؛ docs/backend/05 ۱۰). فقط‌درج: مجوز پایگاه داده + تریگر.
 * بازیگر تهی = سیستم (`actorKind = 'system'`؛ تصمیم کاربر 1405/08/22).
 */
const AuditLogSchema = defineEntity({
  name: 'AuditLog',
  tableName: 'audit_log',
  properties: {
    id: p.uuid().primary(),
    orgId: p.uuid(),
    projectId: p.uuid().nullable(),
    actorKind: p.enum(AUDIT_ACTOR_KINDS),
    actorUserId: p.uuid().nullable(),
    action: p.string(),
    entityType: p.string(),
    entityId: p.uuid(),
    before: p.json<Record<string, unknown>>().nullable(),
    after: p.json<Record<string, unknown>>().nullable(),
    reason: p.string().nullable(),
    ip: p.string().nullable(),
    traceId: p.string().nullable(),
    occurredAt: p.datetime(),
  },
});

export class AuditLog extends AuditLogSchema.class {}
AuditLogSchema.setClass(AuditLog);
