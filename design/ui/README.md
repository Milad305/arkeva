# design/ui — مرجع بصری

> منبع اصلی: بوم طراحی `https://claude.ai/artifact/B61fPQebYfAakaSiWvXA9g`
> این پوشه کپی محلی همان بوم است تا سند خودکفا بماند (`CLAUDE.md` بخش ۵).

## فایل‌ها

| فایل | چیست |
|---|---|
| `tokens.css` | توکن‌های دیزاین سیستم پروژه‌یار — رنگ، فاصله، شعاع، سایه، ابعاد چیدمان، مقیاس تایپوگرافی |
| `kit.css` | کیت کامپوننت بوم — `.btn`، `.card`، `.tbl`، `.tree`، `.fld`، `.bdg`، `.modal`، `.menu` و … |
| `canvas.json` | فهرست و چیدمان ۷۱ آرت‌بورد با عنوان فارسی هر کدام |
| `boards/*.dc.html` | متن کامل هر آرت‌بورد |

هر دو فایل CSS **عیناً** در `frontend/src/shared/styles/` هم هستند و از همان‌جا بارگذاری می‌شوند. اگر بوم عوض شد، هر دو نسخه باید دوباره export شوند.

## وضعیت `boards/`

کامل نیست. آرت‌بوردها **در لحظهٔ ساخت هر صفحه** اینجا اضافه می‌شوند، نه یک‌جا — چون هر فایل ۵ تا ۳۰ کیلوبایت است و دانلود یک‌جای ۷۱ تا بدون استفاده صرفه ندارد.

موجود (۱۵):

- **کامپوننت مشترک:** `Sidebar`، `Topbar`، `ProjectHeader`، `LoginBrand`
- **ورود:** `W01-Login`، `W02-LoginError`، `W03-Otp`، `W04-ResetPassword`
- **سازمان:** `W05-Dashboard`، `W06-Notifications`، `W07-Projects`
- **پروژه:** `W10-ProjectOverview`
- **ساختار:** `W11-Wbs`
- **گزارش:** `W20-FieldReports`
- **تنظیمات:** `W28-SettingsGeneral`
- **حالت‌ها:** `W46-States`

مانده: `W08`، `W09`، `W12`–`W19`، `W21`–`W27`، `W29`–`W45`، `W47`–`W49`، `Icon`، `MBar`، `MNav`، `Main`، و ۱۴ صفحهٔ اپ `M01`–`M14`.

### افزودن یک آرت‌بورد

```
ابزار Artifact · action: read
url:   https://claude.ai/artifact/B61fPQebYfAakaSiWvXA9g
paths: ["project/W12-WbsEdit.dc.html"]
```
بعد فایل ذخیره‌شده در `design/ui/boards/` کپی شود.

## خواندن یک آرت‌بورد

هر فایل یک صفحهٔ Design Component است:

- `<x-dc>` بدنهٔ markup
- `<script type="text/x-dc">` با `renderVals()` که **دادهٔ نمونه و منطق نمایشی** صفحه را دارد
- `<sc-for list="{{x}}">` تکرار · `<sc-if value="{{x}}">` شرط · `{{a.b}}` جای‌گذاری
- `<dc-import name="Icon" i="chevron-left">` آیکن Lucide با نام kebab-case

هنگام پیاده‌سازی: markup → کامپوننت‌های `shared/components/ui`، منطق `renderVals()` → `services/` یا `shared/utils`، دادهٔ نمونه → `modules/<name>/mocks/`.

## نکتهٔ مهم

بوم مقدم بر قواعد دامنه **نیست**. جاهایی که `design/01-foundation-decisions.md` با بوم اختلاف دارد، سند برنده است. نمونه‌ها:

- **D01** — «تاریخچهٔ نرخ» در W14 یعنی بازنگری بودجه؛ برچسب‌های «صورت‌وضعیت ۶» و «تعدیل» باید به «بازنگری بودجه R2» تغییر کنند. زیرعنوان W22 هم به «هزینهٔ واقعی از دفتر هزینه» عوض می‌شود.
- **D04** — «هر دو شاخص» در W29 روش وزن‌دهی نیست؛ یک تنظیم نمایشی است.
- **D05** — «حالت ویرایش» در W12 یعنی ویرایش نسخهٔ پیش‌نویس، نه ویرایش مستقیم درخت جاری.

شکاف‌های بوم (G1 تا G21) در `design/03-interaction-matrices.md` بخش ۷ و اولویتشان در `design/05-roadmap.md` بخش ۶ است.
