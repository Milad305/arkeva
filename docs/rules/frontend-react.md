# قواعد فرانت‌اند پروژه‌یار — React + RTK Query + کیت بوم (نسخهٔ ۲)

> **نسخهٔ ۲ · هم‌تراز با معماری واقعی `frontend/src` پس از بازنویسی بوم و اتصال کامل به سرور (برش ۲۰).**
> نسخهٔ قدیمی (مبتنی بر `designs/*.html`، HeroUI، دادهٔ ماک و RBAC فیک) در [`archive/frontend-react.v0.md`](archive/frontend-react.v0.md) بایگانی شد و دیگر معتبر نیست.
> در صورت هرگونه تعارض با اسناد دامنه، `design/` و `AGENTS.md` ریشه غالب‌اند.

---

## ۱. پشتهٔ فنی واقعی (`frontend/package.json`)

| لایه | انتخاب واقعی در پروژه | نکتهٔ حیاتی |
|---|---|---|
| زبان و ساخت | TypeScript (Strict) + Vite 6 | زیرمسیر استقرار از `VITE_BASE_PATH` می‌آید (`import.meta.env.BASE_URL`) |
| رابط کاربری | React 18 (فقط Functional + Hooks) | بدون هیچ Class Component بجز `ErrorBoundary` |
| استایل و دیزاین‌سیستم | `tokens.css` + `kit.css` + Tailwind CSS 3 + `cva`/`clsx`/`twMerge` | **بدون HeroUI**؛ کامپوننت‌های مشترک در `@/shared/components/ui` مستقیماً کلاس‌های `kit.css` را تولید می‌کنند |
| مدیریت حالت سرور | RTK Query (`baseApi` با `injectEndpoints`) | **صفر ماک**؛ همهٔ ۱۹۲ endpoint مستقیماً به `/v1` سرور وصل‌اند |
| مدیریت حالت کلاینت | Redux Toolkit (`createSlice`) | فقط برای حالت‌های خالص UI و نشست (`authSlice`, `uiSlice`) |
| مسیریابی | React Router v6 (`createBrowserRouter` با `basename: ROUTER_BASENAME`) | بارگذاری تنبل (`React.lazy`) برای همهٔ صفحات ماژول‌ها |
| فرم و اعتبارسنجی | React Hook Form 7 + `@hookform/resolvers` + Zod 3 | نرمال‌سازی ارقام فارسی/عربی ورودی پیش از اعتبارسنجی و ارسال |
| نمودارها | SVG دست‌ساز در `@/shared/components/charts` | **بدون Recharts** یا کتابخانهٔ چارت سنگین بیرونی |
| تاریخ، آیکن و QR | `jalaali-js`، `lucide-react`، `qrcode-generator` | تبدیل میلادی به شمسی فقط در لایهٔ نمایش |
| تست | Vitest + Testing Library (`jsdom`) | تست ابزارها، هوک‌ها و سرویس‌های خالص |

---

## ۲. ساختار پوشه‌ها و مرز ماژول‌ها

```text
frontend/src/
├── app/
│   ├── api/                 # baseApi.ts (تازه‌سازی خودکار نشست با کوکی + هدر CSRF)، tagTypes.ts
│   ├── router/              # routes.tsx (با ROUTER_BASENAME)، ProtectedRoute.tsx
│   └── store/               # Redux store، authSlice، sessionCredentials، هوک‌های تایپ‌شده
├── config/                  # env.ts (اعتبارسنجی Zod)، endpoints.ts، routes.ts، permissions.ts، constants.ts
├── shared/
│   ├── styles/              # tokens.css و kit.css (کپی دقیق design/ui/) + base.css و app.css
│   ├── components/
│   │   ├── ui/              # کتابخانهٔ کامپوننت بوم (AppButton, Modal, Menu, DataTable, TreeTable, ...)
│   │   ├── layout/          # AppShell, Workspace, SettingsLayout, Sidebar, Topbar, AuthShell
│   │   ├── charts/          # SCurveChart, TimeSeriesChart, RingProgress, ChartTooltip, useChartCursor
│   │   ├── feedback/        # ErrorBoundary, EmptyState, Skeleton, ToastHost/toastStore
│   │   └── rbac/            # Guard.tsx
│   ├── hooks/               # useHasAccess, useDisclosure, useFocusTrap, useKeyboardShortcut, ...
│   ├── types/               # api.ts, tone.ts
│   └── utils/               # appUrl.ts, num.ts, date.ts, displayPrefs.ts, apiError.ts, csv.ts, cn.ts, ...
└── modules/<feature>/       # api · components · hooks · layout · pages · services · types
```

- **مسیرهای Import:** همیشه از alias `@/` استفاده کن (مثلاً `@/shared/components/ui`)؛ مسیر نسبی چندسطحی (`../../../`) بیرون از ماژول ممنوع است.
- **کد آرشیوی:** پوشهٔ `frontend/src.old/` خارج از build و صرفاً آرشیو تاریخی است؛ هرگز از آن import نکن و فایل‌هایش را ویرایش نکن.

---

## ۳. قواعد حیاتی معماری و اتصال به بک‌اند

### ۳.۱ ممنوعیت محاسبهٔ کسب‌وکار در فرانت (`D07`)
- هیچ فرمول پیشرفت برنامه‌ای/واقعی، وزن‌دهی والدها، انحراف یا شاخص‌های EVM (`PV`, `EV`, `AC`, `CPI`, `SPI`, `EAC`) در کامپوننت یا سرویس فرانت محاسبه نمی‌شود؛ همه از بک‌اند (`modules/computation`) خوانده می‌شوند.
- سرویس‌های فرانت (`modules/<name>/services/` و `@/shared/utils/`) فقط منطق نمایشی، اعتبارسنجی فرم، نرمال‌سازی متن/ارقام فارسی و تبدیل تاریخ/فرمت را نگه می‌دارند.

### ۳.۲ شبکه، نشست و RTK Query
- همهٔ مسیرهای API در `@/config/endpoints.ts` متمرکزند؛ نوشتن رشتهٔ مسیر خام در کامپوننت ممنوع است.
- هر ماژول endpointهای خود را با `baseApi.injectEndpoints` در `modules/<feature>/api/` تعریف می‌کند و تگ‌های کش (`providesTags` / `invalidatesTags`) را از `@/app/api/tagTypes` می‌گیرد. `refetch()` دستی در `useEffect` ممنوع است.
- `baseApi` به‌طور خودکار `Authorization: Bearer <token>`، `credentials: 'same-origin'` و سرآیند ضد CSRF `X-Requested-With: projeyar` را می‌فرستد و روی `401` (`SESSION_EXPIRED` / `AUTH_REQUIRED`) یک تازه‌سازی واحد هم‌زمان (`POST /auth/refresh`) انجام می‌دهد؛ این سازوکار را در ماژول‌ها تکرار نکن.
- زمانی که کاربر مجوز `cbs.view_amounts` ندارد، سرور فیلدهای مبلغی را `null` برمی‌گرداند (`@Amounts`)؛ کامپوننت‌ها باید حالت `null` مبلغ را تمیز و بدون خطا یا نمایش `0` کاذب رندر کنند.

### ۳.۳ مسیریابی و زیرمسیر استقرار (`/panel/`)
- پنل ممکن است در ریشه (`/`) یا زیرمسیر (`/panel/` روی سرور دمو) مستقر شود.
- برای پیمایش داخلی همیشه از `<Link to={...}>` یا `navigate(...)` همراه با ثابت‌های `@/config/routes.ts` استفاده کن (که خودکار `ROUTER_BASENAME` را رعایت می‌کنند).
- **برای ساخت URL کامل جهت کپی در کلیپ‌بورد یا اشتراک‌گذاری، هرگز `${window.location.origin}/...` ننویس!** همیشه از تابع `appLink(path)` در `@/shared/utils/appUrl` استفاده کن تا زیرمسیر `BASE_URL` لحاظ شود.

### ۳.۴ کنترل دسترسی نمایشی (`D11`)
- **ممنوعیت مطلق بررسی نام نقش:** هرگز `user.role === '...'` ننویس.
- محافظت مسیرها با `<ProtectedRoute permissions={[...]} />` و محافظت دکمه‌ها/ستون‌ها/عملیات با `<Guard permissions={[...]}>` یا هوک‌های `useHasAccess`، `useHasPermission` و `useScopeFor` از `@/shared/hooks/useHasAccess` انجام می‌شود (کدها از `@projeyar/shared`).

---

## ۴. سیستم طراحی، RTL، فارسی و چیدمان واکنش‌گرا

### ۴.۱ مرجع بصری و کامپوننت‌های کیت
- مرجع بصری فقط `design/ui/` (`tokens.css`، `kit.css`، `boards/*.dc.html` و گالری زندهٔ `/_kit`) است — **هرگز به `designs/*.html` قدیمی رجوع نکن.**
- در صورت اختلاف جزئی میان آرت‌بورد بوم و قواعد دامنه (`design/01-foundation-decisions.md` و `design/features/*.md`)، **سند دامنه برنده است** (مثلاً «در خطر» شاخص مشتق است نه وضعیت `Project.status`؛ ویرایش WBS/CBS همیشه روی نسخهٔ کاری `PlanDraft` است نه جدول جاری).
- به توکن‌های رنگ وفادار بمان: رنگ اقدام اصلی `primary-700` و دکمهٔ تأیید `success-700`.

### ۴.۲ تایپوگرافی، ارقام، کدها و جهت‌دهی
- بدون ایموجی در هیچ جای رابط کاربری. پیام‌های خطا باید فارسی طبیعی، بدون سرزنش و دارای یک راه ادامه باشند.
- **ارقام:** همهٔ اعداد نمایشی از `toFaDigits` / توابع `@/shared/utils/num` بگذرند تا با ترجیح نمایشی کاربر در حساب من (`W32`، `@/shared/utils/displayPrefs`) هم‌خوان بمانند.
- **کدها و ورودی‌های لاتین:** کدهای WBS، CBS، `PRJ-...`، `FR-...`، `RSK-...`، ایمیل، موبایل و `traceId` با فونت مونواسپیس (`JetBrains Mono`) و `dir="ltr"` نمایش داده شوند.
- **فرمول‌ها و کیلومتراژ:** هر سطر فرمول در دیالوگ توضیح («این عدد از کجا آمد؟»، مثل `CPI = EV ÷ AC`) باید `dir="ltr"` داشته باشد تا در متن RTL وارونه نشود. عبارات کیلومتراژ لاتین درون عناوین فارسی (مثل `1+000–1+050`) را با `<bdi>` ایزوله کن.
- **نمودارها:** سری‌های زمانی (S-Curve، روند مصرف) **چپ‌به‌راست (LTR)**؛ گانت و heatmap **راست‌به‌چپ (RTL)**.
- **تراز عمودی آیکن کنار متن:** آیکن‌های `lucide-react` در دکمه‌ها و بج‌ها باید فرزند مستقیم ظرف `inline-flex items-center` باشند (نه پیچیده‌شده درون `<span>` متن) و `shrink-0` بگیرند.

### ۴.۳ الگوهای تثبیت‌شدهٔ چیدمان و UI (پرهیز از باگ‌های شناخته‌شده)
1. **چیدمان ۱۲۸۰ تا ۱۹۲۰ بدون اسکرول افقی صفحه:** برای صفحه‌های سه‌پنلی (فیلتر + جدول/درخت + جزئیات) از کامپوننت `@/shared/components/layout/Workspace` استفاده کن که بر اساس عرض ظرف بین حالت سه‌ستونه، کشوی کناری جزئیات و کشوی فیلتر جابه‌جا می‌شود؛ هرگز `grid-cols` با پیکسل‌های ثابت عریض ننویس.
2. **مودال‌ها (`Modal`):** اندازهٔ مودال را فقط با پراپ‌های خود `Modal` (`maxWidth`) بده؛ هرگز کلاس `.lg` روی `.modal` نگذار (با کلاس راهنمای نمودار `.lg` در `kit.css` تداخل دارد).
3. **منوهای بازشو (`Menu`):** برای منوی سه‌نقطهٔ ردیف جداول و کارت‌ها فقط از `@/shared/components/ui/Menu` استفاده کن (در Portal با موقعیت ثابت رندر می‌شود و درون `.tbl-wrap` یا `.card` بریده نمی‌شود).
4. **درخت‌های بزرگ (`TreeTable`):** برای درخت WBS و CBS از `TreeTable` مشترک (دارای مجازی‌سازی برای ۵٬۰۰۰ آیتم، سرستون چسبان و ناوبری صفحه‌کلید RTL) استفاده کن.
5. **ورودی فایل:** از کامپوننت فارسی `Dropzone` استفاده کن، نه `<input type="file">` خام مرورگر.

---

## ۵. کیفیت کد و چک‌لیست پیش از تحویل

- بدون `any`، بدون `console.log`، بدون تایپ DTO به‌صورت inline درون کامپوننت (تایپ‌ها در `modules/<name>/types/`).
- سقف حجم هر فایل: **۳۰۰ خط نرم، ۶۰۰ خط سخت** — اگر بزرگ‌تر شد به کامپوننت‌ها، هوک‌ها یا سرویس‌های کوچک‌تر بشکن.
- چک‌لیست پایانی هر تغییر در `frontend/`:
  - [ ] `pnpm --dir frontend run typecheck` بدون خطا
  - [ ] `pnpm --dir frontend run lint` بدون خطا
  - [ ] `pnpm --dir frontend run test` سبز
  - [ ] اگر تغییر دیداری است، آزمون در مرورگر طبق مهارت `projeyar-dev-verify`
