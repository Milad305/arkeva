import { defineEntity, p } from '@mikro-orm/postgresql';
import { USER_STATUSES } from '@projeyar/shared';
import { mutableBase } from '../../../platform/database/base-properties.js';

/** `User.preferences` — فقط نمایشی (F01 ۵.۷). */
export interface UserPreferences {
  calendar: 'jalali' | 'gregorian';
  digits: 'fa' | 'latin';
  amountScale: 'auto' | 'million' | 'billion';
  startPage: string | null;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  calendar: 'jalali',
  digits: 'fa',
  amountScale: 'auto',
  startPage: null,
};

/** User — `02` ۲ و F01 ۴. جدول app_user چون user در پستگرس رزرو است. */
const UserSchema = defineEntity({
  name: 'User',
  tableName: 'app_user',
  properties: {
    ...mutableBase(),
    fullName: p.string(),
    mobile: p.string(),
    email: p.string().nullable(),
    passwordHash: p.string().nullable(),
    twoFactorEnabled: p.boolean().default(true),
    status: p.enum(USER_STATUSES).default('active'),
    isOrgAdmin: p.boolean().default(false),
    lastActiveAt: p.datetime().nullable(),
    jobTitle: p.string().nullable(),
    department: p.string().nullable(),
    passwordChangedAt: p.datetime().nullable(),
    lockedUntil: p.datetime().nullable(),
    failedLoginCount: p.integer().default(0),
    /** رنگ آواتار رابط کاربری تا فهرست‌ها همان رنگ‌های بوم را بگیرند `[پیش‌فرض فنی]`. */
    avatarTone: p.string().default('a1'),
    preferences: p.json<UserPreferences>(),
    /** هش ۵ رمز اخیر (F01 ۵.۱؛ AC-AC-10)؛ هرگز در ممیزی یا پاسخ نمی‌آید. */
    passwordHistory: p.json<string[]>(),
  },
});

export class User extends UserSchema.class {
  /** F01 ۵.۱: کاربر disabled یا invited وارد نمی‌شود؛ locked پس از پایان قفل می‌تواند. */
  canSignIn(): boolean {
    return this.status === 'active' || this.status === 'locked';
  }

  isLockedAt(now: Date): boolean {
    return this.lockedUntil != null && this.lockedUntil > now;
  }

  /** چرخش رمز گذشته است (F01 ۵.۱)؛ ۰ = خاموش. */
  passwordExpiredAt(now: Date, rotationDays: number): boolean {
    if (rotationDays <= 0 || !this.passwordChangedAt) return false;
    return now.getTime() - this.passwordChangedAt.getTime() > rotationDays * 86_400_000;
  }
}
UserSchema.setClass(User);
