import { Injectable } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/postgresql';
import { type ProjectRoleCode, WEB_PANEL_ROLES } from '@projeyar/shared';
import { newId } from '../../../platform/database/ids.js';
import { DomainError } from '../../../platform/http/errors.js';
import { OtpChallenge } from '../domain/otp-challenge.entity.js';
import { Organization } from '../domain/organization.entity.js';
import { PASSWORD_HISTORY_SIZE, passwordPolicyError } from '../domain/rules/password-policy.js';
import type { User } from '../domain/user.entity.js';
import { PasswordHasher } from '../infrastructure/password-hasher.js';
import { randomSecret, sha256 } from '../infrastructure/secrets.js';
import { MembershipPort } from './ports.js';

// قواعد مشترک رمز و دروازه‌های ورود (F01 ۵.۱؛ تصمیم‌های کاربر 1405/08/22):
//   • سیاست رمز و ۵ رمز اخیر (AC-AC-10)؛ هش رمز کنار گذاشته در passwordHistory.
//   • رمز منقضی (چرخش سازمان): پس از احراز کامل، به‌جای نشست توکن «رمز تازه» (W04 مرحلهٔ ۳).
//   • کاربری که فقط نقش اپ دارد (سرپرست) به پنل وب راه ندارد (§۷.۳ ردیف ۱۷).

/** مهلت فرم «رمز تازه» پس از رمز منقضی `[پیش‌فرض فنی]`. */
const EXPIRY_TOKEN_TTL_MS = 15 * 60_000;

@Injectable()
export class Credentials {
  constructor(
    private readonly hasher: PasswordHasher,
    private readonly memberships: MembershipPort,
  ) {}

  /** رمز تازه را می‌سنجد و می‌نشاند؛ رمز فعلی به تاریخچه می‌رود. */
  async setPassword(user: User, next: string, now: Date): Promise<void> {
    const reason = passwordPolicyError(next);
    if (reason) throw new DomainError('PASSWORD_POLICY', 422, { reason });
    const previous = [user.passwordHash, ...user.passwordHistory].filter((value): value is string => !!value).slice(0, PASSWORD_HISTORY_SIZE);
    for (const old of previous) {
      if (await this.hasher.verify(old, next)) throw new DomainError('PASSWORD_REUSED', 422);
    }
    user.passwordHash = await this.hasher.hash(next);
    user.passwordHistory = previous.slice(0, PASSWORD_HISTORY_SIZE);
    user.passwordChangedAt = now;
  }

  async passwordExpired(tx: EntityManager, user: User, now: Date): Promise<boolean> {
    const org = await tx.findOneOrFail(Organization, { id: user.orgId });
    return user.passwordExpiredAt(now, org.passwordRotationDays);
  }

  /** توکن «رمز تازه» برای رمز منقضی — کد نمی‌خواهد چون کاربر همین حالا کامل احراز شد. */
  issueExpiryToken(tx: EntityManager, user: User, now: Date): string {
    const id = newId();
    const secret = randomSecret();
    tx.create(OtpChallenge, {
      id,
      orgId: user.orgId,
      userId: user.id,
      purpose: 'password_expired',
      tokenHash: sha256(secret),
      codeHash: sha256(randomSecret()),
      expiresAt: new Date(now.getTime() + EXPIRY_TOKEN_TTL_MS),
      lastSentAt: now,
    });
    return `${user.orgId}.${id}.${secret}`;
  }

  /** فقط نقش اپ (سرپرست) و نه مدیر سازمان: ورود وب بسته است (§۷.۳ ردیف ۱۷). */
  async appOnly(user: Pick<User, 'id' | 'isOrgAdmin'>, pendingRoles: readonly ProjectRoleCode[] = []): Promise<boolean> {
    if (user.isOrgAdmin) return false;
    const roles = [...(await this.memberships.memberships([user.id])).flatMap((entry) => entry.roles), ...pendingRoles];
    return roles.length > 0 && roles.every((role) => !WEB_PANEL_ROLES.includes(role));
  }
}
