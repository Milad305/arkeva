---
name: projeyar-mobile-ops
description: >-
  Manages development, code generation, testing, offline outbox/sync contracts, and Android Gradle/Maven network constraints for the Projeyar Flutter field app in mobile/. Use whenever working on mobile/, M01-M14 screens, field-app sync endpoints, QR invites (OD-20), or troubleshooting Flutter builds.
---

# Projeyar Mobile Field App Operations (`mobile/`)

این مهارت دانش عملیاتی اپ کارگاه اندروید (`projeyar_field`)، محدودیت شبکهٔ ساخت APK در این ماشین، و قراردادهای همگام‌سازی آفلاین را یک‌جا گردآوری می‌کند. پیش از تغییر کد در `mobile/`، فایل [`docs/rules/flutter-clean-bloc.md`](../../../docs/rules/flutter-clean-bloc.md) و [`mobile/HANDOFF.md`](../../../mobile/HANDOFF.md) مرجع کامل‌اند.

## ۱. محدودیت شبکهٔ Google Maven روی این سیستم (بسیار مهم)

- از شبکهٔ این سیستم، مخزن **`dl.google.com` (Google Maven) خطای `404` برمی‌گرداند**؛ در نتیجه `flutter build apk` در صورتی که نیاز به دانلود آرتیفکت جدید AndroidX یا AGP داشته باشد شکست می‌خورد.
- نسخه‌های AGP موجود در کش محلی `~/.gradle/caches` عبارت‌اند از: `8.6.0`، `8.7.0`، `8.9.1`، `8.12.1`، `8.13.1` و `9.0.1`.
- در `mobile/android/build.gradle.kts` همهٔ پلاگین‌ها روی **AGP `8.9.1`** و **Kotlin `2.1.0`** قفل شده‌اند (و بستهٔ `permission_handler` به همین دلیل حذف شده و مجوزها از خود `camera`، `geolocator` و `flutter_local_notifications` گرفته می‌شوند).
- **قاعدهٔ اقدام:**
  1. هرگز وقت را صرف تعقیب خطاهای شبکهٔ Gradle هنگام `flutter build apk` نکن.
  2. صحت کد را با اجرای `flutter analyze` و `flutter test` تأیید کن.
  3. هنگام نیاز به خروجی APK، از کاربر بخواه بیلد را از طریق mirror یا VPN خودش اجرا کند.
  4. اگر پلاگین تازه‌ای پیشنهاد می‌دهی، سازگاری آن با AGP `8.9.1` و Kotlin `2.1.0` را بسنج.

---

## ۲. فرمان‌های استاندارد توسعه و تست

```powershell
cd mobile
flutter pub get
dart run build_runner build --delete-conflicting-outputs   # پس از تغییر مدل‌های freezed / json_serializable / drift / injectable
flutter analyze
flutter test
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

- **ورود در محیط توسعه (تفاوت مهم با وب!):** در اپ کارگاه طول کد پیامکی **۵ رقم** است؛ برای ورود با کاربران نمونهٔ seed در توسعه، **۵ رقم اول** `OTP_DEV_CODE` بک‌اند (یعنی `12345`) وارد می‌شود (در حالی که در پنل وب ۶ رقم `123456` است).
- **نکتهٔ مهم در تست‌های ویجت (`testWidgets`):** فراخوانی دستی `Bloc.close()` روی Blocهایی که اشتراک باز `emit.onEach` دارند در محیط تست ویجت گیر می‌کند؛ مطابق الگوی `mobile/test/features/widgets_test.dart` از بستن دستی آن خودداری کن.

---

## ۳. خلاصهٔ قراردادهای کلیدی اپ و سرور (`/v1`)

1. **سرآیند نسخهٔ اجباری (`F08 ۵.۳`):** همهٔ درخواست‌های اپ سرآیند `X-App-Version: <version>+<build>` می‌فرستند. پاسخ `426 APP_VERSION_UNSUPPORTED` توسط `AppVersionInterceptor` و `AppUpdateGate` اپ را به `/update-required` می‌برد و `OutboxProcessor` بدون دست زدن به آیتم‌های `pending` صف متوقف می‌شود.
2. **ورود با کد و اسکن QR دعوت (`OD-20`):**
   - قالب رشتهٔ QR: `projeyar:invite:<کد ۸ نویسه‌ای Crockford>` (رمزگشایی با `zxing2` در isolate از قاب دوربین `yuv420`، بدون هیچ دسترسی گالری).
   - مسیر سرور: `POST /auth/app/invite-code { code }` ← ارسال کد تأیید ← `POST /auth/app/verify` با هدف `app_invite` و فعال‌سازی کاربر دعوت‌شده.
3. **همگام‌سازی و صف آفلاین (`D10`):**
   - `GET /field/sync` آینهٔ محلی پروژه‌ها، فعالیت‌ها، آیتم‌ها، مشکلات کارگاه، ساعت یادآوری روزانه (`rules.dailyReminder`) و اعلان‌های ۳۰ روز اخیر (`notifications`) را در یک تراکنش Drift (SQLCipher نسخهٔ ۲) جایگزین می‌کند.
   - ترتیب ارسال `OutboxProcessor`: قفل همگام‌سازی در `SyncMeta` ← ارسال همهٔ رکوردهای متنی (`report`, `issue`, `resubmit`) به ترتیب قدیمی‌ترین ← بارگذاری چندبخشی عکس‌ها (`/uploads` با ادامه از `missingParts` و بررسی `sha256` بایت‌های JPEG پیش از رمز AES-GCM) ← `GET /field/sync` ← `POST /field/heartbeat` (حتی در صورت شکست).
