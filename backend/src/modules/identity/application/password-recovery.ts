import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/postgresql';
import { AppConfig } from '../../../config/config.js';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { newId } from '../../../platform/database/ids.js';
import { applyTenant } from '../../../platform/database/tenant.js';
import { DomainError, ForbiddenError, TooManyRequestsError, ValidationFailedError } from '../../../platform/http/errors.js';
import { SmsSender } from '../../../platform/messaging/sms-sender.js';
import { AuthSession } from '../domain/auth-session.entity.js';
import { OtpChallenge } from '../domain/otp-challenge.entity.js';
import { maskMobile, normalizeMobile } from '../domain/rules/identifier.js';
import { minutesLeft } from '../domain/rules/lockout.js';
import { User } from '../domain/user.entity.js';
import { locateUsers } from '../infrastructure/user-locator.js';
import { isUuid, otpCodeHash, randomSecret, sameHash, sha256, splitToken } from '../infrastructure/secrets.js';
import { Credentials } from './credentials.js';
import { Invitations } from './invitations.js';
import { OtpIssuer } from './otp-issuer.js';
import { type RequestMeta, SessionIssuer } from './session-issuer.js';
import { SessionViewBuilder, type SessionView } from './session-view.js';
import { TrustedDevices } from './trusted-devices.js';

// بازیابی و انقضای رمز (W04؛ F01 ۵.۱؛ تصمیم‌های کاربر 1405/08/22):
//   ۱. `forgot` — کد ۶ رقمی به موبایل؛ برای شمارهٔ ناشناس یا حساب غیرفعال هم پاسخ یکسان (بی پیامک) تا
//      وجود حساب لو نرود.
//   ۲. `verifyCode` — کد را بی مصرف می‌سنجد تا فرم مرحلهٔ ۲ همان‌جا خطا بدهد؛ شمار تلاش همان OTP ورود.
//   ۳. `reset` — کد دوباره سنجیده و مصرف می‌شود؛ رمز منقضی (توکن `password_expired`) کد نمی‌خواهد.
//      کاربر invited با همین مسیر فعال می‌شود و دعوت‌های معتبرش پذیرفته می‌شوند.

type ResetPurpose = 'password_reset' | 'password_expired';

interface ParsedToken {
  readonly orgId: string;
  readonly challengeId: string;
  readonly secret: string;
}

function parseResetToken(token: string): ParsedToken {
  const parts = splitToken(token, 3);
  if (!parts || !isUuid(parts[1] ?? '')) throw new DomainError('RESET_TOKEN_INVALID', 422);
  const [orgId, challengeId, secret] = parts as [string, string, string];
  return { orgId, challengeId, secret };
}

export interface ResetInput {
  readonly resetToken: string;
  readonly code?: string | undefined;
  readonly newPassword: string;
  readonly revokeOtherSessions: boolean;
}

@Injectable()
export class PasswordRecovery {
  constructor(
    private readonly em: EntityManager,
    private readonly config: AppConfig,
    private readonly clock: Clock,
    private readonly otp: OtpIssuer,
    private readonly sms: SmsSender,
    private readonly credentials: Credentials,
    private readonly invitations: Invitations,
    private readonly sessions: SessionIssuer,
    private readonly views: SessionViewBuilder,
    private readonly devices: TrustedDevices,
    private readonly audit: Audit,
  ) {}

  /** `POST /auth/forgot-password` */
  async forgot(input: { mobile: string }): Promise<{ resetToken: string; maskedMobile: string }> {
    const mobile = normalizeMobile(input.mobile);
    if (!mobile) throw new ValidationFailedError([{ field: 'mobile', message: 'شمارهٔ موبایل را مثل 09121234567 بنویسید.' }]);
    const fake = { resetToken: `${randomUUID()}.${newId()}.${randomSecret()}`, maskedMobile: maskMobile(mobile) };

    const [target] = await locateUsers(this.em, { mobile, email: null });
    if (!target) return fake;
    applyTenant(this.em, target.orgId);
    const now = this.clock.now();

    const issued = await this.em.transactional(async (tx) => {
      const user = await tx.findOne(User, { id: target.userId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!user || user.status === 'disabled') return null;
      // کد پیشین بازیابی باطل می‌شود؛ همیشه فقط آخرین کد معتبر است
      await tx.nativeUpdate(OtpChallenge, { userId: user.id, purpose: 'password_reset', consumedAt: null }, { consumedAt: now });
      const id = newId();
      const secret = randomSecret();
      const code = this.otp.newCode();
      tx.create(OtpChallenge, {
        id,
        orgId: user.orgId,
        userId: user.id,
        purpose: 'password_reset',
        tokenHash: sha256(secret),
        codeHash: otpCodeHash(id, code),
        expiresAt: this.otp.expiry(now),
        lastSentAt: now,
      });
      return { token: `${user.orgId}.${id}.${secret}`, code, mobile: user.mobile };
    });
    if (!issued) return fake;

    await this.sms.send({ to: issued.mobile, text: `کد بازیابی رمز پروژه‌یار: ${issued.code}\nاین کد را به کسی ندهید.` });
    return { resetToken: issued.token, maskedMobile: maskMobile(issued.mobile) };
  }

  /** `POST /auth/password/resend` — کد تازه پس از ۶۰ ثانیه. */
  async resend(input: { resetToken: string }): Promise<{ resendAfterSec: number }> {
    const token = parseResetToken(input.resetToken);
    applyTenant(this.em, token.orgId);
    const now = this.clock.now();
    const resendMs = this.config.auth.otpResendSec * 1000;
    const sent = await this.em.transactional(async (tx) => {
      const challenge = await this.lockChallenge(tx, token, now, ['password_reset']);
      const waited = now.getTime() - challenge.lastSentAt.getTime();
      if (waited < resendMs) throw new TooManyRequestsError('OTP_RESEND_TOO_SOON', { retryAfterSec: Math.ceil((resendMs - waited) / 1000) });
      const user = await tx.findOneOrFail(User, { id: challenge.userId });
      const code = this.otp.newCode();
      challenge.codeHash = otpCodeHash(challenge.id, code);
      challenge.lastSentAt = now;
      challenge.expiresAt = this.otp.expiry(now);
      challenge.attempts = 0;
      return { code, mobile: user.mobile };
    });
    await this.sms.send({ to: sent.mobile, text: `کد بازیابی رمز پروژه‌یار: ${sent.code}\nاین کد را به کسی ندهید.` });
    return { resendAfterSec: this.config.auth.otpResendSec };
  }

  /** `POST /auth/password/verify-code` — بی مصرف؛ فقط شمار تلاش بالا می‌رود. */
  async verifyCode(input: { resetToken: string; code: string }): Promise<{ ok: true }> {
    const token = parseResetToken(input.resetToken);
    applyTenant(this.em, token.orgId);
    const now = this.clock.now();
    const outcome = await this.em.transactional(async (tx) => {
      const challenge = await this.lockChallenge(tx, token, now, ['password_reset']);
      return this.checkCode(challenge, input.code);
    });
    this.throwCodeOutcome(outcome);
    return { ok: true };
  }

  /** `POST /auth/password/reset` — رمز تازه، نشست تازه (W04 مرحلهٔ ۳). */
  async reset(input: ResetInput, meta: RequestMeta): Promise<{ session: SessionView; refreshToken: string }> {
    const token = parseResetToken(input.resetToken);
    applyTenant(this.em, token.orgId);
    const now = this.clock.now();

    const result = await this.em.transactional(async (tx) => {
      const challenge = await this.lockChallenge(tx, token, now, ['password_reset', 'password_expired']);
      if (challenge.purpose === 'password_reset') {
        const outcome = this.checkCode(challenge, input.code ?? '');
        if (outcome.result !== 'ok') return { kind: 'code' as const, outcome };
      }
      const user = await tx.findOne(User, { id: challenge.userId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!user || user.status === 'disabled') throw new DomainError('RESET_TOKEN_INVALID', 422);
      if (user.isLockedAt(now) && user.lockedUntil) throw new DomainError('ACCOUNT_LOCKED', 423, { lockMinutes: minutesLeft(user.lockedUntil, now) });

      await this.credentials.setPassword(user, input.newPassword, now);
      challenge.consumedAt = now;
      let pendingRoles: Awaited<ReturnType<Invitations['acceptPending']>> = [];
      if (user.status === 'invited') {
        pendingRoles = await this.invitations.acceptPending(tx, user, now);
        user.status = 'active';
        this.audit.record(tx, {
          actor: 'system',
          orgId: user.orgId,
          action: 'user.activated',
          entityType: 'User',
          entityId: user.id,
          before: { status: 'invited' },
          after: { status: 'active' },
          reason: 'ساخت رمز با «فراموشی رمز»',
        });
      }
      user.failedLoginCount = 0;
      if (user.status === 'locked') user.status = 'active';
      await this.devices.revokeAll(tx, user.id, now);
      if (input.revokeOtherSessions) {
        const active = await tx.find(AuthSession, { userId: user.id, revokedAt: null });
        for (const session of active) session.revoke('password_reset', now);
      }
      // سرپرست فقط اپ دارد: رمز ساخته شد ولی نشست وب نه (§۷.۳ ردیف ۱۷)
      if (await this.credentials.appOnly(user, pendingRoles)) return { kind: 'app_only' as const };
      const opened = this.sessions.open(tx, user, meta, now);
      this.sessions.recordAttempt(tx, user, 'success', 'password', meta);
      return { kind: 'session' as const, user, sessionId: opened.session.id, refreshToken: opened.refreshToken };
    });

    if (result.kind === 'code') this.throwCodeOutcome(result.outcome);
    if (result.kind === 'app_only') throw new ForbiddenError('WEB_ACCESS_APP_ONLY', { passwordChanged: true });
    if (result.kind !== 'session') throw new DomainError('RESET_TOKEN_INVALID', 422);
    return { session: await this.views.build(result.user, result.sessionId), refreshToken: result.refreshToken };
  }

  private async lockChallenge(tx: EntityManager, token: ParsedToken, now: Date, purposes: readonly ResetPurpose[]): Promise<OtpChallenge> {
    const challenge = await tx.findOne(OtpChallenge, { id: token.challengeId, purpose: { $in: [...purposes] } }, { lockMode: LockMode.PESSIMISTIC_WRITE });
    if (!challenge || !sameHash(challenge.tokenHash, sha256(token.secret))) throw new DomainError('RESET_TOKEN_INVALID', 422);
    if (challenge.consumedAt != null || challenge.expiresAt <= now) throw new DomainError('RESET_TOKEN_INVALID', 422);
    return challenge;
  }

  private checkCode(challenge: OtpChallenge, code: string): { result: 'ok' | 'invalid' | 'exhausted'; remaining: number } {
    const max = this.config.auth.otpMaxAttempts;
    if (challenge.attempts >= max) return { result: 'exhausted', remaining: 0 };
    if (!/^\d{6}$/.test(code) || !sameHash(challenge.codeHash, otpCodeHash(challenge.id, code))) {
      challenge.attempts += 1;
      return { result: challenge.attempts >= max ? 'exhausted' : 'invalid', remaining: max - challenge.attempts };
    }
    return { result: 'ok', remaining: max - challenge.attempts };
  }

  private throwCodeOutcome(outcome: { result: 'ok' | 'invalid' | 'exhausted'; remaining: number }): void {
    if (outcome.result === 'exhausted') throw new DomainError('OTP_TOO_MANY_ATTEMPTS', 429);
    if (outcome.result === 'invalid') throw new DomainError('OTP_INVALID', 422, { remainingAttempts: outcome.remaining });
  }
}
