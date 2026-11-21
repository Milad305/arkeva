import { describe, expect, it } from 'vitest';
import { evaluateItem, type EvaluateInput, type WorkflowSettings } from './evaluate.js';

// قواعد ارزیابی آیتم (approval-workflow.md ۳–۴): AC-AP-01، ۰۲، ۰۳؛ حالت حاشیه‌ای ۳.

const settings: WorkflowSettings = {
  minPhotos: 2,
  maxJumpPct: 20,
  allowDecrease: false,
  lateAfterHours: 72,
  gpsMode: 'flag_only',
  gpsRadiusM: 300,
  approvalMode: 'two_stage',
  criticalThreshold: 15,
  stage2OnCritical: true,
  stage2OnJump: true,
  stage2OnGpsOut: true,
  stage2OnCriticalPath: false,
  autoApproveEnabled: true,
  autoApproveMaxDelta: 2,
  mspLinked: false,
};
const percentLeaf = { method: 'percent' as const, totalQuantity: null, steps: null, isCritical: false };
const approvedAt = (percent: number) => [
  { workDate: '2026-06-01', recordedAt: '2026-06-01T10:00:00Z', quantityToday: null, reportedPercent: percent, stepsProgress: null },
];

function percentItem(from: number, to: number, extra: Partial<EvaluateInput> = {}): EvaluateInput {
  return {
    leaf: percentLeaf,
    approved: approvedAt(from),
    item: { workDate: '2026-06-10', recordedAt: '2026-06-10T10:00:00Z', quantityToday: null, reportedPercent: to, stepsProgress: null },
    source: 'app',
    photos: { count: 3, pending: 0 },
    distanceFromSiteM: 120,
    delayHours: 1,
    deviceFlags: [],
    plannedPercentAtDate: 70,
    settings,
    ...extra,
  };
}

describe('ارزیابی آیتم', () => {
  it('AC-AP-01 — ۶۵ ← ۷۰، برنامه ۷۰، ۳ عکس، GPS داخل: مرحلهٔ اول بی مرحلهٔ دوم، انحراف پس از تأیید ۰', () => {
    const result = evaluateItem(percentItem(65, 70));
    expect(result).toMatchObject({ lastApprovedPercent: 65, computedPercent: 70, deltaPercent: 5, flags: [], requiresStage2: false, autoApprove: false });
    expect(result.computedPercent - result.plannedPercentAtDate).toBe(0);
  });

  it('AC-AP-02 — +۱٫۵ با دو عکس و GPS معتبر ← تأیید خودکار؛ ثبت دستی وب هرگز', () => {
    expect(evaluateItem(percentItem(40, 41.5, { photos: { count: 2, pending: 0 } })).autoApprove).toBe(true);
    expect(evaluateItem(percentItem(40, 41.5, { source: 'web_manual', photos: { count: 0, pending: 0 }, distanceFromSiteM: null })).autoApprove).toBe(false);
    expect(evaluateItem(percentItem(40, 41.5, { photos: { count: 2, pending: 1 } })).flags).toEqual(['photos_pending']);
  });

  it('AC-AP-03 — +۱۶ مرحلهٔ دوم؛ +۲۲ پرچم جهش؛ +۵ در ۴۵۰ متری پرچم GPS و مرحلهٔ دوم', () => {
    expect(evaluateItem(percentItem(40, 56))).toMatchObject({ requiresStage2: true, flags: [] });
    expect(evaluateItem(percentItem(40, 62))).toMatchObject({ requiresStage2: true, flags: ['abnormal_jump'] });
    expect(evaluateItem(percentItem(40, 45, { distanceFromSiteM: 450 }))).toMatchObject({ requiresStage2: true, flags: ['gps_out_of_range'] });
    expect(evaluateItem(percentItem(40, 45, { distanceFromSiteM: 450, settings: { ...settings, gpsMode: 'block' } })).gpsBlocked).toBe(true);
    expect(evaluateItem(percentItem(40, 56, { settings: { ...settings, approvalMode: 'single_stage' } })).requiresStage2).toBe(false);
  });

  it('۳.۲ — کاهش، تأخیر و پرچم‌های گوشی مانع تأیید خودکارند', () => {
    expect(evaluateItem(percentItem(40, 39.5)).flags).toEqual(['decrease']);
    expect(evaluateItem(percentItem(40, 41, { delayHours: 80 })).flags).toEqual(['late_submission']);
    expect(evaluateItem(percentItem(40, 41, { deviceFlags: ['mock_location'] }))).toMatchObject({ flags: ['mock_location'], autoApprove: false });
  });

  it('حالت حاشیه‌ای ۳ — مقداری ۱۰۰۰، تأییدشده ۹۶۰ و ۷۰ تازه ← فراتر از مقدار کل، درصد ۱۰۰', () => {
    const result = evaluateItem({
      ...percentItem(0, 0),
      leaf: { method: 'quantity', totalQuantity: 1000, steps: null, isCritical: false },
      approved: [{ workDate: '2026-06-01', recordedAt: '2026-06-01T10:00:00Z', quantityToday: 960, reportedPercent: null, stepsProgress: null }],
      item: { workDate: '2026-06-10', recordedAt: '2026-06-10T10:00:00Z', quantityToday: 70, reportedPercent: null, stepsProgress: null },
    });
    expect(result).toMatchObject({ lastApprovedPercent: 96, computedPercent: 100, deltaPercent: 7, flags: ['over_total_quantity'] });
  });

  it('گام‌های وزنی — گام گزارش‌نشده آخرین مقدار تأییدشده‌اش را نگه می‌دارد', () => {
    const steps = [
      { key: 'formwork', weight: 20 },
      { key: 'rebar', weight: 20 },
      { key: 'concrete', weight: 60 },
    ];
    const result = evaluateItem({
      ...percentItem(0, 0),
      leaf: { method: 'steps', totalQuantity: null, steps, isCritical: false },
      approved: [{ workDate: '2026-06-01', recordedAt: '2026-06-01T10:00:00Z', quantityToday: null, reportedPercent: null, stepsProgress: { formwork: 100 } }],
      item: { workDate: '2026-06-10', recordedAt: '2026-06-10T10:00:00Z', quantityToday: null, reportedPercent: null, stepsProgress: { rebar: 100 } },
    });
    expect(result).toMatchObject({ lastApprovedPercent: 20, computedPercent: 40, deltaPercent: 20 });
  });
});
