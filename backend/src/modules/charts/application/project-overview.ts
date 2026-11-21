import { Injectable } from '@nestjs/common';
import { AppContext } from '../../../platform/context/app-context.js';
import { ConflictError, UnauthorizedError } from '../../../platform/http/errors.js';
import { AlertReads, type OpenAlertView } from '../../alerts/reads.js';
import { cbsLeafBudget } from '../../computation/index.js';
import { OverviewFigures } from '../../computation/figures.js';
import { delayWorkDays, ProgressReads } from '../../computation/reads.js';
import { IdentityService } from '../../identity/index.js';
import { PlanningService } from '../../planning/index.js';
import { ProjectPlanState } from '../../projects/index.js';
import { RiskReads } from '../../risks/index.js';
import { FieldTeamToday } from './field-team.js';

// `GET /projects/:pid/overview` — W10 (charts.md ۶.۲، ۸، ۹). فقط مقادیر ذخیره‌شده (AC-CH-01)؛ رنگ کارت‌ها از هشدار باز.
//   • مبلغ فقط با `cbs.view_amounts` (AC-CH-04).
//   • حالت خلاصه (`charts.view_summary`، ناظر کارفرما؛ AC-CH-05): درصدها، انحراف، منحنی S، پیش‌بینی، نقاط عطف و ریسک‌های بالا؛
//     بی مبلغ، بی «فعالیت‌های بحرانی»، «اقلام پرمصرف» و «تیم کارگاه».

const SEVERITY_RANK = { info: 1, warning: 2, critical: 3 } as const;

function worst(alerts: readonly OpenAlertView[], match: (alert: OpenAlertView) => boolean) {
  return alerts
    .filter(match)
    .reduce<OpenAlertView['severity'] | null>((max, alert) => (!max || SEVERITY_RANK[alert.severity] > SEVERITY_RANK[max] ? alert.severity : max), null);
}

@Injectable()
export class ProjectOverview {
  constructor(
    private readonly context: AppContext,
    private readonly figures: OverviewFigures,
    private readonly progress: ProgressReads,
    private readonly planning: PlanningService,
    private readonly plans: ProjectPlanState,
    private readonly alerts: AlertReads,
    private readonly risks: RiskReads,
    private readonly identity: IdentityService,
    private readonly fieldTeam: FieldTeamToday,
  ) {}

  private can(projectId: string, code: 'charts.view' | 'cbs.view_amounts'): boolean {
    const access = this.context.access;
    if (!access) throw new UnauthorizedError();
    return access.isOrgAdmin || (access.projects.get(projectId)?.has(code) ?? false);
  }

  async get(projectId: string) {
    const full = this.can(projectId, 'charts.view');
    const amounts = full && this.can(projectId, 'cbs.view_amounts');
    const figures = await this.figures.of(projectId);
    if (figures.rules.status === 'draft')
      throw new ConflictError('CHARTS_NOT_AVAILABLE', { reason: 'پروژهٔ پیش‌نویس هنوز عددی ندارد؛ پس از فعال‌سازی محاسبه می‌شود.' });
    const [alerts, plan, items, cbs, content, risks] = await Promise.all([
      this.alerts.open([projectId]),
      this.plans.state(projectId),
      this.progress.items(projectId),
      this.progress.cbsItems(projectId),
      this.planning.currentContent(projectId),
      this.risks.openSummaries([projectId]),
    ]);
    const { rules, cards, meta } = figures;
    const leaves = content.wbs.filter((node) => node.isLeaf);
    const hasApproved = cards.progress.actualPercent > 0 || [...items.values()].some((item) => item.lastApprovedAt !== null);
    const people = await this.identity.personRefs([
      ...leaves.flatMap((node) => (node.supervisorUserId ? [node.supervisorUserId] : [])),
      ...risks.map((risk) => risk.ownerUserId),
    ]);

    const criticalItems = full
      ? leaves
          .flatMap((node) => {
            const view = items.get(node.id);
            return view && view.deviation < 0 ? [{ node, view }] : [];
          })
          .sort((a, b) => a.view.deviation - b.view.deviation)
          .slice(0, 5)
          .map(({ node, view }) => ({
            wbsItemId: node.id,
            code: node.code,
            title: node.title,
            plannedPercent: view.plannedPercent,
            actualPercent: view.actualPercent,
            deviation: view.deviation,
            status: view.status,
            supervisor: node.supervisorUserId ? (people.get(node.supervisorUserId) ?? null) : null,
          }))
      : [];
    const topCbsItems = full
      ? content.cbs
          .filter((node) => node.isLeaf && cbs.items.get(node.id)?.consumedPercent !== null && cbs.items.has(node.id))
          .sort((a, b) => (cbs.items.get(b.id)?.consumedPercent ?? 0) - (cbs.items.get(a.id)?.consumedPercent ?? 0))
          .slice(0, 5)
          .map((node) => ({
            cbsItemId: node.id,
            code: node.code,
            title: node.title,
            ...(amounts ? { budget: cbsLeafBudget(node).toString(), ac: cbs.items.get(node.id)?.ac ?? '0' } : {}),
            consumedPercent: cbs.items.get(node.id)?.consumedPercent ?? 0,
            alertSeverity: worst(alerts, (alert) => (alert.ruleCode === 'AL-CST-01' || alert.ruleCode === 'AL-CST-02') && alert.subjectId === node.id),
          }))
      : [];
    const milestones = leaves
      .filter((node) => node.isMilestone && node.plannedFinish)
      .sort((a, b) => (a.plannedFinish as string).localeCompare(b.plannedFinish as string))
      .slice(0, 6)
      .map((node) => {
        const view = items.get(node.id);
        const done = view?.status === 'completed';
        const forecast = done ? null : (view?.forecastFinish ?? null);
        return {
          wbsItemId: node.id,
          title: node.title,
          plannedDate: node.plannedFinish as string,
          status: view?.status ?? 'not_started',
          actualDate: done ? (view?.lastApprovedAt?.slice(0, 10) ?? null) : null,
          forecastDate: forecast,
          delayWorkingDays: forecast ? delayWorkDays(node.plannedFinish as string, forecast, rules.calendar) : null,
        };
      });
    const visibleRisks = full ? risks : risks.filter((risk) => (risk.score ?? 0) >= 15);
    return {
      projectId,
      ...meta,
      pvReference: plan.pvReference,
      progress: cards.progress,
      budget: amounts ? cards.budget : { consumedPercent: cards.budget.consumedPercent },
      time: cards.time,
      evm: {
        ...cards.evm,
        costAlert: worst(alerts, (alert) => alert.ruleCode === 'AL-CST-04'),
        scheduleAlert: worst(alerts, (alert) => alert.ruleCode === 'AL-PRG-03'),
      },
      sCurve: figures.sCurve,
      criticalItems,
      topCbsItems,
      milestones,
      openRisks: {
        total: visibleRisks.length,
        items: [...visibleRisks]
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.code.localeCompare(b.code))
          .slice(0, 4)
          .map((risk) => ({
            id: risk.id,
            code: risk.code,
            title: risk.title,
            category: risk.category,
            score: risk.score,
            level: risk.level,
            status: risk.status,
            owner: people.get(risk.ownerUserId) ?? { id: risk.ownerUserId, fullName: '—', avatarTone: 'a1' },
          })),
      },
      fieldTeam: full ? await this.fieldTeam.of(rules, content.wbs, items, alerts) : { reportedCount: 0, expectedCount: 0, supervisors: [] },
      hasApprovedReports: hasApproved,
    };
  }
}
