import type { EntityId } from '@/shared/types/api';
import type { CostType } from '@/shared/types/tone';
import type { LegendEntry } from '@/shared/components/ui/Legend';
import { buildWbsTree, type TreeOf } from '@/modules/wbs/services/wbsTree';
import type { CbsItemDto, CbsItemProgressDto } from '../types';

// نمایش W14 — فقط ساخت درخت، فیلتر و رنگ. هیچ عددی اینجا حساب نمی‌شود (D07):
// درصد مصرف، پیش‌بینی و هشدار از `CbsItemProgress` سرور می‌آیند.

export type CbsTreeNode = TreeOf<CbsItemDto>;

export const buildCbsTree = (items: readonly CbsItemDto[]): CbsTreeNode[] => buildWbsTree(items);

/** فیلترهای سریع cbs.md ۱۲. */
export type CbsQuickFilter = 'all' | 'over90' | 'overBudget' | 'unlinked';

export interface CbsFilters {
  search: string;
  quick: CbsQuickFilter;
  costType: 'all' | CostType;
}

export const EMPTY_CBS_FILTERS: CbsFilters = { search: '', quick: 'all', costType: 'all' };

export function activeCbsFilterCount(filters: CbsFilters): number {
  return (
    (filters.search.trim() ? 1 : 0) +
    (filters.quick !== 'all' ? 1 : 0) +
    (filters.costType !== 'all' ? 1 : 0)
  );
}

const normalize = (value: string) =>
  value.trim().toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک');

/** معیارها همان شمارنده‌های خلاصهٔ سرور‌اند (`summary.counts`). */
function matches(node: CbsItemDto, filters: CbsFilters, query: string): boolean {
  if (query && !normalize(node.title).includes(query) && !node.code.toLowerCase().includes(query))
    return false;
  if (filters.costType !== 'all' && node.costType !== filters.costType) return false;
  if (filters.quick !== 'all' && !node.isLeaf) return false;
  if (filters.quick === 'over90' && (node.progress?.consumedPercent ?? 0) < 90) return false;
  if (filters.quick === 'overBudget' && !node.progress?.alertCodes.includes('AL-CST-02'))
    return false;
  if (filters.quick === 'unlinked' && node.linkCount > 0) return false;
  return true;
}

export interface FilteredCbsTree {
  nodes: CbsTreeNode[];
  matchCount: number;
  contextIds: Set<EntityId>;
  expandIds: Set<EntityId>;
}

export function filterCbsTree(roots: readonly CbsTreeNode[], filters: CbsFilters): FilteredCbsTree {
  const query = normalize(filters.search);
  const contextIds = new Set<EntityId>();
  const expandIds = new Set<EntityId>();
  let matchCount = 0;

  const visit = (node: CbsTreeNode): CbsTreeNode | null => {
    const children = node.children
      .map(visit)
      .filter((child): child is CbsTreeNode => child !== null);
    const self = matches(node, filters, query);
    if (self) matchCount += 1;
    if (!self && children.length === 0) return null;
    if (!self) contextIds.add(node.id);
    if (children.length > 0) expandIds.add(node.id);
    return { ...node, children };
  };

  const nodes = roots.map(visit).filter((node): node is CbsTreeNode => node !== null);
  return { nodes, matchCount, contextIds, expandIds };
}

// ── رنگ مصرف (تصمیم 1405/08/15) ──
// از هشدار سرور: بیش از بودجه قرمز، هشدار باز AL-CST-01/02 نارنجی، بقیه سرمه‌ای.
// آستانهٔ ۷۵٪ بوم حذف شد؛ همان قاعدهٔ کارت W10.

export type ConsumptionTone = 'over' | 'alert' | 'normal' | 'none';

export function consumptionTone(progress: CbsItemProgressDto | null): ConsumptionTone {
  if (!progress || progress.consumedPercent === null) return 'none';
  if (progress.consumedPercent > 100) return 'over';
  if (progress.alertSeverity) return 'alert';
  return 'normal';
}

export const CONSUMPTION_COLOR: Record<ConsumptionTone, string> = {
  over: '#DC2626',
  alert: '#D97706',
  normal: '#2C4A73',
  none: '#D4D4D8',
};

/** نوار وضعیت ردیف `.tree tr.s-*` در kit.css. */
export const CONSUMPTION_ROW_CLASS: Record<ConsumptionTone, string> = {
  over: 's-late',
  alert: 's-warn',
  normal: 's-prog',
  none: 's-none',
};

export const CONSUMPTION_LEGEND: LegendEntry[] = [
  { label: 'عادی', color: CONSUMPTION_COLOR.normal, shape: 'square' },
  { label: 'هشدار هزینه (AL-CST)', color: CONSUMPTION_COLOR.alert, shape: 'square' },
  { label: 'فراتر از بودجه', color: CONSUMPTION_COLOR.over, shape: 'square' },
];

export function ancestorCbsIds(
  byId: ReadonlyMap<EntityId, { parentId: EntityId | null }>,
  id: EntityId,
): EntityId[] {
  const result: EntityId[] = [];
  let current = byId.get(id)?.parentId ?? null;
  while (current) {
    result.push(current);
    current = byId.get(current)?.parentId ?? null;
  }
  return result;
}

export const PRICING_LABEL = { unit_rate: 'نرخ واحد', lump_sum: 'مقطوع' } as const;
