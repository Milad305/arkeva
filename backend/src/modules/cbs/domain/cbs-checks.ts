import { allocationState, linkSubBudget } from '../../computation/index.js';
import type { CbsNode, LinkNode } from '../../planning/index.js';
import { allocationsOf, budgetOf, type CbsTreeNode, faNum, faRial, isCbsLeaf, MAX_CBS_DEPTH, toCbsForest, walkCbs } from './cbs-tree.js';

// بخش CBS اعتبارسنجی نسخهٔ کاری (plan-versions.md ۵.۱: V-07، V-08؛ cbs.md ۵.۲: W-06) و تفاوت CBS و اتصال‌ها با
// جاری (۵.۲، ۷.۴). تابع خالص.

export interface CbsIssue {
  readonly code: 'cbs_over_allocated' | 'cbs_invalid_pricing' | 'cbs_duplicate_code' | 'cbs_unallocated' | 'tree_integrity';
  readonly severity: 'error' | 'warning';
  readonly rule: string;
  readonly message: string;
  readonly wbsItemId: null;
  readonly cbsItemId: string | null;
}

export function validateCbs(forest: readonly CbsTreeNode[], links: readonly LinkNode[], live: boolean): { errors: CbsIssue[]; warnings: CbsIssue[] } {
  const errors: CbsIssue[] = [];
  const warnings: CbsIssue[] = [];
  const allocations = allocationsOf(forest, links);
  const codes = new Map<string, number>();
  const unallocated: { id: string; amount: bigint }[] = [];
  let tooDeep = false;

  walkCbs(forest, (node, _parent, _index, depth) => {
    codes.set(node.code, (codes.get(node.code) ?? 0) + 1);
    if (depth > MAX_CBS_DEPTH) tooDeep = true;
    if (!isCbsLeaf(node)) return;
    const label = `«${node.code} ${node.title}»`;
    const push = (list: CbsIssue[], severity: 'error' | 'warning', code: CbsIssue['code'], rule: string, message: string) =>
      list.push({ code, rule, severity, message, wbsItemId: null, cbsItemId: node.id });

    if (!node.pricing) push(errors, 'error', 'cbs_invalid_pricing', 'V-08', `قلم ${label} شیوهٔ قیمت ندارد.`);
    else if (node.pricing === 'unit_rate' && (!node.unit || !node.qty || !node.rate)) {
      push(errors, 'error', 'cbs_invalid_pricing', 'V-08', `قلم نرخ واحد ${label} واحد، مقدار برآورد یا نرخ ندارد.`);
    } else if (node.pricing === 'lump_sum' && !node.lump) push(errors, 'error', 'cbs_invalid_pricing', 'V-08', `قلم مقطوع ${label} مبلغ ندارد.`);
    if (!node.pricing) return;

    const budget = budgetOf(node);
    const allocation = allocations.get(node.id) ?? { allocated: 0n, linkCount: 0 };
    const state = allocationState(budget, allocation.allocated, allocation.linkCount);
    if (state === 'over') {
      const over = allocation.allocated - budget;
      const revision = live ? ' (بازنگری بودجه)' : '';
      // دو راه اصلاح (AC-CBS-04)
      const fixes =
        node.pricing === 'unit_rate' && node.rate
          ? `مقدار برآورد را به ${faNum((Number(allocation.allocated) / Number(node.rate)).toFixed(4).replace(/\.?0+$/, ''))} ${node.unit ?? ''} برسانید${revision} یا مقدار اتصال‌ها را در «اتصالات» کم کنید.`
          : `مبلغ قلم را به ${faRial(allocation.allocated)} برسانید${revision} یا مبلغ اتصال‌ها را در «اتصالات» کم کنید.`;
      push(errors, 'error', 'cbs_over_allocated', 'V-08', `تخصیص ${label} ${faRial(over)} بیشتر از برآورد است. ${fixes}`);
    } else if (state === 'under') unallocated.push({ id: node.id, amount: budget - allocation.allocated });
  });

  if (tooDeep)
    errors.push({
      code: 'tree_integrity',
      rule: 'V-07',
      severity: 'error',
      message: `CBS بیش از ${faNum(MAX_CBS_DEPTH)} سطح دارد؛ چند سطح را یکی کنید.`,
      wbsItemId: null,
      cbsItemId: null,
    });
  for (const [code, count] of codes) {
    if (count > 1)
      errors.push({ code: 'cbs_duplicate_code', rule: 'V-07', severity: 'error', message: `کد ${code} در CBS تکراری است.`, wbsItemId: null, cbsItemId: null });
  }
  if (unallocated.length > 0) {
    const total = unallocated.reduce((sum, entry) => sum + entry.amount, 0n);
    warnings.push({
      code: 'cbs_unallocated',
      rule: 'W-06',
      severity: 'warning',
      message: `${faNum(unallocated.length)} قلم CBS روی‌هم ${faRial(total)} بودجهٔ تخصیص‌نیافته دارند؛ این مبلغ در BAC نیست و EV نمی‌گیرد.`,
      wbsItemId: null,
      cbsItemId: unallocated.length === 1 ? (unallocated[0]?.id ?? null) : null,
    });
  }
  return { errors, warnings };
}

const BUDGET_FIELDS = ['pricing', 'unit', 'rate', 'qty', 'lump'] as const;
export const CBS_FIELD_LABELS: Record<string, string> = {
  title: 'عنوان',
  code: 'کد',
  costType: 'نوع هزینه',
  supplier: 'تأمین‌کننده',
  pricing: 'شیوهٔ قیمت',
  unit: 'واحد',
  rate: 'نرخ واحد',
  qty: 'مقدار برآورد',
  lump: 'مبلغ مقطوع',
};

function fieldsOf(node: CbsNode): Record<string, string> {
  return {
    title: node.title,
    code: node.code,
    costType: node.costType,
    supplier: node.supplierNote ?? '',
    pricing: node.pricingMode ?? '',
    unit: node.unit ?? '',
    rate: node.unitRate ?? '',
    qty: node.estimatedQuantity === null ? '' : Number(node.estimatedQuantity).toString(),
    lump: node.lumpSumAmount ?? '',
  };
}

export interface CbsDiff {
  readonly added: ReadonlySet<string>;
  readonly removed: readonly CbsNode[];
  readonly moved: ReadonlySet<string>;
  readonly changed: ReadonlyMap<string, readonly string[]>;
  /** برگ‌هایی که نرخ، مقدار یا مبلغشان عوض شد (یا افزوده و حذف شدند) — بازنگری بودجه (۷.۱). */
  readonly budget: ReadonlySet<string>;
  readonly linkAdded: ReadonlySet<string>;
  readonly linkChanged: ReadonlySet<string>;
  readonly linkRemoved: number;
  /** شمار تغییر CBS و اتصال‌ها (حذف یک شاخه یک تغییر). */
  readonly count: number;
}

export const linkKeyOf = (link: { wbsItemId: string; cbsItemId: string }): string => `${link.wbsItemId}|${link.cbsItemId}`;

export function diffCbs(current: readonly CbsNode[], draft: readonly CbsNode[], currentLinks: readonly LinkNode[], draftLinks: readonly LinkNode[]): CbsDiff {
  const before = new Map(current.map((node) => [node.id, node]));
  const after = new Map(draft.map((node) => [node.id, node]));
  const added = new Set<string>();
  const moved = new Set<string>();
  const changed = new Map<string, string[]>();
  const budget = new Set<string>();
  for (const [id, node] of after) {
    const old = before.get(id);
    if (!old) {
      added.add(id);
      if (node.isLeaf) budget.add(id);
      continue;
    }
    if (old.parentId !== node.parentId) moved.add(id);
    const now = fieldsOf(node);
    const then = fieldsOf(old);
    const fields = Object.keys(now).filter((key) => now[key] !== then[key]);
    if (fields.length > 0) changed.set(id, fields);
    if (node.isLeaf && fields.some((field) => (BUDGET_FIELDS as readonly string[]).includes(field))) budget.add(id);
  }
  const removed = current.filter((node) => !after.has(node.id));
  for (const node of removed) if (node.isLeaf) budget.add(node.id);
  const removedTop = removed.filter((node) => !node.parentId || after.has(node.parentId) || !before.has(node.parentId));

  const oldLinks = new Map(currentLinks.map((link) => [linkKeyOf(link), link]));
  const newKeys = new Set(draftLinks.map(linkKeyOf));
  const linkAdded = new Set<string>();
  const linkChanged = new Set<string>();
  for (const link of draftLinks) {
    const old = oldLinks.get(linkKeyOf(link));
    if (!old) linkAdded.add(linkKeyOf(link));
    else if (Number(old.quantity ?? 0) !== Number(link.quantity ?? 0) || (old.allocatedAmount ?? '') !== (link.allocatedAmount ?? ''))
      linkChanged.add(linkKeyOf(link));
  }
  const linkRemoved = currentLinks.filter((link) => !newKeys.has(linkKeyOf(link))).length;
  return {
    added,
    removed,
    moved,
    changed,
    budget,
    linkAdded,
    linkChanged,
    linkRemoved,
    count: added.size + removedTop.length + moved.size + changed.size + linkAdded.size + linkChanged.size + linkRemoved,
  };
}

/** بودجهٔ کل CBS (جمع برگ‌ها). */
export function cbsBudgetTotal(nodes: readonly CbsNode[]): bigint {
  return toCbsForest(nodes).reduce((sum, node) => sum + budgetOf(node), 0n);
}

/** BAC پروژه = Σ زیربودجهٔ اتصال‌ها (OD-13). */
export function bacTotal(cbs: readonly CbsNode[], links: readonly LinkNode[]): bigint {
  const items = new Map(cbs.map((node) => [node.id, node]));
  return links.reduce((sum, link) => {
    const item = items.get(link.cbsItemId);
    return item ? sum + linkSubBudget(item, link) : sum;
  }, 0n);
}
