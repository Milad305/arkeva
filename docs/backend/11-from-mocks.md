# ۱۱ — استفاده از ماک‌های فرانت در ساخت بک‌اند

> **تاریخ:** 1405/08/21 `[تصمیم کاربر 1405/08/21]` · **جا در کار:** گام اول هر ماژول، پیش از نوشتن کد.
>
> **پایان (1405/08/27، برش ۲۰):** ماک‌های فرانت و `VITE_USE_MOCK_API` حذف شدند؛ این سند مرجع تاریخی است (code-mapping ۳.۵.۵۹).

## ۱. نقش ماک‌ها

ماک‌های `frontend/src/modules/*/mocks/` در ساخت پنل وب نقش «سرور» را بازی کرده‌اند: ۴۰ فایل، ۲۸۰ خطای قاعده با پیام فارسی، ۵ فایل تست کنارشان (به‌علاوهٔ ۲ تست دیگر فرانت، روی‌هم ۴۲ تست) و دادهٔ کامل پروژهٔ نگین. برای بک‌اند این‌ها **پیاده‌سازی مرجع و معیار تست**اند، نه منبع حقیقت.

**ترتیب حقیقت** وقتی سه منبع با هم نمی‌خوانند:

1. `design/` (سند ویژگی و `01`/`02`/`03`)
2. تصمیم‌های ثبت‌شده در `design/code-mapping.md` §۷.۱
3. ماک فرانت

اگر ماک با سند نمی‌خواند و `code-mapping.md` دلیلش را نگفته، تعارض است: طبق `CLAUDE.md` ۷ ثبت و پرسیده می‌شود، نه اینکه یکی بی‌صدا برنده شود.

## ۲. چه می‌دهند و چه نمی‌دهند

| می‌دهند | نمی‌دهند |
|---|---|
| **قرارداد:** ۱۸۵ مسیر در `config/endpoints.ts`، نوع ورودی و خروجی در `modules/*/types`، قالب `{success, data}` | **چندمستأجری:** هیچ ماکی `orgId` نمی‌شناسد |
| **قاعده‌ها:** شرط دقیق و پیام فارسی هر خطا (`MockApiError`) | **هم‌روندی:** حافظهٔ تک‌رشته‌ای؛ بدون قفل، `version` و کلید یکتایی |
| **رفتار:** ماشین حالت تأیید، اعتبارسنجی نسخهٔ کاری، ورود MSP، تقسیم قالب | **ناهمگامی:** محاسبه و رویداد در ماک **همگام**اند (بند ۶) |
| **تست:** ۴۲ تست با نام AC، شامل مثال مرجع | **تراکنش و outbox:** رویدادها فراخوان مستقیم‌اند (`eventLog`، `emitNotification`) |
| **داده:** پروژهٔ نگین، مثال مرجع، کاربران و نقش‌ها | **کارایی:** آرایهٔ درون‌حافظه؛ N+1 و ایندکس معنا ندارد |
| **تاریخچه:** هر جدایی از سند در `code-mapping.md` با دلیل | **صحت کامل:** ماک گاهی از سند جلو یا عقب است (بند ۷) |

## ۳. روش، برای هر ماژول

| گام | کار | خروجی |
|---|---|---|
| ۱ | سند ویژگی و «ارتباط» همسایه‌ها خوانده می‌شود | فهرست AC، موجودیت، رویداد |
| ۲ | ماک‌های همان ماژول (جدول ۵) فهرست می‌شوند | سیاههٔ ماژول (بند ۴) |
| ۳ | هر تکهٔ ماک یکی از پنج دسته را می‌گیرد (جدول زیر) | برنامهٔ انتقال |
| ۴ | تست‌های AC ماک منتقل و تست‌های مخصوص بک‌اند افزوده می‌شوند | تست‌های قرمز |
| ۵ | پیاده‌سازی طبق 01–08 | تست‌های سبز |
| ۶ | تست قرارداد: پاسخ سرور روی seed نگین با شکل خروجی ماک (کلید و نوع، نه مقدار) | قرارداد سبز |
| ۷ | سوئیچ `hybridQuery` همان ماژول در فرانت و ثبت در `code-mapping.md` | ماژول روی سرور واقعی |

**پنج دسته:**

| دسته | نشانه در ماک | مقصد در بک‌اند |
|---|---|---|
| **قرارداد** | امضای `mock…(arg)` و نوع برگشتی؛ مسیر در `endpoints.ts` | DTO `…Request`/`…Response` و کنترلر (06) |
| **قاعدهٔ خالص** | شرط + `throw new MockApiError(…)`؛ تابع بدون وابستگی به فروشگاه | `domain/rules/*` با تست؛ پیام ← کاتالوگ خطا با کد تازه |
| **فرمول** | هر عدد مشتق: درصد، وزن، EVM، تجمیع درخت | `modules/computation/domain/formulas` (01 ۶) — هیچ‌جای دیگر |
| **داربست** | فروشگاه `Map`، `structuredClone`، تأخیر، مقدار ساخته‌شده با هش، توکن نمایشی، `reset…` | دور ریخته می‌شود |
| **مغایر با سند** | رفتاری که سند چیز دیگری می‌گوید و `code-mapping.md` توجیهش نکرده | ثبت در `code-mapping.md` §۷.۳ و پرسش؛ ساخت آن بخش متوقف |

## ۴. سیاههٔ هر ماژول

پیش از کد، این جدول برای ماژول در PR (یا در یادداشت کار) پر می‌شود:

| از ماک | چه پیدا شد | مقصد |
|---|---|---|
| `export function mock…` | هر endpoint | کنترلر + DTO |
| `new MockApiError(…)` | هر قاعده و پیامش | `domain/rules` + `ErrorCode` |
| `eventLog`/`emitNotification`/فراخوان ماک دیگر | هر اثر جانبی | رویداد دامنه (ماتریس ج، `03` ۵) یا فراخوان سرویس مالک |
| فیلد محاسبه‌شده در پاسخ | هر عدد مشتق | `computation` + `computedAt` |
| وارد کردن از ماک ماژول دیگر | وابستگی داده | سرویس عمومی مالک (01 ۷) |
| `*.test.ts` | تست‌ها | `*.test.ts` بک‌اند با همان نام |

قاعدهٔ انتقال کد: تابع خالص ماک **می‌تواند** تقریباً همان‌طور منتقل شود (هر دو TypeScript‌اند) — به شرط اینکه نوع‌ها با C02 و C04 هم‌خوان شوند (`number` ماک برای مبلغ ← `bigint`؛ درصد ← `Decimal`) و تستش هم بیاید. کد داربست هرگز منتقل نمی‌شود.

## ۵. نگاشت ماک‌ها به ماژول‌های بک‌اند

ترتیب ردیف‌ها همان مرحله‌های `05-roadmap.md` است. «قاعده» = شمار `MockApiError`؛ «مسیر» = شمار تابع `mock…`.

| مرحله | ماژول بک‌اند | ماک فرانت | خط | قاعده | مسیر | نکته |
|---|---|---|---|---|---|---|
| ۱ | `identity` | `auth/auth.ts` | 125 | 3 | 4 | توکن نمایشی داربست است؛ جریان توکن از 07 ۲ |
| ۱ | `identity` | `account/accountServer.ts` | 209 | 13 | 11 | W32: رمز، ورود دومرحله‌ای، کد پشتیبان، ترجیحات |
| ۱ | `identity` | `users/usersServer.ts`، `users/rolesServer.ts`، `users/orgUsersStore.ts` | 741 | 23 | 16 | W26، W27؛ ماتریس نقش‌ها |
| ۱ | `projects` | `projects/projects.ts`، `projectDetails.ts`، `people.ts` | 580 | 11 | 10 | فهرست W07، جزئیات |
| ۱ | `projects` | `projects/wizard.ts` | 383 | 4 | 11 | ویزارد W37–W38، W48 |
| ۱ | `projects` (+ `alerts`، `notifications`، `integrations`) | `settings/settingsServer.ts`، `settingsStore.ts` | 661 | 32 | 15 | W28–W30؛ بخش قواعد هشدار مال `alerts`، کانال‌ها مال `notifications` |
| ۱ | `planning` | `plan/planDraft.ts`، `wbs/draftRegistry.ts` | 20 | 0 | 1 | ثبت نسخه‌های کاری |
| ۲ | `planning` + `wbs` | `wbs/draft.ts`، `wbs/definitions.ts` | 1366 | 10 | 6 | ویرایش نسخهٔ کاری W12؛ اعتبارسنجی V-xx |
| ۲ | `wbs` | `wbs/import.ts` | 438 | 11 | 2 | ورود Excel W39 |
| ۲ | `planning` + `cbs` | `cbs/cbsDraft.ts` | 925 | 16 | 6 | ویرایش CBS در نسخهٔ کاری |
| ۲ | `planning` | `links/linksDraft.ts` | 577 | 6 | 6 | اتصال W15 |
| ۲ | `team` | `team/teamServer.ts` | 1019 | 30 | 11 | تنها منبع عضویت و نقش پروژه در فرانت |
| ۳ | `computation` + `wbs` (خواندن) | `wbs/server.ts` | 718 | 5 | 4 | تابع `compute()` = **فرمول‌ها** ← `computation`؛ بقیه خواندن درخت |
| ۳ | `computation` + `cbs` | `cbs/cbsServer.ts` | 795 | 8 | 6 | مصرف و BAC قلم‌ها ← `computation`؛ بازنگری بودجه ← `cbs` |
| ۳ | `field` + `approvals` | `reports/fieldReports.ts`، `pendingMine.ts` | 1184 | 34 | 11 | ماشین حالت D08 و قواعد ۳.۲ ← `approvals`؛ محتوای گزارش ← `field` |
| ۳ | `computation` | `progress/explain.ts` | 160 | 2 | 1 | «این عدد از کجا آمد؟» |
| ۵ | `alerts` | `alerts/alerts.ts` | 120 | 0 | 1 | |
| ۵ | `notifications` | `notifications/notificationsServer.ts`، `eventLog.ts` | 275 | 1 | 4 | `eventLog` جایگزین outbox بوده ← 08 ۲ |
| ۵ | `risks` | `risks/riskRegister.ts`، `orgRisks.ts` | 857 | 20 | 12 | |
| ۶ | `analytics` | `charts/analytics.ts`، `overview.ts`، `dashboard/dashboard.ts` | 1059 | 5 | 6 | **فقط خواندن**؛ هر عددی که ماک اینجا حساب می‌کند ← `computation` |
| ۶ | `platform` (فعالیت‌ها) | `charts/activity.ts` | 57 | 1 | 2 | از `domain_event` (F20 ۱۰) |
| ۷ | `msp` | `msp/mspServer.ts`، `mspFile.ts` | 1712 | 14 | 14 | خوانندهٔ MSPDI به `worker` |
| ۷ | `templates` | `templates/templatesServer.ts`، `templateContent.ts`، `suggestions.ts` | 1981 | 14 | 10 | |
| ۸ | `reporting` | `managementReports/reportsServer.ts` | 1139 | 17 | 14 | تولید فایل واقعی ← کار صف + `PdfRenderer` |
| — | `platform/search` | `search/searchServer.ts` | 246 | 0 | 1 | نرمال‌سازی فارسی منتقل می‌شود؛ جستجو ← `pg_trgm` |

**بدون ماک — فقط از سند:** دفتر هزینه (`cost-ledger`، G1)، بستن دوره (G2)، API همگام‌سازی اپ (`field`، F08)، بارگذاری قابل‌ادامهٔ فایل (F20 ۷)، پشتیبان (F20 ۱۲)، زمان‌بند و تیک‌ها. برای این‌ها تست قرارداد با ماک وجود ندارد و تست‌های AC تنها معیارند.

**تست‌ها:**

| تست فرانت | مقصد بک‌اند |
|---|---|
| `charts/mocks/referenceExample.test.ts` | `computation/domain/formulas/reference-example.test.ts` (دروازهٔ 09 ۳) |
| `templates/mocks/templatesServer.test.ts` | `templates` |
| `msp/mocks/mspServer.test.ts` | `msp` |
| `managementReports/mocks/reportsServer.test.ts` | `reporting` |
| `search/mocks/searchServer.test.ts` | `platform/search` |
| `shared/utils/geo.test.ts` | `field` (مهر مکان) |
| `shared/components/charts/useChartCursor.test.ts` | — (فقط فرانت) |

**seed:** دادهٔ `wbs/mocks/definitions.ts`، `projects/mocks/*`، `team/mocks/teamServer.ts` و مثال مرجع ← `database/seeders` (05 ۱۳).

## ۶. تفاوت رفتاری که فرانت باید هنگام سوئیچ جذب کند

| ماک امروز | سرور | کار فرانت |
|---|---|---|
| پس از تأیید آیتم یا ثبت هزینه، پیشرفت و EVM **همان لحظه** عوض می‌شوند | محاسبه در صف و چند لحظه بعد (D07) | نشان «در حال به‌روزرسانی» از `computedAt`؛ پس از جهش، بی‌اعتبار کردن تگ‌ها و خواندن دوباره تا `computedAt` از زمان جهش جلوتر برود (یا اعلان بلادرنگ در آینده) |
| ویرایش بدون نسخه | `If-Match` اجباری (05 ۹) | فرستادن `version`/`ETag` آخرین خواندن؛ نمایش ۴۰۹ با «نسخهٔ تازه را ببینید» |
| ساخت بی‌کلید | `Idempotency-Key` (06 ۷) | کلید UUID برای هر فرم ساخت، ثابت در تلاش دوباره |
| توکن در ذخیره‌سازی مرورگر | توکن دسترسی در حافظه + کوکی تازه‌سازی (07 ۲) | تغییر `authStorage` در برش اول |
| مبلغ بی‌مجوز `null` | کلید مبلغ **غایب** (07 ۵) | خواندن با `?.` و نمایش «—» برای غایب و `null` هر دو |
| شیء سازمان دیگر وجود ندارد | ۴۰۴ (نه ۴۰۳) | همان صفحهٔ «پیدا نشد» |
| فهرست کامل یک‌جا | cursor با سقف ۲۰۰ | «بارگذاری بیشتر» یا اسکرول جاری؛ هرجا ماک همه را یک‌جا داده، پیش از سوئیچ بررسی شود |
| خطای ماک: `message` + `status` | `{code, message, details, traceId, retryable}` | تصمیم روی `code`؛ نمایش `traceId` در W46 |

## ۷. مغایرت‌های پیداشده تا اینجا

با مقایسهٔ کامنت‌های `endpoints.ts` با فهرست مرکزی کدها (`access-control.md` ۵.۴، ۷۲ کد):

| کد | کجا تعریف شده | وضعیت |
|---|---|---|
| `charts.view_cost` | `charts.md` ۸: «همان `cbs.view_amounts` برای W22» | در فهرست مرکزی نیست |
| `notifications.view_own` | `notifications.md` ۸ | در فهرست مرکزی نیست |
| `reports.generate`، `reports.custom_template`، `reports.send_external` | `management-reports.md` ۷.۳ (و AC-MR-08 روی `reports.send_external` تست دارد) | در فهرست مرکزی نیست |
| `templates.publish` | `templates.md` ۸ | در فهرست مرکزی نیست |
| `report.approve` | **هیچ‌جا** — فقط کامنت `endpoints.ts` | احتمالاً کوتاه‌نوشت `report.approve.stage1`/`stage2` |

قاعدهٔ بک‌اند «هر endpoint دقیقاً یک کد از کاتالوگ» (07 ۵) با این وضع اجرا نمی‌شود. ثبت در `design/code-mapping.md` §۷.۳ ردیف ۱۴ برای تصمیم پیش از ساخت ماژول‌های مربوط (F13، F16، F17، F18).
