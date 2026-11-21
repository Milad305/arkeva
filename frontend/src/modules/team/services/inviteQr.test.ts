import { describe, expect, it } from 'vitest';
import { groupInviteCode, inviteQrValue } from './inviteQr';

describe('OD-20 — QR دعوت', () => {
  it('محتوای QR همان قالب اپ و بک‌اند است', () => {
    expect(inviteQrValue('K7M2Q9XA')).toBe('projeyar:invite:K7M2Q9XA');
  });

  it('کد ۸ نویسه‌ای چهارتایی گروه می‌شود', () => {
    expect(groupInviteCode('K7M2Q9XA')).toBe('K7M2-Q9XA');
    expect(groupInviteCode('ABC')).toBe('ABC');
  });
});
