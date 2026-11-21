# ۰۵ — پایگاه داده و MikroORM

> مبنا: C01–C05، D05–D08، D12؛ `02-domain-model.md`؛ F20 ۳، ۶، ۸. نمونه‌کدها با تعریف‌های تایپ MikroORM 7.2.9 بررسی شده‌اند.

## ۱. اصول

1. **پایگاه داده نگهبان آخر است.** قاعده‌ای که با قید پایگاه داده بیان‌شدنی است (یکتایی، بازه، کلید خارجی، تغییرناپذیری، محدودیت سازمان) در پایگاه داده هم هست، نه فقط در کد.
2. **نوشتن از Entity، خواندن گزارشی از SQL** (01 ۵).
3. **هر جدول مستأجر `org_id` دارد** و بدون آن دیده نمی‌شود — در ORM و در خود پستگرس.
4. **واقعیت‌ها تغییرناپذیرند**؛ اصلاح ردیف تازه است.
5. **schema فقط با migration** عوض می‌شود؛ `schema:update` در هیچ محیطی جز تست واحد نیست.

## ۲. پیکربندی و RequestContext

```ts
// platform/database/mikro-orm.config.ts
import { defineConfig } from '@mikro-orm/postgresql';

export default defineConfig({
  clientUrl: env.DB_URL,                 // نقش projeyar_app — بخش ۴.۳
  replicas: env.DB_READ_URLS,            // اختیاری؛ پرس‌وجوهای { type: 'read' }
  entities: ALL_ENTITIES,                // فهرست صریح از ماژول‌ها؛ کشف خودکار پوشه نه
  forceUtcTimezone: true,                // C03: timestamptz به UTC
  allowGlobalContext: false,             // الزام کاربر: Identity Map هرگز بین درخواست‌ها مشترک نیست
  filters: { tenant: tenantFilter },     // بخش ۴.۲
  migrations: { path: 'dist/database/migrations', pathTs: 'src/database/migrations', transactional: true, allOrNothing: true },
  debug: env.DB_DEBUG,                   // فقط توسعه
});
```

**RequestContext — الزام کاربر.** MikroORM یک Identity Map دارد؛ اگر دو درخواست هم‌زمان یک EntityManager را شریک شوند، Entity یکی در پاسخ دیگری دیده می‌شود (و در سیستم چندمستأجره یعنی نشت داده). پس:

| جا | چطور EntityManager جدا می‌گیرد |
|---|---|
| درخواست HTTP | `MikroOrmModule` میان‌افزار RequestContext را خودکار ثبت می‌کند (`registerRequestContext` پیش‌فرض روشن) |
| کار pg-boss، مصرف‌کنندهٔ رویداد، تیک | اجراکنندهٔ کار در `platform/jobs` هر کار را در `RequestContext.create(orm.em, …)` اجرا می‌کند و فیلتر tenant را از `orgId` کار تنظیم می‌کند — هیچ مصرف‌کننده‌ای خودش این را نمی‌سازد |
| اسکریپت و seeder | `orm.em.fork()` صریح |
| هر جای دیگر | `allowGlobalContext: false` خطا می‌دهد؛ یعنی اشکال پیدا شده، نه اینکه خاموشش کنی |

## ۳. نوع‌ها (C01–C05)

| داده | ستون | MikroORM (`p.`) | JS | JSON |
|---|---|---|---|---|
| شناسه | `uuid` | `p.uuid().primary()` | `string` | `string` |
| مبلغ ریالی | `bigint` | `p.bigint('string')` | `string` (در محاسبه `BigInt`) | رشتهٔ عددی |
| درصد، وزن | `numeric(7,4)` | `p.decimal('string').precision(7).scale(4)` | `string` (در محاسبه `Decimal`) | `number` (فقط نمایش) |
| نسبت (CPI، SPI) | `numeric(12,8)` | `p.decimal('string')` | `string` | `number` |
| مقدار فیزیکی (متر، تن) | `numeric(18,4)` | `p.decimal('string')` | `string` | `number` |
| تاریخ کاری | `date` | `p.date()` | `string` `YYYY-MM-DD` | `YYYY-MM-DD` |
| لحظه | `timestamptz` | `p.datetime()` | `Date` | ISO UTC |
| وضعیت | `text` + `CHECK` | `p.enum(STATUSES)` | اجتماع رشته‌ای | رشته |
| دادهٔ ساخت‌یافتهٔ کم‌تغییر | `jsonb` | `p.json<T>()` | `T` نوع‌دار | — |
| کد خوانا (C05) | `text` یکتا در دامنه‌اش | `p.string()` | `string` | `string` |

- **UUID v7** (ترتیب زمانی، ایندکس فشرده) در اپلیکیشن ساخته می‌شود تا Entity پیش از flush شناسه داشته باشد؛ گوشی هم برای گزارش، آیتم و عکس خودش می‌سازد (D10). سرور UUID گوشی را با قالب و نسخه اعتبارسنجی می‌کند.
- **`jsonb` برای قواعد کسب‌وکاری نه:** `ProjectSettings` طرح نوع‌دار دارد، نه JSON آزاد (`02` ۳).
- **enum بومی PG نه:** افزودن مقدار به enum بومی در migration دردسرساز است؛ `text` + `CHECK` با فهرست از `packages/shared`. `[پیش‌فرض فنی]`

### ۳.۱ ستون‌های پایه

```ts
// platform/database/base-properties.ts
export const tenantBase = {
  id: p.uuid().primary().onCreate(() => uuidv7()),
  orgId: p.uuid(),                          // ستون org_id با استراتژی نام‌گذاری پیش‌فرض (snake_case)
  createdAt: p.datetime().onCreate(() => new Date()),
  createdBy: p.uuid().nullable(),           // null فقط برای سیستم (تیک، محاسبه)
} as const;

export const mutableBase = {
  ...tenantBase,
  updatedAt: p.datetime().onCreate(() => new Date()).onUpdate(() => new Date()),
  updatedBy: p.uuid().nullable(),
  version: p.integer().version(),           // قفل خوش‌بینانه — بخش ۹
} as const;
```

واقعیت‌های تغییرناپذیر `tenantBase` می‌گیرند (بدون `updatedAt` و `version`)؛ موجودیت‌های پایه و برنامه `mutableBase`.

### ۳.۲ نمونهٔ Entity

```ts
// modules/cost-ledger/domain/cost-entry.entity.ts
import { defineEntity, p } from '@mikro-orm/postgresql';

export const COST_ENTRY_STATUSES = ['draft', 'posted', 'reversed'] as const;

const CostEntrySchema = defineEntity({
  name: 'CostEntry',
  properties: {
    ...mutableBase,
    projectId: p.uuid(),
    cbsItemId: p.uuid(),
    amount: p.bigint('string'),                         // C02
    costDate: p.date(),                                 // C03 تاریخ کاری
    status: p.enum(COST_ENTRY_STATUSES).default('draft'),
    reversesId: p.uuid().nullable(),                    // اصلاح = ردیف تازه (D02)
    postedAt: p.datetime().nullable(),
  },
});

export class CostEntry extends CostEntrySchema.class {
  /** D02: ردیف قطعی ویرایش نمی‌شود؛ برگشت یک ردیف منفی تازه است. */
  reverse(by: string, now: Date): CostEntry { /* … */ }
}
CostEntrySchema.setClass(CostEntry);
```

## ۴. چندمستأجری (D12) — الزام کاربر

چهار لایه، هر کدام جداگانه کافی نیست:

### ۴.۱ زمینه
احراز هویت `orgId` کاربر را در `AppContext` (nestjs-cls) می‌گذارد. `orgId` **هرگز** از بدنه یا پارامتر درخواست خوانده نمی‌شود.

### ۴.۲ فیلتر ORM + RLS در یک تعریف

MikroORM 7 فیلتری با `rls: true` را هم به شرط پرس‌وجو تبدیل می‌کند و هم به سیاست Row-Level Security روی جدول؛ متغیر نشست `mikro.tenant.orgId` با `em.setFilterParams()` تنظیم می‌شود.

```ts
// platform/database/tenant.filter.ts
export const tenantFilter = {
  name: 'tenant',
  cond: (args: { orgId: string }) => ({ orgId: args.orgId }),
  entity: TENANT_ENTITIES,     // هر ماژول Entityهای مستأجرش را ثبت می‌کند
  default: true,
  args: true,
  strict: true,                // بدون orgId پرس‌وجو اجرا نمی‌شود، نه اینکه بی‌فیلتر برود
  rls: true,
} satisfies FilterDef;

// platform/security/tenant.interceptor.ts — پس از احراز هویت، در هر درخواست
em.setFilterParams('tenant', { orgId: ctx.orgId });
```

- خاموش کردن فیلتر (`filters: { tenant: false }`) فقط در `platform/` (پشتیبان سازمان، تیک‌های سراسری که روی سازمان‌ها حلقه می‌زنند) و هر بار با ممیزی. lint آن را بیرون از `platform/` رد می‌کند.
- تیک سراسری روی سازمان‌ها حلقه می‌زند و برای **هر** سازمان RequestContext و پارامتر جدا می‌سازد؛ هرگز یک پرس‌وجوی چندسازمانی.

### ۴.۳ نقش‌های پایگاه داده و RLS

| نقش | کار | ویژگی |
|---|---|---|
| `projeyar_owner` | مالک جدول‌ها؛ فقط migration | از اپ استفاده نمی‌شود |
| `projeyar_app` | اتصال اپلیکیشن | `NOSUPERUSER NOBYPASSRLS`، مالک هیچ جدولی نیست |
| `projeyar_readonly` | پشتیبانی و تحلیل | فقط `SELECT`، همان RLS |

هر جدول مستأجر در migration: `ENABLE ROW LEVEL SECURITY` و `FORCE ROW LEVEL SECURITY` (**در پیاده‌سازی بدون `FORCE`، متغیر `app.org_id` و تابع ورود `SECURITY DEFINER`** — README ۶). سیاست با `current_setting('mikro.tenant.orgId', true)`؛ اگر تنظیم نشده باشد NULL است و **هیچ ردیفی** دیده نمی‌شود — شکست بسته، نه باز.

**پرس‌وجوی خام** (Kysely، `em.execute`) فیلتر ORM را دور می‌زند ولی RLS را نه؛ با این حال هر پرس‌وجوی خام شرط صریح `org_id = :orgId` هم دارد (دفاع لایه‌ای و کمک به برنامه‌ریز پرس‌وجو). پرس‌وجوی خام فقط در `infrastructure/` (lint).

### ۴.۴ کلید خارجی هم‌سازمان

جدول‌های زیر پروژه کلید خارجی ترکیبی دارند تا ارجاع بین‌سازمانی حتی با باگ ممکن نباشد:

```sql
ALTER TABLE project ADD CONSTRAINT project_org_id_id_uq UNIQUE (org_id, id);
ALTER TABLE cost_entry ADD CONSTRAINT cost_entry_project_fk
  FOREIGN KEY (org_id, project_id) REFERENCES project (org_id, id);
```

### ۴.۵ جدول‌های بی‌سازمان
فقط این‌ها: `organization` خودش، جدول‌های pg-boss (schema جدا)، `mikro_orm_migrations`، و کاتالوگ‌های سراسری بی‌دادهٔ مشتری (مثل تعطیلات رسمی). هر جدول تازهٔ بی‌`org_id` با دلیل به این فهرست اضافه می‌شود.

### ۴.۶ تست
AC-PL-08: برای هر endpoint، دو سازمان؛ کاربر سازمان الف با شناسهٔ دادهٔ سازمان ب ۴۰۴ می‌گیرد (نه ۴۰۳ — وجود داده هم نشت نمی‌کند). به‌علاوهٔ تست مستقیم پایگاه داده: بدون `set_config` هیچ ردیفی برنمی‌گردد. (09 ۴)

## ۵. واقعیت‌ها و تغییرناپذیری

| جدول | تغییرناپذیر از | اصلاح |
|---|---|---|
| `field_report_item` | `approved` | آیتم جایگزین با `supersedes_item_id` (D08) |
| `review` | همیشه | — |
| `cost_entry` | `posted` | ردیف برگشتی با `reverses_id` (D02) |
| `contingency_allocation` | همیشه | ردیف معکوس |
| `*_plan` (عکس نسخه) | اعمال نسخه | نسخهٔ تازه |
| `period_snapshot` | بستن دوره | — |
| `audit_log`، `domain_event` | همیشه (`domain_event` فقط ستون‌های تحویل) | — |

در کد: Entity این‌ها متد تغییر ندارد. در پایگاه داده: تریگر `BEFORE UPDATE OR DELETE` که برای ردیف قفل‌شده خطا می‌دهد، و برای `audit_log` لغو `UPDATE`، `DELETE` و `TRUNCATE` از `projeyar_app`.

## ۶. Migration

- با `@mikro-orm/migrations` و فایل TypeScript در `src/database/migrations`. `migration:create` تفاوت را **پیشنهاد** می‌دهد؛ هر migration پیش از commit خوانده و ویرایش می‌شود (RLS، تریگر، View، ایندکس جزئی و `CHECK` را دستی کامل کن).
- migration اعمال‌شده **هرگز** ویرایش نمی‌شود؛ اصلاح = migration تازه.
- هر migration تراکنشی است؛ ایندکس سنگین روی جدول بزرگ با `CREATE INDEX CONCURRENTLY` در migration جدای بی‌تراکنش.
- **گسترش و انقباض** برای تغییر بی‌توقف: ستون تازه nullable ← پر کردن در پس‌زمینه ← قید NOT NULL ← حذف قدیمی در انتشار بعد.
- View و تابع SQL در `src/database/views/*.sql` و migration آن را `CREATE OR REPLACE` می‌کند تا تاریخچه‌اش در یک فایل خوانا بماند.
- تست یکپارچگی schema را **با اجرای migrationها** می‌سازد، نه با `schema:create`؛ پس migrationها هم تست می‌شوند.
- استقرار: نقش `migrate` (01 ۲) پیش از بالا آمدن `api` و `worker`.

## ۷. درخت‌ها (WBS، CBS)

- فهرست مجاورت: `parent_id`، `sort_order`، `depth`؛ ایندکس `(org_id, project_id, parent_id, sort_order)`.
- زیردرخت با CTE بازگشتی در `infrastructure/queries`؛ درخت کامل یک پروژه با یک پرس‌وجو و ساخت درخت در حافظه.
- کد WBS و CBS (`1.2.3`، `C.1.1.2`) نمایشی است و با جابه‌جایی بازشماری می‌شود (C01)؛ هیچ ارجاعی به کد نیست.
- ltree فقط اگر اندازه‌گیری روی بزرگ‌ترین پروژهٔ واقعی (۵٬۰۰۰ برگ، F17 ۱۰) نشان داد CTE کند است. `[پیش‌فرض فنی]`

## ۸. سمت خواندن: گزارش، داشبورد، View — الزام کاربر

| نیاز | ابزار | مثال |
|---|---|---|
| عدد مشتق یک پروژه (پیشرفت، EVM، منحنی S) | **جدول مشتق** که `computation` می‌نویسد | `wbs_item_progress`، `project_daily_snapshot` |
| ترکیب چند جدول برای یک صفحه | **View** متعلق به ماژول مالک دادهٔ اصلی | `v_report_inbox` (approvals)، `v_cbs_consumption` (cost-ledger + computation) |
| داشبورد سنگین میان‌پروژه‌ای سازمان | **Materialized View** با بازسازی صف‌شده | `mv_org_portfolio` (W05، W07) |
| فهرست صفحه‌بندی‌شده با فیلتر | Kysely در `infrastructure/queries` | صندوق W20 |
| خروجی Excel بزرگ | جریان (cursor) از پایگاه داده، نوشتن تدریجی | دفتر هزینه |

```ts
// modules/approvals/infrastructure/queries/inbox.sql.ts
export async function findInbox(em: EntityManager, orgId: string, q: InboxFilter): Promise<InboxRow[]> {
  return em.getKysely<ReadModels>({ type: 'read' })
    .selectFrom('v_report_inbox')
    .select(['report_id', 'report_no', 'project_name', 'pending_count', 'flagged', 'server_received_at'])
    .where('org_id', '=', orgId)                         // ۴.۳: صریح، کنار RLS
    .where('reviewer_area_ids', '@>', [q.areaId])       // scope own_area (D11)
    .orderBy('server_received_at', 'desc')
    .limit(q.limit + 1)                                  // +۱ برای hasMore
    .execute();
}
```

قواعد:
- هیچ داشبوردی Entity بارگذاری نمی‌کند و در JS جمع نمی‌زند. جمع در SQL یا در جدول مشتق.
- View و Materialized View مالک دارند (ماژول دادهٔ اصلی) و در `index.ts` آن ماژول به‌صورت تابع پرس‌وجوی نوع‌دار منتشر می‌شوند؛ ماژول دیگر جدول داخلی را Join نمی‌زند.
- `REFRESH MATERIALIZED VIEW CONCURRENTLY` (نیاز به ایندکس یکتا) در کار صف پس از `ComputeFinished` با تجمیع (`stately`)، نه در درخواست کاربر. هر MV ستون `refreshed_at` را نشان می‌دهد (D07 `computedAt`).
- حذف مبلغ (D11) در پرس‌وجوی خواندنی هم برقرار است: DTO خروجی `@Amount` دارد (07 ۵).
- پرس‌وجوی گزارشی سنگین `statement_timeout` جدا دارد (۳۰ ثانیه) و روی replica می‌رود.

## ۹. هم‌روندی — الزام کاربر

### ۹.۱ مسئله‌هایی که واقعاً پیش می‌آیند

| سناریو | خطر بدون کنترل |
|---|---|
| دو ناظر هم‌زمان یک آیتم را تأیید کنند (یا یکی تأیید، یکی رد) | دو Review، دو رویداد، پیشرفت دو بار |
| مرحلهٔ دوم پیش از ثبت کامل مرحلهٔ اول | آیتم از مرحله‌ای رد شود که هنوز نیامده |
| دو برنامه‌ریز هم‌زمان نسخهٔ کاری را اعمال کنند یا یکی ویرایش و یکی اعمال | جدول جاری نیمه‌به‌نیمه |
| قطعی و برگشت هم‌زمان یک ردیف هزینه | برگشت ردیفی که هنوز قطعی نشده |
| بستن دوره هم‌زمان با تأیید دیرهنگام | snapshot بسته‌شده بدون آیتم یا با آن، تصادفی |
| دو ویرایش هم‌زمان تنظیمات پروژه | ویرایش گم‌شده |
| تکرار درخواست شبکه (دوبار کلیک، تلاش دوباره اپ) | دو ردیف |

### ۹.۲ ابزارها

| ابزار | کجا | چطور |
|---|---|---|
| **قفل خوش‌بینانه** | هر موجودیت قابل‌ویرایش در فرم (تنظیمات، ریسک، نسخهٔ کاری، عضو) | ستون `version` (`p.integer().version()`)؛ پاسخ خواندن `ETag: "<version>"`؛ نوشتن `If-Match` اجباری (بدونش ۴۲۸)؛ ناهمخوانی ← ۴۰۹ `VERSION_CONFLICT` «کس دیگری این را تغییر داده؛ نسخهٔ تازه را ببینید» (F20 ۱۱.۱، AC-PL-11) |
| **قفل بدبینانه** | هر **انتقال حالت** گردش کار | `findOne(…, { lockMode: LockMode.PESSIMISTIC_WRITE })` روی ریشهٔ تجمع، **پیش از** خواندن وضعیت؛ درخواست دوم پشت قفل می‌ماند و بعد از commit اولی، وضعیت تازه را می‌بیند و موتور گردش کار انتقال را رد می‌کند (۴۰۹ `ITEM_ALREADY_DECIDED` با نام تصمیم‌گیرنده) |
| **نگهبان حالت** | موتور گردش کار (08 ۶) | انتقال فقط از حالت مبدأ مجاز؛ پس از قفل بررسی می‌شود |
| **قید پایگاه داده** | آخرین خط | ایندکس یکتای جزئی: یک نسخهٔ کاری باز برای هر پروژه `UNIQUE (project_id) WHERE status = 'draft'`؛ یک تصمیم برای هر آیتم در هر مرحله `UNIQUE (item_id, stage) WHERE decision IN ('approve','reject','request_revision')`؛ `CHECK` بازه‌ها |
| **قفل مشورتی** | ناوردای چندردیفی یک پروژه (بستن دوره، اعمال نسخه) | `SELECT pg_advisory_xact_lock(hashtextextended('period:' \|\| :projectId, 0))` در ابتدای تراکنش |
| **کلید یکتایی درخواست** | هر ساخت از وب؛ همهٔ مسیرهای اپ | `Idempotency-Key` (06 ۷)؛ اپ با UUID خودش (D10) |
| **صف سریالی** | دادهٔ مشتق هر پروژه | 08 ۳ |

### ۹.۳ قواعد قفل
- **ترتیب ثابت** برای جلوگیری از بن‌بست: پروژه ← نسخهٔ برنامه ← گزارش ← آیتم؛ چند ردیف هم‌جنس به ترتیب صعودی `id`.
- `SET LOCAL lock_timeout = '5s'` در هر تراکنش فرمان؛ پایان مهلت ← ۴۰۹ با `retryable: true`.
- سطح جداسازی پیش‌فرض `READ COMMITTED`؛ هیچ‌جا `SERIALIZABLE` سراسری. ناوردای سخت با قفل مشورتی، نه با سطح جداسازی.
- هیچ قفلی در انتظار شبکه نگه داشته نمی‌شود (04 ۵).

### ۹.۴ نگاشت

| عملیات | خوش‌بینانه | بدبینانه | قید | مشورتی |
|---|---|---|---|---|
| تصمیم روی آیتم گزارش | ✓ (`If-Match` از W40) | ✓ آیتم | ✓ یک تصمیم در مرحله | |
| تأیید همهٔ آیتم‌های بی‌پرچم (Shift+A) | | ✓ آیتم‌ها به ترتیب `id` | ✓ | |
| ویرایش نسخهٔ کاری | ✓ | | | |
| اعمال نسخه | ✓ | ✓ نسخه | ✓ یک کاری باز | ✓ پروژه |
| قطعی و برگشت هزینه | ✓ | ✓ ردیف | ✓ `reverses_id` یکتا | |
| تأیید بازنگری بودجه | ✓ | ✓ درخواست | | |
| بستن دوره | | | ✓ | ✓ پروژه |
| تنظیمات پروژه، ریسک، عضو | ✓ | | | |

## ۱۰. ممیزی (AuditLog) — الزام کاربر

- `audit.record(tx, { action, entity, before?, after?, reason? })` در **همان تراکنش**. بازیگر، سازمان، پروژه، `traceId` و زمان از زمینه می‌آیند.
- `before` و `after` فقط از **فهرست سفید** فیلدهای هر Entity (تعریف کنار Entity)؛ رمز، توکن و کد هرگز (AC-PL-05).
- فقط‌درج در کد (هیچ مخزن با `update`) و در پایگاه داده (لغو مجوز + تریگر).
- **فهرست الزامی** — F20 ۶ به‌علاوهٔ همهٔ تغییرات مالی، قراردادی و مدیریتی:

| حوزه | عمل |
|---|---|
| مالی | ثبت، قطعی، برگشت و ورود گروهی هزینه؛ `costsCompleteThrough`؛ درخواست، تأیید و رد بازنگری بودجه؛ تخصیص ذخیرهٔ احتیاطی؛ تغییر BAC از اعمال نسخه |
| برنامه و قرارداد | اعمال، کنار گذاشتن و تعیین مرجع PV نسخه؛ فعال‌سازی، توقف، بایگانی، حذف و لغو حذف پروژه؛ انتقال مدیر؛ تأیید پیشرفت اولیهٔ MSP؛ بستن دوره |
| گزارش کارگاه | **همهٔ** تصمیم‌ها (نه فقط اصلاح)؛ اصلاح بعد از تأیید؛ برگرداندن تأیید خودکار؛ تعیین تکلیف `needs_resolution`؛ ثبت دستی وب |
| دسترسی و امنیت | نقش، دسترسی، عضو، `scope`؛ دعوت؛ قفل و بازکردن کاربر؛ غیرفعال‌سازی؛ تغییر رمز، ورود دومرحله‌ای، کد پشتیبان |
| تنظیمات | تنظیمات پروژه (W29)، قواعد هشدار، کانال‌های اعلان، تنظیمات سازمان |
| داده | دانلود پشتیبان، خروجی کامل پروژه، خروجی دارای مبلغ |

- نگه‌داری ۲ سال (F20)؛ پارتیشن ماهانه وقتی حجم لازم کرد؛ ایندکس `(org_id, project_id, occurred_at)` و BRIN روی `occurred_at`.

## ۱۱. حذف و نگه‌داری

| چیز | رفتار |
|---|---|
| پروژه | `deletion_requested_at` و مهلت ۱۴ روزه؛ `PurgeTick` پس از مهلت حذف کامل می‌کند (F02 ۸.۴)؛ پیش‌نویس فوری |
| پروژهٔ بایگانی‌شده | `archived_at`؛ فقط‌خواندنی |
| کاربر | `disabled`، نه حذف؛ نامش در تاریخچه می‌ماند |
| واقعیت‌ها | هرگز حذف نه، جز با حذف کامل پروژه |
| ساختار برنامه | در نسخهٔ کاری حذف نرم (`wbs.md` ۵.۶)؛ پس از اعمال، در عکس نسخه می‌ماند |
| بقیه | حذف واقعی با بررسی ارجاع (کلید خارجی `RESTRICT`) |

جدول نگه‌داری F20 ۱۲ در `PurgeTick` اجرا می‌شود؛ `deleted_at` سراسری **نیست** چون فیلتر پنهانِ دوم کنار tenant باگ‌ساز است.

## ۱۲. ایندکس

- `org_id` اول در هر ایندکس ترکیبی جدول مستأجر.
- هر کلید خارجی ایندکس دارد.
- ایندکس جزئی برای صف‌های کاری: `field_report_item (org_id, project_id) WHERE status IN ('stage1','stage2','needs_resolution')`.
- `pg_trgm` + GIN روی عنوان و کد برای جستجو (F20 ۹) روی ستون نرمال‌شده (`title_search`).
- BRIN روی ستون زمان جدول‌های فقط‌افزودنی بزرگ (`domain_event`، `audit_log`، snapshotها).
- هر ایندکس تازه با `EXPLAIN (ANALYZE, BUFFERS)` روی دادهٔ seed بزرگ توجیه می‌شود.

## ۱۳. دادهٔ نمونه

- `seeders/reference-example.seeder.ts`: پروژهٔ مثال مرجع (BAC=1000، PV=550، EV=490، AC=520) دقیقاً همان `00-overview.md`.
- `seeders/negin.seeder.ts`: همان پروژهٔ نگین ماک‌های فرانت تا فرانت روی سرور واقعی همان صفحه‌ها را ببیند.
- seeder هرگز در production اجرا نمی‌شود (پیکربندی رد می‌کند).
