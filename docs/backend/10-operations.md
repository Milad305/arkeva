# ۱۰ — پیکربندی، استقرار و عملیات

> مبنا: D12 (یک کد، دو حالت استقرار)، F20 ۸ و ۱۲.

## ۱. دو حالت، یک image

| | ابری چندمستأجره | نصب اختصاصی |
|---|---|---|
| سازمان | چند | یک |
| پایگاه داده | PostgreSQL مدیریت‌شده | PostgreSQL روی سرور مشتری |
| فایل | S3 | MinIO یا دیسک محلی (`STORAGE_DRIVER=disk`؛ توسعه و تست هم دیسک؛ 1405/08/24) |
| پیامک، ایمیل، پوش | ارائه‌دهندهٔ ابری | ارائه‌دهندهٔ محلی مشتری |
| تفاوت در کد | **هیچ** — فقط env (AC-PL-13) | |

هیچ وابستگی اجباری به سرویس اینترنتی بیرونی نیست؛ نصب اختصاصی باید روی شبکهٔ بسته بالا بیاید.

## ۲. پیکربندی

همه از env، اعتبارسنجی‌شده هنگام راه‌اندازی (04 ۹). `backend/.env.example` کامل با توضیح فارسی هر متغیر.

**پروفایل** `[پیش‌فرض فنی؛ 1405/08/22]`: پروفایل = `NODE_ENV` فرایند (پیش‌فرض `development`). فایل‌ها از ریشهٔ پکیج بک‌اند، مستقل از پوشهٔ اجرا، به این ترتیب برنده‌اند: متغیر واقعی فرایند ← `.env.<profile>.local` ← `.env.<profile>` ← `.env`. در production هرگز فایل توسعه خوانده نمی‌شود. راه‌انداز فقط نام پروفایل و فایل‌ها را چاپ می‌کند، نه مقدار. `.env.<profile>.local` برای رازهای شخصی هر توسعه‌دهنده است و در مخزن نمی‌آید.

| گروه | متغیرها |
|---|---|
| اپ | `APP_ROLE` (`api`/`worker`/`all`/`migrate`)، `PORT`، `PUBLIC_BASE_URL`، `CORS_ORIGINS`، `TRUST_PROXY_HOPS`، `SWAGGER_ENABLED`، `APP_MIN_VERSION` (حداقل نسخهٔ اپ کارگاه؛ خالی ← بی بررسی؛ کمتر ← ۴۲۶ `APP_VERSION_UNSUPPORTED`، F08 ۵.۳) |
| پایگاه داده | `DB_URL` (نقش app)، `DB_MIGRATION_URL` (نقش owner)، `DB_READ_URLS`، `DB_POOL_MAX`، `DB_STATEMENT_TIMEOUT_MS` |
| صف | `JOBS_SCHEMA` (پیش‌فرض `pgboss`)، `JOBS_CONCURRENCY_*` |
| احراز هویت | `JWT_KEYS` (چند کلید با `kid`)، `JWT_ACCESS_TTL`، `REFRESH_IDLE_TTL`، `DEVICE_COOKIE_SECRET`، `ARGON2_*` |
| فایل | `STORAGE_DRIVER` (`s3`/`minio`)، `STORAGE_ENDPOINT`، `STORAGE_BUCKET`، `STORAGE_ACCESS_KEY`، `STORAGE_SECRET_KEY`، `STORAGE_PRESIGN_TTL` |
| پیام | `SMS_PROVIDER`، `SMS_*`، `EMAIL_PROVIDER`، `SMTP_*`، `PUSH_PROVIDER`، `PUSH_*` |
| مشاهده | `LOG_LEVEL`، `LOG_PRETTY`، `METRICS_ENABLED` |
| استقرار | `DEPLOYMENT_MODE` (`cloud`/`dedicated`)، `TZ_BUSINESS=Asia/Tehran` |

- هر ارائه‌دهنده (`SmsSender`، `EmailSender`، `PushSender`، `ObjectStorage`، `PdfRenderer`) رابط در `platform/` و پیاده‌سازی‌ها کنارش؛ انتخاب با env در ماژول Nest (`useFactory`). در توسعه: `SMS_PROVIDER=console` که کد را در لاگ می‌نویسد و ایمیل به Mailpit.
- فرایند همیشه با `TZ=UTC` اجرا می‌شود؛ مرز روز با `Asia/Tehran` در کد (C03)، نه با منطقهٔ زمانی سیستم.

## ۳. توسعهٔ محلی

```
docker compose -f docker/compose.dev.yml up -d     ← postgres:17، minio، mailpit
pnpm --filter backend run db:migrate
pnpm --filter backend run db:seed                  ← مثال مرجع + نگین
pnpm --filter backend run start:dev                ← APP_ROLE=all، SWC watch
```

فرمان‌ها پس از ساخت در `CLAUDE.md` ۹ ثبت می‌شوند.

## ۴. Docker

- چندمرحله‌ای: ساخت با pnpm و SWC ← image اجرا بر پایهٔ `node:24-slim` (نه alpine؛ `sharp` و `argon2` روی glibc بی‌دردسرترند) `[پیش‌فرض فنی]`.
- کاربر غیر root، فایل‌سیستم فقط‌خواندنی جز `/tmp`، بدون ابزار توسعه.
- `HEALTHCHECK` روی `/health`.
- یک image، نقش با `APP_ROLE`؛ در compose تولید سه سرویس: `migrate` (یک‌بار)، `api`، `worker`.
- خاموشی آرام: `SIGTERM` ← توقف پذیرش درخواست ← اتمام درخواست‌های جاری ← `boss.stop({ graceful: true })` ← بستن ORM (`enableShutdownHooks`).

## ۵. لاگ

- ساختاری با pino (`src/platform/http/logger.options.ts`)؛ زمان ISO-8601، بدون چاپ هدرهای حجیم HTTP/CSP؛ هر خط شامل `time`، `level`، `msg`، `traceId`، `orgId`، `projectId`، `userId`، `role` (`api`/`worker`/`all`)، و برای HTTP فیلدهای مسطح `method`، `route` (الگو)، `url` (بدون query)، `status`، `durationMs`، `ip`. در خطاهای ۴xx (`WARN`) و ۵xx (`ERROR`) فیلدهای `errorCode`، `errorMessage` و `errorDetails` نیز ثبت می‌شوند. با `LOG_PRETTY=true` خروجی تک‌خطی خوانا (`pino-pretty`) تولید می‌شود.
- **ماسک** (`redact` در pino): `req.headers.authorization`، `req.headers.cookie`، `res.headers["set-cookie"]`، `*.password`، `*.token`، `*.refreshToken`، `*.accessToken`، `*.otp`، `*.otpCode`، `*.otpToken`، `body/query/input/payload/data.code` (تا `err.code` پایگاه داده و شبکه پنهان نشود)، `*.secret`، `*.amount`.
- بدنهٔ درخواست و پاسخ لاگ نمی‌شود. مسیرهای `/health` و `/ready` در حالت سالم (`2xx`) بی‌صدا هستند و فقط هنگام خطا ثبت می‌شوند.
- لاگ کار صف: نام صف، `jobId`، تلاش (`attempt`)، مدت (`durationMs`)، نتیجه (`ok`/`retry`/`dead_letter`).

## ۶. سلامت و معیار

| مسیر | معنی |
|---|---|
| `GET /health` | فرایند زنده است |
| `GET /ready` | پایگاه داده، صف (pg-boss)، ذخیره‌سازی در دسترس‌اند؛ load balancer فقط به `ready` ترافیک می‌دهد |
| `GET /metrics` | Prometheus — فقط شبکهٔ داخلی |

معیارهای الزامی (F20 ۱۲): تأخیر HTTP بر اساس مسیر، تأخیر و عمق هر صف، تعداد رویداد و کار dead، مدت و آخرین اجرای هر تیک، مدت `compute.project`، خطای ارسال پیامک و ایمیل، اتصال‌های استخر پایگاه داده. هشدار عملیاتی روی dead، تیک دیرکرده و عمق صف محاسبه.

## ۷. پشتیبان و بازیابی

- **پشتیبان پروژه** (F20 ۱۲؛ تصمیم 1405/08/26؛ code-mapping ۳.۵.۵۸): `BackupTick` ساعت ۰۲:۰۰ تهران ← کار `backups.project` برای هر پروژهٔ «روزانه» (و «هفتگی» بامداد جمعه)؛ دامپ منطقی همهٔ ردیف‌های همان پروژه (تراکنش repeatable read زیر RLS، پس فقط یک `orgId`) + فهرست فایل‌ها (کلید، اندازه، هش) ← ZIP ← AES-256-GCM با کلید سازمان ← ذخیره‌سازی زیر `org/<org>/project/<project>/backup/`. ۳۰ نسخهٔ خودکار و ۱۰ دستی آخر می‌مانند (AC-PL-12). خود فایل‌ها (عکس، پیوست) در نسخه نیستند؛ ذخیره‌سازی شیء باید نسخه‌بندی یا پشتیبان جدای خودش را داشته باشد.
- **کلید:** `BACKUP_KEYS=kid:<base64 ۳۲ بایت>` در production الزامی است. کلید تازه را اول فهرست بگذارید و کلیدهای قبلی را تا پاک شدن آخرین نسخه‌شان (حدود ۳۰ روز) نگه دارید؛ گم شدن کلید یعنی از دست رفتن همهٔ نسخه‌های رمزشده با آن. کلید را جدا از پشتیبان‌ها نگه دارید.
- **بازیابی** فقط توسط پشتیبانی (F20 ۱۲): `pnpm --filter @projeyar/backend run backup:decrypt -- <نسخه.pyb> <خروجی.zip> <orgId>` با همان `BACKUP_KEYS`؛ خروجی `meta.json`، `data/<جدول>.jsonl` و `files.json` است و بازگرداندن ردیف‌ها دستی روی staging آزموده و سپس اجرا می‌شود. دادهٔ سطح سازمان (کاربران، نقش‌ها، قالب‌ها) در پشتیبان پروژه نیست.
- **خروجی کامل پروژه** (`export.full`): کار `backups.full-export` ZIP را در پوشهٔ موقت سیستم‌عامل می‌سازد و بعد بارگذاری می‌کند؛ فضای موقت کارگر باید دست‌کم به اندازهٔ بزرگ‌ترین پروژه (داده + عکس‌ها) آزاد باشد. فایل ۲۴ ساعت پس از ساخت منقضی و در `PurgeTick` پاک می‌شود.
- پشتیبان کامل پایگاه داده (سطح زیرساخت، `pg_dump`/پشتیبان مدیریت‌شده) جدا و مسئولیت عملیات است؛ نصب اختصاصی دستورالعمل جدا می‌گیرد.
- بازیابی کامل فقط توسط مدیر سیستم (F20 ۱۴ بند ۶)؛ هر سه ماه یک بار تمرین بازیابی روی محیط staging.

### ۷.۱ مرورگر برای PDF گزارش

کارگر (`APP_ROLE=worker` یا `all`) برای PDF گزارش مدیریتی (F18 ۷.۲) Chromium یا Chrome نصب‌شده می‌خواهد: `REPORT_BROWSER_PATH` یا جای‌های رایج سیستم‌عامل. در Docker بستهٔ `chromium` و قلم‌ها نصب شود؛ قلم Vazirmatn درون HTML جاسازی است. صفحه بی شبکه و بی جاوااسکریپت رندر می‌شود. نبود مرورگر ← خروجی گزارش `failed` می‌شود.

## ۸. انتشار

1. CI سبز (09 ۷).
2. `migrate` با نقش owner — migrationهای گسترش‌دهنده (05 ۶).
3. `worker` و `api` تازه بالا می‌آیند؛ قدیمی‌ها با خاموشی آرام پایین.
4. migrationهای انقباضی در انتشار **بعدی**.

اگر migration شکست بخورد، تراکنشی است و برمی‌گردد؛ نسخهٔ قدیم سرویس‌دهی را ادامه می‌دهد.

## ۹. کارهای برنامه‌ریزی‌شده

| کار | زمان |
|---|---|
| رفتن به Node 26 LTS | پس از پایدار شدن همهٔ وابستگی‌های بومی روی آن |
| TypeScript 7 | وقتی `@nestjs/swagger` رسماً پشتیبانی کند |
| پارتیشن‌بندی `domain_event`، `audit_log`، snapshotها | وقتی اندازه‌گیری لازم کرد |
| Replica خواندنی | وقتی داشبوردها روی پایگاه اصلی فشار آوردند |
