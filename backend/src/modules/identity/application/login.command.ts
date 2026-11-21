import { Injectable } from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/postgresql';
import { AppConfig } from '../../../config/config.js';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { applyTenant } from '../../../platform/database/tenant.js';
import { ConflictError, DomainError, ForbiddenError, UnauthorizedError } from '../../../platform/http/errors.js';
import { SmsSender } from '../../../platform/messaging/sms-sender.js';
import { maskMobile, parseIdentifier } from '../domain/rules/identifier.js';
import { afterFailedLogin, minutesLeft } from '../domain/rules/lockout.js';
import { User } from '../domain/user.entity.js';
import { PasswordHasher } from '../infrastructure/password-hasher.js';
import { locateUsers } from '../infrastructure/user-locator.js';
import { Organization } from '../domain/organization.entity.js';
import { Credentials } from './credentials.js';
import { OtpIssuer } from './otp-issuer.js';
import { type RequestMeta, SessionIssuer } from './session-issuer.js';
import { SessionViewBuilder, type SessionView } from './session-view.js';
import { TrustedDevices } from './trusted-devices.js';

export type LoginOutcome =
  | { readonly outcome: 'otp_required'; readonly otpToken: string; readonly maskedMobile: string; readonly resendAfterSec: number }
  | { readonly outcome: 'success'; readonly session: SessionView; readonly refreshToken: string };

type TxResult =
  | { readonly kind: 'locked'; readonly minutes: number }
  | { readonly kind: 'bad_password'; readonly remaining: number; readonly lockedMinutes: number | null; readonly mobile: string }
  | { readonly kind: 'disabled' }
  | { readonly kind: 'app_only' }
  | { readonly kind: 'expired'; readonly resetToken: string }
  | { readonly kind: 'otp'; readonly otpToken: string; readonly code: string; readonly mobile: string }
  | { readonly kind: 'session'; readonly user: User; readonly sessionId: string; readonly refreshToken: string };

/**
 * ورود وب با رمز (F01 ۵.۱؛ W01، W02). شکست‌ها هم ثبت می‌شوند، پس نتیجه از تراکنش برمی‌گردد و
 * خطا پس از commit پرتاب می‌شود. پیامک پس از commit (04 ۵: کار شبکه‌ای در تراکنش نه).
 */
@Injectable()
export class LoginCommand {
  constructor(
    private readonly em: EntityManager,
    private readonly config: AppConfig,
    private readonly clock: Clock,
    private readonly hasher: PasswordHasher,
    private readonly sms: SmsSender,
    private readonly otp: OtpIssuer,
    private readonly sessions: SessionIssuer,
    private readonly views: SessionViewBuilder,
    private readonly audit: Audit,
    private readonly credentials: Credentials,
    private readonly devices: TrustedDevices,
  ) {}

  /** `deviceToken`: کوکی «دستگاه مورد اعتماد» (W03) — فقط مرحلهٔ کد را می‌بخشد. */
  async execute(input: { identifier: string; password: string; deviceToken?: string | undefined }, meta: RequestMeta): Promise<LoginOutcome> {
    const located = await locateUsers(this.em, parseIdentifier(input.identifier));
    if (located.length > 1) throw new ConflictError('LOGIN_IDENTIFIER_AMBIGUOUS');
    const target = located[0];
    if (!target) {
      await this.hasher.verify(null, input.password); // زمان پاسخ یکسان برای کاربر ناموجود
      throw new UnauthorizedError('INVALID_CREDENTIALS');
    }

    applyTenant(this.em, target.orgId);
    const now = this.clock.now();
    const result = await this.em.transactional((tx) => this.attempt(tx, target.userId, input.password, input.deviceToken, meta, now));
    return this.finish(result);
  }

  private async attempt(tx: EntityManager, userId: string, password: string, deviceToken: string | undefined, meta: RequestMeta, now: Date): Promise<TxResult> {
    // قفل ردیف کاربر: شمارش تلاش‌های هم‌زمان درست می‌ماند (05 ۹)
    const user = await tx.findOne(User, { id: userId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
    if (!user) return { kind: 'bad_password', remaining: this.config.auth.loginMaxFailed, lockedMinutes: null, mobile: '' };

    if (user.isLockedAt(now) && user.lockedUntil) {
      this.sessions.recordAttempt(tx, user, 'locked', 'password', meta);
      return { kind: 'locked', minutes: minutesLeft(user.lockedUntil, now) };
    }

    if (!(await this.hasher.verify(user.passwordHash, password))) {
      const policy = { maxFailed: this.config.auth.loginMaxFailed, lockMinutes: this.config.auth.loginLockMin };
      const failure = afterFailedLogin(user.failedLoginCount, policy, now);
      user.failedLoginCount = failure.failedCount;
      if (failure.lockedUntil) {
        const before = { status: user.status, lockedUntil: user.lockedUntil?.toISOString() ?? null };
        user.lockedUntil = failure.lockedUntil;
        user.status = 'locked';
        // قفل خودکار کار سیستم است (F20 ۶؛ تصمیم کاربر 1405/08/22)؛ پایان خودکار قفل ممیزی نمی‌شود
        this.audit.record(tx, {
          actor: 'system',
          orgId: user.orgId,
          action: 'user.locked',
          entityType: 'User',
          entityId: user.id,
          before,
          after: { status: 'locked', lockedUntil: failure.lockedUntil.toISOString(), failedLoginCount: failure.failedCount },
          reason: 'ورودهای ناموفق پیاپی',
        });
      }
      this.sessions.recordAttempt(tx, user, failure.lockedUntil ? 'locked' : 'bad_password', 'password', meta);
      return {
        kind: 'bad_password',
        remaining: failure.remainingAttempts,
        lockedMinutes: failure.lockedUntil ? this.config.auth.loginLockMin : null,
        mobile: user.mobile,
      };
    }

    // وضعیت پس از رمز درست بررسی می‌شود تا وجود حساب از پیام خطا لو نرود
    if (!user.canSignIn()) return { kind: 'disabled' };

    // سرپرست فقط اپ اندروید دارد (§۷.۳ ردیف ۱۷؛ تصمیم کاربر 1405/08/22)
    if (meta.client === 'web' && (await this.credentials.appOnly(user))) return { kind: 'app_only' };

    user.failedLoginCount = 0;
    user.lockedUntil = null;
    if (user.status === 'locked') user.status = 'active';

    // سازمان می‌تواند ورود دومرحله‌ای را برای همه اجباری کند (F01 ۵.۶)
    const org = await tx.findOneOrFail(Organization, { id: user.orgId });
    const needsCode = user.twoFactorEnabled || org.require2fa;
    if (needsCode && !(await this.devices.isTrusted(tx, user.id, deviceToken, now))) {
      const issued = this.otp.issue(tx, user, now);
      return { kind: 'otp', otpToken: issued.otpToken, code: issued.code, mobile: user.mobile };
    }
    if (user.passwordExpiredAt(now, org.passwordRotationDays)) {
      return { kind: 'expired', resetToken: this.credentials.issueExpiryToken(tx, user, now) };
    }
    const opened = this.sessions.open(tx, user, meta, now);
    this.sessions.recordAttempt(tx, user, 'success', 'password', meta);
    return { kind: 'session', user, sessionId: opened.session.id, refreshToken: opened.refreshToken };
  }

  private async finish(result: TxResult): Promise<LoginOutcome> {
    switch (result.kind) {
      case 'locked':
        throw new DomainError('ACCOUNT_LOCKED', 423, { lockMinutes: result.minutes });
      case 'disabled':
        throw new ForbiddenError('ACCOUNT_DISABLED');
      case 'app_only':
        throw new ForbiddenError('WEB_ACCESS_APP_ONLY');
      case 'expired':
        // W04 مرحلهٔ ۳ با همین توکن، بی کد (تصمیم کاربر 1405/08/22)
        throw new ForbiddenError('PASSWORD_EXPIRED', { resetToken: result.resetToken });
      case 'bad_password':
        if (result.lockedMinutes !== null) {
          // W02: پیامک هشدار به صاحب حساب
          await this.sms.send({ to: result.mobile, text: 'هشدار پروژه‌یار: حساب شما پس از چند ورود ناموفق موقتاً قفل شد.' });
          throw new DomainError('ACCOUNT_LOCKED', 423, { lockMinutes: result.lockedMinutes });
        }
        throw new UnauthorizedError('INVALID_CREDENTIALS', { remainingAttempts: result.remaining });
      case 'otp':
        await this.sms.send({ to: result.mobile, text: this.otp.smsText(result.code) });
        return {
          outcome: 'otp_required',
          otpToken: result.otpToken,
          maskedMobile: maskMobile(result.mobile),
          resendAfterSec: this.config.auth.otpResendSec,
        };
      case 'session':
        return {
          outcome: 'success',
          session: await this.views.build(result.user, result.sessionId),
          refreshToken: result.refreshToken,
        };
    }
  }
}
