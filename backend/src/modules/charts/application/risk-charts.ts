import { Injectable } from '@nestjs/common';
import { delayWorkDays, ProgressReads } from '../../computation/reads.js';
import { IdentityService } from '../../identity/index.js';
import { PlanningService } from '../../planning/index.js';
import { RiskReads } from '../../risks/index.js';
import { ChartContext } from './chart-access.js';

// `GET /projects/:pid/charts/risk` — W24 (charts.md ۶.۶): treemap برگ‌ها (اندازه = وزن در پروژه از نسخهٔ مرجع، رنگ = وضعیت)،
// گروه‌های سطح اول، توزیع وضعیت و کارت‌ها؛ همیشه در تاریخ داده. کار خارج از مبنا با برچسب جدا (OD-18؛ AC-CH-10).

const STATUSES = ['completed', 'on_track', 'ahead', 'warning', 'critical', 'not_started'] as const;
type Status = (typeof STATUSES)[number];
const round1 = (value: number) => Math.round(value * 10) / 10;
const empty = () => Object.fromEntries(STATUSES.map((status) => [status, 0])) as Record<Status, number>;

@Injectable()
export class RiskCharts {
  constructor(
    private readonly chart: ChartContext,
    private readonly progress: ProgressReads,
    private readonly planning: PlanningService,
    private readonly risks: RiskReads,
    private readonly identity: IdentityService,
  ) {}

  async get(projectId: string) {
    const { figures, meta } = await this.chart.load(projectId);
    const amounts = this.chart.amounts(projectId);
    const [content, items, risks] = await Promise.all([this.planning.currentContent(projectId), this.progress.items(projectId), this.risks.facts(projectId)]);
    const byId = new Map(content.wbs.map((node) => [node.id, node]));
    const topOf = (id: string) => {
      let node = byId.get(id);
      while (node?.parentId && byId.get(node.parentId)) node = byId.get(node.parentId);
      return node;
    };
    const leaves = content.wbs.filter((node) => node.isLeaf && !node.isMilestone);
    const people = await this.identity.personRefs(leaves.flatMap((leaf) => (leaf.supervisorUserId ? [leaf.supervisorUserId] : [])));
    const rows = leaves.map((leaf) => {
      const view = items.get(leaf.id);
      const group = topOf(leaf.id);
      const forecast = view?.forecastFinish ?? null;
      const plannedFinish = leaf.plannedFinish ?? figures.meta.dataDate;
      const delay = forecast ? delayWorkDays(plannedFinish, forecast, figures.rules.calendar) : null;
      return {
        id: leaf.id,
        code: leaf.code,
        title: leaf.title,
        groupCode: group?.code ?? leaf.code,
        groupTitle: group?.title ?? leaf.title,
        weight: view?.weightInProject ?? 0,
        plannedPercent: view?.plannedPercent ?? 0,
        actualPercent: view?.actualPercent ?? 0,
        deviation: view?.deviation ?? 0,
        status: (view?.status ?? 'not_started') as Status,
        outOfBaseline: view ? !view.inReference : false,
        riskCodes: risks.filter((risk) => risk.wbsItemIds.includes(leaf.id)).map((risk) => risk.code),
        supervisor: leaf.supervisorUserId ? (people.get(leaf.supervisorUserId) ?? null) : null,
        plannedFinish,
        forecastFinish: forecast,
        delayDays: delay === null ? null : Math.max(0, delay),
      };
    });
    const totals = empty();
    for (const row of rows) totals[row.status] += 1;
    const done = rows.filter((row) => row.status === 'completed');
    const groups = content.wbs
      .filter((node) => node.parentId === null)
      .map((node) => {
        const counts = empty();
        for (const row of rows) if (row.groupCode === node.code) counts[row.status] += 1;
        return { code: node.code, title: node.title, weight: items.get(node.id)?.weightInProject ?? 0, deviation: items.get(node.id)?.deviation ?? 0, counts };
      });
    const view = figures.progress;
    return {
      ...meta,
      kpis: {
        leafCount: rows.length,
        groupCount: groups.length,
        critical: totals.critical,
        late: totals.warning,
        done: done.length,
        doneWeightPercent: round1(done.reduce((sum, row) => sum + row.weight, 0)),
        spi: view?.spi ?? null,
        pv: amounts ? (view?.pv ?? null) : null,
        ev: amounts ? (view?.ev ?? null) : null,
        delayWorkingDays: figures.cards.time.delayWorkingDays,
        forecastFinish: figures.cards.time.forecastFinish,
      },
      leaves: rows,
      groups,
      distribution: STATUSES.map((status) => ({ status, count: totals[status], percent: round1((totals[status] / Math.max(1, rows.length)) * 100) })),
    };
  }
}
