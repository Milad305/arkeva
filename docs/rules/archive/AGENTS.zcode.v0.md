# پروژه‌یار — دستورالعمل پروژه

> محصول **پروژه‌یار**: سامانه مدیریت پروژه‌های عمرانی ایرانی، مکمل Microsoft Project (نه جایگزین). مخاطب: پیمانکاران اصلی پروژه‌های عمرانی بزرگ ایران.

این فایل توسط ZCode در هر جلسه به‌طور خودکار بارگذاری می‌شود. قواعد عام در همین فایل، و قواعد تخصصی هر لایه در فایل‌های مرجع.

---

## ۱. معماری کلی — Monorepo

```
Ashan/
├── AGENTS.md                      # همین فایل — قواعد عام + مسیریابی
├── docs/
│   └── rules/
│       ├── backend-nestjs.md      # قواعد بک‌اند (بخش نکن)
│       ├── frontend-react.md      # قواعد فرانت (بخش نکن)
│   └── architecture/              # اسناد تصمیمات معماری (آینده)
├── designs/                       # مرجع بصری — HTMLهای طراحی قطعی
│   ├── Design System.html         # پالت رنگ، فونت، کامپوننت‌ها
│   ├── Login.html, Dashboard.html, Projects.html, Project.html
│   ├── WBS.html, CBS.html, Links.html, Members.html
│   ├── FieldReports v2.html, Charts.html, Settings.html, Modals.html
│   └── ContextMenus.html
├── backend/                       # NestJS + MikroORM + PostgreSQL (اصلاح 1405/08/21؛ مرجع: docs/backend/)
└── frontend/                      # React + RTK Query + HeroUI + Tailwind
```

---

## ۲. مسیریابی قواعد — کدام rule را دنبال کن

**قبل از هر کاری، rule مرتبط با مسیر فایلی که با آن کار می‌کنی را کامل بخوان:**

- کار روی هر چیزی زیر `backend/` (entity، service، controller، migration، DTO، و غیره) → **`docs/backend/README.md`** و فایل مرتبط در همان پوشه را کامل بخوان؛ `docs/rules/backend-nestjs.md` چک‌لیست کوتاه همان است. (اصلاح 1405/08/21)
- کار روی هر چیزی زیر `frontend/` (کامپوننت، صفحه، hook، api، store، و غیره) → **`docs/rules/frontend-react.md`** را کامل بخوان و رعایت کن.
- کار روی هر دو لایه (مثلاً اضافه‌کردن یک فیچر کامل) → هر دو فایل را بخوان.
- کار روی فایل‌های `designs/` یا اسناد → نیازی به rule فنی نیست، ولی قواعد عام این فایل را رعایت کن.

اگر شک داشتی کدام rule اعمال می‌شود، هر دو را بخوان — هیچ ضرری ندارد.

---

## ۳. قواعد عام (برای هر دو لایه)

### زبان و جهت
- **زبان محصول ۱۰۰٪ فارسی و RTL است.** تمام متن‌های placeholder، label، پیام موفقیت/خطا، tooltip به فارسی حرفه‌ای و طبیعی نوشته شوند.
- **فونت پیش‌فرض**: `Vazirmatn` (از Google Fonts).
- **تاریخ‌ها شمسی** در UI نمایش داده می‌شوند (`۱۴۰۴/۰۳/۰۱`). ولی **در دیتابیس به‌صورت Gregorian DATE ذخیره** می‌شوند — تبدیل فقط در لایه اپلیکیشن (به‌تفصیل در `docs/backend/05-database.md` ۳).
- **شماره‌های فارسی** در UI نمایش داده می‌شوند، ولی داده ذخیره‌شده و منطق محاسباتی با اعداد انگلیسی است.
- **واحد پول**: ریال. نمایش با suffix «میلیارد ﷼» در UI برای مبالغ بزرگ (۸۵۰ میلیارد ﷼)، ولی ذخیره به‌صورت عدد کامل ریال.

### کیفیت کد
- **ممنوع `any`** در هر دو لایه. از `unknown` + narrowing یا interface مناسب استفاده کن.
- **بدون `console.log`** در کد نهایی. فقط `console.error` در catch blocks مجاز است.
- **حجم فایل**: حد نرم ۳۰۰ خط، حد سخت ۶۰۰ خط. اگر نزدیک شدی، بشکن.
- **early returns / guard clauses** — از nesting عمیق پرهیز کن.

### مرجع بصری
- **طراحی‌های قطعی** در `designs/*.html` هستند. این‌ها مرجع حقیقی UI/داده‌اند. وقتی فیچری می‌سازی، فایل طراحی مربوطه را باز کن و فیلدها/چیدمان/حالت‌ها را دقیقاً پیاده کن.
- وقتی کدنویسی می‌کنی، طرح موجود را وفادارانه پیاده کن — به طرح وفادار بمان. بهبود بصری فقط با تأیید صریح.
- اگر فایل HTML از یک حالت پویا (modal باز، dropdown) عکس دارد، آن حالت هم باید پیاده شود.

### ⚠️ قاعده حیاتی: بازنویسی وفادارانه صفحات طراحی‌شده
وقتی صفحه‌ای می‌سازی که فایل HTML مرجع دارد (`designs/*.html`):
1. **ابتدا کل فایل HTML را بخوان** و هر مقدار CSS (HEX دقیق، ارتفاع، padding، radius، shadow) را استخراج کن.
2. **هر صفحه استایل مخصوص خودش را دارد.** کامپوننت‌های عمومی (`AppButton`, `FormInput`, ...) اغلب با مقادیر طرح فرق دارند (مثلاً فیلد 42px در Login ولی 38px در کامپوننت عمومی). ارزیابی کن: اگر صفحه استایل مخصوص دارد، آن را با استایل inline/Tailwind مخصوص خودش بساز، نه با کامپوننت عمومی.
3. **هر عنصر در HTML مرجع باید در خروجی باشد** — عناصر کوچک (eyebrow، divider، pulse dot، accent dot روی لوگو، footer links) نباید جا بیفتند.
4. **مقادیر دقیق، نه تقریبی** — اگر HTML می‌گوید `#0E1E38` و `height: 42px`، دقیقاً همان را استفاده کن.
5. **چک‌لیست قبل از پایان**: کل HTML خوانده شد؟ همه state‌ها پیاده شد؟ همه عناصر تزئینی هست؟ مقایسه line-by-line انجام شد؟

> جزئیات کامل و مثال‌ها در `docs/rules/frontend-react.md` بخش ۱۱.

### قاعده حیاتی: ساختار آماده اتصال به بک‌اند (Backend-ready)
هر صفحه را طوری بساز که بدون بازنویسی به API واقعی وصل شود:
1. **تایپ هم‌خوان با DTO** — برای هر موجودیت، `interface` در `modules/[name]/types/` تعریف کن که ساختار DTO بک‌اند را منعکس کند. ممنوع تایپ inline در کامپوننت.
2. **mock data جدا** — داده نمونه در `modules/[name]/mocks/`، نه inline در کامپوننت. وقتی API آماده شد، فقط منبع عوض شود.
3. **endpoint در RTK Query** از روز اول — ساختار `useGetXxxQuery`/`useXxxMutation` در `modules/[name]/api/` وجود داشته باشد (حتی اگر فعلاً mock).
4. **منطق کسب‌وکار جدا** — محاسبات (پیشرفت، انحراف، اعتبارسنجی، تبدیل تاریخ) در `services/` یا `@/shared/utils`، نه در کامپوننت.
5. **لینک‌ها واقعی** — `<Link to="...">` یا `navigate()`، نه `href="#"`.

### قاعده حیاتی: تکمیل بخش‌های ناقص طرح
فایل‌های `designs/*.html` طرح کامل نیستند — بعضی دکمه‌ها/منوها/حالت‌ها فقط در سند طراحی توصیف شده‌اند.
- دکمه‌ها/آیکن‌هایی با هدف نامشخص (`href="#"`، onclick خالی) را شناسایی کن و **به همان سبک Design System** پیاده کن.
- اگر منوی سه‌نقطه، modal ویرایش، یا پنلی در طراحی هست ولی محتوایش نیست، خودت بساز — مطابق `Modals.html` و Design System.
- **ممنوع** بهانه «در HTML نبود». سند طراحی (مکالمات) مرجع دوم است.

### قاعده: Layout‌های مشترک
- **AppShell** (Sidebar + Topbar) برای همه صفحات داخل اپ — از `@/shared/components/layout`، دوباره نساز.
- اگر صفحات متعدد layout مشترک دارند (مثلاً header پروژه با breadcrumb + tabs)، آن را در `modules/[name]/layout/` استخراج کن. **ممنوع** کپی layout بین صفحات.

### قاعده: دسترسی (RBAC) — فیک اما فعال
- هر route خصوصی با `<ProtectedRoute>` wrap شود.
- routeهای محدود به نقش با `<ProtectedRoute permissions={['wbs.edit']}>`.
- دکمه‌های مخرب با `<Guard permissions={[...]}>`، ستون‌های جدول/تب/منو بر اساس دسترسی.
- فعلاً `useHasAccess` همیشه `true` برمی‌گرداند (فیک) — ولی **ساختار از روز اول** تا وقتی API آماده شد فقط منطق عوض شود.

---

## ۴. خلاصه تصمیمات معماری (۱۲ تصمیم بنیادی)

> **اصلاح 1405/08/21:** این جدول پیش از اسناد `design/` نوشته شده بود. ردیف‌های خط‌خورده با تصمیم‌های تأییدشدهٔ `design/` (که طبق `CLAUDE.md` غالب‌اند) تعارض داشتند و جایگزینشان کنارشان آمده. مرجع بک‌اند: `docs/backend/`؛ فهرست کامل تفاوت‌ها: `docs/backend/README.md` ۵.

~~این‌ها قفل‌شده‌اند. هر کد باید با آن‌ها سازگار باشد. جزئیات کامل در `docs/rules/backend-nestjs.md`.~~

| # | تصمیم | انتخاب نهایی |
|---|---|---|
| ۱ | ذخیره‌سازی درخت WBS/CBS | ~~Adjacency list + ltree (`parent_id` + `materialized_path`). `path` از زنجیره `id` ساخته می‌شود، نه از `code`~~ فهرست مجاورت + CTE بازگشتی؛ ltree فقط با اندازه‌گیری (`docs/backend/05` ۷) |
| ۲ | مدل گزارش فیلد | ~~دو سطح: `field_report` (وضعیت+گردشکار) + `field_report_item` (وضعیت per-item). در دومرحله‌ای، مدیر تأیید نهایی کل گزارش~~ گزارش فقط ظرف است و وضعیتش از آیتم‌ها مشتق می‌شود؛ هر آیتم ماشین حالت خودش را دارد و مرحلهٔ دوم روی آیتم است (D08) |
| ۳ | وزن‌ها | ~~فقط وزن نسبی در والد ذخیره؛ سهم پروژه با ltree محاسبه. وزن‌های خالی → توزیع خودکار بر اساس مدت + `weight_source` + هشدار در UI~~ وزن نسبی در والد با `numeric(7,4)`؛ مولدها و قواعد D04؛ سهم پروژه را ماژول محاسبات ذخیره می‌کند (D07) |
| ۴ | CBS | کاتالوگ سراسری در سازمان + درخت CBS پروژه‌ای |
| ۵ | Multi-tenancy | Schema مشترک + ستون `organization_id`. نقش org-level (owner/admin/member) + نقش project-level (کاستوم) |
| ۶ | تاریخ‌ها | Gregorian DATE در DB، تبدیل شمسی در اپ |
| ۷ | پیشرفت | ~~`actual_progress` ذخیره روی leaf؛ `planned_progress` محاسبه؛ والدها محاسبه؛ `progress_snapshot` برای S-Curve~~ همهٔ مقادیر مشتق (برنامه‌ای، واقعی، والدها، EVM) را ماژول محاسبات از روی واقعیت‌ها حساب و **ذخیره** می‌کند؛ صفحه فقط می‌خواند (D07)؛ snapshot روزانه (D06) |
| ۸ | تنظیمات | `project_settings` ۱:۱ + جداول جدا (notification/holiday/integration/backup). ارث‌بری از سازمان با snapshot |
| ۹ | شناسه‌ها | ~~**bigint IDENTITY** برای جداول داخلی (نه UUID). UUID فقط برای sync موبایل در آینده بررسی شود~~ **UUID** برای همه (C01)؛ گزارش، آیتم و عکس در گوشی شناسه می‌گیرند (D10) |
| ۱۰ | حذف نرم | ~~فقط orgs/projects/users. WBS/CBS: حذف واقعی + اعتبارسنجی ارجاعی، یا `archived_at`~~ جدول نگه‌داری `docs/backend/05` ۱۱: حذف پروژه با مهلت ۱۴ روزه (F02 ۸.۴)، کاربر `disabled`، واقعیت‌ها هرگز، ساختار در نسخهٔ کاری حذف نرم (`wbs.md` ۵.۶) |
| ۱۱ | گزارش سراسری/پروژه‌ای | یک موجودیت با `project_id`، دو کوئری |
| ۱۲ | Audit/activity | ~~`activity_log` سراسری + `alerts` جدا~~ `domain_event` (outbox هم‌تراکنش، منبع «فعالیت‌های اخیر») + `audit_log` فقط‌درج + `alert` جدا (D07، D09، F20 ۳، ۶، ۱۰) |

---

## ۵. قواعد کسب‌وکار کلیدی (Business Rules)

### ۵.۱ قاعده توسعه کاتالوگ دسترسی‌ها (بسیار مهم)
هر فیچر جدید که به پنل اضافه می‌شود، اگر ماهیتی دارد که قابل محدودسازی به نقش است، **باید** با یک کلید دسترسی به کاتالوگ اضافه شود (قالب `<module>.<action>`، مثل `cbs.view`, `reports.approve`). هیچ فیچری نباید بدون در نظر گرفتن RBAC پیاده شود. ~~فایل مرجع: `permissions.catalog.ts` در backend.~~ **اصلاح 1405/08/21:** فهرست کدها همان `design/features/access-control.md` ۵.۴ است و در کد در `packages/shared/permissions.ts` می‌نشیند؛ کد تازه اول در سند.

### ۵.۲ گزارش فیلد: یک گزارش = چند آیتم پیشرفت
یک گزارش روزانه شامل چند task است (۲ تا ۵ در یک روز). هر آیتم به یک WBS leaf وصل می‌شود. taskهایی که در گزارش نیامده‌اند «بدون تغییر» محسوب می‌شوند (نه ۰٪).

### ۵.۳ تخصیص انعطاف‌پذیر
سرپرست می‌تواند به ترکیب آزادی از summary و task تخصیص داده شود. انتخاب آبشاری (cascade) با حالت indeterminate. فقط task قابل گزارش‌گیری است؛ درصد summary از فرزندان محاسبه می‌شود.

### ۵.۴ اعتبارسنجی وزن‌ها
مجموع وزن فرزندان هر والد باید ۱۰۰ باشد. اگر نباشد، badge هشدار. وزن‌های خالی/خودکار در UI با رنگ متمایز نشان داده شوند.

### ۵.۵ تأیید چندمرحله‌ای
گردشکار: سرپرست ثبت (۱) → ناظر تأیید آیتم‌به‌آیتم (۲) → در حالت دومرحله‌ای، مدیر تأیید نهایی کل (۳). گزارش تا همه آیتم‌ها تعیین‌تکلیف نشوند به مرحله بعد نمی‌رود. ولیدیشن هنگام ذخیره تنظیمات.

### ۵.۶ ایمن‌سازی داده‌ای
WBS/CBS node با گزارش/اتصال/فرزند → حذف مسدود. archive به‌جای حذف (`archived_at`).

---

## ۶. قاعده وفاداری به تصمیمات

اگر در هر فایل rule یا کد قدیمی الگویی دیدی که با تصمیمات بخش ۴ در تعارض است (مثلاً UUID به‌جای bigint، یا enum ثابت نقش به‌جای نقش کاستوم)، **تصمیمات این فایل برنده است**. کد باید با آن‌ها هم‌خوان باشد.

---

## ۷. زبان پاسخ به کاربر

وقتی با کاربر گفتگو می‌کنی، پاسخ به فارسی طبیعی و حرفه‌ای باشد. کد، نام فنی، و نام متغیر به انگلیسی.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
