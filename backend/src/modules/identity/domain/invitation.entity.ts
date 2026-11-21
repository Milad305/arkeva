import { defineEntity, p } from '@mikro-orm/postgresql';
import { mutableBase, tenantBase } from '../../../platform/database/base-properties.js';

export const INVITATION_STATUSES = ['pending', 'accepted', 'revoked', 'expired'] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

/** کد دعوت اپ (OD-20): ۸ نویسه از الفبای Crockford Base32. */
export const INVITE_CODE_LENGTH = 8;
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** کد تازه با `random(n)` (۰ تا n-۱) — تزریقی برای تست. */
export function newInviteCode(random: (max: number) => number): string {
  return Array.from({ length: INVITE_CODE_LENGTH }, () => CROCKFORD[random(CROCKFORD.length)]).join('');
}

/**
 * ورودی کاربر یا QR ← کد هنجار، یا null. QR `projeyar:invite:<کد>`؛ فاصله و خط تیره نادیده؛ بزرگ‌حرف؛ I و L ← 1، O ← 0 (Crockford).
 */
export function normalizeInviteCode(raw: string): string | null {
  const body = raw.trim().replace(/^projeyar:invite:/i, '');
  const code = body
    .replace(/[\s-]/g, '')
    .toUpperCase()
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0');
  if (code.length !== INVITE_CODE_LENGTH) return null;
  return [...code].every((char) => CROCKFORD.includes(char)) ? code : null;
}

/** اعتبار دعوت (F01 ۵.۶ `[تأییدشده]`). */
export const INVITATION_TTL_DAYS = 7;

/**
 * Invitation — عملیاتی (`02` ۲؛ F01 ۵.۶). کاربر با وضعیت invited هم‌زمان ساخته می‌شود و با «فراموشی رمز»
 * فعال می‌شود (تصمیم کاربر 1405/08/22)؛ پذیرش عضویت پروژه را از ماژول team می‌سازد.
 */
const InvitationSchema = defineEntity({
  name: 'Invitation',
  tableName: 'invitation',
  properties: {
    ...mutableBase(),
    userId: p.uuid(),
    projectId: p.uuid(),
    channel: p.enum(['sms', 'email'] as const),
    target: p.string(),
    roleCodes: p.array<string>(),
    status: p.enum(INVITATION_STATUSES).default('pending'),
    sentAt: p.datetime(),
    expiresAt: p.datetime(),
    acceptedAt: p.datetime().nullable(),
    createdByUserId: p.uuid(),
    /** هش SHA-256 کد دعوت ۸ نویسه‌ای (OD-20)؛ خود کد فقط در پیامک و پاسخ ساخت/ارسال دوباره. پس از پذیرش null. */
    inviteCodeHash: p.string().nullable(),
  },
});

export class Invitation extends InvitationSchema.class {
  isPendingAt(now: Date): boolean {
    return this.status === 'pending' && this.expiresAt > now;
  }
}
InvitationSchema.setClass(Invitation);

/** کد پشتیبان ورود دومرحله‌ای (F01 ۴): فقط هش؛ یک‌بارمصرف؛ ساخت تازه همهٔ قبلی‌ها را باطل می‌کند. */
const BackupCodeSchema = defineEntity({
  name: 'BackupCode',
  tableName: 'backup_code',
  properties: {
    ...tenantBase(),
    userId: p.uuid(),
    codeHash: p.string(),
    usedAt: p.datetime().nullable(),
  },
});

export class BackupCode extends BackupCodeSchema.class {}
BackupCodeSchema.setClass(BackupCode);

/** «این دستگاه را ۳۰ روز به خاطر بسپار» (W03؛ F01 ۵.۱): فقط مرحلهٔ کد را می‌بخشد؛ فقط هش راز. */
const TrustedDeviceSchema = defineEntity({
  name: 'TrustedDevice',
  tableName: 'trusted_device',
  properties: {
    ...tenantBase(),
    userId: p.uuid(),
    secretHash: p.string(),
    expiresAt: p.datetime(),
    revokedAt: p.datetime().nullable(),
  },
});

export class TrustedDevice extends TrustedDeviceSchema.class {}
TrustedDeviceSchema.setClass(TrustedDevice);
