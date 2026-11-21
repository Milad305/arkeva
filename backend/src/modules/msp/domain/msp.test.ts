import { describe, expect, it } from 'vitest';
import { sampleMspdi, sampleTasks } from '../../../../test/fixtures/msp.js';
import { buildPlan, shareUnits, type WeightGenerator } from './build.js';
import { blockingOf, buildChecks } from './checks.js';
import { buildMapping } from './mapping.js';
import { MspFileError, parseMspdi, readMspUpload } from './mspdi.js';
import { parseXml, XmlError } from './xml.js';

// قواعد خالص ورود MSP (msp-integration.md ۴، ۷.۱).

let seq = 0;
const newId = () => `00000000-0000-7000-8000-${String(++seq).padStart(12, '0')}`;
const file = () => parseMspdi('sample.xml', 1000, sampleMspdi(sampleTasks()));

describe('MSP: خواندن فایل', () => {
  it('MSPDI نمونهٔ ۱۸۶ فعالیتی: درخت، تاریخ، هزینه، منبع، واحد و وابستگی', () => {
    const parsed = file();
    expect(parsed.tasks).toHaveLength(186);
    expect(parsed.resources).toEqual(['Ali Mohammadi', 'Unknown Crew']);
    expect(parsed.tasks[2]).toMatchObject({
      wbs: '1.1.1',
      start: '2026-03-01',
      finish: '2026-03-05',
      durationDays: 5,
      cost: 1_000_000,
      unit: 'مترمکعب',
      quantity: 100,
    });
    expect(parsed.tasks[3]?.predecessors).toEqual([3]);
  });

  it('MPP و DOCTYPE رد می‌شوند؛ ارجاع موجودیت بیرونی خوانده نمی‌شود', () => {
    expect(() => readMspUpload({ originalname: 'plan.mpp', size: 10, buffer: Buffer.from('x') })).toThrow(/XML Format/);
    expect(() => parseXml('<!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><Project>&e;</Project>')).toThrow(XmlError);
    expect(() => parseMspdi('a.xml', 1, '<Project><Tasks></Tasks></Project>')).toThrow(MspFileError);
    expect(parseXml('<a:Project xmlns:a="x"><Name>A &amp; B</Name><Note><![CDATA[<b>]]></Note></a:Project>').children.map((entry) => entry.text)).toEqual([
      'A & B',
      '<b>',
    ]);
  });
});

describe('MSP: اعتبارسنجی و ساخت', () => {
  it('AC-MS-03 — خطا تا تعیین تکلیف ادامه را می‌بندد؛ هشدار نه؛ «بارگذاری دوباره» همیشه می‌بندد', () => {
    const tasks = sampleTasks({ phases: 1, groups: 1, leaves: 3 });
    const broken = parseMspdi('b.xml', 1, sampleMspdi([...tasks, { ...(tasks[2] as (typeof tasks)[number]), wbs: '1.1.9', name: 'تکراری' }]));
    const checks = buildChecks(broken);
    expect(checks.find((check) => check.id === 'duplicate_uid')).toMatchObject({ severity: 'error' });
    expect(blockingOf(checks).canContinue).toBe(false);
    for (const check of checks) if (check.severity === 'error') check.resolution = 'reupload';
    expect(blockingOf(checks)).toMatchObject({ canContinue: false, reason: 'فایل را اصلاح و دوباره بارگذاری کنید.' });

    const warnings = buildChecks(
      parseMspdi(
        'w.xml',
        1,
        sampleMspdi([...tasks, { uid: 99, wbs: '2', name: 'نقطهٔ عطف', level: 1, start: '2026-04-01', finish: '2026-04-01', days: 0, milestone: true }]),
      ),
    );
    expect(warnings.some((check) => check.severity === 'warning')).toBe(true);
    expect(blockingOf(warnings).canContinue).toBe(true);
  });

  it.each<WeightGenerator>(['duration', 'cost', 'equal'])('AC-MS-02 — جمع وزن هر گروه با مولد «%s» دقیقاً 100.0000', (generator) => {
    const parsed = file();
    const plan = buildPlan(
      parsed,
      {
        checks: buildChecks(parsed),
        mapping: buildMapping(parsed, null),
        buildCbs: true,
        weightGenerator: generator,
        resources: [{ name: 'Ali Mohammadi', userId: 'u-1' }],
      },
      newId,
    );
    const groups = new Map<string | null, number>();
    for (const node of plan.wbs) groups.set(node.parentId, (groups.get(node.parentId) ?? 0) + Math.round(Number(node.weightInParent) * 10_000));
    expect([...groups.values()].every((sum) => sum === 1_000_000)).toBe(true);
    expect(plan.wbs).toHaveLength(186);
    expect(plan.uids).toHaveLength(186);
    // نیمی از فازها منبع نگاشت‌شده دارند (۳ فاز × ۲۵ برگ)
    expect(plan.supervisors.size).toBe(75);
    expect(plan.withoutSupervisor).toBe(75);
    expect(plan.cbs.filter((node) => node.isLeaf)).toHaveLength(150);
    expect(plan.totalBudget).toBe(6n * 5n * 15_000_000n);
    expect(plan.leaves.get('1.1.1')).toMatchObject({ measurementMethod: 'quantity', unit: 'مترمکعب', totalQuantity: '100', codeMode: 'custom' });
  });

  it('سهم‌ها: گرد نیمه به بالا و باقی‌مانده به آخرین سهم مثبت', () => {
    expect(shareUnits([35, 30, 30])).toEqual([368_421, 315_789, 315_790]);
    expect(shareUnits([1, 1, 0])).toEqual([500_000, 500_000, 0]);
    expect(shareUnits([0, 0])).toEqual([0, 0]);
  });
});
