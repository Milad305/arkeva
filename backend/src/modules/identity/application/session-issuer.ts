import { Injectable } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/postgresql';
import type { SessionClient } from '@projeyar/shared';
import { AppConfig } from '../../../config/config.js';
import { newId } from '../../../platform/database/ids.js';
import { AuthSession } from '../domain/auth-session.entity.js';
import { deviceName } from '../domain/rules/device-name.js';
import { LoginAttempt, type LOGIN_METHODS } from '../domain/login-attempt.entity.js';
import type { User } from '../domain/user.entity.js';
import { randomSecret, sha256 } from '../infrastructure/secrets.js';

export interface RequestMeta {
  readonly ip: string | null;
  readonly userAgent: string | null;
  readonly client: SessionClient;
}

export interface OpenedSession {
  readonly session: AuthSession;
  /** «orgId.sessionId.secret» — فقط در کوکی HttpOnly (07 ۲). */
  readonly refreshToken: string;
}

/** ساخت نشست و ثبت تلاش ورود — درون تراکنش فرمان صدا زده می‌شود (04 ۵). */
@Injectable()
export class SessionIssuer {
  constructor(private readonly config: AppConfig) {}

  open(tx: EntityManager, user: User, meta: RequestMeta, now: Date): OpenedSession {
    const secret = randomSecret();
    const session = tx.create(AuthSession, {
      id: newId(),
      orgId: user.orgId,
      userId: user.id,
      client: meta.client,
      deviceName: deviceName(meta.userAgent),
      ip: meta.ip,
      currentSecretHash: sha256(secret),
      previousSecretHash: null,
      lastUsedAt: now,
      // اپ: ۳۰ روز لغزان (F08 ۷)؛ وب: سقف مطلق ساعتی
      expiresAt: new Date(now.getTime() + this.lifetimeMs(meta.client)),
    });
    user.lastActiveAt = now;
    return { session, refreshToken: `${user.orgId}.${session.id}.${secret}` };
  }

  lifetimeMs(client: SessionClient): number {
    return client === 'android' ? this.config.auth.appRefreshTtlDays * 86_400_000 : this.config.auth.refreshAbsoluteTtlHours * 3_600_000;
  }

  /** تلاش ورود فقط‌درج (F01 ۴). */
  recordAttempt(
    tx: EntityManager,
    user: Pick<User, 'id' | 'orgId'>,
    result: LoginAttempt['result'],
    method: (typeof LOGIN_METHODS)[number],
    meta: RequestMeta,
  ): void {
    tx.create(LoginAttempt, {
      orgId: user.orgId,
      userId: user.id,
      result,
      method,
      ip: meta.ip,
      userAgent: meta.userAgent?.slice(0, 300) ?? null,
    });
  }
}
