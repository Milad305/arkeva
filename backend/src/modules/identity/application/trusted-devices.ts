import { Injectable } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/postgresql';
import { newId } from '../../../platform/database/ids.js';
import { TrustedDevice } from '../domain/invitation.entity.js';
import { isUuid, randomSecret, sameHash, sha256, splitToken } from '../infrastructure/secrets.js';

// «این دستگاه را تا ۳۰ روز به خاطر بسپار» (W03؛ F01 ۵.۱): فقط مرحلهٔ کد پیامکی را می‌بخشد، رمز همیشه لازم
// است. توکن «orgId.deviceId.secret» در کوکی HttpOnly؛ فقط هش در پایگاه داده. تغییر یا بازیابی رمز و
// خاموش‌کردن ورود دومرحله‌ای همهٔ دستگاه‌های کاربر را باطل می‌کند `[پیش‌فرض فنی]`.

export const TRUSTED_DEVICE_DAYS = 30;
const DAY = 86_400_000;

@Injectable()
export class TrustedDevices {
  issue(tx: EntityManager, user: { readonly id: string; readonly orgId: string }, now: Date): string {
    const id = newId();
    const secret = randomSecret();
    tx.create(TrustedDevice, {
      id,
      orgId: user.orgId,
      userId: user.id,
      secretHash: sha256(secret),
      expiresAt: new Date(now.getTime() + TRUSTED_DEVICE_DAYS * DAY),
      revokedAt: null,
    });
    return `${user.orgId}.${id}.${secret}`;
  }

  /** دستگاه این کاربر به خاطر سپرده شده و هنوز معتبر است؟ (درون تراکنش ورود، با tenant همان کاربر) */
  async isTrusted(tx: EntityManager, userId: string, token: string | undefined, now: Date): Promise<boolean> {
    if (!token) return false;
    const [, deviceId = '', secret = ''] = splitToken(token, 3) ?? [];
    if (!isUuid(deviceId)) return false;
    const device = await tx.findOne(TrustedDevice, { id: deviceId, userId });
    if (!device || device.revokedAt != null || device.expiresAt <= now) return false;
    return sameHash(device.secretHash, sha256(secret));
  }

  async revokeAll(tx: EntityManager, userId: string, now: Date): Promise<void> {
    await tx.nativeUpdate(TrustedDevice, { userId, revokedAt: null }, { revokedAt: now });
  }
}
