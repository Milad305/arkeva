import { Injectable } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/postgresql';
import { AppConfig } from '../../../config/config.js';
import { newId } from '../../../platform/database/ids.js';
import { OtpChallenge } from '../domain/otp-challenge.entity.js';
import type { User } from '../domain/user.entity.js';
import { otpCodeHash, randomSecret, sha256, sixDigitCode } from '../infrastructure/secrets.js';

export interface IssuedOtp {
  /** «orgId.challengeId.secret» */
  readonly otpToken: string;
  readonly code: string;
}

/** چالش کد پیامکی W03. کد ثابت فقط در توسعه (OTP_DEV_CODE؛ تصمیم 1405/08/21). */
@Injectable()
export class OtpIssuer {
  constructor(private readonly config: AppConfig) {}

  newCode(): string {
    return this.config.auth.otpDevCode ?? sixDigitCode();
  }

  issue(tx: EntityManager, user: User, now: Date): IssuedOtp {
    const id = newId();
    const secret = randomSecret();
    const code = this.newCode();
    tx.create(OtpChallenge, {
      id,
      orgId: user.orgId,
      userId: user.id,
      tokenHash: sha256(secret),
      codeHash: otpCodeHash(id, code),
      expiresAt: this.expiry(now),
      lastSentAt: now,
    });
    return { otpToken: `${user.orgId}.${id}.${secret}`, code };
  }

  expiry(now: Date): Date {
    return new Date(now.getTime() + this.config.auth.otpTtlSec * 1000);
  }

  /** ارقام لاتین تا خواندن خودکار پیامک کار کند. */
  smsText(code: string): string {
    return `کد ورود پروژه‌یار: ${code}\nاین کد را به کسی ندهید.`;
  }
}
