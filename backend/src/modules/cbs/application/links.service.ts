import { Injectable } from '@nestjs/common';
import { linkSubBudget } from '../../computation/index.js';
import { DomainError } from '../../../platform/http/errors.js';
import { IdentityService } from '../../identity/index.js';
import { type CbsNode, type DraftState, leafBacOf, type LinkNode, type PlanNode, PlanningService } from '../../planning/index.js';
import { bacByItem, treeOrder, WbsDraftService, weightsInProject } from '../../wbs/index.js';
import { linkKeyOf } from '../domain/cbs-checks.js';
import { applyLinkOps, type LinkOp, type LinkOpError } from '../domain/link-ops.js';
import { cbsItemViews } from './cbs-view.js';

// W15 — اتصال WBS ↔ CBS (cbs.md ۵، ۱۲، ۱۴). اتصال جزء نسخهٔ برنامه است (D05) و W15 خودش ویرایشگر همان نسخهٔ
// کاری است (تصمیم 1405/08/15). زیربودجه، BAC برگ، سهم و تعادل همه اینجا ساخته می‌شوند (D07).

/** اختلاف کمتر از ۰٫۱ واحد درصد «متعادل» (تصمیم 1405/08/15). */
const BALANCED_BELOW = 0.1;
/** AL-STR-03 — پیش‌فرض ۱ واحد درصد؛ پارامتر سازمانی با برش هشدارها. */
const IMBALANCE_PARAM = 1;

const round4 = (value: number): number => Math.round(value * 10_000) / 10_000;

@Injectable()
export class LinksService {
  constructor(
    private readonly planning: PlanningService,
    private readonly wbs: WbsDraftService,
    private readonly identity: IdentityService,
  ) {}

  /** `GET /projects/:pid/links` — برنامهٔ جاری، فقط خواندن. */
  async current(projectId: string) {
    const state = await this.planning.draftState(projectId);
    return this.view(state, 'current', { wbs: state.current, cbs: state.currentCbs, links: state.currentLinks }, null);
  }

  /** `GET /projects/:pid/plan-draft/links` — هم‌شکل `plan-draft/wbs` `[پیش‌فرض فنی]`. */
  async draft(projectId: string) {
    const state = await this.wbs.editable(projectId);
    return this.draftView(state, 0);
  }

  /** `POST /projects/:pid/plan-draft/links/ops/preview` */
  async preview(projectId: string, input: { readonly draftRevision: number; readonly ops: readonly LinkOp[] }) {
    const state = await this.wbs.editable(projectId);
    this.wbs.checkRevision(state, input.draftRevision);
    const { links, errors } = applyLinkOps([...state.links], input.ops, state.nodes, state.cbs);
    return { ...(await this.draftView({ ...state, links }, input.ops.length)), opErrors: errors };
  }

  /** `POST /projects/:pid/plan-draft/links/ops` — هر عمل ردشده کل ذخیره را نگه می‌دارد (۴۲۲). */
  async save(projectId: string, input: { readonly draftRevision: number; readonly ops: readonly LinkOp[] }) {
    const state = await this.wbs.editable(projectId);
    this.wbs.checkRevision(state, input.draftRevision);
    await this.commit(state, input.ops, input.draftRevision);
    return this.draft(projectId);
  }

  async commit(state: DraftState, ops: readonly LinkOp[], revision: number, reject: (error: LinkOpError) => never = rejectOp): Promise<void> {
    const { links, errors } = applyLinkOps([...state.links], ops, state.nodes, state.cbs);
    if (errors[0]) reject(errors[0]);
    const assessed = this.wbs.assess({ ...state, links }, ops.length);
    await this.planning.saveDraft(state.project.id, { expectedRevision: revision, links: assessed.content.links, changeCount: assessed.changeCount });
  }

  private async draftView(state: DraftState, opCount: number) {
    const assessed = this.wbs.assess(state, opCount);
    return this.view(state, 'draft', assessed.content, assessed.validation);
  }

  private async view(
    state: DraftState,
    source: 'draft' | 'current',
    content: { readonly wbs: readonly PlanNode[]; readonly cbs: readonly CbsNode[]; readonly links: readonly LinkNode[] },
    validation: ReturnType<WbsDraftService['assess']>['validation'] | null,
  ) {
    const supervisors = new Map(state.current.map((item) => [item.id, item.supervisorUserId]));
    const people = await this.identity.personRefs(state.current.flatMap((item) => (item.supervisorUserId ? [item.supervisorUserId] : [])));
    const weights = weightsInProject(content.wbs);
    const leafBac = leafBacOf(content);
    const bac = bacByItem(content.wbs, leafBac);
    const projectBac = [...leafBac.values()].reduce((sum, value) => sum + value, 0n);
    const cbsById = new Map(content.cbs.map((node) => [node.id, node]));
    const before = source === 'draft' ? new Map(state.currentLinks.map((link) => [linkKeyOf(link), link])) : null;

    const linkCount = new Map<string, number>();
    for (const link of content.links) linkCount.set(link.wbsItemId, (linkCount.get(link.wbsItemId) ?? 0) + 1);
    const leaves = treeOrder(content.wbs).map((node) => {
      const own = bac.get(node.id) ?? 0n;
      const share = projectBac > 0n ? round4((Number(own) / Number(projectBac)) * 100) : null;
      const weight = weights.get(node.id) ?? 0;
      const diff = share === null ? null : round4(Math.abs(weight - share));
      const supervisorId = supervisors.get(node.id) ?? null;
      return {
        id: node.id,
        parentId: node.parentId,
        code: node.code,
        title: node.title,
        sortOrder: node.sortOrder,
        isLeaf: node.isLeaf,
        isMilestone: node.isMilestone,
        unit: node.unit,
        totalQuantity: node.totalQuantity === null ? null : Number(node.totalQuantity),
        weightInProject: weight,
        supervisorName: supervisorId ? (people.get(supervisorId)?.fullName ?? null) : null,
        linkedLeaves: 0,
        linkableLeaves: 0,
        linkCount: node.isLeaf ? (linkCount.get(node.id) ?? 0) : 0,
        bac: own.toString(),
        budgetSharePercent: share,
        balanceDiff: diff,
        balanced: diff !== null && diff < BALANCED_BELOW,
        linkable: node.isLeaf && !node.isMilestone,
      };
    });

    // شمارندهٔ والد: برگ‌های دارای اتصال / برگ‌های اتصال‌پذیر زیرشاخه
    const byId = new Map(leaves.map((leaf) => [leaf.id, leaf]));
    for (const leaf of leaves) {
      if (!leaf.linkable) continue;
      for (let parent = leaf.parentId ? byId.get(leaf.parentId) : undefined; parent; parent = parent.parentId ? byId.get(parent.parentId) : undefined) {
        parent.linkableLeaves += 1;
        if (leaf.linkCount > 0) parent.linkedLeaves += 1;
      }
    }

    const links = content.links.flatMap((link) => {
      const item = cbsById.get(link.cbsItemId);
      if (!item) return [];
      const subBudget = linkSubBudget(item, link);
      const leafTotal = leafBac.get(link.wbsItemId) ?? 0n;
      const old = before?.get(linkKeyOf(link));
      return [
        {
          wbsItemId: link.wbsItemId,
          cbsItemId: link.cbsItemId,
          quantity: link.quantity === null ? null : Number(link.quantity),
          amount: link.allocatedAmount,
          subBudget: subBudget.toString(),
          sharePercent: leafTotal > 0n ? round4((Number(subBudget) / Number(leafTotal)) * 100) : null,
          change: before
            ? !old
              ? 'added'
              : Number(old.quantity ?? 0) !== Number(link.quantity ?? 0) || (old.allocatedAmount ?? '') !== (link.allocatedAmount ?? '')
                ? 'changed'
                : null
            : null,
        },
      ];
    });

    const linkable = leaves.filter((leaf) => leaf.linkable);
    return {
      source,
      draft: state.draft ? await this.planning.summaryOf(state.draft) : null,
      draftRevision: state.draft?.draftRevision ?? 0,
      syncsToCurrent: state.project.status === 'draft',
      leaves,
      links,
      cbsItems: cbsItemViews(content.cbs, content.links)
        .filter((item) => item.isLeaf)
        .map((item) => ({
          id: item.id,
          code: item.code,
          title: item.title,
          costType: item.costType,
          pricingMode: item.pricingMode,
          unit: item.unit,
          unitRate: item.pricingMode === 'unit_rate' ? item.unitRate : null,
          budget: item.budget,
          unallocated: item.unallocated,
        })),
      summary: {
        leafCount: linkable.length,
        linkedCount: linkable.filter((leaf) => leaf.linkCount > 0).length,
        unlinkedCount: linkable.filter((leaf) => leaf.linkCount === 0).length,
        imbalancedCount: linkable.filter((leaf) => (leaf.balanceDiff ?? 0) > IMBALANCE_PARAM).length,
        projectBac: projectBac.toString(),
      },
      validation,
    };
  }
}

function rejectOp(error: LinkOpError): never {
  throw new DomainError('CBS_OP_REJECTED', 422, { opIndex: error.index, code: error.code, message: error.message });
}
