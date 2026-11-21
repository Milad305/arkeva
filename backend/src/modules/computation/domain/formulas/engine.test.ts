import { describe, expect, it } from 'vitest';
import { type ApprovedEntry, type LeafShape, type ModelNode, type ProgressModel, rial, stateAt, statusesOf, weightsInProject } from './engine.js';
import { evm } from './evm.js';
import type { WorkCalendar } from './schedule.js';

// مثال مرجع (00 ۶) روی موتور: تاریخ داده 1405/03/31 = 2026-06-21. تقویم هفت‌روزه بی تعطیلی تا تاریخ‌های برنامه ساده بمانند؛
// 1.2.1 از 06-12 تا 07-01 (۲۰ روز) ← در 06-21 دقیقاً ۵۰٪.

const M = 1_000_000n;
const DATA_DATE = '2026-06-21';
const calendar: WorkCalendar = { weekModes: ['full', 'full', 'full', 'full', 'full', 'full', 'full'], holidays: new Set() };

const node = (id: string, parentId: string | null, weight: number, bac: bigint, dates: [string, string] | null = null): ModelNode => ({
  id,
  parentId,
  isLeaf: dates !== null,
  isMilestone: false,
  weight,
  plannedStart: dates?.[0] ?? null,
  plannedFinish: dates?.[1] ?? null,
  bac,
});

const reference = (weights: Record<string, number> = {}): ModelNode[] => [
  node('1.1', null, weights['1.1'] ?? 40, 0n),
  node('1.1.1', '1.1', weights['1.1.1'] ?? 30, 100n * M, ['2026-03-25', '2026-04-20']),
  node('1.1.2', '1.1', weights['1.1.2'] ?? 70, 300n * M, ['2026-04-21', '2026-05-31']),
  node('1.2', null, weights['1.2'] ?? 60, 0n),
  node('1.2.1', '1.2', weights['1.2.1'] ?? 50, 300n * M, ['2026-06-12', '2026-07-01']),
  node('1.2.2', '1.2', weights['1.2.2'] ?? 50, 300n * M, ['2026-07-02', '2026-09-22']),
];

const shape = (method: LeafShape['method'], extra: Partial<LeafShape> = {}): LeafShape => ({
  method,
  totalQuantity: null,
  steps: null,
  isMilestone: false,
  plannedStart: null,
  plannedFinish: null,
  ...extra,
});

const shapes = new Map<string, LeafShape>([
  ['1.1.1', shape('quantity', { totalQuantity: 500 })],
  ['1.1.2', shape('quantity', { totalQuantity: 200 })],
  [
    '1.2.1',
    shape('steps', {
      steps: [
        { key: 'formwork', weight: 20 },
        { key: 'rebar', weight: 20 },
        { key: 'concrete', weight: 60 },
      ],
    }),
  ],
  ['1.2.2', shape('percent')],
]);

const entry = (wbsItemId: string, workDate: string, values: Partial<ApprovedEntry>, recordedAt = `${workDate}T10:00:00Z`): ApprovedEntry => ({
  wbsItemId,
  workDate,
  recordedAt,
  quantityToday: null,
  reportedPercent: null,
  stepsProgress: null,
  approvedAt: `${workDate}T14:00:00Z`,
  ...values,
});

const approved = new Map<string, ApprovedEntry[]>([
  ['1.1.1', [entry('1.1.1', '2026-04-05', { quantityToday: 300 }), entry('1.1.1', '2026-04-15', { quantityToday: 200 })]],
  ['1.1.2', [entry('1.1.2', '2026-05-10', { quantityToday: 120 }), entry('1.1.2', '2026-05-20', { quantityToday: 60 })]],
  ['1.2.1', [entry('1.2.1', '2026-06-15', { stepsProgress: { formwork: 100 } }), entry('1.2.1', '2026-06-19', { stepsProgress: { rebar: 100 } })]],
]);

const model = (overrides: Partial<ProgressModel> = {}): ProgressModel => ({
  reference: reference(),
  shapes,
  outOfReference: [],
  approved,
  calendar,
  ...overrides,
});

describe('موتور پیشرفت — مثال مرجع', () => {
  it('AC-PC-01 — واقعی ۴۹٫۲، برنامه‌ای ۵۵، انحراف −۵٫۸، PV ۵۵۰، EV ۴۹۰، ریالی ۴۹٫۰؛ گروه‌ها ۹۳/۱۰۰ و ۲۰/۲۵', () => {
    const state = stateAt(model(), DATA_DATE);
    expect(state.actual).toBeCloseTo(49.2, 10);
    expect(state.planned).toBeCloseTo(55, 10);
    expect(state.actual - state.planned).toBeCloseTo(-5.8, 10);
    expect(rial(state.pv)).toBe(550n * M);
    expect(rial(state.ev)).toBe(490n * M);
    expect(rial(state.bac)).toBe(1000n * M);
    expect((state.ev / state.bac) * 100).toBeCloseTo(49, 10);
    expect(state.items.get('1.1')).toMatchObject({ planned: 100 });
    expect(state.items.get('1.1')?.actual).toBeCloseTo(93, 10);
    expect(state.items.get('1.2')).toMatchObject({ planned: 25, actual: 20 });
    expect(state.items.get('1.1.2')).toMatchObject({ actual: 90, actualQuantity: 180 });
    expect(state.items.get('1.2.1')).toMatchObject({ planned: 50, actual: 40 });
    const statuses = statusesOf(state, { warning: 5, critical: 15 });
    expect(Object.fromEntries(statuses)).toMatchObject({
      '1.1.1': 'completed',
      '1.1.2': 'warning',
      '1.1': 'warning',
      '1.2.1': 'warning',
      '1.2.2': 'not_started',
      '1.2': 'warning',
    });
    expect(weightsInProject(model()).get('1.1.2')).toBeCloseTo(28, 10);
  });

  it('AC-EV-01 — با AC ۵۲۰: CPI ۰٫۹۴۲۳، SPI ۰٫۸۹۰۹، EAC ۱٬۰۶۱٬۲۲۴٬۴۹۰ ریال', () => {
    const state = stateAt(model(), DATA_DATE);
    const result = evm({ bac: rial(state.bac), pv: rial(state.pv), ev: rial(state.ev), evAtCost: rial(state.ev), ac: 520n * M, method: 'cpi' });
    expect(result.cpi).toBeCloseTo(0.9423, 4);
    expect(result.spi).toBeCloseTo(0.8909, 4);
    expect(result.eac).toBe(1_061_224_490n);
  });

  it('AC-PC-02 — وزن «از هزینه»: فیزیکی و ریالی هر دو ۴۹٫۰', () => {
    const state = stateAt(model({ reference: reference({ '1.1.1': 25, '1.1.2': 75 }) }), DATA_DATE);
    expect(state.actual).toBeCloseTo(49, 10);
    expect((state.ev / state.bac) * 100).toBeCloseTo(49, 10);
  });

  it('AC-PC-03 — دو آیتم درصدی یک روز: ترتیب ثبت دستگاه تعیین می‌کند، نه ترتیب تأیید', () => {
    const late = entry('1.2.2', '2026-06-20', { reportedPercent: 12 }, '2026-06-20T15:00:00Z');
    const early = entry('1.2.2', '2026-06-20', { reportedPercent: 8 }, '2026-06-20T09:00:00Z');
    const a = stateAt(model({ approved: new Map([...approved, ['1.2.2', [late, early]]]) }), DATA_DATE);
    const b = stateAt(model({ approved: new Map([...approved, ['1.2.2', [early, late]]]) }), DATA_DATE);
    expect(a.items.get('1.2.2')?.actual).toBe(12);
    expect(b.items.get('1.2.2')?.actual).toBe(12);
  });

  it('AC-PC-04 — تاریخ پیش از آیتم‌ها: آیتم با workDate بعدی اثری ندارد', () => {
    expect(stateAt(model(), '2026-05-15').items.get('1.1.2')?.actual).toBe(60);
    expect(stateAt(model(), '2026-05-20').items.get('1.1.2')?.actual).toBe(90);
  });

  it('AC-PC-06 — OD-18: برگ افزوده پس از مرجع BAC، PV و EV رسمی را عوض نمی‌کند؛ کار خارج از مبنا ۵۰ و ۱۰', () => {
    const extra = new Map([...approved, ['1.3', [entry('1.3', '2026-06-18', { reportedPercent: 20 })]]]);
    const state = stateAt(
      model({ outOfReference: [{ id: '1.3', bac: 50n * M }], shapes: new Map([...shapes, ['1.3', shape('percent')]]), approved: extra }),
      DATA_DATE,
    );
    expect([rial(state.bac), rial(state.pv), rial(state.ev)]).toEqual([1000n * M, 550n * M, 490n * M]);
    expect(state.outOfReference).toEqual({ count: 1, currentBac: 50_000_000, earnedValue: 10_000_000 });
  });

  it('AC-PC-07 — برگ زمانی بی گزارش: واقعی = برنامهٔ زمانی نسخهٔ جاری', () => {
    const timed = new Map([...shapes, ['1.2.1', shape('time_based', { plannedStart: '2026-06-17', plannedFinish: '2026-06-26' })]]);
    const state = stateAt(model({ shapes: timed }), DATA_DATE);
    // 06-17..06-21 = ۵ از ۱۰ روز
    expect(state.items.get('1.2.1')?.actual).toBe(50);
  });

  it('AC-PC-09 — دو بار اجرا روی همان واقعیت‌ها، همان نتیجه', () => {
    expect(stateAt(model(), DATA_DATE)).toEqual(stateAt(model(), DATA_DATE));
  });
});
