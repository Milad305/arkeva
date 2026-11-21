import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Clock } from '../../../platform/clock/clock.js';
import { NotFoundError } from '../../../platform/http/errors.js';
import { toFaDigits } from '../../../platform/http/fa.js';
import { tehranClock } from '../../../platform/scheduler/ticks.js';
import { fromJalali, toJalali } from '../../../platform/time/jalali.js';
import { ProgressReads } from '../../computation/reads.js';
import { IdentityService, type PersonRef, ProjectCatalog } from '../../identity/index.js';
import { PlanningService } from '../../planning/index.js';
import { ProjectPlanAccess, ProjectRules } from '../../projects/index.js';
import { isActiveAction, isOpen, isOverdue, scheduleImpact, scoreOf, STRATEGY_LABEL } from '../domain/risk-rules.js';
import { ContingencyAllocation, Risk, RiskAction, RiskFollower, RiskLink, RiskNote, RiskScoreHistory } from '../domain/risk.entities.js';
import { RiskAccess } from './risk-access.js';
import { RiskStore } from './risk-store.js';

// خواندن دفتر ریسک (W18، W19؛ risk.md ۵.۶، ۶، ۸). امتیاز، سطح، معوق، اثر بالقوه و باقی‌ماندهٔ ذخیره را سرور می‌سازد (D07).
// مبلغ بی `cbs.view_amounts` تهی است (AC-RK-10)؛ سرپرست فقط مشکل‌های خودش را با وضعیت و دسته می‌بیند (AC-RK-11).

interface ProjectBundle {
  readonly id: string;
  readonly name: string;
  readonly mspLinked: boolean;
  readonly managerUserId: string;
  readonly wbs: ReadonlyMap<string, { readonly code: string; readonly title: string; readonly isCritical: boolean }>;
  readonly cbs: ReadonlyMap<string, { readonly code: string; readonly title: string }>;
}

interface Loaded {
  readonly actions: Map<string, RiskAction[]>;
  readonly links: Map<string, RiskLink[]>;
  readonly people: Map<string, PersonRef>;
}

const UNKNOWN: PersonRef = { id: '', fullName: '—', avatarTone: 'a1' };

@Injectable()
export class RiskViews {
  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly access: RiskAccess,
    private readonly store: RiskStore,
    private readonly rules: ProjectRules,
    private readonly planAccess: ProjectPlanAccess,
    private readonly planning: PlanningService,
    private readonly progress: ProgressReads,
    private readonly identity: IdentityService,
    private readonly catalog: ProjectCatalog,
  ) {}

  private today(): string {
    return tehranClock(this.clock.now()).date;
  }

  private async bundle(projectId: string): Promise<ProjectBundle> {
    const [rules, content] = await Promise.all([this.rules.of(projectId), this.planning.currentContent(projectId)]);
    return {
      id: projectId,
      name: rules.name,
      mspLinked: rules.mspLinked,
      managerUserId: rules.managerUserId,
      wbs: new Map(content.wbs.map((node) => [node.id, { code: node.code, title: node.title, isCritical: node.isCritical === true }])),
      cbs: new Map(content.cbs.map((node) => [node.id, { code: node.code, title: node.title }])),
    };
  }

  private async load(risks: readonly Risk[]): Promise<Loaded> {
    const ids = risks.map((risk) => risk.id);
    const [actions, links] = ids.length
      ? await Promise.all([
          this.em.find(RiskAction, { riskId: { $in: ids } }, { orderBy: { createdAt: 'asc' } }),
          this.em.find(RiskLink, { riskId: { $in: ids } }),
        ])
      : [[], []];
    const group = <T extends { riskId: string }>(rows: readonly T[]) => {
      const map = new Map<string, T[]>();
      for (const row of rows) map.set(row.riskId, [...(map.get(row.riskId) ?? []), row]);
      return map;
    };
    const people = await this.identity.personRefs([
      ...risks.flatMap((risk) => [risk.ownerUserId, risk.createdByUserId]),
      ...actions.map((action) => action.ownerUserId),
    ]);
    return { actions: group(actions), links: group(links), people };
  }

  private listItem(risk: Risk, project: ProjectBundle, loaded: Loaded, full: boolean, amounts: boolean) {
    const today = this.today();
    const actions = loaded.actions.get(risk.id) ?? [];
    const links = loaded.links.get(risk.id) ?? [];
    const open = actions.filter((action) => isActiveAction(action.status));
    const next = [...open].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
    const first = links.find((link) => link.targetType !== 'field_report') ?? links[0];
    const reporter = risk.sourceReportedByUserId ? (loaded.people.get(risk.sourceReportedByUserId)?.fullName ?? '') : '';
    let linkSummary: { kind: 'wbs_item' | 'cbs_item' | 'field_report' | 'none'; text: string } = {
      kind: 'none',
      text: risk.source === 'field' ? `از کارگاه · ${reporter}` : '—',
    };
    if (first?.targetType === 'wbs_item') {
      const item = project.wbs.get(first.targetId);
      linkSummary = { kind: 'wbs_item', text: item ? `WBS ${item.code} · ${item.title}` : 'WBS · حذف‌شده' };
    } else if (first?.targetType === 'cbs_item') {
      const item = project.cbs.get(first.targetId);
      linkSummary = { kind: 'cbs_item', text: item ? `CBS ${item.code} · ${item.title}` : 'CBS · حذف‌شده' };
    } else if (first) linkSummary = { kind: 'field_report', text: `از کارگاه · ${reporter}` };
    const summary = risk.responseStrategy
      ? `${STRATEGY_LABEL[risk.responseStrategy]}${next ? `: ${next.title}` : risk.status === 'occurred' ? ': تبدیل به مسئله' : ''}`
      : null;
    return {
      id: risk.id,
      projectId: risk.projectId,
      projectName: project.name,
      code: risk.code,
      title: risk.title,
      category: risk.category,
      probability: full ? (risk.probability ?? null) : null,
      impact: full ? (risk.impact ?? null) : null,
      score: full ? (risk.score ?? null) : null,
      level: full ? (risk.level ?? null) : null,
      status: risk.status,
      responseStrategy: full ? (risk.responseStrategy ?? null) : null,
      responseSummary: full ? summary : null,
      owner: loaded.people.get(risk.ownerUserId) ?? UNKNOWN,
      nextDueDate: full ? (next?.dueDate ?? null) : null,
      hasOverdueAction: full && open.some((action) => isOverdue(action, today)),
      source: risk.source,
      linkSummary,
      wbsItemIds: links.filter((link) => link.targetType === 'wbs_item').map((link) => link.targetId),
      costImpact: full && amounts ? (risk.costImpact ?? null) : null,
      scheduleImpactDays: full ? (risk.scheduleImpactDays ?? null) : null,
    };
  }

  /** `GET /projects/:pid/risks` و `GET /risks` (نمای سراسری؛ تصمیم 1405/08/15). */
  async register(projectId: string | null) {
    const { actor } = this.access.actor();
    let projectIds: string[];
    if (projectId) {
      this.access.require(projectId, 'risk.view');
      projectIds = [projectId];
    } else {
      const viewable = this.access.viewableProjects();
      projectIds = viewable === 'all' ? (await this.catalog.list()).map((project) => project.id) : viewable;
    }
    const bundles = await Promise.all(projectIds.map((id) => this.bundle(id)));
    const byProject = new Map(bundles.map((bundle) => [bundle.id, bundle]));
    const rows = projectIds.length ? await this.em.find(Risk, { projectId: { $in: projectIds } }, { orderBy: { createdAt: 'desc' } }) : [];
    const visible = rows.filter((risk) => this.access.fullView(risk.projectId) || risk.sourceReportedByUserId === actor.userId);
    const loaded = await this.load(visible);
    const today = this.today();
    const items = visible.map((risk) =>
      this.listItem(risk, byProject.get(risk.projectId) as ProjectBundle, loaded, this.access.fullView(risk.projectId), this.access.amounts(risk.projectId)),
    );
    const openRisks = visible.filter((risk) => isOpen(risk.status) && this.access.fullView(risk.projectId));
    const matrix: Record<string, number> = {};
    for (const risk of openRisks) {
      if (risk.probability === null || risk.probability === undefined || risk.impact === null || risk.impact === undefined) continue;
      const key = `${risk.probability}-${risk.impact}`;
      matrix[key] = (matrix[key] ?? 0) + 1;
    }
    const overdue = openRisks.flatMap((risk) => (loaded.actions.get(risk.id) ?? []).filter((action) => isOverdue(action, today)));
    const amounts = projectIds.length > 0 && projectIds.every((id) => this.access.amounts(id));
    const single = projectIds.length === 1 ? byProject.get(projectIds[0] as string) : undefined;
    const schedule = scheduleImpact(
      openRisks.map((risk) => ({
        days: risk.scheduleImpactDays ?? null,
        critical: (loaded.links.get(risk.id) ?? []).some(
          (link) => link.targetType === 'wbs_item' && byProject.get(risk.projectId)?.wbs.get(link.targetId)?.isCritical,
        ),
      })),
      single?.mspLinked ?? false,
    );
    const { year, month } = toJalali(today);
    const monthStart = fromJalali(year, month, 1) ?? today;
    const categories = new Map<string, number>();
    for (const risk of openRisks) categories.set(risk.category, (categories.get(risk.category) ?? 0) + 1);
    return {
      items,
      summary: {
        open: openRisks.length,
        openFromFieldThisMonth: openRisks.filter((risk) => risk.source === 'field' && tehranClock(risk.createdAt).date >= monthStart).length,
        highOrCritical: openRisks.filter((risk) => (risk.score ?? 0) >= 15).length,
        overdueActions: overdue.length,
        costImpact: amounts ? openRisks.reduce((sum, risk) => sum + BigInt(risk.costImpact ?? '0'), 0n).toString() : null,
        scheduleImpactDays: schedule.days,
        scheduleImpactBasis: schedule.basis,
        unassessedOpen: openRisks.filter((risk) => risk.score === null || risk.score === undefined).length,
      },
      matrix,
      byCategory: [...categories].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
      overdueActionTitles: overdue.map((action) => action.title),
      categories: await this.store.categories(actor.orgId),
      nextCode: projectId ? await this.store.peekCode(projectId) : null,
    };
  }

  /** `GET /risks/:id` (W19). */
  async detail(riskId: string) {
    const { actor } = this.access.actor();
    const risk = await this.store.find(riskId);
    this.access.require(risk.projectId, 'risk.view');
    const full = this.access.fullView(risk.projectId);
    if (!full && risk.sourceReportedByUserId !== actor.userId) throw new NotFoundError('RISK_NOT_FOUND');
    const amounts = full && this.access.amounts(risk.projectId);
    const [project, loaded, history, notes, followers, allocations, projectAllocations, context] = await Promise.all([
      this.bundle(risk.projectId),
      this.load([risk]),
      this.em.find(RiskScoreHistory, { riskId }, { orderBy: { createdAt: 'asc' } }),
      this.em.find(RiskNote, { riskId }, { orderBy: { createdAt: 'desc' } }),
      this.em.find(RiskFollower, { riskId }),
      this.em.find(ContingencyAllocation, { riskId }),
      this.em.find(ContingencyAllocation, { projectId: risk.projectId }, { fields: ['amount'] }),
      this.planAccess.context(risk.projectId),
    ]);
    const base = this.listItem(risk, project, loaded, full, amounts);
    const today = this.today();
    const [items, cbsProgress] = await Promise.all([this.progress.items(risk.projectId), this.progress.cbsItems(risk.projectId)]);
    const people = await this.identity.personRefs(
      [...notes.map((note) => note.authorUserId), ...followers.map((row) => row.userId), risk.sourceReportedByUserId ?? null].filter(
        (userId): userId is string => !!userId,
      ),
    );
    const target = scoreOf(risk.targetProbability ?? null, risk.targetImpact ?? null);
    const allocated = allocations.reduce((sum, row) => sum + BigInt(row.amount), 0n);
    const allAllocated = projectAllocations.reduce((sum, row) => sum + BigInt(row.amount), 0n);
    const links = (loaded.links.get(risk.id) ?? []).map((link) => {
      if (link.targetType === 'wbs_item') {
        const item = project.wbs.get(link.targetId);
        const deviation = items.get(link.targetId)?.deviation ?? null;
        return {
          kind: link.targetType,
          targetId: link.targetId,
          code: item?.code ?? null,
          title: item?.title ?? 'فعالیت حذف‌شده',
          metric: !full || deviation === null ? null : `${deviation > 0 ? '+' : deviation < 0 ? '−' : ''}${toFaDigits(Math.abs(Math.round(deviation)))}٪`,
          metricTone: !full || deviation === null ? null : deviation <= -10 ? 'err' : deviation < 0 ? 'wrn' : 'neu',
          removed: !item,
        };
      }
      if (link.targetType === 'cbs_item') {
        const item = project.cbs.get(link.targetId);
        const consumed = cbsProgress.items.get(link.targetId)?.consumedPercent ?? null;
        return {
          kind: link.targetType,
          targetId: link.targetId,
          code: item?.code ?? null,
          title: item?.title ?? 'قلم حذف‌شده',
          metric: !amounts || consumed === null ? null : `${toFaDigits(Math.round(consumed))}٪ مصرف`,
          metricTone: !amounts || consumed === null ? null : consumed >= 90 ? 'err' : 'neu',
          removed: !item,
        };
      }
      return { kind: link.targetType, targetId: link.targetId, code: null, title: 'گزارش کارگاه', metric: null, metricTone: null, removed: false };
    });
    const name = (userId: string) => people.get(userId)?.fullName ?? loaded.people.get(userId)?.fullName ?? '—';
    return {
      ...base,
      cause: full ? (risk.cause ?? null) : null,
      event: risk.event ?? null,
      consequence: full ? (risk.consequence ?? null) : null,
      triggerText: full ? (risk.triggerText ?? null) : null,
      nextReviewDate: full ? (risk.nextReviewDate ?? null) : null,
      reviewFrequency: full ? (risk.reviewFrequency ?? null) : null,
      targetProbability: full ? (risk.targetProbability ?? null) : null,
      targetImpact: full ? (risk.targetImpact ?? null) : null,
      targetScore: full ? target.score : null,
      targetLevel: full ? target.level : null,
      scoreHistory: full ? history.map((row) => ({ at: row.createdAt.toISOString(), score: row.score })) : [],
      actions: full
        ? (loaded.actions.get(risk.id) ?? []).map((action) => ({
            id: action.id,
            title: action.title,
            owner: loaded.people.get(action.ownerUserId) ?? UNKNOWN,
            dueDate: action.dueDate,
            status: action.status,
            overdue: isOverdue(action, today),
            costNote: action.costNote ?? null,
            completedAt: action.completedAt?.toISOString() ?? null,
            completionNote: action.completionNote ?? null,
          }))
        : [],
      links: full ? links : [],
      history: full ? notes.map((note) => ({ kind: note.kind, text: note.text, by: name(note.authorUserId), at: note.createdAt.toISOString() })) : [],
      followers: full ? followers.map((row) => people.get(row.userId) ?? { ...UNKNOWN, id: row.userId }) : [],
      isFollowing: followers.some((row) => row.userId === actor.userId),
      contingency: amounts
        ? {
            allocated: allocated.toString(),
            // مصرف از راه بازنگری بودجه هنوز نیست (تصمیم 1405/08/25)
            consumed: '0',
            projectRemaining: (BigInt(context.contingencyReserve) - allAllocated).toString(),
            coveragePercent: risk.costImpact && BigInt(risk.costImpact) > 0n ? Math.round((Number(allocated) / Number(risk.costImpact)) * 100) : null,
          }
        : { allocated: null, consumed: null, projectRemaining: null, coveragePercent: null },
      createdBy: name(risk.createdByUserId),
      createdAt: risk.createdAt.toISOString(),
      closeReason: risk.closeReason ?? null,
      occurredAt: risk.occurredAt?.toISOString() ?? null,
      actualCost: amounts ? (risk.actualCost ?? null) : null,
      actualDelayDays: full ? (risk.actualDelayDays ?? null) : null,
      sourceReportedBy: risk.sourceReportedByUserId ? name(risk.sourceReportedByUserId) : null,
    };
  }

  /** وضعیت و دستهٔ ریسک مشکل‌های کارگاه برای اپ (M10؛ AC-RK-11) — بی امتیاز و مبلغ؛ فراخوان مالکیت گزارش‌دهنده را سنجیده. */
  async siteIssueStates(riskIds: readonly string[]): Promise<Map<string, { code: string; status: string; category: string }>> {
    if (riskIds.length === 0) return new Map();
    const rows = await this.em.find(Risk, { id: { $in: [...riskIds] } }, { fields: ['code', 'status', 'category'] });
    return new Map(rows.map((risk) => [risk.id, { code: risk.code, status: risk.status, category: risk.category }]));
  }

  /** `GET /projects/:pid/risks/people` — اعضا برای مالک، مسئول اقدام و @نام. */
  async people(projectId: string, memberIds: readonly string[]) {
    this.access.require(projectId, 'risk.view');
    const [rules, refs] = await Promise.all([this.rules.of(projectId), this.identity.personRefs(memberIds)]);
    return { members: [...refs.values()].sort((a, b) => a.fullName.localeCompare(b.fullName, 'fa')), managerId: rules.managerUserId };
  }
}
