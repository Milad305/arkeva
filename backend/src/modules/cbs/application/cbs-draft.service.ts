import { Injectable } from '@nestjs/common';
import { AppContext } from '../../../platform/context/app-context.js';
import { newId } from '../../../platform/database/ids.js';
import { DomainError } from '../../../platform/http/errors.js';
import { type DraftState, PlanningService } from '../../planning/index.js';
import { WbsDraftService } from '../../wbs/index.js';
import { bacTotal, CBS_FIELD_LABELS, cbsBudgetTotal, diffCbs } from '../domain/cbs-checks.js';
import { CostEntries } from '../../cost-ledger/index.js';
import {
  applyCbsOps,
  type CbsOp,
  type CbsOpError,
  type CostFacts,
  HAS_COST_CHILD,
  HAS_COST_REMOVE,
  HAS_COST_UNIT,
  NEEDS_REVISE_BUDGET,
} from '../domain/cbs-ops.js';
import { toCbsForest, toCbsNodes, walkCbs } from '../domain/cbs-tree.js';
import { cbsItemViews } from './cbs-view.js';

// حالت ویرایش CBS روی نسخهٔ کاری F04 (cbs.md ۱۳–۱۴؛ تصمیم 1405/08/15). همان نسخه و همان اعتبارسنجی W12:
// ساختار و ذخیره از راه PlanningService، اعتبارسنجی کل نسخه از WbsDraftService.assess. هزینهٔ ثبت‌شده با دفتر
// هزینه (F06، برش ۸)؛ تا آن موقع همهٔ قفل‌های هزینه باز است.

export const isLive = (state: DraftState): boolean => state.project.status === 'active' || state.project.status === 'paused';

@Injectable()
export class CbsDraftService {
  constructor(
    private readonly planning: PlanningService,
    private readonly wbs: WbsDraftService,
    private readonly context: AppContext,
    private readonly costs: CostEntries,
  ) {}

  /** `GET /projects/:pid/plan-draft/cbs` */
  async tree(projectId: string) {
    return this.respond(await this.wbs.editable(projectId), 0);
  }

  /** `POST /projects/:pid/plan-draft/cbs/ops/preview` */
  async preview(projectId: string, input: { readonly draftRevision: number; readonly ops: readonly CbsOp[] }) {
    const state = await this.wbs.editable(projectId);
    this.wbs.checkRevision(state, input.draftRevision);
    const { next, errors } = this.run(state, input.ops, await this.costFacts(projectId));
    return { ...(await this.respond(next, input.ops.length)), opErrors: errors.map(({ index, code, message }) => ({ index, code, message })) };
  }

  /** `POST /projects/:pid/plan-draft/cbs/ops` — هر عمل ردشده کل ذخیره را نگه می‌دارد (۴۲۲). */
  async save(projectId: string, input: { readonly draftRevision: number; readonly ops: readonly CbsOp[] }) {
    const state = await this.wbs.editable(projectId);
    this.wbs.checkRevision(state, input.draftRevision);
    const idMap = await this.commit(state, input.ops, input.draftRevision);
    return { ...(await this.tree(projectId)), idMap };
  }

  /** اجرای عملیات و ذخیره در نسخهٔ کاری؛ شناسهٔ موقت ← شناسهٔ واقعی. مشترک با ورود فایل. */
  async commit(state: DraftState, ops: readonly CbsOp[], revision: number, reject: (error: CbsOpError) => never = rejectOp): Promise<Record<string, string>> {
    const temps = new Set(
      ops.flatMap((op) => (op.type === 'add' ? [op.tempId] : op.type === 'split' ? [op.parentTempId, ...op.parts.map((part) => part.tempId)] : [])),
    );
    const forest = toCbsForest(state.cbs);
    const ctx = this.opsContext(state, await this.costFacts(state.project.id));
    const errors = applyCbsOps(forest, ops, ctx);
    if (errors[0]) reject(errors[0]);
    const idMap: Record<string, string> = {};
    walkCbs(forest, (node) => {
      if (temps.has(node.id)) {
        idMap[node.id] = newId();
        node.id = idMap[node.id] as string;
      }
    });
    const next: DraftState = { ...state, cbs: toCbsNodes(forest), links: ctx.links };
    const assessed = this.wbs.assess(next, ops.length);
    await this.planning.saveDraft(state.project.id, {
      expectedRevision: revision,
      cbs: assessed.content.cbs,
      links: assessed.content.links,
      changeCount: assessed.changeCount,
    });
    return idMap;
  }

  canReviseBudget(projectId: string): boolean {
    const access = this.context.access;
    return !!access && (access.isOrgAdmin || (access.projects.get(projectId)?.has('cbs.revise_budget') ?? false));
  }

  // ── درونی ──

  /** هزینهٔ posted هر برگ از دفتر هزینه (F06) — قفل‌های «هزینهٔ ثبت‌شده» و «بستن قلم» (cbs.md ۴.۴؛ AC-CBS-07). */
  private async costFacts(projectId: string): Promise<CostFacts> {
    const posted = await this.costs.postedAcByItem(projectId);
    return { postedAc: (id) => posted.get(id) ?? 0n };
  }

  private opsContext(state: DraftState, costs: CostFacts) {
    return { costs, live: isLive(state), canReviseBudget: this.canReviseBudget(state.project.id), links: [...state.links] };
  }

  private run(state: DraftState, ops: readonly CbsOp[], costs: CostFacts): { next: DraftState; errors: CbsOpError[] } {
    const forest = toCbsForest(state.cbs);
    const ctx = this.opsContext(state, costs);
    const errors = applyCbsOps(forest, ops, ctx);
    return { next: { ...state, cbs: toCbsNodes(forest), links: ctx.links }, errors };
  }

  private async respond(state: DraftState, opCount: number) {
    const assessed = this.wbs.assess(state, opCount);
    const { cbs, links } = assessed.content;
    const live = isLive(state);
    const canRevise = this.canReviseBudget(state.project.id);
    const diff = diffCbs(state.currentCbs, cbs, state.currentLinks, links);
    const posted = await this.costs.postedAcByItem(state.project.id);
    const below = belowMap(cbs);
    const items = cbsItemViews(cbs, links).map((item) => {
      // والد: جمع نوادگان
      const ac = (below.get(item.id) ?? [item.id]).reduce((sum, id) => sum + (posted.get(id) ?? 0n), 0n);
      const hasCost = ac > 0n;
      const locks: Record<string, string> = {};
      if (hasCost) {
        locks['remove'] = HAS_COST_REMOVE;
        if (item.isLeaf) Object.assign(locks, { unit: HAS_COST_UNIT, addChild: HAS_COST_CHILD });
      }
      if (!item.isLeaf) locks['budget'] = 'بودجهٔ گروه جمع زیرقلم‌هاست (cbs.md ۴.۳).';
      else if (live && !canRevise) locks['budget'] = NEEDS_REVISE_BUDGET;
      if (!item.isLeaf) locks['close'] = 'فقط قلم برگ بسته می‌شود.';
      else if (!live) locks['close'] = 'بستن قلم فقط در پروژهٔ فعال یا متوقف معنا دارد.';
      else if (!hasCost) locks['close'] = 'این قلم هزینهٔ ثبت‌شده ندارد؛ به‌جای بستن، آن را حذف کنید.';
      else if (BigInt(item.budget) <= ac) locks['close'] = 'برآورد این قلم از هزینهٔ واقعی‌اش بیشتر نیست.';
      return {
        ...item,
        postedAc: ac.toString(),
        hasPostedCost: hasCost,
        change: diff.added.has(item.id) ? 'added' : diff.moved.has(item.id) ? 'moved' : diff.changed.has(item.id) ? 'changed' : null,
        changedFields: (diff.changed.get(item.id) ?? []).map((field) => CBS_FIELD_LABELS[field] ?? field),
        budgetChanged: live && diff.budget.has(item.id),
        locks,
      };
    });
    const cbsBudget = cbsBudgetTotal(cbs);
    const bac = bacTotal(cbs, links);
    return {
      draft: state.draft ? await this.planning.summaryOf(state.draft) : null,
      draftRevision: state.draft?.draftRevision ?? 0,
      syncsToCurrent: state.project.status === 'draft',
      budgetNeedsRevision: live,
      items,
      summary: {
        cbsBudget: cbsBudget.toString(),
        currentCbsBudget: cbsBudgetTotal(state.currentCbs).toString(),
        bac: bac.toString(),
        unallocated: (cbsBudget - bac).toString(),
      },
      validation: assessed.validation,
    };
  }
}

function rejectOp(error: CbsOpError): never {
  throw new DomainError('CBS_OP_REJECTED', 422, { opIndex: error.index, code: error.code, message: error.message });
}

/** برگ‌های زیر هر قلم (خود برگ برای برگ). */
function belowMap(nodes: readonly { readonly id: string; readonly parentId: string | null; readonly isLeaf: boolean }[]): Map<string, string[]> {
  const children = new Map<string | null, string[]>();
  for (const node of nodes) children.set(node.parentId, [...(children.get(node.parentId) ?? []), node.id]);
  const leaf = new Map(nodes.map((node) => [node.id, node.isLeaf]));
  const result = new Map<string, string[]>();
  const visit = (id: string): string[] => {
    const cached = result.get(id);
    if (cached) return cached;
    const value = leaf.get(id) ? [id] : (children.get(id) ?? []).flatMap(visit);
    result.set(id, value);
    return value;
  };
  for (const node of nodes) visit(node.id);
  return result;
}
