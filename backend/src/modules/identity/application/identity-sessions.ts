import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { Actor } from '../../../platform/context/app-context.js';
import { UnauthorizedError } from '../../../platform/http/errors.js';
import { User } from '../domain/user.entity.js';
import { LoginCommand, type LoginOutcome } from './login.command.js';
import { ResendOtpCommand, VerifyOtpCommand } from './otp.commands.js';
import type { RequestMeta } from './session-issuer.js';
import { LogoutCommand, RefreshSessionCommand, type RefreshResult } from './session.commands.js';
import { SessionViewBuilder, type SessionView } from './session-view.js';

/** نمای فرمان‌های نشست برای کنترلر (03 ۳: سرویس نما فقط فرمان‌ها را صدا می‌زند). */
@Injectable()
export class IdentitySessions {
  constructor(
    private readonly em: EntityManager,
    private readonly loginCommand: LoginCommand,
    private readonly verifyOtpCommand: VerifyOtpCommand,
    private readonly resendOtpCommand: ResendOtpCommand,
    private readonly refreshCommand: RefreshSessionCommand,
    private readonly logoutCommand: LogoutCommand,
    private readonly views: SessionViewBuilder,
  ) {}

  login(input: { identifier: string; password: string; deviceToken?: string | undefined }, meta: RequestMeta): Promise<LoginOutcome> {
    return this.loginCommand.execute(input, meta);
  }

  verifyOtp(
    input: { otpToken: string; code: string; trustDevice?: boolean | undefined },
    meta: RequestMeta,
  ): Promise<{ session: SessionView; refreshToken: string; deviceToken: string | null }> {
    return this.verifyOtpCommand.execute(input, meta);
  }

  resendOtp(input: { otpToken: string }): Promise<{ resendAfterSec: number }> {
    return this.resendOtpCommand.execute(input);
  }

  refresh(cookie: string | undefined): Promise<RefreshResult> {
    return this.refreshCommand.execute(cookie);
  }

  logout(cookie: string | undefined): Promise<void> {
    return this.logoutCommand.execute(cookie);
  }

  async current(actor: Actor): Promise<SessionView> {
    const user = await this.em.findOne(User, { id: actor.userId });
    if (!user || user.status !== 'active') throw new UnauthorizedError('SESSION_EXPIRED');
    return this.views.build(user, actor.sessionId, actor.client);
  }
}
