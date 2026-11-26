# قواعد لایهٔ اپ کارگاه (`mobile/`) — Antigravity

پیش از ایجاد یا ویرایش هر فایلی در `mobile/`:
1. مرجع کامل معماری و کدنویسی **`docs/rules/flutter-clean-bloc.md`** است — آن را دقیق رعایت کن.
2. وضعیت برش‌های ساخته‌شده (`M01`–`M14`) و قرارداد دقیق endpointهای اپ در **`mobile/HANDOFF.md`** مستند شده و مشخصات دامنه در **`design/features/field-app.md`** (`F08`) است.

## حیاتی‌ترین قواعد اجرایی این پوشه
- **مرز لایه‌های Clean Architecture (`presentation ──► domain ◄── data`):**
  - لایهٔ `domain/` هیچ وابستگی به `package:flutter`، `dio`، `drift` یا `json_annotation` ندارد؛ خروجی‌ها `Result<T>` (`Ok`/`Err(Failure)`) یا `Stream<T>` هستند و هیچ استثنایی به بیرون پرتاب نمی‌شود.
  - یک ویژگی هرگز از `data/` یا `presentation/` ویژگی دیگر import نمی‌کند.
  - اپ فقط پیش‌نمایش لحظه‌ای پیشرفت (مثل نسبت مقدار به کل، `AC-FA-07`) را در سرویس خالص `domain` نشان می‌دهد؛ عدد سرور پس از همگام‌سازی داور نهایی است (`D07`).
- **آفلاین، امنیت و ضدجعل (`D10`, `F08`):**
  - پایگاه دادهٔ محلی Drift روی **SQLCipher**، توکن‌ها و کلید رمز در `flutter_secure_storage`، و فایل عکس‌های صف با **AES-GCM** روی دیسک خصوصی رمز می‌شوند (محاسبهٔ `sha256` روی بایت‌های JPEG **پیش از رمزنگاری**).
  - **هیچ دسترسی گالری یا `image_picker` مجاز نیست (`AC-FA-04`)** — ثبت عکس فقط از دوربین زنده (`camera`) همراه با مهر زمان/مختصات روی پیکسل در isolate و ارسال پرچم `mockLocation` از `Position.isMocked` (`AC-FA-05`).
  - همهٔ درخواست‌ها سرآیند `X-App-Version` دارند و پاسخ `426 APP_VERSION_UNSUPPORTED` باید از مسیر `AppUpdateGate` به `/update-required` برود، **بدون پاک شدن یا رد شدن صف آفلاین (`Outbox`)**.
- **راست‌به‌چپ و فارسی:** فقط ویجت‌ها و مقادیر جهت‌دار (`EdgeInsetsDirectional`, `AlignmentDirectional`, `BorderRadiusDirectional`, `TextAlign.start`) مجازند؛ اعداد نمایشی فقط با `faNum`/`toFaDigits` و ورودی عددی با `parseLocalizedNumber`؛ کدها در `Directionality(ltr)` با فونت بسته‌بندی‌شدهٔ `JetBrains Mono`؛ بدون ایموجی.
- **محدودیت شبکهٔ این سیستم برای ساخت APK (بسیار مهم):**
  - در شبکهٔ فعلی `dl.google.com` (Google Maven) خطای `404` برمی‌گرداند؛ در `android/build.gradle.kts` نسخهٔ AGP پلاگین‌ها روی **`8.9.1`** (و Kotlin `2.1.0`) پین شده و `permission_handler` عمداً حذف شده است.
  - برای راستی‌آزمایی تغییرات کد روی **`dart run build_runner build --delete-conflicting-outputs`** (در صورت تغییر مدل‌های تولیدی)، **`flutter analyze`** و **`flutter test`** تکیه کن؛ خطاهای دانلود شبکه در `flutter build apk` را دنبال نکن و ساخت APK نهایی را از طریق mirror/VPN به کاربر بسپار.
  - نکتهٔ تست ویجت: در `testWidgets`، بستن دستی `Bloc.close()` روی Blocهایی که `emit.onEach` باز دارند گیر می‌کند؛ مطابق الگوی تست‌های موجود عمل کن.
