import { describe, expect, it } from 'vitest';
import { meetsMinimum, parseVersion } from './app-version.guard.js';

describe('F08 ۵.۳ — مقایسهٔ نسخهٔ اپ', () => {
  it('شمارهٔ ساخت و پسوند نادیده؛ بخش جاافتاده صفر', () => {
    expect(parseVersion('1.2.3+45')).toEqual([1, 2, 3]);
    expect(parseVersion('1.2.3-beta')).toEqual([1, 2, 3]);
    expect(parseVersion('2')).toEqual([2]);
    expect(parseVersion('v1.2')).toBeNull();
    expect(parseVersion('')).toBeNull();
  });

  it('کمتر ← رد؛ برابر یا بیشتر ← پذیرش', () => {
    const min = [1, 2, 0];
    expect(meetsMinimum([1, 1, 9], min)).toBe(false);
    expect(meetsMinimum([1, 2], min)).toBe(true);
    expect(meetsMinimum([1, 10, 0], min)).toBe(true);
    expect(meetsMinimum([0, 9, 9], min)).toBe(false);
  });
});
