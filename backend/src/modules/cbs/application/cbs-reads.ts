import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { linkSubBudget } from '../../computation/index.js';
import { ProgressReads } from '../../computation/reads.js';
import { NotFoundError } from '../../../platform/http/errors.js';
import { type CbsNode, type CostType, PlanningService, type PlanVersion } from '../../planning/index.js';
import { CostEntries } from '../../cost-ledger/index.js';
import { ProjectPlanAccess } from '../../projects/index.js';
import { bacTotal, cbsBudgetTotal } from '../domain/cbs-checks.js';
import { leafIdsBelow, locateCbs, toCbsForest } from '../domain/cbs-tree.js';
import { BudgetRevisionRequest } from '../domain/budget-revision.entity.js';
import { cbsItemViews, pathOf } from './cbs-view.js';

// دفتر CBS (W14؛ cbs.md ۱۱، ۱۴): درخت جاری با خلاصه و جزئیات قلم. AC خلاصه از دفتر هزینه (F06)؛ شاخص‌های قلم، EAC و CPI
// پروژه و شمارنده‌های مصرف از جدول‌های مشتق محاسبات (F10) — جمع پیش‌بینی قلم‌ها EAC پروژه نیست (cbs.md ۸).

const round4 = (value: number): number => Math.round(value * 10_000) / 10_000;

export function versionLabel(version: PlanVersion): string {
  if (version.kind === 'baseline') return 'برنامهٔ مبنا';
  const number = `R${version.number ?? ''}`;
  return version.source === 'budget_revision' ? `بازنگری بودجه ${number}` : `بازنگری ${number}`;
}

@Injectable()
export class CbsReads {
  constructor(
    private readonly em: EntityManager,
    private readonly planning: PlanningService,
    private readonly projects: ProjectPlanAccess,
    private readonly costs: CostEntries,
    private readonly progress: ProgressReads,
  ) {}

  /** `GET /projects/:pid/cbs?include=progress` */
  async tree(projectId: string) {
    const project = await this.projects.context(projectId);
    const [{ cbs, links }, computed, overall] = await Promise.all([
      this.planning.currentContent(projectId),
      this.progress.cbsItems(projectId),
      this.progress.project(projectId),
    ]);
    const items = cbsItemViews(cbs, links, computed.items);
    const leaves = items.filter((item) => item.isLeaf);
    const cbsBudget = cbsBudgetTotal(cbs);
    const bac = bacTotal(cbs, links);
    const reserve = BigInt(project.contingencyReserve || '0');
    const byType = new Map<CostType, bigint>();
    for (const leaf of leaves) byType.set(leaf.costType, (byType.get(leaf.costType) ?? 0n) + BigInt(leaf.budget));
    return {
      projectId,
      costIndicesDate: computed.costIndicesDate,
      computedAt: computed.computedAt,
      items,
      summary: {
        totalBudget: (cbsBudget + reserve).toString(),
        cbsBudget: cbsBudget.toString(),
        bac: bac.toString(),
        unallocated: (cbsBudget - bac).toString(),
        contingencyReserve: reserve.toString(),
        ac: [...(await this.costs.postedAcByItem(projectId)).values()].reduce((sum, value) => sum + value, 0n).toString(),
        projectEac: overall?.eac ?? null,
        projectCpi: overall?.cpi ?? null,
        byType: [...byType]
          .sort((a, b) => (a[1] === b[1] ? 0 : a[1] > b[1] ? -1 : 1))
          .map(([costType, budget]) => ({
            costType,
            budget: budget.toString(),
            percent: cbsBudget > 0n ? round4((Number(budget) / Number(cbsBudget)) * 100) : 0,
          })),
        counts: {
          consumptionOver90: leaves.filter((item) => (item.progress?.consumedPercent ?? 0) >= 90).length,
          forecastOverBudget: leaves.filter((item) => item.progress !== null && BigInt(item.progress.eac) > BigInt(item.budget)).length,
          unlinked: leaves.filter((item) => item.linkCount === 0).length,
          leaves: leaves.length,
          groups: items.length - leaves.length,
        },
      },
    };
  }

  /** `GET /projects/:pid/cbs/:itemId` */
  async item(projectId: string, itemId: string) {
    await this.projects.context(projectId);
    const [{ wbs, cbs, links }, computed, wbsProgress] = await Promise.all([
      this.planning.currentContent(projectId),
      this.progress.cbsItems(projectId),
      this.progress.items(projectId),
    ]);
    const items = cbsItemViews(cbs, links, computed.items);
    const item = items.find((entry) => entry.id === itemId);
    if (!item) throw new NotFoundError('CBS_ITEM_NOT_FOUND');
    const located = locateCbs(toCbsForest(cbs), itemId);
    const below = new Set(located ? leafIdsBelow(located.node) : []);
    const byId = new Map<string, CbsNode>(cbs.map((node) => [node.id, node]));
    const wbsById = new Map(wbs.map((node) => [node.id, node]));
    const pending = await this.em.find(BudgetRevisionRequest, { projectId, status: 'pending' }, { fields: ['changes'] });
    return {
      item,
      path: pathOf(items, itemId),
      links: links
        .filter((link) => below.has(link.cbsItemId))
        .flatMap((link) => {
          const leaf = wbsById.get(link.wbsItemId);
          const cbsItem = byId.get(link.cbsItemId);
          if (!leaf || !cbsItem) return [];
          return [
            {
              wbsItemId: leaf.id,
              code: leaf.code,
              title: leaf.title,
              quantity: link.quantity === null ? null : Number(link.quantity),
              allocatedAmount: link.allocatedAmount,
              subBudget: linkSubBudget(cbsItem, link).toString(),
              wbsActualPercent: wbsProgress.get(leaf.id)?.actualPercent ?? null,
            },
          ];
        }),
      rateHistory: item.isLeaf && item.pricingMode === 'unit_rate' ? await this.rateHistory(projectId, itemId) : [],
      pendingRevisionCount: pending.filter((request) => request.changes.some((change) => change.cbsItemId === itemId)).length,
    };
  }

  /** از مقایسهٔ `CbsItemPlan` نسخه‌های اعمال‌شدهٔ پیاپی (cbs.md ۷.۴؛ AC-CBS-09)؛ تازه‌ترین بالا. */
  private async rateHistory(projectId: string, itemId: string) {
    const history = await this.planning.cbsItemHistory(projectId, itemId);
    const rows: {
      versionId: string;
      versionLabel: string;
      appliedAt: string;
      unitRate: string | null;
      previousRate: string | null;
      changePercent: number | null;
      note: string | null;
    }[] = [];
    let previous: string | null | undefined;
    for (const { version, item } of history) {
      if (previous !== undefined && previous === item.unitRate) continue;
      const first = previous === undefined;
      const label = versionLabel(version);
      rows.push({
        versionId: version.id,
        versionLabel: first && version.kind !== 'baseline' ? `افزوده در ${label}` : label,
        appliedAt: (version.appliedAt ?? version.createdAt).toISOString(),
        unitRate: item.unitRate,
        previousRate: first ? null : (previous ?? null),
        changePercent: !first && previous && item.unitRate ? round4(((Number(item.unitRate) - Number(previous)) / Number(previous)) * 100) : null,
        note: first ? null : (version.note ?? null),
      });
      previous = item.unitRate;
    }
    return rows.reverse();
  }
}
