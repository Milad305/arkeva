import { Injectable } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/postgresql';
import { CostEntries } from '../../cost-ledger/index.js';
import { FieldReads } from '../../field/index.js';
import { type CbsNode, leafBacOf, type LinkNode, type PlanContent, type PlanNode, PlanningService } from '../../planning/index.js';
import { ProjectRules, type ProjectRulesView } from '../../projects/index.js';
import type { ApprovedEntry, LeafShape, ModelNode, ProgressModel } from '../domain/formulas/engine.js';

// واقعیت‌های یک پروژه برای بازمحاسبه (progress-calculation.md ۵.۲–۵.۶) — فقط از راه سرویس عمومی مالک‌ها (01 ۷):
// نسخهٔ مرجع و جاری از planning، آیتم‌ها از field، هزینهٔ قطعی از cost-ledger، تنظیمات و تقویم از projects.

export interface ComputeFacts {
  readonly rules: ProjectRulesView;
  readonly model: ProgressModel;
  readonly referenceVersionId: string;
  /** شناسه‌های برگ و والد جاری — آیتم حذف‌شده از جاری فقط در تجمیع رسمی می‌ماند. */
  readonly currentIds: ReadonlySet<string>;
  readonly currentCbs: readonly CbsNode[];
  readonly currentLinks: readonly LinkNode[];
  readonly referenceCbs: readonly CbsNode[];
  readonly referenceLinks: readonly LinkNode[];
  readonly lastApprovedAt: ReadonlyMap<string, string>;
  /** آخرین مقدار در انتظار هر برگ (فقط نمایشی). */
  readonly pendingPercent: ReadonlyMap<string, number>;
  readonly pendingCount: number;
  readonly costs: readonly { readonly cbsItemId: string; readonly costDate: string; readonly amount: bigint; readonly quantity: number | null }[];
}

const byRecency = (a: { workDate: string; recordedAt: string }, b: { workDate: string; recordedAt: string }) =>
  a.workDate === b.workDate ? a.recordedAt.localeCompare(b.recordedAt) : a.workDate.localeCompare(b.workDate);

function shapeOf(node: PlanNode): LeafShape {
  return {
    method: node.measurementMethod,
    totalQuantity: node.totalQuantity === null ? null : Number(node.totalQuantity),
    steps: node.steps ? node.steps.map((step) => ({ key: step.key, weight: step.weight })) : null,
    isMilestone: node.isMilestone,
    plannedStart: node.plannedStart,
    plannedFinish: node.plannedFinish,
  };
}

@Injectable()
export class ComputeFactsLoader {
  constructor(
    private readonly planning: PlanningService,
    private readonly field: FieldReads,
    private readonly costs: CostEntries,
    private readonly projectRules: ProjectRules,
  ) {}

  /** پروژهٔ بی نسخهٔ مرجع (پیش‌نویس) ← null: چیزی برای محاسبه نیست. */
  async load(em: EntityManager, projectId: string): Promise<ComputeFacts | null> {
    const rules = await this.projectRules.of(projectId, em);
    const referenceVersionId = rules.progress.pvReferenceVersionId;
    if (!referenceVersionId) return null;
    const [reference, current, facts, costs] = await Promise.all([
      this.planning.versionContent(referenceVersionId),
      this.planning.currentContent(projectId),
      this.field.progressFacts(em, projectId),
      this.costs.postedFacts(projectId, em),
    ]);
    return this.assemble(rules, referenceVersionId, reference, current, facts, costs);
  }

  private assemble(
    rules: ProjectRulesView,
    referenceVersionId: string,
    reference: PlanContent,
    current: PlanContent,
    facts: Awaited<ReturnType<FieldReads['progressFacts']>>,
    costs: ComputeFacts['costs'],
  ): ComputeFacts {
    const referenceBac = leafBacOf(reference);
    const currentBac = leafBacOf(current);
    const referenceIds = new Set(reference.wbs.map((node) => node.id));
    const currentById = new Map(current.wbs.map((node) => [node.id, node]));

    const nodes: ModelNode[] = reference.wbs.map((node) => ({
      id: node.id,
      parentId: node.parentId,
      isLeaf: node.isLeaf,
      isMilestone: node.isMilestone,
      weight: Number(node.weightInParent),
      plannedStart: node.plannedStart,
      plannedFinish: node.plannedFinish,
      bac: node.isLeaf ? (referenceBac.get(node.id) ?? 0n) : 0n,
    }));
    const shapes = new Map<string, LeafShape>();
    // شکل اندازه‌گیری از جاری؛ برگ حذف‌شده با شکل مرجع (۵.۴)
    for (const node of reference.wbs) if (node.isLeaf) shapes.set(node.id, shapeOf(currentById.get(node.id) ?? node));
    const outOfReference = current.wbs
      .filter((node) => node.isLeaf && !referenceIds.has(node.id))
      .map((node) => {
        shapes.set(node.id, shapeOf(node));
        return { id: node.id, bac: currentBac.get(node.id) ?? 0n };
      });

    const approved = new Map<string, ApprovedEntry[]>();
    const lastApprovedAt = new Map<string, string>();
    for (const entry of facts.approved) {
      approved.set(entry.wbsItemId, [...(approved.get(entry.wbsItemId) ?? []), entry]);
      const last = lastApprovedAt.get(entry.wbsItemId);
      if (entry.approvedAt && (!last || entry.approvedAt > last)) lastApprovedAt.set(entry.wbsItemId, entry.approvedAt);
    }
    for (const list of approved.values()) list.sort(byRecency);
    const pendingPercent = new Map<string, number>();
    for (const entry of [...facts.pending].sort(byRecency)) pendingPercent.set(entry.wbsItemId, entry.computedPercent);

    return {
      rules,
      referenceVersionId,
      model: { reference: nodes, shapes, outOfReference, approved, calendar: rules.calendar },
      currentIds: new Set(current.wbs.map((node) => node.id)),
      currentCbs: current.cbs,
      currentLinks: current.links,
      referenceCbs: reference.cbs,
      referenceLinks: reference.links,
      lastApprovedAt,
      pendingPercent,
      pendingCount: facts.pending.length,
      costs,
    };
  }
}
