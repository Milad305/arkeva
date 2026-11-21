import { type EntityManager, MikroORM, RequestContext } from '@mikro-orm/postgresql';
import { ClsService } from 'nestjs-cls';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Notifier, type NotifyInput } from '../../src/modules/notifications/index.js';
import { NotificationRetention } from '../../src/modules/notifications/application/notification-retention.js';
import { AppContext } from '../../src/platform/context/app-context.js';
import { applyTenant } from '../../src/platform/database/tenant.js';
import { seedOrg, type SeededOrg } from '../fixtures/organizations.js';
import { startTestApp, type TestApp } from './support/app.js';
import { signIn } from './support/auth.js';

// برش ۲ — اعلان پایه، فقط درون‌برنامه (F13؛ notifications.md ۵.۲، ۵.۳، ۷، ۹، ۱۰؛ AC-NT-02، ۰۳، ۰۴).

type UserKey = 'pm' | 'reviewer' | 'outsider' | 'disabled';
type ProjectKey = 'main' | 'archived';

let test: TestApp;
let org: SeededOrg<UserKey, ProjectKey>;
let other: SeededOrg<'admin', never>;
const tokens = {} as Record<'pm' | 'reviewer' | 'outsider' | 'otherAdmin', string>;
let ipCounter = 0;
const nextIp = (): string => `10.70.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;
const data = <T>(body: unknown): T => (body as { data: T }).data;

function as(user: keyof typeof tokens) {
  const agent = test.http(nextIp());
  return {
    get: (path: string) => agent.get(path).set('Authorization', `Bearer ${tokens[user]}`),
    post: (path: string, body: object = {}) => agent.post(path).set('Authorization', `Bearer ${tokens[user]}`).send(body),
  };
}

/** همان راهی که مصرف‌کنندهٔ رویداد می‌رود: کار سیستمی در سازمان، درون تراکنش. */
function notify(input: Omit<NotifyInput, 'orgId'>, orgId = org.orgId) {
  const orm = test.app.get(MikroORM);
  const cls = test.app.get(ClsService);
  const context = test.app.get(AppContext);
  return cls.run(() => {
    context.setJobScope({ orgId, traceId: 'ERR-NT01-00' });
    return RequestContext.create(orm.em, () => {
      applyTenant(orm.em, orgId);
      return orm.em.transactional((tx: EntityManager) => test.app.get(Notifier).notify(tx, input));
    });
  });
}

const report = (subjectId: string, overrides: Partial<NotifyInput> = {}): Omit<NotifyInput, 'orgId'> => ({
  code: 'NT-APR-01',
  projectId: org.projects.main,
  recipients: [org.users.reviewer.id],
  subjectId,
  title: 'گزارش جدید',
  body: 'سرپرست گزارش را فرستاد؛ ۴ آیتم منتظر بررسی شماست.',
  link: '/projects/x/reports',
  ...overrides,
});

interface ListDto {
  items: { id: string; code: string; category: string; title: string; projectName: string | null; readAt: string | null; mergedCount: number }[];
  nextCursor: string | null;
  unreadCount: number;
  counts: Record<string, number>;
}

beforeAll(async () => {
  test = await startTestApp();
  org = await seedOrg(test.owner, {
    name: 'سازمان اعلان',
    users: {
      pm: { mobile: '09151000001' },
      reviewer: { mobile: '09151000002' },
      outsider: { mobile: '09151000003' },
      disabled: { mobile: '09151000004', status: 'disabled' },
    },
    projects: {
      main: { code: 'PRJ-1405-401', name: 'برج نمونه', manager: 'pm', members: { pm: 'project_manager', reviewer: 'reviewer' } },
      archived: { code: 'PRJ-1405-402', manager: 'pm', status: 'archived', members: { pm: 'project_manager' } },
    },
  });
  other = await seedOrg(test.owner, { name: 'سازمان دیگر', users: { admin: { mobile: '09152000001', orgAdmin: true } } });
  for (const key of ['pm', 'reviewer', 'outsider'] as const) tokens[key] = (await signIn(test, nextIp(), org.users[key].mobile)).accessToken;
  tokens.otherAdmin = (await signIn(test, nextIp(), other.users.admin.mobile)).accessToken;
});

afterAll(async () => {
  await test?.close();
});

describe('F13 ۵.۲ — ساخت اعلان درون‌برنامه', () => {
  it('AC-NT-02 — یک اعلان برای هر گزارش؛ تکرار همان موضوع در یک ساعت ساخته نمی‌شود', async () => {
    expect(await notify(report('report-1'))).toEqual({ created: 1, merged: 0, skipped: 0 });
    expect(await notify(report('report-1'))).toEqual({ created: 0, merged: 0, skipped: 1 });
    const list = data<ListDto>((await as('reviewer').get('/v1/notifications').expect(200)).body);
    expect(list.items).toHaveLength(1);
    expect(list.items[0]).toMatchObject({ code: 'NT-APR-01', category: 'approvals', projectName: 'برج نمونه', readAt: null, mergedCount: 0 });
    expect(list.unreadCount).toBe(1);
  });

  it('AC-NT-03 — ارتقای شدت اعلان تازه می‌سازد؛ ارزیابی دوباره با همان شدت نه', async () => {
    const alert = { code: 'AL-PRG-01', recipients: [org.users.pm.id], subjectId: 'wbs-7' };
    expect((await notify(report('', { ...alert, severity: 'warning' }))).created).toBe(1);
    expect((await notify(report('', { ...alert, severity: 'warning' }))).created).toBe(0);
    expect((await notify(report('', { ...alert, severity: 'critical' }))).created).toBe(1);
  });

  it('۱۰ — پروژهٔ بایگانی‌شده و کاربر غیرفعال اعلان نمی‌گیرند', async () => {
    expect(await notify(report('report-arch', { projectId: org.projects.archived, recipients: [org.users.pm.id] }))).toEqual({ created: 0, merged: 0, skipped: 1 });
    expect(await notify(report('report-2', { recipients: [org.users.disabled.id] }))).toEqual({ created: 0, merged: 0, skipped: 1 });
  });

  it('AC-NT-04 — ۸ اعلان هم‌نوع در ۱۰ دقیقه: ۵ جدا و یکی ادغام‌شده با ۳', async () => {
    for (let index = 0; index < 8; index += 1) {
      await notify(report(`risk-${index}`, { code: 'NT-RSK-04', recipients: [org.users.outsider.id], projectId: null, title: `مشکل ${index}` }));
    }
    const list = data<ListDto>((await as('outsider').get('/v1/notifications?type=risks').expect(200)).body);
    expect(list.items).toHaveLength(6);
    const merged = list.items.filter((item) => item.mergedCount > 0);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ mergedCount: 3, title: '۳ اعلان تازه: مشکل 7' });
    expect(list.counts).toMatchObject({ all: 6, risks: 6, approvals: 0, system: 0 });
  });
});

describe('F13 ۹ — اعلان‌های من', () => {
  it('W06 — صفحه‌بندی cursor بی تکرار و بی جاافتادگی', async () => {
    const first = data<ListDto>((await as('outsider').get('/v1/notifications?limit=4').expect(200)).body);
    expect(first.items).toHaveLength(4);
    expect(first.nextCursor).not.toBeNull();
    const second = data<ListDto>((await as('outsider').get(`/v1/notifications?limit=4&cursor=${first.nextCursor}`).expect(200)).body);
    expect(second.items).toHaveLength(2);
    expect(second.nextCursor).toBeNull();
    expect(new Set([...first.items, ...second.items].map((item) => item.id)).size).toBe(6);
  });

  it('خواندن یکی، شمار خوانده‌نشده، «همه خوانده شد» فقط در زبانهٔ جاری', async () => {
    await notify(report('plan-1', { code: 'NT-PLN-01', recipients: [org.users.reviewer.id] }));
    const before = data<ListDto>((await as('reviewer').get('/v1/notifications').expect(200)).body);
    expect(before.unreadCount).toBe(2);
    const approval = before.items.find((item) => item.category === 'approvals');
    await as('reviewer').post(`/v1/notifications/${approval!.id}/read`).expect(200);
    expect(data<{ count: number }>((await as('reviewer').get('/v1/notifications/unread-count').expect(200)).body).count).toBe(1);
    expect(data<{ count: number }>((await as('reviewer').post('/v1/notifications/read-all', { type: 'approvals' }).expect(200)).body).count).toBe(0);
    expect(data<{ count: number }>((await as('reviewer').post('/v1/notifications/read-all', {}).expect(200)).body).count).toBe(1);
    const unread = data<ListDto>((await as('reviewer').get('/v1/notifications?status=unread').expect(200)).body);
    expect(unread.items).toHaveLength(0);
  });

  it('D12 — اعلان دیگری و سازمان دیگر دیده و خوانده نمی‌شود', async () => {
    const mine = data<ListDto>((await as('pm').get('/v1/notifications').expect(200)).body);
    const id = mine.items[0]!.id;
    const foreignRead = await as('reviewer').post(`/v1/notifications/${id}/read`).expect(404);
    expect((foreignRead.body as { code: string }).code).toBe('NOTIFICATION_NOT_FOUND');
    await as('otherAdmin').post(`/v1/notifications/${id}/read`).expect(404);
    expect(data<ListDto>((await as('otherAdmin').get('/v1/notifications').expect(200)).body).items).toHaveLength(0);
  });

  it('notifications.md ۷ — نگه‌داری ۱۸۰ روزه در PurgeTick', async () => {
    await test.owner.query("update notification set created_at = now() - interval '181 days' where user_id = $1", [org.users.pm.id]);
    const purged = await test.app.get(NotificationRetention).onTick();
    expect(purged).toBeGreaterThanOrEqual(2);
    expect(data<ListDto>((await as('pm').get('/v1/notifications').expect(200)).body).items).toHaveLength(0);
  });
});
