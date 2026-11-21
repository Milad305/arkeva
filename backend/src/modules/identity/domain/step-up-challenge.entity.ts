import { defineEntity, p } from '@mikro-orm/postgresql';
import { STEP_UP_PURPOSES } from '@projeyar/shared';
import { mutableBase } from '../../../platform/database/base-properties.js';

/**
 * تأیید دوباره برای عمل حساس (F02 ۸.۴؛ تصمیم کاربر 1405/08/22): کد پیامکی شش‌رقمی به موبایل خود کاربر،
 * برای یک عمل روی یک موضوع، ۵ دقیقه، ۵ تلاش، یک‌بارمصرف. کد فقط به‌صورت هش.
 */
const StepUpChallengeSchema = defineEntity({
  name: 'StepUpChallenge',
  tableName: 'step_up_challenge',
  properties: {
    ...mutableBase(),
    userId: p.uuid(),
    purpose: p.enum(STEP_UP_PURPOSES),
    subjectId: p.uuid(),
    codeHash: p.string(),
    expiresAt: p.datetime(),
    lastSentAt: p.datetime(),
    attempts: p.integer().default(0),
    consumedAt: p.datetime().nullable(),
  },
});

export class StepUpChallenge extends StepUpChallengeSchema.class {}
StepUpChallengeSchema.setClass(StepUpChallenge);
