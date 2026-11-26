# قواعد لایهٔ فرانت‌اند (`frontend/`) — Antigravity

پیش از ایجاد یا ویرایش هر فایلی در `frontend/`:
1. مرجع کامل استانداردهای این لایه **`docs/rules/frontend-react.md`** (نسخهٔ ۲) است.
2. مشخصات رفتار، داده‌ها و دسترسی هر صفحه را از **`design/features/<feature>.md`** و جدول مسیرهای **`design/code-mapping.md`** بررسی کن.
3. مرجع بصری فقط **`design/ui/`** (`tokens.css`, `kit.css`, `boards/*.dc.html` و مسیر `/_kit`) است — **پوشهٔ `designs/` و `frontend/src.old/` آرشیو تاریخی‌اند و استفاده از آن‌ها ممنوع است.**

## حیاتی‌ترین قواعد اجرایی این پوشه
- **صفر ماک، صفر محاسبهٔ کسب‌وکار (`D07`):** همهٔ endpointها با RTK Query (`baseApi.injectEndpoints`) به `/v1` سرور می‌روند. هیچ فرمول پیشرفت، وزن، انحراف یا EVM در فرانت محاسبه نشود.
- **کیت طراحی بوم (بدون HeroUI و بدون Recharts):** از کامپوننت‌های `@/shared/components/ui`، چیدمان `@/shared/components/layout/Workspace` (واکنش‌گرا در ۱۲۸۰ تا ۱۹۲۰ بدون اسکرول افقی صفحه) و نمودارهای SVG دست‌ساز در `@/shared/components/charts` استفاده کن.
- **زیرمسیر استقرار (`/panel/`):** مسیریاب از `ROUTER_BASENAME` استفاده می‌کند. برای ساخت پیوند قابل کپی یا اشتراک‌گذاری **هرگز** `window.location.origin + ...` ننویس؛ همیشه `appLink(path)` از `@/shared/utils/appUrl` را به کار ببر.
- **کنترل دسترسی (`D11`):** بررسی نام نقش (`user.role === ...`) ممنوع است؛ فقط `<ProtectedRoute>`، `<Guard>` و هوک‌های `useHasAccess` / `useHasPermission` / `useScopeFor` با کدهای `@projeyar/shared`. حالت `null` فیلدهای ریالی (وقتی کاربر `cbs.view_amounts` ندارد) را بدون خطا یا نمایش صفر کاذب مدیریت کن.
- **فارسی، RTL و جزئیات UI:**
  - بدون ایموجی؛ پیام خطا بی‌سرزنش و با یک راه ادامه.
  - همهٔ اعداد نمایشی از `toFaDigits` / `@/shared/utils/num` بگذرند؛ کدها (`PRJ-`, `FR-`, `RSK-`, WBS/CBS) و سطرهای فرمول ریاضی با `dir="ltr"` و کیلومتراژ درون متن فارسی با `<bdi>`.
  - روی `Modal` کلاس اندازهٔ `.lg` نگذار (با `.lg` راهنمای نمودار در `kit.css` تداخل دارد؛ از `maxWidth` استفاده کن). منوهای سه‌نقطه فقط با کامپوننت پرتال `Menu`، و آیکن‌های `lucide-react` فرزند مستقیم ظرف فلکس با `shrink-0`.
- **کیفیت و راستی‌آزمایی:** بدون `any` و بدون `console.log`؛ سقف فایل ۳۰۰ خط نرم / ۶۰۰ سخت؛ در پایان `typecheck`، `lint` و `test` سبز باشند و تغییرات دیداری با مهارت `projeyar-dev-verify` در مرورگر بررسی شوند.
