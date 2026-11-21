import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import pg from 'pg';
import { APP_DB_ROLE } from '../../../src/database/system-ids.js';

// پایگاه دادهٔ موقت هر فایل تست یکپارچگی (docs/backend/09 ۶) روی PostgreSQL محلی با TEST_DB_ADMIN_URL
// (تصمیم 1405/08/21: به‌جای Testcontainers). نقش‌ها مثل production جدا هستند تا RLS واقعاً آزموده شود:
//   - projeyar_test_owner: مالک پایگاه داده و اجراکنندهٔ migration
//   - projeyar_test_app: نقش اپ، NOBYPASSRLS، عضو projeyar_app_role
// نقش‌ها میان اجراها می‌مانند و رمزشان هر بار تصادفی و تازه می‌شود؛ پایگاه داده در پایان پاک می‌شود.

const BACKEND_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const OWNER_ROLE = 'projeyar_test_owner';
const APP_ROLE = 'projeyar_test_app';

const ident = (value: string): string => `"${value.replace(/"/g, '""')}"`;
const literal = (value: string): string => `'${value.replace(/'/g, "''")}'`;

/** متغیر فرایند، وگرنه فقط همین یک کلید از فایل‌های env (مقدار هیچ‌جا چاپ نمی‌شود). */
function testAdminUrl(): string {
  const fromProcess = process.env['TEST_DB_ADMIN_URL']?.trim();
  if (fromProcess) return fromProcess;
  for (const name of ['.env.test.local', '.env.test', '.env.development.local', '.env.development']) {
    const path = join(BACKEND_ROOT, name);
    if (!existsSync(path)) continue;
    const value = parseEnv(readFileSync(path, 'utf8'))['TEST_DB_ADMIN_URL']?.trim();
    if (value) return value;
  }
  throw new Error('TEST_DB_ADMIN_URL تنظیم نشده است (backend/.env.example، بخش تست یکپارچگی)');
}

function withCredentials(base: string, user: string, password: string, database: string): string {
  const url = new URL(base);
  url.username = encodeURIComponent(user);
  url.password = encodeURIComponent(password);
  url.pathname = `/${database}`;
  return url.toString();
}

async function ensureRole(admin: pg.Client, name: string, attributes: string, password: string | null): Promise<void> {
  const existing = await admin.query('select 1 from pg_roles where rolname = $1', [name]);
  const withPassword = password === null ? '' : ` password ${literal(password)}`;
  await admin.query(`${existing.rowCount ? 'alter' : 'create'} role ${ident(name)} ${attributes}${withPassword}`);
}

export interface TestDatabase {
  readonly name: string;
  /** نقش مالک — migration و ساخت دادهٔ تست (RLS را چون مالک است دور می‌زند). */
  readonly ownerUrl: string;
  /** نقش اپ — همان اتصال برنامه؛ زیر RLS. */
  readonly appUrl: string;
  drop(): Promise<void>;
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const adminUrl = testAdminUrl();
  const name = `projeyar_test_${Date.now().toString(36)}_${randomBytes(3).toString('hex')}`;
  const ownerPassword = randomBytes(24).toString('base64url');
  const appPassword = randomBytes(24).toString('base64url');

  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    await ensureRole(admin, APP_DB_ROLE, 'nologin', null);
    await ensureRole(admin, OWNER_ROLE, 'login nosuperuser nocreaterole nocreatedb nobypassrls', ownerPassword);
    await ensureRole(admin, APP_ROLE, 'login nosuperuser nocreaterole nocreatedb nobypassrls', appPassword);
    await admin.query(`grant ${ident(APP_DB_ROLE)} to ${ident(APP_ROLE)}`);
    await admin.query(`create database ${ident(name)} owner ${ident(OWNER_ROLE)} encoding 'UTF8' template template0`);
    await admin.query(`revoke all on database ${ident(name)} from public`);
    await admin.query(`grant connect on database ${ident(name)} to ${ident(APP_DB_ROLE)}`);
  } finally {
    await admin.end();
  }

  return {
    name,
    ownerUrl: withCredentials(adminUrl, OWNER_ROLE, ownerPassword, name),
    appUrl: withCredentials(adminUrl, APP_ROLE, appPassword, name),
    async drop() {
      const client = new pg.Client({ connectionString: adminUrl });
      await client.connect();
      try {
        await client.query(`drop database if exists ${ident(name)} with (force)`);
      } finally {
        await client.end();
      }
    },
  };
}
