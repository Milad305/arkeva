import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { SYSTEM_ROLES } from '@projeyar/shared';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { DomainError, UnauthorizedError, ValidationFailedError } from '../../../platform/http/errors.js';
import { Invitation } from '../domain/invitation.entity.js';
import { normalizeMobile } from '../domain/rules/identifier.js';
import { User } from '../domain/user.entity.js';
import { Invitations } from './invitations.js';
import { OrgUsers } from './org-users.js';
import { type Membership, MembershipPort, ProjectCatalog, type ProjectBasics } from './ports.js';
import { ASSIGNABLE, type AssignableRole, reasonOf } from './user-admin.js';

// ورود کاربران از فایل (W26؛ F01 ۵.۶): اعتبارسنجی و پیش‌نمایش؛ با commit دعوت یا افزودن عضو. idempotent با
// موبایل — ردیف تکراری «بی‌تغییر» است. فایل را فرانت می‌خواند (parseCsv)؛ اینجا فقط ردیف‌ها.

const IMPORT_MAX_ROWS = 500;

/** «سرپرست کارگاه» یا supervisor ← supervisor. */
const ROLE_BY_TEXT = new Map<string, AssignableRole>(ASSIGNABLE.flatMap((role) => [[role, role] as const, [SYSTEM_ROLES[role], role] as const]));

export interface ImportRow {
  readonly line: number;
  readonly fullName: string;
  readonly mobile: string;
  readonly email: string;
  readonly projectCode: string;
  readonly role: string;
}

type ImportOutcome = 'invite' | 'add' | 'unchanged' | 'error';

interface PreviewRow extends ImportRow {
  outcome: ImportOutcome;
  message: string;
  /** برای commit؛ در پاسخ نمی‌آید. */
  target?: { readonly project: ProjectBasics; readonly role: AssignableRole; readonly user: User | null; readonly member: Membership | null };
}

interface Snapshot {
  readonly projects: readonly ProjectBasics[];
  readonly users: readonly User[];
  readonly invitations: readonly Invitation[];
  readonly memberships: readonly Membership[];
}

@Injectable()
export class UserImport {
  constructor(
    private readonly em: EntityManager,
    private readonly context: AppContext,
    private readonly clock: Clock,
    private readonly orgUsers: OrgUsers,
    private readonly invitations: Invitations,
    private readonly memberships: MembershipPort,
    private readonly projects: ProjectCatalog,
  ) {}

  /** `POST /users/import?commit=` — users.invite؛ بی commit هیچ تغییری نمی‌دهد. */
  async run(rows: readonly ImportRow[], commit: boolean) {
    if (rows.length === 0) throw new ValidationFailedError([{ field: 'rows', message: 'فایل ردیفی ندارد؛ از الگو استفاده کنید.' }]);
    if (rows.length > IMPORT_MAX_ROWS) throw new ValidationFailedError([{ field: 'rows', message: 'هر فایل حداکثر ۵۰۰ ردیف؛ فایل را چند بخش کنید.' }]);
    const now = this.clock.now();
    const [projects, users, invitations, memberships, seats] = await Promise.all([
      this.projects.list(),
      this.em.find(User, {}),
      this.em.find(Invitation, { status: 'pending', expiresAt: { $gt: now } }),
      this.memberships.memberships(),
      this.orgUsers.seats(),
    ]);
    const snapshot: Snapshot = { projects, users, invitations, memberships };
    const seen = new Set<string>();
    const newMobiles = new Set<string>();
    let used = seats.used;

    const preview = rows.map((row): PreviewRow => {
      const checked = this.check(row, snapshot, seen);
      if (checked.outcome !== 'invite') return checked;
      // دعوت تازه سهم می‌گیرد؛ کسی که دعوت معتبر دیگری دارد از پیش سهم دارد (AC-AC-09)
      const holdsSeat = checked.target?.user ? invitations.some((invitation) => invitation.userId === checked.target?.user?.id) : false;
      if (holdsSeat || newMobiles.has(checked.mobile)) return checked;
      if (used >= seats.limit) return { ...row, mobile: checked.mobile, outcome: 'error', message: 'ظرفیت پر است' };
      used += 1;
      newMobiles.add(checked.mobile);
      return checked;
    });

    if (commit) {
      for (const row of preview) await this.commitRow(row);
    }
    const count = (outcome: ImportOutcome) => preview.filter((row) => row.outcome === outcome).length;
    return {
      rows: preview.map(({ target: _target, ...row }) => row),
      counts: { invite: count('invite'), add: count('add'), unchanged: count('unchanged'), error: count('error') },
      seats: { used: commit ? (await this.orgUsers.seats()).used : used, limit: seats.limit },
      committed: commit,
    };
  }

  private check(row: ImportRow, data: Snapshot, seen: Set<string>): PreviewRow {
    const mobile = normalizeMobile(row.mobile) ?? row.mobile.trim();
    const fail = (message: string): PreviewRow => ({ ...row, mobile, outcome: 'error', message });
    if (!row.fullName.trim()) return fail('نام خالی است');
    if (!/^09\d{9}$/.test(mobile)) return fail('موبایل باید مثل 09121234567 باشد');
    if (row.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row.email.trim())) return fail('ایمیل درست نیست');
    const wanted = row.projectCode.trim().toUpperCase();
    const project = data.projects.find((entry) => entry.code.toUpperCase() === wanted);
    if (!project) return fail(`پروژه‌ای با کد ${row.projectCode || '—'} نیست`);
    if (project.status === 'archived' || project.status === 'completed') return fail('پروژه بسته یا بایگانی است');
    if (!this.canInviteTo(project.id)) return fail('در این پروژه اجازهٔ دعوت ندارید');
    const role = ROLE_BY_TEXT.get(row.role.trim());
    if (!role) return fail('نقش شناخته نشد (مثلاً «سرپرست کارگاه» یا supervisor)');
    const key = `${mobile}|${project.id}`;
    if (seen.has(key)) return fail('ردیف تکراری در همین فایل');
    seen.add(key);

    const person = data.users.find((user) => user.mobile === mobile) ?? null;
    if (person && person.status !== 'invited') {
      if (person.status === 'disabled') return fail(`${person.fullName} غیرفعال است`);
      const member = data.memberships.find((entry) => entry.projectId === project.id && entry.userId === person.id) ?? null;
      if (member?.roles.includes(role)) return { ...row, mobile, outcome: 'unchanged', message: `${person.fullName} همین نقش را دارد` };
      const message = member ? `نقش به ${person.fullName} افزوده می‌شود` : `${person.fullName} عضو پروژه می‌شود (بی‌مجوز تازه)`;
      return { ...row, mobile, outcome: 'add', message, target: { project, role, user: person, member } };
    }
    const pending = person ? data.invitations.filter((invitation) => invitation.userId === person.id) : [];
    if (pending.some((invitation) => invitation.projectId === project.id))
      return { ...row, mobile, outcome: 'unchanged', message: 'دعوت در انتظار از پیش هست' };
    return { ...row, mobile, outcome: 'invite', message: 'دعوت پیامکی ۷روزه', target: { project, role, user: person, member: null } };
  }

  private async commitRow(row: PreviewRow): Promise<void> {
    const target = row.target;
    if (!target || (row.outcome !== 'invite' && row.outcome !== 'add')) return;
    try {
      if (row.outcome === 'invite') {
        await this.invitations.invite({
          fullName: row.fullName,
          mobile: row.mobile,
          email: row.email.trim() || null,
          projectId: target.project.id,
          roles: [target.role],
        });
        return;
      }
      const user = target.user;
      if (!user) return;
      const orgId = this.orgId();
      await this.em.transactional((tx) =>
        target.member
          ? this.memberships.setRoles(tx, { projectId: target.project.id, userId: user.id, roles: [...new Set([...target.member.roles, target.role])] })
          : this.memberships.addMember(tx, { orgId, projectId: target.project.id, userId: user.id, roles: [target.role] }),
      );
    } catch (error) {
      row.outcome = 'error';
      row.message = error instanceof DomainError ? reasonOf(error) : 'ثبت نشد';
    }
  }

  private canInviteTo(projectId: string): boolean {
    try {
      this.invitations.assertProjectScope(projectId);
      return true;
    } catch {
      return false;
    }
  }

  private orgId(): string {
    const orgId = this.context.orgId;
    if (!orgId) throw new UnauthorizedError();
    return orgId;
  }
}
