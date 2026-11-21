import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../platform/http/errors.js';
import { ProgressReads } from '../../computation/reads.js';
import { IdentityService } from '../../identity/index.js';
import { type CurrentItem, PlanningService } from '../../planning/index.js';
import { ProjectPlanAccess, ProjectRiskCounts } from '../../projects/index.js';
import { toUnits, WEIGHT_SCALE } from '../domain/tree.js';
import { itemView, treeOrder, weightsInProject } from './wbs-view.js';

// درخت جاری و جزئیات آیتم (W11؛ wbs.md ۸، ۱۱). پیشرفت از WbsItemProgress (F10)؛ اتصال‌های CBS (F05)، گزارش‌های
// کارگاه (F09) و ریسک‌ها (F14) با برش خودشان پر می‌شوند؛ تا آن موقع تهی و صفرند.

@Injectable()
export class WbsReads {
  constructor(
    private readonly planning: PlanningService,
    private readonly projects: ProjectPlanAccess,
    private readonly identity: IdentityService,
    private readonly progress: ProgressReads,
    private readonly risks: ProjectRiskCounts,
  ) {}

  /** `GET /projects/:pid/wbs?include=progress` — فهرست تخت (wbs.md ۱۲). */
  async tree(projectId: string) {
    // پروژهٔ پیش‌نویس بی مبنای کاری همین‌جا مبنا می‌گیرد (F04 ۳)
    const state = await this.planning.draftState(projectId);
    const items = state.current;
    const [people, progress, project] = await Promise.all([this.people(items), this.progress.items(projectId), this.progress.project(projectId)]);
    const weights = weightsInProject(items);
    const byId = new Map(items.map((item) => [item.id, item]));
    const leaves = items.filter((item) => item.isLeaf);
    return {
      projectId,
      versionId: state.project.currentVersionId ?? (state.project.status === 'draft' ? (state.draft?.id ?? null) : null),
      dataDate: project?.dataDate ?? null,
      computedAt: project?.computedAt ?? null,
      computeState: project?.computeState ?? null,
      items: treeOrder(items).map((node) =>
        itemView(node, { weightInProject: weights.get(node.id) ?? 0, current: byId.get(node.id), people, progress: progress.get(node.id) }),
      ),
      summary: {
        totalItems: items.length,
        leafCount: leaves.length,
        parentCount: items.length - leaves.length,
        milestoneCount: leaves.filter((item) => item.isMilestone).length,
        rootWeightSum: items.filter((item) => item.parentId === null).reduce((sum, item) => sum + toUnits(item.weightInParent), 0) / WEIGHT_SCALE,
      },
    };
  }

  /** `GET /projects/:pid/wbs/:itemId` */
  async item(projectId: string, itemId: string) {
    await this.projects.context(projectId);
    const items = await this.planning.currentItems(projectId);
    const byId = new Map(items.map((item) => [item.id, item]));
    const item = byId.get(itemId);
    if (!item) throw new NotFoundError('WBS_ITEM_NOT_FOUND');
    const path: { id: string; code: string; title: string }[] = [];
    for (let parent = item.parentId ? byId.get(item.parentId) : undefined; parent; parent = parent.parentId ? byId.get(parent.parentId) : undefined) {
      path.unshift({ id: parent.id, code: parent.code, title: parent.title });
    }
    const below = (id: string): CurrentItem[] => items.filter((entry) => entry.parentId === id).flatMap((child) => [child, ...below(child.id)]);
    const descendants = below(item.id);
    const [people, progress, risks] = await Promise.all([this.people([item]), this.progress.items(projectId), this.risks.openByWbsItem(projectId)]);
    return {
      item: itemView(item, { weightInProject: weightsInProject(items).get(item.id) ?? 0, current: item, people, progress: progress.get(item.id) }),
      path,
      childCount: items.filter((entry) => entry.parentId === item.id).length,
      leafCountBelow: descendants.filter((entry) => entry.isLeaf).length,
      stepsProgress: item.measurementMethod === 'steps' && item.steps ? item.steps.map((step) => ({ ...step, approvedPercent: 0 })) : null,
      cbsLinks: [],
      reports: { total: 0, recent: [] },
      openRiskCount: risks.get(item.id) ?? 0,
    };
  }

  private people(items: readonly CurrentItem[]) {
    return this.identity.personRefs(items.flatMap((item) => (item.supervisorUserId ? [item.supervisorUserId] : [])));
  }
}
