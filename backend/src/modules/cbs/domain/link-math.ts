import { divRoundHalfUp, linkSubBudget, quantityScaled } from '../../computation/index.js';
import type { LinkNode } from '../../planning/index.js';
import type { CbsTreeNode } from './cbs-tree.js';

// بازسازی اتصال‌های یک قلم پس از «بستن قلم» یا تغییر شیوهٔ قیمت (cbs.md ۴.۴؛ تصمیم‌های 1405/08/15). تابع خالص.

/** «بستن قلم»: اتصال‌ها به نسبت کم می‌شوند تا تخصیص = برآورد تازه `[پیشنهاد تأییدشده 1405/08/15]`. */
export function scaleLinks(node: CbsTreeNode, links: readonly LinkNode[]): LinkNode[] {
  const mine = links.filter((link) => link.cbsItemId === node.id);
  if (mine.length === 0) return [...links];
  const unitRate = node.pricing === 'unit_rate';
  const values = mine.map((link) => (unitRate ? (quantityScaled(link.quantity) ?? 0n) : BigInt(link.allocatedAmount ?? '0')));
  const allocated = values.reduce((sum, value) => sum + value, 0n);
  const target = unitRate ? (quantityScaled(node.qty) ?? 0n) : BigInt(node.lump ?? '0');
  if (allocated <= target || allocated === 0n) return [...links];
  let assigned = 0n;
  const scaled = values.map((value, index) => {
    const next = index === values.length - 1 ? target - assigned : (value * target) / allocated;
    assigned += next;
    return next;
  });
  const format = (value: bigint) => `${value / 10_000n}.${(value % 10_000n).toString().padStart(4, '0')}`;
  return links
    .map((link) => {
      const index = mine.indexOf(link);
      if (index < 0) return link;
      const value = scaled[index] as bigint;
      if (value <= 0n) return { ...link, quantity: null, allocatedAmount: null };
      return unitRate ? { ...link, quantity: format(value) } : { ...link, allocatedAmount: value.toString() };
    })
    .filter((link) => link.quantity !== null || link.allocatedAmount !== null);
}

/** تغییر شیوهٔ قیمت قلم: هر اتصال همان زیربودجه را نگه می‌دارد. مقدار با نرخ تازه گرد نیمه به بالا تا چهار رقم. */
export function convertLinks(links: LinkNode[], node: CbsTreeNode, before: Parameters<typeof linkSubBudget>[0]): LinkNode[] {
  return links.flatMap((link) => {
    if (link.cbsItemId !== node.id) return [link];
    const subBudget = linkSubBudget(before, link);
    if (subBudget <= 0n) return [];
    if (node.pricing === 'lump_sum') return [{ ...link, quantity: null, allocatedAmount: subBudget.toString() }];
    if (!node.rate) return [];
    const scaled = divRoundHalfUp(subBudget * 10_000n, BigInt(node.rate));
    if (scaled <= 0n) return [];
    return [{ ...link, quantity: `${scaled / 10_000n}.${(scaled % 10_000n).toString().padStart(4, '0')}`, allocatedAmount: null }];
  });
}
