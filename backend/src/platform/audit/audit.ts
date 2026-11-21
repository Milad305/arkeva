import { Injectable } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/postgresql';
import { Clock } from '../clock/clock.js';
import { AppContext } from '../context/app-context.js';
import { newId } from '../database/ids.js';
import { AuditLog } from './audit-log.entity.js';

// ممیزی در همان تراکنش (F20 ۶؛ docs/backend/05 ۱۰). بازیگر، سازمان، IP، کد پیگیری و زمان از زمینه.
// before/after فقط از فهرست سفید فیلدها (`auditSnapshot`)؛ کلید حساس حتی با اشتباه برنامه‌نویس هم رد می‌شود.

type Snapshot = Readonly<Record<string, unknown>>;

export interface AuditInput {
  /** نقطه‌دار و گذشته‌نما: `user.locked`، `project.activated`. */
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly projectId?: string | null;
  readonly before?: Snapshot | null;
  readonly after?: Snapshot | null;
  readonly reason?: string | null;
  /** کار خود سیستم (تیک، قفل خودکار)؛ بی‌این، بازیگر باید کاربر احرازشدهٔ زمینه باشد. */
  readonly actor?: 'system';
  /** فقط وقتی زمینه سازمان ندارد (ورود، تیک). */
  readonly orgId?: string;
}

/** نام کلیدی که هرگز نباید در ممیزی بیاید (AC-PL-05). */
const SENSITIVE_KEY = /password|passwd|secret|token|otp|hash|cookie/i;

export class SensitiveAuditFieldError extends Error {
  constructor(readonly key: string) {
    super(`فیلد حساس «${key}» در ممیزی مجاز نیست`);
  }
}

function assertSafe(snapshot: Snapshot | null | undefined): void {
  if (!snapshot) return;
  for (const key of Object.keys(snapshot)) {
    if (SENSITIVE_KEY.test(key)) throw new SensitiveAuditFieldError(key);
  }
}

/** عکس فهرست‌سفید از یک موجودیت: فقط فیلدهای نام‌برده، تاریخ به ISO. */
export function auditSnapshot<T extends object, K extends keyof T & string>(entity: T, fields: readonly K[]): Record<K, unknown> {
  const snapshot = {} as Record<K, unknown>;
  for (const field of fields) {
    const value = entity[field];
    snapshot[field] = value instanceof Date ? value.toISOString() : (value ?? null);
  }
  return snapshot;
}

@Injectable()
export class Audit {
  constructor(
    private readonly context: AppContext,
    private readonly clock: Clock,
  ) {}

  record(tx: EntityManager, input: AuditInput): void {
    if (!tx.isInTransaction()) throw new Error('ممیزی فقط درون تراکنش تغییر اصلی ثبت می‌شود (F20 ۶)');
    assertSafe(input.before);
    assertSafe(input.after);

    const actorUserId = input.actor === 'system' ? null : (this.context.actor?.userId ?? null);
    if (input.actor !== 'system' && !actorUserId) {
      throw new Error(`ممیزی ${input.action} بازیگر ندارد؛ کار سیستمی باید actor: 'system' بدهد`);
    }
    const orgId = input.orgId ?? this.context.orgId;
    if (!orgId) throw new Error(`ممیزی ${input.action} سازمان ندارد`);

    tx.create(AuditLog, {
      id: newId(),
      orgId,
      projectId: input.projectId ?? null,
      actorKind: actorUserId ? 'user' : 'system',
      actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before ? { ...input.before } : null,
      after: input.after ? { ...input.after } : null,
      reason: input.reason ?? null,
      ip: this.context.ip,
      traceId: this.context.traceId,
      occurredAt: this.clock.now(),
    });
  }
}
