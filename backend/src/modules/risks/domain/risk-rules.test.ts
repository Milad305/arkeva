import { describe, expect, it } from 'vitest';
import { autoStatus, isOverdue, levelOf, mentionedIn, scheduleImpact, scoreOf } from './risk-rules.js';

// قواعد خالص ریسک (risk.md ۵).

describe('قواعد ریسک', () => {
  it('AC-RK-01 — ۴×۴ = ۱۶ «بالا»؛ ۴×۵ = ۲۰ «بحرانی»؛ بازه‌های سطح', () => {
    expect(scoreOf(4, 4)).toEqual({ score: 16, level: 'high' });
    expect(scoreOf(4, 5)).toEqual({ score: 20, level: 'critical' });
    expect(scoreOf(null, null)).toEqual({ score: null, level: null });
    expect([1, 8, 9, 14, 15, 19, 20, 25].map(levelOf)).toEqual(['low', 'low', 'medium', 'medium', 'high', 'high', 'critical', 'critical']);
  });

  it('AC-RK-06 — اقدام باز ← in_action؛ پایان همه ← assessed؛ بی امتیاز identified؛ رخ‌داده و بسته دست نمی‌خورند', () => {
    expect(autoStatus('assessed', true, [{ status: 'open' }])).toBe('in_action');
    expect(autoStatus('in_action', true, [{ status: 'done' }, { status: 'cancelled' }])).toBe('assessed');
    expect(autoStatus('in_action', true, [{ status: 'in_progress' }])).toBe('in_action');
    expect(autoStatus('identified', false, [{ status: 'open' }])).toBe('identified');
    expect(autoStatus('identified', true, [])).toBe('assessed');
    expect(autoStatus('closed', true, [{ status: 'open' }])).toBe('closed');
    expect(autoStatus('occurred', true, [])).toBe('occurred');
  });

  it('معوق: موعد گذشته و باز یا در جریان', () => {
    expect(isOverdue({ status: 'open', dueDate: '2026-06-20' }, '2026-06-21')).toBe(true);
    expect(isOverdue({ status: 'in_progress', dueDate: '2026-06-21' }, '2026-06-21')).toBe(false);
    expect(isOverdue({ status: 'done', dueDate: '2026-06-01' }, '2026-06-21')).toBe(false);
  });

  it('نام‌بردن با @نام کامل؛ نام بلندتر اول', () => {
    const members = [
      { id: 'a', fullName: 'علی' },
      { id: 'b', fullName: 'علی رضایی' },
      { id: 'c', fullName: 'مریم احمدی' },
    ];
    expect(mentionedIn('@علی رضایی لطفاً بررسی کن', members)).toEqual(['b']);
    expect(mentionedIn('@علی و @مریم احمدی', members).sort()).toEqual(['a', 'c']);
    expect(mentionedIn('بدون نام', members)).toEqual([]);
  });

  it('اثر زمانی: MSP ← جمع روی مسیر بحرانی؛ بی MSP ← بیشینه', () => {
    const risks = [
      { days: 10, critical: true },
      { days: 25, critical: false },
      { days: 5, critical: true },
    ];
    expect(scheduleImpact(risks, true)).toEqual({ days: 15, basis: 'critical_path_sum' });
    expect(scheduleImpact(risks, false)).toEqual({ days: 25, basis: 'max' });
    expect(scheduleImpact([], false)).toEqual({ days: 0, basis: 'max' });
  });
});
