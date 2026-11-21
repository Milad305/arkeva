import { Injectable, Logger } from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/postgresql';
import { randomInt, randomUUID } from 'node:crypto';
import { AppConfig } from '../../../config/config.js';
import { Clock } from '../../../platform/clock/clock.js';
import { newId } from '../../../platform/database/ids.js';
import { applyTenant } from '../../../platform/database/tenant.js';
import { ConflictError, DomainError, ForbiddenError, TooManyRequestsError, UnauthorizedError } from '../../../platform/http/errors.js';
import { SmsSender } from '../../../platform/messaging/sms-sender.js';
import { Audit } from '../../../platform/audit/audit.js';
import { Invitation, normalizeInviteCode } from '../domain/invitation.entity.js';
import { Invitations } from './invitations.js';
import { MembershipPort } from './ports.js';
import { maskMobile, parseIdentifier } from '../domain/rules/identifier.js';
import { OtpChallenge } from '../domain/otp-challenge.entity.js';
import { User } from '../domain/user.entity.js';
import { locateUsers } from '../infrastructure/user-locator.js';
import { isUuid, otpCodeHash, randomSecret, sameHash, sha256, splitToken } from '../infrastructure/secrets.js';
import { type RequestMeta, SessionIssuer } from './session-issuer.js';
import { SessionViewBuilder, type SessionView } from './session-view.js';

// ورود اپ کارگاه (M01، M02؛ F08 ۷؛ 07 ۲.۲): شمارهٔ همراه + کد ۵ رقمی پیامکی؛ فقط عضو فعال دست‌کم یک پروژه. شمارهٔ ناموجود یا
// بی‌عضویت همان پاسخ را می‌گیرد (فهرست شماره‌ها کشف نشود). حداکثر ۳ کد در ساعت برای هر شماره. نشست android ۳۰ روزه و لغزان؛
// توکن تازه‌سازی در بدنه، چون اپ کوکی ندارد و آن را در ذخیره‌سازی امن گوشی نگه می‌دارد `[پیش‌فرض فنی]`.

export const APP_CODE_LENGTH = 5;

export interface AppSessionResult {
  readonly session: SessionView;
  readonly refreshToken: string;
  readonly refreshExpiresAt: string;
}

@Injectable()
export class AppLogin {
  private readonly logger = new Logger('AppLogin');

  constructor(
    private readonly em: EntityManager,
    private readonly config: AppConfig,
    private readonly clock: Clock,
    private readonly sms: SmsSender,
    private readonly sessions: SessionIssuer,
    private readonly views: SessionViewBuilder,
    private readonly memberships: MembershipPort,
    private readonly invitations: Invitations,
    private readonly audit: Audit,
  ) {}

  /** کد پنج‌رقمی؛ در توسعه پنج رقم اول OTP_DEV_CODE. */
  private newCode(): string {
    return this.config.auth.otpDevCode?.slice(0, APP_CODE_LENGTH) ?? String(randomInt(0, 10 ** APP_CODE_LENGTH)).padStart(APP_CODE_LENGTH, '0');
  }

  /** `POST /auth/app/request-code` — همین پاسخ برای شمارهٔ ناشناخته؛ ارسال دوباره = درخواست تازه. */
  async requestCode(input: { readonly mobile: string }): Promise<{ otpToken: string; maskedMobile: string; resendAfterSec: number; codeLength: number }> {
    const identifier = parseIdentifier(input.mobile);
    if (!identifier.mobile) throw new DomainError('VALIDATION_FAILED', 422, { fields: [{ field: 'mobile', message: 'شمارهٔ همراه را درست وارد کنید.' }] });
    const masked = maskMobile(identifier.mobile);
    const decoy = {
      otpToken: `${randomUUID()}.${randomUUID()}.${randomSecret()}`,
      maskedMobile: masked,
      resendAfterSec: this.config.auth.otpResendSec,
      codeLength: APP_CODE_LENGTH,
    };
    const located = await locateUsers(this.em, identifier);
    if (located.length > 1) throw new ConflictError('LOGIN_IDENTIFIER_AMBIGUOUS');
    const target = located[0];
    if (!target) {
      this.devWhyNoSms(masked, 'no user with this mobile');
      return decoy;
    }
    applyTenant(this.em, target.orgId);
    const now = this.clock.now();
    const issued = await this.em.transactional(async (tx) => {
      const user = await tx.findOne(User, { id: target.userId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!user?.canSignIn()) {
        this.devWhyNoSms(masked, 'user cannot sign in (inactive/locked)');
        return null;
      }
      if ((await this.memberships.memberships([user.id])).length === 0) {
        this.devWhyNoSms(masked, 'user has no active project membership');
        return null;
      }
      const recent = await tx.count(OtpChallenge, { userId: user.id, purpose: 'app_login', createdAt: { $gt: new Date(now.getTime() - 3_600_000) } });
      if (recent >= this.config.auth.appOtpPerHour) throw new TooManyRequestsError('RATE_LIMITED', { retryAfterSec: 3600 });
      const id = newId();
      const secret = randomSecret();
      const code = this.newCode();
      tx.create(OtpChallenge, {
        id,
        orgId: user.orgId,
        userId: user.id,
        purpose: 'app_login',
        tokenHash: sha256(secret),
        codeHash: otpCodeHash(id, code),
        expiresAt: new Date(now.getTime() + this.config.auth.otpTtlSec * 1000),
        lastSentAt: now,
      });
      return { token: `${user.orgId}.${id}.${secret}`, code, mobile: user.mobile };
    });
    if (!issued) return decoy;
    // پس از commit (04 ۶)؛ ارقام لاتین برای خواندن خودکار پیامک
    await this.sms.send({ to: issued.mobile, text: `کد ورود اپ پروژه‌یار: ${issued.code}\nاین کد را به کسی ندهید.` });
    return { ...decoy, otpToken: issued.token };
  }

  /**
   * `POST /auth/app/invite-code` (OD-20): کد دعوت (تایپ‌شده یا QR `projeyar:invite:<کد>`) کاربر را پیدا می‌کند و کد پیامکی به
   * همان شمارهٔ دعوت می‌رود؛ ورود با همان `/auth/app/verify` که دعوت را می‌پذیرد. کد نادرست، منقضی یا لغوشده ← ۴۰۱ INVITE_CODE_INVALID.
   */
  async inviteCode(input: { readonly code: string }): Promise<{ otpToken: string; maskedMobile: string; resendAfterSec: number; codeLength: number }> {
    const code = normalizeInviteCode(input.code);
    if (!code) throw new UnauthorizedError('INVITE_CODE_INVALID');
    const [located] = await this.em
      .getConnection()
      .execute<{ invitation_id: string; user_id: string; org_id: string }[]>('select invitation_id, user_id, org_id from auth_locate_invite(?)', [sha256(code)]);
    if (!located) throw new UnauthorizedError('INVITE_CODE_INVALID');
    applyTenant(this.em, located.org_id);
    const now = this.clock.now();
    const issued = await this.em.transactional(async (tx) => {
      const invitation = await tx.findOne(Invitation, { id: located.invitation_id, status: 'pending' });
      if (!invitation?.isPendingAt(now)) return null;
      const user = await tx.findOne(User, { id: located.user_id }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!user || user.status === 'disabled') return null;
      const recent = await tx.count(OtpChallenge, { userId: user.id, purpose: 'app_invite', createdAt: { $gt: new Date(now.getTime() - 3_600_000) } });
      if (recent >= this.config.auth.appOtpPerHour) throw new TooManyRequestsError('RATE_LIMITED', { retryAfterSec: 3600 });
      const id = newId();
      const secret = randomSecret();
      const otp = this.newCode();
      tx.create(OtpChallenge, {
        id,
        orgId: user.orgId,
        userId: user.id,
        purpose: 'app_invite',
        tokenHash: sha256(secret),
        codeHash: otpCodeHash(id, otp),
        expiresAt: new Date(now.getTime() + this.config.auth.otpTtlSec * 1000),
        lastSentAt: now,
      });
      return { token: `${user.orgId}.${id}.${secret}`, code: otp, mobile: user.mobile };
    });
    if (!issued) throw new UnauthorizedError('INVITE_CODE_INVALID');
    await this.sms.send({ to: issued.mobile, text: `کد ورود اپ پروژه‌یار: ${issued.code}
این کد را به کسی ندهید.` });
    return { otpToken: issued.token, maskedMobile: maskMobile(issued.mobile), resendAfterSec: this.config.auth.otpResendSec, codeLength: APP_CODE_LENGTH };
  }

  /** فقط توسعه (پیامک کنسولی): چرا پیامکی نرفت. پاسخ API همان پاسخ فریب می‌ماند. */
  private devWhyNoSms(masked: string, reason: string): void {
    if (this.config.sms.provider === 'console') this.logger.warn(`no OTP sent to ${masked}: ${reason}`);
  }

  /** `POST /auth/app/verify` */
  async verify(input: { readonly otpToken: string; readonly code: string }, meta: RequestMeta): Promise<AppSessionResult> {
    const parts = splitToken(input.otpToken, 3);
    if (!parts || !isUuid(parts[0] as string) || !isUuid(parts[1] as string)) throw new UnauthorizedError('OTP_EXPIRED');
    const [orgId, challengeId, secret] = parts as [string, string, string];
    applyTenant(this.em, orgId);
    const now = this.clock.now();
    const result = await this.em.transactional(async (tx) => {
      const challenge = await tx.findOne(
        OtpChallenge,
        { id: challengeId, purpose: { $in: ['app_login', 'app_invite'] } },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      );
      if (!challenge || !sameHash(challenge.tokenHash, sha256(secret)) || challenge.consumedAt != null || challenge.expiresAt <= now) {
        return { kind: 'expired' } as const;
      }
      const user = await tx.findOne(User, { id: challenge.userId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
      if (!user) return { kind: 'expired' } as const;
      if (challenge.attempts >= this.config.auth.otpMaxAttempts) return { kind: 'exhausted' } as const;
      if (!sameHash(challenge.codeHash, otpCodeHash(challenge.id, input.code.trim()))) {
        challenge.attempts += 1;
        this.sessions.recordAttempt(tx, user, 'otp_failed', 'otp', meta);
        return challenge.attempts >= this.config.auth.otpMaxAttempts ? ({ kind: 'exhausted' } as const) : ({ kind: 'invalid' } as const);
      }
      // ورود با کد دعوت (OD-20): دعوت‌های معتبر پذیرفته و کاربر invited فعال می‌شود (مثل «فراموشی رمز»، تصمیم 1405/08/22)؛ رمز وب بعداً
      let accepted = false;
      if (challenge.purpose === 'app_invite' && user.status === 'invited') {
        await this.invitations.acceptPending(tx, user, now);
        user.status = 'active';
        accepted = true;
        this.audit.record(tx, {
          actor: 'system',
          orgId: user.orgId,
          action: 'user.activated',
          entityType: 'User',
          entityId: user.id,
          before: { status: 'invited' },
          after: { status: 'active' },
          reason: 'ورود اپ با کد دعوت',
        });
      } else if (challenge.purpose === 'app_invite' && user.canSignIn()) {
        // کاربر فعال با دعوت تازه به پروژهٔ دیگر
        const pending = await tx.count(Invitation, { userId: user.id, status: 'pending', expiresAt: { $gt: now } });
        if (pending > 0) {
          await this.invitations.acceptPending(tx, user, now);
          accepted = true;
        }
      }
      if (!user.canSignIn() || (!accepted && (await this.memberships.memberships([user.id])).length === 0)) throw new ForbiddenError('ACCOUNT_DISABLED');
      challenge.consumedAt = now;
      const opened = this.sessions.open(tx, user, meta, now);
      this.sessions.recordAttempt(tx, user, 'success', 'otp', meta);
      return { kind: 'session', user, sessionId: opened.session.id, refreshToken: opened.refreshToken, expiresAt: opened.session.expiresAt } as const;
    });
    if (result.kind === 'expired') throw new UnauthorizedError('OTP_EXPIRED');
    if (result.kind === 'invalid') throw new UnauthorizedError('OTP_INVALID');
    if (result.kind === 'exhausted') throw new DomainError('OTP_TOO_MANY_ATTEMPTS', 429);
    return {
      session: await this.views.build(result.user, result.sessionId, 'android'),
      refreshToken: result.refreshToken,
      refreshExpiresAt: result.expiresAt.toISOString(),
    };
  }
}
