import { describe, expect, it } from 'vitest';
import { INVITE_CODE_LENGTH, newInviteCode, normalizeInviteCode } from './invitation.entity.js';

describe('OD-20 — کد دعوت اپ', () => {
  it('۸ نویسهٔ Crockford Base32 بی I، L، O، U', () => {
    let seed = 0;
    const code = newInviteCode((max) => (seed++ * 7) % max);
    expect(code).toHaveLength(INVITE_CODE_LENGTH);
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
  });

  it('QR، حروف کوچک، فاصله و خط تیره هنجار می‌شوند؛ I و L ← 1، O ← 0', () => {
    expect(normalizeInviteCode('projeyar:invite:k7m2-q9xa')).toBe('K7M2Q9XA');
    expect(normalizeInviteCode(' K7M2 Q9XA ')).toBe('K7M2Q9XA');
    expect(normalizeInviteCode('lOIK7M2Q')).toBe('101K7M2Q');
    expect(normalizeInviteCode('K7M2Q9X')).toBeNull();
    expect(normalizeInviteCode('K7M2Q9XU')).toBeNull();
    expect(normalizeInviteCode('')).toBeNull();
  });
});
