# ۰۲ — پشتهٔ فنی و وابستگی‌ها

> نسخه‌ها در 1405/08/21 از رجیستری npm گرفته و سازگاری‌شان از `peerDependencies` و `engines` خود بسته‌ها بررسی شد، نه از حافظه.
> **قاعده:** وابستگی تازه فقط با افزودن ردیف به این فایل (نام، نسخه، چرا، جایگزین ردشده). نسخه‌ها دقیق (`exact`) در `package.json`؛ به‌روزرسانی با PR جدا.

## ۱. زمان اجرا و زبان

| مورد | انتخاب | دلیل |
|---|---|---|
| Node.js | **24 LTS** (Krypton) | MikroORM 7 دست‌کم `22.17` و pg-boss 12 دست‌کم `22.12` می‌خواهند؛ ۲۴ تا فروردین ۱۴۰۷ (آوریل ۲۰۲۸) پشتیبانی دارد و همهٔ بسته‌های بومی (sharp، argon2، swc) رویش آزموده‌اند. رفتن به ۲۶ LTS کار برنامه‌ریزی‌شدهٔ جداست. `[پیش‌فرض فنی]` |
| ماژول | **ESM** (`"type": "module"`، `module: NodeNext`) | Nest 12، MikroORM 7 و pg-boss 12 فقط ESM منتشر می‌شوند |
| TypeScript | **6.0.x** — نه 7 | `@nestjs/swagger@12` فقط `typescript ^5.5 \|\| ^6.0` را می‌پذیرد. TS 7 (کامپایلر بومی Go) تا وقتی Nest رسماً پشتیبانی نکرده ممنوع است |
| دکوراتور | `experimentalDecorators` + `emitDecoratorMetadata` | DI و اعتبارسنجی Nest به متادیتای نوع وابسته‌اند. Entityها دکوراتور ندارند (`defineEntity`) |
| کامپایل | Nest CLI با سازندهٔ **SWC** | ده‌ها برابر سریع‌تر از `tsc`؛ بررسی نوع جدا با `tsc --noEmit` در CI |
| مدیر بسته | **pnpm** با workspace | همان فرانت (`CLAUDE.md` ۹) |
| پایگاه داده | **PostgreSQL 17** (حداقل)، ۱۸ پشتیبانی‌شده | RLS، `pg_trgm`، `uuid` بومی، `JSONB`، `MERGE`؛ ۱۷ در همهٔ توزیع‌های سرور در دسترس است |
| ذخیره‌سازی فایل | S3 یا **MinIO** | D12 |

## ۲. وابستگی‌های اجرا

### ۲.۱ هسته

| بسته | نسخه | کار |
|---|---|---|
| `@nestjs/core`، `@nestjs/common`، `@nestjs/platform-express` | 12.5.0 | چارچوب؛ Express 5 زیر آن |
| `@nestjs/config` | 12.1.1 | پیکربندی از env |
| `@nestjs/swagger` | 12.1.1 | OpenAPI |
| `@nestjs/terminus` | 12.1.0 | `/health`، `/ready` |
| `@nestjs/throttler` | 6.7.1 | محدودیت نرخ |
| `@nestjs/jwt` | 12.0.4 | امضا و بررسی توکن |
| `reflect-metadata` | 0.2.2 | متادیتای DI |
| `rxjs` | 7.8.2 | همتای Nest |
| `nestjs-cls` | 7.0.2 | زمینهٔ درخواست (`traceId`، `orgId`، `userId`، `projectId`، دسترسی‌ها) با AsyncLocalStorage |

### ۲.۲ داده

| بسته | نسخه | کار |
|---|---|---|
| `@mikro-orm/core`، `@mikro-orm/postgresql` | 7.2.9 | ORM؛ `defineEntity`، فیلتر + RLS، Kysely داخلی |
| `@mikro-orm/nestjs` | 7.1.0 | ماژول Nest و RequestContext خودکار |
| `@mikro-orm/migrations` | 7.2.9 | migration |
| `@mikro-orm/decorators` | 7.2.9 | فقط `CreateRequestContext` (نسخهٔ `legacy`) در جاهای استثنایی؛ Entityها دکوراتور ندارند |
| `@mikro-orm/seeder` | 7.2.9 | دادهٔ نمونه و تست |
| `pg-boss` | 12.38.2 | صف کار، زمان‌بند، dead letter |
| `decimal.js` | 10.6.0 | محاسبهٔ دقیق درصد، وزن و نسبت (C04)؛ پول با `bigint` بومی |
| `uuid` | 14.0.3 | UUID v7 برای شناسه‌های ساخت سرور |
| `jalaali-js` | 2.0.1 | سال شمسی کدهای C05 و تاریخ در خروجی‌های فایل |

### ۲.۳ اعتبارسنجی و سریال‌سازی

| بسته | نسخه | کار |
|---|---|---|
| `class-validator` | 0.15.1 | اعتبارسنجی DTO با پیام فارسی |
| `class-transformer` | 0.5.1 | تبدیل ورودی و `@Amount`/`@Exclude` در خروجی |

### ۲.۴ امنیت

| بسته | نسخه | کار |
|---|---|---|
| `@node-rs/argon2` | 2.2.2 | هش رمز با Argon2id؛ باینری آماده، بی‌نیاز از node-gyp روی ویندوز |
| `helmet` | 8.3.0 | سرآیندهای امنیتی |
| `cookie-parser` | 1.4.7 | کوکی توکن تازه‌سازی و «به خاطر سپردن دستگاه» |
| `file-type` | 22.3.0 | تشخیص نوع واقعی فایل از بایت‌ها، نه پسوند |

### ۲.۵ فایل و قالب‌ها

| بسته | نسخه | کار | ماژول |
|---|---|---|---|
| `@aws-sdk/client-s3`، `@aws-sdk/s3-request-presigner` | 3.1167.0 | `ObjectStorage` برای S3 و MinIO؛ لینک امضاشدهٔ ۵ دقیقه‌ای | platform/storage |
| `sharp` | 0.35.5 | بندانگشتی ۳۲۰ و ۱۲۸۰، حذف متادیتای اضافی | field |
| `exifr` | 7.1.3 | خواندن EXIF و مهر مکان عکس | field |
| `exceljs` | 4.4.0 | ورود و خروج Excel (W39، دفتر هزینه، خروجی‌ها) | wbs، cost-ledger، reporting |
| `fast-xml-parser` | 5.12.0 | خواندن و نوشتن MSPDI (F15) | msp |

### ۲.۶ مشاهده‌پذیری

| بسته | نسخه | کار |
|---|---|---|
| `nestjs-pino`، `pino`، `pino-http` | 5.3.1، 10.4.0، 11.0.0 | لاگ JSON با `traceId`، `orgId`، `projectId`، `userId` و ماسک داده‌های حساس |
| `prom-client`، `@willsoto/nestjs-prometheus` | 15.1.3، 7.0.0 | معیارهای Prometheus (F20 ۱۲) |

## ۳. وابستگی‌های توسعه

| بسته | نسخه | کار |
|---|---|---|
| `typescript` | **6.0.3** | بند ۱ |
| `@nestjs/cli`، `@nestjs/testing` | 12.0.12، 12.5.0 | ساخت و تست |
| `@swc/core` | 1.16.22 | سازندهٔ SWC |
| `@mikro-orm/cli` | 7.2.9 | ابزار migration |
| `vitest` | 5.1.0 | اجراکنندهٔ تست — همان فرانت |
| `unplugin-swc` | 2.0.0 | متادیتای دکوراتور در Vitest |
| `supertest` | 7.3.2 | تست HTTP |
| `testcontainers`، `@testcontainers/postgresql` | 12.2.1 | PostgreSQL واقعی در تست یکپارچگی |
| `eslint`، `typescript-eslint` | 10.14.0، 8.72.2 | lint |
| `eslint-plugin-boundaries` | 7.4.3 | مرز لایه‌ها و ماژول‌ها (01 ۳) — **نصب نشد**؛ `no-restricted-imports` جایش (README ۶) |
| `pino-pretty` | 13.2.0 | لاگ خوانا فقط در توسعه |
| `openapi-typescript` | 7.13.0 | تولید تایپ فرانت از OpenAPI (در workspace فرانت) |
| `prettier` | همان نسخهٔ فرانت | قالب‌بندی یکسان |

## ۴. بستهٔ مشترک `packages/shared`

بدون وابستگی اجرایی؛ TypeScript خالص که هم فرانت و هم بک‌اند وارد می‌کنند:

| محتوا | مثال | چرا مشترک |
|---|---|---|
| کدهای دسترسی | `PERMISSIONS`، نوع `PermissionCode` | فرانت منو و دکمه را با همان کد پنهان می‌کند؛ تست «هر endpoint یک کد» از همین فهرست می‌خواند |
| enumهای دامنه | وضعیت آیتم گزارش، وضعیت پروژه، نوع هزینه | یک منبع برای `CHECK` پایگاه داده، DTO و UI |
| کدهای خطا | `ErrorCode.WBS_WEIGHT_SUM_INVALID` | فرانت روی کد تصمیم می‌گیرد، نه روی متن |
| نام رویدادها | `DomainEventType` | فهرست سفید «فعالیت‌های اخیر» (F20 ۱۰) |
| کدهای قواعد هشدار و اعلان | `AL-…`، `NT-…` | `04-alert-engine.md` |

**قاعده:** هیچ منطقی در `packages/shared` نیست؛ فقط ثابت و نوع. Flutter این‌ها را از OpenAPI می‌گیرد (06 ۹).

## ۵. گزینه‌های ردشده

| گزینه | چرا نه |
|---|---|
| TypeORM | محدودیت `orgId` باید دست‌ساز می‌شد و QueryBuilder و SQL خام دورش می‌زدند (تصمیم کاربر) |
| Prisma، Drizzle | همان دلیل؛ به‌علاوهٔ Unit of Work نداشتن برای نوشتن رویداد و ممیزی در یک commit |
| Redis + BullMQ | سرویس اضافه در هر نصب، ثبت کار غیرتراکنشی، سریالی به ازای پروژه در نسخهٔ رایگان دست‌ساز (تصمیم کاربر) |
| `@nestjs/schedule` | در چند نمونه دو بار اجرا می‌شود؛ `pg-boss.schedule` تک‌اجرایی است (F20 ۵) |
| `@nestjs/event-emitter`، `@nestjs/cqrs` | رویداد درون‌حافظه با شکست فرایند گم می‌شود؛ رویداد دامنه فقط outbox (D07) |
| Passport | برای یک راهبرد JWT لایهٔ اضافه است؛ گارد ساده با `@nestjs/jwt` خواناتر است `[پیش‌فرض فنی]` |
| `bcrypt` | Argon2id استاندارد امروز OWASP است و نسخهٔ `@node-rs` بی‌کامپایل نصب می‌شود |
| Jest | فرانت Vitest دارد؛ یک اجراکننده در کل مخزن |
| Fastify | سریع‌تر است ولی گلوگاه این سیستم پایگاه داده است؛ Express با اکوسیستم بزرگ‌تر کم‌ریسک‌تر است `[پیش‌فرض فنی]` |
| ltree به‌عنوان پیش‌فرض | درخت WBS چند صد تا چند هزار گره است و CTE بازگشتی با ایندکس `(project_id, parent_id)` کافی است؛ ltree فقط با اندازه‌گیری (05 ۷) |
| Gotenberg/Chromium برای PDF | فقط با F18 (مرحلهٔ ۸) پشت رابط `PdfRenderer` اضافه می‌شود؛ الان وابستگی نیست |
