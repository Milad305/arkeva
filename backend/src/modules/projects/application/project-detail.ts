import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { AppContext } from '../../../platform/context/app-context.js';
import { NotFoundError, UnauthorizedError } from '../../../platform/http/errors.js';
import { ProgressReads } from '../../computation/reads.js';
import { IdentityService } from '../../identity/index.js';
import { TeamService } from '../../team/index.js';
import { ProjectSettings } from '../domain/project-settings.entity.js';
import { Project, ProjectType } from '../domain/project.entity.js';
import { ProjectPendingCounts, ProjectPlanState, type ProjectPlanStateView } from './plan-ports.js';
import { ProjectRiskCounts } from './settings-ports.js';
import { listItemOf, type ProjectListItemView } from './project-queries.js';

// `GET /v1/projects/:pid` — مدل خواندنی پوستهٔ پروژه (ProjectDetailDto فرانت؛ F02 ۱۲).
// نسخه‌ها از planning (ProjectPlanState). بخش‌هایی که ماژولشان هنوز ساخته نشده از وضعیت واقعی سرور می‌آیند: شمارنده‌های
// گزارش و ریسک صفر (F09، F14)، تنظیمات نمایش پیش‌فرض `02` ۳ تا جدول ProjectSettings (برش تنظیمات).

export interface ProjectDetailView extends ProjectListItemView {
  readonly description: string | null;
  readonly managerUserId: string;
  readonly plannedStart: string | null;
  readonly contingencyReserve?: string;
  readonly displayCurrencyUnit: 'rial' | 'toman';
  readonly baselineVersionId: string | null;
  readonly currentVersionId: string | null;
  readonly pvReferenceVersionId: string | null;
  readonly activatedAt: string | null;
  readonly pausedAt: string | null;
  readonly completedAt: string | null;
  readonly archivedAt: string | null;
  readonly costsCompleteThrough: string | null;
  readonly plan: ProjectPlanStateView;
  readonly counts: {
    readonly pendingReports: number;
    readonly openRisks: number;
    readonly openHighRisks: number;
    readonly members: number;
    readonly mspPendingChanges: number | null;
  };
  readonly display: { readonly warningThreshold: number; readonly criticalThreshold: number; readonly showFinancialProgress: boolean };
}

const iso = (value: Date | null | undefined): string | null => value?.toISOString() ?? null;

@Injectable()
export class ProjectDetailQuery {
  constructor(
    private readonly em: EntityManager,
    private readonly context: AppContext,
    private readonly team: TeamService,
    private readonly identity: IdentityService,
    private readonly plans: ProjectPlanState,
    private readonly progress: ProgressReads,
    private readonly pending: ProjectPendingCounts,
    private readonly risks: ProjectRiskCounts,
  ) {}

  async get(projectId: string): Promise<ProjectDetailView> {
    const access = this.context.access;
    if (!access) throw new UnauthorizedError();
    const project = await this.em.findOne(Project, { id: projectId, deletionRequestedAt: null });
    if (!project) throw new NotFoundError('PROJECT_NOT_FOUND');

    const [type, summaries, managers, plan, progress, pendingReports, settings, riskCounts] = await Promise.all([
      this.em.findOne(ProjectType, { key: project.projectType }),
      this.team.memberSummaries([project]),
      this.identity.personRefs([project.managerUserId]),
      this.plans.state(project.id),
      this.progress.project(project.id),
      this.pending.pendingItems(project.id),
      this.em.findOne(ProjectSettings, { projectId: project.id }),
      this.risks.counts([project.id]),
    ]);
    const summary = summaries.get(project.id);
    // حذف مبلغ بی cbs.view_amounts (D11؛ access-control ۵.۵) — تا ساخت AmountSerializer همین‌جا
    const canViewAmounts = access.isOrgAdmin || (access.projects.get(project.id)?.has('cbs.view_amounts') ?? false);

    return {
      ...listItemOf(project, { typeName: type?.name, summary, manager: managers.get(project.managerUserId), progress: progress ?? undefined, canViewAmounts }),
      description: project.description ?? null,
      managerUserId: project.managerUserId,
      plannedStart: project.plannedStart ?? null,
      ...(canViewAmounts ? { contingencyReserve: project.contingencyReserve } : {}),
      displayCurrencyUnit: project.displayCurrencyUnit,
      baselineVersionId: project.baselineVersionId ?? null,
      currentVersionId: project.currentVersionId ?? null,
      pvReferenceVersionId: project.pvReferenceVersionId ?? null,
      activatedAt: iso(project.activatedAt),
      pausedAt: iso(project.pausedAt),
      completedAt: iso(project.completedAt),
      archivedAt: iso(project.archivedAt),
      costsCompleteThrough: project.costsCompleteThrough ?? null,
      plan,
      counts: {
        pendingReports,
        openRisks: riskCounts.get(project.id)?.open ?? 0,
        openHighRisks: riskCounts.get(project.id)?.high ?? 0,
        members: summary?.count ?? 0,
        mspPendingChanges: project.mspLinked ? 0 : null,
      },
      display: {
        warningThreshold: settings?.warningThreshold ?? 5,
        criticalThreshold: settings?.criticalThreshold ?? 15,
        showFinancialProgress: settings?.showFinancialProgress ?? false,
      },
    };
  }
}
