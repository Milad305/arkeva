# قواعد اپ کارگاه — Flutter، Clean Architecture و BLoC

> مرجع قطعی کد در `mobile/`. پیش از نوشتن هر خط کد اپ، این فایل را کامل بخوان. دامنه و رفتار از `design/features/field-app.md`
> (F08) و قرارداد API از کد بک‌اند (`backend/src/modules/field-app`، `identity/api/app-auth.controller.ts`،
> `platform/storage/storage.controller.ts`) می‌آید. این فایل فقط «چطور ساختن» را می‌گوید.
>
> منابع: [معماری bloclibrary](https://bloclibrary.dev/architecture/)، [راهنمای معماری Flutter](https://docs.flutter.dev/app-architecture/recommendations)،
> [الگوی Result](https://docs.flutter.dev/app-architecture/design-patterns/result)، [offline-first](https://docs.flutter.dev/app-architecture/design-patterns/offline-first)،
> [لایه‌بندی VGV](https://engineering.verygood.ventures/architecture/).

---

## ۱. پشتهٔ فنی (نسخه‌های قفل‌شده در `pubspec.lock`)

| نیاز | بسته | نکته |
|---|---|---|
| مدیریت حالت | `flutter_bloc` 9، `bloc` 9، `bloc_concurrency` | Bloc برای جریان‌های رویدادمحور، Cubit فقط برای حالت سادهٔ بی‌رویداد |
| برابری و کپی | `equatable`، `freezed` 3 + `freezed_annotation` | موجودیت دامنه با `Equatable`؛ حالت‌ها و DTOها با `freezed` |
| JSON | `json_serializable` + `json_annotation` | فقط در لایهٔ داده |
| تزریق وابستگی | `get_it` + `injectable` (+ `injectable_generator`) | ثبت با رابط، نه پیاده‌سازی |
| مسیریابی | `go_router` | `redirect` از روی حالت `AuthBloc` |
| HTTP | `dio` | Interceptorها در بخش ۷ |
| پایگاه دادهٔ محلی | `drift` + `sqlcipher_flutter_libs` + `sqlite3` | رمزنگاری‌شده با SQLCipher (D10) |
| ذخیرهٔ امن | `flutter_secure_storage` 9 (`encryptedSharedPreferences`) | توکن‌ها و کلید رمز؛ پشتیبان Android Keystore. نسخهٔ 10 به AGP تازه‌تر نیاز دارد |
| رمز فایل | `cryptography` (AES-GCM) و `crypto` (SHA-256) | عکس‌های صف رمزنگاری‌شده روی دیسک |
| تاریخ شمسی | `shamsi_date` | تبدیل و نمایش؛ هیچ تبدیل دستی |
| انتخاب تاریخ | `persian_datetime_picker` | دیت‌پیکر شمسی راست‌به‌چپ |
| قالب عدد | `intl` | جداکنندهٔ هزارگان؛ ارقام فارسی فقط با `faNum` |
| اعتبارسنجی فرم | `formz` | هر فیلد یک `FormzInput` |
| شناسه | `uuid` (v4) | UUID سمت گوشی (D10) |
| دوربین، مکان | `camera`، `geolocator` | `Position.isMocked` برای `mock_location` |
| پردازش عکس | `image` + `dart:ui` | کوچک‌سازی، مهر روی پیکسل، JPEG کیفیت ۸۰ |
| کار پس‌زمینه | `workmanager` | ارسال صف هنگام بسته بودن اپ |
| اتصال | `connectivity_plus` | راه‌انداختن صف با برگشت اتصال |
| اعلان محلی | `flutter_local_notifications` + `timezone` + `flutter_timezone` | یادآوری روزانهٔ آفلاین |
| مجوز | خود `camera`، `geolocator` و `flutter_local_notifications` | `permission_handler` 13 با Kotlin/AGP پروژه نمی‌سازد و حذف شد |
| لاگ | `talker_flutter`، `talker_bloc_logger`، `talker_dio_logger` | فقط در debug؛ سرآیندهای حساس پنهان |
| نسخه | `package_info_plus` | `appVersion` در گزارش و ضربان |
| تست | `flutter_test`، `bloc_test`، `mocktail` | |
| lint | `very_good_analysis` | |

افزودن بستهٔ تازه فقط با دلیل در PR. بستهٔ بی‌نگهدار یا بدون null-safety ممنوع.

---

## ۲. لایه‌ها و قاعدهٔ وابستگی

```
presentation  ──►  domain  ◄──  data
 (widget, bloc)    (entity, repository contract, use case, failure)    (dto, datasource, repository impl)
```

1. **domain** هیچ وابستگی زیرساختی ندارد: نه `package:flutter`، نه `dio`، نه `drift`، نه `json_annotation`. فقط Dart، `equatable`،
   `meta`، حاشیه‌نویسی‌های `injectable` (بستهٔ خالص Dart) و ابزارهای خالص `core/` (`result`، `error/failure`، `l10n`، `time`) مجازند.
2. **data** رابط‌های domain را پیاده می‌کند. هیچ استثنایی از data بیرون نمی‌رود؛ همه به `Failure` تبدیل می‌شوند.
3. **presentation** فقط use case یا رابط repository را می‌شناسد. هرگز `Dio`، `AppDatabase` یا DTO را import نمی‌کند.
4. یک ویژگی کد ویژگی دیگر را مستقیم import نمی‌کند. وابستگی مشترک یا از `core/` است یا از **رابط domain** ویژگی دیگر.
   import از `features/x/data` یا `features/x/presentation` در ویژگی y ممنوع است.
5. جهت وابستگی با lint بررسی نمی‌شود، پس در بازبینی کد چک کن: `grep "package:dio" lib/features/*/domain` باید خالی باشد.

---

## ۳. ساختار پوشه‌ها (feature-first)

```
mobile/lib/
  main.dart                 فقط راه‌اندازی: bootstrap()
  app/
    app.dart                MaterialApp.router، locale، theme، BlocProviderهای سراسری
    bootstrap.dart          WidgetsBinding، DI، Bloc.observer، runZonedGuarded
    router/                 go_router، نام مسیرها، redirect
    di/                     injection.dart (+ .config.dart تولیدی)، ماژول‌های @module
  core/
    config/                 AppConfig از --dart-define (API_BASE_URL، ...)
    error/                  Failure (sealed)، exceptions داده، ApiErrorBody
    result/                 Result<T> (sealed Ok/Err)
    usecase/                UseCase<T, P>
    network/                ساخت Dio، interceptorها، نگاشت خطا
    database/               AppDatabase (drift)، جدول‌ها، کلید SQLCipher
    security/               SecureStore، FileCipher
    time/                   Clock، Tehran day، JalaliFormat
    l10n/                   faNum، parseLocalizedNumber، متن‌های ثابت
    theme/                  AppTokens (ThemeExtension از design/ui/tokens.css)، AppTheme
    widgets/                کامپوننت‌های مشترک (AppButton، AppTextField، StatusChip، ...)
  features/
    <feature>/
      domain/
        entities/           کلاس‌های تغییرناپذیر Equatable
        repositories/       abstract interface class XRepository
        usecases/           یک کلاس = یک کار، متد call
      data/
        models/             DTO با freezed + json_serializable، و mapper به entity
        datasources/        XRemoteDataSource (dio)، XLocalDataSource (drift)
        repositories/       XRepositoryImpl
      presentation/
        bloc/               x_bloc.dart، x_event.dart، x_state.dart
        forms/              FormzInputهای ویژگی
        pages/              یک فایل برای هر صفحهٔ بوم (M03TodayPage، ...)
        widgets/            ویجت‌های فقط همین ویژگی
mobile/test/                آینهٔ ساختار lib/
```

ویژگی‌ها: `auth` (M01، M02)، `sync` (همگام‌سازی و ضربان)، `activities` (M03 تا M05)، `reports` (M06، M08، M10، M11)،
`camera` (M07)، `queue` (M09، صف و ارسال)، `issues` (M13)، `notifications` (M12)، `profile` (M14).

---

## ۴. لایهٔ domain

- **Entity**: `final class` با فیلدهای `final` و `Equatable`. بدون `fromJson`. شناسه `String` (UUID). پول `int` ریال؛ درصد `double` (فقط نمایش و پیش‌نمایش؛ D07).
- **Repository**: `abstract interface class`. هر متد `Future<Result<T>>` یا `Stream<T>` برمی‌گرداند.
- **UseCase**: یک کلاس با `Future<Result<T>> call(P params)`. وقتی use case فقط یک متد repository را صدا می‌زند و قاعده‌ای ندارد،
  Bloc می‌تواند مستقیم repository را صدا بزند (ساده‌سازی پذیرفته‌شدهٔ bloclibrary). وقتی قاعده دارد، مثل «فعالیت‌های امروز» (F08 ۴.۱)،
  ترتیب ارسال صف یا پیش‌نمایش درصد، حتماً use case یا سرویس domain لازم است.
- **Result**: `sealed class Result<T>` با `Ok<T>` و `Err<T>(Failure)`. برای جریان کنترل استثنا پرتاب نکن.
- **Failure** (sealed): `NetworkFailure`، `TimeoutFailure`، `UnauthorizedFailure`، `ForbiddenFailure`، `NotFoundFailure`،
  `ConflictFailure`، `ValidationFailure(fieldErrors)`، `RateLimitedFailure(retryAfter)`، `ServerFailure`، `StorageFailure`،
  `PermissionFailure`، `UnexpectedFailure`. همه `code`، `message` (فارسی، بدون سرزنش و با یک راه ادامه)، `traceId?` و `retryable` دارند.
- **قواعد محاسبه** (D07): اپ فقط پیش‌نمایش دارد، مثل «۷۲ متر = ۳٪». این پیش‌نمایش در یک سرویس خالص domain است و تست واحد دارد
  (AC-FA-07). عدد سرور همیشه مرجع است و پس از پاسخ جایگزین پیش‌نمایش می‌شود.

---

## ۵. لایهٔ داده

- **DTO**: `@freezed` با `fromJson` و `toJson`. نام فیلدها دقیقاً مثل JSON بک‌اند (camelCase). هر DTO متد `toEntity()` یا mapper جدا دارد.
  DTO هرگز از data بیرون نمی‌رود.
- **RemoteDataSource**: فقط HTTP. پاسخ موفق `{success: true, data}` را در `ApiClient` باز کن. خطای Dio را به `ApiException` تبدیل کن.
- **LocalDataSource**: فقط drift. تراکنش برای هر تغییر چندجدولی.
- **RepositoryImpl**: منبع یگانهٔ حقیقت (offline-first). برای خواندن **از پایگاه دادهٔ محلی** `Stream` می‌دهد و همگام‌سازی آن را تازه می‌کند.
  برای نوشتن، اول در صف محلی ذخیره می‌کند و بعد صف ارسال را بیدار می‌کند. هر `try` باید هر استثنا را به `Failure` نگاشت کند.
- `dynamic` فقط در مرز JSON و حداکثر یک خط پیش از تبدیل به نوع.

---

## ۶. لایهٔ نمایش (BLoC)

1. **یک Bloc برای هر صفحه یا جریان.** Bloc سراسری فقط `AuthBloc`، `ConnectivityCubit` و `QueueStatusCubit` هستند و در `app.dart` فراهم می‌شوند.
2. رویدادها و حالت‌ها **sealed** یا freezed. حالت تغییرناپذیر با `copyWith`. فیلد `status` از enum (`initial`، `loading`، `success`، `failure`).
3. **همزمانی رویداد** با `bloc_concurrency`: جست‌وجو `restartable()`؛ ارسال فرم و دکمه‌ها `droppable()`؛ تغییر فیلد `sequential()` یا پیش‌فرض.
4. Bloc هیچ `BuildContext`، ویجت، `Navigator` یا متن UI نمی‌شناسد. خطا را به شکل `Failure` در حالت می‌گذارد و UI پیامش را نشان می‌دهد.
5. **اثر جانبی** (رفتن به صفحه، SnackBar، دیالوگ) فقط در `BlocListener` یا `BlocConsumer.listener`، با `listenWhen`.
6. بازسازی محدود: `BlocSelector` یا `buildWhen`. `context.read` فقط در callbackها؛ `context.watch` فقط در `build`.
7. `BlocProvider` در سطح مسیر (route) ساخته می‌شود و Bloc از `getIt` می‌آید (`@injectable`، factory). Bloc را خودت `close` نکن.
8. اشتراک Stream در Bloc با `emit.forEach` یا `emit.onEach`، نه `listen` دستی.
9. `Bloc.observer = TalkerBlocObserver` فقط در debug، با `printStateFullData: false` تا داده‌های شخصی در لاگ نیایند.
10. هر Bloc با `bloc_test` تست می‌شود: مسیر موفق، مسیر هر نوع Failure، و همزمانی.

---

## ۷. شبکه و خطاهای HTTP

**`Dio` تنها در `core/network`** ساخته می‌شود: `baseUrl = API_BASE_URL + '/v1'`، `connectTimeout` ۱۵ ثانیه، `receiveTimeout` ۳۰ ثانیه، `sendTimeout`
۶۰ ثانیه برای پارچه‌های عکس، `Accept-Language: fa`.

**ترتیب Interceptorها:**
1. `RequestIdInterceptor`: سرآیند `X-Request-Id` (UUID).
2. `IdempotencyInterceptor`: برای `POST` و `PUT` غیر از ورود، `Idempotency-Key` می‌گذارد. برای گزارش و مشکل، UUID همان موجودیت است (D10).
3. `AuthInterceptor` (`QueuedInterceptor`): `Authorization: Bearer <access>`. روی ۴۰۱ با کد `AUTH_REQUIRED` یا `SESSION_EXPIRED`،
   **فقط یک** تازه‌سازی هم‌زمان با `POST /auth/app/refresh` می‌فرستد و درخواست‌های منتظر را با توکن تازه تکرار می‌کند. اگر تازه‌سازی
   شکست بخورد، `AuthBloc` به `unauthenticated` می‌رود. **صف محلی پاک نمی‌شود.**
4. `TalkerDioLogger`: فقط debug، بدون بدنه و با `Authorization` و `refreshToken` پنهان.

**نگاشت خطا** در `ErrorMapper` (یک جا). بدنهٔ خطای بک‌اند `{code, message, details?, traceId, retryable}` است.

| وضعیت | Failure | رفتار UI |
|---|---|---|
| بدون اتصال، DNS، `connectionError` | `NetworkFailure` (retryable) | «اتصال برقرار نیست. گزارش در صف می‌ماند و خودکار ارسال می‌شود.» |
| `connectionTimeout`، `receiveTimeout` | `TimeoutFailure` (retryable) | دکمهٔ «تلاش دوباره» |
| ۴۰۰ و ۴۲۲ با `VALIDATION_FAILED` | `ValidationFailure(details.fields)` | خطا زیر همان فیلد |
| ۴۰۱ | پس از شکست تازه‌سازی: `UnauthorizedFailure` | رفتن به M01؛ صف می‌ماند |
| ۴۰۳ | `ForbiddenFailure` | پیام سرور |
| ۴۰۴ | `NotFoundFailure` | پیام سرور |
| ۴۰۹ | `ConflictFailure(code)` | بسته به کد؛ مثل `UPLOAD_INCOMPLETE` ← ادامهٔ بارگذاری |
| ۴۲۹ | `RateLimitedFailure(retryAfter)` | از سرآیند `Retry-After` یا `details.retryAfterSec` |
| ۵xx و ۵۰۳ | `ServerFailure` (retryable) | «سرور موقتاً پاسخ نمی‌دهد» + کد پیگیری |
| بدنهٔ ناشناخته | `UnexpectedFailure` | پیام عمومی + `traceId` |

- همیشه `message` سرور (فارسی) نشان داده می‌شود. اگر نبود، متن ثابت `core/l10n`. **هرگز** متن استثنا یا stack به کاربر نشان داده نمی‌شود.
- `traceId` (یا سرآیند `X-Trace-Id`) در پیام خطای سرور با برچسب «کد پیگیری» و فونت مونو.
- **تلاش دوباره** فقط برای `retryable == true`، با تأخیر نمایی ۲، ۴، ۸ تا حداکثر ۵ دقیقه. خطای ۴xx غیرقابل تکرار، آیتم صف را
  «پذیرفته نشد» می‌کند (F08 ۵.۳) و حذفش نمی‌کند.

---

## ۸. امنیت

1. **توکن‌ها** فقط در `flutter_secure_storage` (Keystore). توکن دسترسی در حافظه، توکن تازه‌سازی ۳۰ روزه در ذخیرهٔ امن. هیچ توکنی در drift، prefs یا لاگ نمی‌رود.
2. **پایگاه دادهٔ محلی** با SQLCipher. کلید ۳۲ بایتی تصادفی (`Random.secure`) یک بار ساخته و در ذخیرهٔ امن نگه داشته می‌شود.
3. **عکس‌های صف** با AES-GCM رمز می‌شوند و در `getApplicationSupportDirectory()` (حافظهٔ خصوصی) می‌مانند. SHA-256 روی بایت‌های JPEG
   **پیش از رمز** حساب می‌شود، چون سرور همان را می‌سنجد.
4. **HTTPS اجباری در release**: `network_security_config.xml` با `cleartextTrafficPermitted=false`. cleartext فقط در debug و فقط برای
   `10.0.2.2` و `localhost`. pinning گواهی اختیاری است و با `--dart-define=CERT_SHA256=` فعال می‌شود.
5. `android:allowBackup="false"` و `fullBackupContent` خاموش، تا صف و پایگاه داده در پشتیبان ابری نروند.
6. **Release**: `--obfuscate --split-debug-info=build/symbols`، R8 فعال و `minSdk` ۲۶ (اندروید ۸).
7. هیچ راز، کلید یا آدرس سرور در کد نیست. پیکربندی فقط با `--dart-define` یا `--dart-define-from-file`.
8. **دوربین فقط از `camera`**: هیچ `image_picker` و هیچ دسترسی گالری (AC-FA-04). مجوز `READ_MEDIA_IMAGES` در manifest نیست.
9. **ضدجعل**: `Position.isMocked` ← `mockLocation: true` در گزارش. زمان دستگاه (`deviceRecordedAt`) خام فرستاده می‌شود و سرور `clock_skew` را می‌سنجد.
10. **خروج**: اگر صف خالی نیست، هشدار «N گزارش ارسال‌نشده از بین می‌رود» و تأیید دوباره. بعد `POST /auth/app/logout`، پاک کردن ذخیرهٔ امن،
    پایگاه داده و فایل‌های عکس.
11. ورودی کاربر پیش از ارسال trim و اعتبارسنجی می‌شود. هیچ HTML یا URL از سرور بدون اعتبارسنجی باز نمی‌شود. `link` اعلان فقط
    به مسیرهای داخلی شناخته‌شده نگاشت می‌شود.
12. لاگ‌ها در release خاموش‌اند. در debug هم شمارهٔ همراه ماسک می‌شود.

---

## ۹. آفلاین و صف (D10؛ F08 ۵)

- `GET /field/sync` پاسخ کامل است؛ repository دادهٔ محلی هر پروژه را در یک تراکنش **جایگزین** می‌کند.
- جدول `outbox`: نوع (`report`، `photo`، `issue`، `resubmit`)، `entityId`، وضعیت (`pending`، `sending`، `failed_retryable`،
  `rejected`)، شمار تلاش، `nextAttemptAt`، `lastError`. **هیچ حذف خودکاری نیست**؛ پس از موفقیت ردیف به `sent` می‌رود و دادهٔ عکس پاک می‌شود.
- **ترتیب**: قدیمی‌ترین اول؛ همهٔ متن‌ها (گزارش، مشکل، اصلاح) پیش از همهٔ عکس‌ها. «فقط Wi‑Fi» فقط عکس‌ها را نگه می‌دارد.
- **عکس**: `POST /uploads {projectId, kind: photo|issue_photo, subjectId: photoId, fileName, contentType, size}` ← پارچه‌ها
  با `PUT .../parts/:n` (`application/octet-stream`) ← `POST .../complete {sha256}`. شناسهٔ upload در ردیف outbox ذخیره می‌شود تا با
  `GET /uploads/:id` و `missingParts` از همان نقطه ادامه یابد (AC-FA-03).
- **راه‌انداز**: باز شدن اپ، برگشت اتصال، ذخیرهٔ تازه در صف، و `workmanager` هر ۱۵ دقیقه با قید اتصال. فقط یک ارسال‌کنندهٔ هم‌زمان (قفل).
- پس از هر تلاش همگام‌سازی، موفق یا ناموفق، `POST /field/heartbeat` (AC-FA-08).

---

## ۱۰. راست‌به‌چپ، فارسی و تاریخ

1. `MaterialApp.router` با `locale: Locale('fa', 'IR')`، `supportedLocales: [fa_IR]`، و delegateهای `GlobalMaterialLocalizations`،
   `GlobalWidgetsLocalizations`، `GlobalCupertinoLocalizations` و `PersianMaterialLocalizations`. جهت از locale می‌آید و RTL است.
2. **فقط ویجت‌ها و مقادیر جهت‌دار**: `EdgeInsetsDirectional`، `AlignmentDirectional`، `PositionedDirectional`،
   `BorderRadiusDirectional`، `TextAlign.start` و `end`. `left` و `right` ممنوع است، مگر در کد تصویر (مهر عکس) و نمودار زمانی چپ‌به‌راست.
3. آیکن‌های جهت‌دار (پیکان، chevron) با `Directionality` خودکار برمی‌گردند. اگر نه، از `matchTextDirection: true` استفاده کن.
4. **ارقام**: نمایش همیشه با `faNum()` و `toFaDigits()` در `core/l10n`. ورودی عددی ارقام فارسی، عربی و لاتین را می‌پذیرد
   (`parseLocalizedNumber`). کیبورد عددی: `TextInputType.numberWithOptions(decimal: true)`.
5. **کدها** (کد WBS، `FR-...`، `RSK-...`، کد پیگیری) در `Directionality(textDirection: TextDirection.ltr)` با فونت JetBrains Mono.
6. **تاریخ**: تاریخ کار `YYYY-MM-DD` میلادی و روز به وقت `Asia/Tehran` (`core/time`). لحظه‌ها `DateTime.toUtc().toIso8601String()`.
   نمایش با `shamsi_date` (مثل «سه‌شنبه ۲۷ آبان ۱۴۰۵»). انتخاب با `showPersianDatePicker`، با `firstDate` امروز منهای ۳ روز و
   `lastDate` امروز (F08 ۴.۵).
7. فونت‌ها در `assets/fonts` بسته‌بندی شده‌اند: Vazirmatn و JetBrains Mono. هیچ فونتی از شبکه بارگیری نمی‌شود.
8. بدون ایموجی. پیام‌ها بدون سرزنش و با یک راه ادامه.

---

## ۱۱. اعتبارسنجی ورودی

- هر فیلد یک `FormzInput<T, E>` با enum خطا در `presentation/forms/`. متن خطا از enum با یک تابع `message` فارسی می‌آید.
- خطا **پس از خروج از فیلد یا تلاش ارسال** نشان داده می‌شود (`isPure`)، نه با اولین حرف. خطای سرور (`ValidationFailure.fieldErrors`)
  روی همان فیلد می‌نشیند و با تغییر مقدار پاک می‌شود.
- دکمهٔ ارسال غیرفعال نمی‌شود، مگر قاعدهٔ دامنه آن را بخواهد (تعهد M08، AC-FA-09). کلیک روی فرم نامعتبر فیلدها را dirty می‌کند و
  اولین خطا را focus می‌کند.
- قواعد اپ هم‌خوان با DTOهای بک‌اند: موبایل `09xxxxxxxxx`، کد ۵ رقم، `crewCount` ۰ تا ۱۰٬۰۰۰، توضیح حداکثر ۲٬۰۰۰ نویسه، عنوان
  مشکل حداکثر ۲۰۰ و شرح ۴٬۰۰۰، دما ۶۰- تا ۷۰، تعداد عکس مشکل حداکثر ۵.
- هشدارهای پیش‌نمایش (جهش بالای آستانه، کاهش ممنوع، عکس کم، خارج از محدوده) **هشدارند، نه مانع**؛ جز عکس کمتر از حداقل و کاهش ممنوع
  که سرور هم رد یا پرچم می‌کند. داور نهایی سرور است (D07).

---

## ۱۲. سبک کد

- `very_good_analysis`. `print` ممنوع؛ لاگ فقط با `talker`.
- حد نرم ۳۰۰ خط در هر فایل و حد سخت ۵۰۰. ویجت بزرگ‌تر از ۱۵۰ خط شکسته می‌شود.
- سازنده‌های `const` هرجا ممکن است. `late` فقط با دلیل.
- نام فایل snake_case. صفحه‌ها با پسوند `_page.dart` و کد بوم در توضیح کلاس، مثل `/// M03 امروز`.
- کامنت‌ها فارسی و کوتاه، و فقط برای «چرا». شناسه‌ها انگلیسی.
- فایل‌های تولیدی (`*.g.dart`، `*.freezed.dart`، `*.config.dart`) commit می‌شوند تا build بدون `build_runner` هم کار کند.
  فرمان تولید: `dart run build_runner build --delete-conflicting-outputs`.

---

## ۱۳. تست

| سطح | چه چیزی | ابزار |
|---|---|---|
| واحد domain | use caseها، پیش‌نمایش درصد (AC-FA-07)، «فعالیت‌های امروز»، ترتیب صف | `test` |
| واحد data | `ErrorMapper` برای همهٔ ردیف‌های جدول بخش ۷، repositoryها با mock datasource | `mocktail` |
| Bloc | همهٔ Blocها | `bloc_test` |
| ویجت | فرم‌های M01، M02، M06، M13؛ جهت RTL؛ پیام خطا | `flutter_test` |
| پایگاه داده | outbox و جایگزینی sync روی drift در حافظه (`NativeDatabase.memory()`) | `drift` |

- نام تست هر معیار پذیرش با شناسه‌اش شروع می‌شود: `test('AC-FA-07 ...')`.
- AC-FA-04 (مهر روی پیکسل) و AC-FA-05 (mock) با تست واحد سرویس مهر و نگاشت `isMocked` پوشش داده می‌شوند. آزمایش دستی روی گوشی در
  `mobile/README.md` ثبت می‌شود.

---

## ۱۴. فرمان‌ها

> همهٔ پلاگین‌ها به AGP پروژه (`8.9.1`، `android/build.gradle.kts`) بسته شده‌اند. ساخت APK به Google Maven (`dl.google.com`)
> نیاز دارد؛ اگر از شبکهٔ شما ۴۰۴ می‌دهد، با mirror یا VPN بسازید.

```bash
cd mobile
flutter pub get
dart run build_runner build --delete-conflicting-outputs
flutter analyze
flutter test
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
flutter build apk --release --obfuscate --split-debug-info=build/symbols --dart-define=API_BASE_URL=https://api.example.ir
```
