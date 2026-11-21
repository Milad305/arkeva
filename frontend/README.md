# پروژه‌یار — فرانت‌اند (React)

سامانه مدیریت پروژه‌های عمرانی ایرانی — مکمل Microsoft Project.

> **قواعد توسعه:** قبل از هر تغییری، `../docs/rules/frontend-react.md` و `../AGENTS.md` را بخوانید.
> **مرجع بصری:** `../designs/*.html` — به‌خصوص `Design System.html` که منبع حقیقی رنگ/فونت/کامپوننت‌هاست.

---

## شروع سریع

```bash
npm install        # نصب وابستگی‌ها
npm run dev        # اجرای dev server روی http://localhost:5173
npm run build      # build production
npm run typecheck  # بررسی تایپ بدون emit
npm run lint       # eslint
npm run format     # prettier
```

فایل `.env` از روی `.env.example` بسازید.

---

## استک فنی

| لایه | انتخاب |
|---|---|
| زبان | TypeScript (strict — ممنوع `any`) |
| UI | React 18 (فقط Functional + Hooks) |
| State سرور | RTK Query |
| State کلاینت | Redux Toolkit (`createSlice`) |
| مسیریابی | React Router v6 (lazy-loaded) |
| استایل | Tailwind CSS + `cva` (Custom، نه HeroUI) |
| فرم | React Hook Form + Zod |
| فونت | Vazirmatn (RTL) |
| آیکن | Lucide React |

> **نکته:** طبق تصمیم، HeroUI استفاده نمی‌شود چون `Design System.html` کاملاً سفارشی است.
> همه کامپوننت‌ها به‌صورت wrapper در `@/shared/components/ui` پیاده‌سازی شده‌اند.

---

## ساختار پوشه

```
src/
├── app/                          # پیکربندی سراسری
│   ├── api/baseApi.ts            # هسته RTK Query + ApiResponse<T> + extraOptions
│   ├── router/                   # routes.tsx, ProtectedRoute
│   └── store/                    # store, uiSlice, authSlice, hooks, listenerMiddleware
├── assets/styles/globals.css     # استایل پایه (مطابق Design System)
├── config/                       # env.ts, endpoints.ts, constants.ts, permissions.ts
├── modules/                      # ماژول‌های فیچر
│   └── auth/pages/LoginPage.tsx  # (سایر ماژول‌ها به‌زودی)
├── shared/
│   ├── components/
│   │   ├── ui/                   # AppButton, FormInput, Badge, Card, Tabs, ... (همه wrapperها)
│   │   ├── layout/               # AppShell, Sidebar, Topbar
│   │   ├── feedback/             # ErrorBoundary
│   │   └── rbac/                 # Guard
│   ├── hooks/useHasAccess.ts     # hook RBAC
│   ├── utils/                    # cn, formatJalaliDate, formatRials, toPersianDigits
│   └── types/api.ts              # ApiResponse<T>, ApiError
├── App.tsx
└── main.tsx
```

---

## کامپوننت‌های UI آماده

همه از `@/shared/components/ui` import می‌شوند:

| کامپوننت | توضیح |
|---|---|
| `AppButton`, `AppIconButton` | ۵ variant (primary/secondary/outline/ghost/destructive) × ۳ size + isLoading |
| `Badge`, `DotBadge` | solid / soft / numeric |
| `Card`, `CardHeader`, `CardBody`, `CardFooter` | کارت استاندارد |
| `FormInput`, `FormTextarea` | ورودی فرم با label/error/helper/icon |
| `Avatar`, `AvatarGroup` | آواتار با حروف اول |
| `Breadcrumb` | مسیر با فلش RTL |
| `Tabs` | underline / pill، با badge |
| `LinearProgress`, `DualProgress`, `CircularProgress` | نوار پیشرفت |
| `Alert` | ۴ severity (success/warning/error/info) |
| `Checkbox`, `RadioGroup`, `Switch` | کنترل‌های انتخاب (با indeterminate برای cascade) |
| `Tooltip` | راهنمای hover |
| `EmptyState` | حالت خالی |
| `Skeleton`, `TableSkeleton` | حالت لودینگ shimmer |
| `Modal` | مودال با ۳ اندازه (sm/md/lg) + backdrop blur + ESC |

---

## قواعد کلیدی

1. **ممنوع `any`** — از `unknown` + narrowing استفاده کنید.
2. **Import مطلق** با `@/` — ممنوع `../../../`.
3. **hookهای تایپ‌شده** — `useAppDispatch`/`useAppSelector` از `@/app/store`، نه خام.
4. **بدون `console.log`** — فقط `console.error` در catch.
5. **هر query باید `providesTags`** و **هر mutation باید `invalidatesTags`** داشته باشد.
6. **loading/toast سراسری** از طریق `extraOptions` روی endpoint — نه محلی در کامپوننت.
7. **فرم‌ها با RHF + Zod** — schema در `modules/[name]/services/`.
8. **RBAC با `<Guard permissions={['wbs.create']}>`** — ممنوع `{user.role === ...}`.
9. **تاریخ شمسی در نمایش**، اما داده Gregorian — از `formatJalaliDate` استفاده کنید.
10. **وفاداری به Design System** — رنگ/فونت/شعاع از Tailwind config (مستخرج از `Design System.html`).

---

## وابستگی‌های کلیدی

- `@reduxjs/toolkit` + `react-redux` — state management
- `@reduxjs/toolkit/query/react` — RTK Query
- `react-router-dom` v6 — routing
- `tailwindcss` + `class-variance-authority` + `clsx` + `tailwind-merge` — styling
- `react-hook-form` + `zod` + `@hookform/resolvers` — forms/validation
- `lucide-react` — icons
- `dayjs` + `dayjs-jalali` — تاریخ شمسی
- `react-toastify` — toast notifications
