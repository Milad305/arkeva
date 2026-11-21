import { Injectable } from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/postgresql';
import type { SystemRole } from '@projeyar/shared';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { newId } from '../../../platform/database/ids.js';
import { ConflictError, DomainError, NotFoundError, UnauthorizedError, ValidationFailedError } from '../../../platform/http/errors.js';
import { AuthSession } from '../domain/auth-session.entity.js';
import { BackupCode } from '../domain/invitation.entity.js';
import { LoginAttempt } from '../domain/login-attempt.entity.js';
import { Organization } from '../domain/organization.entity.js';
import { maskMobile } from '../domain/rules/identifier.js';
import { type UserPreferences, User } from '../domain/user.entity.js';
import { PasswordHasher } from '../infrastructure/password-hasher.js';
import { randomSecret, sha256 } from '../infrastructure/secrets.js';
import { Credentials } from './credentials.js';
import { MembershipPort, ProjectCatalog, AccountNotifications } from './ports.js';
import { StepUpChallenges } from './step-up.js';
import { TrustedDevices } from './trusted-devices.js';

// حساب من (W32؛ F01 ۵.۱ و ۵.۷). همه روی حساب خود کاربر و بی کد دسترسی (F01 ۸). ترجیح اعلان با برش ۱۲.

const DAY = 86_400_000;
const BACKUP_CODE_COUNT = 8;

/** واحدهای سازمان تا تنظیمات سازمان (W30) فهرست خودش را بدهد `[پیش‌فرض فنی]`؛ همان فهرست ماک. */
export const DEFAULT_DEPARTMENTS = ['دفتر فنی', 'برنامه‌ریزی و کنترل پروژه', 'مالی', 'اجرا', 'تأسیسات', 'مدیریت'] as const;

const METHOD_LABEL: Record<LoginAttempt['method'], string> = {
  password: 'رمز عبور',
  otp: 'رمز + کد پیامکی',
  backup_code: 'رمز + کد پشتیبان',
};

const backupHash = (userId: string, code: string): string => sha256(`${userId}:${code.replace(/\D/g, '')}`);

export interface ProfileInput {
  readonly fullName: string;
  readonly jobTitle: string;
  readonly department: string | null;
}

@Injectable()
export class Account {
  constructor(
    private readonly em: EntityManager,
    private readonly context: AppContext,
    private readonly clock: Clock,
    private readonly audit: Audit,
    private readonly hasher: PasswordHasher,
    private readonly credentials: Credentials,
    private readonly devices: TrustedDevices,
    private readonly stepUp: StepUpChallenges,
    private readonly memberships: MembershipPort,
    private readonly projects: ProjectCatalog,
    private readonly notifications: AccountNotifications,
  ) {}

  /** `GET /me` */
  async get() {
    const actor = this.actor();
    const now = this.clock.now();
    const [user, org, sessions, backupLeft, memberships, projects, departments] = await Promise.all([
      this.em.findOneOrFail(User, { id: actor.userId }),
      this.em.findOneOrFail(Organization, { id: actor.orgId }),
      this.em.find(AuthSession, { userId: actor.userId, revokedAt: null, expiresAt: { $gt: now } }, { orderBy: { lastUsedAt: 'desc' } }),
      this.em.count(BackupCode, { userId: actor.userId, usedAt: null }),
      this.memberships.memberships([actor.userId]),
      this.projects.list(),
      this.departments(),
    ]);
    const byId = new Map(projects.map((project) => [project.id, project]));
    const age = user.passwordChangedAt ? Math.floor((now.getTime() - user.passwordChangedAt.getTime()) / DAY) : null;
    return {
      profile: {
        id: user.id,
        fullName: user.fullName,
        jobTitle: user.jobTitle ?? null,
        department: user.department ?? null,
        email: user.email ?? null,
        mobile: user.mobile,
        avatarTone: user.avatarTone,
        isOrgAdmin: user.isOrgAdmin,
      },
      departments,
      memberships: memberships.flatMap((entry) => {
        const project = byId.get(entry.projectId);
        return project
          ? [{ projectId: project.id, code: project.code, name: project.name, status: project.status, roles: [...entry.roles] as SystemRole[] }]
          : [];
      }),
      security: {
        passwordChangedAt: user.passwordChangedAt?.toISOString() ?? null,
        rotationDays: org.passwordRotationDays,
        daysUntilRotation: age === null || org.passwordRotationDays <= 0 ? null : org.passwordRotationDays - age,
        twoFactorEnabled: user.twoFactorEnabled,
        orgRequires2fa: org.require2fa,
        backupCodesLeft: user.twoFactorEnabled ? backupLeft : 0,
        maskedMobile: maskMobile(user.mobile),
      },
      sessions: sessions.map((session) => ({
        id: session.id,
        client: session.client,
        deviceName: session.deviceName,
        // مکان تقریبی از IP بی سرویس بیرونی ممکن نیست (07 ۸) `[پیش‌فرض فنی]`
        location: 'نامشخص',
        ip: session.ip ?? '—',
        lastUsedAt: session.lastUsedAt.toISOString(),
        current: session.id === actor.sessionId,
      })),
      preferences: user.preferences,
      notifications: await this.notifications.view(actor.userId),
    };
  }

  /** `PATCH /me` — نام، عنوان شغلی و واحد؛ ایمیل و موبایل فقط با مدیر سازمان (۵.۶). */
  async updateProfile(input: ProfileInput) {
    const fullName = input.fullName.trim();
    const jobTitle = input.jobTitle.trim();
    const errors: { field: string; message: string }[] = [];
    if (fullName.length < 3) errors.push({ field: 'fullName', message: 'نام و نام خانوادگی را کامل بنویسید.' });
    if (fullName.length > 80) errors.push({ field: 'fullName', message: 'نام حداکثر ۸۰ نویسه است.' });
    if (jobTitle.length > 80) errors.push({ field: 'jobTitle', message: 'عنوان شغلی حداکثر ۸۰ نویسه است.' });
    if (input.department && !(await this.departments()).includes(input.department)) errors.push({ field: 'department', message: 'این واحد در سازمان نیست.' });
    if (errors.length > 0) throw new ValidationFailedError(errors);
    await this.em.transactional(async (tx) => {
      const user = await this.lockMe(tx);
      const before = { fullName: user.fullName, jobTitle: user.jobTitle ?? null, department: user.department ?? null };
      user.fullName = fullName;
      user.jobTitle = jobTitle || null;
      user.department = input.department || null;
      this.audit.record(tx, {
        action: 'user.profile_updated',
        entityType: 'User',
        entityId: user.id,
        before,
        after: { fullName, jobTitle: user.jobTitle, department: user.department },
      });
    });
    return this.get();
  }

  /** `PATCH /me { preferences }` — فقط نمایشی. */
  async updatePreferences(preferences: UserPreferences) {
    await this.em.transactional(async (tx) => {
      const user = await this.lockMe(tx);
      user.preferences = { ...preferences };
    });
    return this.get();
  }

  /** `PUT /me/password` — AC-AC-10، AC-AC-11. */
  async changePassword(input: { current: string; next: string; signOutOthers: boolean }): Promise<{ signedOut: number }> {
    const actor = this.actor();
    const now = this.clock.now();
    return this.em.transactional(async (tx) => {
      const user = await this.lockMe(tx);
      if (!(await this.hasher.verify(user.passwordHash, input.current))) throw new DomainError('PASSWORD_INCORRECT', 422);
      await this.credentials.setPassword(user, input.next, now);
      await this.devices.revokeAll(tx, user.id, now);
      let signedOut = 0;
      if (input.signOutOthers) {
        const others = await tx.find(AuthSession, { userId: user.id, revokedAt: null, id: { $ne: actor.sessionId } });
        for (const session of others) session.revoke('password_changed', now);
        signedOut = others.length;
      }
      this.audit.record(tx, { action: 'user.password_changed', entityType: 'User', entityId: user.id, after: { signedOutSessions: signedOut } });
      return { signedOut };
    });
  }

  /** `POST /me/2fa/enable` — کد step-up با هدف `account.enable_2fa` و موضوع خود کاربر. */
  async enable2fa(code: string): Promise<{ backupCodes: string[] }> {
    const actor = this.actor();
    await this.stepUp.consume({ purpose: 'account.enable_2fa', subjectId: actor.userId, code });
    return this.em.transactional(async (tx) => {
      const user = await this.lockMe(tx);
      if (!user.twoFactorEnabled) {
        user.twoFactorEnabled = true;
        this.audit.record(tx, {
          action: 'user.2fa_enabled',
          entityType: 'User',
          entityId: user.id,
          before: { twoFactorEnabled: false },
          after: { twoFactorEnabled: true },
        });
      }
      return { backupCodes: await this.issueBackupCodes(tx, user) };
    });
  }

  /** `POST /me/2fa/disable` — با رمز؛ اگر سازمان اجباری کرده باشد رد. */
  async disable2fa(password: string): Promise<{ ok: true }> {
    const actor = this.actor();
    const now = this.clock.now();
    await this.em.transactional(async (tx) => {
      const org = await tx.findOneOrFail(Organization, { id: actor.orgId });
      if (org.require2fa) throw new ConflictError('TWO_FACTOR_REQUIRED_BY_ORG');
      const user = await this.lockMe(tx);
      if (!(await this.hasher.verify(user.passwordHash, password))) throw new DomainError('PASSWORD_INCORRECT', 422);
      if (!user.twoFactorEnabled) return;
      user.twoFactorEnabled = false;
      await tx.nativeUpdate(BackupCode, { userId: user.id, usedAt: null }, { usedAt: now });
      await this.devices.revokeAll(tx, user.id, now);
      this.audit.record(tx, {
        action: 'user.2fa_disabled',
        entityType: 'User',
        entityId: user.id,
        before: { twoFactorEnabled: true },
        after: { twoFactorEnabled: false },
      });
    });
    return { ok: true };
  }

  /** `POST /me/2fa/backup-codes` — ۸ کد تازه؛ همهٔ قبلی‌ها باطل. */
  async regenerateBackupCodes(): Promise<{ backupCodes: string[] }> {
    return this.em.transactional(async (tx) => {
      const user = await this.lockMe(tx);
      if (!user.twoFactorEnabled) throw new ConflictError('TWO_FACTOR_OFF');
      return { backupCodes: await this.issueBackupCodes(tx, user) };
    });
  }

  /** `DELETE /me/sessions/:id` */
  async revokeSession(sessionId: string): Promise<{ ok: true }> {
    const actor = this.actor();
    if (sessionId === actor.sessionId) throw new ConflictError('SESSION_IS_CURRENT');
    const now = this.clock.now();
    await this.em.transactional(async (tx) => {
      const session = await tx.findOne(AuthSession, { id: sessionId, userId: actor.userId });
      if (!session) throw new NotFoundError('NOT_FOUND');
      session.revoke('user_signed_out_device', now);
    });
    return { ok: true };
  }

  /** `DELETE /me/sessions` — همه جز همین دستگاه (AC-AC-11). */
  async revokeOtherSessions(): Promise<{ signedOut: number }> {
    const actor = this.actor();
    const now = this.clock.now();
    return this.em.transactional(async (tx) => {
      const others = await tx.find(AuthSession, { userId: actor.userId, revokedAt: null, id: { $ne: actor.sessionId } });
      for (const session of others) session.revoke('user_signed_out_others', now);
      return { signedOut: others.length };
    });
  }

  /** `GET /me/login-history?days=30` — ناموفق از IPی که در ورودهای موفق نیامده «مشکوک» است (۵.۷). */
  async loginHistory(days: number) {
    const actor = this.actor();
    const since = new Date(this.clock.now().getTime() - Math.min(Math.max(days, 1), 90) * DAY);
    const attempts = await this.em.find(LoginAttempt, { userId: actor.userId, createdAt: { $gte: since } }, { orderBy: { createdAt: 'desc' }, limit: 200 });
    const knownIps = new Set(attempts.filter((attempt) => attempt.result === 'success' && attempt.ip).map((attempt) => attempt.ip));
    return attempts.map((attempt) => ({
      id: attempt.id,
      at: attempt.createdAt.toISOString(),
      result: attempt.result,
      method: METHOD_LABEL[attempt.method],
      location: 'نامشخص',
      ip: attempt.ip ?? '—',
      suspicious: attempt.result !== 'success' && !!attempt.ip && !knownIps.has(attempt.ip),
    }));
  }

  private async issueBackupCodes(tx: EntityManager, user: User): Promise<string[]> {
    const now = this.clock.now();
    await tx.nativeUpdate(BackupCode, { userId: user.id, usedAt: null }, { usedAt: now });
    const codes = Array.from({ length: BACKUP_CODE_COUNT }, () => {
      const digits = BigInt(`0x${sha256(randomSecret()).slice(0, 12)}`)
        .toString()
        .padStart(8, '0')
        .slice(-8);
      return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    });
    for (const code of codes) tx.create(BackupCode, { id: newId(), orgId: user.orgId, userId: user.id, codeHash: backupHash(user.id, code), usedAt: null });
    return codes;
  }

  private async departments(): Promise<string[]> {
    const rows = await this.em.find(User, { department: { $ne: null } }, { fields: ['department'] });
    return [...new Set([...DEFAULT_DEPARTMENTS, ...rows.flatMap((row) => (row.department ? [row.department] : []))])];
  }

  private async lockMe(tx: EntityManager): Promise<User> {
    const actor = this.actor();
    return tx.findOneOrFail(User, { id: actor.userId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
  }

  private actor() {
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError();
    return actor;
  }
}
