import type { KeyMilestone } from '../../projects/index.js';
import type { PlanNode } from './plan-node.js';

// ستون‌های برنامه‌ای و محتوای مبنای کاری (F04 ۳؛ project-setup.md ۵.۲). تابع خالص؛ شناسه را فراخواننده می‌دهد.

export const MILESTONE_GROUP_TITLE = 'نقاط عطف کلیدی';

/**
 * نقاط عطف کلیدی ویزارد زیر گروه سطح اول «نقاط عطف کلیدی» با وزن ۰ تا پیشرفت را عوض نکنند و در گانت دیده شوند؛
 * فرزندان هم ۰ (گروه همه‌صفر زیر والد صفر مجاز است، wbs.md ۱۳.۹).
 */
export function baselineNodes(milestones: readonly KeyMilestone[], newId: () => string, position = 0): PlanNode[] {
  const nodes: PlanNode[] = [];
  const dated = milestones.filter((milestone) => milestone.title.trim() && milestone.date);
  if (dated.length > 0) {
    const groupId = newId();
    const dates = dated.map((milestone) => milestone.date).sort();
    nodes.push(
      node({
        id: groupId,
        parentId: null,
        sortOrder: position,
        code: `1.${position + 1}`,
        title: MILESTONE_GROUP_TITLE,
        isLeaf: false,
        plannedStart: dates[0] ?? null,
        plannedFinish: dates.at(-1) ?? null,
      }),
      ...dated.map((milestone, index) =>
        node({
          id: newId(),
          parentId: groupId,
          sortOrder: index,
          code: `1.${position + 1}.${index + 1}`,
          title: milestone.title.trim(),
          isLeaf: true,
          isMilestone: true,
          measurementMethod: 'percent',
          plannedStart: milestone.date,
          plannedFinish: milestone.date,
        }),
      ),
    );
  }
  return nodes;
}

export function node(input: Partial<PlanNode> & Pick<PlanNode, 'id' | 'parentId' | 'sortOrder' | 'code' | 'title' | 'isLeaf'>): PlanNode {
  return {
    codeMode: 'auto',
    isMilestone: false,
    weightInParent: '0.0000',
    plannedStart: null,
    plannedFinish: null,
    unit: null,
    totalQuantity: null,
    measurementMethod: null,
    steps: null,
    isCritical: null,
    totalFloatDays: null,
    ...input,
  };
}

export function planColumns(item: PlanNode) {
  return {
    parentId: item.parentId,
    code: item.code,
    codeMode: item.codeMode,
    title: item.title,
    sortOrder: item.sortOrder,
    isLeaf: item.isLeaf,
    isMilestone: item.isMilestone,
    weightInParent: item.weightInParent,
    plannedStart: item.plannedStart,
    plannedFinish: item.plannedFinish,
    unit: item.unit,
    totalQuantity: item.totalQuantity,
    measurementMethod: item.measurementMethod,
    steps: item.steps ? [...item.steps] : null,
    isCritical: item.isCritical,
    totalFloatDays: item.totalFloatDays,
  };
}
