import { Injectable } from '@nestjs/common';
import { DEFAULT_ROLE_PERMISSIONS, type ProjectRoleCode, SYSTEM_ROLES } from '@projeyar/shared';
import { DomainError } from '../../../platform/http/errors.js';
import { AccessResolver } from '../../../platform/security/access.js';
import { IdentityService } from '../../identity/index.js';
import { ProjectBasicsCatalog } from '../../projects/index.js';
import { TeamService } from '../../team/index.js';
import { hasAmounts, type TemplateDef } from '../domain/catalog.js';
import type { RecipientKind } from '../domain/report.entities.js';

// گیرندگان گزارش (management-reports.md ۷.۳؛ D11): کاربر، نقش (اعضای همان پروژه؛ سطح سازمان همهٔ پروژه‌های باز) و ایمیل بیرونی.
// نسخهٔ با مبلغ فقط برای کاربر دارای `cbs.view_amounts` همان پروژه؛ بیرونی بی مبلغ مگر فرستنده `reports.send_amounts_external`
// داشته باشد؛ گیرندگان مختلط ← دو نسخه (AC-MR-03).

export interface RecipientRef {
  readonly kind: RecipientKind;
  readonly id: string;
}

export interface Version {
  readonly amounts: boolean;
  readonly users: string[];
  readonly emails: string[];
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_CODES = ['project_manager', 'planner', 'reviewer', 'supervisor', 'client_reviewer', 'finance'] as const;
const amountRole = (role: string) => (DEFAULT_ROLE_PERMISSIONS[role as ProjectRoleCode] ?? []).some((grant) => grant.code === 'cbs.view_amounts');
const initialsOf = (fullName: string) =>
  fullName
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('.');

@Injectable()
export class ReportRecipients {
  constructor(
    private readonly resolver: AccessResolver,
    private readonly identity: IdentityService,
    private readonly team: TeamService,
    private readonly catalog: ProjectBasicsCatalog,
  ) {}

  /** شکل و یکتایی ورودی؛ نشانی نادرست و نقش ناشناخته رد. */
  validate(recipients: readonly RecipientRef[]): RecipientRef[] {
    if (recipients.length === 0) throw new DomainError('REPORT_INVALID', 422, { reason: 'دست‌کم یک گیرنده را انتخاب کنید.' });
    const seen = new Set<string>();
    return recipients.flatMap((entry) => {
      const id = entry.kind === 'email' ? entry.id.trim().toLowerCase() : entry.id;
      if (entry.kind === 'email' && !EMAIL.test(id)) {
        throw new DomainError('REPORT_INVALID', 422, { reason: `نشانی «${entry.id}» معتبر نیست. نشانی را با قالب name@example.com بنویسید.` });
      }
      if (entry.kind === 'role' && !(ROLE_CODES as readonly string[]).includes(id))
        throw new DomainError('REPORT_INVALID', 422, { reason: 'این نقش شناخته نشد.' });
      const key = `${entry.kind}:${id}`;
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ kind: entry.kind, id }];
    });
  }

  private async projects(projectId: string | null): Promise<string[]> {
    return projectId ? [projectId] : (await this.catalog.list()).filter((project) => project.status !== 'archived').map((project) => project.id);
  }

  /** کاربران مقصد (کاربر و نقش باز می‌شود) و ایمیل‌های بیرونی. */
  async expand(projectId: string | null, recipients: readonly RecipientRef[]): Promise<{ users: string[]; emails: string[] }> {
    const roles = recipients.filter((entry) => entry.kind === 'role').map((entry) => entry.id as ProjectRoleCode);
    const members = roles.length > 0 ? await this.team.membersWithRoles(await this.projects(projectId), roles) : [];
    const users = [...new Set([...recipients.filter((entry) => entry.kind === 'user').map((entry) => entry.id), ...members.map((row) => row.userId)])];
    return { users, emails: recipients.filter((entry) => entry.kind === 'email').map((entry) => entry.id) };
  }

  /** نسخه‌های لازم (۷.۳). */
  async versions(input: {
    readonly orgId: string;
    readonly projectId: string | null;
    readonly template: TemplateDef;
    readonly senderUserId: string;
    readonly recipients: readonly RecipientRef[];
  }): Promise<Version[]> {
    const { users, emails } = await this.expand(input.projectId, input.recipients);
    if (!hasAmounts(input.template.sections, input.template.audience)) return users.length + emails.length > 0 ? [{ amounts: false, users, emails }] : [];
    const canSee = async (userId: string, code: 'cbs.view_amounts' | 'reports.send_amounts_external') => {
      const access = await this.resolver.resolve({ userId, orgId: input.orgId, sessionId: 'report', client: 'web' });
      return access.isOrgAdmin || (input.projectId !== null && (access.projects.get(input.projectId)?.has(code) ?? false));
    };
    const withAmounts: string[] = [];
    const without: string[] = [];
    for (const userId of users) ((await canSee(userId, 'cbs.view_amounts')) ? withAmounts : without).push(userId);
    const externalAmounts = emails.length > 0 && (await canSee(input.senderUserId, 'reports.send_amounts_external'));
    const versions: Version[] = [
      { amounts: true, users: withAmounts, emails: externalAmounts ? emails : [] },
      { amounts: false, users: without, emails: externalAmounts ? [] : emails },
    ];
    return versions.filter((version) => version.users.length + version.emails.length > 0);
  }

  /** ReportRecipientDto فرانت (W25). */
  async views(projectId: string | null, recipients: readonly RecipientRef[]) {
    const userIds = recipients.filter((entry) => entry.kind === 'user').map((entry) => entry.id);
    const amountRoles = (Object.keys(DEFAULT_ROLE_PERMISSIONS) as ProjectRoleCode[]).filter(amountRole);
    const [people, viewers] = await Promise.all([this.identity.personRefs(userIds), this.team.membersWithRoles(await this.projects(projectId), amountRoles)]);
    const amountUsers = new Set(viewers.map((row) => row.userId));
    return recipients.map((entry) => {
      if (entry.kind === 'user') {
        const person = people.get(entry.id);
        return {
          kind: entry.kind,
          id: entry.id,
          label: person?.fullName ?? 'کاربر حذف‌شده',
          initials: person ? initialsOf(person.fullName) : null,
          avatarTone: person?.avatarTone ?? 'a1',
          external: false,
          canViewAmounts: amountUsers.has(entry.id),
        };
      }
      if (entry.kind === 'role') {
        return {
          kind: entry.kind,
          id: entry.id,
          label: `نقش ${SYSTEM_ROLES[entry.id as ProjectRoleCode] ?? entry.id}`,
          initials: null,
          avatarTone: null,
          external: false,
          canViewAmounts: amountRole(entry.id),
        };
      }
      return { kind: entry.kind, id: entry.id, label: entry.id, initials: null, avatarTone: null, external: true, canViewAmounts: false };
    });
  }
}
