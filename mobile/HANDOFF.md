# اپ کارگاه — تحویل برای ادامه در نشست تازه

> **تاریخ:** 1405/08/29، به‌روز 1405/08/30 (همهٔ برش‌های بخش ۳ ساخته شد؛ سپس به‌روزرسانی اجباری، اعلان و یادآوری از sync) · **قواعد:** `docs/rules/flutter-clean-bloc.md` (پیش از هر کد کامل بخوان) · **دامنه:** `design/features/field-app.md` (F08)
> این فایل جای خواندن دوبارهٔ کد بک‌اند را می‌گیرد؛ قراردادهای API زیر از کد واقعی بک‌اند استخراج شده‌اند.

## ۱. وضعیت

| بخش | وضعیت |
|---|---|
| پروژه `mobile/` (اندروید، `ir.projeyar.projeyar_field`، minSdk 26) | ساخته شد |
| وابستگی‌ها، فونت‌های بسته‌بندی‌شده (Vazirmatn، JetBrains Mono با OFL) | انجام شد |
| امنیت اندروید: HTTPS در release، cleartext فقط debug برای 10.0.2.2، بدون پشتیبان، R8، بدون مجوز گالری | انجام شد |
| `core/`: Result، Failure، ErrorMapper، ApiClient با interceptorها (Request-Id، Idempotency، Auth تک‌پرواز)، TokenStore، SecureStore، FileCipher (AES-GCM)، AppDatabase (SQLCipher + همهٔ جدول‌ها)، Tehran/Jalali، faNum، تم از توکن‌ها، ویجت‌های پایه | انجام شد |
| `app/`: DI (injectable)، go_router با redirect از AuthBloc، پوستهٔ چهار زبانه، bootstrap | انجام شد |
| ویژگی `auth` (M01، M02): domain، data، Bloc، صفحه، تست | انجام شد |
| برش‌های بخش ۳ (sync، M03–M14، صف، workmanager، ضربان، یادآوری محلی) | **انجام شد** (1405/08/30)؛ جزئیات بخش ۳ |
| تست‌ها: ۱۰۸ تست سبز (domain، داده روی drift حافظه، `bloc_test` همهٔ Blocها، ویجت M06 و M13، مهر پیکسل)؛ `flutter analyze` بدون خطا | سبز |
| `flutter build apk` | **بررسی نشد**: Google Maven از این شبکه ۴۰۴ می‌دهد (`androidx.camera:camera-core:1.6.0`). AGP پلاگین‌ها به 8.9.1 بسته شد و `permission_handler` حذف شد. با mirror یا VPN دوباره بسازید |

## ۲. فرمان‌ها
```bash
cd mobile
flutter pub get
dart run build_runner build --delete-conflicting-outputs
flutter analyze
flutter test
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
```
ورود توسعه: شمارهٔ کاربر seed و کد = پنج رقم اول `OTP_DEV_CODE` بک‌اند.

## ۳. برش‌ها (همه ساخته شد، 1405/08/30)

| برش | محل | نکته |
|---|---|---|
| sync | `features/sync` | جایگزینی تراکنشی آینه و `SyncMeta`؛ عددهای numeric رشته‌ای با `core/network/json_read.dart` |
| activities M03–M05 | `features/activities` | قاعدهٔ «فعالیت‌های امروز» در `ActivitySchedule` (تست)؛ M04 سرگروه = کد مشترک فرزندان |
| reports M06، M08، M10، M11 | `features/reports` | پیش‌نویس در `LocalReports`؛ `ProgressPreviewer` (AC-FA-07)، `RoutePreview`؛ M11 با AC-FA-09 |
| camera M07 | `features/camera` | `PhotoProcessor`: کوچک‌سازی و JPEG در isolate، مهر با Canvas و TextPainter راست‌به‌چپ، EXIF نگه داشته؛ عکس سریع `ownerKind = quick` |
| queue M09 | `features/queue` | `OutboxProcessor` (قفل `SyncMeta` میان اپ و workmanager)، `RunSyncCycle` = صف ← sync ← ضربان (همیشه)، `QueueStatusCubit` سراسری؛ `app/background.dart` workmanager |
| issues M13 | `features/issues` | فهرست `/issues` هم هست (از M10) |
| notifications M12 | `features/notifications` | پیوند فقط به مسیرهای داخلی (`NotificationLinks`) |
| profile M14 | `features/profile` | `SignOut` = خروج سرور + `wipeLocalData`؛ کلید پایگاه داده می‌ماند (فایل باز با همان کلید است) |
| پس از ورود | `app/session_services.dart` | راه‌انداز صف، ثبت workmanager، یادآوری محلی در زودترین `dailyReminder` پروژه‌ها |
| به‌روزرسانی اجباری | `core/network/app_update_gate.dart`، `features/app_update` | `AppVersionInterceptor` ← ۴۲۶ ← `/update-required`؛ صف دست نمی‌خورد |

**ساختار مشترک تازه:** `core/network/network_info.dart` (+ پیاده‌سازی connectivity)، `core/status/connectivity_cubit.dart`، `core/database/meta_store.dart`
(`MetaStore`، `OutboxWriter`)، `core/device/` (مکان، نسخه، زمان‌بندها)، `core/forms/inputs.dart`، `core/l10n/labels.dart`، `core/widgets/field_widgets.dart`،
`core/util/streams.dart` (combineLatest بی rxdart).

**آزمون روی گوشی (نیاز به APK):** AC-FA-04 گالری (هیچ ورودی گالری نیست؛ فقط دیدن)، AC-FA-05 با برنامهٔ موقعیت جعلی، AC-FA-01 در حالت پرواز، اسکن QR دعوت (OD-20) از صفحهٔ گوشی دیگر،
عکس با شعاع کارگاه، workmanager با اپ بسته، یادآوری ۱۷:۰۰. فهرست در `mobile/README.md`.

**دانسته‌ها:** `Bloc.close` در `testWidgets` با Blocی که `emit.onEach` باز دارد گیر می‌کند؛ تست‌های ویجت Bloc را نمی‌بندند.
`outbox_processor.dart` ۳۱۶ خط است (بالای حد نرم ۳۰۰).

## ۴. قرارداد API (همه زیر `/v1`؛ پاسخ موفق `{success: true, data}`)

**همهٔ درخواست‌ها** سرآیند `X-App-Version: <version>+<build>` دارند. اگر بک‌اند `APP_MIN_VERSION` داشته باشد، نسخهٔ کمتر یا نبود سرآیند در
`/auth/app/*` و `/field/*` (و `/uploads`، `/notifications` با سرآیند یا نشست android) ← ۴۲۶ `APP_VERSION_UNSUPPORTED`
`{details: {minVersion, currentVersion}, retryable: false}`.

**ورود** (انجام شد): `POST /auth/app/invite-code {code}` (OD-20؛ کد ۸ نویسه‌ای یا QR `projeyar:invite:<کد>`) ← همان پاسخ `request-code`، کد پیامکی به شمارهٔ دعوت، سپس `verify` که دعوت را می‌پذیرد؛ نادرست ← ۴۰۱ `INVITE_CODE_INVALID`.
`POST /auth/app/request-code {mobile}` ← `{otpToken, maskedMobile, resendAfterSec, codeLength}`؛
`POST /auth/app/verify {otpToken, code}` ← `{session: {accessToken, expiresInSec, user, organization, ...}, refreshToken, refreshExpiresAt}`؛
`POST /auth/app/refresh {refreshToken}` ← `{session, refreshToken}`؛ `POST /auth/app/logout {refreshToken}` ← ۲۰۴.

**`GET /field/sync`** (کد `report.submit`) ←
```
{ cursor, serverTime, today: 'YYYY-MM-DD',
  projects: [{ id, name, site: {lat, lng, radiusM} | null,
               rules: {minPhotos, maxJumpPct, allowDecrease, lateAfterHours, gpsMode, approvalMode,
                       dailyReminder: {enabled, time: 'HH:mm'}},
               calendar: {weekModes, holidays: []} }],
  activities: [{ id, projectId, parentId, code, title, method: quantity|percent|steps, unit, totalQuantity,
                 steps: [{key, title, weight, approvedPercent}] | null, plannedStart, plannedFinish,
                 approvedPercent, approvedQuantity, lastPendingPercent, plan: [{date, plannedPercent}] (۱۴ روز),
                 approverUserId, approverName }],
  items: [{ id, reportId, reportNo, projectId, wbsItemId, workDate, status, flags: [], computedPercent, revisionCount,
            revision: {note, requiredActions: [], reviewerUserId, requestedAt} | null,
            photos: [{id, uploadStatus, markedUnsuitable}] }],
  issues: [{ id, projectId, title, type, effect, wbsItemId, reportedAt, riskCode, status, category }],
  notifications: [{ id, code, category, severity, title, body, projectId, projectName, link, createdAt, readAt, mergedCount }] }
```
`notifications`: ۳۰ روز اخیر خود کاربر، حداکثر ۱۰۰، تازه‌ترین اول (همان شکل `GET /notifications`).
```
```
وضعیت آیتم: `submitted، stage1، stage2، approved، needs_revision، rejected، superseded، needs_resolution`.
پروژهٔ غیرفعال و برگ `time_based` را سرور خودش حذف می‌کند (AC-FA-10).

**`POST /field/reports`** ←
```
{ id(uuid گوشی), projectId, workDate, deviceRecordedAt(ISO), appVersion?, gps?: {lat, lng, accuracyM?},
  weather?: sunny|cloudy|rainy|snowy|windy|dusty, temperatureC? (-60..70), note? (≤2000), attested: bool, mockLocation?: bool,
  items: [{ id, wbsItemId, values: {reportedPercent?, quantityToday?, steps?: {key: percent}}, crewCount? (0..10000), note? }] (≤200),
  photos?: [{ id, itemId, sha256(hex64), takenAt, lat?, lng?, accuracyM?, caption? (≤500) }] }
```
پاسخ: `{reportId, reportNo, duplicate, items: [{id, wbsItemId, status, flags, computedPercent}], photos: [{id, itemId, uploadStatus}]}`.
تکرار با همان `id` بی‌اثر است و همان وضعیت را برمی‌گرداند. **گزارش پیش از عکس‌هایش** فرستاده می‌شود.

**`PUT /field/items/:itemId {values, note?, photos?: [{id, sha256, takenAt, lat?, lng?, accuracyM?, caption?}] (≤20)}`** فقط در `needs_revision`
← وضعیت تازهٔ آیتم و `photos` آن. عکس‌ها سپس با `/uploads` (`kind = photo`)؛ تکرار با همان عکس‌ها بی‌اثر (تصمیم 1405/08/30).

**`POST /field/issues`** (کد `risk.create_site_issue`) ←
`{id, projectId, type: material|safety|equipment|design|weather|other, title (≤200), description? (≤4000), effect: stop|slow|none, wbsItemId?, deviceRecordedAt, photos?: [{id, sha256, takenAt}] (≤5)}`.

**`POST /field/heartbeat`** ← `{queuedReports, queuedPhotos, queuedBytes, oldestQueuedAt?, appVersion?, lastSyncAt?, wifiOnly}`.

**بارگذاری عکس** (F20): `POST /uploads {projectId, kind: photo|issue_photo, subjectId: photoId, fileName, contentType: image/jpeg, size}`
← `{uploadId, status, partSize, partCount, receivedParts, missingParts}`؛ `PUT /uploads/:id/parts/:n` با بدنهٔ خام
`application/octet-stream` (اندازهٔ دقیق `partSize`، جز پارچهٔ آخر)؛ `GET /uploads/:id` برای ادامه؛
`POST /uploads/:id/complete {sha256}` (ناهمخوانی هش ← ۴۲۲ retryable ← ارسال دوباره؛ پارچهٔ جاافتاده ← ۴۰۹ `UPLOAD_INCOMPLETE`
با `missingParts`).

**اعلان‌ها**: `GET /notifications?type=&status=unread&cursor=&limit=` ← `{items: [{id, code, category, severity, title, body,
projectId, projectName, link, createdAt, readAt, mergedCount}], nextCursor, unreadCount, counts}`؛
`POST /notifications/:id/read`؛ `POST /notifications/read-all {type?}`؛ `GET /notifications/unread-count` ← `{count}`.

**دستگاه**: `POST /me/devices {platform: android, token}` (پوش).

## ۵. شکاف‌ها و پرسش‌های باز (در `design/code-mapping.md` ۷.۳.۱ هم ثبت شد)
1. ~~حداقل نسخهٔ اپ~~ — **ساخته شد 1405/08/30** (§۷.۱.۵۱): `X-App-Version` و ۴۲۶؛ صفحهٔ `/update-required`؛ صف دست نمی‌خورد.
2. ~~ورود با QR دعوت~~ — **ساخته شد 1405/08/30 (OD-20)**: `/login/invite` و `/login/invite/scan` (`camera` با `yuv420` و `zxing2`،
   بی گالری). وب QR را پس از دعوت و «ارسال دوباره» نشان می‌دهد. مانده: اسکن روی گوشی واقعی (APK).
3. **پوش**: `firebase_messaging` به `google-services.json` نیاز دارد که در مخزن نیست. یادآوری محلی بدون Firebase کار می‌کند.
4. ~~اعلان‌ها در sync~~ — **ساخته شد 1405/08/30**: `notifications` در `/field/sync`؛ جدول drift `Notifications` (پایگاه داده نسخهٔ ۲)؛ M12 بی‌شبکه از آن.
5. ~~عکس تازه در اصلاح (M11)~~ — **حل شد 1405/08/30** (`design/code-mapping.md` §۷.۱.۵۰).
6. ~~ساعت یادآوری و مهلت M03~~ — **ساخته شد 1405/08/30**: `rules.dailyReminder`؛ زودترین ساعت فعال پروژه‌ها برای یادآوری و «مهلت تا …».
