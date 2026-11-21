import pg from 'pg';
import { loadDotEnv, loadProcessConfig } from '../config/config.js';
import { APP_DB_ROLE, JOB_SCHEMA } from '../database/system-ids.js';

// آماده‌سازی یک‌بارهٔ سرور پستگرس (docs/backend/05 ۴.۳، 10 ۳) با DB_ADMIN_URL:
//   - نقش گروهی projeyar_app_role (مجوزها به این داده می‌شود)
//   - کاربر مالک (از DB_MIGRATION_URL) و کاربر اپ (از DB_URL، NOBYPASSRLS، عضو نقش گروهی)
//   - پایگاه داده با مالکیت کاربر مالک
// تکرارپذیر: چیزی که هست دوباره ساخته نمی‌شود؛ رمزها با مقدار env هم‌گام می‌شوند.

const ident = (value: string): string => `"${value.replace(/"/g, '""')}"`;
const literal = (value: string): string => `'${value.replace(/'/g, "''")}'`;

function credentials(url: string, label: string): { user: string; password: string; database: string } {
  const parsed = new URL(url);
  const user = decodeURIComponent(parsed.username);
  const password = decodeURIComponent(parsed.password);
  const database = parsed.pathname.replace(/^\//, '');
  if (!user || !password || !database) throw new Error(`${label} باید کاربر، رمز و نام پایگاه داده داشته باشد`);
  return { user, password, database };
}

async function ensureRole(client: pg.Client, name: string, attributes: string, password: string | null): Promise<void> {
  const existing = await client.query<{ rolsuper: boolean; rolbypassrls: boolean }>('select rolsuper, rolbypassrls from pg_roles where rolname = $1', [name]);
  const role = existing.rows[0];
  // هرگز ویژگی‌های یک نقش ممتاز موجود را دست نمی‌زنیم؛ پیکربندی باید نقش جدا بدهد
  if (role && (role.rolsuper || role.rolbypassrls)) {
    throw new Error(`نقش ${name} سوپریوزر است یا RLS را دور می‌زند؛ برای DB_URL و DB_MIGRATION_URL نقش جدا بدهید (مثلاً projeyar_app و projeyar_owner)`);
  }
  const withPassword = password === null ? '' : ` password ${literal(password)}`;
  await client.query(`${role ? 'alter' : 'create'} role ${ident(name)} ${attributes}${withPassword}`);
}

/** پیش از هر تغییری: سه کاربر جدا، و هیچ‌کدام همان مدیر سرور نباشد (05 ۴.۳). */
function assertDistinctUsers(adminUser: string, owner: string, app: string): void {
  const problems: string[] = [];
  if (owner === adminUser) problems.push(`DB_MIGRATION_URL با کاربر مدیر سرور (${adminUser}) است؛ نقش مالک جدا بدهید، مثلاً projeyar_owner`);
  if (app === adminUser) problems.push(`DB_URL با کاربر مدیر سرور (${adminUser}) است؛ نقش اپ جدا بدهید، مثلاً projeyar_app — سوپریوزر RLS را دور می‌زند`);
  if (owner === app) problems.push('DB_URL و DB_MIGRATION_URL باید دو کاربر جدا باشند: اپ نباید مالک جدول‌ها باشد (RLS)');
  if (problems.length) throw new Error(`پیکربندی پایگاه داده درست نیست:\n- ${problems.join('\n- ')}`);
}

/** schemaهایی که migration در آن‌ها می‌سازد: جدول‌های دامنه و صف pg-boss (08). */
const OWNED_SCHEMAS = ['public', JOB_SCHEMA] as const;

/**
 * اشیایی که کاربر مدیر در schemaهای این پایگاه داده ساخته (مثلاً migration با postgres) به نقش مالک
 * منتقل می‌شوند: خود schemaی pg-boss، جدول و view، تابع و نوع enum. عمداً REASSIGN OWNED نیست: آن
 * پایگاه‌های دادهٔ دیگرِ مدیر را هم جابه‌جا می‌کرد.
 */
async function adoptObjects(adminUrl: string, database: string, ownerUser: string): Promise<void> {
  const url = new URL(adminUrl);
  url.pathname = `/${database}`;
  const db = new pg.Client({ connectionString: url.toString() });
  await db.connect();
  try {
    const adminUser = decodeURIComponent(url.username);
    const schemas = [...OWNED_SCHEMAS];
    const ownedSchemas = await db.query<{ name: string }>(
      `select nspname as name from pg_namespace where nspname = any($1) and nspname <> 'public' and pg_get_userbyid(nspowner) = $2`,
      [schemas, adminUser],
    );
    for (const { name } of ownedSchemas.rows) await db.query(`alter schema ${ident(name)} owner to ${ident(ownerUser)}`);

    const relations = await db.query<{ schema: string; name: string; kind: string }>(
      `select n.nspname as schema, c.relname as name, c.relkind as kind from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = any($1) and c.relkind in ('r', 'v', 'm', 'p') and pg_get_userbyid(c.relowner) = $2`,
      [schemas, adminUser],
    );
    for (const { schema, name, kind } of relations.rows) {
      // sequenceهای ستون شناسه با جدولشان منتقل می‌شوند و جدا قابل‌انتقال نیستند
      const type = kind === 'v' ? 'view' : kind === 'm' ? 'materialized view' : 'table';
      await db.query(`alter ${type} ${ident(schema)}.${ident(name)} owner to ${ident(ownerUser)}`);
    }
    const functions = await db.query<{ signature: string }>(
      `select p.oid::regprocedure::text as signature from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = any($1) and pg_get_userbyid(p.proowner) = $2`,
      [schemas, adminUser],
    );
    for (const { signature } of functions.rows) await db.query(`alter function ${signature} owner to ${ident(ownerUser)}`);
    const types = await db.query<{ name: string }>(
      `select t.oid::regtype::text as name from pg_type t join pg_namespace n on n.oid = t.typnamespace
        where n.nspname = any($1) and t.typtype = 'e' and pg_get_userbyid(t.typowner) = $2`,
      [schemas, adminUser],
    );
    for (const { name } of types.rows) await db.query(`alter type ${name} owner to ${ident(ownerUser)}`);

    const moved = (relations.rowCount ?? 0) + (functions.rowCount ?? 0) + (types.rowCount ?? 0) + (ownedSchemas.rowCount ?? 0);
    if (moved) {
      process.stdout.write(
        `مالکیت ${relations.rowCount ?? 0} جدول، ${functions.rowCount ?? 0} تابع، ${types.rowCount ?? 0} نوع و ${ownedSchemas.rowCount ?? 0} schema به ${ownerUser} منتقل شد
`,
      );
    }
  } finally {
    await db.end();
  }
}

async function main(): Promise<void> {
  loadDotEnv();
  const config = loadProcessConfig();
  if (!config.db.adminUrl) throw new Error('DB_ADMIN_URL تنظیم نشده است');
  if (!config.db.migrationUrl) throw new Error('DB_MIGRATION_URL تنظیم نشده است');

  const owner = credentials(config.db.migrationUrl, 'DB_MIGRATION_URL');
  const app = credentials(config.db.url, 'DB_URL');
  if (owner.database !== app.database) throw new Error('DB_URL و DB_MIGRATION_URL باید به یک پایگاه داده اشاره کنند');
  assertDistinctUsers(decodeURIComponent(new URL(config.db.adminUrl).username), owner.user, app.user);

  const admin = new pg.Client({ connectionString: config.db.adminUrl });
  await admin.connect();
  try {
    await ensureRole(admin, APP_DB_ROLE, 'nologin', null);
    await ensureRole(admin, owner.user, 'login nosuperuser nocreaterole', owner.password);
    await ensureRole(admin, app.user, 'login nosuperuser nocreaterole nocreatedb nobypassrls', app.password);
    await admin.query(`grant ${ident(APP_DB_ROLE)} to ${ident(app.user)}`);

    const database = await admin.query('select 1 from pg_database where datname = $1', [owner.database]);
    if (!database.rowCount) {
      await admin.query(`create database ${ident(owner.database)} owner ${ident(owner.user)} encoding 'UTF8'`);
    } else {
      // پایگاه دادهٔ ازپیش‌ساخته (مثلاً با postgres): مالکیتش به نقش مالک می‌رسد تا migration بتواند
      // در schemaی public بسازد (پستگرس ۱۵+ فقط به مالک پایگاه داده اجازه می‌دهد)
      await admin.query(`alter database ${ident(owner.database)} owner to ${ident(owner.user)}`);
      await adoptObjects(config.db.adminUrl, owner.database, owner.user);
    }
    await admin.query(`revoke all on database ${ident(owner.database)} from public`);
    await admin.query(`grant connect on database ${ident(owner.database)} to ${ident(APP_DB_ROLE)}`);
    process.stdout.write(`آماده شد: پایگاه دادهٔ ${owner.database}، مالک ${owner.user}، اپ ${app.user}\n`);
  } finally {
    await admin.end();
  }
}

await main();
