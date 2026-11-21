import { v7 as uuidv7 } from 'uuid';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SYSTEM_ROLE_IDS } from '../../src/database/system-ids.js';
import { AppConfig } from '../../src/config/config.js';
import { readZip } from '../../src/platform/archive/zip.js';
import { ObjectStorage } from '../../src/platform/storage/object-storage.js';
import { BackupTick } from '../../src/modules/backups/application/backup-tick.js';
import { FullExports } from '../../src/modules/backups/application/full-exports.js';
import { openBackup } from '../../src/modules/backups/index.js';
import { insertReferencePlan } from '../../src/scripts/seed-reference.js';
import { seedOrg, type SeededOrg } from '../fixtures/organizations.js';
import { startTestApp, type TestApp } from './support/app.js';
import { signIn } from './support/auth.js';
import { waitFor } from './support/wait.js';

// F20 ۱۲ و F19 ۹ — پشتیبان پروژه، خروجی کامل و XER (برش ۱۹؛ تصمیم‌های 1405/08/26): AC-PL-12، D11، دسترسی و جدایی سازمان.

type UserKey = 'pm' | 'planner' | 'finance' | 'client';
let test: TestApp;
let org: SeededOrg<UserKey, 'ref' | 'weekly' | 'old'>;
let other: SeededOrg<'boss', 'b'>;
const tokens = {} as Record<UserKey, string>;
let ipCounter = 0;
const nextIp = (): string => `10.77.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;
const data = <T>(body: unknown): T => (body as { data: T }).data;
const codeOf = (body: unknown): string => (body as { code: string }).code;
const pid = () => org.projects.ref;

function as(user: UserKey) {
  const agent = test.http(nextIp());
  const auth = { Authorization: `Bearer ${tokens[user]}` };
  return {
    get: (path: string) => agent.get(path).set(auth),
    post: (path: string, body: object = {}) => agent.post(path).set(auth).send(body),
    patch: (path: string, body: object) => agent.patch(path).set(auth).send(body),
  };
}

const binary = (url: string) =>
  test
    .http(nextIp())
    .get(url)
    .buffer(true)
    .parse((response, done) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () => done(null, Buffer.concat(chunks)));
    });

interface Backups {
  schedule: string;
  items: { id: string; kind: string; note: string | null; sizeText: string }[];
  fullBackupSizeText: string;
  fullExport: { id: string; status: string; includesAmounts: boolean } | null;
}

const backupRows = async (projectId: string, kind: string) =>
  (
    await test.owner.query<{ id: string; run_date: string | null; storage_key: string; note: string | null }>(
      `select id, to_char(run_date, 'YYYY-MM-DD') as run_date, storage_key, note from project_backup where project_id = $1 and kind = $2 order by created_at`,
      [projectId, kind],
    )
  ).rows;

async function insertBackups(projectId: string, kind: 'auto' | 'manual', count: number, firstDay: string): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    const day = new Date(Date.parse(`${firstDay}T00:00:00Z`) + index * 86_400_000).toISOString().slice(0, 10);
    await test.owner.query(
      `insert into project_backup (id, org_id, project_id, kind, run_date, note, storage_key, key_id, size_bytes, table_count, row_count, file_count, file_bytes, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, 'dev', 10, 1, 1, 0, 0, $8)`,
      [
        uuidv7(),
        org.orgId,
        projectId,
        kind,
        kind === 'auto' ? day : null,
        kind === 'manual' ? `old ${index}` : null,
        `org/${org.orgId}/project/${projectId}/backup/old-${kind}-${index}.pyb`,
        `${day}T00:00:00Z`,
      ],
    );
  }
}

beforeAll(async () => {
  test = await startTestApp();
  test.clock.advance(Date.parse('2026-06-21T08:00:00Z') - test.clock.now().getTime());
  org = await seedOrg(test.owner, {
    name: 'سازمان پشتیبان',
    users: {
      pm: { mobile: '09220200001', fullName: 'مریم احمدی' },
      planner: { mobile: '09220200002', fullName: 'برنامه‌ریز' },
      finance: { mobile: '09220200003', fullName: 'مالی' },
      client: { mobile: '09220200004', fullName: 'ناظر کارفرما' },
    },
    projects: {
      ref: {
        code: 'PRJ-1405-961',
        name: 'ساختمان مرجع',
        manager: 'pm',
        members: { pm: 'project_manager', planner: 'planner', finance: 'finance', client: 'client_reviewer' },
      },
      weekly: { code: 'PRJ-1405-962', manager: 'pm', members: { pm: 'project_manager' } },
      old: { code: 'PRJ-1405-963', status: 'archived', manager: 'pm', members: { pm: 'project_manager' } },
    },
  });
  other = await seedOrg(test.owner, {
    name: 'سازمان دیگر',
    users: { boss: { mobile: '09220200009' } },
    projects: { b: { code: 'PRJ-1405-964', manager: 'boss', members: { boss: 'project_manager' } } },
  });
  const client = await test.owner.connect();
  try {
    await insertReferencePlan(client, { orgId: org.orgId, projectId: pid(), actorUserId: org.users.pm.id, now: '2026-06-21T08:00:00.000Z' });
    await client.query(`update project set activated_at = '2026-03-25T05:00:00Z', contingency_reserve = 50 where id = $1`, [pid()]);
    // خروجی کامل بی مبلغ: ناظر کارفرما export.full می‌گیرد ولی cbs.view_amounts ندارد (D11)
    await client.query(`insert into role_permission (id, role_id, permission_code, scope) values ($1, $2, 'export.full', 'all')`, [
      uuidv7(),
      SYSTEM_ROLE_IDS.client_reviewer,
    ]);
  } finally {
    client.release();
  }
  for (const key of Object.keys(org.users) as UserKey[]) tokens[key] = (await signIn(test, nextIp(), org.users[key].mobile)).accessToken;
}, 120_000);

afterAll(async () => {
  await test?.close();
});

describe('یکپارچه‌سازی W30 و XER (F19)', () => {
  it('تنظیمات پروژه کارت‌ها و بخش پشتیبان واقعی را می‌دهد', async () => {
    const settings = data<{ integrations: { key: string; status: string }[]; backups: Backups }>(
      (await as('pm').get(`/v1/projects/${pid()}/settings`).expect(200)).body,
    );
    expect(settings.integrations.map((card) => [card.key, card.status])).toEqual([
      ['msp', 'not_linked'],
      ['erp', 'soon'],
      ['accounting', 'soon'],
      ['p6', 'export_only'],
    ]);
    expect(settings.backups).toMatchObject({ schedule: 'daily', items: [], fullBackupSizeText: '—', fullExport: null });
  });

  it('XER از نسخهٔ جاری با ممیزی؛ مالی integrations.export_p6 ندارد', async () => {
    const result = data<{ url: string; fileName: string; activities: number }>(
      (await as('planner').post(`/v1/projects/${pid()}/integrations/p6/xer`).expect(200)).body,
    );
    expect(result.fileName).toMatch(/^PRJ-1405-961_2026-06-21\.xer$/);
    const xer = (await binary(result.url).expect(200)).body as Buffer;
    const text = xer.toString('utf8');
    expect(text.startsWith('ERMHDR\t')).toBe(true);
    expect(text.split('\r\n').filter((line) => line.startsWith('%T\t'))).toEqual([
      '%T\tCALENDAR',
      '%T\tPROJECT',
      '%T\tPROJWBS',
      '%T\tTASK',
      '%T\tRSRC',
      '%T\tTASKRSRC',
    ]);
    const taskStart = text.split('\r\n').indexOf('%T\tTASK');
    const tasks = text
      .split('\r\n')
      .slice(taskStart + 2)
      .filter((line, index, all) => line.startsWith('%R') && all.slice(0, index).every((prior) => prior.startsWith('%R')));
    expect(tasks.length).toBe(result.activities);
    const audit = await test.owner.query(`select 1 from audit_log where action = 'p6.xer_exported' and project_id = $1`, [pid()]);
    expect(audit.rowCount).toBe(1);
    await as('finance').post(`/v1/projects/${pid()}/integrations/p6/xer`).expect(403);
  });
});

describe('پشتیبان پروژه (F20 ۱۲)', () => {
  it('برنامه و پشتیبان دستی با project.settings.edit؛ ۱۰ دستی آخر؛ بایگانی فقط‌خواندنی', async () => {
    await as('planner').patch(`/v1/projects/${pid()}/backups`, { schedule: 'weekly' }).expect(403);
    const weekly = data<Backups>((await as('pm').patch(`/v1/projects/${org.projects.weekly}/backups`, { schedule: 'weekly' }).expect(200)).body);
    expect(weekly.schedule).toBe('weekly');
    await as('pm').patch(`/v1/projects/${pid()}/backups`, { schedule: 'hourly' }).expect(400);

    await insertBackups(pid(), 'manual', 10, '2026-06-01');
    const view = data<Backups>((await as('pm').post(`/v1/projects/${pid()}/backups`, { note: '  پیش از ورود بازنگری ۳ ' }).expect(201)).body);
    expect(view.items[0]).toMatchObject({ kind: 'manual', note: 'پیش از ورود بازنگری ۳' });
    expect(view.items[0]?.sizeText).toMatch(/کیلوبایت|بایت/);
    const manual = await backupRows(pid(), 'manual');
    expect(manual).toHaveLength(10);
    expect(manual.map((row) => row.note)).not.toContain('old 0');
    await as('planner').post(`/v1/projects/${pid()}/backups`, {}).expect(403);
    const archived = await as('pm').post(`/v1/projects/${org.projects.old}/backups`, {}).expect(409);
    expect(codeOf(archived.body)).toBe('PROJECT_READ_ONLY');
    const audit = await test.owner.query(`select action from audit_log where entity_type in ('ProjectBackup', 'BackupSchedule') and project_id = $1`, [pid()]);
    expect(audit.rows.map((row: { action: string }) => row.action)).toEqual(['backup.created']);
  });

  it('خروجی کامل: صف، ZIP با داده، CSV و مبلغ، لینک ۲۴ ساعته و ممیزی؛ بی export.full بسته', async () => {
    await as('planner').post(`/v1/projects/${pid()}/exports/full`).expect(403);
    const queued = data<Backups>((await as('pm').post(`/v1/projects/${pid()}/exports/full`).expect(202)).body);
    expect(queued.fullExport).toMatchObject({ status: 'queued', includesAmounts: true });
    const id = queued.fullExport?.id ?? '';
    await waitFor(async () => (await test.owner.query(`select 1 from project_export where id = $1 and status = 'done'`, [id])).rowCount === 1, 40_000);
    const link = data<{ url: string; fileName: string }>((await as('pm').get(`/v1/projects/${pid()}/exports/full/${id}/download`).expect(200)).body);
    expect(link.fileName).toBe('PRJ-1405-961-full-2026-06-21.zip');
    const files = readZip((await binary(link.url).expect(200)).body as Buffer);
    expect(files.has('README.txt')).toBe(true);
    expect(files.has('csv/wbs_item.csv')).toBe(true);
    expect(files.has('data/audit_log.jsonl')).toBe(true);
    const project = JSON.parse(files.get('data/project.jsonl')?.toString('utf8') ?? '{}') as Record<string, unknown>;
    expect(project['code']).toBe('PRJ-1405-961');
    expect(project['contingency_reserve']).toBe(50);
    const actions = await test.owner.query<{ action: string }>(`select action from audit_log where entity_id = $1 order by occurred_at, id`, [id]);
    expect(actions.rows.map((row) => row.action)).toEqual(['export.full.requested', 'export.full.created', 'export.full.downloaded']);
  });

  it('D11 — خروجی کامل بی cbs.view_amounts: جدول‌های مبلغ‌دار و ستون‌های پولی بیرون', async () => {
    const queued = data<Backups>((await as('client').post(`/v1/projects/${pid()}/exports/full`).expect(202)).body);
    expect(queued.fullExport?.includesAmounts).toBe(false);
    const id = queued.fullExport?.id ?? '';
    await waitFor(async () => (await test.owner.query(`select 1 from project_export where id = $1 and status = 'done'`, [id])).rowCount === 1, 40_000);
    const link = data<{ url: string }>((await as('client').get(`/v1/projects/${pid()}/exports/full/${id}/download`).expect(200)).body);
    const files = readZip((await binary(link.url).expect(200)).body as Buffer);
    expect(files.has('data/audit_log.jsonl')).toBe(false);
    const project = JSON.parse(files.get('data/project.jsonl')?.toString('utf8') ?? '{}') as Record<string, unknown>;
    expect(project).not.toHaveProperty('contingency_reserve');
    const links = (files.get('data/wbs_cbs_link.jsonl')?.toString('utf8') ?? '').split('\n').filter(Boolean);
    expect(links.length).toBeGreaterThan(0);
    expect(links.every((line) => !line.includes('allocated_amount'))).toBe(true);
  });

  it('پس از ۲۴ ساعت لینک بسته و PurgeTick فایل را پاک می‌کند', async () => {
    const [row] = (
      await test.owner.query<{ id: string; storage_key: string }>(`select id, storage_key from project_export where project_id = $1 and includes_amounts`, [
        pid(),
      ])
    ).rows;
    test.clock.advance(25 * 3_600_000);
    const expired = await as('pm')
      .get(`/v1/projects/${pid()}/exports/full/${row?.id ?? ''}/download`)
      .expect(409);
    expect(codeOf(expired.body)).toBe('BACKUP_INVALID');
    expect(await test.app.get(FullExports).onTick()).toBe(2);
    expect(await test.app.get(ObjectStorage).get(row?.storage_key ?? '')).toBeNull();
    const statuses = await test.owner.query<{ status: string }>(`select distinct status from project_export where project_id = $1`, [pid()]);
    expect(statuses.rows.map((entry) => entry.status)).toEqual(['expired']);
  });

  it('AC-PL-12 — پشتیبان شبانه ساخته و ۳۱امین قدیمی‌ترین پاک می‌شود؛ هفتگی بامداد جمعه؛ بایگانی بی پشتیبان؛ هر نسخه فقط یک سازمان', async () => {
    await insertBackups(pid(), 'auto', 30, '2026-05-26');
    // پنجشنبه ۰۲:۱۰ تهران
    test.clock.advance(Date.parse('2026-06-24T22:40:00Z') - test.clock.now().getTime());
    const tick = test.app.get(BackupTick);
    expect(await tick.onTick('BackupTick', '2026-06-24')).toBe(0); // روز جامانده جبران نمی‌شود
    expect(await tick.onTick('BackupTick', '2026-06-25')).toBe(2); // مرجع و پروژهٔ سازمان دیگر
    await waitFor(async () => (await test.owner.query(`select 1 from project_backup where run_date = '2026-06-25'`)).rowCount === 2, 40_000);
    const auto = await backupRows(pid(), 'auto');
    expect(auto).toHaveLength(30);
    expect(auto[0]?.run_date).toBe('2026-05-27');
    expect(auto.at(-1)?.run_date).toBe('2026-06-25');
    expect(await backupRows(org.projects.weekly, 'auto')).toHaveLength(0);
    expect(await backupRows(org.projects.old, 'auto')).toHaveLength(0);

    const sealed = await test.app.get(ObjectStorage).get(auto.at(-1)?.storage_key ?? '');
    expect(sealed?.subarray(0, 4).toString()).toBe('PYBK');
    const keys = test.app.get(AppConfig).backup.keys;
    expect(() => openBackup(sealed ?? Buffer.alloc(0), keys, other.orgId)).toThrow();
    const files = readZip(openBackup(sealed ?? Buffer.alloc(0), keys, org.orgId));
    const meta = JSON.parse(files.get('meta.json')?.toString('utf8') ?? '{}') as { projectId: string; kind: string; tables: { name: string; rows: number }[] };
    expect(meta).toMatchObject({ projectId: pid(), kind: 'auto' });
    expect(meta.tables.find((table) => table.name === 'wbs_item')?.rows).toBeGreaterThan(0);
    expect(files.has('files.json')).toBe(true);
    for (const [name, body] of files) {
      if (name.startsWith('data/')) expect(body.toString('utf8')).not.toContain(other.orgId);
    }

    // جمعه: هفتگی هم
    test.clock.advance(86_400_000);
    expect(await tick.onTick('BackupTick', '2026-06-26')).toBe(3);
    await waitFor(async () => (await test.owner.query(`select 1 from project_backup where run_date = '2026-06-26'`)).rowCount === 3, 40_000);
    expect(await backupRows(org.projects.weekly, 'auto')).toHaveLength(1);
  });
});
