import { Injectable } from '@nestjs/common';
import { EntityManager, type FilterQuery } from '@mikro-orm/postgresql';
import type { ProjectStatus } from '@projeyar/shared';
import { AppContext } from '../../../platform/context/app-context.js';
import { UnauthorizedError } from '../../../platform/http/errors.js';
import { ProgressReads, type ProjectProgressView, withoutAmounts } from '../../computation/reads.js';
import { projectsWith } from '../../../platform/security/access.js';
import { IdentityService, type PersonRef } from '../../identity/index.js';
import { type MemberSummary, TeamService } from '../../team/index.js';
import { Project, ProjectType } from '../domain/project.entity.js';
import { WizardDrafts } from './wizard-drafts.js';

export interface ProjectListFilter {
  readonly status?: ProjectStatus;
  readonly q?: string;
}

/** ردیف W07 — همان `ProjectListItemDto` فرانت. */
export interface ProjectListItemView {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly clientName: string;
  readonly projectTypeId: string;
  readonly projectTypeName: string;
  readonly status: ProjectStatus;
  readonly manager: PersonRef;
  readonly memberPreview: PersonRef[];
  readonly memberCount: number;
  readonly plannedFinish: string | null;
  readonly mspLinked: boolean;
  /** ProjectProgress (F10)؛ پروژهٔ بی محاسبه (پیش‌نویس) تهی. مبالغ بی `cbs.view_amounts` حذف (D11). */
  readonly progress: ProjectProgressView | ReturnType<typeof withoutAmounts> | null;
  /** AC ÷ BAC × ۱۰۰؛ بی `cbs.view_amounts` نمی‌آید. */
  readonly budgetConsumedPercent?: number;
  /** ب24: انحراف ≤ −۱۵ یا CPI < ۰٫۹، فقط پروژهٔ فعال — وضعیت نیست. */
  readonly atRisk: boolean;
  readonly wizardIncomplete: boolean;
}

const UNKNOWN_PERSON: PersonRef = { id: '', fullName: '—', avatarTone: 'a1' };

/**
 * فهرست پروژه‌های سازمان (F02 ۱۲؛ W07). مدیر سازمان همه را می‌بیند؛ بقیه فقط پروژه‌هایی که در آن
 * `project.view` دارند — شرط در خود پرس‌وجو، نه فیلتر پس از خواندن (07 ۵).
 * فهرست کوچک و محدود است و آرایه برمی‌گردد، نه cursor (F20 ۱۱: «فهرست‌های بزرگ cursor»).
 */
@Injectable()
export class ProjectQueries {
  constructor(
    private readonly em: EntityManager,
    private readonly context: AppContext,
    private readonly team: TeamService,
    private readonly identity: IdentityService,
    private readonly drafts: WizardDrafts,
    private readonly progress: ProgressReads,
  ) {}

  async list(filter: ProjectListFilter): Promise<ProjectListItemView[]> {
    const access = this.context.access;
    if (!access) throw new UnauthorizedError();

    // پروژهٔ در انتظار حذف از همهٔ فهرست‌ها پنهان است (F02 ۸.۴)
    const where: FilterQuery<Project> = { deletionRequestedAt: null };
    if (!access.isOrgAdmin) where.id = { $in: projectsWith(access, 'project.view') };
    if (filter.status) where.status = filter.status;
    const q = filter.q?.trim();
    if (q) where.$or = [{ name: { $ilike: `%${escapeLike(q)}%` } }, { code: { $ilike: `%${escapeLike(q)}%` } }];

    const [projects, types] = await Promise.all([this.em.find(Project, where, { orderBy: { status: 'asc', code: 'desc' } }), this.em.find(ProjectType, {})]);
    const typeNames = new Map(types.map((type) => [type.key, type.name]));
    const [summaries, managers, progress] = await Promise.all([
      this.team.memberSummaries(projects),
      this.identity.personRefs(projects.map((project) => project.managerUserId)),
      this.progress.projects(projects.map((project) => project.id)),
    ]);

    const rows = projects.map((project) =>
      listItemOf(project, {
        typeName: typeNames.get(project.projectType),
        summary: summaries.get(project.id),
        manager: managers.get(project.managerUserId),
        progress: progress.get(project.id),
        canViewAmounts: access.isOrgAdmin || (access.projects.get(project.id)?.has('cbs.view_amounts') ?? false),
      }),
    );
    // پیش‌نویس‌های ناتمام ویزارد فقط برای سازنده، با برچسب «ناتمام» (F02 ۵.۵)
    const drafts = !filter.status || filter.status === 'draft' ? await this.drafts.listRows({ q }) : [];
    return [...drafts, ...rows];
  }
}

/** ردیف W07 از پروژه و داده‌های کمکی؛ مشترک فهرست و جزئیات. */
export function listItemOf(
  project: Project,
  extra: {
    readonly typeName?: string;
    readonly summary?: MemberSummary;
    readonly manager?: PersonRef;
    readonly progress?: ProjectProgressView;
    readonly canViewAmounts: boolean;
  },
): ProjectListItemView {
  const progress = extra.progress ?? null;
  const bac = progress ? Number(progress.bac) : 0;
  return {
    id: project.id,
    code: project.code,
    name: project.name,
    clientName: project.clientName,
    projectTypeId: project.projectType,
    projectTypeName: extra.typeName ?? project.projectType,
    status: project.status,
    manager: extra.manager ?? { ...UNKNOWN_PERSON, id: project.managerUserId },
    memberPreview: extra.summary?.preview ?? [],
    memberCount: extra.summary?.count ?? 0,
    plannedFinish: project.plannedFinish ?? null,
    mspLinked: project.mspLinked,
    progress: progress && !extra.canViewAmounts ? withoutAmounts(progress) : progress,
    ...(progress && extra.canViewAmounts && bac > 0 ? { budgetConsumedPercent: Math.round((Number(progress.ac) / bac) * 1_000_000) / 10_000 } : {}),
    atRisk: project.status === 'active' && !!progress && (progress.deviation <= -15 || (progress.cpi !== null && progress.cpi < 0.9)),
    wizardIncomplete: false,
  };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
