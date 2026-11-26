import { Injectable } from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/postgresql';
import type { StepUpPurpose } from '@projeyar/shared';
import { AppConfig } from '../../../config/config.js';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { newId } from '../../../platform/database/ids.js';
import { applyTenant } from '../../../platform/database/tenant.js';
import { DomainError, ForbiddenError, TooManyRequestsError, UnauthorizedError } from '../../../platform/http/errors.js';
import { SmsSender } from '../../../platform/messaging/sms-sender.js';
import { maskMobile } from '../domain/rules/identifier.js';
import { StepUpChallenge } from '../domain/step-up-challenge.entity.js';
import { User } from '../domain/user.entity.js';
import { otpCodeHash, sameHash } from '../infrastructure/secrets.js';
import { OtpIssuer } from './otp-issuer.js';

// تأیید دوباره با کد پیامکی (F02 ۸.۴؛ تصمیم کاربر 1405/08/22). همان سیاست OTP ورود: ۵ دقیقه،
// ارسال دوباره پس از ۶۰ ثانیه، ۵ تلاش. کد به خود کاربر احرازشده می‌رود، نه به شمارهٔ ورودی.

export interface StepUpRequest {
  readonly purpose: StepUpPurpose;
  readonly subjectId: string;
}

export interface StepUpIssued {
  readonly maskedMobile: string;
  readonly expiresInSec: number;
  readonly resendAfterSec: number;
}

type VerifyOutcome = 'ok' | 'missing' | 'invalid' | 'exhausted';

@Injectable()
export class StepUpChallenges {
  constructor(
    private readonly em: EntityManager,
    private readonly config: AppConfig,
    private readonly clock: Clock,
    private readonly context: AppContext,
    private readonly otp: OtpIssuer,
    private readonly sms: SmsSender,
  ) {}

  /** `POST /v1/auth/step-up` — کد تازه برای یک عمل روی یک موضوع. */
  async request(input: StepUpRequest): Promise<StepUpIssued> {
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError();
    const now = this.clock.now();
    const resendMs = this.config.auth.otpResendSec * 1000;

    const issued = await this.em.transactional(async (tx) => {
      const user = await tx.findOneOrFail(User, { id: actor.userId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      const last = await tx.findOne(
        StepUpChallenge,
        { userId: user.id, purpose: input.purpose, subjectId: input.subjectId, consumedAt: null },
        { orderBy: { lastSentAt: 'desc' } },
      );
      if (last && now.getTime() - last.lastSentAt.getTime() < resendMs) {
        const retryAfterSec = Math.ceil((resendMs - (now.getTime() - last.lastSentAt.getTime())) / 1000);
        throw new TooManyRequestsError('OTP_RESEND_TOO_SOON', { retryAfterSec });
      }
      // کد پیشین همان عمل باطل می‌شود؛ همیشه فقط آخرین کد معتبر است
      if (last) last.consumedAt = now;
      const id = newId();
      const code = this.otp.newCode();
      tx.create(StepUpChallenge, {
        id,
        orgId: user.orgId,
        userId: user.id,
        purpose: input.purpose,
        subjectId: input.subjectId,
        codeHash: otpCodeHash(id, code),
        expiresAt: this.otp.expiry(now),
        lastSentAt: now,
        attempts: 0,
        consumedAt: null,
      });
      return { code, mobile: user.mobile };
    });

    await this.sms.send({ to: issued.mobile, text: this.otp.smsText(issued.code), otpCode: issued.code });
    return {
      maskedMobile: maskMobile(issued.mobile),
      expiresInSec: this.config.auth.otpTtlSec,
      resendAfterSec: this.config.auth.otpResendSec,
    };
  }

  /**
   * کد را می‌سنجد و مصرف می‌کند — در تراکنش جدای خودش تا شمار تلاش نادرست حتی اگر عمل اصلی بعداً
   * شکست بخورد ثبت بماند. موفقیت یعنی کد دیگر قابل‌استفاده نیست.
   */
  async consume(input: StepUpRequest & { readonly code: string | undefined }): Promise<void> {
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError();
    if (!input.code || !/^\d{6}$/.test(input.code)) throw new ForbiddenError('STEP_UP_REQUIRED');
    const now = this.clock.now();
    const max = this.config.auth.otpMaxAttempts;

    const fork = this.em.fork();
    applyTenant(fork, actor.orgId);
    const outcome = await fork.transactional(async (tx): Promise<{ result: VerifyOutcome; remaining: number }> => {
      const challenge = await tx.findOne(
        StepUpChallenge,
        { userId: actor.userId, purpose: input.purpose, subjectId: input.subjectId, consumedAt: null, expiresAt: { $gt: now } },
        { orderBy: { lastSentAt: 'desc' }, lockMode: LockMode.PESSIMISTIC_WRITE },
      );
      if (!challenge) return { result: 'missing', remaining: 0 };
      if (challenge.attempts >= max) return { result: 'exhausted', remaining: 0 };
      if (!sameHash(challenge.codeHash, otpCodeHash(challenge.id, input.code ?? ''))) {
        challenge.attempts += 1;
        return { result: challenge.attempts >= max ? 'exhausted' : 'invalid', remaining: max - challenge.attempts };
      }
      challenge.consumedAt = now;
      return { result: 'ok', remaining: max - challenge.attempts };
    });

    switch (outcome.result) {
      case 'ok':
        return;
      case 'missing':
        throw new ForbiddenError('STEP_UP_REQUIRED');
      case 'exhausted':
        // پیام «کد تازه بگیرید» همین‌جا درست است، نه «از صفحهٔ ورود شروع کنید»
        throw new ForbiddenError('STEP_UP_REQUIRED', { reason: 'too_many_attempts' });
      case 'invalid':
        throw new DomainError('OTP_INVALID', 422, { remainingAttempts: outcome.remaining });
    }
  }
}
