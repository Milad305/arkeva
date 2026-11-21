import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import type { AppConfig } from '../../config/config.js';
import { FixedClock } from '../clock/clock.js';
import { DiskStorage } from './disk-storage.js';
import { LinkSigner } from './link-signer.js';
import { assertSafeKey, fileKey, type ObjectStorage } from './object-storage.js';

// قواعد خالص ذخیره‌سازی (F20 ۷): کلید امن، لینک امضاشدهٔ کوتاه‌مدت (AC-PL-07)، راه‌انداز دیسک.

const config = { auth: { jwtKeys: [{ kid: 't1', secret: 'x'.repeat(40) }] } } as unknown as AppConfig;
const root = mkdtempSync(join(tmpdir(), 'projeyar-unit-'));

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe('ذخیره‌سازی فایل', () => {
  it('کلید org/{orgId}/project/{projectId}/{kind}/{id}؛ «..» و مسیر مطلق رد', () => {
    expect(fileKey('o1', 'p1', 'photo', 'f1')).toBe('org/o1/project/p1/photo/f1');
    expect(() => assertSafeKey('org/o1/../../etc/passwd')).toThrow();
    expect(() => assertSafeKey('/etc/passwd')).toThrow();
    expect(() => assertSafeKey('org//x')).toThrow();
    expect(() => assertSafeKey('org/o1/project/p1/photo/f1')).not.toThrow();
  });

  it('AC-PL-07 — لینک امضاشده: دست‌کاری و انقضا رد', () => {
    const signer = new LinkSigner(config);
    const token = signer.sign({ key: 'org/o/a', exp: 1000, fileName: 'a.jpg', contentType: 'image/jpeg' });
    expect(signer.verify(token, 999)).toMatchObject({ key: 'org/o/a', fileName: 'a.jpg' });
    expect(signer.verify(token, 1001)).toBeNull();
    const [payload, signature] = token.split('.') as [string, string];
    expect(signer.verify(`${payload}x.${signature}`, 999)).toBeNull();
    const other = new LinkSigner({ auth: { jwtKeys: [{ kid: 't2', secret: 'y'.repeat(40) }] } } as unknown as AppConfig);
    expect(other.verify(token, 999)).toBeNull();
  });

  it('راه‌انداز دیسک: نوشتن، خواندن، حذف پیشوند پروژه', async () => {
    const storage: ObjectStorage = new DiskStorage(root, new LinkSigner(config), new FixedClock(new Date('2026-11-15T08:00:00Z')));
    await storage.put('org/o/project/p/photo/f', Buffer.from('salam'), 'text/plain');
    expect((await storage.get('org/o/project/p/photo/f'))?.toString()).toBe('salam');
    expect(await storage.get('org/o/project/p/photo/none')).toBeNull();
    expect(await storage.signedUrl('org/o/project/p/photo/f', { ttlSec: 300, fileName: 'f', contentType: 'text/plain' })).toMatch(
      /^\/v1\/files\/content\?token=/,
    );
    await storage.deletePrefix('org/o/project/p/');
    expect(await storage.get('org/o/project/p/photo/f')).toBeNull();
  });
});
