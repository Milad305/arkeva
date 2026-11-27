import { Injectable } from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/postgresql';
import { AppConfig } from '../../../config/config.js';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { newId } from '../../../platform/database/ids.js';
import { applyTenant } from '../../../platform/database/tenant.js';
import { ConflictError, DomainError, TooManyRequestsError, ValidationFailedError } from '../../../platform/http/errors.js';
import { SmsSender } from '../../../platform/messaging/sms-sender.js';
import { Organization } from '../domain/organization.entity.js';
import { maskMobile, normalizeMobile } from '../domain/rules/identifier.js';
import { passwordPolicyError } from '../domain/rules/password-policy.js';
import { SignupChallenge } from '../domain/signup-challenge.entity.js';
import { DEFAULT_PREFERENCES, User } from '../domain/user.entity.js';
import { isUuid, otpCodeHash, randomSecret, sameHash, sha256, splitToken } from '../infrastructure/secrets.js';
import { Credentials } from './credentials.js';
import { OtpIssuer } from './otp-issuer.js';
import { ProjectCatalog } from './ports.js';
import { type RequestMeta, SessionIssuer } from './session-issuer.js';
import { SessionViewBuilder, type SessionView } from './session-view.js';
import { TrustedDevices } from './trusted-devices.js';

// ثبت‌نام خودکار سازمان جدید در سه مرحله (تصمیم کاربر 1405/09/06):
//   ۱. `requestCode` — بررسی یکتایی سراسری شمارهٔ موبایل و ارسال کد ۶ رقمی پیامکی.
//   ۲. `verifyCode` — سنجش کد بدون مصرف کردن تا خطای کد پیش از پر کردن فرم مرحلهٔ ۳ مشخص شود.
//   ۳. `complete` — مصرف یک‌بارمصرف کد، ساخت اتمی سازمان + ۸ نوع پروژهٔ استاندارد + مدیر سازمان و صدور نشست.

const HOUR_MS = 3_600_000;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

interface ParsedSignupToken {
  readonly challengeId: string;
  readonly secret: string;
}

function parseSignupToken(token: string): ParsedSignupToken {
  const parts = splitToken(token, 2);
  if (!parts || !isUuid(parts[0] ?? '')) throw new DomainError('SIGNUP_TOKEN_INVALID', 422);
  const [challengeId, secret] = parts as [string, string];
  return { challengeId, secret };
}

export interface CompleteSignupInput {
  readonly signupToken: string;
  readonly code: string;
  readonly organizationName: string;
  readonly fullName: string;
  readonly email?: string | null | undefined;
  readonly password: string;
}

@Injectable()
export class OrganizationRegistration {
  constructor(
    private readonly em: EntityManager,
    private readonly config: AppConfig,
    private readonly clock: Clock,
    private readonly otp: OtpIssuer,
    private readonly sms: SmsSender,
    private readonly credentials: Credentials,
    private readonly projects: ProjectCatalog,
    private readonly sessions: SessionIssuer,
    private readonly views: SessionViewBuilder,
    private readonly devices: TrustedDevices,
    private readonly audit: Audit,
  ) {}

  /** `POST /auth/register/request-code` */
  async requestCode(input: { readonly mobile: string }): Promise<{ signupToken: string; maskedMobile: string; resendAfterSec: number }> {
    const mobile = normalizeMobile(input.mobile);
    if (!mobile) {
      throw new ValidationFailedError([{ field: 'mobile', message: 'شمارهٔ موبایل را مثل 09121234567 بنویسید.' }]);
    }
    if (await this.isIdentityTaken(this.em, mobile, null)) {
      throw new ConflictError('SIGNUP_MOBILE_TAKEN');
    }

    const now = this.clock.now();
    const resendMs = this.config.auth.otpResendSec * 1000;

    const issued = await this.em.transactional(async (tx) => {
      const latest = await tx.findOne(SignupChallenge, { mobile, consumedAt: null }, { orderBy: { lastSentAt: 'desc' } });
      if (latest && now.getTime() - latest.lastSentAt.getTime() < resendMs) {
        const retryAfterSec = Math.ceil((resendMs - (now.getTime() - latest.lastSentAt.getTime())) / 1000);
        throw new TooManyRequestsError('OTP_RESEND_TOO_SOON', { retryAfterSec });
      }
      const recentCount = await tx.count(SignupChallenge, { mobile, createdAt: { $gt: new Date(now.getTime() - HOUR_MS) } });
      if (recentCount >= this.config.auth.appOtpPerHour) {
        throw new TooManyRequestsError('RATE_LIMITED', { retryAfterSec: 3600 });
      }

      await tx.nativeUpdate(SignupChallenge, { mobile, consumedAt: null }, { consumedAt: now });
      const id = newId();
      const secret = randomSecret();
      const code = this.otp.newCode();
      tx.create(SignupChallenge, {
        id,
        mobile,
        tokenHash: sha256(secret),
        codeHash: otpCodeHash(id, code),
        expiresAt: this.otp.expiry(now),
        lastSentAt: now,
        attempts: 0,
        consumedAt: null,
        createdAt: now,
        updatedAt: now,
      });
      return { signupToken: `${id}.${secret}`, code };
    });

    await this.sms.send({
      to: mobile,
      text: `کد ثبت‌نام پروژه‌یار: ${issued.code}\nاین کد را به کسی ندهید.`,
      otpCode: issued.code,
    });
    return {
      signupToken: issued.signupToken,
      maskedMobile: maskMobile(mobile),
      resendAfterSec: this.config.auth.otpResendSec,
    };
  }

  /** `POST /auth/register/resend` */
  async resend(input: { readonly signupToken: string }): Promise<{ resendAfterSec: number }> {
    const token = parseSignupToken(input.signupToken);
    const now = this.clock.now();
    const resendMs = this.config.auth.otpResendSec * 1000;

    const sent = await this.em.transactional(async (tx) => {
      const challenge = await this.lockChallenge(tx, token, now);
      const waited = now.getTime() - challenge.lastSentAt.getTime();
      if (waited < resendMs) {
        throw new TooManyRequestsError('OTP_RESEND_TOO_SOON', { retryAfterSec: Math.ceil((resendMs - waited) / 1000) });
      }
      const recentCount = await tx.count(SignupChallenge, { mobile: challenge.mobile, createdAt: { $gt: new Date(now.getTime() - HOUR_MS) } });
      if (recentCount > this.config.auth.appOtpPerHour) {
        throw new TooManyRequestsError('RATE_LIMITED', { retryAfterSec: 3600 });
      }
      const code = this.otp.newCode();
      challenge.codeHash = otpCodeHash(challenge.id, code);
      challenge.lastSentAt = now;
      challenge.expiresAt = this.otp.expiry(now);
      challenge.attempts = 0;
      return { mobile: challenge.mobile, code };
    });

    await this.sms.send({
      to: sent.mobile,
      text: `کد ثبت‌نام پروژه‌یار: ${sent.code}\nاین کد را به کسی ندهید.`,
      otpCode: sent.code,
    });
    return { resendAfterSec: this.config.auth.otpResendSec };
  }

  /** `POST /auth/register/verify-code` — بدون مصرف کردن کد. */
  async verifyCode(input: { readonly signupToken: string; readonly code: string }): Promise<{ ok: true }> {
    const token = parseSignupToken(input.signupToken);
    const now = this.clock.now();
    const outcome = await this.em.transactional(async (tx) => {
      const challenge = await this.lockChallenge(tx, token, now);
      return this.checkCode(challenge, input.code);
    });
    this.throwCodeOutcome(outcome);
    return { ok: true };
  }

  /** `POST /auth/register/complete` — ساخت سازمان، مدیر ارشد و ورود مستقیم. */
  async complete(
    input: CompleteSignupInput,
    meta: RequestMeta,
  ): Promise<{ session: SessionView; refreshToken: string; deviceToken: string }> {
    const token = parseSignupToken(input.signupToken);
    const organizationName = input.organizationName.trim();
    const fullName = input.fullName.trim();
    const email = input.email?.trim() ? input.email.trim().toLowerCase() : null;

    const fieldErrors: { field: string; message: string }[] = [];
    if (organizationName.length < 2) fieldErrors.push({ field: 'organizationName', message: 'نام سازمان باید دست‌کم ۲ نویسه باشد.' });
    if (organizationName.length > 120) fieldErrors.push({ field: 'organizationName', message: 'نام سازمان حداکثر ۱۲۰ نویسه است.' });
    if (fullName.length < 3) fieldErrors.push({ field: 'fullName', message: 'نام و نام خانوادگی را کامل بنویسید.' });
    if (fullName.length > 80) fieldErrors.push({ field: 'fullName', message: 'نام و نام خانوادگی حداکثر ۸۰ نویسه است.' });
    if (email && (email.length > 120 || !EMAIL_PATTERN.test(email))) {
      fieldErrors.push({ field: 'email', message: 'نشانی ایمیل معتبر نیست.' });
    }
    if (fieldErrors.length > 0) throw new ValidationFailedError(fieldErrors);

    const pwdReason = passwordPolicyError(input.password);
    if (pwdReason) throw new DomainError('PASSWORD_POLICY', 422, { reason: pwdReason });

    const orgId = newId();
    applyTenant(this.em, orgId);
    const now = this.clock.now();

    const result = await this.em.transactional(async (tx) => {
      const challenge = await this.lockChallenge(tx, token, now);
      const codeOutcome = this.checkCode(challenge, input.code);
      if (codeOutcome.result !== 'ok') return { kind: 'code' as const, outcome: codeOutcome };

      if (await this.isIdentityTaken(tx, challenge.mobile, null)) {
        throw new ConflictError('SIGNUP_MOBILE_TAKEN');
      }
      if (email && (await this.isIdentityTaken(tx, null, email))) {
        throw new ConflictError('IDENTITY_TAKEN');
      }

      challenge.consumedAt = now;
      tx.create(Organization, {
        id: orgId,
        name: organizationName,
        seatLimit: 60,
        passwordRotationDays: 90,
        require2fa: false,
        createdAt: now,
      });
      await tx.flush();

      await this.projects.seedOrgDefaults(tx, orgId, now);

      const user = tx.create(User, {
        id: newId(),
        orgId,
        fullName,
        mobile: challenge.mobile,
        email,
        passwordHash: null,
        twoFactorEnabled: true,
        status: 'active',
        isOrgAdmin: true,
        avatarTone: 'a1',
        preferences: { ...DEFAULT_PREFERENCES },
        passwordHistory: [],
        createdAt: now,
        updatedAt: now,
      });
      await this.credentials.setPassword(user, input.password, now);
      await tx.flush();

      this.audit.record(tx, {
        actor: 'system',
        orgId,
        action: 'organization.registered',
        entityType: 'Organization',
        entityId: orgId,
        after: { name: organizationName, adminUserId: user.id, mobile: user.mobile },
      });

      const deviceToken = this.devices.issue(tx, user, now);
      const opened = this.sessions.open(tx, user, meta, now);
      this.sessions.recordAttempt(tx, user, 'success', 'otp', meta);
      return { kind: 'session' as const, user, sessionId: opened.session.id, refreshToken: opened.refreshToken, deviceToken };
    });

    if (result.kind === 'code') {
      this.throwCodeOutcome(result.outcome);
      throw new DomainError('SIGNUP_TOKEN_INVALID', 422);
    }

    return {
      session: await this.views.build(result.user, result.sessionId),
      refreshToken: result.refreshToken,
      deviceToken: result.deviceToken,
    };
  }

  private async lockChallenge(tx: EntityManager, token: ParsedSignupToken, now: Date): Promise<SignupChallenge> {
    const challenge = await tx.findOne(SignupChallenge, { id: token.challengeId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
    if (!challenge || !sameHash(challenge.tokenHash, sha256(token.secret))) {
      throw new DomainError('SIGNUP_TOKEN_INVALID', 422);
    }
    if (challenge.consumedAt != null || challenge.expiresAt <= now) {
      throw new DomainError('SIGNUP_TOKEN_INVALID', 422);
    }
    return challenge;
  }

  private checkCode(challenge: SignupChallenge, code: string): { result: 'ok' | 'invalid' | 'exhausted'; remaining: number } {
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

  private async isIdentityTaken(em: EntityManager, mobile: string | null, email: string | null): Promise<boolean> {
    const [row] = await em
      .getConnection()
      .execute<{ taken: boolean }[]>('select identity_taken(?, ?, null) as taken', [mobile, email], 'all', em.getTransactionContext());
    return row?.taken ?? false;
  }
}
