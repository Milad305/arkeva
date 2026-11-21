import { defineEntity, p } from '@mikro-orm/postgresql';
import { SESSION_CLIENTS } from '@projeyar/shared';
import { mutableBase } from '../../../platform/database/base-properties.js';

/**
 * AuthSession — F01 ۴ («دستگاه‌های فعال» W32). هر نشست یک خانوادهٔ توکن تازه‌سازی است:
 * با هر تازه‌سازی رمز چرخانده و رمز قبلی نگه داشته می‌شود تا استفادهٔ دوباره از آن
 * (نشانهٔ سرقت) کل نشست را باطل کند (docs/backend/07 ۲). فقط هش ذخیره می‌شود.
 */
const AuthSessionSchema = defineEntity({
  name: 'AuthSession',
  tableName: 'auth_session',
  properties: {
    ...mutableBase(),
    userId: p.uuid(),
    client: p.enum(SESSION_CLIENTS),
    deviceName: p.string(),
    ip: p.string().nullable(),
    currentSecretHash: p.string(),
    previousSecretHash: p.string().nullable(),
    lastUsedAt: p.datetime(),
    expiresAt: p.datetime(),
    revokedAt: p.datetime().nullable(),
    revokeReason: p.string().nullable(),
  },
});

export class AuthSession extends AuthSessionSchema.class {
  isActiveAt(now: Date, idleMs: number): boolean {
    return this.revokedAt == null && this.expiresAt > now && now.getTime() - this.lastUsedAt.getTime() <= idleMs;
  }

  revoke(reason: string, now: Date): void {
    if (this.revokedAt != null) return;
    this.revokedAt = now;
    this.revokeReason = reason;
  }
}
AuthSessionSchema.setClass(AuthSession);
