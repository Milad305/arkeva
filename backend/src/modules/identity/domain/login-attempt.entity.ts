import { defineEntity, p } from '@mikro-orm/postgresql';
import { LOGIN_RESULTS } from '@projeyar/shared';
import { tenantBase } from '../../../platform/database/base-properties.js';

export const LOGIN_METHODS = ['password', 'otp', 'backup_code'] as const;

/** LoginAttempt — واقعیت (F01 ۴؛ تاریخچهٔ ۳۰ روزهٔ W32). فقط‌درج؛ تریگر پایگاه داده ویرایش را رد می‌کند. */
const LoginAttemptSchema = defineEntity({
  name: 'LoginAttempt',
  tableName: 'login_attempt',
  properties: {
    ...tenantBase(),
    userId: p.uuid(),
    result: p.enum(LOGIN_RESULTS),
    method: p.enum(LOGIN_METHODS),
    ip: p.string().nullable(),
    userAgent: p.string().nullable(),
  },
});

export class LoginAttempt extends LoginAttemptSchema.class {}
LoginAttemptSchema.setClass(LoginAttempt);
