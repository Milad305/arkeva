import { describe, expect, it } from 'vitest';
import { buildXer, type XerNode } from './xer.js';

// خروجی XER برای P6 (integrations.md ۶.۳).

const node = (over: Partial<XerNode> & Pick<XerNode, 'id' | 'code'>): XerNode => ({
  parentId: null,
  sortOrder: 0,
  title: over.code,
  isLeaf: true,
  isMilestone: false,
  plannedStart: '2026-03-21',
  plannedFinish: '2026-04-20',
  percent: 0,
  supervisorId: null,
  ...over,
});

describe('یکپارچه‌سازی: XER', () => {
  it('گره میانی ← PROJWBS، برگ ← TASK با درصد فیزیکی و وضعیت؛ سرپرست ← RSRC و TASKRSRC', () => {
    const xer = buildXer({
      projectCode: 'PRJ-1405-001',
      projectName: 'ساختمان\tمرجع',
      exportDate: '2026-11-17',
      workDaysPerWeek: 6,
      nodes: [
        node({ id: 'g', code: '1', title: 'سازه', isLeaf: false }),
        node({ id: 'a', code: '1.1', parentId: 'g', sortOrder: 1, percent: 49.2, supervisorId: 'u1' }),
        node({ id: 'b', code: '1.2', parentId: 'g', sortOrder: 2, percent: 100 }),
        node({ id: 'm', code: '2', sortOrder: 3, isMilestone: true, plannedStart: null, plannedFinish: '2026-05-01' }),
      ],
      resources: [{ id: 'u1', name: 'رضا کریمی' }],
    });
    const lines = xer.split('\r\n');
    expect(lines[0]).toMatch(/^ERMHDR\t19\.12\t2026-11-17\t/);
    expect(lines.at(-2)).toBe('%E');
    const rows = (name: string) => {
      const start = lines.indexOf(`%T\t${name}`);
      const fields = (lines[start + 1] ?? '').split('\t').slice(1);
      const body: Record<string, string>[] = [];
      for (let index = start + 2; lines[index]?.startsWith('%R'); index += 1) {
        const cells = (lines[index] ?? '').split('\t').slice(1);
        body.push(Object.fromEntries(fields.map((field, at) => [field, cells[at] ?? ''])));
      }
      return body;
    };
    const wbs = rows('PROJWBS');
    expect(wbs.map((row) => row['wbs_short_name'])).toEqual(['PRJ-1405-001', '1']);
    expect(wbs[0]?.['wbs_name']).toBe('ساختمان مرجع');
    const tasks = rows('TASK');
    expect(tasks.map((row) => [row['task_code'], row['phys_complete_pct'], row['status_code'], row['task_type']])).toEqual([
      ['1.1', '49.2', 'TK_Active', 'TT_Task'],
      ['1.2', '100', 'TK_Complete', 'TT_Task'],
      ['2', '0', 'TK_NotStart', 'TT_FinMile'],
    ]);
    expect(tasks[0]?.['wbs_id']).toBe(wbs[1]?.['wbs_id']);
    expect(tasks[2]?.['wbs_id']).toBe(wbs[0]?.['wbs_id']);
    expect(tasks[2]?.['target_start_date']).toBe('2026-05-01 08:00');
    expect(rows('RSRC')[0]?.['rsrc_name']).toBe('رضا کریمی');
    expect(rows('TASKRSRC').map((row) => row['task_id'])).toEqual([tasks[0]?.['task_id']]);
    expect(rows('CALENDAR')[0]?.['week_hr_cnt']).toBe('48');
    expect(xer).not.toContain('TASKPRED');
  });

  it('ترتیب فعالیت‌ها ترتیب درخت است، نه sortOrder تنها (sortOrder جای گره میان خواهر و برادرهاست)', () => {
    const xer = buildXer({
      projectCode: 'P',
      projectName: 'P',
      exportDate: '2026-11-18',
      workDaysPerWeek: 6,
      nodes: [
        node({ id: 'g1', code: '1.1', isLeaf: false, sortOrder: 0 }),
        node({ id: 'g2', code: '1.2', isLeaf: false, sortOrder: 1 }),
        node({ id: 'b', code: '1.2.1', parentId: 'g2', sortOrder: 0 }),
        node({ id: 'a', code: '1.1.1', parentId: 'g1', sortOrder: 0 }),
        node({ id: 'c', code: '1.1.2', parentId: 'g1', sortOrder: 1 }),
      ],
      resources: [],
    });
    const codes = xer
      .split('\r\n')
      .filter((line) => line.startsWith('%R') && /\t1\.\d\.\d\t/.test(line))
      .map((line) => /\t(1\.\d\.\d)\t/.exec(line)?.[1]);
    expect(codes).toEqual(['1.1.1', '1.1.2', '1.2.1']);
  });
});
