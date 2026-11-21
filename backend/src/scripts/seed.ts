import { fileURLToPath } from 'node:url';
import { hash } from '@node-rs/argon2';
import { DEMO_ORG_ID, DEMO_PROJECT_IDS, DEMO_USER_IDS, type DemoProjectKey, type DemoUserKey } from '@projeyar/shared';
import pg from 'pg';
import { v7 as uuidv7 } from 'uuid';
import { loadDotEnv, loadProcessConfig } from '../config/config.js';
import { SYSTEM_ROLE_IDS } from '../database/system-ids.js';
import { seedReferencePlan } from './seed-reference.js';

// دادهٔ نمونه (docs/backend/05 ۱۳؛ 11 ۵): همان سازمان، افراد و پروژه‌های ماک فرانت با همان شناسه‌ها
// (packages/shared/demo) تا در دورهٔ گذار فهرست سرور و جزئیات ماک با هم بخوانند.
// فقط توسعه؛ با نقش مالک اجرا می‌شود؛ تکرارپذیر (on conflict do nothing).
//
// کاربر نمایشی احمدی مدیر سازمان است تا صفحه‌هایی که هنوز روی ماک‌اند، مثل حالت توسعهٔ فرانت،
// همه دیده شوند. رمز همهٔ کاربران نمونه: Projeyar1404 (همان ماک).

const DEMO_PASSWORD = 'Projeyar1404';

/** تقویم کارگاهی پیش‌فرض (W28): شنبه تا چهارشنبه کامل، پنجشنبه نیم‌روز، جمعه تعطیل. */
const SITE_WORK_WEEK = JSON.stringify(
  (['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] as const).map((day) => ({ day, mode: day === 'fri' ? 'off' : day === 'thu' ? 'half' : 'full' })),
);

interface DemoUser {
  readonly fullName: string;
  readonly tone: string;
  readonly email?: string;
  readonly jobTitle?: string;
  readonly department?: string;
}

const USERS: Record<DemoUserKey, DemoUser> = {
  ahmadi: { fullName: 'مهندس احمدی', tone: 'a5', email: 'm.ahmadi@abadgaran.ir', jobTitle: 'برنامه‌ریز پروژه', department: 'دفتر فنی' },
  rezaei: { fullName: 'مهندس رضایی', tone: 'a2' },
  karimi: { fullName: 'مهندس کریمی', tone: 'a1' },
  hashemi: { fullName: 'مهندس هاشمی', tone: 'a3' },
  nouri: { fullName: 'مهندس نوری', tone: 'a4' },
  jamali: { fullName: 'مهندس جمالی', tone: 'a6' },
  sadeghi: { fullName: 'مهندس صادقی', tone: 'a8' },
  moradi: { fullName: 'مهندس مرادی', tone: 'a7' },
  hosseini: { fullName: 'مهندس حسینی', tone: 'a4' },
  tavakoli: { fullName: 'مهندس توکلی', tone: 'a1' },
  salehi: { fullName: 'سعید کاظمی', tone: 'a7' },
  hamidi: { fullName: 'علی همتی', tone: 'a3' },
};

const PROJECT_TYPES: readonly [string, string][] = [
  ['residential', 'ساختمانی'],
  ['road_bridge', 'راه و پل'],
  ['tunnel', 'تونل'],
  ['healthcare', 'درمانی'],
  ['energy', 'انرژی'],
  ['parking', 'پارکینگ'],
  ['heritage', 'مرمت و میراث'],
  ['commercial', 'تجاری'],
];

type Row = readonly [
  code: string,
  name: string,
  client: string,
  type: string,
  status: string,
  manager: DemoUserKey,
  start: string,
  finish: string,
  msp: boolean,
];

/** همان ردیف‌های `frontend/src/modules/projects/mocks/projects.ts` با تاریخ‌های میلادی. */
const PROJECTS: Record<DemoProjectKey, Row> = {
  negin: ['PRJ-1404-021', 'مجتمع مسکونی نگین شهر', 'شهرداری تهران', 'residential', 'active', 'rezaei', '2024-07-22', '2025-11-06', true],
  pol: ['PRJ-1402-008', 'پل شهید سلیمانی', 'وزارت راه و شهرسازی', 'road_bridge', 'active', 'karimi', '2022-11-22', '2026-06-10', true],
  tunnel: ['PRJ-1401-012', 'تونل البرز', 'شرکت ساخت و توسعه', 'tunnel', 'active', 'hashemi', '2020-09-22', '2029-01-20', true],
  hospital: ['PRJ-1403-002', 'بیمارستان امام رضا', 'علوم پزشکی مشهد', 'healthcare', 'active', 'nouri', '2022-09-06', '2025-07-20', false],
  yazd: ['PRJ-1404-017', 'نیروگاه خورشیدی یزد', 'ساتبا', 'energy', 'active', 'jamali', '2024-11-30', '2025-12-31', false],
  parking: ['PRJ-1402-001', 'پارکینگ طبقاتی فردوسی', 'شهرداری مشهد', 'parking', 'completed', 'sadeghi', '2022-05-22', '2025-02-19', false],
  bazaar: ['PRJ-1404-024', 'بازسازی بازار سنتی', 'سازمان میراث فرهنگی', 'heritage', 'draft', 'moradi', '2025-07-23', '2026-11-10', false],
  zeytoon: ['PRJ-1403-015', 'مجتمع تجاری زیتون', 'گروه سرمایه‌گذاری ایرانیان', 'commercial', 'paused', 'ahmadi', '2023-10-23', '2026-01-25', true],
  datacenter: ['PRJ-1403-019', 'مرکز دادهٔ تهران', 'شرکت مخابرات ایران', 'residential', 'active', 'hosseini', '2024-05-04', '2026-05-05', true],
  karaj: ['PRJ-1403-011', 'دانشکدهٔ فنی کرج', 'دانشگاه تهران', 'residential', 'active', 'tavakoli', '2023-12-22', '2026-03-11', false],
  reference: ['PRJ-1405-001', 'ساختمان مثال مرجع', 'شرکت عمران نمونه', 'residential', 'active', 'ahmadi', '2026-03-25', '2026-09-22', false],
  pasargad: ['PRJ-1403-007', 'ساختمان اداری پاسارگاد', 'بانک پاسارگاد', 'commercial', 'paused', 'rezaei', '2023-08-23', '2025-12-21', false],
  madrese: ['PRJ-1405-031', 'مدرسهٔ دوازده‌کلاسهٔ شهید باقری', 'نوسازی مدارس', 'residential', 'draft', 'hosseini', '2026-11-22', '2028-03-15', false],
};

const mobileOf = (key: DemoUserKey, index: number): string => (key === 'ahmadi' ? '09123454321' : `091200002${String(index).padStart(2, '0')}`);

async function main(): Promise<void> {
  loadDotEnv();
  const config = loadProcessConfig();
  if (config.env === 'production') throw new Error('seed در production اجرا نمی‌شود (05 ۱۳)');
  if (!config.db.migrationUrl) throw new Error('DB_MIGRATION_URL تنظیم نشده است');

  const client = new pg.Client({ connectionString: config.db.migrationUrl });
  await client.connect();
  try {
    await client.query('begin');
    await seed(client);
    await client.query('commit');
    process.stdout.write('دادهٔ نمونه آماده است: ۱۲ کاربر، ۱۳ پروژه. ورود: 09123454321 / Projeyar1404\n');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    await client.end();
  }
}

/** دادهٔ نمونه با شناسه‌های ماک؛ تست سازگاری شکل پاسخ (برش ۲۰) هم از همین می‌خواند. */
export async function seed(client: pg.Client): Promise<void> {
  const now = new Date().toISOString();
  const passwordHash = await hash(DEMO_PASSWORD, { memoryCost: 19_456, timeCost: 2, parallelism: 1 });
  const preferences = JSON.stringify({ calendar: 'jalali', digits: 'fa', amountScale: 'auto', startPage: null });

  await client.query(`insert into organization (id, name, seat_limit, created_at) values ($1, $2, 60, $3) on conflict do nothing`, [
    DEMO_ORG_ID,
    'شرکت آبادگران ایران',
    now,
  ]);

  const userKeys = Object.keys(USERS) as DemoUserKey[];
  for (const [index, key] of userKeys.entries()) {
    const user = USERS[key];
    await client.query(
      `insert into app_user (id, org_id, full_name, mobile, email, password_hash, two_factor_enabled, status, is_org_admin,
         job_title, department, password_changed_at, avatar_tone, preferences, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, true, 'active', $7, $8, $9, $10, $11, $12, $10, $10)
       on conflict do nothing`,
      [
        DEMO_USER_IDS[key],
        DEMO_ORG_ID,
        user.fullName,
        mobileOf(key, index),
        user.email ?? null,
        passwordHash,
        key === 'ahmadi',
        user.jobTitle ?? null,
        user.department ?? null,
        now,
        user.tone,
        preferences,
      ],
    );
  }

  for (const [order, [key, name]] of PROJECT_TYPES.entries()) {
    await client.query(`insert into project_type (id, org_id, key, name, sort_order, created_at) values ($1, $2, $3, $4, $5, $6) on conflict do nothing`, [
      uuidv7(),
      DEMO_ORG_ID,
      key,
      name,
      order,
      now,
    ]);
  }

  for (const key of Object.keys(PROJECTS) as DemoProjectKey[]) {
    const [code, name, client_, type, status, manager, start, finish, msp] = PROJECTS[key];
    const projectId = DEMO_PROJECT_IDS[key];
    const inserted = await client.query(
      `insert into project (id, org_id, code, name, client_name, project_type, status, manager_user_id, planned_start,
         planned_finish, msp_linked, activated_at, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
       on conflict do nothing`,
      [
        projectId,
        DEMO_ORG_ID,
        code,
        name,
        client_,
        type,
        status,
        DEMO_USER_IDS[manager],
        start,
        finish,
        msp,
        status === 'draft' ? null : `${start}T05:30:00Z`,
        now,
      ],
    );
    if (!inserted.rowCount) continue;

    // همان ردیف‌هایی که ساخت پروژه می‌سازد (F02 ۵.۴): دفتر کد، تنظیمات پیش‌فرض، تقویم کارگاهی
    await client.query('insert into project_code_register (org_id, code, project_id, created_at) values ($1, $2, $3, $4)', [DEMO_ORG_ID, code, projectId, now]);
    await client.query('insert into project_settings (project_id, org_id, alternate_reviewer_user_id, created_at, updated_at) values ($1, $2, $3, $4, $4)', [
      projectId,
      DEMO_ORG_ID,
      DEMO_USER_IDS[manager],
      now,
    ]);
    await client.query('insert into project_calendar (project_id, org_id, work_week, created_at, updated_at) values ($1, $2, $3, $4, $4)', [
      projectId,
      DEMO_ORG_ID,
      SITE_WORK_WEEK,
      now,
    ]);

    // مدیر پروژه، برنامه‌ریز نمایشی، ناظر و واحد مالی (ترکیب پیش‌نمایش آواتار W07)
    const candidates: [DemoUserKey, keyof typeof SYSTEM_ROLE_IDS][] = [
      [manager, 'project_manager'],
      ['ahmadi', 'planner'],
      ['karimi', 'reviewer'],
      ['hashemi', 'finance'],
    ];
    const members = candidates.filter(([userKey], index) => index === 0 || userKey !== manager);
    for (const [userKey, role] of members) {
      const memberId = uuidv7();
      await client.query(
        `insert into project_member (id, org_id, project_id, user_id, status, created_at, updated_at) values ($1, $2, $3, $4, 'active', $5, $5)`,
        [memberId, DEMO_ORG_ID, projectId, DEMO_USER_IDS[userKey], now],
      );
      await client.query(`insert into project_member_role (id, org_id, member_id, role_id, created_at) values ($1, $2, $3, $4, $5)`, [
        uuidv7(),
        DEMO_ORG_ID,
        memberId,
        SYSTEM_ROLE_IDS[role],
        now,
      ]);
    }
  }

  // برنامهٔ مبنای پروژهٔ مثال مرجع (WBS، CBS، اتصال‌ها، تخصیص و حوزه) — فقط اگر هنوز نسخه‌ای ندارد
  if (await seedReferencePlan(client, now)) process.stdout.write('برنامهٔ مبنای «ساختمان مثال مرجع» ساخته شد (BAC = ۱٬۰۰۰ میلیون ریال).\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
