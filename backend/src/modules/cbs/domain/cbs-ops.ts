import { closingQuantity, quantityScaled } from '../../computation/index.js';
import type { CostType, LinkNode, PricingModeCode } from '../../planning/index.js';
import { convertLinks, scaleLinks } from './link-math.js';
import { budgetOf, type CbsTreeNode, faNum, heightOf, isCbsLeaf, leafIdsBelow, locateCbs, MAX_CBS_DEPTH } from './cbs-tree.js';

// عملیات حالت ویرایش CBS روی نسخهٔ کاری (cbs.md ۴.۴، ۷، ۱۴؛ تصمیم‌های 1405/08/15). تابع خالص؛ هر عمل ردشده بقیه
// را نگه نمی‌دارد. اتصال‌ها در فهرست جدای نسخهٔ کاری‌اند؛ برگی که گروه می‌شود اتصال‌هایش را از دست می‌دهد.

export interface PricingInput {
  readonly pricing?: PricingModeCode;
  readonly unit?: string | null;
  readonly rate?: string | null;
  readonly qty?: number | string | null;
  readonly lump?: string | null;
}

export interface ItemInput extends PricingInput {
  readonly title: string;
  readonly code?: string;
  readonly costType: CostType;
  readonly supplier?: string | null;
}

export type CbsOp =
  | { readonly type: 'add'; readonly tempId: string; readonly parentId: string | null; readonly afterId?: string | null; readonly item: ItemInput }
  | {
      readonly type: 'update';
      readonly id: string;
      readonly patch: {
        readonly title?: string;
        readonly code?: string;
        readonly costType?: CostType;
        readonly unit?: string | null;
        readonly supplier?: string | null;
      };
    }
  | ({ readonly type: 'setPricing'; readonly id: string; readonly pricing: PricingModeCode } & PricingInput)
  | { readonly type: 'move'; readonly id: string; readonly parentId: string | null; readonly index: number }
  | { readonly type: 'remove'; readonly id: string }
  | {
      readonly type: 'split';
      readonly id: string;
      readonly parentTempId: string;
      readonly parentTitle: string;
      readonly parts: readonly ({ readonly tempId: string; readonly title: string } & PricingInput)[];
    }
  | { readonly type: 'close'; readonly id: string };

/** هزینهٔ `posted` هر قلم برگ (F06). تا دفتر هزینه (برش ۸) همه صفر. */
export interface CostFacts {
  postedAc(cbsItemId: string): bigint;
}

export const NO_COSTS: CostFacts = { postedAc: () => 0n };

export interface CbsOpsContext {
  readonly costs: CostFacts;
  /** پروژهٔ فعال یا متوقف: تغییر بودجه بازنگری بودجه است (۷.۱). */
  readonly live: boolean;
  /** دارندهٔ `cbs.revise_budget` (۷.۲ مسیر مستقیم). */
  readonly canReviseBudget: boolean;
  /** اتصال‌های نسخهٔ کاری — «بستن قلم» و انتقال روی آن‌ها اثر دارند. */
  links: LinkNode[];
}

export interface CbsOpError {
  readonly index: number;
  readonly code: string;
  readonly message: string;
}

export const HAS_COST_REMOVE = 'این قلم هزینهٔ ثبت‌شده دارد و حذف نمی‌شود؛ هزینهٔ خرج‌شده باید جایی بماند. به‌جایش «بستن قلم» را بزنید.';
export const HAS_COST_UNIT = 'واحد قلمی که هزینهٔ ثبت‌شده دارد عوض نمی‌شود. برای واحد تازه، قلم تازه بسازید یا آن را «تقسیم» کنید.';
export const HAS_COST_CHILD = 'این قلم هزینهٔ ثبت‌شده دارد و نمی‌تواند گروه شود. به‌جای افزودن زیرقلم آن را «تقسیم» کنید.';
export const NEEDS_REVISE_BUDGET =
  'تغییر نرخ، مقدار یا مبلغ در پروژهٔ فعال بازنگری بودجه است و دسترسی «بازنگری بودجه» می‌خواهد؛ از «درخواست بازنگری بودجه» در دفتر CBS استفاده کنید.';
const TOO_DEEP = `CBS حداکثر ${faNum(MAX_CBS_DEPTH)} سطح دارد (cbs.md ۴.۳).`;

class OpReject extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function rial(value: string | null | undefined, label: string): string | null {
  if (value === null || value === undefined || value === '') return null;
  const digits = String(value).replace(/[^\d]/g, '');
  if (!digits || BigInt(digits) <= 0n) throw new OpReject('INVALID_AMOUNT', `${label} باید عددی بزرگ‌تر از صفر به ریال باشد.`);
  return BigInt(digits).toString();
}

function quantity(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  const scaled = quantityScaled(value);
  if (scaled === null || scaled <= 0n) throw new OpReject('INVALID_QTY', 'مقدار برآورد باید عددی بزرگ‌تر از صفر با حداکثر چهار رقم اعشار باشد.');
  return `${scaled / 10_000n}.${(scaled % 10_000n).toString().padStart(4, '0')}`;
}

/** شیوهٔ قیمت و مقدارها؛ فیلد خالی پذیرفته (برگ ناقص را V-08 می‌گیرد)، عدد نامعتبر رد. */
function setPricing(node: CbsTreeNode, input: PricingInput): void {
  const pricing = input.pricing ?? node.pricing;
  if (!pricing) return;
  node.pricing = pricing;
  if (pricing === 'unit_rate') {
    if (input.unit !== undefined) node.unit = input.unit?.trim() || null;
    if (input.qty !== undefined) node.qty = quantity(input.qty);
    if (input.rate !== undefined) node.rate = rial(input.rate, 'نرخ واحد');
    node.lump = null;
  } else {
    if (input.lump !== undefined) node.lump = rial(input.lump, 'مبلغ مقطوع');
    Object.assign(node, { unit: null, qty: null, rate: null });
  }
}

const touchesBudget = (input: PricingInput): boolean =>
  input.pricing !== undefined || input.rate !== undefined || input.qty !== undefined || input.lump !== undefined;

export function applyCbsOps(forest: CbsTreeNode[], ops: readonly CbsOp[], ctx: CbsOpsContext): CbsOpError[] {
  const errors: CbsOpError[] = [];
  const posted = (node: CbsTreeNode) => leafIdsBelow(node).some((id) => ctx.costs.postedAc(id) > 0n);
  const must = (id: string) => {
    const found = locateCbs(forest, id);
    if (!found) throw new OpReject('NOT_FOUND', 'این قلم در نسخهٔ کاری پیدا نشد؛ ممکن است عمل قبلی حذفش کرده باشد.');
    return found;
  };
  const budgetGuard = () => {
    if (ctx.live && !ctx.canReviseBudget) throw new OpReject('BUDGET_REVISION_REQUIRED', NEEDS_REVISE_BUDGET);
  };
  /** برگ ← گروه: شیوهٔ قیمت پاک و اتصال‌ها با پاک‌سازی نسخه کنار می‌روند (۴.۴؛ کاربر پیش‌تر تأیید کرده). */
  const becomeGroup = (node: CbsTreeNode) => {
    if (posted(node)) throw new OpReject('HAS_COST', HAS_COST_CHILD);
    Object.assign(node, { pricing: null, unit: null, qty: null, rate: null, lump: null });
    ctx.links = ctx.links.filter((link) => link.cbsItemId !== node.id);
  };

  const moveTargetToGroup = (node: CbsTreeNode) => {
    if (ctx.links.some((link) => link.cbsItemId === node.id)) {
      throw new OpReject('HAS_LINKS', 'قلم مقصد اتصال WBS دارد و گروه نمی‌شود. اول اتصال‌هایش را بردارید یا قلم را زیر گروه دیگری ببرید.');
    }
    becomeGroup(node);
  };

  const run = (op: CbsOp): void => {
    switch (op.type) {
      case 'add': {
        const title = op.item.title.trim();
        if (!title) throw new OpReject('TITLE_REQUIRED', 'عنوان قلم لازم است.');
        let siblings = forest;
        let parentCode = '';
        let depth = 1;
        if (op.parentId) {
          const parent = must(op.parentId);
          if (isCbsLeaf(parent.node)) becomeGroup(parent.node);
          siblings = parent.node.children;
          parentCode = parent.node.code;
          depth = parent.depth + 1;
        }
        if (depth > MAX_CBS_DEPTH) throw new OpReject('TOO_DEEP', TOO_DEEP);
        if (touchesBudget(op.item)) budgetGuard();
        const node: CbsTreeNode = {
          id: op.tempId,
          code: op.item.code?.trim() || (parentCode ? `${parentCode}.${siblings.length + 1}` : `C.${siblings.length + 1}`),
          title,
          costType: op.item.costType,
          unit: null,
          qty: null,
          pricing: null,
          rate: null,
          lump: null,
          supplier: op.item.supplier?.trim() || null,
          children: [],
        };
        if (op.item.pricing) setPricing(node, op.item);
        const after = op.afterId ? siblings.findIndex((item) => item.id === op.afterId) : -1;
        siblings.splice(after >= 0 ? after + 1 : siblings.length, 0, node);
        return;
      }
      case 'update': {
        const { node } = must(op.id);
        const { patch } = op;
        if (patch.title !== undefined) {
          if (!patch.title.trim()) throw new OpReject('TITLE_REQUIRED', 'عنوان قلم خالی نمی‌ماند.');
          node.title = patch.title.trim();
        }
        if (patch.code !== undefined) {
          if (!patch.code.trim()) throw new OpReject('CODE_REQUIRED', 'کد قلم خالی نمی‌ماند.');
          node.code = patch.code.trim();
        }
        if (patch.costType !== undefined) node.costType = patch.costType;
        if (patch.supplier !== undefined) node.supplier = patch.supplier?.trim() || null;
        if (patch.unit !== undefined && (patch.unit ?? '') !== (node.unit ?? '')) {
          if (posted(node)) throw new OpReject('HAS_COST', HAS_COST_UNIT);
          if (node.pricing !== 'unit_rate') throw new OpReject('NOT_UNIT_RATE', 'فقط قلم نرخ واحد واحد دارد.');
          if (!patch.unit?.trim()) throw new OpReject('UNIT_REQUIRED', 'برای قلم نرخ واحد، واحد لازم است.');
          node.unit = patch.unit.trim();
        }
        return;
      }
      case 'setPricing': {
        const { node } = must(op.id);
        if (!isCbsLeaf(node)) throw new OpReject('NOT_LEAF', 'بودجهٔ گروه جمع زیرقلم‌هاست و مستقیم ویرایش نمی‌شود (۴.۳).');
        if (posted(node) && node.pricing && op.pricing !== node.pricing) throw new OpReject('HAS_COST', HAS_COST_UNIT);
        if (posted(node) && op.unit != null && op.unit.trim() !== (node.unit ?? '')) throw new OpReject('HAS_COST', HAS_COST_UNIT);
        budgetGuard();
        // تغییر نرخ: مقدار اتصال‌ها ثابت و زیربودجه = مقدار × نرخ تازه (۴.۱). تغییر شیوهٔ قیمت: زیربودجهٔ هر اتصال
        // حفظ می‌شود (مقدار ← مبلغ یا مبلغ ← مقدار با نرخ تازه)
        const before = { pricingMode: node.pricing, estimatedQuantity: node.qty, unitRate: node.rate, lumpSumAmount: node.lump };
        const changedMode = node.pricing !== null && op.pricing !== node.pricing;
        setPricing(node, op);
        if (changedMode) ctx.links = convertLinks(ctx.links, node, before);
        return;
      }
      case 'move': {
        const found = must(op.id);
        let target = forest;
        let depth = 1;
        if (op.parentId) {
          if (op.parentId === op.id || locateCbs(found.node.children, op.parentId)) throw new OpReject('CYCLE', 'قلم را نمی‌شود زیر خودش یا زیرقلم‌هایش برد.');
          const parent = must(op.parentId);
          if (isCbsLeaf(parent.node)) moveTargetToGroup(parent.node);
          target = parent.node.children;
          depth = parent.depth + 1;
        }
        if (depth + heightOf(found.node) - 1 > MAX_CBS_DEPTH) throw new OpReject('TOO_DEEP', TOO_DEEP);
        found.siblings.splice(found.index, 1);
        target.splice(Math.max(0, Math.min(op.index, target.length)), 0, found.node);
        return;
      }
      case 'remove': {
        const found = must(op.id);
        if (posted(found.node)) throw new OpReject('HAS_COST', HAS_COST_REMOVE);
        const removed = new Set(leafIdsBelow(found.node));
        ctx.links = ctx.links.filter((link) => !removed.has(link.cbsItemId));
        found.siblings.splice(found.index, 1);
        return;
      }
      case 'split': {
        const found = must(op.id);
        const { node } = found;
        if (!isCbsLeaf(node)) throw new OpReject('NOT_LEAF', 'فقط قلم برگ تقسیم می‌شود.');
        if (found.depth + 1 > MAX_CBS_DEPTH) throw new OpReject('TOO_DEEP', TOO_DEEP);
        if (!op.parentTitle.trim()) throw new OpReject('TITLE_REQUIRED', 'عنوان گروه تازه لازم است.');
        if (op.parts.length === 0) throw new OpReject('PARTS_REQUIRED', 'دست‌کم یک بخش تازه لازم است.');
        if (op.parts.some(touchesBudget)) budgetGuard();
        const code = node.code;
        const parts = op.parts.map((part, partIndex) => {
          if (!part.title.trim()) throw new OpReject('TITLE_REQUIRED', `عنوان بخش ${faNum(partIndex + 2)} لازم است.`);
          const child: CbsTreeNode = {
            id: part.tempId,
            code: `${code}.${partIndex + 2}`,
            title: part.title.trim(),
            costType: node.costType,
            unit: null,
            qty: null,
            pricing: null,
            rate: null,
            lump: null,
            supplier: null,
            children: [],
          };
          setPricing(child, {
            pricing: part.pricing ?? node.pricing ?? undefined,
            unit: part.unit ?? node.unit,
            rate: part.rate ?? node.rate,
            qty: part.qty ?? null,
            lump: part.lump ?? null,
          });
          return child;
        });
        // قلم قدیمی با همان شناسه، هزینه‌ها و اتصال‌ها زیر گروه تازه (۴.۴)
        const parent: CbsTreeNode = {
          id: op.parentTempId,
          code,
          title: op.parentTitle.trim(),
          costType: node.costType,
          unit: null,
          qty: null,
          pricing: null,
          rate: null,
          lump: null,
          supplier: null,
          children: [node, ...parts],
        };
        node.code = `${code}.1`;
        found.siblings.splice(found.index, 1, parent);
        return;
      }
      case 'close': {
        const { node } = must(op.id);
        if (!isCbsLeaf(node)) throw new OpReject('NOT_LEAF', 'فقط قلم برگ بسته می‌شود.');
        const ac = ctx.costs.postedAc(node.id);
        if (ac <= 0n) throw new OpReject('NO_COST', 'این قلم هزینهٔ ثبت‌شده ندارد؛ به‌جای بستن، آن را حذف کنید.');
        if (budgetOf(node) <= ac) throw new OpReject('ALREADY_CLOSED', 'برآورد این قلم از هزینهٔ واقعی‌اش بیشتر نیست؛ چیزی برای بستن نمانده.');
        budgetGuard();
        if (node.pricing === 'unit_rate' && node.rate) node.qty = closingQuantity(ac, BigInt(node.rate));
        else node.lump = ac.toString();
        ctx.links = scaleLinks(node, ctx.links);
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
  return errors;
}
