# ۰۴ — قواعد نوشتن کد

هر قاعده یک «چرا» دارد؛ اگر جایی قاعده با واقعیت نخواند، قاعده را بی‌صدا نشکن — در PR بنویس و اینجا اصلاح کن.

## ۱. TypeScript

| قاعده | جزئیات |
|---|---|
| `strict` کامل | به‌علاوهٔ `noUncheckedIndexedAccess`، `noImplicitOverride`، `noFallthroughCasesInSwitch`، `useUnknownInCatchVariables` |
| بدون `any` | `unknown` + باریک‌کردن. تنها استثنا: امضای کتابخانه‌ای که چیز دیگری نمی‌پذیرد، با `// eslint-disable-next-line` و دلیل |
| بدون `!` (non-null) | جز در تست. به‌جایش بررسی و خطای دامنه |
| بدون `enum` تایپ‌اسکریپت | `as const` + نوع اجتماع (در `packages/shared`)؛ enum در ESM و درخت‌تکانی دردسر دارد |
| بدون export پیش‌فرض | نام‌دار، تا جست‌وجو و بازسازی کار کند |
| نوع بازگشتی صریح | روی هر متد عمومی سرویس و هر تابع `domain` |
| `readonly` | پیش‌فرض برای پراپرتی‌های DTO خروجی و ورودی‌های تابع |
| `satisfies` | برای جدول‌های ثابت (ماشین حالت، نگاشت خطا) تا نوع حفظ شود |
| پول | `bigint` یا رشتهٔ عددی؛ هیچ‌وقت `number` (C02) |
| درصد و وزن | `Decimal` (`decimal.js`) در محاسبه؛ رشته در Entity؛ `number` فقط در DTO خروجی برای نمایش (C04) |
| زمان | `Clock` تزریقی، نه `new Date()` در `domain` و `application` (تست مهلت و تیک) |

## ۲. کیفیت عمومی

- فایل: ۳۰۰ خط نرم، ۶۰۰ سخت (`AGENTS.md`). تابع: ۴۰ خط نرم.
- `return` زودهنگام و guard clause؛ تودرتویی بیش از سه سطح نه.
- هیچ `console.*`؛ فقط `Logger` تزریقی (بخش ۸).
- هیچ وضعیت سراسری قابل‌تغییر (`let` بیرون از تابع، Map ماژولی). وضعیت در پایگاه داده یا در زمینهٔ درخواست.
- هیچ `process.env` بیرون از `src/config`.
- هیچ عدد جادویی دامنه در کد: آستانه‌ها از `ProjectSettings` (W29) یا ثابت نام‌دار با ارجاع به سند.
- `async` بی‌`await` نه؛ promise رهاشده نه (`no-floating-promises`).
- کامنت فارسی و دربارهٔ **چرا**، با ارجاع به سند: `// D08: آیتم تأییدشده هرگز ویرایش نمی‌شود؛ اصلاح = آیتم جایگزین`. کامنتی که فقط کد را تکرار کند حذف شود.

## ۳. Nest و تزریق وابستگی

- هر کلاس با `@Injectable()` و وابستگی از سازنده؛ `new` کردن سرویس ممنوع.
- ماژول Nest فقط `providers`ی را `export` می‌کند که در `index.ts` آمده.
- `Scope.REQUEST` ممنوع (کند و مسری است)؛ زمینهٔ درخواست از `ClsService` (`AppContext`) خوانده می‌شود.
- `forwardRef` ممنوع؛ وابستگی چرخه‌ای یعنی مرز غلط — با رویداد بشکن (01 ۷).

## ۴. کنترلر: نازک

```ts
// modules/approvals/api/approvals.controller.ts
@ApiTags('گزارش کارگاه — تأیید')
@Controller({ path: 'report-items', version: '1' })
export class ApprovalsController {
  constructor(private readonly approvals: ApprovalsService) {}

  @Post(':itemId/decisions')
  @Permission('report.approve.stage1')              // یک کد (D11)؛ مرحلهٔ دوم را سرویس با scope می‌سنجد
  @ApiOperation({ summary: 'تصمیم ناظر روی یک آیتم گزارش', operationId: 'decideReportItem' })
  @ApiStandardResponses({ conflict: true })          // 400، 401، 403، 404، 409 با قالب خطا
  decide(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @IfMatch() expectedVersion: number,             // 428 اگر نیامده باشد
    @Body() body: DecideItemRequest,
  ): Promise<DecisionResponse> {
    return this.approvals.decide({ itemId, expectedVersion, ...body });
  }
}
```

**کنترلر هرگز:** پرس‌وجو نمی‌زند، `EntityManager` نمی‌گیرد، شرط کسب‌وکاری ندارد، Entity برنمی‌گرداند، `try/catch` برای تبدیل خطا ندارد (فیلتر سراسری این کار را می‌کند).

## ۵. فرمان: قالب ثابت

هر فرمان همین هفت گام را به همین ترتیب دارد. ترتیب مهم است: قفل پیش از خواندن وضعیت، رویداد و ممیزی پیش از commit.

```ts
// modules/approvals/application/commands/decide-item.command.ts
import { EntityManager, LockMode } from '@mikro-orm/postgresql';

@Injectable()
export class DecideItemCommand {
  constructor(
    private readonly em: EntityManager,
    private readonly scope: ReviewScope,
    private readonly outbox: Outbox,
    private readonly audit: AuditTrail,
    private readonly clock: Clock,
  ) {}

  async execute(input: DecideItemInput): Promise<DecisionResult> {
    return this.em.transactional(async (tx) => {
      // ۱. بارگذاری با قفل — دو ناظر هم‌زمان: دومی پشت این قفل می‌ماند (05 ۹)
      const item = await tx.findOne(FieldReportItem, { id: input.itemId }, {
        lockMode: LockMode.PESSIMISTIC_WRITE,
      });
      if (!item) throw new NotFoundError('REPORT_ITEM_NOT_FOUND');

      // ۲. نسخه — کاربر روی دادهٔ کهنه تصمیم نگرفته باشد
      assertVersion(item, input.expectedVersion);

      // ۳. دامنهٔ داده — ناظر فقط حوزهٔ خودش (D11، own_area)
      await this.scope.assertCanReview(tx, item);

      // ۴. انتقال حالت فقط از ماشین حالت (08 ۶) — شرط‌ها و اثرها همان‌جاست
      const before = snapshotForAudit(item);
      const transition = fieldReportItemMachine.apply(item, input.decision, {
        settings: await this.settingsOf(tx, item.projectId),
        now: this.clock.now(),
      });

      // ۵. نوشتن
      tx.persist(Review.from(item, transition, input));

      // ۶. رویداد و ممیزی در همان تراکنش (D07، F20 ۶)
      await this.outbox.emit(tx, transition.event);
      await this.audit.record(tx, { action: 'report_item.decide', entity: item, before, reason: input.note });

      // ۷. خروجی — DTO، نه Entity
      return toDecisionResult(item, transition);
    });
  }
}
```

قواعد فرمان:
- **مرز تراکنش فقط در فرمان** (`application/commands`). نه در کنترلر، نه در `domain`، نه در مخزن.
- **هیچ کار شبکه‌ای در تراکنش:** پیامک، ایمیل، S3، فایل MSP — همه کار صف‌اند و بعد از commit اجرا می‌شوند. تراکنش باز در انتظار شبکه، قفل‌ها را نگه می‌دارد.
- **فراخوان ماژول دیگر در فرمان:** `tx` را پاس بده؛ سرویس صدازده‌شده تراکنش تازه باز نمی‌کند:
  ```ts
  await this.planning.applyDraft(tx, { projectId, draftId, source: 'msp_sync' });
  ```
- پرس‌وجوی موازی (`Promise.all`) روی یک `tx` ممنوع؛ اتصال تراکنش یکی است.
- `flush` دستی لازم نیست؛ `transactional` در پایان flush می‌کند. اگر شناسهٔ تولیدی پایگاه داده لازم شد، `await tx.flush()` با کامنت دلیل.

## ۶. دامنه: خالص

- Entity رفتار دارد، نه فقط فیلد: `costEntry.reverse(reason)` به‌جای `costEntry.status = 'reversed'` در سرویس.
- قاعدهٔ کسب‌وکاری تابع خالص در `domain/rules/*` با تست واحد: ورودی ساده، خروجی ساده، بدون `await`.
- `domain` به Nest، `EntityManager`، `ClsService` و `Clock` وابسته نیست؛ زمان و تنظیمات را ورودی می‌گیرد.
- فرمول عددی فقط در `computation/domain/formulas` (01 ۶).

## ۷. خطا

```ts
// platform/http/errors.ts
export class DomainError extends Error {
  constructor(
    readonly code: ErrorCode,                  // از packages/shared
    readonly details?: Record<string, unknown>,
    readonly status: HttpStatus = HttpStatus.UNPROCESSABLE_ENTITY,
    readonly retryable = false,
  ) { super(code); }
}
export class NotFoundError extends DomainError { /* 404 */ }
export class ConflictError extends DomainError { /* 409 */ }
export class ForbiddenError extends DomainError { /* 403، با نقش لازم در details */ }
```

- `domain` و `application` فقط `DomainError` و زیرکلاس‌هایش را پرتاب می‌کنند؛ `HttpException` فقط در `platform/http`.
- **پیام فارسی در کاتالوگ است، نه در `throw`:** `ErrorCode` ← پیام بی‌سرزنش با یک راه ادامه (`CLAUDE.md` ۵). مثال: `ITEM_ALREADY_DECIDED` ← «این آیتم همین الان توسط {reviewer} تأیید شد. صفحه را تازه کنید تا وضعیت جدید را ببینید.»
- اعتبارسنجی شکل (DTO) جدا از قاعدهٔ دامنه است: «مقدار عدد مثبت است» در DTO؛ «مقدار از مقدار کل برگ بیشتر نشود» در `domain/rules`.
- خطا را نبلع. `catch` فقط برای افزودن زمینه یا تبدیل خطای زیرساخت به `DomainError` با `retryable` درست.
- خطای پایگاه داده (قید یکتا، کلید خارجی) در یک نقطه (`platform/database/db-error.mapper.ts`) به `DomainError` نگاشت می‌شود؛ نام قید ← کد خطا.

## ۸. لاگ

- `PinoLogger` تزریقی؛ پیام انگلیسی کوتاه + فیلد ساخت‌یافته: `this.log.info({ projectId, durationMs }, 'project recomputed')`.
- `traceId`، `orgId`، `userId`، `projectId` خودکار از زمینه می‌آیند؛ دستی نگذار.
- سطح: `error` فقط چیزی که کسی باید نگاهش کند؛ خطای کاربر (۴xx) `warn` نیست، `info` یا هیچ.
- هرگز: رمز، توکن، کد OTP، شمارهٔ کامل موبایل، مبلغ، بدنهٔ کامل درخواست. فهرست ماسک در 10 ۵.

## ۹. پیکربندی

- هر حوزه یک فایل در `src/config` با `registerAs` و کلاس نوع‌دار؛ اعتبارسنجی با class-validator هنگام راه‌اندازی — متغیر نادرست یعنی برنامه بالا نمی‌آید، نه خطای دیرهنگام.
- مقدار پیش‌فرض فقط برای چیزی که در هر محیط یکی است؛ رمز و نشانی هیچ‌وقت پیش‌فرض ندارند.

## ۱۰. ESLint (اجباری در CI)

| قاعده | چرا |
|---|---|
| `@typescript-eslint/no-explicit-any`، `no-non-null-assertion`، `no-floating-promises`، `no-misused-promises`، `switch-exhaustiveness-check` | بند ۱ و ۲ |
| `boundaries/element-types` | لایه‌ها و ماژول‌ها (01 ۳) |
| `boundaries/entry-point` | ماژول دیگر فقط از `index.ts` |

> در پیاده‌سازی دو ردیف `boundaries/*` با `no-restricted-imports` اجرا می‌شوند (README ۶).
| `import/no-cycle` | ESM و مرز ماژول |
| `no-restricted-imports`: `@mikro-orm/*` در `api/` | کنترلر به ORM دست نمی‌زند |
| `no-restricted-syntax`: `em.execute(`، `.raw(`، `getKysely(` بیرون از `infrastructure/` | SQL خام فقط در جای مجاز (05 ۴.۳) |
| `no-restricted-syntax`: `new Date()` در `domain/` و `application/` | `Clock` |
| `no-restricted-properties`: `process.env` بیرون از `config/` | بند ۹ |
| `no-console` | بند ۸ |
| `max-lines` (۶۰۰ خطا، ۳۰۰ هشدار)، `max-depth` ۳ | بند ۲ |

## ۱۱. چک‌لیست پیش از PR

- [ ] `pnpm --filter backend run typecheck`، `lint`، `test`، `test:integration` سبز
- [ ] هر AC تازه تست دارد و نامش با شناسهٔ AC شروع می‌شود
- [ ] هر endpoint تازه `@Permission` دارد و تست قرارداد آن را دید
- [ ] هر فیلد ریالی `@Amount` دارد
- [ ] هر جدول مستأجر `org_id`، فیلتر و سیاست RLS دارد
- [ ] هر تغییر حالت از ماشین حالت است و رویداد و ممیزی‌اش در همان تراکنش است
- [ ] migration تازه بازگشت‌پذیر یا دلیل نوشته‌شده دارد (05 ۶)
- [ ] OpenAPI تازه تولید و تایپ فرانت به‌روز شد
- [ ] تغییر نسبت به `design/` در `design/code-mapping.md` ثبت شد
