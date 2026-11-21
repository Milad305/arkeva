# ۰۸ — رویداد، صف، زمان‌بند و گردش کار

> مبنا: D07، D08، D09؛ F20 ۳–۵؛ `03` ۵ (ماتریس ج)؛ تعریف‌های تایپ pg-boss 12.38.2.

## ۱. سه سازوکار، سه کار

| سازوکار | کی | ماندگار | ترتیب |
|---|---|---|---|
| **رویداد دامنه** (`domain_event`) | «چیزی رخ داد» که ماژول‌های دیگر واکنش نشان می‌دهند | بله، در همان تراکنش | به ازای پروژه |
| **کار صف** (pg-boss) | «این کار را انجام بده» — سنگین، کند، شبکه‌ای، تکرارپذیر | بله | بر اساس سیاست صف |
| **گردش کار** (ماشین حالت) | «آیا این انتقال حالت مجاز است و چه اثری دارد» | وضعیت روی خود Entity | همگام، درون تراکنش |

## ۲. رویداد دامنه (outbox)

```ts
// در هر فرمان، درون تراکنش
await this.outbox.emit(tx, {
  type: 'CostEntryPosted',
  projectId: entry.projectId,
  payload: { v: 1, costEntryId: entry.id, cbsItemId: entry.cbsItemId, costDate: entry.costDate },
});
```

`Outbox.emit` دو کار را در **همان تراکنش** انجام می‌دهد:
1. درج ردیف `domain_event` (فیلدهای `02` ۱۳ + `org_id`، `id` UUID v7، `actor_user_id`، `trace_id`).
2. ارسال کار `event.dispatch` با `{ eventId }` از راه همان اتصال تراکنش (`send(…, { db })` در pg-boss) با `singletonKey: projectId ?? orgId`.

پس رله‌ای که جدول را poll کند لازم نیست و اگر تراکنش شکست بخورد، نه رویداد هست نه کار (AC-PL-01).

**قواعد** (F20 ۳):
- هر نوع رویداد **یک** منتشرکننده: ماژول مالک موجودیت. فهرست در `packages/shared/events.ts`.
- payload فقط شناسه و مقدار ضروری؛ حداکثر ۶۴ کیلوبایت؛ `v` عددی. مصرف‌کننده نسخه‌های قدیم را می‌فهمد؛ تغییر ناسازگار = `v` تازه.
- payload **مبلغ ندارد** — رویداد در «فعالیت‌های اخیر» خوانده می‌شود (F20 ۱۰) و مبلغ آنجا فقط برای `cbs.view_amounts` است؛ مصرف‌کننده مبلغ را از مالک می‌خواند.
- `EventEmitter` درون‌حافظه برای رویداد دامنه ممنوع.

### ۲.۱ پخش و مصرف

`event.dispatch` (صف `key_strict_fifo`، کلید پروژه) رویداد را می‌خواند و برای هر مصرف‌کنندهٔ ثبت‌شده یک کار در صف خود آن مصرف‌کننده می‌گذارد:

```ts
// modules/computation/application/consumers/on-facts-changed.consumer.ts
@EventConsumer({
  name: 'computation.on-facts-changed',
  events: ['FieldReportItemApproved', 'FieldReportItemRevoked', 'CostEntryPosted', 'PlanVersionApplied', 'ProjectSettingsChanged'],
})
export class OnFactsChangedConsumer implements Consumer {
  constructor(private readonly jobs: Jobs) {}
  async handle(event: DomainEventEnvelope, tx: EntityManager): Promise<void> {
    // فقط محاسبه را صف می‌کند؛ صف stately رویدادهای نزدیک را تجمیع می‌کند (D07 ۲)
    await this.jobs.send(tx, 'compute.project', { projectId: event.projectId }, { singletonKey: event.projectId });
  }
}
```

- **idempotent با کلید `eventId`:** اجراکننده پیش از `handle` در جدول `consumed_event (consumer, event_id)` درج می‌کند (کلید یکتا) و هر دو در **تراکنش کار** هستند (`work(…, { transactional: true })`)؛ تحویل دوباره بی‌اثر است (AC-PL-02). — **در پیاده‌سازی:** تراکنش MikroORM، نه تراکنش کارگر pg-boss؛ صف مصرف‌کننده هم `key_strict_fifo` است (README ۶).
- شکست ← تلاش با تأخیر نمایی تا ۸ بار (`retryLimit: 8`، `retryBackoff: true`)؛ بعد `deadLetter` و هشدار مدیر سیستم؛ پخش دوباره دستی از صف dead (F20 ۳.۱).
- مصرف‌کننده‌ها و رویدادهایشان دقیقاً ماتریس ج (`03` ۵) است؛ تست رفتار رویداد هر ردیف ماتریس را می‌پوشاند (09 ۲).
- `processedAt` و `attempts` در `domain_event` برای نمایش وضعیت تحویل به‌روز می‌شوند؛ تنها ستون‌های قابل‌تغییر این جدول.

## ۳. صف‌ها

| صف | سیاست | کلید | اولویت | کار |
|---|---|---|---|---|
| `event.dispatch` | `key_strict_fifo` | `projectId` (یا `orgId`) | ۸۰ | پخش رویداد به مصرف‌کننده‌ها، به ترتیب برای هر پروژه |
| `compute.project` | `stately` | `projectId` | ۶۰ | بازمحاسبهٔ کامل پروژه؛ یکی در صف + یکی فعال؛ رویدادهای نزدیک تجمیع |
| `alerts.evaluate` | `stately` | `projectId` | ۵۰ | پس از `ComputeFinished` و تیک‌ها (D09) |
| `notify.sms` | `standard` | — | ۹۰ | «ارسال فوری» (F20 ۴) |
| `notify.email`، `notify.push`، `notify.in_app` | `standard` | — | ۴۰ | اعلان‌ها |
| `report.generate` | `standard` + `group: orgId` | — | ۲۰ | F18؛ `groupConcurrency` تا یک سازمان صف را نگیرد |
| `msp.parse`، `msp.apply` | `standard` + `group: orgId` | — | ۱۰ | F15 |
| `photo.process` | `standard` + `group: orgId` | — | ۱۰ | بندانگشتی و EXIF |
| `mv.refresh` | `stately` | نام View | ۱۰ | Materialized View (05 ۸) |
| `consumer.<name>` | `standard` | — | از مصرف‌کننده | صف هر مصرف‌کننده |

ترتیب اولویت همان F20 ۴: پیامک > محاسبات > اعلان > گزارش > فایل.

**سریالی به ازای پروژه (AC-PL-03):** `key_strict_fifo` کار فعال، در حال تلاش دوباره یا شکست‌خوردهٔ یک کلید را جلوی کارهای بعدی **همان** کلید نگه می‌دارد و کلیدهای دیگر آزادند؛ یعنی دو پروژه موازی، یک پروژه پشت‌سرهم — همان چیزی که F20 ۴ با قفل مشورتی خواسته بود، بدون قفل دست‌ساز. `[پیش‌فرض فنی]`

**قرارداد هر کار:**
- payload فقط شناسه + `orgId` + `traceId`؛ داده از پایگاه داده خوانده می‌شود، نه از payload.
- اجراکننده (`platform/jobs`) هر کار را در `RequestContext` تازه اجرا می‌کند، فیلتر tenant را از `orgId` تنظیم می‌کند، `traceId` را در زمینه می‌گذارد، و معیار مدت و شکست ثبت می‌کند. هیچ مصرف‌کننده‌ای این‌ها را خودش انجام نمی‌دهد.
- هر کار idempotent است؛ اجرای دوباره نتیجهٔ یکسان.
- کار طولانی پیشرفت را در جدول `job_progress` می‌نویسد تا `GET /v1/jobs/:id` بخواند (W46).
- `expireInSeconds` برای هر صف تعیین می‌شود؛ کاری که از مهلت گذشت دوباره صف می‌شود (F20 ۴ «بازیابی»).

## ۴. زمان‌بند (F20 ۵)

- تیک‌ها با `boss.schedule(name, cron, data, { tz: 'Asia/Tehran' })`؛ pg-boss زمان‌بندی را در پایگاه داده نگه می‌دارد و در چند نمونه یک بار اجرا می‌کند.
- هر تیک ردیفی در `tick_run (tick, run_date, started_at, finished_at, projects_processed)` با کلید یکتای `(tick, run_date)` دارد.
- **جبران (AC-PL-04):** در راه‌اندازی `worker`، برای هر تیک روزانه آخرین `run_date` موفق خوانده و روزهای از دست‌رفته یک بار و به ترتیب اجرا می‌شوند؛ کلید یکتا تکرار را ناممکن می‌کند.
- تیک سراسری روی سازمان‌ها حلقه می‌زند و برای هر سازمان (و هر پروژه) کار جدا صف می‌کند؛ خودش کار سنگین نمی‌کند.

| تیک | زمان (تهران) | کار |
|---|---|---|
| `DailyTick` | ۰۰:۳۰ | `compute.project` برای همهٔ پروژه‌های فعال؛ قواعد زمانی |
| `HourlyTick` | هر ساعت | AL-APR-01، ارجاع مهلت‌ها |
| `DigestTick` | ۰۷:۳۰ | NT-DIG-01 |
| `ReminderTick` | هر ۱۵ دقیقه | پروژه‌هایی که `dailyReminderTime` آن‌ها در این بازه است (NT-FLD-04) |
| `ReportScheduleDue` | هر ۵ دقیقه | زمان‌بندی‌های رسیدهٔ F18 |
| `PurgeTick` | ۰۳:۰۰ | نگه‌داری (05 ۱۱) |
| `BackupTick` | ۰۲:۰۰ (تنظیم‌پذیر) | 10 ۷ |

## ۵. چرا گردش کار جدا — الزام کاربر

بدون موتور، «چه کسی، از چه حالتی، با چه شرطی، به کجا، با چه اثری» در ده سرویس پخش می‌شود و دو مسیر به یک حالت دو قاعدهٔ متفاوت پیدا می‌کنند. با موتور:
- هر گردش کار **یک فایل اعلانی** در `domain/` ماژول مالک است که می‌شود خواند، تست کرد و به نمودار تبدیل کرد.
- هر انتقال از **یک** دروازه می‌گذرد: موتور حالت مبدأ، شرط و دسترسی را می‌سنجد و رویداد را می‌سازد.
- قفل و نسخه (05 ۹) و ممیزی پیرامون همین دروازه‌اند، پس هیچ مسیری از آن‌ها فرار نمی‌کند.

## ۶. موتور گردش کار

```ts
// platform/workflow/define-machine.ts
export interface TransitionDef<S extends string, Subject, Ctx> {
  readonly from: readonly S[];
  readonly to: S | ((subject: Subject, ctx: Ctx) => S);          // مقصد شرطی (مرحلهٔ دوم یا تأیید)
  readonly permission: PermissionCode;                           // اعلانی؛ موتور با ctx.permissions می‌سنجد
  readonly guard?: (subject: Subject, ctx: Ctx) => GuardResult;  // تابع خالص؛ { ok } یا { ok: false, code }
  readonly event?: (subject: Subject, ctx: Ctx, to: S) => DomainEventInput | null;
  readonly requiresReason?: boolean;                             // درخواست اصلاح و رد: یادداشت اجباری
}

export interface MachineDef<S extends string, A extends string, Subject, Ctx> {
  readonly name: string;
  readonly states: readonly S[];
  readonly terminal: readonly S[];
  readonly status: (subject: Subject) => S;                      // خواندن حالت
  readonly setStatus: (subject: Subject, to: S) => void;         // نوشتن فقط از موتور
  readonly transitions: Readonly<Record<A, TransitionDef<S, Subject, Ctx>>>;
}
```

`machine.apply(subject, action, ctx)` به ترتیب: وجود انتقال ← حالت مبدأ ← دسترسی ← یادداشت اجباری ← نگهبان ← محاسبهٔ مقصد ← `setStatus` ← ساخت رویداد؛ خروجی `{ from, to, event }`. هر شکست `DomainError` با کد مشخص (`TRANSITION_NOT_ALLOWED`، `ITEM_ALREADY_DECIDED`، `REASON_REQUIRED`، …).

### ۶.۱ نمونه: آیتم گزارش (D08)

```ts
// modules/approvals/domain/field-report-item-status.machine.ts
export const fieldReportItemMachine = defineMachine({
  name: 'FieldReportItem',
  states: ['submitted', 'stage1', 'stage2', 'needs_revision', 'needs_resolution', 'approved', 'rejected', 'superseded'],
  terminal: ['rejected', 'superseded'],
  status: (item) => item.status,
  setStatus: (item, to) => item.markStatus(to),
  transitions: {
    approve_stage1: {
      from: ['stage1'],
      to: (item, ctx) => (requiresStage2(item, ctx.settings) ? 'stage2' : 'approved'),   // قاعدهٔ خالص، با تست
      permission: 'report.approve.stage1',
      event: (item, _ctx, to) => (to === 'approved' ? approvedEvent(item) : null),
    },
    approve_stage2: { from: ['stage2'], to: 'approved', permission: 'report.approve.stage2', event: approvedEvent },
    request_revision: { from: ['stage1', 'stage2'], to: 'needs_revision', permission: 'report.approve.stage1', requiresReason: true, event: revisionEvent },
    reject: { from: ['stage1', 'stage2', 'needs_resolution'], to: 'rejected', permission: 'report.approve.stage1', requiresReason: true },
    revoke_auto: {
      from: ['approved'], to: 'needs_revision', permission: 'report.approve.stage1',
      guard: (item, ctx) => (item.autoApproved && ctx.now < item.reviewDeadline ? ok() : fail('AUTO_REVOKE_WINDOW_CLOSED')),
      event: revokedEvent,
    },
    resolve: { from: ['needs_resolution'], to: 'stage1', permission: 'report.resolve' },
    supersede: { from: ['approved'], to: 'superseded', permission: 'report.correct', requiresReason: true },
  },
} satisfies MachineDef<ItemStatus, ItemAction, FieldReportItem, ReviewCtx>);
```

### ۶.۲ گردش کارهای سیستم

| ماشین | مالک | مبنا |
|---|---|---|
| FieldReportItem | approvals | D08، approval-workflow.md ۴ |
| PlanVersion | planning | D05، plan-versions.md |
| Project | projects | project-setup.md ۸ (پیش‌نویس، فعال، متوقف، تمام‌شده، بایگانی، در انتظار حذف) |
| CostEntry | cost-ledger | D02، cost-ledger.md |
| BudgetRevisionRequest | cbs | cbs.md ۷ (OD-11) |
| ReportingPeriod | computation | D06، progress-calculation.md ۵.۸ |
| Risk | risks | risk.md ۵.۱ (OD-10) |
| Alert | alerts | D09: open ← seen ← resolved یا dismissed |
| Invitation، User | identity | access-control.md ۵.۶ |
| ImportSession، SyncSession | msp | msp-integration.md |
| GeneratedReport | reporting | management-reports.md |

قواعد:
- **فیلد وضعیت هیچ setter عمومی ندارد**؛ فقط `markStatus` که موتور صدا می‌زند. lint تخصیص مستقیم `.status =` را بیرون از `domain/` رد می‌کند.
- تاریخچهٔ انتقال در جدول خود مالک (Review برای آیتم، `plan_version_event` برای نسخه) یا در ممیزی؛ هیچ جدول عمومی «state_history» که مالک نداشته باشد.
- **نمودار از تعریف:** `pnpm --filter backend run workflow:diagrams` از همهٔ ماشین‌ها نمودار mermaid می‌سازد و در `docs/backend/workflows/` می‌گذارد؛ CI بررسی می‌کند نمودار با کد بخواند. پس سند و کد هرگز از هم جدا نمی‌شوند.
- تست هر ماشین: هر انتقال مجاز، هر انتقال غیرمجاز، هر نگهبان؛ و برای D08 تمام مسیرهای نمودار سند.
