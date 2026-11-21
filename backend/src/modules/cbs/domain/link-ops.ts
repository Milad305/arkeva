import { divRoundHalfUp, quantityScaled } from '../../computation/index.js';
import type { CbsNode, LinkNode, PlanNode } from '../../planning/index.js';
import { faNum, MAX_LINKS_PER_LEAF } from './cbs-tree.js';

// عملیات W15 روی اتصال‌های نسخهٔ کاری (cbs.md ۵.۱، ۵.۳.۱؛ تصمیم‌های 1405/08/15). تابع خالص؛ هر عمل ردشده بقیه را نگه
// نمی‌دارد. اتصال فقط برگ WBS غیرنقطهٔ عطف ↔ برگ CBS؛ مقدار برای نرخ واحد، مبلغ برای مقطوع.

export type LinkOp =
  | {
      readonly type: 'link';
      readonly wbsItemId: string;
      readonly cbsItemId: string;
      readonly quantity?: number | string | null;
      readonly amount?: string | null;
    }
  | { readonly type: 'unlink'; readonly wbsItemId: string; readonly cbsItemId: string }
  | { readonly type: 'setQuantity'; readonly wbsItemId: string; readonly cbsItemId: string; readonly quantity: number | string }
  | { readonly type: 'setAmount'; readonly wbsItemId: string; readonly cbsItemId: string; readonly amount: string }
  | { readonly type: 'copy'; readonly fromWbsItemId: string; readonly toWbsItemIds: readonly string[] };

export interface LinkOpError {
  readonly index: number;
  readonly code: string;
  readonly message: string;
}

class OpReject extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const format = (scaled: bigint) => `${scaled / 10_000n}.${(scaled % 10_000n).toString().padStart(4, '0')}`;

/** مقدار یا مبلغ یک اتصال از ورودی، با قاعدهٔ شیوهٔ قیمت قلم (۴.۱). */
export function linkValue(
  item: CbsNode,
  quantity: number | string | null | undefined,
  amount: string | null | undefined,
): Pick<LinkNode, 'quantity' | 'allocatedAmount'> {
  if (item.pricingMode === 'unit_rate') {
    if (!item.unitRate) throw new OpReject('NO_RATE', `قلم ${item.code} هنوز نرخ ندارد؛ اول نرخش را در حالت ویرایش CBS بنویسید.`);
    const scaled = quantityScaled(quantity ?? null);
    if (scaled === null || scaled <= 0n)
      throw new OpReject('QTY_REQUIRED', `مقدار را به ${item.unit ?? 'واحد قلم'} بنویسید؛ باید بزرگ‌تر از صفر با حداکثر چهار رقم اعشار باشد.`);
    return { quantity: format(scaled), allocatedAmount: null };
  }
  if (item.pricingMode === 'lump_sum') {
    const digits = String(amount ?? '').replace(/[^\d]/g, '');
    if (!digits || BigInt(digits) <= 0n) throw new OpReject('AMOUNT_REQUIRED', 'قلم مقطوع مبلغ تخصیص می‌گیرد؛ مبلغ را به ریال بنویسید.');
    return { quantity: null, allocatedAmount: BigInt(digits).toString() };
  }
  throw new OpReject('NO_PRICING', `قلم ${item.code} شیوهٔ قیمت ندارد؛ اول آن را در حالت ویرایش CBS کامل کنید.`);
}

export function applyLinkOps(
  links: LinkNode[],
  ops: readonly LinkOp[],
  wbs: readonly PlanNode[],
  cbs: readonly CbsNode[],
): { links: LinkNode[]; errors: LinkOpError[] } {
  const leaves = new Map(wbs.filter((node) => node.isLeaf).map((node) => [node.id, node]));
  const items = new Map(cbs.filter((node) => node.isLeaf).map((node) => [node.id, node]));
  let current = [...links];
  const errors: LinkOpError[] = [];

  const leafOf = (id: string) => {
    const node = leaves.get(id);
    if (!node) throw new OpReject('NOT_LEAF', 'اتصال فقط روی برگ WBS است (cbs.md ۵.۱).');
    if (node.isMilestone) throw new OpReject('MILESTONE', 'نقطهٔ عطف بودجه و اتصال CBS ندارد.');
    return node;
  };
  const itemOf = (id: string) => {
    const node = items.get(id);
    if (!node) throw new OpReject('NOT_CBS_LEAF', 'اتصال فقط به قلم برگ CBS است (cbs.md ۵.۱).');
    return node;
  };
  const countOf = (wbsItemId: string) => current.filter((link) => link.wbsItemId === wbsItemId).length;
  const find = (wbsItemId: string, cbsItemId: string) => current.find((link) => link.wbsItemId === wbsItemId && link.cbsItemId === cbsItemId);
  const replace = (next: LinkNode) => {
    current = current.map((link) => (link.wbsItemId === next.wbsItemId && link.cbsItemId === next.cbsItemId ? next : link));
  };

  const upsert = (link: LinkNode, target: PlanNode) => {
    if (find(target.id, link.cbsItemId)) return replace(link);
    if (countOf(target.id) >= MAX_LINKS_PER_LEAF) throw new OpReject('TOO_MANY', `«${target.title}» بیش از ${faNum(MAX_LINKS_PER_LEAF)} اتصال می‌گرفت.`);
    current.push(link);
  };

  const run = (op: LinkOp): void => {
    switch (op.type) {
      case 'link': {
        const leaf = leafOf(op.wbsItemId);
        const item = itemOf(op.cbsItemId);
        if (find(leaf.id, item.id)) throw new OpReject('DUPLICATE', `«${leaf.title}» از پیش به ${item.code} وصل است؛ مقدارش را در جدول عوض کنید.`);
        if (countOf(leaf.id) >= MAX_LINKS_PER_LEAF) throw new OpReject('TOO_MANY', `هر فعالیت حداکثر ${faNum(MAX_LINKS_PER_LEAF)} اتصال CBS دارد.`);
        current.push({ wbsItemId: leaf.id, cbsItemId: item.id, ...linkValue(item, op.quantity, op.amount) });
        return;
      }
      case 'unlink': {
        leafOf(op.wbsItemId);
        itemOf(op.cbsItemId);
        if (!find(op.wbsItemId, op.cbsItemId)) throw new OpReject('NOT_LINKED', 'این اتصال در نسخهٔ کاری نیست.');
        current = current.filter((link) => !(link.wbsItemId === op.wbsItemId && link.cbsItemId === op.cbsItemId));
        return;
      }
      case 'setQuantity':
      case 'setAmount': {
        leafOf(op.wbsItemId);
        const item = itemOf(op.cbsItemId);
        const link = find(op.wbsItemId, op.cbsItemId);
        if (!link) throw new OpReject('NOT_LINKED', 'این اتصال در نسخهٔ کاری نیست.');
        replace({ ...link, ...(op.type === 'setQuantity' ? linkValue(item, op.quantity, null) : linkValue(item, null, op.amount)) });
        return;
      }
      case 'copy': {
        const source = leafOf(op.fromWbsItemId);
        const from = current.filter((link) => link.wbsItemId === source.id);
        if (from.length === 0) throw new OpReject('NO_LINKS', 'فعالیت مبدأ اتصالی ندارد.');
        for (const targetId of op.toWbsItemIds) {
          if (targetId === source.id) continue;
          const target = leafOf(targetId);
          // به نسبت مقدار کل اگر هر دو مقداری با یک واحدند، وگرنه همان مقدارها (۵.۳.۱)
          const ratio = sameUnit(source, target)
            ? { num: quantityScaled(target.totalQuantity) ?? 1n, den: quantityScaled(source.totalQuantity) ?? 1n }
            : { num: 1n, den: 1n };
          for (const link of from) {
            const copied: LinkNode = {
              wbsItemId: target.id,
              cbsItemId: link.cbsItemId,
              quantity: link.quantity === null ? null : format(divRoundHalfUp((quantityScaled(link.quantity) ?? 0n) * ratio.num, ratio.den)),
              allocatedAmount: link.allocatedAmount === null ? null : divRoundHalfUp(BigInt(link.allocatedAmount) * ratio.num, ratio.den).toString(),
            };
            upsert(copied, target);
          }
        }
        return;
      }
    }
  };

  ops.forEach((op, index) => {
    try {
      run(op);
    } catch (cause) {
      if (cause instanceof OpReject) errors.push({ index, code: cause.code, message: cause.message });
      else throw cause;
    }
  });
  return { links: current, errors };
}

function sameUnit(source: PlanNode, target: PlanNode): boolean {
  return (
    source.measurementMethod === 'quantity' &&
    target.measurementMethod === 'quantity' &&
    source.unit === target.unit &&
    (quantityScaled(source.totalQuantity) ?? 0n) > 0n &&
    (quantityScaled(target.totalQuantity) ?? 0n) > 0n
  );
}

/** پیام ردیف ورود فایل از خطای مقدار یا مبلغ. */
export function linkValueError(item: CbsNode, quantity: number | string | null, amount: string | null): string | null {
  try {
    linkValue(item, quantity, amount);
    return null;
  } catch (cause) {
    return cause instanceof Error ? cause.message : 'مقدار یا مبلغ نامعتبر است.';
  }
}
