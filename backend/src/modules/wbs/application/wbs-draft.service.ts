import { Injectable } from '@nestjs/common';
import { Clock } from '../../../platform/clock/clock.js';
import { newId } from '../../../platform/database/ids.js';
import { ConflictError, DomainError, NotFoundError } from '../../../platform/http/errors.js';
import { eachDay } from '../../../platform/time/jalali.js';
import { IdentityService } from '../../identity/index.js';
import {
  type ApplyVerdict,
  type CurrentContent,
  type CurrentItem,
  type DraftState,
  leafBacOf,
  type PlanContent,
  type PlanNode,
  PlanningService,
  pruneLinks,
  ScheduleProposals,
} from '../../planning/index.js';
import type { ProjectPlanContext } from '../../projects/index.js';
import { diffPlans, FIELD_LABELS, type PlanDiff, rootSpan } from '../domain/diff.js';
import { applyOps, MSP_OWNED, NO_REPORTS, type OpError, type WbsOp } from '../domain/ops.js';
import { isLeaf, locate, renumber, toForest, toNodes, type TreeNode, walk } from '../domain/tree.js';
import { validateForest, type ValidationIssue } from '../domain/validation.js';
import { type ContentCheckResult, PlanContentChecks } from './plan-checks.js';
import { splitProposals } from './msp-proposals.js';
import { itemView, treeOrder, weightsInProject } from './wbs-view.js';

// نسخهٔ کاری WBS (W12؛ wbs.md ۸، ۱۱؛ plan-versions.md ۵). کمک‌های ویرایش (جمع وزن، پخش خودکار، مولدها،
// اعتبارسنجی) فقط اینجا ساخته می‌شوند و رابط کاربری هیچ جمعی نمی‌زند (تصمیم 1405/08/15؛ ماتریس‌ها ۴).

const SPLIT_PREFIX = 'split:';
const PARENT_DATES = 'تاریخ والد از فرزندانش ساخته می‌شود (wbs.md ۵.۴).';

interface Evaluated {
  readonly nodes: PlanNode[];
  readonly forest: TreeNode[];
  readonly diff: PlanDiff;
  readonly errors: ValidationIssue[];
  readonly warnings: ValidationIssue[];
  readonly changeCount: number;
  /** محتوای کامل پس از عملیات (اتصال‌های برگ‌های حذف‌شده کنار رفته). */
  readonly content: PlanContent;
  readonly extra: ContentCheckResult;
}

@Injectable()
export class WbsDraftService {
  constructor(
    private readonly planning: PlanningService,
    private readonly identity: IdentityService,
    private readonly clock: Clock,
    private readonly checks: PlanContentChecks,
    private readonly proposals: ScheduleProposals,
  ) {}

  /** `GET /projects/:pid/plan-draft/wbs` */
  async tree(projectId: string) {
    const state = await this.editable(projectId);
    return this.respond(state, this.evaluate(state, toForest(state.nodes), 0));
  }

  /** `POST /projects/:pid/plan-draft/wbs/ops/preview` — همان عملیات بی‌نوشتن. */
  async preview(projectId: string, input: { readonly draftRevision: number; readonly ops: readonly WbsOp[] }) {
    const state = await this.editable(projectId);
    this.checkRevision(state, input.draftRevision);
    const forest = toForest(state.nodes);
    const { ops } = splitProposals(state, input.ops);
    const opErrors = applyOps(forest, ops, this.opsContext(state));
    return { ...(await this.respond(state, this.evaluate(state, forest, ops.length))), opErrors };
  }

  /** `POST /projects/:pid/plan-draft/wbs/ops` — ذخیره؛ هر عمل ردشده کل ذخیره را نگه می‌دارد (۴۲۲). */
  async save(projectId: string, input: { readonly draftRevision: number; readonly ops: readonly WbsOp[] }) {
    const state = await this.editable(projectId);
    this.checkRevision(state, input.draftRevision);
    const { ops, proposals } = splitProposals(state, input.ops);
    if (ops.length === 0 && proposals.length > 0) {
      const proposed = await this.proposals.propose(projectId, proposals);
      return { ...(await this.tree(projectId)), idMap: {}, proposed };
    }
    const forest = toForest(state.nodes);
    const errors: OpError[] = applyOps(forest, ops, this.opsContext(state));
    const first = errors[0];
    if (first) throw new DomainError('WBS_OP_REJECTED', 422, { opIndex: first.index, code: first.code, message: first.message });

    // شناسهٔ موقت آیتم‌های تازه ← شناسهٔ واقعی (idMap برای رابط کاربری)
    const temps = new Set(input.ops.flatMap((op) => (op.type === 'add' ? [op.tempId] : op.type === 'split' ? op.parts.map((part) => part.tempId) : [])));
    const idMap: Record<string, string> = {};
    walk(forest, (node) => {
      if (temps.has(node.id) || node.id.startsWith(SPLIT_PREFIX)) {
        idMap[node.id] = newId();
        node.id = idMap[node.id] as string;
      }
    });
    await this.store(state, forest, ops.length, input.draftRevision);
    const proposed = await this.proposals.propose(projectId, proposals);
    return { ...(await this.tree(projectId)), idMap, proposed };
  }

  /** `GET /projects/:pid/plan-draft/validation` */
  async validation(projectId: string) {
    const state = await this.planning.draftState(projectId);
    if (!state.draft) throw new NotFoundError('PLAN_DRAFT_NOT_FOUND');
    return this.validationView(state, this.evaluate(state, toForest(state.nodes), 0));
  }

  /** `GET /projects/:pid/plan-draft/impact` — خلاصهٔ اثر (F04 ۵.۲). */
  async impact(projectId: string) {
    const state = await this.planning.draftState(projectId);
    const result = this.evaluate(state, toForest(state.nodes), 0);
    const fieldCounts = new Map<string, number>();
    for (const fields of result.diff.changed.values()) for (const field of fields) fieldCounts.set(field, (fieldCounts.get(field) ?? 0) + 1);
    const currentFinish = rootSpan(state.current).finish;
    const draftFinish = rootSpan(result.nodes).finish;
    return {
      added: result.diff.added.size,
      removed: result.diff.removed.length,
      moved: result.diff.moved.size,
      changed: result.diff.changed.size,
      changedFields: [...fieldCounts].map(([field, count]) => ({ field, label: FIELD_LABELS[field] ?? field, count })),
      finishShiftDays: shiftDays(currentFinish, draftFinish),
      currentFinish,
      draftFinish,
      // حذف مبلغ با @Amounts مسیر؛ «پیشرفت برنامه‌ای امروز» با محاسبات F10
      bacChange: (sumBac(result.content) - sumBac(currentContent(state))).toString(),
      plannedTodayChange: null,
      needsResolutionCount: result.diff.removed.filter((node) => NO_REPORTS.hasPending(node.id)).length,
      ...(result.extra.impact ? { cbs: result.extra.impact } : {}),
    };
  }

  /** `POST /projects/:pid/plan-draft/apply` — F04 ۵.۳؛ اعتبارسنجی دوباره درون تراکنش و قفل. */
  apply(projectId: string, input: { readonly draftRevision: number; readonly note: string }) {
    return this.planning.apply(projectId, { expectedRevision: input.draftRevision, note: input.note }, (state) => this.verdict(state));
  }

  /** بررسی درون تراکنش اعمال (بازنگری یا مبنا هنگام فعال‌سازی): همان اعتبارسنجی کل نسخه. */
  verdict({
    project,
    draft,
    current,
  }: {
    readonly project: ProjectPlanContext;
    readonly draft: PlanContent;
    readonly current: CurrentContent;
  }): Promise<ApplyVerdict> {
    const state: DraftState = {
      project,
      draft: null,
      current: current.wbs,
      nodes: draft.wbs,
      currentCbs: current.cbs,
      cbs: draft.cbs,
      currentLinks: current.links,
      links: draft.links,
    };
    const result = this.evaluate(state, toForest(draft.wbs), 0, true);
    const span = rootSpan(result.nodes);
    return Promise.resolve({
      error: result.errors[0]?.message ?? null,
      changeCount: result.changeCount,
      ...(result.extra.budgetRevision ? { source: 'budget_revision' as const } : {}),
      summary: {
        added: result.diff.added.size,
        removed: result.diff.removed.length,
        moved: result.diff.moved.size,
        changed: result.diff.changed.size,
        finishShiftDays: shiftDays(rootSpan(current.wbs).finish, span.finish),
      },
      plannedStart: span.start,
      plannedFinish: span.finish,
    });
  }

  /** `DELETE /projects/:pid/plan-draft` */
  discard(projectId: string) {
    return this.planning.discard(projectId);
  }

  /**
   * اعتبارسنجی کل نسخه (WBS + CBS) و شمار تغییر برای حالتی که CBS یا اتصال‌هایش در حافظه عوض شده‌اند — حالت ویرایش
   * CBS و W15 (یک نسخهٔ کاری، یک اعتبارسنجی).
   */
  assess(state: DraftState, opCount = 0) {
    const result = this.evaluate(state, toForest(state.nodes), opCount);
    return { validation: this.validationView(state, result), changeCount: result.changeCount, content: result.content, extra: result.extra };
  }

  // ── مشترک با ورود فایل ──

  async editable(projectId: string): Promise<DraftState> {
    const state = await this.planning.draftState(projectId);
    if (state.project.status === 'completed' || state.project.status === 'archived') {
      throw new ConflictError('PROJECT_READ_ONLY', { status: state.project.status });
    }
    return state;
  }

  checkRevision(state: DraftState, revision: number): void {
    const current = state.draft?.draftRevision ?? 0;
    if (current !== revision) throw new ConflictError('PLAN_DRAFT_STALE', { draftRevision: current });
  }

  /** جنگل ویرایش‌شده ← نسخهٔ کاری (planning). شمار تغییر مبنا با شمار عملیات بالا می‌رود (همان ماک). */
  async store(state: DraftState, forest: TreeNode[], opCount: number, revision: number): Promise<void> {
    renumber(forest);
    const nodes = toNodes(forest);
    const baseline = state.project.status === 'draft';
    const content: PlanContent = { wbs: nodes, cbs: state.cbs, links: pruneLinks({ wbs: nodes, cbs: state.cbs, links: state.links }) };
    const changeCount = baseline
      ? (state.draft?.changeCount ?? 0) + opCount
      : diffPlans(state.current, nodes).count + this.checks.check({ project: state.project, draft: content, current: currentContent(state) }).changeCount;
    await this.planning.saveDraft(state.project.id, { expectedRevision: revision, nodes, links: content.links, changeCount });
  }

  // ── درونی ──

  private opsContext(state: DraftState) {
    return {
      mspLinked: state.project.mspLinked,
      facts: NO_REPORTS,
      calendar: state.project.calendar,
      leafBac: leafBacOf({ wbs: state.nodes, cbs: state.cbs, links: state.links }),
      splitParentId: (leafId: string) => `${SPLIT_PREFIX}${leafId}`,
    };
  }

  private evaluate(state: DraftState, forest: TreeNode[], opCount: number, forApply = false): Evaluated {
    renumber(forest);
    const nodes = toNodes(forest);
    const diff = diffPlans(state.current, nodes);
    const content: PlanContent = { wbs: nodes, cbs: state.cbs, links: pruneLinks({ wbs: nodes, cbs: state.cbs, links: state.links }) };
    const extra = this.checks.check({ project: state.project, draft: content, current: currentContent(state) });
    const own = validateForest(forest, {
      projectStart: state.project.plannedStart,
      projectFinish: state.project.plannedFinish,
      currentMethods: new Map(state.current.map((item) => [item.id, item.measurementMethod])),
      removedIds: diff.removed.map((node) => node.id),
      linkedLeaves: new Set(content.links.map((link) => link.wbsItemId)),
      supervisedLeaves: new Set(state.current.filter((item) => item.supervisorUserId).map((item) => item.id)),
      facts: NO_REPORTS,
    });
    const baseline = state.project.status === 'draft' && !forApply;
    const changeCount = baseline ? (state.draft?.changeCount ?? 0) + opCount : diff.count + extra.changeCount;
    return {
      nodes,
      forest,
      diff,
      errors: [...own.errors, ...extra.errors],
      warnings: [...own.warnings, ...extra.warnings],
      changeCount,
      content,
      extra,
    };
  }

  private validationView(state: DraftState, result: Evaluated) {
    return {
      versionId: state.draft?.id ?? state.project.currentVersionId ?? state.project.id,
      draftRevision: state.draft?.draftRevision ?? 0,
      // «اعمال» فقط بی خطا و با دست‌کم یک تغییر (F04 ۱۳.۷)
      canApply: result.errors.length === 0 && result.changeCount > 0,
      errors: result.errors,
      warnings: result.warnings,
      checkedAt: this.clock.now().toISOString(),
    };
  }

  private async respond(state: DraftState, result: Evaluated) {
    const current = new Map<string, CurrentItem>(state.current.map((item) => [item.id, item]));
    const people = await this.identity.personRefs(state.current.flatMap((item) => (item.supervisorUserId ? [item.supervisorUserId] : [])));
    const weights = weightsInProject(result.nodes);
    const bac = bacByItem(result.nodes, leafBacOf(result.content));
    const leafById = new Map<string, TreeNode>();
    walk(result.forest, (node) => leafById.set(node.id, node));
    // پیشنهادهای باز «در انتظار MSP» (G4)
    const pending = new Map<string, Record<string, string | null>>();
    if (state.project.mspLinked) {
      for (const proposal of await this.proposals.open(state.project.id)) {
        pending.set(proposal.wbsItemId, { ...(pending.get(proposal.wbsItemId) ?? {}), [proposal.field]: proposal.proposedValue });
      }
    }
    const items = treeOrder(result.nodes).map((node) => {
      const locks: Record<string, string> = {};
      if (state.project.mspLinked) Object.assign(locks, { structure: MSP_OWNED });
      if (!node.isLeaf) Object.assign(locks, { plannedStart: PARENT_DATES, plannedFinish: PARENT_DATES });
      const tree = leafById.get(node.id);
      return {
        ...itemView(node, { weightInProject: weights.get(node.id) ?? 0, current: current.get(node.id), people }),
        locks,
        hasReports: false,
        hasApprovedProgress: false,
        approvedQuantity: null,
        change: result.diff.added.has(node.id) ? 'added' : result.diff.moved.has(node.id) ? 'moved' : result.diff.changed.has(node.id) ? 'changed' : null,
        bac: (bac.get(node.id) ?? 0n).toString(),
        stepsDone: tree && isLeaf(tree) ? (tree.stepsDone ?? null) : null,
        mspPending: pending.get(node.id) ?? null,
      };
    });
    return {
      draft: state.draft ? await this.planning.summaryOf(state.draft) : null,
      draftRevision: state.draft?.draftRevision ?? 0,
      syncsToCurrent: state.project.status === 'draft',
      mspLinked: state.project.mspLinked,
      items,
      validation: this.validationView(state, result),
      rootWeightSum: result.forest.reduce((sum, node) => sum + node.weight, 0) / 10_000,
    };
  }

  /** آیتم مقصد «افزودن زیر یک آیتم» (wbs.md ۶.۲). */
  locateTarget(forest: TreeNode[], parentId: string): TreeNode {
    const found = locate(forest, parentId);
    if (!found) throw new NotFoundError('WBS_ITEM_NOT_FOUND');
    return found.node;
  }

  projectOf(state: DraftState): ProjectPlanContext {
    return state.project;
  }
}

/** روز تقویمی میان دو پایان؛ مثبت = دیرتر. */
function shiftDays(from: string | null, to: string | null): number {
  if (!from || !to) return 0;
  return from <= to ? eachDay(from, to).length - 1 : -(eachDay(to, from).length - 1);
}

function currentContent(state: DraftState): PlanContent {
  return { wbs: state.current, cbs: state.currentCbs, links: state.currentLinks };
}

function sumBac(content: PlanContent): bigint {
  return [...leafBacOf(content).values()].reduce((sum, value) => sum + value, 0n);
}

/** BAC برگ از اتصال‌ها؛ والد جمع فرزندان (ب6). */
export function bacByItem(nodes: readonly PlanNode[], leafBac: ReadonlyMap<string, bigint>): Map<string, bigint> {
  const result = new Map<string, bigint>();
  const children = new Map<string | null, PlanNode[]>();
  for (const node of nodes) children.set(node.parentId, [...(children.get(node.parentId) ?? []), node]);
  const of = (node: PlanNode): bigint => {
    const value = node.isLeaf ? (leafBac.get(node.id) ?? 0n) : (children.get(node.id) ?? []).reduce((sum, child) => sum + of(child), 0n);
    result.set(node.id, value);
    return value;
  };
  for (const root of children.get(null) ?? []) of(root);
  return result;
}
