import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { addDays, tehranClock } from '../../../platform/scheduler/ticks.js';
import { ReviewStats } from '../../approvals/index.js';
import { cbsLeafBudget, scheduleSpan, type WorkCalendar } from '../../computation/index.js';
import { PeriodReads, periodViews, ProgressReads } from '../../computation/reads.js';
import { DeviceHeartbeats, FieldRecords } from '../../field/index.js';
import { IdentityService } from '../../identity/index.js';
import { PlanningService } from '../../planning/index.js';
import { ProjectRules, type ProjectRulesView } from '../../projects/index.js';
import { ProgressExport } from '../../msp/index.js';
import { RiskReads } from '../../risks/index.js';
import { ApprovalRoutes, TeamService } from '../../team/index.js';
import type { ApproverFact, LeafFact, ProjectFacts, SupervisorFact } from '../domain/rule-types.js';

// واقعیت‌های یک پروژه برای قواعد هشدار (04-alert-engine ۲.۱: «فقط از جدول‌های مشتق و واقعیت‌ها»). همه از سرویس عمومی
// مالک‌ها (01 ۷): پیشرفت از computation، ساختار از planning، تیم و حوزه از team، گزارش از field، صف تأیید از approvals.

export interface LoadedFacts {
  readonly facts: ProjectFacts;
  readonly rules: ProjectRulesView;
  /** نقش‌ها برای تبدیل مخاطب به کاربر (۲.۵). */
  readonly roles: { readonly pm: readonly string[]; readonly planner: readonly string[]; readonly finance: readonly string[] };
}

const HOUR = 3_600_000;
const RECENT_ITEMS = 10;

/** روزهای کاری پس از `from` تا `to` (هر دو سر شامل؛ from > to ← ۰). */
function workDays(from: string, to: string, calendar: WorkCalendar): number {
  return from > to ? 0 : (scheduleSpan(from, to, calendar)?.workDays ?? 0);
}

@Injectable()
export class AlertFactsLoader {
  constructor(
    private readonly em: EntityManager,
    private readonly projectRules: ProjectRules,
    private readonly progress: ProgressReads,
    private readonly periods: PeriodReads,
    private readonly planning: PlanningService,
    private readonly team: TeamService,
    private readonly routes: ApprovalRoutes,
    private readonly records: FieldRecords,
    private readonly heartbeats: DeviceHeartbeats,
    private readonly reviews: ReviewStats,
    private readonly identity: IdentityService,
    private readonly risks: RiskReads,
    private readonly msp: ProgressExport,
  ) {}

  async load(projectId: string, now: Date): Promise<LoadedFacts> {
    const rules = await this.projectRules.of(projectId);
    const today = tehranClock(now).date;
    const [project, items, cbsProgress, content, members, reviewerByLeaf, periods, queue] = await Promise.all([
      this.progress.project(projectId),
      this.progress.items(projectId),
      this.progress.cbsItems(projectId),
      this.planning.currentContent(projectId),
      this.team.membersWithRoles([projectId], ['project_manager', 'planner', 'finance', 'supervisor']),
      this.routes.reviewerByLeaf(projectId),
      this.periods.list(projectId),
      this.reviews.forProject(projectId, now),
    ]);
    const byRole = (role: string) => members.filter((member) => member.role === role).map((member) => member.userId);
    const supervisorIds = byRole('supervisor');
    const linked = new Set(content.links.map((link) => link.wbsItemId));
    const bac = project ? Number(project.bac) : 0;
    const leaves: LeafFact[] = content.wbs
      .filter((node) => node.isLeaf)
      .map((node) => {
        const progress = items.get(node.id);
        return {
          id: node.id,
          code: node.code,
          title: node.title,
          isMilestone: node.isMilestone,
          method: node.measurementMethod,
          supervisorUserId: node.supervisorUserId,
          plannedStart: node.plannedStart,
          planned: progress?.plannedPercent ?? 0,
          actual: progress?.actualPercent ?? 0,
          hasPending: progress?.pendingPercent !== null && progress?.pendingPercent !== undefined,
          linked: linked.has(node.id),
          routed: !!reviewerByLeaf.get(node.id),
          weightShare: (progress?.weightInProject ?? 0) / 100,
          budgetShare: progress && bac > 0 ? Number(progress.bac) / bac : null,
          workDaysSinceStart: node.plannedStart ? (node.plannedStart <= today ? workDays(addDays(node.plannedStart, 1), today, rules.calendar) : -1) : null,
        };
      });

    const people = await this.identity.personRefs([
      ...supervisorIds,
      ...queue.map((entry) => entry.userId),
      rules.alternateReviewerUserId ?? rules.managerUserId,
    ]);
    const name = (userId: string) => people.get(userId)?.fullName ?? '—';
    const supervisors = await this.supervisors(projectId, supervisorIds, leaves, reviewerByLeaf, rules, today, now, name);
    const approvers: ApproverFact[] = queue.map((entry) => ({ ...entry, name: name(entry.userId) }));
    const needsResolution = (await this.records.items(this.em, { projectId, statuses: ['needs_resolution'] })).length;
    const activatedDate = rules.progress.activatedAt ? tehranClock(rules.progress.activatedAt).date : null;
    const evAtCost = project ? (project.cpi !== null ? BigInt(Math.round(project.cpi * Number(project.ac))) : BigInt(project.ev)) : 0n;

    const facts: ProjectFacts = {
      projectId,
      today,
      thresholds: { warning: rules.progress.warningThreshold, critical: rules.progress.criticalThreshold },
      reviewDeadlineHours: rules.reviewDeadlineHours,
      weightGenerator: rules.progress.weightGenerator,
      daysActive:
        rules.status === 'active' && activatedDate
          ? Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${activatedDate}T00:00:00Z`)) / 86_400_000)
          : null,
      progress: project
        ? {
            dataDate: project.dataDate,
            planned: project.plannedPercent,
            actual: project.actualPercent,
            delayDays: project.delayDays,
            forecastFinish: project.forecastFinish,
            bac: BigInt(project.bac),
            ac: BigInt(project.ac),
            evAtCost,
            cpi: project.cpi,
            unallocatedBudget: BigInt(project.unallocatedBudget),
          }
        : null,
      costsCompleteThrough: rules.progress.costsCompleteThrough,
      leaves,
      cbsLeaves: content.cbs
        .filter((node) => node.isLeaf)
        .flatMap((node) => {
          const figures = cbsProgress.items.get(node.id);
          return figures
            ? [
                {
                  id: node.id,
                  code: node.code,
                  title: node.title,
                  budget: cbsLeafBudget(node),
                  eac: BigInt(figures.eac),
                  ev: BigInt(figures.ev),
                  consumedPercent: figures.consumedPercent,
                },
              ]
            : [];
        }),
      supervisors,
      approvers,
      needsResolution,
      fallbackApproverName: name(rules.alternateReviewerUserId ?? rules.managerUserId),
      openPeriods: periodViews(periods, today, new Map())
        .filter((period) => period.status === 'open' && period.endDate < today)
        .reverse()
        .map((period) => ({
          label: period.label,
          endDate: period.endDate,
          daysSinceEnd: Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${period.endDate}T00:00:00Z`)) / 86_400_000),
        })),
      supervisorNames: new Map(supervisorIds.map((id) => [id, name(id)])),
      nowMs: now.getTime(),
      risks: await this.risks.facts(projectId),
      mspPending: rules.mspLinked ? await this.msp.pending(projectId) : null,
    };
    return {
      facts,
      rules,
      roles: { pm: [...new Set([rules.managerUserId, ...byRole('project_manager')])], planner: byRole('planner'), finance: byRole('finance') },
    };
  }

  private async supervisors(
    projectId: string,
    supervisorIds: readonly string[],
    leaves: readonly LeafFact[],
    reviewerByLeaf: ReadonlyMap<string, string | null>,
    rules: ProjectRulesView,
    today: string,
    now: Date,
    name: (userId: string) => string,
  ): Promise<SupervisorFact[]> {
    if (supervisorIds.length === 0) return [];
    const reports = (await this.records.reports(this.em, { projectIds: [projectId] })).filter((report) => supervisorIds.includes(report.authorUserId));
    const items = reports.length > 0 ? await this.records.items(this.em, { projectId, reportIds: reports.map((report) => report.id) }) : [];
    const queues = await this.heartbeats.latest(supervisorIds);
    const activated = rules.progress.activatedAt ? tehranClock(rules.progress.activatedAt).date : today;
    return supervisorIds.map((userId) => {
      const own = reports.filter((report) => report.authorUserId === userId).sort((a, b) => b.deviceRecordedAt.getTime() - a.deviceRecordedAt.getTime());
      const lastWork = own.reduce<string | null>((max, report) => (!max || report.workDate > max ? report.workDate : max), null);
      const reportOrder = new Map(own.map((report, index) => [report.id, index]));
      const recent = items
        .filter((item) => reportOrder.has(item.reportId))
        .sort((a, b) => (reportOrder.get(a.reportId) ?? 0) - (reportOrder.get(b.reportId) ?? 0))
        .slice(0, RECENT_ITEMS)
        .map((item) => item.flags);
      const assigned = leaves.filter((leaf) => leaf.supervisorUserId === userId);
      const queue = queues.get(userId);
      return {
        userId,
        name: name(userId),
        openLeafCount: assigned.filter((leaf) => leaf.method !== 'time_based' && leaf.actual < 100).length,
        workDaysSinceReport: workDays(addDays(lastWork ?? activated, 1), today, rules.calendar),
        recentFlags: recent,
        queue: queue?.oldestQueuedAt ? { hoursOldest: (now.getTime() - queue.oldestQueuedAt.getTime()) / HOUR, queuedReports: queue.queuedReports } : null,
        approvers: [...new Set(assigned.flatMap((leaf) => (reviewerByLeaf.get(leaf.id) ? [reviewerByLeaf.get(leaf.id) as string] : [])))],
      };
    });
  }
}
