import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { toFaDigits } from '../../../platform/http/fa.js';
import { ChartSeries, type ChartRangePreset } from '../../computation/figures.js';
import { ProgressReads } from '../../computation/reads.js';
import { FieldReads } from '../../field/index.js';
import { PlanningService } from '../../planning/index.js';
import { ProjectPlanState } from '../../projects/index.js';
import { ChartContext } from './chart-access.js';

// `GET /projects/:pid/charts/progress?range=` — W21 (charts.md ۶.۳): منحنی S چهارخطی، EVM ماهانه و گانت فشرده دو سطح اول.
// تاریخ واقعی گانت از اولین و آخرین آیتم تأییدشدهٔ برگ‌های زیرش؛ مبلغ‌ها فقط با `cbs.view_amounts`.

type Node = Awaited<ReturnType<PlanningService['currentContent']>>['wbs'][number];

@Injectable()
export class ProgressCharts {
  constructor(
    private readonly em: EntityManager,
    private readonly chart: ChartContext,
    private readonly series: ChartSeries,
    private readonly progress: ProgressReads,
    private readonly planning: PlanningService,
    private readonly field: FieldReads,
    private readonly plans: ProjectPlanState,
  ) {}

  async get(projectId: string, preset: ChartRangePreset) {
    const { figures, meta } = await this.chart.load(projectId);
    const amounts = this.chart.amounts(projectId);
    const [series, plan, items, content, facts] = await Promise.all([
      this.series.progressSeries(projectId, preset),
      this.plans.state(projectId),
      this.progress.items(projectId),
      this.planning.currentContent(projectId),
      this.field.progressFacts(this.em, projectId),
    ]);
    const view = series.progress;
    const money = (value: string | null | undefined) => (amounts ? (value ?? null) : null);
    const dataDate = figures.meta.dataDate;

    const byId = new Map(content.wbs.map((node) => [node.id, node]));
    const children = new Map<string | null, Node[]>();
    for (const node of content.wbs) children.set(node.parentId, [...(children.get(node.parentId) ?? []), node]);
    const below = (id: string): Node[] => (children.get(id) ?? []).flatMap((child) => [child, ...below(child.id)]);
    const depthOf = (node: Node): number => (node.parentId && byId.get(node.parentId) ? 1 + depthOf(byId.get(node.parentId) as Node) : 0);
    const approvedDates = new Map<string, string[]>();
    for (const entry of facts.approved) approvedDates.set(entry.wbsItemId, [...(approvedDates.get(entry.wbsItemId) ?? []), entry.workDate]);
    const rows = content.wbs
      .filter((node) => !node.isLeaf && depthOf(node) <= 1)
      .map((node) => {
        const leaves = below(node.id).filter((child) => child.isLeaf);
        const starts = leaves.flatMap((leaf) => (leaf.plannedStart ? [leaf.plannedStart] : [])).sort();
        const finishes = leaves.flatMap((leaf) => (leaf.plannedFinish ? [leaf.plannedFinish] : [])).sort();
        const worked = leaves.flatMap((leaf) => approvedDates.get(leaf.id) ?? []).sort();
        const state = items.get(node.id);
        const done = state?.status === 'completed';
        return {
          id: node.id,
          code: node.code,
          title: node.title,
          depth: depthOf(node),
          plannedStart: node.plannedStart ?? starts[0] ?? dataDate,
          plannedFinish: node.plannedFinish ?? finishes.at(-1) ?? dataDate,
          actualStart: worked[0] ?? null,
          actualEnd: worked.length === 0 ? null : done ? (worked.at(-1) as string) : dataDate,
          actualPercent: state?.actualPercent ?? 0,
          status: state?.status ?? 'not_started',
          milestones: leaves
            .filter((leaf) => leaf.isMilestone)
            .map((leaf) => {
              const date = leaf.plannedFinish ?? leaf.plannedStart ?? dataDate;
              return { date, title: leaf.title, late: date < dataDate && items.get(leaf.id)?.status !== 'completed' };
            }),
        };
      });

    return {
      ...meta,
      range: series.range,
      hasRevision: series.hasRevision,
      revisionLabel: series.hasRevision && plan.pvReference ? `R${toFaDigits(plan.pvReference.number)}` : null,
      curve: series.curve,
      kpis: {
        actualPercent: figures.cards.progress.actualPercent,
        plannedPercent: figures.cards.progress.plannedPercent,
        deviation: figures.cards.progress.deviation,
        forecastFinish: figures.cards.time.forecastFinish,
        delayWorkingDays: figures.cards.time.delayWorkingDays,
      },
      evm: {
        months: series.months.map((month) => ({ date: month.date, pv: money(month.pv), ev: money(month.ev), ac: money(month.ac) })),
        cv: money(view?.cv),
        sv: money(view?.sv),
        cpi: view?.cpi ?? null,
        spi: view?.spi ?? null,
        eac: money(view?.eac),
        pv: money(view?.pv),
        ev: money(view?.ev),
        ac: money(view?.ac),
      },
      gantt: { start: series.start, finish: series.last, rows },
    };
  }
}
