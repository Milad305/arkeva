import { Injectable } from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/postgresql';
import { AppConfig } from '../../../config/config.js';
import { Clock } from '../../../platform/clock/clock.js';
import { applyTenant } from '../../../platform/database/tenant.js';
import { DomainError, ForbiddenError, TooManyRequestsError, UnauthorizedError } from '../../../platform/http/errors.js';
import { SmsSender } from '../../../platform/messaging/sms-sender.js';
import { OtpChallenge } from '../domain/otp-challenge.entity.js';
import { User } from '../domain/user.entity.js';
import { isUuid, otpCodeHash, sameHash, sha256, splitToken } from '../infrastructure/secrets.js';
import { Credentials } from './credentials.js';
import { OtpIssuer } from './otp-issuer.js';
import { type RequestMeta, SessionIssuer } from './session-issuer.js';
import { SessionViewBuilder, type SessionView } from './session-view.js';
import { TrustedDevices } from './trusted-devices.js';

// مرحلهٔ دوم ورود (W03؛ F01 ۵.۱): کد ۶ رقمی، مهلت ۵ دقیقه، ارسال دوباره پس از ۶۰ ثانیه، یک‌بارمصرف.

interface ParsedOtpToken {
  readonly orgId: string;
  readonly challengeId: string;
  readonly secret: string;
}

function parseOtpToken(token: string): ParsedOtpToken {
  const parts = splitToken(token, 3);
  if (!parts) throw new UnauthorizedError('OTP_EXPIRED');
  const [orgId, challengeId, secret] = parts as [string, string, string];
  if (!isUuid(challengeId)) throw new UnauthorizedError('OTP_EXPIRED');
  return { orgId, challengeId, secret };
}

/** چالش را با قفل می‌خواند و توکن را می‌سنجد؛ هر ناهمخوانی همان «مهلت تمام شده» است. */
async function lockChallenge(tx: EntityManager, token: ParsedOtpToken, now: Date): Promise<OtpChallenge> {
  // فقط چالش ورود؛ کد بازیابی رمز هرگز نشست نمی‌دهد
  const challenge = await tx.findOne(OtpChallenge, { id: token.challengeId, purpose: 'login' }, { lockMode: LockMode.PESSIMISTIC_WRITE });
  if (!challenge || !sameHash(challenge.tokenHash, sha256(token.secret))) throw new UnauthorizedError('OTP_EXPIRED');
  if (challenge.consumedAt != null || challenge.expiresAt <= now) throw new UnauthorizedError('OTP_EXPIRED');
  return challenge;
}

type VerifyResult =
  | { readonly kind: 'invalid' }
  | { readonly kind: 'exhausted' }
  | { readonly kind: 'expired'; readonly resetToken: string }
  | { readonly kind: 'session'; readonly user: User; readonly sessionId: string; readonly refreshToken: string; readonly deviceToken: string | null };

@Injectable()
export class VerifyOtpCommand {
  constructor(
    private readonly em: EntityManager,
    private readonly config: AppConfig,
    private readonly clock: Clock,
    private readonly sessions: SessionIssuer,
    private readonly views: SessionViewBuilder,
    private readonly credentials: Credentials,
    private readonly devices: TrustedDevices,
  ) {}

  async execute(
    input: { otpToken: string; code: string; trustDevice?: boolean | undefined },
    meta: RequestMeta,
  ): Promise<{ session: SessionView; refreshToken: string; deviceToken: string | null }> {
    const token = parseOtpToken(input.otpToken);
    applyTenant(this.em, token.orgId);
    const now = this.clock.now();

    const result = await this.em.transactional(async (tx): Promise<VerifyResult> => {
      const challenge = await lockChallenge(tx, token, now);
      const user = await tx.findOne(User, { id: challenge.userId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!user) throw new UnauthorizedError('OTP_EXPIRED');

      if (challenge.attempts >= this.config.auth.otpMaxAttempts) return { kind: 'exhausted' };
      if (!sameHash(challenge.codeHash, otpCodeHash(challenge.id, input.code))) {
        challenge.attempts += 1;
        this.sessions.recordAttempt(tx, user, 'otp_failed', 'otp', meta);
        return challenge.attempts >= this.config.auth.otpMaxAttempts ? { kind: 'exhausted' } : { kind: 'invalid' };
      }
      // وضعیت ممکن است بین دو مرحله عوض شده باشد (غیرفعال‌سازی، قفل)
      if (user.status !== 'active') throw new ForbiddenError('ACCOUNT_DISABLED');

      challenge.consumedAt = now;
      if (await this.credentials.passwordExpired(tx, user, now)) {
        return { kind: 'expired', resetToken: this.credentials.issueExpiryToken(tx, user, now) };
      }
      const deviceToken = input.trustDevice ? this.devices.issue(tx, user, now) : null;
      const opened = this.sessions.open(tx, user, meta, now);
      this.sessions.recordAttempt(tx, user, 'success', 'otp', meta);
      return { kind: 'session', user, sessionId: opened.session.id, refreshToken: opened.refreshToken, deviceToken };
    });

    if (result.kind === 'invalid') throw new UnauthorizedError('OTP_INVALID');
    if (result.kind === 'exhausted') throw new DomainError('OTP_TOO_MANY_ATTEMPTS', 429);
    if (result.kind === 'expired') throw new ForbiddenError('PASSWORD_EXPIRED', { resetToken: result.resetToken });
    return { session: await this.views.build(result.user, result.sessionId), refreshToken: result.refreshToken, deviceToken: result.deviceToken };
  }
}

@Injectable()
export class ResendOtpCommand {
  constructor(
    private readonly em: EntityManager,
    private readonly config: AppConfig,
    private readonly clock: Clock,
    private readonly otp: OtpIssuer,
    private readonly sms: SmsSender,
  ) {}

  async execute(input: { otpToken: string }): Promise<{ resendAfterSec: number }> {
    const token = parseOtpToken(input.otpToken);
    applyTenant(this.em, token.orgId);
    const now = this.clock.now();
    const resendMs = this.config.auth.otpResendSec * 1000;

    const sent = await this.em.transactional(async (tx) => {
      const challenge = await lockChallenge(tx, token, now);
      const waitedMs = now.getTime() - challenge.lastSentAt.getTime();
      if (waitedMs < resendMs) {
        throw new TooManyRequestsError('OTP_RESEND_TOO_SOON', { retryAfterSec: Math.ceil((resendMs - waitedMs) / 1000) });
      }
      const user = await tx.findOneOrFail(User, { id: challenge.userId });
      const code = this.otp.newCode();
      challenge.codeHash = otpCodeHash(challenge.id, code);
      challenge.lastSentAt = now;
      challenge.expiresAt = this.otp.expiry(now);
      challenge.attempts = 0;
      return { code, mobile: user.mobile };
    });

    await this.sms.send({ to: sent.mobile, text: this.otp.smsText(sent.code) });
    return { resendAfterSec: this.config.auth.otpResendSec };
  }
}
