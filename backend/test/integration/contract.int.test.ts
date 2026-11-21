import { readFileSync } from 'node:fs';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { RequestMethod } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { PERMISSION_CODES } from '@projeyar/shared';
import { v7 as uuidv7 } from 'uuid';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { openApiConfig } from '../../src/bootstrap/app.js';
import { SYSTEM_ROLE_IDS } from '../../src/database/system-ids.js';
import { AMOUNT_KEYS } from '../../src/platform/security/amounts.js';
import { AccessCoverage } from '../../src/platform/security/coverage.js';
import { OPENAPI_FILE, stableJson } from '../../src/scripts/openapi-emit.js';
import { insertReferencePlan } from '../../src/scripts/seed-reference.js';
import { seedOrg, type SeededOrg } from '../fixtures/organizations.js';
import { startTestApp, type TestApp } from './support/app.js';
import { signIn } from './support/auth.js';

// تست‌های قرارداد (docs/backend/09 ۵؛ برش ۲۰): endpoint ↔ کد دسترسی، حذف مبلغ، تازگی openapi.json.

/** کدهای کاتالوگ بی مسیر HTTP؛ هر کدام با دلیل (F01 ۵.۲؛ تصمیم 1405/08/27: نگه‌داری با دلیل). */
const SERVICE = 'درون سرویس سنجیده می‌شود، نه روی مسیر';
const UNROUTED: Readonly<Record<string, string>> = {
  'cbs.view_amounts': `${SERVICE}: حذف مبلغ (D11) در AmountInterceptor و سرویس‌ها`,
  'cbs.revise_budget': `${SERVICE}: ویرایش بودجهٔ پیش‌نویس CBS`,
  'risk.edit': `${SERVICE}: RiskAccess`,
  'reports.schedule': `${SERVICE}: ReportAccess.canSchedule`,
  'reports.schedule_financial': `${SERVICE}: زمان‌بندی قالب مالی`,
  'reports.send_external': `${SERVICE}: گیرندهٔ بیرونی (AC-MR-08)`,
  'reports.send_amounts_external': `${SERVICE}: نسخهٔ با مبلغ برای گیرندهٔ بیرونی`,
  'msp.templates.manage': `${SERVICE}: ذخیرهٔ قالب تطبیق در MspAccess`,
  'notifications.view_own': 'مسیرهای اعلان خود کاربر @Authenticated اند (notifications.md ۸)',
  'wbs.edit': 'تغییر WBS فقط از راه نسخهٔ پیش‌نویس با plan.edit_draft (D05)؛ رزرو',
  'wbs.export': 'خروجی CSV سمت مرورگر از داده‌ای که سرور مبلغش را حذف کرده (تصمیم 1405/08/27)؛ فقط در رابط',
  'plan.view_versions': 'فهرست و مقایسهٔ نسخه‌ها هنوز ساخته نشده (code-mapping §۷.۲)',
  'plan.set_pv_reference': 'انتخاب مرجع PV در تنظیمات هنوز ساخته نشده (code-mapping §۷.۲)',
  'charts.view_summary': 'خلاصهٔ نمودار ناظر کارفرما جدا ساخته نشده؛ رزرو (charts.md ۸)',
  'notifications.configure_org': 'تنظیم اعلان سطح سازمان هنوز ساخته نشده (code-mapping §۷.۲)',
  'audit.view': 'صفحهٔ ممیزی هنوز ساخته نشده (code-mapping §۷.۲ ردیف ۲۸)',
  'backup.manage': 'پشتیبان سطح سازمان کنار رفت؛ پشتیبان هر پروژه با project.settings.edit (§۷.۱.۴۸)؛ رزرو',
  'org.backup': 'همان؛ رزرو پشتیبان سطح سازمان',
  'org.integrations': 'فرم اتصال ERP و حسابداری در فاز بعد (integrations.md ۹)',
  'integrations.view': 'F19 فاز بعد؛ کارت‌ها در پاسخ تنظیمات پروژه با project.view',
  'integrations.manage': 'F19 فاز بعد (AC-IN-07)',
  'integrations.run': 'F19 فاز بعد',
  'integrations.map_accounts': 'F19 فاز بعد',
};

let test: TestApp;
let org: SeededOrg<'pm' | 'client', 'ref'>;
const tokens: Record<'pm' | 'client', string> = { pm: '', client: '' };
let ip = 0;
const nextIp = () => `10.78.0.${(ip++ % 250) + 1}`;

interface RouteInfo {
  readonly route: string;
  readonly method: string;
  readonly path: string;
  readonly amounts: readonly string[];
}

function routes(): RouteInfo[] {
  const discovery = test.app.get(DiscoveryService);
  const scanner = test.app.get(MetadataScanner);
  const reflector = test.app.get(Reflector);
  return discovery.getControllers().flatMap((wrapper) => {
    const instance = wrapper.instance as object | null;
    const controller = wrapper.metatype;
    if (!instance || !controller) return [];
    const base = String(reflector.get<string>(PATH_METADATA, controller) ?? '');
    const prototype = Object.getPrototypeOf(instance) as Record<string, unknown>;
    return scanner.getAllMethodNames(prototype).flatMap((name) => {
      const handler = prototype[name];
      if (typeof handler !== 'function') return [];
      const path = reflector.get<string | undefined>(PATH_METADATA, handler);
      if (path === undefined) return [];
      const method = RequestMethod[reflector.get<RequestMethod>(METHOD_METADATA, handler)] ?? 'GET';
      const full = `/v1/${[base, path].filter(Boolean).join('/')}`.replace(/\/+/g, '/').replace(/\/$/, '');
      return [{ route: `${controller.name}.${name}`, method, path: full, amounts: reflector.get<string[] | undefined>(AMOUNT_KEYS, handler) ?? [] }];
    });
  });
}

/** هر جای پاسخ که این کلیدها آمده‌اند: مقدارها. */
function valuesOf(value: unknown, keys: ReadonlySet<string>, out: unknown[] = []): unknown[] {
  if (Array.isArray(value)) for (const entry of value) valuesOf(entry, keys, out);
  else if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      if (keys.has(key)) out.push(entry);
      else valuesOf(entry, keys, out);
    }
  }
  return out;
}

beforeAll(async () => {
  test = await startTestApp();
  org = await seedOrg(test.owner, {
    name: 'سازمان قرارداد',
    users: { pm: { mobile: '09220300001', fullName: 'مدیر پروژه' }, client: { mobile: '09220300002', fullName: 'ناظر کارفرما' } },
    projects: { ref: { code: 'PRJ-1405-971', name: 'ساختمان مرجع', manager: 'pm', members: { pm: 'project_manager', client: 'client_reviewer' } } },
  });
  const client = await test.owner.connect();
  try {
    await insertReferencePlan(client, { orgId: org.orgId, projectId: org.projects.ref, actorUserId: org.users.pm.id, now: '2026-06-21T08:00:00.000Z' });
    // ناظر کارفرما برای مسیرهای پیش‌نویس هم کد می‌گیرد ولی هرگز cbs.view_amounts نه (D11)
    await client.query(`insert into role_permission (id, role_id, permission_code, scope) values ($1, $2, 'plan.edit_draft', 'all')`, [
      uuidv7(),
      SYSTEM_ROLE_IDS.client_reviewer,
    ]);
  } finally {
    client.release();
  }
  tokens.pm = (await signIn(test, nextIp(), org.users.pm.mobile)).accessToken;
  tokens.client = (await signIn(test, nextIp(), org.users.client.mobile)).accessToken;
}, 120_000);

afterAll(async () => {
  await test?.close();
});

describe('قرارداد API (09 ۵)', () => {
  it('هر مسیر یکی از Public، Authenticated یا یک کد کاتالوگ؛ هر کد کاتالوگ دست‌کم یک مسیر یا دلیل ثبت‌شده', () => {
    const access = test.app.get(AccessCoverage).routes();
    expect(access.filter((route) => !route.kind)).toEqual([]);
    const used = new Set(access.flatMap((route) => (route.permission ? [route.permission] : [])));
    const orphan = PERMISSION_CODES.filter((code) => !used.has(code) && !UNROUTED[code]);
    expect(orphan).toEqual([]);
    expect(Object.keys(UNROUTED).filter((code) => used.has(code as never))).toEqual([]);
  });

  it('openapi.json با کد یکی است؛ هر عملیات غیر عمومی x-permission یا x-access دارد (اختلاف ← pnpm run openapi:emit)', () => {
    const document = SwaggerModule.createDocument(test.app, openApiConfig());
    for (const [path, operations] of Object.entries(document.paths)) {
      for (const [method, operation] of Object.entries(operations as Record<string, Record<string, unknown>>)) {
        const marked = typeof operation['x-permission'] === 'string' || typeof operation['x-access'] === 'string';
        expect(marked, `${method.toUpperCase()} ${path}`).toBe(true);
      }
    }
    expect(stableJson(document)).toBe(readFileSync(OPENAPI_FILE, 'utf8'));
  });

  it('D11 — هر GET دارای x-amount-fields روی پروژه: بی cbs.view_amounts همهٔ آن کلیدها null', async () => {
    const targets = routes().filter((route) => route.method === 'GET' && route.amounts.length > 0 && /^\/v1\/projects\/:projectId\/[^:]*$/.test(route.path));
    expect(targets.length).toBeGreaterThan(5);
    for (const route of targets) {
      const path = route.path.replace(':projectId', org.projects.ref);
      const keys = new Set(route.amounts);
      const asPm = await test.http(nextIp()).get(path).set('Authorization', `Bearer ${tokens.pm}`);
      const asClient = await test.http(nextIp()).get(path).set('Authorization', `Bearer ${tokens.client}`);
      expect(asClient.status, `${route.route} ${path}`).toBe(asPm.status);
      if (asClient.status !== 200) continue;
      expect(
        valuesOf(asClient.body, keys).filter((value) => value !== null),
        route.route,
      ).toEqual([]);
    }
  });
});
