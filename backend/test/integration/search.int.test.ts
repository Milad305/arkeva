import { v7 as uuidv7 } from 'uuid';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { normalizeSearch } from '../../src/platform/search/normalize.js';
import { insertReferencePlan, type ReferencePlan } from '../../src/scripts/seed-reference.js';
import { seedOrg, type SeededOrg } from '../fixtures/organizations.js';
import { startTestApp, type TestApp } from './support/app.js';
import { signIn } from './support/auth.js';

// برش ۱۵ — جستجوی سراسری W43 (platform.md ۹؛ AC-PL-09).

type UserKey = 'pm' | 'client' | 'reviewer' | 'outsider' | 'sup';

let test: TestApp;
let org: SeededOrg<UserKey, 'main' | 'other'>;
let plan: ReferencePlan;
const tokens = {} as Record<UserKey, string>;
let ipCounter = 0;
const nextIp = (): string => `10.75.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;
const data = <T>(body: unknown): T => (body as { data: T }).data;
const pid = () => org.projects.main;

interface Response {
  groups: { kind: string; items: { id: string; title: string; subtitle: string; to: string; kind: string }[] }[];
  total: number;
  counts: { kind: string; count: number }[];
}

const search = async (user: UserKey, q: string, extra: Record<string, string> = {}) =>
  data<Response>(
    (
      await test
        .http(nextIp())
        .get('/v1/search')
        .query({ q, ...extra })
        .set('Authorization', `Bearer ${tokens[user]}`)
        .expect(200)
    ).body,
  );
const items = (response: Response, kind: string) => response.groups.find((group) => group.kind === kind)?.items ?? [];

beforeAll(async () => {
  test = await startTestApp();
  org = await seedOrg(test.owner, {
    name: 'سازمان جستجو',
    users: {
      pm: { mobile: '09210100001', fullName: 'مریم احمدی' },
      client: { mobile: '09210100002', fullName: 'ناظر کارفرما' },
      reviewer: { mobile: '09210100003', fullName: 'رضا کریمی' },
      outsider: { mobile: '09210100004', fullName: 'بیرونی' },
      sup: { mobile: '09210100005', fullName: 'علی رضايي' },
    },
    projects: {
      main: {
        code: 'PRJ-1405-901',
        name: 'برج جستجو',
        manager: 'pm',
        members: { pm: 'project_manager', client: 'client_reviewer', reviewer: 'reviewer', sup: 'supervisor' },
      },
      other: { code: 'PRJ-1405-902', name: 'پروژهٔ دیگر', manager: 'outsider', members: { outsider: 'project_manager' } },
    },
  });
  const client = await test.owner.connect();
  try {
    plan = await insertReferencePlan(client, { orgId: org.orgId, projectId: pid(), actorUserId: org.users.pm.id, now: new Date().toISOString() });
    // عنوانی با ی و ک عربی و رقم لاتین تا نرمال‌سازی آزموده شود
    await client.query(`update wbs_item set title = 'نصب جرثقيل برجي 2' where id = $1`, [plan.ids.get('l122')]);
    await insertReferencePlan(client, { orgId: org.orgId, projectId: org.projects.other, actorUserId: org.users.outsider.id, now: new Date().toISOString() });
    await client.query(`update wbs_item set title = 'جرثقیل برجی ۲ پروژهٔ دیگر' where project_id = $1 and code = '1.2.2'`, [org.projects.other]);
    const reportId = uuidv7();
    await client.query(
      `insert into field_report (id, org_id, project_id, source, author_user_id, work_date, report_no, device_recorded_at, server_received_at, created_at)
       values ($1, $2, $3, 'app', $4, '2026-06-21', 'FR-1405-0042', now(), now(), now())`,
      [reportId, org.orgId, pid(), org.users.sup.id],
    );
  } finally {
    client.release();
  }
  for (const key of ['pm', 'client', 'reviewer', 'outsider'] as const) tokens[key] = (await signIn(test, nextIp(), org.users[key].mobile)).accessToken;
  const agent = test.http(nextIp());
  await agent
    .post(`/v1/projects/${pid()}/risks`)
    .set('Authorization', `Bearer ${tokens.pm}`)
    .send({
      title: 'خرابی جرثقیل برجی',
      category: 'منابع',
      probability: 4,
      impact: 4,
      responseStrategy: 'mitigate',
      ownerUserId: org.users.pm.id,
      links: [],
      firstAction: null,
      notifyBelowThreshold: false,
    })
    .expect(201);
}, 120_000);

afterAll(async () => {
  await test?.close();
});

describe('جستجوی سراسری (برش ۱۵)', () => {
  it('نرمال‌سازی TypeScript و SQL یک خروجی دارند', async () => {
    const sample = 'جرثقيل  برجي ۲‌ای ك٣';
    const { rows } = await test.owner.query<{ value: string }>('select search_norm($1) as value', [sample]);
    expect(rows[0]?.value).toBe(normalizeSearch(sample));
    expect(normalizeSearch(sample)).toBe('جرثقیل برجی 2ای ک3');
  });

  it('AC-PL-09 — «جرثقیل برجی ۲» با ارقام فارسی و لاتین یکسان؛ فقط موضوع‌های مجاز', async () => {
    const persian = await search('pm', 'جرثقیل برجی ۲');
    const latin = await search('pm', 'جرثقيل برجي 2');
    expect(items(persian, 'wbs').map((item) => item.id)).toEqual([`wbs-${plan.ids.get('l122')}`]);
    expect(items(latin, 'wbs').map((item) => item.id)).toEqual(items(persian, 'wbs').map((item) => item.id));
    // آیتم پروژهٔ دیگر برای مدیر این پروژه نیست، برای مدیر آن پروژه هست
    expect(JSON.stringify(persian)).not.toContain('پروژهٔ دیگر');
    expect(items(await search('outsider', 'جرثقیل برجی ۲'), 'wbs')).toHaveLength(1);
  });

  it('ریسک، گزارش و افراد با دسترسی خودشان؛ بی مبلغ', async () => {
    const risk = await search('pm', 'جرثقیل');
    expect(items(risk, 'risk').map((item) => item.title)).toEqual(['RSK-001 · خرابی جرثقیل برجی']);
    expect(items(risk, 'risk')[0]?.to).toMatch(new RegExp(`^/projects/${pid()}/risks/`));
    const report = await search('pm', 'fr-1405-0042');
    expect(items(report, 'report').map((item) => item.title)).toEqual(['FR-1405-0042']);
    // نام نویسنده با ی عربی در دفترچه هم یافت می‌شود
    expect(items(await search('pm', 'علی رضایی'), 'report')).toHaveLength(1);
    expect(items(await search('pm', 'علی رضایی'), 'person').map((item) => item.title)).toEqual(['علی رضايي']);
    // ناظر کارفرما ریسک و گزارش می‌بیند (risk.view، report.view) ولی دفترچهٔ افراد نه (users.invite)
    const client = await search('client', 'جرثقیل');
    expect(items(client, 'risk')).toHaveLength(1);
    expect(items(await search('client', 'fr-1405'), 'report')).toHaveLength(1);
    // کاربر پروژهٔ دیگر گزارش این پروژه را نمی‌بیند
    expect(items(await search('outsider', 'fr-1405'), 'report')).toHaveLength(0);
    expect(items(await search('client', 'علی'), 'person')).toHaveLength(0);
    expect(JSON.stringify(risk)).not.toMatch(/ریال/);
  });

  it('دستورها پشت کد؛ دستور زمینه‌ای ثبت ریسک با پروژهٔ باز؛ حداکثر ۸ و دو جای دستور در «همه»', async () => {
    const blank = await search('client', '');
    const commandIds = items(blank, 'command').map((item) => item.id);
    expect(commandIds).toContain('go-dashboard');
    expect(commandIds).not.toContain('new-project');
    expect(commandIds).not.toContain('go-users');
    const contextual = await search('pm', 'تأخیر مصالح', { projectId: pid() });
    expect(items(contextual, 'command')[0]).toMatchObject({ id: 'new-risk-context', title: 'ثبت ریسک جدید برای «تأخیر مصالح»' });
    expect(items(await search('client', 'تأخیر مصالح', { projectId: pid() }), 'command').some((item) => item.id === 'new-risk-context')).toBe(false);

    const wide = await search('pm', '1');
    const shown = wide.groups.reduce((sum, group) => sum + group.items.length, 0);
    expect(shown).toBeLessThanOrEqual(8);
    // دستورهای جورشده (این‌جا «رفتن به …» با واژهٔ «رفتن») در «همه» جای خود را دارند حتی اگر موضوع‌ها پرشمار باشند
    const mixed = await search('pm', 'رفتن');
    expect(mixed.groups.at(-1)?.kind).toBe('command');
    expect(mixed.groups.reduce((sum, group) => sum + group.items.length, 0)).toBeLessThanOrEqual(8);
    const onlyWbs = await search('pm', '1', { kind: 'wbs' });
    expect(onlyWbs.groups.map((group) => group.kind)).toEqual(['wbs']);
  });
});
