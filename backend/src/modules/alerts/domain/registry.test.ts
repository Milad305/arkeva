import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ALERT_RULES, resolveSetting, RULES_BY_CODE } from './registry.js';
import type { CbsLeafFact, LeafFact, ProjectFacts } from './rule-types.js';

// رجیستری قواعد (04-alert-engine ۳، ۴): مثال طلایی روی واقعیت‌های مثال مرجع و مثال CBS، و هم‌خوانی فهرست با `03` ۵.۱.

const M = 1_000_000n;
const leaf = (id: string, planned: number, actual: number, weightShare: number, budgetShare: number): LeafFact => ({
  id,
  code: id,
  title: id,
  isMilestone: false,
  method: 'percent',
  supervisorUserId: 'sup',
  plannedStart: '2026-04-01',
  planned,
  actual,
  hasPending: false,
  linked: true,
  routed: true,
  weightShare,
  budgetShare,
  workDaysSinceStart: planned > 0 ? 30 : -10,
});
const cbs = (id: string, budget: number, ev: number, eac: number, consumed: number): CbsLeafFact => ({
  id,
  code: id,
  title: id,
  budget: BigInt(budget) * M,
  ev: BigInt(ev) * M,
  eac: BigInt(Math.round(eac * 1_000_000)),
  consumedPercent: consumed,
});

const reference: ProjectFacts = {
  projectId: 'p',
  today: '2026-06-21',
  thresholds: { warning: 5, critical: 15 },
  reviewDeadlineHours: 24,
  weightGenerator: 'manual',
  daysActive: 88,
  progress: {
    dataDate: '2026-06-21',
    planned: 55,
    actual: 49.2,
    delayDays: 14,
    forecastFinish: '2026-10-11',
    bac: 1000n * M,
    ac: 520n * M,
    evAtCost: 490n * M,
    cpi: 490 / 520,
    unallocatedBudget: 0n,
  },
  costsCompleteThrough: '2026-06-21',
  leaves: [leaf('1.1.1', 100, 100, 0.12, 0.1), leaf('1.1.2', 100, 90, 0.28, 0.3), leaf('1.2.1', 50, 40, 0.3, 0.3), leaf('1.2.2', 0, 0, 0.3, 0.3)],
  cbsLeaves: [cbs('C1', 100, 100, 105, 105), cbs('C2', 400, 200, 430, 53.75), cbs('C3', 300, 130, 323.0769, 46.67), cbs('C4', 200, 60, 200, 30)],
  supervisors: [],
  approvers: [],
  needsResolution: 0,
  fallbackApproverName: 'مدیر پروژه',
  openPeriods: [],
  supervisorNames: new Map([['sup', 'سرپرست']]),
  nowMs: Date.parse('2026-06-21T08:00:00Z'),
  risks: [],
  mspPending: null,
};

const findingsOf = (facts: ProjectFacts) =>
  ALERT_RULES.flatMap((rule) =>
    rule.evaluate(facts, resolveSetting(rule, undefined, undefined).params).map((finding) => `${rule.code}:${finding.subjectId}:${finding.severity}`),
  ).sort();

describe('رجیستری قواعد هشدار', () => {
  it('AC-AL-01 — مثال طلایی: دقیقاً همین هشدارها (۴)', () => {
    expect(findingsOf(reference)).toEqual(
      [
        'AL-PRG-01:1.1.2:warning',
        'AL-PRG-01:1.2.1:warning',
        'AL-PRG-02:p:warning',
        'AL-PRG-03:p:warning',
        'AL-CST-01:C1:warning',
        'AL-CST-02:C1:warning',
        'AL-CST-02:C2:warning',
        'AL-CST-02:C3:warning',
        'AL-CST-04:p:warning',
      ].sort(),
    );
  });

  it('AC-AL-07 — متن هزینه بی `cbs.view_amounts` مبلغ ندارد', () => {
    const rule = RULES_BY_CODE.get('AL-CST-02');
    const finding = rule?.evaluate(reference, { tolerancePct: 0 }).find((entry) => entry.subjectId === 'C2');
    expect(rule?.guidance(finding?.values ?? {}, true)).toContain('میلیون ریال');
    expect(rule?.guidance(finding?.values ?? {}, false)).not.toContain('ریال');
  });

  it('AC-AL-08 — پارامتر پروژه بر سازمان و آن بر پیش‌فرض کد غالب؛ غیرقابل‌خاموش همیشه روشن', () => {
    const rule = RULES_BY_CODE.get('AL-CST-01');
    if (!rule) throw new Error('AL-CST-01 نیست');
    expect(resolveSetting(rule, undefined, undefined).params).toEqual({ pct: 90 });
    expect(resolveSetting(rule, { enabled: null, params: { pct: 80 } }, undefined).params).toEqual({ pct: 80 });
    expect(resolveSetting(rule, { enabled: false, params: { pct: 80 } }, { enabled: null, params: { pct: 95 } })).toEqual({
      enabled: false,
      params: { pct: 95 },
    });
    const locked = RULES_BY_CODE.get('AL-STR-06');
    if (!locked) throw new Error('AL-STR-06 نیست');
    expect(resolveSetting(locked, { enabled: false, params: {} }, { enabled: false, params: {} }).enabled).toBe(true);
  });

  it('AC-AL-09 — هر قاعده متن، لینک و نام دارد و فهرست با `03` ۵.۱ یکی است', () => {
    const matrix = readFileSync(fileURLToPath(new URL('../../../../../design/03-interaction-matrices.md', import.meta.url)), 'utf8');
    const documented = [...new Set([...matrix.matchAll(/^\| (AL-[A-Z]+-\d+) \|/gm)].map((match) => match[1] as string))].sort();
    expect(ALERT_RULES.map((rule) => rule.code).sort()).toEqual(documented);
    for (const rule of ALERT_RULES) {
      expect(rule.name.length).toBeGreaterThan(0);
      expect(typeof rule.guidance).toBe('function');
      expect(typeof rule.link).toBe('function');
    }
  });
});
