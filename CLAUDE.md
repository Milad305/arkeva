# CLAUDE.md — راهنمای کار روی پروژه‌یار

> این فایل را در ریشهٔ مخزن (`G:\projects\Ashan`) بگذار. پوشهٔ `design/` کنار آن است.
> **زبان گفت‌وگو با کاربر: فارسی.** نام‌های کد، مسیرها و پیام‌های commit انگلیسی.

## ۱. پروژه‌یار چیست
پلتفرم مکمل MS Project برای پیمانکاران پروژه‌های عمرانی: ساختار WBS و CBS، گزارش روزانهٔ آفلاین سرپرست کارگاه در اپ، تأیید یک یا دومرحله‌ای، محاسبهٔ پیشرفت و ارزش کسب‌شده، هشدار و گزارش مدیریتی.
- بک‌اند NestJS، پنل وب React، اپ Flutter (اندروید، `mobile/`).
- زمان‌بندی را MSP می‌سازد؛ پروژه‌یار زمان‌بندی **محاسبه نمی‌کند** (D05).

## ۲. ترتیب خواندن
1. `design/HANDOFF.md` (وضعیت و کارهای باقی‌مانده)
2. `design/00-overview.md` (مفاهیم دامنه و **مثال مرجع**)
3. `design/01-foundation-decisions.md` (D01–D12، C01–C05)
4. `design/02-domain-model.md` (موجودیت‌ها)
5. `design/03-interaction-matrices.md` (مالکیت داده، وابستگی‌ها، رویدادها)
6. `design/05-roadmap.md` (ترتیب ساخت)
7. فایل ویژگی‌ای که رویش کار می‌کنی + «ارتباط» ویژگی‌های همسایه
8. **کار بک‌اند:** `docs/backend/README.md`، ترتیب برش‌ها در `docs/backend/12-implementation-plan.md`، و فایل مرتبط همان پوشه (معماری، پشته، ساختار، قواعد کد، پایگاه داده، API، امنیت، رویداد و گردش کار، تست، عملیات). `design/` بر آن غالب است.

## ۳. قواعد غیرقابل‌مذاکره
1. **هیچ تصمیم دامنه‌ای را بی‌صدا نگیر.** اگر سند پاسخ ندارد یا دو بخش تعارض دارند: کار آن بخش را نگه دار، پرسش را در بخش «تصمیم‌ها» همان فایل بنویس و از کاربر بپرس.
2. در نسخهٔ 1405/08/11 همهٔ تصمیم‌ها و فرض‌های سند تأیید شده‌اند. اگر حین ساخت تصمیم یا فرض تازه‌ای لازم شد، با برچسب `[پیشنهاد: OD-xx]` یا `[فرض]` در فایل همان ویژگی بنویس و پیش از ساخت آن بخش از کاربر تأیید بگیر. `[پیش‌فرض فنی]` را می‌توانی تغییر دهی ولی در PR ذکر کن.
3. **بخشی از پروژه از قبل پیاده شده.** پیش از ساختن هر موجودیت یا endpoint، کد موجود را بگرد و نگاشت کن؛ موجودیت تکراری نساز. اختلاف را در `design/code-mapping.md` ثبت کن و بی‌صدا هیچ‌کدام (کد یا سند) را عوض نکن.
4. **هر موجودیت یک نویسنده دارد** (`03` بخش ۲). ویژگی دیگر فقط سرویس مالک را صدا می‌زند.
5. **هیچ محاسبهٔ کسب‌وکاری** در کنترلر، React یا Flutter نیست. فقط در ماژول محاسبات بک‌اند (D07). اپ فقط پیش‌نمایش لحظه‌ای نشان می‌دهد و سرور داور است.
6. **خط اجرا:** رویداد ← محاسبه ← هشدار ← اعلان. رویداد در همان تراکنش تغییر اصلی (outbox).
7. **جدول‌های «جاری»** (`WbsItem`، `CbsItem`، `WbsCbsLink`) فقط با اعمال نسخهٔ برنامه تغییر می‌کنند (D05). تنها استثنا تخصیص سرپرست.
8. **واقعیت‌ها تغییرناپذیرند:** آیتم تأییدشده، ردیف هزینهٔ قطعی. اصلاح = رکورد جدید.
9. **هر endpoint یک کد دسترسی دارد** (`features/access-control.md` ۵.۴) و دامنهٔ داده و حذف مبلغ را اعمال می‌کند (D11).
10. `orgId` در همهٔ پرس‌وجوها از لایهٔ مخزن (D12).
11. **مثال مرجع** باید دقیقاً بازتولید شود: BAC=1000، PV=550، EV=490، AC=520، پیشرفت فیزیکی واقعی 49.2 و برنامه‌ای 55، CPI=0.9423، SPI=0.8909، EAC=1,061.2245. این‌ها تست واحد ماژول محاسبات‌اند.

## ۴. قراردادهای فنی
| موضوع | قرارداد |
|---|---|
| شناسه | UUID (C01)؛ کد WBS و CBS فقط نمایشی |
| پول | `bigint` ریال؛ گرد کردن نیمه به بالا فقط در لحظهٔ ساخت مبلغ نهایی (C02) |
| تاریخ | `date` میلادی برای تاریخ کاری، `timestamptz` UTC برای لحظه؛ روز با `Asia/Tehran`؛ نمایش پیش‌فرض شمسی، فقط ترجیح خود کاربر در W32 میلادی می‌کند (C03، اصلاح 1405/08/19) |
| درصد/وزن | `numeric(7,4)`؛ محاسبه با دقت کامل؛ گرد کردن فقط در نمایش (C04) |
| کد خوانا | `PRJ-<سال>-<NNN>`، `FR-<سال>-<NNNN>`، `RSK-<NNN>` (C05) |
| خطا | `{code, message(fa), details?, traceId, retryable}` |
| API | `/v1`، cursor pagination، `Idempotency-Key` |

## ۵. رابط کاربری
- فارسی و راست‌به‌چپ، ارقام فارسی (پیش‌فرض؛ ترجیح کاربر در W32 می‌تواند لاتین کند — ارقام فقط از `toFaDigits`/`faNum`)، کدها لاتین با فونت مونواسپیس، فونت Vazirmatn و JetBrains Mono، بدون ایموجی.
- نمودارهای زمانی چپ‌به‌راست؛ گانت و heatmap راست‌به‌چپ.
- طراحی: `design/ui/` (توکن‌ها و HTML صفحه‌های بوم). رنگ اقدام فقط `primary-700`؛ دکمهٔ تأیید `success-700`.
- پیام‌های خطا بدون سرزنش و با یک راه ادامه.
- صفحه‌ها و فرم‌ها طبق کد W/M بوم؛ هر صفحه ← مسیر React یا صفحهٔ Flutter در `design/code-mapping.md`.

## ۶. روش کار برای هر ویژگی
1. فایل ویژگی و بخش «ارتباط» همسایه‌ها را بخوان. تصمیم‌ها و فرض‌ها را بررسی کن.
2. اگر چیزی باز است، قبل از کد از کاربر بپرس (دسته‌ای).
3. ترتیب ساخت: مدل داده و migration ← سرویس و قواعد ← رویدادها ← API و دسترسی ← تست‌های AC ← رابط وب/اپ.
4. **هر معیار پذیرش (AC-xx-nn) یک تست خودکار** با همان شناسه در نام تست.
5. تست‌ها: واحد (محاسبات با مثال مرجع)، یکپارچگی API (دسترسی و `orgId`)، رفتار رویداد (ماتریس ج)، و برای اپ آزمایش آفلاین.
6. در پایان: خلاصهٔ کار، تغییرات نسبت به سند (اگر هست)، تصمیم‌های باز تازه.

## ۷. وقتی سند و واقعیت نمی‌خوانند
- سند را اصلاح نکن مگر کاربر بگوید. مغایرت را با این قالب بنویس و بپرس:
  `ویژگی / بخش سند / چه نوشته / در کد چه هست / گزینه‌ها / پیشنهاد`
- اگر کاربر تصمیم گرفت، در همان فایل ویژگی و در `01`/`02`/`03` اگر لازم است هم‌گام کن تا دو سند تناقض نداشته باشند.

## ۸. حدود کار (ممنوع در نسخهٔ اول)
- محاسبهٔ زمان‌بندی (CPM، مسیر بحرانی، جابه‌جایی خودکار) — D05.
- صورت‌وضعیت به کارفرما، متره، تعدیل — D01.
- ارز خارجی — OD-14.
- تفکیک تخصص نیروی کار و برنامهٔ نیرو — OD-05.
- نوشتن در فایل MPP (فقط XML) — F15.
- اتصال واقعی ERP و حسابداری — F19.
- ورود مستقیم هزینه در جدول از غیر API دفتر هزینه — D02.

## ۹. فرمان‌ها

> تکمیل‌شده پس از مرحلهٔ صفر (`design/code-mapping.md`). مدیر بسته **pnpm** است؛ سه lockfile همزمان وجود داشت و فقط `pnpm-lock.yaml` ماند.

### فرانت‌اند (`frontend/`)
```bash
pnpm --dir frontend install
pnpm --dir frontend run dev          # http://localhost:5173
pnpm --dir frontend run build        # tsc -b && vite build
pnpm --dir frontend run typecheck
pnpm --dir frontend run lint
pnpm --dir frontend run format
pnpm --dir frontend run test         # Vitest — ابزارها و هوک‌ها
pnpm --dir frontend run test:watch
```

فرانت ماک ندارد و همهٔ endpointها به سرور می‌روند (برش ۲۰، 1405/08/27). تست‌های AC در بک‌اند‌اند و نام هر تست با شناسهٔ
معیار پذیرش شروع می‌شود (بخش ۶ بند ۴). مثال مرجع (AC-PC-01، AC-EV-01) در `backend/src/modules/computation/domain/formulas/`
(`engine.test.ts`، `evm.test.ts`) و سرتاسری در `backend/test/integration/computation.int.test.ts`.

### بک‌اند (`backend/`)
پیکربندی بر اساس پروفایل: `NODE_ENV` (پیش‌فرض development) ← `.env.<profile>.local` ← `.env.<profile>` ← `.env`؛
متغیر واقعی فرایند بر همه برنده است. الگو: `backend/.env.example`. جزئیات `docs/backend/10-operations.md` ۲.
```bash
pnpm --filter @projeyar/backend run build            # shared + SWC
pnpm --filter @projeyar/backend run db:bootstrap     # یک‌بار: نقش‌ها و پایگاه داده با DB_ADMIN_URL
pnpm --filter @projeyar/backend run db:migrate       # با نقش مالک (DB_MIGRATION_URL)
pnpm --filter @projeyar/backend run db:seed          # فقط توسعه: دادهٔ نمونه با شناسه‌های ماک
pnpm --filter @projeyar/backend run start            # http://localhost:3000 — Swagger: /v1/docs
pnpm --filter @projeyar/backend run start:dev        # watch
pnpm --filter @projeyar/backend run typecheck
pnpm --filter @projeyar/backend run lint
pnpm --filter @projeyar/backend run test             # واحد
pnpm --filter @projeyar/backend run test:integration # PostgreSQL محلی (TEST_DB_ADMIN_URL)؛ شامل تست قرارداد
pnpm --filter @projeyar/backend run openapi:emit     # backend/openapi.json (تست قرارداد آن را با کد می‌سنجد)
pnpm --filter @projeyar/backend run backup:decrypt -- <نسخه.pyb> <خروجی.zip> <orgId>   # فقط پشتیبانی
```

### استقرار (`deploy/`)
سرور دمو روی IP با image‌های ساخته‌شده در GitHub Actions (`.github/workflows/build-images.yml`)؛ راهنمای کامل `deploy/README.md`.
```bash
bash /opt/arkeva/repo/deploy/deploy.sh [sha]   # روی سرور: pull، migrate، backend، فایل‌های پنل و لندینگ
```

### اپ (`mobile/`)
قواعد: `docs/rules/flutter-clean-bloc.md` (Clean Architecture + BLoC). وضعیت و برش‌های مانده: `mobile/HANDOFF.md`.
```bash
cd mobile
flutter pub get
dart run build_runner build --delete-conflicting-outputs   # freezed، json، drift، injectable
flutter analyze
flutter test
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000   # بک‌اند محلی از شبیه‌ساز
```

## ۱۰. ساختار پوشه‌ها (واقعی)
```
Ashan/
  CLAUDE.md
  design/                 این مجموعه سند
    ui/                   توکن‌ها و HTML صفحه‌های بوم
    code-mapping.md       جدول تطبیق (مرحلهٔ صفر) — ساخته شد
  designs/                بوم قدیمی (۱۵ HTML) — مرجع تاریخی، استفاده نشود
  frontend/               React + Vite + RTK Query   ← نام واقعی، نه web/
    src/
      app/                store، baseApi، router
      config/             env، endpoints، routes، constants، permissions
      shared/
        styles/           tokens.css و kit.css (export بوم) + base و app
        components/ui/    کتابخانهٔ کامپوننت — کلاس‌های kit.css
        components/layout/ AppShell، Workspace، SettingsLayout، Sidebar، Topbar
        hooks/ utils/ types/
      modules/<feature>/  api · components · hooks · pages · services · types
    src.old/              کد پیش از ریفکتور — آرشیو مرجع، خارج از build
  backend/                NestJS 12 + MikroORM 7 (ESM، SWC) — برش اول 1405/08/21–22
    src/
      main.ts             راه‌انداز بر اساس APP_ROLE (api · all · migrate)
      app.module.ts       ریشهٔ ترکیب ماژول‌ها
      bootstrap/          createApp و configureApp (لایهٔ HTTP)، migrate
      config/             تنها جای خواندن env؛ پروفایل NODE_ENV
      database/           migrationها، registry.ts (Entityها و migrationهای همهٔ ماژول‌ها)، system-ids
      platform/           زیرساخت F20: context، http، database (tenant + RLS، tx-sql)، security، messaging، clock، time (شمسی)، health،
                          jobs (pg-boss)، outbox (رویداد و مصرف‌کننده)، scheduler (تیک‌ها)، audit، workflow (ماشین حالت)، storage (فایل: دیسک یا S3)
      modules/<feature>/  api · application · domain · infrastructure · index.ts — الان identity، team، projects،
                          computation (فقط فرمول‌های خالص ساخت پروژه تا مرحلهٔ ۳)
      scripts/            db-bootstrap، seed
    test/
      integration/        *.int.test.ts روی PostgreSQL محلی؛ support/ (پایگاه دادهٔ موقت، اپ، ورود)
      fixtures/           سازندهٔ دادهٔ تست (سازمان، کاربر، پروژه)
  packages/
    shared/               @projeyar/shared: کاتالوگ دسترسی، نقش‌ها، enumها، کدهای خطا، شناسه‌های ثابت demo
  pnpm-workspace.yaml     frontend · backend · packages/*
  docs/
    backend/              مرجع ساخت بک‌اند (۱۱ فایل + README) — 1405/08/21؛ جدایی پیاده‌سازی در README ۶
    rules/                چک‌لیست‌ها؛ backend-nestjs.md نسخهٔ ۲، نسخهٔ قدیم در archive/
```

**اپ Flutter:** `mobile/` (بستهٔ `projeyar_field`، اندروید، minSdk 26) — `lib/app` (DI، مسیریاب)، `lib/core` (شبکه، خطا،
پایگاه دادهٔ SQLCipher، امنیت، تاریخ، تم)، `lib/features/<feature>/{domain,data,presentation}`. ساخته‌شده از 1405/08/29.
بک‌اند طبق `docs/backend/03-project-structure.md` ساخته شد، با جدایی‌هایی که در `docs/backend/README.md` ۶ آمده
(مهم‌ترین: import نسبی به‌جای alias). وضعیت و تست‌ها در `design/code-mapping.md` ۳.۵.۳۰.
