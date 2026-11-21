import { describe, expect, it } from 'vitest';
import { categoryOf, dedupeKeyOf, groupKeyOf, mergeDecision } from './notification-rules.js';

describe('قواعد اعلان (notifications.md ۵.۳)', () => {
  it('W06 — زبانه از کد', () => {
    expect(categoryOf('NT-APR-01')).toBe('approvals');
    expect(categoryOf('NT-FLD-02')).toBe('approvals');
    expect(categoryOf('AL-APR-01')).toBe('approvals');
    expect(categoryOf('NT-RSK-03')).toBe('risks');
    expect(categoryOf('AL-PRG-01')).toBe('system');
    expect(categoryOf('NT-ASG-01')).toBe('system');
  });

  it('AC-NT-03 — ارتقای شدت کلید dedupe تازه دارد، همان شدت نه', () => {
    const base = { userId: 'u', code: 'AL-PRG-01', subjectId: 's', channel: 'in_app' };
    expect(dedupeKeyOf({ ...base, severity: 'warning' })).toBe(dedupeKeyOf({ ...base, severity: 'warning' }));
    expect(dedupeKeyOf({ ...base, severity: 'critical' })).not.toBe(dedupeKeyOf({ ...base, severity: 'warning' }));
    expect(groupKeyOf('NT-APR-01', null)).toBe('NT-APR-01:org');
  });

  it('AC-NT-04 — ۵ جدا، ششمی ادغامی تازه، بعدی‌ها به همان', () => {
    const separate = (n: number) => Array.from({ length: n }, (_, index) => ({ id: `n${index}`, mergedCount: 0 }));
    expect(mergeDecision(separate(4))).toEqual({ kind: 'separate' });
    expect(mergeDecision(separate(5))).toEqual({ kind: 'open_merged' });
    expect(mergeDecision([...separate(5), { id: 'm', mergedCount: 1 }])).toEqual({ kind: 'add_to_merged', mergedId: 'm' });
  });
});
