import { describe, expect, it } from 'vitest';
import type { CbsNode, LinkNode, PlanNode } from '../../planning/index.js';
import { diffCbs, validateCbs } from './cbs-checks.js';
import { applyCbsOps, type CbsOpsContext, NO_COSTS } from './cbs-ops.js';
import { allocationsOf, budgetOf, locateCbs, toCbsForest, toCbsNodes } from './cbs-tree.js';
import { applyLinkOps } from './link-ops.js';

// موتور خالص CBS و اتصال‌ها (cbs.md ۴.۴، ۵، ۷؛ تصمیم‌های 1405/08/15).

const M = 1_000_000;
const unitRate = (id: string, parentId: string | null, qty: string, rate: number, extra: Partial<CbsNode> = {}): CbsNode => ({
  id,
  parentId,
  sortOrder: 0,
  code: id,
  title: id,
  isLeaf: true,
  costType: 'materials',
  unit: 't',
  estimatedQuantity: qty,
  pricingMode: 'unit_rate',
  unitRate: String(rate),
  lumpSumAmount: null,
  supplierNote: null,
  ...extra,
});
const lumpSum = (id: string, amount: number): CbsNode => ({
  ...unitRate(id, null, '1', 1),
  costType: 'labor',
  unit: null,
  estimatedQuantity: null,
  pricingMode: 'lump_sum',
  unitRate: null,
  lumpSumAmount: String(amount),
});
const link = (wbsItemId: string, cbsItemId: string, quantity: string | null, allocatedAmount: string | null = null): LinkNode => ({
  wbsItemId,
  cbsItemId,
  quantity,
  allocatedAmount,
});
const wbsLeaf = (id: string, extra: Partial<PlanNode> = {}): PlanNode => ({
  id,
  parentId: null,
  sortOrder: 0,
  code: id,
  codeMode: 'custom',
  title: id,
  isLeaf: true,
  isMilestone: false,
  weightInParent: '50',
  plannedStart: null,
  plannedFinish: null,
  unit: null,
  totalQuantity: null,
  measurementMethod: 'percent',
  steps: null,
  isCritical: null,
  totalFloatDays: null,
  ...extra,
});
const context = (links: LinkNode[], extra: Partial<CbsOpsContext> = {}): CbsOpsContext => ({
  costs: NO_COSTS,
  live: false,
  canReviseBudget: false,
  links,
  ...extra,
});

describe('عملیات CBS', () => {
  it('cbs.md ۴.۴ — افزودن زیرقلم به برگ آن را گروه می‌کند و اتصال‌هایش کنار می‌رود', () => {
    const forest = toCbsForest([unitRate('C3', null, '6', 50 * M)]);
    const ctx = context([link('w1', 'C3', '2')]);
    expect(
      applyCbsOps(
        forest,
        [
          {
            type: 'add',
            tempId: 't',
            parentId: 'C3',
            item: { title: 'آرماتور ۱۶', costType: 'materials', pricing: 'unit_rate', unit: 't', qty: 2, rate: String(50 * M) },
          },
        ],
        ctx,
      ),
    ).toEqual([]);
    const [group] = toCbsNodes(forest);
    expect(group).toMatchObject({ id: 'C3', isLeaf: false, pricingMode: null, unitRate: null });
    expect(ctx.links).toEqual([]);
    expect(locateCbs(forest, 't')?.node.code).toBe('C3.1');
  });

  it('cbs.md ۴.۴ — تقسیم: قلم قدیمی با همان شناسه و اتصال‌ها زیر گروه تازه', () => {
    const forest = toCbsForest([unitRate('C3', null, '6', 50 * M)]);
    const ctx = context([link('w1', 'C3', '2')]);
    applyCbsOps(forest, [{ type: 'split', id: 'C3', parentTempId: 'g', parentTitle: 'آرماتور', parts: [{ tempId: 'p2', title: 'آرماتور ۲۰', qty: 3 }] }], ctx);
    const nodes = toCbsNodes(forest);
    expect(nodes.map((node) => [node.id, node.parentId, node.code])).toEqual([
      ['g', null, 'C3'],
      ['C3', 'g', 'C3.1'],
      ['p2', 'g', 'C3.2'],
    ]);
    expect(nodes[2]).toMatchObject({ unitRate: String(50 * M), unit: 't', estimatedQuantity: '3.0000' });
    expect(ctx.links).toHaveLength(1);
  });

  it('cbs.md ۷.۲ — در پروژهٔ فعال تغییر بودجه بی cbs.revise_budget رد؛ عنوان آزاد', () => {
    const forest = toCbsForest([unitRate('C3', null, '6', 50 * M)]);
    const errors = applyCbsOps(
      forest,
      [
        { type: 'setPricing', id: 'C3', pricing: 'unit_rate', rate: String(55 * M) },
        { type: 'update', id: 'C3', patch: { title: 'میلگرد' } },
      ],
      context([], { live: true }),
    );
    expect(errors.map((error) => [error.index, error.code])).toEqual([[0, 'BUDGET_REVISION_REQUIRED']]);
    expect(toCbsNodes(forest)[0]).toMatchObject({ title: 'میلگرد', unitRate: String(50 * M) });
  });

  it('تغییر شیوهٔ قیمت زیربودجهٔ هر اتصال را نگه می‌دارد', () => {
    const forest = toCbsForest([unitRate('C3', null, '6', 50 * M)]);
    const ctx = context([link('w1', 'C3', '2'), link('w2', 'C3', '4')]);
    applyCbsOps(forest, [{ type: 'setPricing', id: 'C3', pricing: 'lump_sum', lump: String(300 * M) }], ctx);
    expect(ctx.links).toEqual([link('w1', 'C3', null, String(100 * M)), link('w2', 'C3', null, String(200 * M))]);
    applyCbsOps(forest, [{ type: 'setPricing', id: 'C3', pricing: 'unit_rate', unit: 't', qty: 6, rate: String(40 * M) }], ctx);
    expect(ctx.links).toEqual([link('w1', 'C3', '2.5000'), link('w2', 'C3', '5.0000')]);
  });

  it('بستن قلم: برآورد = هزینهٔ واقعی و اتصال‌ها به نسبت کم می‌شوند', () => {
    const forest = toCbsForest([unitRate('C3', null, '6', 50 * M)]);
    const ctx = context([link('w1', 'C3', '3'), link('w2', 'C3', '3')], { costs: { postedAc: () => BigInt(200 * M) }, live: true, canReviseBudget: true });
    expect(applyCbsOps(forest, [{ type: 'close', id: 'C3' }], ctx)).toEqual([]);
    expect(budgetOf(forest[0] as never)).toBe(BigInt(200 * M));
    expect(ctx.links.map((entry) => entry.quantity)).toEqual(['2.0000', '2.0000']);
    // AC-CBS-07: قلم دارای هزینه حذف نمی‌شود
    expect(applyCbsOps(forest, [{ type: 'remove', id: 'C3' }], ctx)[0]?.code).toBe('HAS_COST');
  });
});

describe('اتصال‌ها و اعتبارسنجی', () => {
  it('cbs.md ۵.۳.۱ — کپی اتصال‌ها به نسبت مقدار کل وقتی واحد یکی است', () => {
    const wbs = [
      wbsLeaf('w1', { measurementMethod: 'quantity', unit: 'm3', totalQuantity: '200' }),
      wbsLeaf('w2', { measurementMethod: 'quantity', unit: 'm3', totalQuantity: '50' }),
      wbsLeaf('w3'),
    ];
    const cbs = [unitRate('C2', null, '400', M, { unit: 'm3' }), lumpSum('C4', 200 * M)];
    const { links, errors } = applyLinkOps(
      [link('w1', 'C2', '200'), link('w1', 'C4', null, String(80 * M))],
      [{ type: 'copy', fromWbsItemId: 'w1', toWbsItemIds: ['w2', 'w3'] }],
      wbs,
      cbs,
    );
    expect(errors).toEqual([]);
    expect(links.filter((entry) => entry.wbsItemId === 'w2')).toEqual([link('w2', 'C2', '50.0000'), link('w2', 'C4', null, String(20 * M))]);
    expect(links.filter((entry) => entry.wbsItemId === 'w3')).toEqual([link('w3', 'C2', '200.0000'), link('w3', 'C4', null, String(80 * M))]);
  });

  it('AC-CBS-04 — V-08 تخصیص بیش از برآورد؛ V-07 کد تکراری؛ V-08 برگ بی شیوهٔ قیمت', () => {
    const nodes = [
      unitRate('C3', null, '6', 50 * M),
      { ...lumpSum('C4', 200 * M), code: 'C3' },
      { ...unitRate('C5', null, '1', 1), pricingMode: null, unitRate: null },
    ];
    const forest = toCbsForest(nodes);
    const links = [link('w1', 'C3', '4'), link('w2', 'C3', '3')];
    expect(allocationsOf(forest, links).get('C3')).toEqual({ allocated: BigInt(350 * M), linkCount: 2 });
    const { errors } = validateCbs(forest, links, true);
    expect(errors.map((issue) => [issue.code, issue.rule])).toEqual([
      ['cbs_over_allocated', 'V-08'],
      ['cbs_invalid_pricing', 'V-08'],
      ['cbs_duplicate_code', 'V-07'],
    ]);
    expect(errors[0]?.message).toContain('(بازنگری بودجه)');
  });

  it('تفاوت با جاری: تغییر نرخ بودجه است، عنوان نه؛ اتصال تازه یک تغییر', () => {
    const current = [unitRate('C3', null, '6', 50 * M), lumpSum('C4', 200 * M)];
    const draft = [unitRate('C3', null, '6', 55 * M), { ...lumpSum('C4', 200 * M), title: 'نیروی اسکلت' }];
    const diff = diffCbs(current, draft, [link('w1', 'C3', '2')], [link('w1', 'C3', '2'), link('w2', 'C4', null, '1')]);
    expect([...diff.budget]).toEqual(['C3']);
    expect([...diff.changed]).toEqual([
      ['C3', ['rate']],
      ['C4', ['title']],
    ]);
    expect(diff.count).toBe(3);
  });
});
