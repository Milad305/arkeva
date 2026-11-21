import { Injectable } from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/postgresql';
import { AppConfig } from '../../../config/config.js';
import { Clock } from '../../../platform/clock/clock.js';
import { applyTenant } from '../../../platform/database/tenant.js';
import { UnauthorizedError } from '../../../platform/http/errors.js';
import { AuthSession } from '../domain/auth-session.entity.js';
import { User } from '../domain/user.entity.js';
import { isUuid, randomSecret, sameHash, sha256, splitToken } from '../infrastructure/secrets.js';
import { SessionViewBuilder, type SessionView } from './session-view.js';

// تازه‌سازی چرخشی و خروج (docs/backend/07 ۲). کوکی: «orgId.sessionId.secret».

/**
 * دو زبانهٔ یک مرورگر ممکن است هم‌زمان با یک کوکی تازه‌سازی کنند. درخواست دوم رمز «قبلی» را
 * می‌آورد؛ تا این مهلت آن را سرقت حساب نمی‌کنیم و فقط توکن دسترسی می‌دهیم، بی‌چرخش دوباره.
 */
const CONCURRENT_REFRESH_GRACE_MS = 20_000;

interface ParsedRefresh {
  readonly orgId: string;
  readonly sessionId: string;
  readonly secret: string;
}

export function parseRefreshToken(token: string | undefined): ParsedRefresh | null {
  if (!token) return null;
  const parts = splitToken(token, 3);
  if (!parts) return null;
  const [orgId, sessionId, secret] = parts as [string, string, string];
  // شناسهٔ بدشکل به پرس‌وجو نمی‌رسد (وگرنه خطای تبدیل uuid پستگرس ۵۰۰ می‌شد)
  if (!isUuid(sessionId)) return null;
  return { orgId, sessionId, secret };
}

export interface RefreshResult {
  readonly session: SessionView;
  /** null یعنی کوکی فعلی معتبر می‌ماند (مهلت هم‌زمانی). */
  readonly refreshToken: string | null;
}

@Injectable()
export class RefreshSessionCommand {
  constructor(
    private readonly em: EntityManager,
    private readonly config: AppConfig,
    private readonly clock: Clock,
    private readonly views: SessionViewBuilder,
  ) {}

  /** `client`: کوکی وب فقط نشست وب و توکن بدنهٔ اپ فقط نشست اپ را تازه می‌کند. */
  async execute(cookie: string | undefined, client: 'web' | 'android' = 'web'): Promise<RefreshResult> {
    const token = parseRefreshToken(cookie);
    if (!token) throw new UnauthorizedError('SESSION_EXPIRED');
    applyTenant(this.em, token.orgId);
    const now = this.clock.now();
    // اپ آفلاین کار می‌کند: بیکاری تا پایان عمر ۳۰ روزه مجاز است و هر تازه‌سازی آن را تمدید می‌کند (F08 ۷)
    const appLifetimeMs = this.config.auth.appRefreshTtlDays * 86_400_000;
    const idleMs = client === 'android' ? appLifetimeMs : this.config.auth.refreshIdleTtlMin * 60_000;

    const outcome = await this.em.transactional(async (tx) => {
      const session = await tx.findOne(AuthSession, { id: token.sessionId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!session || session.client !== client) return null;
      if (!session.isActiveAt(now, idleMs)) {
        session.revoke(session.revokedAt ? 'revoked' : 'expired', now);
        return null;
      }
      const presented = sha256(token.secret);
      const user = await tx.findOne(User, { id: session.userId });
      if (!user || user.status !== 'active') {
        session.revoke('user_inactive', now);
        return null;
      }

      if (sameHash(session.currentSecretHash, presented)) {
        const secret = randomSecret();
        session.previousSecretHash = session.currentSecretHash;
        session.currentSecretHash = sha256(secret);
        session.lastUsedAt = now;
        if (client === 'android') session.expiresAt = new Date(now.getTime() + appLifetimeMs);
        user.lastActiveAt = now;
        return { user, session, refreshToken: `${token.orgId}.${session.id}.${secret}` };
      }
      const recent = now.getTime() - session.lastUsedAt.getTime() <= CONCURRENT_REFRESH_GRACE_MS;
      if (session.previousSecretHash && sameHash(session.previousSecretHash, presented)) {
        if (recent) return { user, session, refreshToken: null };
        // رمز قدیمی دوباره آمد: احتمال سرقت؛ کل نشست باطل (07 ۲)
        session.revoke('reuse_detected', now);
      }
      return null;
    });

    if (!outcome) throw new UnauthorizedError('SESSION_EXPIRED');
    return { session: await this.views.build(outcome.user, outcome.session.id, outcome.session.client), refreshToken: outcome.refreshToken };
  }
}

@Injectable()
export class LogoutCommand {
  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
  ) {}

  /** همیشه موفق از دید کاربر؛ نشست معتبر باطل می‌شود و کوکی در هر حال پاک. */
  async execute(cookie: string | undefined): Promise<void> {
    const token = parseRefreshToken(cookie);
    if (!token) return;
    applyTenant(this.em, token.orgId);
    const now = this.clock.now();
    await this.em.transactional(async (tx) => {
      const session = await tx.findOne(AuthSession, { id: token.sessionId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!session) return;
      const presented = sha256(token.secret);
      const matches = sameHash(session.currentSecretHash, presented) || (session.previousSecretHash != null && sameHash(session.previousSecretHash, presented));
      if (matches) session.revoke('logout', now);
    });
  }
}
