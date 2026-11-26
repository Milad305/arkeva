# قواعد لایهٔ بک‌اند (`backend/`) — Antigravity

پیش از ایجاد یا ویرایش هر فایلی در `backend/`:
1. **`docs/backend/README.md`** (به‌ویژه بخش ۳ «قواعد غیرقابل‌مذاکره» و بخش ۶ «جدایی‌های واقعی پیاده‌سازی») و فایل تخصصی مرتبط در `docs/backend/01..12-*.md` را بخوان.
2. چک‌لیست مرور سریع در **`docs/rules/backend-nestjs.md`** (نسخهٔ ۲) برقرار است.
3. مشخصات دامنه و معیارهای پذیرش را از **`design/features/<feature>.md`** و ماتریس مالکیت و رویدادها را از **`design/03-interaction-matrices.md`** چک کن.

## حیاتی‌ترین قواعد اجرایی این پوشه
- **مسیرهای Import (جدایی مهم از مستند اولیه):** همه‌جا در `backend/` از **مسیر نسبی با پسوند `.js`** استفاده کن (ESM + SWC + Vitest)؛ تنها پکیج با نام مستعار `@projeyar/shared` است (`@platform/*` یا `@modules/*` به کار نرود).
- **مرز ماژول‌ها (`eslint.config.js`):**
  - یک ماژول از ماژول دیگر فقط از `index.ts` آن import می‌کند؛ برای شکستن وابستگی دوطرفه از الگوی Port/Interface استفاده کن.
  - لایهٔ `api/` به `@mikro-orm/*` دست نمی‌زند (کنترلر نازک: فقط `@Permission` + `@Amounts` + DTO ورودی کلاسی با whitelist + فراخوان سرویس).
  - لایهٔ `platform/` هرگز به `modules/` وابسته نیست.
  - استفاده از `new Date()` در `domain/` و `application/` ممنوع است (از سرویس `Clock` استفاده کن) و `process.env` فقط در `src/config/` مجاز است.
- **چندمستأجری و پایگاه داده:**
  - شناسه UUID v7؛ مبالغ `bigint` ریال (در کد `string`)؛ درصد و وزن `numeric(7,4)` (`string`/`Decimal`)؛ تاریخ کاری `date` میلادی؛ لحظه `timestamptz`.
  - هر جدول مستأجر ستون `org_id`، ثبت در فیلتر `tenant` و سیاست PostgreSQL RLS (`ENABLE ROW LEVEL SECURITY` بدون `FORCE`، با `app_current_org()`) دارد. شیء سازمان دیگر = `404`.
  - هیچ Entityای بیرون از `RequestContext` کار نمی‌کند (`allowGlobalContext: false`)؛ کوئری‌های گزارش و داشبورد با Kysely/SQL نوشته می‌شوند نه بارگذاری Entity.
  - چون Entityها رابطهٔ `ManyToOne` ORM ندارند و کلید خارجی فقط در DB است، هنگام درج رکوردهای وابسته در یک تراکنش با `flush` صریح ترتیب درج را تضمین کن.
- **فرمان‌ها، هم‌روندی و رویدادها:**
  - قالب فرمان: قفل بدبینانه (`LockMode.PESSIMISTIC_WRITE`) / بررسی نسخه (`If-Match`) ← بررسی `scope` ← انتقال از ماشین حالت (`platform/workflow`) ← نوشتن ← انتشار رویداد (`outbox`) و ثبت ممیزی (`audit`) در همان تراکنش ← خروجی DTO.
  - هیچ محاسبهٔ پیشرفت، وزن یا EVM بیرون از `src/modules/computation` نوشته نشود (`D07`).
  - واقعیت‌ها (آیتم تأییدشده، `CostEntry` قطعی، `Review`، `AuditLog`، `DomainEvent`) تغییرناپذیرند.
- **دسترسی و مخفی‌سازی مبالغ (`D11`):**
  - هر مسیر دقیقاً یک `@Permission(...)` از کاتالوگ `@projeyar/shared` دارد (یا `authenticated` برای مسیرهای فایل ثبت‌شده در رجیستری).
  - مسیرهایی که مبلغ ریالی برمیگردانند باید `@Amounts(...کلیدها)` داشته باشند تا بدون `cbs.view_amounts` مقدار `null` شود.
- **تست و قرارداد API:**
  - هر معیار پذیرش سند یک تست خودکار دارد که عنوانش با شناسهٔ `AC-xx-nn` شروع می‌شود؛ مثال مرجع (`AC-PC-01`, `AC-EV-01`) هرگز نباید بشکند.
  - پس از تغییر هر کنترلر یا DTO، حتماً `pnpm --filter @projeyar/backend run openapi:emit` را اجرا کن تا `backend/openapi.json` با تست قرارداد هم‌گام بماند.
  - توجه: اسکریپت `start` فایل کامپایل‌شدهٔ `dist/main.js` را اجرا می‌کند؛ پس از تغییر کد برای سرور توسعه حتماً `build` بگیر (یا از `start:dev` استفاده کن). هرگز مقادیر رازهای `.env*` را نخوان و چاپ نکن.
