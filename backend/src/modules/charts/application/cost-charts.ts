import { Injectable } from '@nestjs/common';
import { AlertReads } from '../../alerts/reads.js';
import { cbsLeafBudget } from '../../computation/index.js';
import { ChartSeries, type ChartRangePreset } from '../../computation/figures.js';
import { consumedPercent, ProgressReads, variancePercent } from '../../computation/reads.js';
import { CostEntries } from '../../cost-ledger/index.js';
import { PlanningService } from '../../planning/index.js';
import { ChartContext } from './chart-access.js';

// `GET /projects/:pid/charts/cost?range=` — W22 (charts.md ۶.۴؛ نیازمند `cbs.view_amounts`، AC-CH-04): کارت‌ها از ProjectProgress،
// توزیع بودجه به نوع هزینه، گروه‌های سطح اول CBS، نرخ مصرف ماهانه و ۱۰ قلم پرهزینه. هزینهٔ واقعی فقط از دفتر هزینه (G11).

const COST_TYPE_LABELS: Record<string, string> = {
  materials: 'مصالح',
  labor: 'نیروی انسانی',
  equipment: 'ماشین‌آلات',
  subcontract: 'پیمانکار جزء',
  overhead: 'بالاسری و تجهیز کارگاه',
  transport: 'حمل',
  other: 'سایر',
};
const round1 = (value: number) => Math.round(value * 10) / 10;

@Injectable()
export class CostCharts {
  constructor(
    private readonly chart: ChartContext,
    private readonly series: ChartSeries,
    private readonly progress: ProgressReads,
    private readonly planning: PlanningService,
    private readonly costs: CostEntries,
    private readonly alerts: AlertReads,
  ) {}

  async get(projectId: string, preset: ChartRangePreset) {
    this.chart.requireAmounts(projectId);
    const { figures, meta } = await this.chart.load(projectId);
    const [content, cbs, posted, alerts] = await Promise.all([
      this.planning.currentContent(projectId),
      this.progress.cbsItems(projectId),
      this.costs.postedFacts(projectId),
      this.alerts.open([projectId]),
    ]);
    const { range, burn } = await this.series.burn(projectId, preset, posted);
    const view = figures.progress;
    const bac = BigInt(view?.bac ?? '0');
    const ac = BigInt(view?.ac ?? '0');
    const eac = BigInt(view?.eac ?? view?.bac ?? '0');

    const leaves = content.cbs.filter((node) => node.isLeaf);
    const budgetOf = new Map(leaves.map((node) => [node.id, cbsLeafBudget(node)]));
    const totalBudget = [...budgetOf.values()].reduce((sum, value) => sum + value, 0n);
    const byTypeMap = new Map<string, bigint>();
    for (const node of leaves) byTypeMap.set(node.costType, (byTypeMap.get(node.costType) ?? 0n) + (budgetOf.get(node.id) ?? 0n));
    const children = new Map<string | null, typeof content.cbs>();
    for (const node of content.cbs) children.set(node.parentId, [...(children.get(node.parentId) ?? []), node]);
    const leafBudgetBelow = (id: string): bigint =>
      (children.get(id) ?? []).reduce((sum, child) => sum + (child.isLeaf ? (budgetOf.get(child.id) ?? 0n) : leafBudgetBelow(child.id)), 0n);
    const severityOf = (cbsItemId: string) => {
      const found = alerts.filter((alert) => (alert.ruleCode === 'AL-CST-01' || alert.ruleCode === 'AL-CST-02') && alert.subjectId === cbsItemId);
      return found.some((alert) => alert.severity === 'critical')
        ? 'critical'
        : found.some((alert) => alert.severity === 'warning')
          ? 'warning'
          : (found[0]?.severity ?? null);
    };

    return {
      ...meta,
      range,
      kpis: {
        bac: bac.toString(),
        ac: ac.toString(),
        acPercent: round1(consumedPercent(ac, bac)),
        ev: view?.ev ?? '0',
        eac: eac.toString(),
        eacVariancePercent: round1(variancePercent(eac, bac)),
        cpi: view?.cpi ?? null,
        tcpi: view?.tcpi ?? null,
      },
      byType: [...byTypeMap]
        .sort((a, b) => (b[1] > a[1] ? 1 : b[1] < a[1] ? -1 : 0))
        .map(([type, budget]) => ({
          type,
          label: COST_TYPE_LABELS[type] ?? type,
          budget: budget.toString(),
          percent: round1(consumedPercent(budget, totalBudget)),
        })),
      byGroup: content.cbs
        .filter((node) => node.parentId === null)
        .map((node) => {
          const budget = node.isLeaf ? (budgetOf.get(node.id) ?? 0n) : leafBudgetBelow(node.id);
          const state = cbs.items.get(node.id);
          return {
            id: node.id,
            code: node.code,
            title: node.title,
            budget: budget.toString(),
            ac: state?.ac ?? '0',
            eac: state?.eac ?? budget.toString(),
            consumedPercent: state?.consumedPercent ?? 0,
            eacVariancePercent: state?.eacVariancePercent ?? 0,
          };
        }),
      burn,
      top: [...leaves]
        .sort((a, b) => {
          const left = budgetOf.get(a.id) ?? 0n;
          const right = budgetOf.get(b.id) ?? 0n;
          return right > left ? 1 : right < left ? -1 : a.code.localeCompare(b.code);
        })
        .slice(0, 10)
        .map((node) => ({
          id: node.id,
          code: node.code,
          title: node.title,
          budget: (budgetOf.get(node.id) ?? 0n).toString(),
          ac: cbs.items.get(node.id)?.ac ?? '0',
          consumedPercent: cbs.items.get(node.id)?.consumedPercent ?? 0,
          alertSeverity: severityOf(node.id),
        })),
    };
  }
}
