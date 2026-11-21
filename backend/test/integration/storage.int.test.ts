import { createHash } from 'node:crypto';
import { v7 as uuidv7 } from 'uuid';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AccessTokens } from '../../src/platform/security/access-tokens.js';
import { ExpiredUploads } from '../../src/platform/storage/storage.module.js';
import { seedOrg, type SeededOrg } from '../fixtures/organizations.js';
import { startTestApp, type TestApp } from './support/app.js';
import { signIn } from './support/auth.js';

// برش ۱۰ — ذخیره‌سازی فایل (F20 ۷؛ D10). راه‌انداز دیسک در پوشهٔ موقت (تصمیم 1405/08/24). AC-PL-06 (ادامه از همان پارچه، هش
// نادرست رد)، AC-PL-07 (بی لینک امضاشده یا برای غیرعضو هیچ).

type UserKey = 'pm' | 'sup' | 'reviewer' | 'outsider';
type ProjectKey = 'live' | 'other';

let test: TestApp;
let org: SeededOrg<UserKey, ProjectKey>;
const tokens = {} as Partial<Record<UserKey, string>>;
let ipCounter = 0;
const nextIp = (): string => `10.87.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;
const data = <T = Record<string, unknown>>(body: unknown): T => (body as { data: T }).data;
const code = (body: unknown): string => (body as { code: string }).code;
const MiB = 1024 * 1024;

function as(user: UserKey) {
  const agent = test.http(nextIp());
  const auth = <T extends { set: (key: string, value: string) => T }>(call: T) => call.set('Authorization', `Bearer ${tokens[user] as string}`);
  return {
    get: (path: string) => auth(agent.get(path)),
    post: (path: string, body: object = {}) => auth(agent.post(path)).send(body),
    part: (path: string, bytes: Buffer) => auth(agent.put(path)).set('Content-Type', 'application/octet-stream').send(bytes),
  };
}

interface Upload {
  uploadId: string;
  status: string;
  partSize: number;
  partCount: number;
  receivedParts: number[];
  missingParts: number[];
  fileId: string | null;
}

/** فایل آزمایشی با بایت‌های قابل‌پیش‌بینی. */
const fileOf = (size: number, seed: number): Buffer => Buffer.from(Array.from({ length: size }, (_, index) => (index * 31 + seed) % 251));
const sha = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');
const slice = (bytes: Buffer, part: number, size = MiB) => bytes.subarray((part - 1) * size, part * size);

/** گزارش با یک عکس در انتظار بارگذاری؛ هش گوشی = هش همان بایت‌ها (D10). */
async function pendingPhoto(bytes: Buffer): Promise<string> {
  const reportId = uuidv7();
  const photoId = uuidv7();
  const now = test.clock.now().toISOString();
  await test.owner.query(
    `insert into field_report (id, org_id, project_id, source, author_user_id, work_date, report_no, device_recorded_at, server_received_at, created_at)
     values ($1, $2, $3, 'app', $4, $5, $6, $7, $7, $7)`,
    [reportId, org.orgId, org.projects.live, org.users.sup.id, now.slice(0, 10), `FR-S-${photoId.slice(-6)}`, now],
  );
  await test.owner.query(
    `insert into field_photo (id, org_id, project_id, report_id, storage_key, sha256, taken_at, upload_status, created_at)
     values ($1, $2, $3, $4, 'pending', $5, $6, 'pending', $6)`,
    [photoId, org.orgId, org.projects.live, reportId, sha(bytes), now],
  );
  return photoId;
}

const start = (user: UserKey, body: object) => as(user).post('/v1/uploads', body);
const photoUpload = (photoId: string, size: number) => ({
  projectId: org.projects.live,
  kind: 'photo',
  subjectId: photoId,
  fileName: 'IMG_0001.jpg',
  contentType: 'image/jpeg',
  size,
});

beforeAll(async () => {
  test = await startTestApp();
  org = await seedOrg(test.owner, {
    name: 'سازمان فایل',
    users: { pm: { mobile: '09168000001' }, sup: { mobile: '09168000002' }, reviewer: { mobile: '09168000003' }, outsider: { mobile: '09168000004' } },
    projects: {
      live: { code: 'PRJ-1405-971', manager: 'pm', members: { pm: 'project_manager', sup: 'supervisor', reviewer: 'reviewer' } },
      other: { code: 'PRJ-1405-972', manager: 'outsider', members: { outsider: 'project_manager' } },
    },
  });
  for (const key of ['pm', 'reviewer', 'outsider'] as const) tokens[key] = (await signIn(test, nextIp(), org.users[key].mobile)).accessToken;
  // سرپرست فقط اپ دارد و ورود اپ با برش ۱۱ می‌آید: توکن کلاینت android مستقیم
  tokens.sup = (await test.app.get(AccessTokens).sign({ userId: org.users.sup.id, orgId: org.orgId, sessionId: uuidv7(), client: 'android' })).token;
}, 60_000);

afterAll(async () => {
  await test?.close();
});

describe('بارگذاری قابل‌ادامه (AC-PL-06)', () => {
  let fileId: string;
  const bytes = fileOf(Math.floor(2.5 * MiB), 7);

  it('قطع وسط راه: پارچه‌های رسیده می‌مانند و از همان پارچه ادامه می‌یابد؛ هش نادرست رد و ارسال دوباره', async () => {
    const photoId = await pendingPhoto(bytes);
    const created = data<Upload>((await start('sup', photoUpload(photoId, bytes.length)).expect(201)).body);
    expect(created).toMatchObject({ status: 'open', partSize: MiB, partCount: 3, receivedParts: [], missingParts: [1, 2, 3] });
    const path = `/v1/uploads/${created.uploadId}`;

    await as('sup').part(`${path}/parts/1`, slice(bytes, 1)).expect(200);
    await as('sup').part(`${path}/parts/3`, slice(bytes, 3)).expect(200);
    // تکرار همان پارچه بی‌اثر؛ اندازهٔ نادرست رد
    await as('sup').part(`${path}/parts/1`, slice(bytes, 1)).expect(200);
    expect(code((await as('sup').part(`${path}/parts/2`, slice(bytes, 2).subarray(1)).expect(422)).body)).toBe('UPLOAD_INVALID');
    expect(data<Upload>((await as('sup').get(path).expect(200)).body)).toMatchObject({ receivedParts: [1, 3], missingParts: [2] });
    const incomplete: unknown = (
      await as('sup')
        .post(`${path}/complete`, { sha256: sha(bytes) })
        .expect(409)
    ).body;
    expect(incomplete).toMatchObject({ code: 'UPLOAD_INCOMPLETE', details: { missingParts: [2] } });

    // ادامه از همان پارچه
    await as('sup').part(`${path}/parts/2`, slice(bytes, 2)).expect(200);
    const wrong: unknown = (
      await as('sup')
        .post(`${path}/complete`, { sha256: 'a'.repeat(64) })
        .expect(422)
    ).body;
    expect(wrong).toMatchObject({ code: 'UPLOAD_HASH_MISMATCH', retryable: true });
    expect(data<Upload>((await as('sup').get(path).expect(200)).body).receivedParts).toEqual([]);

    for (const part of [1, 2, 3]) await as('sup').part(`${path}/parts/${part}`, slice(bytes, part)).expect(200);
    const done = data<Upload>(
      (
        await as('sup')
          .post(`${path}/complete`, { sha256: sha(bytes) })
          .expect(200)
      ).body,
    );
    expect(done).toMatchObject({ status: 'complete', missingParts: [] });
    fileId = done.fileId as string;
    // تکرار تکمیل بی‌اثر
    expect(
      data<Upload>(
        (
          await as('sup')
            .post(`${path}/complete`, { sha256: sha(bytes) })
            .expect(200)
        ).body,
      ).fileId,
    ).toBe(fileId);

    const [photo] = (
      await test.owner.query<{ upload_status: string; storage_key: string }>('select upload_status, storage_key from field_photo where id = $1', [photoId])
    ).rows;
    expect(photo?.upload_status).toBe('complete');
    expect(photo?.storage_key).toBe(`org/${org.orgId}/project/${org.projects.live}/photo/${fileId}`);
    // عکس کامل دوباره بارگذاری نمی‌شود
    expect(code((await start('sup', photoUpload(photoId, bytes.length)).expect(409)).body)).toBe('UPLOAD_INVALID');
  });

  it('حجم، نوع، نویسنده و هش گوشی بررسی می‌شوند؛ نشست دیگران دیده نمی‌شود', async () => {
    const small = fileOf(1000, 3);
    const photoId = await pendingPhoto(small);
    expect(code((await start('sup', photoUpload(photoId, 9 * MiB)).expect(422)).body)).toBe('UPLOAD_INVALID');
    expect(code((await start('sup', { ...photoUpload(photoId, 1000), contentType: 'text/plain' }).expect(422)).body)).toBe('UPLOAD_INVALID');
    await start('reviewer', photoUpload(photoId, 1000)).expect(403);
    await start('outsider', photoUpload(photoId, 1000)).expect(403);

    const created = data<Upload>((await start('sup', photoUpload(photoId, 1000)).expect(201)).body);
    await as('pm').get(`/v1/uploads/${created.uploadId}`).expect(404);
    // فایل دیگری با هش درست خودش، ولی نه هش ثبت‌شدهٔ گوشی
    const other = fileOf(1000, 4);
    await as('sup').part(`/v1/uploads/${created.uploadId}/parts/1`, other).expect(200);
    expect(
      code(
        (
          await as('sup')
            .post(`/v1/uploads/${created.uploadId}/complete`, { sha256: sha(other) })
            .expect(422)
        ).body,
      ),
    ).toBe('UPLOAD_HASH_MISMATCH');
  });

  it('دسترسی فایل (AC-PL-07): لینک امضاشدهٔ کوتاه‌مدت فقط برای عضو مجاز؛ بی توکن، توکن دست‌کاری‌شده یا منقضی هیچ', async () => {
    const link = data<{ url: string; expiresAt: string }>((await as('reviewer').get(`/v1/files/${fileId}/link`).expect(200)).body);
    expect(link.url).toMatch(/^\/v1\/files\/content\?token=/);
    const content = await test.http(nextIp()).get(link.url).expect(200);
    expect(sha(content.body as Buffer)).toBe(sha(fileOf(Math.floor(2.5 * MiB), 7)));
    expect(content.headers['content-type']).toBe('image/jpeg');
    expect(content.headers['content-disposition']).toContain('IMG_0001.jpg');

    await as('outsider').get(`/v1/files/${fileId}/link`).expect(403);
    await test.http(nextIp()).get('/v1/files/content').expect(403);
    const token = decodeURIComponent(link.url.split('token=')[1] as string);
    const [payload, signature] = token.split('.') as [string, string];
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url').toString()), e: 9_999_999_999 })).toString('base64url');
    await test
      .http(nextIp())
      .get(`/v1/files/content?token=${encodeURIComponent(`${forged}.${signature}`)}`)
      .expect(403);
    test.clock.advance(6 * 60_000);
    expect(code((await test.http(nextIp()).get(link.url).expect(403)).body)).toBe('FILE_LINK_INVALID');
    // نویسندهٔ گزارش خودش می‌بیند
    await as('sup').get(`/v1/files/${fileId}/link`).expect(200);
  });

  it('پیوست عمومی: عضو پروژه بارگذاری و دریافت می‌کند، غیرعضو نه', async () => {
    const bytes = fileOf(5000, 9);
    const created = data<Upload>(
      (
        await start('pm', {
          projectId: org.projects.live,
          kind: 'attachment',
          fileName: 'فاکتور.pdf',
          contentType: 'application/pdf',
          size: bytes.length,
        }).expect(201)
      ).body,
    );
    await as('pm').part(`/v1/uploads/${created.uploadId}/parts/1`, bytes).expect(200);
    const done = data<Upload>(
      (
        await as('pm')
          .post(`/v1/uploads/${created.uploadId}/complete`, { sha256: sha(bytes) })
          .expect(200)
      ).body,
    );
    await as('outsider')
      .get(`/v1/files/${done.fileId as string}/link`)
      .expect(403);
    const link = data<{ url: string }>(
      (
        await as('reviewer')
          .get(`/v1/files/${done.fileId as string}/link`)
          .expect(200)
      ).body,
    );
    expect(sha((await test.http(nextIp()).get(link.url).expect(200)).body as Buffer)).toBe(sha(bytes));
    await start('outsider', { projectId: org.projects.live, kind: 'attachment', fileName: 'x.pdf', contentType: 'application/pdf', size: 10 }).expect(403);
  });

  it('PurgeTick: نشست ناتمام منقضی و پارچه‌هایش پاک می‌شود', async () => {
    const bytes = fileOf(1000, 5);
    const created = data<Upload>(
      (
        await start('pm', { projectId: org.projects.live, kind: 'attachment', fileName: 'a.bin', contentType: 'application/octet-stream', size: 1000 }).expect(
          201,
        )
      ).body,
    );
    await as('pm').part(`/v1/uploads/${created.uploadId}/parts/1`, bytes).expect(200);
    test.clock.advance(25 * 3_600_000);
    expect(await test.app.get(ExpiredUploads).onTick()).toBeGreaterThanOrEqual(1);
    const left = await test.owner.query('select 1 from upload_session where id = $1', [created.uploadId]);
    expect(left.rowCount).toBe(0);
  });
});
