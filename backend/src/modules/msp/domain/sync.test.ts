import { describe, expect, it } from 'vitest';
import { sampleMspdi, sampleTasks } from '../../../../test/fixtures/msp.js';
import { buildChecks } from './checks.js';
import { buildPlan } from './build.js';
import { buildMapping } from './mapping.js';
import { parseMspdi } from './mspdi.js';
import { applySync } from './sync-apply.js';
import { diffFile } from './sync-diff.js';
import { patchProgress, replaceCalendar } from './xml-export.js';

// همگام‌سازی و خروجی MSP — قواعد خالص (msp-integration.md ۷.۳، ۷.۴).

let seq = 0;
const newId = () => `00000000-0000-7000-8000-${String(++seq).padStart(12, '0')}`;
const tasks = () => sampleTasks({ phases: 1, groups: 1, leaves: 3 });

function imported() {
  const file = parseMspdi('a.xml', 1, sampleMspdi(tasks()));
  const plan = buildPlan(
    file,
    { checks: buildChecks(file), mapping: buildMapping(file, null), buildCbs: false, weightGenerator: 'equal', resources: [] },
    newId,
  );
  return { file, plan, uidOf: new Map(plan.uids.map((entry) => [entry.wbsItemId, entry.uid])) };
}

describe('MSP: همگام‌سازی', () => {
  it('AC-MS-06 — عنوان: فقط MSP ← update؛ هر دو طرف ← conflict؛ فقط پروژه‌یار ← بی تغییر', () => {
    const { file, plan, uidOf } = imported();
    const leaf = plan.wbs.find((node) => node.code === '1.1.1');
    const ours = plan.wbs.map((node) => (node.code === '1.1.1' ? { ...node, title: 'پروژه‌یار' } : node));
    const synced = new Map(plan.wbs.map((node) => [node.id, node]));
    const base = { uidOf, lastFile: file, lastSynced: synced, approvedLeaves: new Set<string>() };
    const theirs = parseMspdi('b.xml', 1, sampleMspdi(tasks().map((task) => (task.wbs === '1.1.1' ? { ...task, name: 'MSP' } : task))));
    expect(diffFile({ ...base, current: plan.wbs, file: theirs }).map((change) => [change.kind, change.field])).toEqual([['update', 'title']]);
    expect(diffFile({ ...base, current: ours, file: theirs }).map((change) => [change.kind, change.wbsItemId])).toEqual([['conflict', leaf?.id]]);
    expect(diffFile({ ...base, current: ours, file })).toEqual([]);
  });

  it('حذف انتخاب‌نشده، افزودن با وزن میانگین و جمع ۱۰۰، تاریخ والد از فرزندان', () => {
    const { plan, uidOf, file } = imported();
    const next = tasks().filter((task) => task.uid !== 5);
    const incoming = parseMspdi(
      'c.xml',
      1,
      sampleMspdi([...next, { ...(next[3] as (typeof next)[number]), uid: 20, wbs: '1.1.4', name: 'تازه', finish: '2026-04-30' }]),
    );
    const changes = diffFile({ current: plan.wbs, uidOf, file: incoming, lastFile: file, lastSynced: null, approvedLeaves: new Set() });
    expect(changes.map((change) => [change.kind, change.code, change.selected])).toEqual([
      ['delete', '1.1.3', false],
      ['add', '1.1.4', true],
    ]);
    const applied = applySync({
      current: plan.wbs,
      changes: changes.map((change) => ({ ...change, resolution: null })),
      uidOf,
      fileMeta: new Map(),
      reweight: true,
      newId,
    });
    const group = applied.wbs.find((node) => node.code === '1.1');
    const kids = applied.wbs.filter((node) => node.parentId === group?.id);
    expect(kids.map((node) => node.code)).toEqual(['1.1.1', '1.1.2', '1.1.4']);
    expect(kids.reduce((sum, node) => sum + Math.round(Number(node.weightInParent) * 10_000), 0)).toBe(1_000_000);
    expect(group?.plannedFinish).toBe('2026-04-30');
    expect(applied.added.map((entry) => entry.uid)).toEqual([20]);
  });
});

describe('MSP: فایل خروجی', () => {
  it('AC-MS-09 — درصد و تاریخ واقعی فقط در فعالیت همان UID؛ بقیهٔ متن دست‌نخورده', () => {
    const xml = sampleMspdi(tasks());
    const { xml: out, updated } = patchProgress(xml, new Map([[3, { percent: 62.6, actualStart: '2026-03-02', actualFinish: null }]]));
    expect(updated).toBe(1);
    const task3 = /<Task><UID>3<\/UID>[\s\S]*?<\/Task>/.exec(out)?.[0] ?? '';
    expect(task3).toContain('<PercentComplete>63</PercentComplete>');
    expect(task3).toContain('<ActualStart>2026-03-02T08:00:00</ActualStart>');
    expect(out.replace(task3, '')).toBe(xml.replace(/<Task><UID>3<\/UID>[\s\S]*?<\/Task>/, ''));
  });

  it('تقویم پایهٔ پروژه با روزهای کاری و تعطیلات جایگزین یا افزوده می‌شود', () => {
    const spec = {
      name: 'تقویم پروژه‌یار',
      weekModes: ['full', 'full', 'full', 'full', 'full', 'half', 'off'] as const,
      dayStart: '07:00',
      dayEnd: '16:00',
      halfDayEnd: '12:00',
      holidays: [{ date: '2026-03-21', title: 'نوروز' }],
    };
    const added = replaceCalendar(sampleMspdi(tasks()), { ...spec, weekModes: [...spec.weekModes] });
    expect(added).toContain('<CalendarUID>1</CalendarUID>');
    expect(added).toContain('<DayType>6</DayType><DayWorking>0</DayWorking>');
    expect(added).toContain('<ToTime>12:00:00</ToTime>');
    expect(added).toContain('<Name>نوروز</Name>');
    const existing =
      '<Project><CalendarUID>3</CalendarUID><Calendars><Calendar><UID>3</UID><Name>Standard</Name></Calendar></Calendars><Tasks></Tasks></Project>';
    const replaced = replaceCalendar(existing, { ...spec, weekModes: [...spec.weekModes] });
    expect(replaced).toContain('<Calendar><UID>3</UID><Name>تقویم پروژه‌یار</Name>');
    expect(replaced).not.toContain('Standard');
  });
});
