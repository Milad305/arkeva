# ۰۶ — API و Swagger

> مبنا: F20 ۱۱ (قرارداد API و W46)؛ `CLAUDE.md` ۴؛ قرارداد موجود فرانت در `frontend/src/shared/types/api.ts` و `frontend/src/app/api/mockBaseQuery.ts`.

## ۱. اصول

- **REST با منبع‌های تودرتو زیر پروژه**؛ اقدام‌های غیر CRUD زیرمسیر فعل (03 ۴).
- **قرارداد همان است که فرانت الان انتظار دارد** تا سوئیچ `hybridQuery` از ماک به سرور هیچ صفحه‌ای را نشکند.
- **OpenAPI منبع حقیقت قرارداد** برای فرانت (تایپ تولیدی) و Flutter (کد Dart تولیدی).

## ۲. مسیر و نسخه

- پیشوند `/v1` با versioning مسیر Nest (`version: '1'` در کنترلر). تغییر ناسازگار = `/v2` کنار `/v1`، نه تغییر درجا.
- مسیرهای اپ کارگاه زیر `/v1/field/…` (F08) با همان قواعد.
- `/health`، `/ready`، `/metrics` بیرون از `/v1` و بدون احراز هویت (`/metrics` فقط از شبکهٔ داخلی).

## ۳. قالب پاسخ

**موفق** — فرانت `ApiResponse<T>` را باز می‌کند (`unwrap` در `mockBaseQuery.ts`)، پس بک‌اند همیشه می‌پیچد:

```json
{ "success": true, "data": { "id": "0193…", "code": "PRJ-1404-021" } }
```

**فهرست** — صفحه‌بندی **درون** `data` است، چون `unwrap` فقط `data` را برمی‌دارد و `meta` بیرونی گم می‌شود:

```json
{
  "success": true,
  "data": {
    "items": [ … ],
    "meta": { "nextCursor": "eyJ0IjoiMjAyNi0xMS0xMlQwODo…", "hasMore": true }
  }
}
```

همان `PaginatedResponse<T>` فرانت. `total` فقط جایی که شمارش ارزان است و صفحه لازمش دارد.

**پیچیدن خودکار** با `ResponseEnvelopeInterceptor` سراسری؛ کنترلر خود DTO را برمی‌گرداند. فایل (`StreamableFile`) و `204` پیچیده نمی‌شوند.

## ۴. ورودی و اعتبارسنجی

`ValidationPipe` سراسری:

```ts
new ValidationPipe({
  whitelist: true,                 // فیلد بی‌دکوراتور حذف می‌شود
  forbidNonWhitelisted: true,      // و اگر آمد، ۴۰۰ — جلوی mass assignment
  transform: true,
  transformOptions: { enableImplicitConversion: false },   // تبدیل فقط صریح
  stopAtFirstError: false,
  exceptionFactory: toValidationError,                       // قالب خطای ۶ با details.fields
});
```

```ts
// modules/cost-ledger/api/dto/create-cost-entry.request.ts
export class CreateCostEntryRequest {
  @ApiProperty({ description: 'قلم CBS (برگ)', format: 'uuid' })
  @IsUUID('7')
  readonly cbsItemId!: string;

  @ApiProperty({ description: 'مبلغ به ریال صحیح، به‌صورت رشته (C02)', example: '1250000000', pattern: '^[1-9][0-9]{0,17}$' })
  @IsNumberString({ no_symbols: true }, { message: 'مبلغ را به ریال و بدون جداکننده بنویسید.' })
  @MaxLength(18)
  readonly amount!: string;

  @ApiProperty({ description: 'تاریخ هزینه، میلادی (C03)', example: '2026-11-12', format: 'date' })
  @IsISO8601({ strict: true }, { message: 'تاریخ را از تقویم انتخاب کنید.' })
  readonly costDate!: string;

  @ApiPropertyOptional({ description: 'شرح', maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500)
  readonly description?: string;
}
```

قواعد DTO:
- هر فیلد `@ApiProperty` با توضیح فارسی، مثال، و `format`/`pattern` هرجا معنا دارد. Swagger از همین ساخته می‌شود؛ پلاگین CLI Swagger استفاده نمی‌شود (صریح بهتر از جادو؛ 02 ۱).
- پیام اعتبارسنجی فارسی، بی‌سرزنش و با راه ادامه.
- **`orgId`، `createdBy`، `status`، `version` هرگز در DTO ورودی نیست**؛ از زمینه، ماشین حالت یا `If-Match` می‌آیند.
- DTO ساخت و ویرایش جدا؛ ویرایش جزئی با `PartialType` فقط برای فیلدهای واقعاً قابل‌ویرایش.
- اعتبارسنجی شکل در DTO؛ قاعدهٔ کسب‌وکاری در `domain` (04 ۷).
- عدد ارقام فارسی را نمی‌پذیرد؛ فرانت تبدیل می‌کند (`toEnDigits`). خطای «ارقام فارسی» پیام راهنما دارد.

## ۵. خروجی

- هیچ Entity به بیرون نمی‌رود؛ **mapper** صریح Entity یا ردیف ← `…Response`.
- مبلغ: رشته؛ درصد و نسبت: عدد؛ تاریخ: `YYYY-MM-DD`؛ لحظه: ISO UTC (F20 ۱۱.۱).
- هر DTO دارای عدد مشتق `computedAt` دارد (D07).
- فیلد ریالی `@Amount()` دارد و بدون `cbs.view_amounts` از JSON حذف می‌شود (07 ۵).
- `null` صریح برای «مقدار ندارد»، کلید غایب برای «مجاز به دیدن نیست» (همان حذف `@Amount`).

## ۶. خطا

```json
{
  "code": "ITEM_ALREADY_DECIDED",
  "message": "این آیتم همین الان توسط مریم رضایی تأیید شد. صفحه را تازه کنید تا وضعیت جدید را ببینید.",
  "details": { "decidedBy": "مریم رضایی", "status": "approved" },
  "traceId": "ERR-7F3A-21",
  "retryable": false
}
```

| وضعیت | کی | `code` نمونه |
|---|---|---|
| ۴۰۰ | شکل ورودی | `VALIDATION_FAILED` با `details.fields: [{field, message}]` (`FieldError` فرانت) |
| ۴۰۱ | نیاز به ورود | `AUTH_REQUIRED`، `SESSION_EXPIRED` |
| ۴۰۳ | بی‌دسترسی | `PERMISSION_DENIED` با `details.requiredPermission` و `details.requiredRoles` (W46: «نقش فعلی و نقش لازم») |
| ۴۰۴ | نیست یا مال سازمان دیگر است | `PROJECT_NOT_FOUND` — یکسان، تا وجود داده نشت نکند |
| ۴۰۹ | تعارض نسخه یا حالت | `VERSION_CONFLICT`، `ITEM_ALREADY_DECIDED`، `LOCK_TIMEOUT` (`retryable: true`) |
| ۴۱۲ / ۴۲۸ | `If-Match` نادرست / غایب | `PRECONDITION_REQUIRED` |
| ۴۲۲ | قاعدهٔ دامنه | `PLAN_DRAFT_INVALID` با فهرست ایرادها |
| ۴۲۹ | نرخ | `RATE_LIMITED` با `Retry-After` |
| ۵۰۰ | خطای ما | `INTERNAL` — پیام ثابت W46: «مشکل از سمت ماست و داده‌های شما سالم است.» |
| ۵۰۳ | نگهداری یا وابستگی پایین | `MAINTENANCE`، `DEPENDENCY_UNAVAILABLE` (`retryable: true`) |

- `traceId` کوتاه (`ERR-xxxx-nn`) در پاسخ و لاگ یکی است (AC-PL-10).
- خطای ۵۰۰ هیچ پیام داخلی، stack یا SQL به بیرون نمی‌دهد.
- کاتالوگ کد ← پیام فارسی در `packages/shared` (کد) و `platform/http/messages.fa.ts` (متن).

## ۷. سرآیندها و قراردادهای HTTP

| سرآیند | کار |
|---|---|
| `Authorization: Bearer …` | توکن دسترسی (07 ۲) |
| `If-Match: "<version>"` | اجباری در هر `PATCH`، `PUT`، `DELETE` و اقدام حالت‌دار؛ پاسخ خواندن `ETag` می‌دهد (05 ۹) |
| `Idempotency-Key: <uuid>` | اجباری در `POST` ساخت از وب؛ پاسخ اول ۲۴ ساعت نگه داشته و برای تکرار همان برمی‌گردد؛ کلید یکسان با بدنهٔ متفاوت ← ۴۲۲ `IDEMPOTENCY_KEY_REUSED` |
| `X-Request-Id` | اگر کلاینت فرستاد، در `traceId` ثبت می‌شود |
| `Accept-Language` | نادیده؛ پیام همیشه فارسی |

**صفحه‌بندی:** `?cursor=&limit=` — پیش‌فرض ۵۰، سقف ۲۰۰ (F20)؛ cursor مات (base64 از کلید مرتب‌سازی + `id`)؛ مرتب‌سازی همیشه با `id` به‌عنوان شکنندهٔ تساوی. `offset` نداریم.

**فیلتر و مرتب‌سازی:** پارامترهای نام‌دار و فهرست سفید (`?status=stage1&sortBy=receivedAt&sortDir=desc`)؛ هیچ زبان پرس‌وجوی آزاد.

**کار طولانی:** `202 Accepted` با `{ jobId }` و `Location: /v1/jobs/:id`؛ وضعیت `{ status, progress, result?, error? }`.

**فایل:** بارگذاری قابل‌ادامه (F20 ۷) و دانلود با لینک امضاشدهٔ ۵ دقیقه‌ای؛ API هرگز بایت فایل بزرگ را از خودش عبور نمی‌دهد.

## ۸. Swagger

```ts
// bootstrap/swagger.ts
const config = new DocumentBuilder()
  .setTitle('Projeyar API')
  .setVersion('1')
  .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
  .addCookieAuth('pj_refresh', { type: 'apiKey', in: 'cookie' }, 'refresh-cookie')
  .build();
```

| قاعده | جزئیات |
|---|---|
| یک `@ApiTags` فارسی برای هر کنترلر | گروه‌بندی با نام ویژگی: «گزارش کارگاه — تأیید» |
| `operationId` یکتا و پایدار | camelCase فعل‌محور؛ نام تابع تولیدی فرانت و Dart از آن است؛ تغییرش شکستن قرارداد است |
| `summary` فارسی کوتاه، `description` با ارجاع به سند | «D08؛ approval-workflow.md ۴.۲» |
| پاسخ‌های خطا با یک دکوراتور | `@ApiStandardResponses({ conflict, notFound, unprocessable })` همهٔ قالب‌های بخش ۶ را با مثال اضافه می‌کند |
| کد دسترسی در سند | `@Permission()` خودش `@ApiExtension('x-permission', code)` و `x-scope` می‌گذارد؛ تست قرارداد از همین می‌خواند (09 ۵) |
| `x-amount-fields` | فهرست فیلدهای ریالی هر پاسخ، از `@Amount` |
| `x-idempotent`، `x-requires-if-match` | از دکوراتورهای مربوط |
| Swagger UI | فقط در توسعه و staging (`SWAGGER_ENABLED`)؛ در production فقط فایل JSON برای کلاینت‌ها، پشت احراز هویت |

## ۹. تولید کلاینت

```
pnpm --filter backend run openapi:emit     ← backend/openapi.json (بدون بالا آوردن سرور، از ماژول Nest)
pnpm --filter frontend run api:types       ← frontend/src/shared/types/openapi.gen.ts (openapi-typescript)
Flutter: openapi-generator (dart-dio) از همان فایل
```

- `openapi.json` در مخزن commit می‌شود؛ تغییرش در PR دیده می‌شود و CI اگر فایل با کد نخواند شکست می‌خورد.
- **مهاجرت فرانت:** نوع‌های دست‌نوشتهٔ `modules/*/types` فرانت به‌تدریج نام مستعار نوع تولیدی می‌شوند، ماژول‌به‌ماژول همراه سوئیچ `hybridQuery`. تا آن وقت تست قرارداد شکل پاسخ سرور را با ماک فرانت مقایسه می‌کند (09 ۵).
