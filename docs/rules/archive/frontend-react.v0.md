# قواعد فرانت‌اند — React Enterprise (RTL فارسی)

> این فایل مرجع حقیقی استانداردهای فرانت‌اند پروژه‌یار است. قبل از نوشتن هر کدی در `frontend/`، این فایل را کامل بخوان. فایل‌های طراحی قطعی در `designs/` مرجع بصری هر صفحه‌اند.

---

## ۱. استک فنی

| لایه | انتخاب |
|---|---|
| زبان | TypeScript (Strict Mode) |
| UI | React (فقط Functional + Hooks) |
| State سرور | RTK Query |
| State کلاینت | Redux Toolkit (`createSlice` فقط برای UI state) |
| مسیریابی | React Router v6+ |
| استایل | Tailwind CSS + HeroUI + `cva` |
| فرم | React Hook Form + Zod |
| فونت | Vazirmatn (پیش‌فرض `font-sans`) |
| جهت | RTL (راست‌به‌چپ) |

### قواعد سخت‌گیرانه
- **ممنوع `any`** — از `unknown` + narrowing یا interface استفاده کن.
- **بدون `console.log`** — فقط `console.error` در catch blocks.
- **بدون mutation مستقیم state**.
- **حجم فایل**: حد نرم ۳۰۰ خط، حد سخت ۶۰۰ خط.
- **عدم import کتابخانه نصب‌نشده** — اگر لازم بود، دستور npm install را پیشنهاد بده.

---

## ۲. معماری — Modular Feature-Driven

```
frontend/src/
├── app/                     # پیکربندی سراسری
│   ├── store/               # Redux store, listenerMiddleware, uiSlice, hooks.ts
│   ├── api/                 # baseApi.ts (هسته RTK Query)
│   ├── router/              # routes.tsx, ProtectedRoute.tsx
│   └── App.tsx
├── assets/                  # فونت‌ها (Vazirmatn)، تصاویر، استایل سراسری
├── config/                  # env.ts (Zod-validated), endpoints.ts, constants.ts
├── shared/                  # مشترکات
│   ├── components/
│   │   ├── ui/              # AppButton, FormInput, FormSelect, ...
│   │   ├── layout/          # AppShell, Sidebar, Topbar
│   │   └── feedback/        # ErrorBoundary
│   ├── hooks/               # useHasAccess, useCurrentUser, ...
│   └── utils/               # cn(), formatDate, formatCurrency, ...
├── modules/                 # ماژول‌های فیچر
│   └── [module]/
│       ├── api/             # endpointهای RTK Query این ماژول
│       ├── components/      # UI مخصوص ماژول
│       ├── hooks/           # منطق UI
│       ├── layout/          # layout تودرتو مخصوص ماژول
│       ├── services/        # schemaهای Zod، منطق domain خالص
│       ├── store/           # sliceهای RTK (state کلاینت)
│       ├── types/           # interface و DTO این ماژول
│       └── index.ts         # barrel file
└── main.tsx
```

### قواعد
- **Barrel files**: همیشه `index.ts` برای export API عمومی پوشه.
- **Import مطلق**: همیشه `@/` (مثلاً `@/shared/components/ui`). **ممنوع** `../../../`.
- **جداسازی منطق**:
  - منطق UI → `hooks/`
  - منطق domain/محاسبات → `services/` یا `utils/`
  - state سرور/کلاینت → `api/` و `store/`

---

## ۳. کیفیت و TypeScript

### بدون Magic String — مرکزیت endpoints
```typescript
// config/endpoints.ts
export const ENDPOINTS = {
  PROJECTS: '/projects',
  PROJECT_DETAILS: (id: number) => `/projects/${id}`,
  WBS_TREE: (projectId: number) => `/projects/${projectId}/wbs`,
} as const;
```

### اعتبارسنجی env با Zod
```typescript
// config/env.ts — import.meta.env را با Zod اعتبارسنجی کن، سپس env.VARIABLE استفاده کن
```

### Early Returns (Guard Clauses)
```typescript
if (!data) return null;
if (data.length === 0) return <EmptyState />;
// render عادی
```

### Genericها به‌جای any
برای utilityها و hookهای قابل‌استفاده مجدد، از generic استفاده کن.

---

## ۴. State Management (RTK Query + Redux)

### Hookهای تایپ‌شده
همیشه از `useAppDispatch` و `useAppSelector` تایپ‌شده از `@/app/store/hooks` استفاده کن. **ممنوع** import خام `useDispatch`/`useSelector`.

### DTOهای سخت‌گیرانه
هرگز entity خام را به mutation نده. همیشه یک نوع `DTO` برای request بساز.

### رفتار سراسری API (حیاتی)
Loading و Toast سراسری را از طریق `extraOptions` در RTK Query هندل کن — **نه محلی در کامپوننت**.

```typescript
createProject: builder.mutation({
  query: (body) => ({ url: ENDPOINTS.PROJECTS, method: 'POST', body }),
  invalidatesTags: [{ type: 'Project', id: 'LIST' }],
  extraOptions: {
    showGlobalLoading: true,
    loadingMessage: 'در حال ساخت پروژه...',
    showSuccessToast: true,
    successMessage: 'پروژه با موفقیت ایجاد شد',
  },
})
```

### Cache Management
هر Query باید `providesTags`، و هر Mutation باید `invalidatesTags` داشته باشد. **ممنوع** `refetch()` دستی در `useEffect`.

### Server vs Client State
- RTK Query → state سرور.
- `createSlice` → **فقط** state کلاینت (toggle modal، فیلتر محلی، و غیره).

---

## ۵. استایل (HeroUI + Tailwind + RTL)

### پایه RTL/فارسی
- از **logical properties** استفاده کن: `ps-4`, `pe-4`, `ms-2`, `me-2`. **ممنوع** `pl/pr/ml/mr`.
- فونت پیش‌فرض: `Vazirmatn` به‌عنوان `font-sans`.

### ممنوعیت‌ها
- **ممنوع** import مستقیم `@heroui/react` در `modules/*`. همیشه از wrapperهای `@/shared/components/ui` استفاده کن.
- **ممنوع** `styled-components`. فقط Tailwind و `cva`.
- هنگام wrap کردن HeroUI، از prop `classNames` (object از slotها) استفاده کن، نه `className`.

### ادغام کلاس‌ها
همیشه از utility `cn()` (`twMerge` + `clsx`) برای کلاس‌های شرطی استفاده کن. **ممنوع** ternary پیچیده در `className`.

### رنگ‌ها — از Design System موجود
مرجع رنگ: `designs/Design System.html`. Primary آبی سرمه‌ای، Accent نارنجی گرم، Status (success/warning/error/info). همیشه از CSS variables/Tailwind config استفاده کن، نه HEX hardcoded.

---

## ۶. فرم و اعتبارسنجی (RHF + Zod)

### Schema-First
همیشه اول Zod schema را در `modules/[name]/services/` بساز، بعد فرم. نوع فرم را با `z.infer` مشتق کن.

### ممنوع `useState` برای input
همیشه `react-hook-form`.

### Wrapperهای فرم
**ممنوع** HeroUI input خام در فرم. از `FormInput`, `FormSelect` عمومی در `@/shared/components/ui` که به `Controller` وصل‌اند، استفاده کن.

### شماره‌های فارسی
اگر input عددی است (تلفن، مبلغ)، از `.transform()` در Zod برای تبدیل ارقام فارسی به انگلیسی قبل از validation/API استفاده کن.

### inputهای RTL/LTR
برای فیلدهای email، تلفن، رمز — `dir="ltr"` روی input بزن، ولی label فارسی نگه دار.

---

## ۷. مسیریابی و کنترل دسترسی (RBAC)

### Lazy Loading
همه pageها در `modules/*/pages/` باید با `React.lazy()` بارگذاری شوند.

### Route Config
همه routeها در `@/app/router/routes.tsx` تعریف شوند. **ممنوع** تعریف route در `App.tsx`.

### Nested Layouts
از `<Outlet />` استفاده کن. Layout سراسری در `@/shared/components/layout/`، layout ماژول در `modules/[name]/layout/`.

### محافظت route
`<ProtectedRoute permissions={['wbs.create']}>` برای routeهای خصوصی یا محدود.

### RBAC کامپوننت
**ممنوع** `{user.role === 'admin' ? <Button/> : null}`.
- همیشه `<Guard permissions={['wbs.create']}><Button/></Guard>` wrapper.
- از `useHasAccess(['wbs.create'])` برای منطق شرطی (مثل مخفی‌کردن ستون جدول) استفاده کن.

> **نکته**: دسترسی‌ها بر اساس **کاتالوگ permissionها** چک می‌شوند (مثل `wbs.create`)، نه نام نقش. مدل RBAC بک‌اند نقش کاستوم + snapshot است — فرانت فقط permission را چک می‌کند.

---

## ۸. Error Boundaries

- فقط از class component `ErrorBoundary` در `@/shared/components/feedback/ErrorBoundary.tsx` استفاده کن. جای دیگری class component ننویس.
- `<Outlet />` در layoutها با `<ErrorBoundary>` wrap شود تا sidebar/header کرش نکنند.
- برای ویجت‌های سنگین (چارت، جدول): `<ErrorBoundary fallback={<CustomError/>}>`.
- `componentDidCatch` باید خطاها را log کند (console در dev، Sentry در prod).
- خطای API توسط middleware سراسری RTK Query هندل می‌شود. خطای render توسط `<ErrorBoundary>`.

---

## ۹. تاریخ و اعداد فارسی (مخصوص این پروژه)

### تاریخ شمسی
- بک‌اند تاریخ را **Gregorian** (ISO string) می‌فرستد.
- تبدیل به شمسی در لایه نمایش: utility `formatJalaliDate(isoString)` در `@/shared/utils`.
- کتابخانه پیشنهادی: `dayjs` با plugin جلالی یا `jalaali-js`.
- نمایش با ارقام فارسی: `۱۴۰۴/۰۳/۰۱`.

### اعداد فارسی
- داده ذخیره‌شده و محاسبات با اعداد انگلیسی.
- فقط در نمایش، ارقام به فارسی تبدیل می‌شوند: utility `toPersianDigits(num)`.
- برای input عددی، Zod `.transform()` ارقام فارسی → انگلیسی (بخش ۶).

### واحد پول
- مبلغ از API به‌صورت عدد کامل ریال می‌آید.
- نمایش با suffix «میلیارد ﷼» برای مبالغ بزرگ: `formatRials(amount)` → `۸۵۰ میلیارد ﷼`.

---

## ۱۰. مرجع بصری — فایل‌های طراحی

وقتی صفحه‌ای می‌سازی، فایل HTML مربوطه در `designs/` را باز کن و چیدمان/فیلدها/حالت‌ها را **وفادارانه** پیاده کن. نگاشت صفحات:

| صفحه | فایل طراحی | ماژول |
|---|---|---|
| ورود + OTP | `designs/Login.html` | `modules/auth` |
| داشبورد | `designs/Dashboard.html` | `modules/dashboard` |
| لیست پروژه‌ها | `designs/Projects.html` | `modules/projects` |
| جزئیات پروژه | `designs/Project.html` | `modules/projects` |
| WBS | `designs/WBS.html` | `modules/wbs` |
| CBS | `designs/CBS.html` | `modules/cbs` |
| اتصالات | `designs/Links.html` | `modules/links` |
| اعضا | `designs/Members.html` | `modules/members` |
| گزارش‌های فیلد | `designs/FieldReports v2.html` | `modules/field-reports` |
| نمودارها | `designs/Charts.html` | `modules/charts` |
| تنظیمات | `designs/Settings.html` | `modules/settings` |
| مودال‌ها | `designs/Modals.html` | کامپوننت‌های مشترک |
| Context Menus | `designs/ContextMenus.html` | کامپوننت‌های مشترک |
| Design System | `designs/Design System.html` | مرجع رنگ/فونت/کامپوننت |

### قاعده وفاداری
- به طرح موجود وفادار بمان. بهبود بصری فقط با تأیید صریح.
- حالت‌های پویا (modal باز، dropdown، panel باز) هم پیاده شوند، نه فقط حالت پیش‌فرض.
- اگر فایل HTML از چند حالت نمایش می‌دهد (مثلاً Login: عادی/loading/error/OTP)، همه پیاده شوند.

---

## ۱۱. ⚠️ قاعده حیاتی: بازنویسی وفادارانه، نه «بازسازی با کامپوننت‌های عمومی»

این مهم‌ترین قاعده پیاده‌سازی صفحات است. هنگام ساخت هر صفحه‌ای که فایل HTML مرجع دارد، این قاعده را **کامل** بخوان و رعایت کن.

### مشکل
وقتی یک فایل طراحی (مثلاً `Login.html`) ساختار و استایل مخصوص به خودش دارد، وسوسه‌انگیز است که از کامپوننت‌های عمومی (`AppButton`, `FormInput`, `Card`, و غیره) استفاده کنی و بگویی «تقریباً شبیهش است». این **اشتباه** است. فایل‌های طراحی مقادیر دقیق دارند که با مقادیر پیش‌فرض کامپوننت‌های عمومی **فرق می‌کنند** و نتیجه نهایی با طرح اصلی متفاوت می‌شود.

مثال‌های واقعی از تفاوت‌هایی که نادیده گرفته شدند:
- ارتفاع فیلد در `Login.html` = **42px**، ولی کامپوننت `FormInput` عمومی = **38px**
- ارتفاع دکمه در `Login.html` = **44px**، ولی `AppButton` size="lg" = **44px** ولی default = **36px**
- رنگ پس‌زمینه پنل گرافیک = **`#0E1E38` (primary-900)**، نه `bg-primary-700`
- presence/absence عناصر: pill با pulse، eyebrow، divider، stat card‌ها، topbar-meta

### قاعده اجباری

وقتی صفحه‌ای می‌سازی که فایل HTML مرجع دارد (`designs/*.html`):

۱. **ابتدا کل فایل HTML را بخوان** — نه فقط ساختار، بلکه هر مقدار CSS (رنگ HEX دقیق، ارتفاع، padding، radius، shadow، font-size).

۲. **هر صفحه، استایل مخصوص خودش را دارد.** حتی اگر فکر می‌کنی کامپوننت عمومی «کافیه»، احتمالاً کافی نیست. فایل‌های طراحی اغلب:
   - ارتفاع فیلد/دکمه متفاوتی دارند (مثلاً Login: 42px/44px، Projects: 38px/36px)
   - رنگ‌های پس‌زمینه مخصوص دارند (نه فقط token‌های tailwind)
   - عناصر تزئینی دارند (gradient، grid pattern، pulse dot، eyebrow)
   - چیدمان‌های منحصربه‌فرد دارند (split layout، grid خاص)

۳. **کامپوننت‌های عمومی برای state‌های داخل اپ استفاده شوند** (داخل AppShell: جداول، کارت‌ها، فرم‌های تنظیمات)، نه برای صفحات تمام‌صفحه با طراحی منحصربه‌فرد مثل Login.

۴. **ارزیابی: «آیا این صفحه استایل مخصوص دارد؟»** — اگر فایل HTML آن، استایل‌هایی دارد که با کامپوننت‌های عمومی هم‌خوان نیست (مثلاً دکمه 44px نه 36px، یا gradient پس‌زمینه، یا چیدمان split)، آن صفحه را با استایل inline/Tailwind مخصوص خودش بساز.

۵. **هر عنصر در HTML مرجع باید در خروجی باشد.** قبل از پایان، فایل HTML را خط‌به‌خط با خروجی مقایسه کن. عناصر کوچک (eyebrow، divider، footer links، accent dot روی لوگو) نباید جا بیفتند.

۶. **مقادیر دقیق، نه تقریبی.** اگر HTML می‌گوید `height: 42px`، `42px` استفاده کن نه `38px`. اگر می‌گوید `#0E1E38`، آن HEX را مستقیماً بزن نه `bg-primary-700`.

### چک‌لیست قبل از اعلام «صفحه تمام شد»
- [ ] کل فایل HTML خوانده شد.
- [ ] همه مقادیر CSS (HEX، px، radius) استخراج و اعمال شدند.
- [ ] همه state‌ها (normal/loading/error/empty/...) پیاده شدند.
- [ ] همه عناصر تزئینی (gradient، pattern، pulse، eyebrow، divider) وجود دارند.
- [ ] topbar / footer / header مرجع دقیقاً بازسازی شد.
- [ ] مقایسه نهایی line-by-line با HTML انجام شد.

> **درس منشأ:** این قاعده بعد از بازنویسی صفحه Login اضافه شد، جایی که نسخه اول «تقریباً شبیه» بود ولی ارتفاع فیلد/دکمه، رنگ پس‌زمینه، گرادیان‌ها، pill با pulse، نمودار S-Curve کامل، eyebrow، divider و footer همگی نادیده گرفته شده بودند.

---

## ۱۲. قاعده حیاتی: ساختار آماده اتصال به بک‌اند (Backend-ready)

هر صفحه‌ای را طوری بساز که بعداً بدون بازنویسی ساختار، به API واقعی وصل شود. این یعنی:

### ۱۲.۱ مدل داده هم‌خوان با DTO
- برای هر موجودیت، یک `interface` / `type` در `modules/[name]/types/` تعریف کن که دقیقاً ساختار DTO بک‌اند را منعکس کند (نام فیلدها، nullable بودن، انواع).
- این تایپ‌ها را از کد کامپوننت جدا نگه دار — در `types/dto.ts` یا `types/index.ts`.
- از `ApiResponse<T>` wrapper برای همه پاسخ‌ها استفاده کن (از `@/shared/types/api`).
- **ممنوع** تایپ‌های inline در کامپوننت که بعداً باید جابه‌جا شوند.

### ۱۲.۲ mock data در فایل جدا، قابل تعویض
- داده نمونه را در `modules/[name]/mocks/` یا به‌صورت ثابت کنار endpoint قرار بده — **نه inline در کامپوننت**.
- وقتی API آماده شد، فقط منبع داده عوض می‌شود (mock → RTK Query)، نه ساختار کامپوننت.
- کامپوننت باید با یک پروپ `data` (یا از hook) کار کند که هم از mock و هم از API تغذیه شود.

### ۱۲.۳ endpoint در RTK Query تعریف شود (حتی اگر mock)
- برای هر فیچر، endpoint در `modules/[name]/api/` تعریف کن.
- فعلاً می‌توان `baseQuery` را به گونه‌ای تنظیم کرد که mock برگرداند (یا کاملاً skip کنی)، ولی **ساختار `useGetXxxQuery` / `useXxxMutation`** باید از روز اول وجود داشته باشد.
- وقتی بک‌اند آماده شد، فقط URL واقعی وصل می‌شود — کامپوننت‌ها تغییر نمی‌کنند.

### ۱۲.۴ منطق کسب‌وکار از UI جدا
- محاسبات (درصد پیشرفت، انحراف، اعتبارسنجی وزن‌ها، تبدیل تاریخ) را در `modules/[name]/services/` یا `@/shared/utils` بگذار، نه در کامپوننت.
- این توابع بعداً هم در فرانت و هم در تست‌ها قابل استفاده‌اند.

### ۱۲.۵ لینک‌ها و ناوبری واقعی
- هر دکمه/لینکی که در طراحی به صفحه دیگری می‌رود، باید `<Link to="/...">` یا `navigate()` واقعی داشته باشد — نه `href="#"` یا `onClick={() => {}}`.
- مسیرها با نام منطقی در `@/app/router/routes.tsx` هم‌خوان باشند.

---

## ۱۳. قاعده حیاتی: تکمیل بخش‌های ناقص طرح

فایل‌های `designs/*.html` **طرح کامل نیستند** — بعضی دکمه‌ها، منوها، panel‌ها، و حالت‌ها فقط در سند طراحی (مکالمات) توصیف شده‌اند ولی در HTML نیستند. وظیفه تو:

### ۱۳.۱ تشخیص بخش‌های ناقص
وقتی فایل HTML را می‌خوانی، این‌ها را شناسایی کن:
- دکمه‌ها/لینک‌هایی که هدفشان مشخص نیست (`href="#"`، `onclick` خالی)
- آیکن‌هایی (سه‌نقطه، زنگوله، تنظیمات) که در طراحی فعلی باز نمی‌شوند
- تب‌ها/پنل‌هایی که محتوایشان placeholder است یا خالی
- حالت‌های توصیف‌شده در سند طراحی ولی پیاده‌نشده (مثلاً ویرایش WBS، منوهای سه‌نقطه، پنل نوتیفیکیشن)

### ۱۳.۲ پیاده‌سازی بخش‌های ناقص به سبک طراحی
برای هر بخش ناقص، آن را **به همان سبک و زبان بصری Design System** پیاده کن:
- اگر یک منوی سه‌نقطه در طراحی دیده می‌شود ولی dropdown آن نیست، خودت dropdown را با همان استایل بساز.
- اگر دکمه «ویرایش» در طراحی هست ولی modal ویرایش نیست، modal را مطابق `Modals.html` و Design System بساز.
- **ممنوع** بهانه آوردن که «در HTML نبود» — سند طراحی (مکالمات) مرجع دوم است.

### ۱۳.۳ ثبات بصری
هر چیزی که اضافه می‌کنی باید دقیقاً هم‌سان با Design System باشد: همان رنگ، همان شعاع، همان فاصله، همان typography. هیچ عنصر بیگانه‌ای نباید وارد شود.

---

## ۱۴. قاعده: Layout‌های مشترک را کشف و استفاده کن

بسیاری از صفحات layout مشترک دارند. قبل از ساخت یک صفحه:

۱. **AppShell** (Sidebar + Topbar) برای همه صفحات داخل اپ — از `@/shared/components/layout` استفاده کن، دوباره نساز.
۲. اگر صفحات متعدد یک header/page-layout مشترک دارند (مثلاً همه صفحات پروژه‌ای header sticky با breadcrumb + tabs دارند)، آن را به یک کامپوننت layout جداگانه در `modules/[name]/layout/` استخراج کن.
۳. **ممنوع** کپی‌کردن layout بین صفحات — اگر تکرار شد، کامپوننتش کن.

---

## ۱۵. قاعده: دسترسی (RBAC) — فیک اما فعال

هر route و هر عنصر دارای دسترسی است:

### ۱۵.۱ محافظت route با RBAC (فعلاً فیک)
- routeهای خصوصی را با `<ProtectedRoute>` wrap کن (احراز هویت).
- routeهای محدود به نقش را با `<ProtectedRoute permissions={['wbs.edit']}>` wrap کن.
- فعلاً `useHasAccess` همیشه `true` برمی‌گرداند (فیک) — ولی **ساختار را از روز اول بگذار** تا وقتی API آماده شد، فقط منطق `useHasAccess` عوض شود.

### ۱۵.۲ محافظت عناصر با Guard
- دکمه‌ها/لینک‌هایی که نیاز به دسترسی خاص دارند را با `<Guard permissions={[...]}><Button/></Guard>` wrap کن.
- ستون‌های جدول، آیتم‌های منو، تب‌ها — همه بر اساس دسترسی نشان داده/مخفی شوند.

### ۱۵.۳ چک‌لیست RBAC
- [ ] هر route محافظت‌شده است؟
- [ ] دکمه‌های مخرب (حذف، آرشیو) با Guard محافظت شده‌اند؟
- [ ] تب/منوهای ادمین فقط برای ادمین؟

---

## ۱۶. قواعد رفتار zCode

- **بدون کامنت برای کد بدیهی**. فقط برای منطق پیچیده کسب‌وکار کامنت بگذار.
- **بدون mock data داخل کامپوننت**. اگر لازم بود، پوشه `mocks` بساز.
- **فایل کامل** موقع ساخت فایل جدید، **diff دقیق** موقع ویرایش.
- **متن فارسی**: placeholder، label، پیام موفقیت/خطا همیشه فارسی حرفه‌ای و طبیعی.

---

## ۱۷. ⚠️ قاعده حیاتی: چیدمان آیکن + متن در دکمه/بج (vertical alignment)

این یک باگ خاموش است که در کل UI پخش می‌شود و در ابتدا به‌چشم نمی‌آید، ولی صفحه را ناصاف نشان می‌دهد.

### مشکل
وقتی در یک عنصر `inline-flex items-center` یک آیکن (`<svg>` از `lucide-react`) و یک متن کنار هم قرار می‌گیرند، **متن تعیین‌کننده‌ی baseline خط است و آیکن به بالا هل داده می‌شود** — نه در مرکز vertical.

مثال نمونه‌ی غلط:
```jsx
<button class="inline-flex items-center">
  <Plus class="w-4 h-4" />
  <span>پروژه جدید</span>
</button>
// نتیجه: آیکن ۱۰px بالاتر از مرکز دکمه می‌نشیند، نه در وسط.
```

این به‌خاطر رفتار پیش‌فرض `<svg>` (inline-block با baseline) است که حتی با `alignItems: center` در flexbox درست نمی‌شود، چون span متن baseline را تعریف می‌کند.

### قاعده
وقتی آیکن Lucide و متن در یک عنصر inline-flex کنار هم هستند:

۱. **آیکن باید مستقیم child flex container باشد، نه داخل span متن پیچیده شود.**
   ```jsx
   // درست:
   <button class="inline-flex items-center gap-1.5">
     <Plus class="w-4 h-4 shrink-0 self-center" />
     <span>پروژه جدید</span>
   </button>
   ```

۲. **به آیکن `shrink-0` و `self-center` بده** تا shrink نشود و در محور عمود center بماند:
   ```jsx
   <Plus className="w-4 h-4 shrink-0" />
   ```

۳. **اگر عنصر parent با arbitrary variant ساخته می‌شود** (مثل کامپوننت AppButton)، تضمین کن که آیکن‌ها از children جدا شوند:
   ```jsx
   // AppButton: آیکن‌ها و متن را از هم جدا کن
   const childArray = Array.isArray(children) ? children : [children];
   const iconElements = childArray.filter(c => c != null && typeof c !== 'string' && typeof c !== 'number');
   const textParts = childArray.filter(c => typeof c === 'string' || typeof c === 'number');
   // در render: آیکن‌ها اول (مستقیم child)، متن در span
   ```

### چک‌لیست هنگام ساخت هر دکمه/بج با آیکن
- [ ] آیکن مستقیم child دکمه/بج است (نه داخل span متن)؟
- [ ] آیکن `shrink-0` دارد؟
- [ ] parent `inline-flex items-center` است؟
- [ ] در RTL، ترتیب آیکن → متن درست رندر می‌شود؟ (آیکن سمت راست، متن سمت چپ در LTR visual)

> **درس منشأ**: بعد از ساخت صفحات Projects و Project، آیکن‌های دکمه‌ها در بالای دکمه قرار داشتند به‌جای وسط، چون آیکن در `<span>` متن پیچیده شده بود.
