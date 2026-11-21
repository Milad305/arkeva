# قواعد بک‌اند — چک‌لیست

> **نسخه ۲ · 1405/08/21.** مرجع کامل: [`docs/backend/`](../backend/README.md). این فایل فقط چک‌لیست مرور سریع است؛ اگر جایی با `docs/backend/` نخواند، آن مجموعه درست است. نسخهٔ قبلی (TypeORM، شناسهٔ `bigint`) در `archive/backend-nestjs.v0.md` بایگانی شد و معتبر نیست.

پیش از کار در `backend/`: `CLAUDE.md` ← `docs/backend/README.md` ← فایل مرتبط با کارت.

## پشته
NestJS 12 (ESM) · Node 24 LTS · TypeScript 6.0 (نه 7) · MikroORM 7 (`defineEntity`) · PostgreSQL 17+ با RLS · pg-boss 12 · class-validator + OpenAPI · Vitest + Testcontainers · pnpm workspace با `packages/shared`. → [02](../backend/02-stack.md)

## پیش از نوشتن
- [ ] ماژول مالک موجودیت را از [01 ۴](../backend/01-architecture.md) پیدا کردم؛ اگر مالک نیستم، سرویس عمومی مالک را صدا می‌زنم.
- [ ] کد موجود را گشتم؛ موجودیت یا endpoint تکراری نمی‌سازم (`CLAUDE.md` ۳ بند ۳).
- [ ] تصمیم یا فرض تازه‌ای لازم نیست؛ اگر هست، پیش از کد پرسیدم.
- [ ] سیاههٔ ماک‌های همین ماژول را طبق [11](../backend/11-from-mocks.md) پر کردم (قرارداد، قاعده، فرمول، داربست، مغایرت) و تست‌های AC ماک را منتقل کردم.

## داده — [05](../backend/05-database.md)
- [ ] شناسه UUID v7؛ پول `p.bigint('string')`؛ درصد `numeric(7,4)` با `p.decimal('string')`؛ تاریخ کاری `date`؛ لحظه `timestamptz`.
- [ ] جدول مستأجر: `org_id`، ثبت در فیلتر `tenant` (با `rls: true`)، `ENABLE` و `FORCE ROW LEVEL SECURITY` در migration، کلید خارجی ترکیبی با `org_id` زیر پروژه.
- [ ] واقعیت (آیتم تأییدشده، هزینهٔ قطعی، Review، ممیزی) متد تغییر ندارد و تریگر پایگاه داده ویرایشش را رد می‌کند.
- [ ] migration دستی‌خوانده‌شده؛ اعمال‌شده هرگز ویرایش نمی‌شود.
- [ ] گزارش و داشبورد با Kysely/SQL/View، نه بارگذاری Entity.
- [ ] `allowGlobalContext: false` — هیچ کاری بیرون از RequestContext.

## هم‌روندی — [05 ۹](../backend/05-database.md)
- [ ] ویرایش فرمی: `version` + `If-Match` (۴۲۸ بدونش، ۴۰۹ ناهمخوان).
- [ ] انتقال حالت: `LockMode.PESSIMISTIC_WRITE` پیش از خواندن وضعیت، به ترتیب ثابت قفل.
- [ ] ناوردای پایگاه داده: ایندکس یکتای جزئی یا `CHECK`.
- [ ] ساخت از وب: `Idempotency-Key`.

## کد — [04](../backend/04-coding-rules.md)
- [ ] کنترلر نازک: فقط `@Permission` + DTO + فراخوان سرویس.
- [ ] فرمان با قالب هفت‌گامه: قفل ← نسخه ← scope ← ماشین حالت ← نوشتن ← رویداد و ممیزی ← DTO.
- [ ] مرز تراکنش فقط در فرمان؛ کار شبکه‌ای در تراکنش نه (صف).
- [ ] هیچ فرمول بیرون از `modules/computation`.
- [ ] بدون `any`، `!`، `console`، `process.env` بیرون از `config/`، `new Date()` در `domain`/`application`.
- [ ] فایل زیر ۳۰۰ خط (سقف ۶۰۰).

## API — [06](../backend/06-api-swagger.md)
- [ ] پاسخ در `{success, data}`؛ فهرست `data: {items, meta: {nextCursor, hasMore}}`.
- [ ] خطا `{code, message(fa), details?, traceId, retryable}` با کد از کاتالوگ.
- [ ] DTO ورودی با whitelist؛ `orgId`، `status`، `version` هرگز در بدنه.
- [ ] هر فیلد ریالی خروجی `@Amount()`.
- [ ] `@ApiTags` فارسی، `operationId` پایدار، `@ApiStandardResponses`؛ `openapi.json` تازه شد.

## امنیت — [07](../backend/07-security.md)
- [ ] دقیقاً یک `@Permission()` با کد `access-control.md` ۵.۴.
- [ ] `scope` در خود پرس‌وجو، نه فیلتر پس از خواندن.
- [ ] شیء سازمان دیگر = ۴۰۴.
- [ ] فایل: سقف اندازه، نوع از بایت‌ها، کلید بی‌نام کاربر، لینک امضاشدهٔ ۵ دقیقه‌ای.
- [ ] هیچ رمز، توکن، OTP یا مبلغ در لاگ و ممیزی.

## رویداد و گردش کار — [08](../backend/08-events-jobs-workflow.md)
- [ ] رویداد با `outbox.emit(tx, …)` در همان تراکنش؛ payload بی‌مبلغ با `v`.
- [ ] مصرف‌کننده idempotent با `eventId`؛ همان ردیف ماتریس ج.
- [ ] انتقال حالت فقط از ماشین حالت؛ نمودار تولیدی به‌روز.

## تست — [09](../backend/09-testing.md)
- [ ] هر AC یک تست با شناسهٔ AC در نام.
- [ ] تست دو سازمان برای endpoint تازه.
- [ ] تست هم‌روندی برای انتقال حالت تازه.
- [ ] typecheck، lint، test، test:integration، test:contract سبز.
