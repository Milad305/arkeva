# ۰۳ — ساختار پروژه و نام‌گذاری

## ۱. مخزن (pnpm workspace)

```
Ashan/
  pnpm-workspace.yaml        packages: [frontend, backend, packages/*]
  package.json               فرمان‌های سراسری: lint، typecheck، test
  pnpm-lock.yaml             یک lockfile برای همه
  backend/                   NestJS
  frontend/                  React (همان که هست)
  packages/
    shared/                  ثابت‌ها و نوع‌های مشترک (02 ۴)
  docker/
    compose.dev.yml          postgres، minio، mailpit
    compose.prod.yml         نمونهٔ نصب اختصاصی
  design/  docs/  CLAUDE.md  AGENTS.md
```

> **گام اول پیاده‌سازی:** فرانت الان lockfile خودش را دارد. با ساختن workspace، lockfile به ریشه می‌رود و `CLAUDE.md` ۹ به‌روز می‌شود (`pnpm --filter frontend …`). نام پوشه‌ها عوض نمی‌شود تا مسیرهای `CLAUDE.md` و `.claude/launch.json` نشکنند.

## ۲. بک‌اند

```
backend/
  package.json  tsconfig.json  tsconfig.build.json  nest-cli.json  .swcrc
  vitest.config.ts  vitest.integration.config.ts  eslint.config.js
  mikro-orm.config.ts        پیکربندی CLI (همان که اپ می‌خواند)
  .env.example               همهٔ متغیرها با توضیح (10 ۲)
  Dockerfile
  src/
    main.ts                  راه‌انداز: بر اساس APP_ROLE فقط bootstrap می‌کند
    app.module.ts
    bootstrap/               setup‌های جدا: swagger، امنیت، pipe و filter سراسری، shutdown
    config/                  پیکربندی نوع‌دار هر حوزه + اعتبارسنجی env
      app.config.ts  database.config.ts  auth.config.ts  storage.config.ts  …
    platform/                F20 — زیرساخت بی‌دامنه؛ هیچ قاعدهٔ کسب‌وکاری
      context/               ClsModule، RequestContext، نوع AppContext
      database/              MikroORM، فیلتر tenant، RLS، تراکنش، نوع‌های C01–C04
      http/                  قالب پاسخ و خطا، صفحه‌بندی، Idempotency-Key، If-Match
      security/              گارد احراز هویت، گارد دسترسی، scope، @Amount
      outbox/                emitEvent، پخش‌کننده، ثبت مصرف‌کننده
      jobs/                  pg-boss، تعریف صف‌ها، اجراکنندهٔ کار با RequestContext
      scheduler/             تیک‌ها و جبران تیک از دست‌رفته
      workflow/              موتور ماشین حالت
      audit/                 audit()
      storage/               ObjectStorage، بارگذاری قابل‌ادامه
      messaging/             SmsSender، EmailSender، PushSender و پیاده‌سازی‌ها
      search/                نرمال‌سازی فارسی و نمایهٔ pg_trgm
      health/                /health، /ready، معیارها
    modules/                 ماژول‌های دامنه (01 ۴)
      identity/  projects/  wbs/  planning/  cbs/  cost-ledger/  team/  field/
      approvals/  computation/  alerts/  notifications/  risks/  msp/
      templates/  analytics/  reporting/  integrations/
    database/
      migrations/            فایل‌های migration (05 ۶)
      views/                 SQL ساخت Viewها، که migration اجرا می‌کند
      seeders/               دادهٔ نمونه (مثال مرجع، پروژهٔ نگین)
  test/
    integration/             تست با PostgreSQL واقعی (محلی با TEST_DB_ADMIN_URL؛ README ۶)
    contract/                OpenAPI و تطبیق endpoint با کد دسترسی
    fixtures/                سازندهٔ داده‌های تست
```

## ۳. قالب یک ماژول

نمونه: `approvals` (F09).

```
modules/approvals/
  approvals.module.ts
  index.ts                               فقط ApprovalsService و نوع‌های عمومی
  api/
    approvals.controller.ts
    dto/
      decide-item.request.ts             DecideItemRequest
      review.response.ts                 ReviewResponse
      inbox.query.ts                     InboxQuery (پارامترهای فهرست)
    mappers/
      review.mapper.ts                   Entity/ردیف ← DTO
  application/
    approvals.service.ts                 API عمومی ماژول (نما)
    commands/
      decide-item.command.ts             یک فرمان = یک فایل
      approve-clean.command.ts
    queries/
      inbox.query-service.ts
    consumers/
      on-assignment-changed.consumer.ts  واکنش به رویداد (ماتریس ج)
  domain/
    field-report-item-status.machine.ts  ماشین حالت D08
    review.entity.ts
    rules/
      auto-approve.rule.ts               قاعدهٔ خالص با تست
      stage2-required.rule.ts
    events.ts                            payload رویدادهای این ماژول
    errors.ts                            خطاهای دامنه با کد
  infrastructure/
    review.repository.ts
    queries/
      inbox.sql.ts                       Kysely/SQL صندوق W20
  __tests__/                             یا کنار هر فایل: *.test.ts
```

**قاعدهٔ اندازه:** یک فرمان، یک فایل. سرویس عمومی (`approvals.service.ts`) نماست و فقط فرمان‌ها و پرس‌وجوها را صدا می‌زند؛ اگر بیش از ۳۰۰ خط شد، یعنی منطق در آن نشسته.

## ۴. نام‌گذاری

| چیز | قالب | مثال |
|---|---|---|
| پوشهٔ ماژول | kebab-case | `cost-ledger` |
| فایل | kebab-case + نقش | `decide-item.command.ts`، `cost-entry.entity.ts`، `plan-version.machine.ts`، `inbox.query-service.ts`، `on-period-closed.consumer.ts` |
| کلاس | PascalCase + نقش | `DecideItemCommand`، `CostLedgerService`، `InboxQueryService` |
| DTO ورودی | `<کار>Request` | `CreateCostEntryRequest` |
| DTO پارامتر فهرست | `<کار>Query` | `ListCostEntriesQuery` |
| DTO خروجی | `<موضوع>Response` | `CostEntryResponse` |
| Entity | اسم مفرد، بدون پسوند | `CostEntry` |
| جدول و ستون | snake_case مفرد | `cost_entry.posted_at` (استراتژی پیش‌فرض MikroORM) |
| View | پیشوند `v_`، مادی `mv_` | `v_project_cost_summary`، `mv_org_dashboard` |
| ایندکس و قید | `<جدول>_<ستون‌ها>_<نوع>` | `cost_entry_org_id_project_id_idx`، `field_report_item_status_check` |
| رویداد | PascalCase گذشته‌نما | `CostEntryPosted` (F20 ۳.۳) |
| صف pg-boss | `<حوزه>.<کار>` | `compute.project`، `notify.sms` |
| کد خطا | SCREAMING_SNAKE با پیشوند حوزه | `PLAN_DRAFT_INVALID`، `ITEM_ALREADY_DECIDED` |
| کد دسترسی | همان `access-control.md` ۵.۴ | `report.approve.stage1` |
| مسیر HTTP | `/v1/` + جمع kebab-case، تودرتو زیر پروژه | `/v1/projects/:projectId/cost-entries` |
| اقدام غیر CRUD | زیرمسیر فعل | `POST /v1/report-items/:id/decisions`، `POST /v1/plan-versions/:id/apply` |
| متغیر env | SCREAMING_SNAKE با پیشوند حوزه | `DB_URL`، `STORAGE_BUCKET`، `SMS_PROVIDER` |

**زبان:** نام‌ها انگلیسی؛ توضیح و پیام کاربر فارسی (`CLAUDE.md`). اصطلاح دامنه همان سند است: `WbsItem` نه `Task`، `CostEntry` نه `Expense`، `PlanVersion` نه `Baseline`.

## ۵. وارد کردن

- درون ماژول: مسیر نسبی (`../domain/review.entity.js`؛ ESM پسوند `.js` می‌خواهد).
- از platform و ماژول دیگر: alias — `@platform/…`، `@modules/<name>` (فقط `index.ts`)، `@shared/…` (بستهٔ مشترک). `paths` در `tsconfig` و بازنویسی در SWC. `[پیش‌فرض فنی]` — **در پیاده‌سازی مسیر نسبی** (README ۶)
- `index.ts` ماژول **هیچ** Entity، مخزن یا فرمانی صادر نمی‌کند؛ فقط سرویس عمومی، DTOهای عمومی و نوع رویدادهایش.
- واردکردن چرخه‌ای ممنوع است (`import/no-cycle`)؛ در ESM چرخه به خطای TDZ هنگام اجرا می‌رسد، نه فقط بدی طراحی.
