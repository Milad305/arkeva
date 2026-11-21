import { Injectable } from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/postgresql';
import { randomInt } from 'node:crypto';
import type { ProjectRoleCode } from '@projeyar/shared';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { ConflictError, DomainError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationFailedError } from '../../../platform/http/errors.js';
import { SmsSender } from '../../../platform/messaging/sms-sender.js';
import { projectsWith } from '../../../platform/security/access.js';
import { Invitation, INVITATION_TTL_DAYS, newInviteCode } from '../domain/invitation.entity.js';
import { sha256 } from '../infrastructure/secrets.js';
import { DEFAULT_PREFERENCES, User } from '../domain/user.entity.js';
import { OrgUsers } from './org-users.js';
import { MembershipPort, ProjectCatalog } from './ports.js';

// دعوت (F01 ۵.۶؛ تصمیم‌های کاربر 1405/08/22): موبایل همیشه لازم، ایمیل اختیاری؛ کاربر invited همان لحظه
// ساخته می‌شود و با «فراموشی رمز» فعال می‌شود؛ پذیرش، عضویت پروژه را از team می‌سازد. ۷ روز اعتبار؛
// دعوت‌شده سهم مجوز می‌گیرد (AC-AC-09).

const DAY = 86_400_000;

/** کد دعوت تازه و هش آن (OD-20)؛ کد فقط در پیامک و پاسخ همین درخواست. */
function freshCode(): { code: string; hash: string } {
  const code = newInviteCode((max) => randomInt(0, max));
  return { code, hash: sha256(code) };
}

export interface InviteInput {
  readonly fullName: string;
  readonly mobile: string;
  readonly email?: string | null;
  readonly projectId: string;
  readonly roles: readonly ProjectRoleCode[];
}

@Injectable()
export class Invitations {
  constructor(
    private readonly em: EntityManager,
    private readonly context: AppContext,
    private readonly clock: Clock,
    private readonly audit: Audit,
    private readonly sms: SmsSender,
    private readonly orgUsers: OrgUsers,
    private readonly projects: ProjectCatalog,
    private readonly memberships: MembershipPort,
  ) {}

  /** `POST /invitations` — users.invite؛ مدیر پروژه فقط در پروژه‌های خودش (own_projects). */
  async invite(input: InviteInput): Promise<{ invitationId: string; inviteCode: string }> {
    const actor = this.actor();
    const fullName = input.fullName.trim();
    const mobile = input.mobile.replace(/[\s-]/g, '');
    const email = input.email?.trim() || null;
    const errors: { field: string; message: string }[] = [];
    if (!fullName) errors.push({ field: 'fullName', message: 'نام دعوت‌شده را بنویسید.' });
    if (!/^09\d{9}$/.test(mobile)) errors.push({ field: 'mobile', message: 'شمارهٔ همراه را مثل 09121234567 بنویسید.' });
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push({ field: 'email', message: 'نشانی ایمیل درست نیست.' });
    if (input.roles.length === 0) errors.push({ field: 'roles', message: 'دست‌کم یک نقش انتخاب کنید.' });
    if (errors.length > 0) throw new ValidationFailedError(errors);
    const project = await this.writableProject(input.projectId);
    const now = this.clock.now();

    const created = await this.em.transactional((tx) =>
      this.createWithin(tx, { orgId: actor.orgId, actorUserId: actor.userId, projectId: project.id, fullName, mobile, email, roles: input.roles }, now),
    );
    await this.notify(mobile, project.name, created.inviteCode);
    // کد دعوت یک بار به دعوت‌کننده هم برمی‌گردد تا QR آن را در کارگاه نشان دهد (OD-20)
    return created;
  }

  /**
   * هستهٔ دعوت درون تراکنش فراخواننده (W26 و ساخت پروژه از ویزارد، F02 ۵.۴). دسترسی و اعتبار ورودی را
   * فراخواننده سنجیده است؛ اینجا یکتایی سراسری، دعوت تکراری و سهم مجوز. پیامک با `notify` پس از commit.
   */
  async createWithin(
    tx: EntityManager,
    input: {
      readonly orgId: string;
      readonly actorUserId: string;
      readonly projectId: string;
      readonly fullName: string;
      readonly mobile: string;
      readonly email: string | null;
      readonly roles: readonly ProjectRoleCode[];
    },
    now: Date,
  ): Promise<{ invitationId: string; inviteCode: string }> {
    const { mobile, email } = input;
    const existing = await tx.findOne(User, { mobile });
    if (existing && existing.status !== 'invited') throw new ConflictError('IDENTITY_TAKEN');
    if (!existing && (await this.takenGlobally(tx, mobile, email))) throw new ConflictError('IDENTITY_TAKEN');
    if (existing) {
      const pending = await tx.count(Invitation, { userId: existing.id, projectId: input.projectId, status: 'pending', expiresAt: { $gt: now } });
      if (pending > 0) throw new ConflictError('MEMBER_ALREADY_ACTIVE', { reason: 'pending_invitation' });
    }
    // کاربر invited با دعوت معتبر دیگر از پیش سهم دارد؛ تازه یا منقضی سهم تازه می‌گیرد
    const holdsSeat = existing ? (await tx.count(Invitation, { userId: existing.id, status: 'pending', expiresAt: { $gt: now } })) > 0 : false;
    if (!holdsSeat) {
      const seats = await this.orgUsers.seats(tx);
      if (seats.used >= seats.limit) throw new ConflictError('SEATS_FULL', { limit: seats.limit });
    }
    const user =
      existing ??
      tx.create(User, {
        orgId: input.orgId,
        fullName: input.fullName,
        mobile,
        email,
        passwordHash: null,
        twoFactorEnabled: true,
        status: 'invited',
        isOrgAdmin: false,
        preferences: { ...DEFAULT_PREFERENCES },
        passwordHistory: [],
      });
    await tx.flush();
    const code = freshCode();
    const invitation = tx.create(Invitation, {
      orgId: input.orgId,
      userId: user.id,
      projectId: input.projectId,
      channel: email ? 'email' : 'sms',
      target: email ?? mobile,
      roleCodes: [...new Set(input.roles)],
      status: 'pending',
      sentAt: now,
      expiresAt: new Date(now.getTime() + INVITATION_TTL_DAYS * DAY),
      acceptedAt: null,
      createdByUserId: input.actorUserId,
      inviteCodeHash: code.hash,
    });
    this.audit.record(tx, {
      action: 'user.invited',
      entityType: 'User',
      entityId: user.id,
      projectId: input.projectId,
      after: { fullName: user.fullName, projectId: input.projectId, roles: invitation.roleCodes },
    });
    return { invitationId: invitation.id, inviteCode: code.code };
  }

  /** `POST /invitations/:id/resend` — مهلت تازهٔ ۷ روز؛ دعوت منقضی دوباره سهم می‌گیرد. */
  /** دعوت‌های در انتظار و منقضی یک پروژه (W16)؛ هدف را فراخواننده بی team.manage پنهان می‌کند. */
  async forProject(projectId: string) {
    const now = this.clock.now();
    const rows = await this.em.find(Invitation, { projectId, status: { $in: ['pending', 'expired'] } }, { orderBy: { sentAt: 'desc' } });
    const users = new Map(
      (await this.em.find(User, { id: { $in: rows.map((row) => row.userId) } }, { fields: ['fullName'] })).map((user) => [user.id, user.fullName]),
    );
    return rows.map((row) => ({
      id: row.id,
      channel: row.channel,
      target: row.target,
      fullName: users.get(row.userId) ?? null,
      roles: row.roleCodes,
      sentAt: row.sentAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      status: row.isPendingAt(now) ? ('pending' as const) : ('expired' as const),
    }));
  }

  async resend(invitationId: string): Promise<{ ok: true; inviteCode: string }> {
    const now = this.clock.now();
    const sent = await this.em.transactional(async (tx) => {
      const invitation = await this.load(tx, invitationId);
      if (invitation.status !== 'pending' && invitation.status !== 'expired') throw new ConflictError('INVITATION_NOT_FOUND');
      if (!invitation.isPendingAt(now)) {
        const seats = await this.orgUsers.seats(tx);
        if (seats.used >= seats.limit) throw new ConflictError('SEATS_FULL', { limit: seats.limit });
      }
      invitation.status = 'pending';
      invitation.sentAt = now;
      invitation.expiresAt = new Date(now.getTime() + INVITATION_TTL_DAYS * DAY);
      // کد تازه؛ کد قبلی دیگر کار نمی‌کند (OD-20)
      const code = freshCode();
      invitation.inviteCodeHash = code.hash;
      const user = await tx.findOneOrFail(User, { id: invitation.userId });
      const project = (await this.projects.list()).find((entry) => entry.id === invitation.projectId);
      return { mobile: user.mobile, projectName: project?.name ?? '', inviteCode: code.code };
    });
    await this.notify(sent.mobile, sent.projectName, sent.inviteCode);
    return { ok: true, inviteCode: sent.inviteCode };
  }

  /** `DELETE /invitations/:id` — لغو؛ کاربر invited می‌ماند ولی سهم مجوز آزاد می‌شود. */
  async revoke(invitationId: string): Promise<{ ok: true }> {
    await this.em.transactional(async (tx) => {
      const invitation = await this.load(tx, invitationId);
      if (invitation.status === 'accepted') throw new ConflictError('INVITATION_NOT_FOUND');
      invitation.status = 'revoked';
      invitation.inviteCodeHash = null;
      this.audit.record(tx, {
        action: 'user.invitation_revoked',
        entityType: 'User',
        entityId: invitation.userId,
        projectId: invitation.projectId,
        before: { status: 'pending' },
        after: { status: 'revoked' },
      });
    });
    return { ok: true };
  }

  /**
   * پذیرش دعوت‌های معتبر کاربر invited هنگام ساخت رمز (تصمیم کاربر 1405/08/22) — درون تراکنش بازیابی
   * رمز. هیچ دعوت معتبری نباشد: INVITATION_EXPIRED.
   */
  async acceptPending(tx: EntityManager, user: User, now: Date): Promise<ProjectRoleCode[]> {
    const invitations = await tx.find(Invitation, { userId: user.id, status: 'pending' }, { lockMode: LockMode.PESSIMISTIC_WRITE });
    const valid = invitations.filter((invitation) => invitation.expiresAt > now);
    if (valid.length === 0) throw new DomainError('INVITATION_EXPIRED', 403);
    const roles: ProjectRoleCode[] = [];
    for (const invitation of valid) {
      const granted = invitation.roleCodes as ProjectRoleCode[];
      await this.memberships.addMember(tx, { orgId: user.orgId, projectId: invitation.projectId, userId: user.id, roles: granted });
      invitation.status = 'accepted';
      invitation.acceptedAt = now;
      invitation.inviteCodeHash = null;
      roles.push(...granted);
    }
    return roles;
  }

  private async load(tx: EntityManager, id: string): Promise<Invitation> {
    const invitation = await tx.findOne(Invitation, { id }, { lockMode: LockMode.PESSIMISTIC_WRITE });
    if (!invitation) throw new NotFoundError('INVITATION_NOT_FOUND');
    this.assertProjectScope(invitation.projectId);
    return invitation;
  }

  /** مدیر پروژه با users.invite فقط در پروژه‌های خودش (own_projects). */
  assertProjectScope(projectId: string): void {
    const access = this.context.access;
    if (!access) throw new UnauthorizedError();
    if (access.isOrgAdmin || projectsWith(access, 'users.manage').length > 0) return;
    if (!projectsWith(access, 'users.invite').includes(projectId)) throw new ForbiddenError('PERMISSION_DENIED', { requiredPermission: 'users.invite' });
  }

  async writableProject(projectId: string) {
    this.assertProjectScope(projectId);
    const project = (await this.projects.list()).find((entry) => entry.id === projectId);
    if (!project) throw new NotFoundError('PROJECT_NOT_FOUND');
    if (project.status === 'completed' || project.status === 'archived') throw new ConflictError('PROJECT_READ_ONLY', { status: project.status });
    return project;
  }

  private async takenGlobally(tx: EntityManager, mobile: string, email: string | null): Promise<boolean> {
    const [row] = await tx
      .getConnection()
      .execute<{ taken: boolean }[]>('select identity_taken(?, ?, null) as taken', [mobile, email], 'all', tx.getTransactionContext());
    return row?.taken ?? false;
  }

  /** پیامک دعوت — پس از commit (04 ۵). */
  async notify(mobile: string, projectName: string, inviteCode: string): Promise<void> {
    // ایمیل با EmailSender برش ۱۲ (F13)؛ موبایل همیشه هست (تصمیم کاربر 1405/08/22). کد دعوت اپ با ارقام و حروف لاتین (OD-20)
    await this.sms.send({
      to: mobile,
      text:
        `شما به پروژهٔ «${projectName}» در پروژه‌یار دعوت شدید. اپ کارگاه: «ورود با کد دعوت» و کد ${inviteCode}. ` +
        'وب: در صفحهٔ ورود «فراموشی رمز» را با همین شماره بزنید و رمز بسازید. این دعوت ۷ روز اعتبار دارد.',
    });
  }

  private actor() {
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError();
    return actor;
  }
}
