import { describe, expect, it } from 'vitest';
import { DEFAULT_ROLE_PERMISSIONS, EVERYONE_PERMISSIONS, PERMISSION_CATALOG, PERMISSION_CODES } from '@projeyar/shared';

// کاتالوگ W27 (access-control ۵.۳، ۵.۴؛ §۷.۳ ردیف ۱۴ گزینهٔ الف): هر کد دقیقاً در یک ردیف تا همهٔ کدها
// از ماتریس تنظیم‌شدنی باشند و هیچ‌کدام دو جا نیاید.

describe('کاتالوگ دسترسی W27', () => {
  const codes = PERMISSION_CATALOG.flatMap((group) => group.rows.flatMap((row) => row.codes.map((entry) => entry.code)));

  it('AC-AC-07 — هر کد فهرست مرکزی دقیقاً یک بار در ماتریس است', () => {
    expect([...codes].sort()).toEqual([...PERMISSION_CODES].sort());
  });

  it('notifications.md ۸ — «همهٔ کاربران» در همهٔ نقش‌های سیستمی، آخر فهرست', () => {
    for (const grants of Object.values(DEFAULT_ROLE_PERMISSIONS)) {
      expect(grants.slice(-EVERYONE_PERMISSIONS.length).map((grant) => grant.code)).toEqual(EVERYONE_PERMISSIONS);
    }
  });
});
