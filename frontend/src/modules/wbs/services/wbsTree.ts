import type { WbsProgressStatus } from '@/config/constants';
import type { EntityId } from '@/shared/types/api';
import type { WbsItemDto, WbsTreeNode } from '../types';

// ساخت درخت از فهرست تخت و فیلتر کردن آن — کار نمایشی، نه محاسبهٔ کسب‌وکاری.
// `features/wbs.md` ۱۲: «API فهرست تخت با parentId و sortOrder برمی‌گرداند و درخت
// در کلاینت ساخته می‌شود.» هیچ عددی اینجا ساخته یا تجمیع نمی‌شود.

export type TreeOf<T> = T & { children: Array<TreeOf<T>> };

export function buildWbsTree<T extends Pick<WbsItemDto, 'id' | 'parentId' | 'sortOrder'>>(
  items: readonly T[],
): Array<TreeOf<T>> {
  const nodes = new Map<EntityId, TreeOf<T>>();
  for (const item of items) nodes.set(item.id, { ...item, children: [] });

  const roots: Array<TreeOf<T>> = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sort = (list: Array<TreeOf<T>>) => {
    list.sort((a, b) => a.sortOrder - b.sortOrder);
    list.forEach((node) => sort(node.children));
  };
  sort(roots);
  return roots;
}

/** شناسهٔ همهٔ والدها — برای «گسترش همه». */
export function parentIds(items: readonly WbsItemDto[]): Set<EntityId> {
  return new Set(items.filter((item) => !item.isLeaf).map((item) => item.id));
}

/** نیاکان یک آیتم، از والد مستقیم به بالا. */
export function ancestorIds(items: ReadonlyMap<EntityId, WbsItemDto>, id: EntityId): EntityId[] {
  const result: EntityId[] = [];
  let current = items.get(id)?.parentId ?? null;
  while (current) {
    result.push(current);
    current = items.get(current)?.parentId ?? null;
  }
  return result;
}

// ── فیلترها (W11، `features/wbs.md` ۸) ──

/** «تأخیردار» = هشدار یا بحرانی؛ میان‌بُر فیلتر، نه وضعیت جدید. */
export type WbsStatusFilter = 'all' | 'delayed' | WbsProgressStatus;
export type WbsKindFilter = 'all' | 'leaf' | 'parent';
/** `none` = برگ بدون سرپرست (AL-STR-04). */
export type WbsSupervisorFilter = 'all' | 'none' | EntityId;

export interface WbsFilters {
  search: string;
  status: WbsStatusFilter;
  supervisor: WbsSupervisorFilter;
  kind: WbsKindFilter;
}

export const EMPTY_WBS_FILTERS: WbsFilters = {
  search: '',
  status: 'all',
  supervisor: 'all',
  kind: 'all',
};

export function activeFilterCount(filters: WbsFilters): number {
  return (
    (filters.search.trim() ? 1 : 0) +
    (filters.status !== 'all' ? 1 : 0) +
    (filters.supervisor !== 'all' ? 1 : 0) +
    (filters.kind !== 'all' ? 1 : 0)
  );
}

/** یکسان‌سازی حروف عربی/فارسی و نیم‌فاصله برای جستجو. */
function normalize(text: string): string {
  return text
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[‌‏‎]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function matches(item: WbsItemDto, filters: WbsFilters, query: string): boolean {
  if (query && !normalize(item.title).includes(query) && !item.code.toLowerCase().startsWith(query))
    return false;

  if (filters.kind === 'leaf' && !item.isLeaf) return false;
  if (filters.kind === 'parent' && item.isLeaf) return false;

  if (filters.status !== 'all') {
    const status = item.progress?.status;
    if (!status) return false;
    if (
      filters.status === 'delayed'
        ? status !== 'warning' && status !== 'critical'
        : status !== filters.status
    ) {
      return false;
    }
  }

  if (filters.supervisor !== 'all') {
    // سرپرست فقط برای برگ معنا دارد
    if (!item.isLeaf || item.measurementMethod === 'time_based') return false;
    if (
      filters.supervisor === 'none'
        ? item.supervisor !== null
        : item.supervisor?.id !== filters.supervisor
    ) {
      return false;
    }
  }

  return true;
}

export interface FilteredTree {
  nodes: WbsTreeNode[];
  /** آیتم‌هایی که خودشان شرط را دارند. */
  matchCount: number;
  /** والدهایی که فقط برای نشان دادن جای نتیجه آمده‌اند. */
  contextIds: Set<EntityId>;
  /** والدهای درخت فیلترشده — همه باز می‌شوند تا نتیجه دیده شود. */
  expandIds: Set<EntityId>;
}

/**
 * نتیجه + نیاکانش. والدی که خودش شرط را ندارد «زمینه» است و کم‌رنگ دیده می‌شود
 * (مثلاً با فیلتر «برگ‌ها» همهٔ والدها زمینه‌اند).
 */
export function filterWbsTree(roots: readonly WbsTreeNode[], filters: WbsFilters): FilteredTree {
  const query = normalize(filters.search);
  const contextIds = new Set<EntityId>();
  const expandIds = new Set<EntityId>();
  let matchCount = 0;

  const visit = (node: WbsTreeNode): WbsTreeNode | null => {
    const children = node.children
      .map(visit)
      .filter((child): child is WbsTreeNode => child !== null);
    const self = matches(node, filters, query);
    if (self) matchCount += 1;
    if (!self && children.length === 0) return null;
    if (!self) contextIds.add(node.id);
    if (children.length > 0) expandIds.add(node.id);
    return { ...node, children };
  };

  const nodes = roots.map(visit).filter((node): node is WbsTreeNode => node !== null);
  return { nodes, matchCount, contextIds, expandIds };
}

/** سرپرستان یکتای برگ‌ها، به ترتیب نام — گزینه‌های فیلتر «سرپرست». */
export function supervisorsOf(
  items: readonly WbsItemDto[],
): Array<{ id: EntityId; fullName: string }> {
  const map = new Map<EntityId, string>();
  for (const item of items)
    if (item.supervisor) map.set(item.supervisor.id, item.supervisor.fullName);
  return [...map.entries()]
    .map(([id, fullName]) => ({ id, fullName }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'fa'));
}
