import { defineEntity, p } from '@mikro-orm/postgresql';
import { mutableBase } from '../../../platform/database/base-properties.js';

/** مرحلهٔ دوم ورود (W03؛ F01 ۵.۱). کد و توکن فقط به‌صورت هش؛ یک‌بارمصرف. */
const OtpChallengeSchema = defineEntity({
  name: 'OtpChallenge',
  tableName: 'otp_challenge',
  properties: {
    ...mutableBase(),
    userId: p.uuid(),
    /** ورود (W03)، بازیابی رمز (W04) یا رمز منقضی؛ هر کدام فقط در مسیر خودش مصرف می‌شود. */
    purpose: p.enum(['login', 'password_reset', 'password_expired', 'app_login', 'app_invite'] as const).default('login'),
    tokenHash: p.string(),
    codeHash: p.string(),
    expiresAt: p.datetime(),
    lastSentAt: p.datetime(),
    attempts: p.integer().default(0),
    consumedAt: p.datetime().nullable(),
  },
});

export class OtpChallenge extends OtpChallengeSchema.class {}
OtpChallengeSchema.setClass(OtpChallenge);
