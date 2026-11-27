import { defineEntity, p } from '@mikro-orm/postgresql';
import { idColumn, versionedColumns } from '../../../platform/database/base-properties.js';

/** چالش کد پیامکی ثبت‌نام سازمان جدید — پیش از به وجود آمدن سازمان و کاربر. */
const SignupChallengeSchema = defineEntity({
  name: 'SignupChallenge',
  tableName: 'signup_challenge',
  properties: {
    id: idColumn(),
    mobile: p.string(),
    tokenHash: p.string(),
    codeHash: p.string(),
    expiresAt: p.datetime(),
    lastSentAt: p.datetime(),
    attempts: p.integer().default(0),
    consumedAt: p.datetime().nullable(),
    ...versionedColumns(),
  },
});

export class SignupChallenge extends SignupChallengeSchema.class {}
SignupChallengeSchema.setClass(SignupChallenge);
