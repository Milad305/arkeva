import { describe, expect, it } from 'vitest';
import type { PlanNode } from '../../planning/index.js';
import { parseWbsCsv } from './csv-import.js';
import { diffPlans } from './diff.js';
import { applyOps, NO_REPORTS, type OpsContext, type WbsOp } from './ops.js';
import { toForest, toNodes } from './tree.js';
import { validateForest } from './validation.js';

// موتور خالص WBS (wbs.md ۵، ۶؛ plan-versions.md ۵.۱).

const ctx: OpsContext = {
  mspLinked: false,
  facts: NO_REPORTS,
  calendar: { weekModes: ['full', 'full', 'full', 'full', 'full', 'half', 'off'], holidays: new Set() },
  leafBac: new Map(),
  splitParentId: (leafId) => `split:${leafId}`,
};

function leaf(id: string, parentId: string | null, sortOrder: number, weight: string, extra: Partial<PlanNode> = {}): PlanNode {
  return {
    id,
    parentId,
    sortOrder,
    code: '',
    codeMode: 'auto',
    title: id,
    isLeaf: true,
    isMilestone: false,
    weightInParent: weight,
    plannedStart: '2025-03-21',
    plannedFinish: '2025-06-21',
    unit: null,
    totalQuantity: null,
    measurementMethod: 'percent',
    steps: null,
    isCritical: null,
    totalFloatDays: null,
    ...extra,
  };
}

const parent = (id: string, parentId: string | null, sortOrder: number, weight: string): PlanNode => ({
  ...leaf(id, parentId, sortOrder, weight),
  isLeaf: false,
  measurementMethod: null,
});

const run = (nodes: PlanNode[], ops: WbsOp[], context: OpsContext = ctx) => {
  const forest = toForest(nodes);
  const errors = applyOps(forest, ops, context);
  return { forest, errors, nodes: toNodes(forest) };
};

const weightOf = (nodes: PlanNode[], id: string) => nodes.find((node) => node.id === id)?.weightInParent;

describe('موتور WBS', () => {
  it('AC-WBS-02 — پخش خودکار 35، 30، 30 ← 36.8421، 31.5789، 31.5790', () => {
    const { nodes } = run(
      [parent('roof', null, 0, '100'), leaf('a', 'roof', 0, '35'), leaf('b', 'roof', 1, '30'), leaf('c', 'roof', 2, '30')],
      [{ type: 'autoDistribute', parentId: 'roof' }],
    );
    expect([weightOf(nodes, 'a'), weightOf(nodes, 'b'), weightOf(nodes, 'c')]).toEqual(['36.8421', '31.5789', '31.5790']);
  });

  it('AC-WBS-04 — تقسیم ۳۲۰ به ۲۰۰ و ۱۲۰: وزن 62.5 و 37.5؛ برگ قدیمی همان شناسه زیر والد تازه', () => {
    const slab = leaf('slab', null, 0, '100', { title: 'بتن‌ریزی سقف', measurementMethod: 'quantity', unit: 'm3', totalQuantity: '320.0000' });
    const { nodes, errors } = run(
      [slab],
      [{ type: 'split', id: 'slab', keepTitle: '', keepQuantity: 200, parts: [{ tempId: 'b', title: 'بلوک B', totalQuantity: 120 }] }],
    );
    expect(errors).toEqual([]);
    const old = nodes.find((node) => node.id === 'slab');
    expect(old).toMatchObject({ parentId: 'split:slab', weightInParent: '62.5000', totalQuantity: '200.0000', title: 'بتن‌ریزی سقف — بخش ۱' });
    expect(weightOf(nodes, 'b')).toBe('37.5000');
    expect(nodes.find((node) => node.id === 'split:slab')).toMatchObject({ parentId: null, weightInParent: '100.0000', isLeaf: false, title: 'بتن‌ریزی سقف' });
  });

  it('AC-WBS-12 — تاریخ والد کمترین شروع و بیشترین پایان فرزندان', () => {
    const { nodes } = run(
      [
        parent('p', null, 0, '100'),
        leaf('x', 'p', 0, '50', { plannedStart: '2025-04-01', plannedFinish: '2025-05-01' }),
        leaf('y', 'p', 1, '50', { plannedStart: '2025-03-25', plannedFinish: '2025-04-10' }),
      ],
      [],
    );
    expect(nodes.find((node) => node.id === 'p')).toMatchObject({ plannedStart: '2025-03-25', plannedFinish: '2025-05-01' });
  });

  it('wbs.md ۵.۲ — کد خودکار از جایگاه؛ کد دستی ثابت', () => {
    const { nodes } = run(
      [leaf('a', null, 0, '50'), leaf('b', null, 1, '50', { codeMode: 'custom', code: 'X-9' })],
      [{ type: 'add', tempId: 't', parentId: 'a', afterId: null, fields: { title: 'زیرکار' } }],
    );
    expect(nodes.map((node) => [node.id, node.code])).toEqual([
      ['a', '1.1'],
      ['t', '1.1.1'],
      ['b', 'X-9'],
    ]);
  });

  it('AC-WBS-01 — جمع وزن گروه ≠ ۱۰۰ خطای V-01 با والد و جمع فعلی', () => {
    const { forest } = run([parent('roof', null, 0, '100'), leaf('a', 'roof', 0, '35'), leaf('b', 'roof', 1, '30'), leaf('c', 'roof', 2, '30')], []);
    const { errors } = validateForest(forest, {
      projectStart: null,
      projectFinish: null,
      currentMethods: new Map(),
      removedIds: [],
      linkedLeaves: new Set(),
      supervisedLeaves: new Set(),
    });
    expect(errors).toEqual([expect.objectContaining({ code: 'weight_sum', rule: 'V-01', parentId: 'roof', currentSum: 95 })]);
  });

  it('wbs.md ۱۳.۹ — گروه همه‌صفر زیر والد وزن صفر مجاز است', () => {
    const { forest } = run([leaf('work', null, 0, '100'), parent('ms', null, 1, '0'), leaf('m1', 'ms', 0, '0', { isMilestone: true })], []);
    const { errors } = validateForest(forest, {
      projectStart: null,
      projectFinish: null,
      currentMethods: new Map(),
      removedIds: [],
      linkedLeaves: new Set(),
      supervisedLeaves: new Set(),
    });
    expect(errors.filter((issue) => issue.code === 'weight_sum')).toEqual([]);
  });

  it('AC-WBS-11 — پروژهٔ متصل به MSP: ساختار و تاریخ رد، وزن و عنوان پذیرفته', () => {
    const { errors, nodes } = run(
      [leaf('a', null, 0, '100')],
      [
        { type: 'add', tempId: 't', parentId: null, afterId: null, fields: { title: 'تازه' } },
        { type: 'update', id: 'a', fields: { plannedStart: '2025-04-01' } },
        { type: 'update', id: 'a', fields: { title: 'عنوان تازه', weightInParent: 100 } },
      ],
      { ...ctx, mspLinked: true },
    );
    expect(errors.map((error) => [error.index, error.code])).toEqual([
      [0, 'MSP_OWNED'],
      [1, 'MSP_OWNED'],
    ]);
    expect(nodes).toEqual([expect.objectContaining({ id: 'a', title: 'عنوان تازه' })]);
  });

  it('F04 ۵.۲ — تفاوت: افزوده، حذف شاخه یک تغییر، جابه‌جا، تغییر فیلد', () => {
    const current = [parent('p', null, 0, '100'), leaf('x', 'p', 0, '50'), leaf('y', 'p', 1, '50'), leaf('z', null, 1, '0')];
    const draft = toNodes(toForest([leaf('x', null, 0, '60'), leaf('n', null, 1, '40'), leaf('z', null, 2, '0')]));
    const diff = diffPlans(current, draft);
    expect([...diff.added]).toEqual(['n']);
    expect(diff.removed.map((node) => node.id).sort()).toEqual(['p', 'y']);
    expect([...diff.moved]).toEqual(['x']);
    expect(diff.changed.get('x')).toEqual(['weight']);
  });

  it('AC-WBS-09 — ورود CSV: وزن خالی، جمع ۹۸، کد تکراری، والد ناموجود', () => {
    const csv = [
      'کد,عنوان,وزن در والد,واحد,مقدار کل,شروع برنامه‌ای,پایان برنامه‌ای,روش اندازه‌گیری',
      '1.1,اسکلت,60,,,,,',
      '1.1.1,ستون‌ها,,عدد,40,1404/01/10,1404/02/10,',
      '1.1.2,سقف,,,,1404/02/11,1404/03/10,',
      '1.2,نازک‌کاری,38,,,1404/03/11,1404/05/01,',
      '1.2,تکراری,10,,,,,',
      '1.9.1,یتیم,10,,,,,',
    ].join('\n');
    const parsed = parseWbsCsv(csv, 'replace');
    expect(parsed.importCount).toBe(4);
    const messages = parsed.issues.map((issue) => issue.message);
    expect(messages).toContain('۲ آیتم وزن خالی دارند؛ باقی‌ماندهٔ ۱۰۰ به‌طور مساوی تقسیم می‌شود');
    expect(messages).toContain('مجموع وزن سطح ۱ برابر ۹۸٪ است و باید بازبینی شود؛ نسخه تا اصلاح اعمال نمی‌شود.');
    expect(messages).toContain('کد تکراری 1.2؛ ردیف دوم نادیده گرفته می‌شود');
    expect(messages.some((message) => message.includes('والد «1.9»'))).toBe(true);
    const children = parsed.forest[0]?.children ?? [];
    expect(children.map((child) => child.weight)).toEqual([500_000, 500_000]);
    expect(children[0]).toMatchObject({ method: 'quantity', unit: 'عدد', qty: 40, start: '2025-03-30' });
  });
});
