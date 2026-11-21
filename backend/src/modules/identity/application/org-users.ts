import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { type ProjectRoleCode, type SystemRole, WEB_PANEL_ROLES } from '@projeyar/shared';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { UnauthorizedError } from '../../../platform/http/errors.js';
import { projectsWith, type ResolvedAccess } from '../../../platform/security/access.js';
import { AuthSession } from '../domain/auth-session.entity.js';
import { Invitation } from '../domain/invitation.entity.js';
import { Organization } from '../domain/organization.entity.js';
import { User } from '../domain/user.entity.js';
import { type Membership, MembershipPort, type ProjectBasics, ProjectCatalog } from './ports.js';

// کاربران سازمان (W26؛ F01 ۵.۶) — خواندن. با users.manage همه و مخاطب؛ با users.invite فقط اعضای
// پروژه‌هایی که کد را آنجا دارد (own_projects) و بی مخاطب (D11؛ همان ماک).

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const ROLE_ORDER: SystemRole[] = ['org_admin', 'project_manager', 'planner', 'reviewer', 'client_reviewer', 'finance', 'supervisor'];
const sortRoles = (roles: Iterable<SystemRole>): SystemRole[] => [...new Set(roles)].sort((a, b) => ROLE_ORDER.indexOf(a) - ROLE_ORDER.indexOf(b));
const prettyMobile = (mobile: string): string => `${mobile.slice(0, 4)} ${mobile.slice(4, 7)} ${mobile.slice(7)}`;
const appOnly = (roles: readonly SystemRole[]): boolean => roles.length > 0 && roles.every((role) => !WEB_PANEL_ROLES.includes(role));

export interface Seats {
  readonly used: number;
  readonly limit: number;
  readonly invited: number;
}

/** دیدن کاربران: همه یا فقط اعضای پروژه‌های دارای users.invite. */
export function userScope(access: ResolvedAccess): { readonly canManage: boolean; readonly projectIds: ReadonlySet<string> | 'all' } {
  const canManage = access.isOrgAdmin || projectsWith(access, 'users.manage').length > 0;
  return { canManage, projectIds: canManage ? 'all' : new Set(projectsWith(access, 'users.invite')) };
}

@Injectable()
export class OrgUsers {
  constructor(
    private readonly em: EntityManager,
    private readonly context: AppContext,
    private readonly clock: Clock,
    private readonly memberships: MembershipPort,
    private readonly projects: ProjectCatalog,
  ) {}

  /** سهم مجوز (AC-AC-09): فعال و قفل + دعوت‌شده‌های دارای دعوت معتبر؛ عضویت چندپروژه‌ای یک مجوز. */
  async seats(em: EntityManager = this.em): Promise<Seats> {
    const now = this.clock.now();
    const [org, users, pending] = await Promise.all([
      em.findOneOrFail(Organization, { id: this.orgId() }),
      em.count(User, { status: { $in: ['active', 'locked'] } }),
      em.find(Invitation, { status: 'pending', expiresAt: { $gt: now } }, { fields: ['userId'] }),
    ]);
    const invited = new Set(pending.map((row) => row.userId)).size;
    return { used: users + invited, limit: org.seatLimit, invited };
  }

  async list() {
    const access = this.context.access;
    const actor = this.context.actor;
    if (!access || !actor) throw new UnauthorizedError();
    const scope = userScope(access);
    const now = this.clock.now();

    const [org, users, invitations, memberships, projects, sessions, seats] = await Promise.all([
      this.em.findOneOrFail(Organization, { id: actor.orgId }),
      this.em.find(User, {}),
      this.em.find(Invitation, { status: { $in: ['pending', 'expired'] } }, { orderBy: { sentAt: 'desc' } }),
      this.memberships.memberships(),
      this.projects.list(),
      this.em.find(AuthSession, { revokedAt: null }, { fields: ['userId', 'client', 'lastUsedAt'] }),
      this.seats(),
    ]);
    const projectById = new Map(projects.map((project) => [project.id, project]));
    const byUser = new Map<string, Membership[]>();
    for (const entry of memberships) byUser.set(entry.userId, [...(byUser.get(entry.userId) ?? []), entry]);
    const androidUsers = new Set(sessions.filter((session) => session.client === 'android').map((session) => session.userId));
    const visible = (userId: string): boolean =>
      scope.projectIds === 'all' || (byUser.get(userId) ?? []).some((entry) => (scope.projectIds as ReadonlySet<string>).has(entry.projectId));

    const userRows = users
      .filter((user) => user.status !== 'invited' && visible(user.id))
      .map((user) => this.userRow(user, actor.userId, byUser.get(user.id) ?? [], projectById, androidUsers.has(user.id), scope.canManage, now));
    const invitationRows = invitations
      .filter((invitation) => scope.projectIds === 'all' || scope.projectIds.has(invitation.projectId))
      .map((invitation) => this.invitationRow(invitation, users, projectById, scope.canManage, now));

    const rows = [...userRows, ...invitationRows].sort((a, b) => Number(b.isMe) - Number(a.isMe) || rank(b) - rank(a));
    const accounts = rows.filter((row) => row.kind === 'user');
    const android = rows.filter((row) => row.roles.includes('supervisor')).length;
    return {
      rows,
      summary: {
        total: rows.length,
        android,
        web: rows.length - android,
        active: accounts.filter((row) => row.status === 'active').length,
        active7d: accounts.filter((row) => row.status === 'active' && row.lastActiveAt && now.getTime() - Date.parse(row.lastActiveAt) < 7 * DAY).length,
        invited: rows.length - accounts.length,
        expiringSoon: rows.filter((row) => row.invitation?.expiringSoon).length,
        locked: accounts.filter((row) => row.status === 'locked').length,
        disabled: accounts.filter((row) => row.status === 'disabled').length,
        no2fa: accounts.filter((row) => row.status !== 'disabled' && row.security === 'no2fa').length,
      },
      seats,
      require2fa: org.require2fa,
      projects: projects.map(({ id, code, name, status }) => ({ id, code, name, status })),
    };
  }

  private userRow(
    user: User,
    meId: string,
    memberships: readonly Membership[],
    projects: ReadonlyMap<string, ProjectBasics>,
    hasAndroid: boolean,
    canManage: boolean,
    now: Date,
  ) {
    const mine = user.status === 'disabled' ? [] : memberships;
    const roles = sortRoles([...(user.isOrgAdmin ? (['org_admin'] as SystemRole[]) : []), ...mine.flatMap((entry) => entry.roles)]);
    const mobileUser = appOnly(roles);
    const locked = user.status === 'locked' || (user.lockedUntil != null && user.lockedUntil > now);
    return {
      rowId: user.id,
      kind: 'user' as const,
      userId: user.id,
      fullName: user.fullName,
      avatarTone: user.avatarTone,
      contact: canManage ? (mobileUser || !user.email ? prettyMobile(user.mobile) : user.email) : null,
      isOrgAdmin: user.isOrgAdmin,
      isMe: user.id === meId,
      roles,
      projects: mine.flatMap((entry) => {
        const project = projects.get(entry.projectId);
        return project ? [{ id: project.id, code: project.code, name: project.name, roles: sortRoles(entry.roles) }] : [];
      }),
      lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
      device: deviceOf(roles, hasAndroid),
      security: mobileUser ? ('otp' as const) : user.twoFactorEnabled ? ('2fa' as const) : ('no2fa' as const),
      status: user.status === 'disabled' ? ('disabled' as const) : locked ? ('locked' as const) : ('active' as const),
      statusNote: user.status === 'disabled' ? 'دسترسی به همهٔ پروژه‌ها برداشته شد' : locked ? 'قفل خودکار پس از ورودهای ناموفق' : null,
      invitation: null,
    };
  }

  private invitationRow(invitation: Invitation, users: readonly User[], projects: ReadonlyMap<string, ProjectBasics>, canManage: boolean, now: Date) {
    const user = users.find((entry) => entry.id === invitation.userId);
    const project = projects.get(invitation.projectId);
    const expires = invitation.expiresAt.getTime();
    const expired = invitation.status === 'expired' || expires <= now.getTime();
    const expiringSoon = !expired && expires - now.getTime() < DAY;
    const roles = sortRoles(invitation.roleCodes as ProjectRoleCode[]);
    return {
      rowId: `inv:${invitation.id}`,
      kind: 'invitation' as const,
      userId: invitation.userId,
      fullName: user?.fullName ?? invitation.target,
      avatarTone: 'a1',
      contact: canManage ? (invitation.channel === 'sms' ? prettyMobile(invitation.target) : invitation.target) : null,
      isOrgAdmin: false,
      isMe: false,
      roles,
      projects: project ? [{ id: project.id, code: project.code, name: project.name, roles }] : [],
      lastActiveAt: null,
      device: expired
        ? { icon: 'clock', text: 'منقضی شده', warn: true }
        : expiringSoon
          ? { icon: 'clock', text: 'فردا منقضی می‌شود', warn: true }
          : { icon: 'mail', text: 'هنوز وارد نشده', warn: false },
      security: 'none' as const,
      status: 'invited' as const,
      statusNote: null,
      invitation: {
        id: invitation.id,
        projectId: invitation.projectId,
        channel: invitation.channel,
        sentAt: invitation.sentAt.toISOString(),
        expiresAt: invitation.expiresAt.toISOString(),
        expired,
        expiringSoon,
      },
    };
  }

  private orgId(): string {
    const orgId = this.context.orgId;
    if (!orgId) throw new UnauthorizedError();
    return orgId;
  }
}

/** «وب»، «اندروید»، «اپ هنوز نصب نشده» — نسخه و صف آفلاین با ضربان اپ (F08، برش ۱۱). */
function deviceOf(roles: readonly SystemRole[], hasAndroid: boolean): { icon: string; text: string; warn: boolean } {
  const app = roles.includes('supervisor');
  if (!app) return { icon: 'monitor', text: 'وب', warn: false };
  if (!hasAndroid) return { icon: 'smartphone', text: 'اپ هنوز نصب نشده', warn: true };
  return { icon: 'smartphone', text: appOnly(roles) ? 'اندروید' : 'وب و اندروید', warn: false };
}

function rank(row: { readonly lastActiveAt: string | null; readonly invitation: { readonly sentAt: string } | null }): number {
  return row.lastActiveAt ? Date.parse(row.lastActiveAt) : Date.parse(row.invitation?.sentAt ?? '1970-01-01');
}

/** یک ردیف W26 (کاربر یا دعوت). */
export type OrgUserRow = Awaited<ReturnType<OrgUsers['list']>>['rows'][number];
