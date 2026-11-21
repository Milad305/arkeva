import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

// رمزنگاری نسخهٔ پشتیبان (F20 ۱۲): AES-256-GCM با کلید هر سازمان مشتق از کلید اصلی (HKDF-SHA256، نمک = orgId) تا نسخهٔ یک
// سازمان با کلید سازمان دیگر باز نشود. قالب: «PYBK» | نسخه | طول kid | kid | iv(12) | tag(16) | متن رمز؛ سرآیند AAD است.

export interface SealKey {
  readonly kid: string;
  readonly secret: Buffer;
}

const MAGIC = Buffer.from('PYBK', 'ascii');
const FORMAT = 1;

const orgKey = (secret: Buffer, orgId: string): Buffer => Buffer.from(hkdfSync('sha256', secret, Buffer.from(orgId, 'utf8'), 'projeyar:backup:v1', 32));

export function sealBackup(plain: Buffer, key: SealKey, orgId: string, iv: Buffer = randomBytes(12)): Buffer {
  const kid = Buffer.from(key.kid, 'ascii');
  const header = Buffer.concat([MAGIC, Buffer.from([FORMAT, kid.length]), kid, iv]);
  const cipher = createCipheriv('aes-256-gcm', orgKey(key.secret, orgId), iv);
  cipher.setAAD(header);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([header, cipher.getAuthTag(), body]);
}

/** کلید با kid سرآیند؛ دستکاری یا سازمان نادرست ← خطا. */
export function openBackup(sealed: Buffer, keys: readonly SealKey[], orgId: string): Buffer {
  if (sealed.length < 6 || !sealed.subarray(0, 4).equals(MAGIC) || sealed[4] !== FORMAT) throw new Error('این فایل پشتیبان پروژه‌یار نیست');
  const kidLength = sealed[5] ?? 0;
  const kid = sealed.subarray(6, 6 + kidLength).toString('ascii');
  const ivEnd = 6 + kidLength + 12;
  const key = keys.find((candidate) => candidate.kid === kid);
  if (!key) throw new Error(`کلید «${kid}» در BACKUP_KEYS نیست`);
  const decipher = createDecipheriv('aes-256-gcm', orgKey(key.secret, orgId), sealed.subarray(6 + kidLength, ivEnd));
  decipher.setAAD(sealed.subarray(0, ivEnd));
  decipher.setAuthTag(sealed.subarray(ivEnd, ivEnd + 16));
  return Buffer.concat([decipher.update(sealed.subarray(ivEnd + 16)), decipher.final()]);
}
