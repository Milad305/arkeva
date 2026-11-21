import { describe, expect, it } from 'vitest';
import { type ExistingAlert, plan } from './lifecycle.js';

// چرخهٔ هشدار (04-alert-engine ۲.۲).

const now = new Date('2026-06-21T08:00:00Z');
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000);
const alert = (overrides: Partial<ExistingAlert>): ExistingAlert => ({
  id: 'a1',
  dedupeKey: 'AL-PRG-01:wbs_item:x',
  status: 'open',
  severity: 'warning',
  resolvedAt: null,
  conditionClearedAt: null,
  ...overrides,
});
const candidate = (severity: 'info' | 'warning' | 'critical' = 'warning') => ({ dedupeKey: 'AL-PRG-01:wbs_item:x', severity });

describe('چرخهٔ هشدار', () => {
  it('AC-AL-02 — ارزیابی دوباره بی تغییر هشدار تکراری نمی‌سازد و اعلان نمی‌دهد', () => {
    expect(plan([candidate()], [], now)).toEqual([{ kind: 'create', dedupeKey: 'AL-PRG-01:wbs_item:x', notify: true }]);
    expect(plan([candidate()], [alert({})], now)).toEqual([
      { kind: 'update', id: 'a1', dedupeKey: 'AL-PRG-01:wbs_item:x', severity: 'warning', notify: false },
    ]);
    expect(plan([candidate()], [alert({ status: 'seen' })], now)[0]).toMatchObject({ kind: 'update', notify: false });
  });

  it('AC-AL-03 — ارتقا به بحرانی همان هشدار با اعلان تازه؛ کاهش شدت بی اعلان', () => {
    expect(plan([candidate('critical')], [alert({})], now)[0]).toMatchObject({ kind: 'update', severity: 'critical', notify: true });
    expect(plan([candidate('warning')], [alert({ severity: 'critical' })], now)[0]).toMatchObject({ kind: 'update', severity: 'warning', notify: false });
  });

  it('AC-AL-04 — رفع شرط ← resolved؛ برقراری دوباره در ۲۴ ساعت ← بازگشایی همان هشدار بی اعلان؛ پس از ۲۴ ساعت هشدار تازه', () => {
    expect(plan([], [alert({})], now)).toEqual([{ kind: 'resolve', id: 'a1' }]);
    expect(plan([candidate()], [alert({ status: 'resolved', resolvedAt: hoursAgo(5) })], now)).toEqual([
      { kind: 'reopen', id: 'a1', dedupeKey: 'AL-PRG-01:wbs_item:x', notify: false },
    ]);
    expect(plan([candidate()], [alert({ status: 'resolved', resolvedAt: hoursAgo(30) })], now)[0]).toMatchObject({ kind: 'create', notify: true });
  });

  it('ردشده تا رفع و برقراری دوباره ساکت می‌ماند', () => {
    expect(plan([candidate()], [alert({ status: 'dismissed' })], now)).toEqual([]);
    expect(plan([], [alert({ status: 'dismissed' })], now)).toEqual([{ kind: 'clear_dismissed', id: 'a1' }]);
    expect(plan([candidate()], [alert({ status: 'dismissed', conditionClearedAt: hoursAgo(1) })], now)[0]).toMatchObject({ kind: 'create' });
  });
});
