import 'package:drift/drift.dart';

// جدول‌های محلی اپ (F08 ۵.۱). دو دسته:
// ۱. «آینهٔ سرور» که هر همگام‌سازی کامل جایگزین می‌شود (Projects، Activities، ServerItems، SiteIssues).
// ۲. «دادهٔ گوشی» که تا ارسال موفق می‌ماند و هرگز خودکار حذف نمی‌شود (Local*، Outbox).
// فهرست‌ها و نقشه‌های تو در تو به شکل JSON متنی؛ پرس‌وجو رویشان لازم نیست.

@DataClassName('ProjectRow')
class Projects extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  RealColumn get siteLat => real().nullable()();
  RealColumn get siteLng => real().nullable()();
  RealColumn get radiusM => real().nullable()();
  IntColumn get minPhotos => integer().withDefault(const Constant(0))();
  RealColumn get maxJumpPct => real().nullable()();
  BoolColumn get allowDecrease => boolean().withDefault(const Constant(false))();
  IntColumn get lateAfterHours => integer().nullable()();
  TextColumn get gpsMode => text().nullable()();
  TextColumn get approvalMode => text().nullable()();
  TextColumn get calendarJson => text().withDefault(const Constant('{}'))();

  /// یادآوری روزانهٔ پروژه (`rules.dailyReminder`؛ NT-FLD-04)؛ از نسخهٔ ۲ پایگاه داده.
  BoolColumn get reminderEnabled => boolean().withDefault(const Constant(true))();
  TextColumn get reminderTime => text().withDefault(const Constant('17:00'))();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

@DataClassName('ActivityRow')
class Activities extends Table {
  TextColumn get id => text()();
  TextColumn get projectId => text()();
  TextColumn get parentId => text().nullable()();
  TextColumn get code => text()();
  TextColumn get title => text()();

  /// quantity | percent | steps
  TextColumn get method => text()();
  TextColumn get unit => text().nullable()();
  RealColumn get totalQuantity => real().nullable()();
  TextColumn get stepsJson => text().nullable()();
  TextColumn get plannedStart => text().nullable()();
  TextColumn get plannedFinish => text().nullable()();
  RealColumn get approvedPercent => real().withDefault(const Constant(0))();
  RealColumn get approvedQuantity => real().nullable()();
  RealColumn get lastPendingPercent => real().nullable()();
  TextColumn get planJson => text().withDefault(const Constant('[]'))();
  TextColumn get approverUserId => text().nullable()();
  TextColumn get approverName => text().nullable()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

/// آیتم‌های خود کاربر با وضعیت سرور (M05، M10، M11).
@DataClassName('ServerItemRow')
class ServerItems extends Table {
  TextColumn get id => text()();
  TextColumn get reportId => text()();
  TextColumn get reportNo => text().nullable()();
  TextColumn get projectId => text()();
  TextColumn get wbsItemId => text()();
  TextColumn get workDate => text().nullable()();
  TextColumn get status => text()();
  TextColumn get flagsJson => text().withDefault(const Constant('[]'))();
  RealColumn get computedPercent => real().nullable()();
  IntColumn get revisionCount => integer().withDefault(const Constant(0))();
  TextColumn get revisionJson => text().nullable()();
  TextColumn get photosJson => text().withDefault(const Constant('[]'))();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

@DataClassName('SiteIssueRow')
class SiteIssues extends Table {
  TextColumn get id => text()();
  TextColumn get projectId => text()();
  TextColumn get title => text()();
  TextColumn get type => text()();
  TextColumn get effect => text()();
  TextColumn get wbsItemId => text().nullable()();
  TextColumn get reportedAt => text()();
  TextColumn get riskCode => text().nullable()();
  TextColumn get status => text()();
  TextColumn get category => text().nullable()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

/// اعلان‌های اخیر از `/field/sync` (F08 ۵.۱؛ M12 بی‌شبکه). آینهٔ سرور؛ «خوانده شد» آنلاین است و پس از موفقیت اینجا هم ثبت می‌شود.
@DataClassName('NotificationRow')
class Notifications extends Table {
  TextColumn get id => text()();
  TextColumn get code => text()();
  TextColumn get category => text().nullable()();
  TextColumn get severity => text().nullable()();
  TextColumn get title => text()();
  TextColumn get body => text().nullable()();
  TextColumn get projectId => text().nullable()();
  TextColumn get projectName => text().nullable()();
  TextColumn get link => text().nullable()();

  /// ISO UTC
  TextColumn get createdAt => text()();
  TextColumn get readAt => text().nullable()();
  IntColumn get mergedCount => integer().withDefault(const Constant(0))();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

/// کلید ← مقدار برای cursor همگام‌سازی، امروز سرور و ترجیحات کوچک (فقط Wi‑Fi).
@DataClassName('MetaRow')
class SyncMeta extends Table {
  TextColumn get key => text()();
  TextColumn get value => text()();

  @override
  Set<Column<Object>> get primaryKey => {key};
}

/// گزارش ساخته‌شده در گوشی (D10: UUID سمت گوشی).
@DataClassName('LocalReportRow')
class LocalReports extends Table {
  TextColumn get id => text()();
  TextColumn get projectId => text()();
  TextColumn get workDate => text()();

  /// draft | queued | sent | rejected
  TextColumn get state => text().withDefault(const Constant('draft'))();
  DateTimeColumn get deviceRecordedAt => dateTime().nullable()();
  RealColumn get gpsLat => real().nullable()();
  RealColumn get gpsLng => real().nullable()();
  RealColumn get gpsAccuracyM => real().nullable()();
  BoolColumn get mockLocation => boolean().withDefault(const Constant(false))();
  TextColumn get weather => text().nullable()();
  IntColumn get temperatureC => integer().nullable()();
  TextColumn get note => text().nullable()();
  DateTimeColumn get attestedAt => dateTime().nullable()();
  TextColumn get reportNo => text().nullable()();
  TextColumn get rejectCode => text().nullable()();
  TextColumn get rejectMessage => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

@DataClassName('LocalReportItemRow')
class LocalReportItems extends Table {
  TextColumn get id => text()();
  TextColumn get reportId => text().references(LocalReports, #id, onDelete: KeyAction.cascade)();
  TextColumn get wbsItemId => text()();
  RealColumn get reportedPercent => real().nullable()();
  RealColumn get quantityToday => real().nullable()();
  TextColumn get stepsJson => text().nullable()();
  IntColumn get crewCount => integer().nullable()();
  TextColumn get note => text().nullable()();

  /// وضعیت و پرچم‌های پاسخ سرور پس از ارسال
  TextColumn get serverStatus => text().nullable()();
  TextColumn get serverFlagsJson => text().nullable()();
  RealColumn get serverPercent => real().nullable()();

  @override
  List<Set<Column<Object>>> get uniqueKeys => [
    // یک برگ در یک گزارش فقط یک بار (F08 ۴.۴)
    {reportId, wbsItemId},
  ];

  @override
  Set<Column<Object>> get primaryKey => {id};
}

/// عکس رمزنگاری‌شده در حافظهٔ خصوصی. `ownerKind`: report | issue | quick.
@DataClassName('LocalPhotoRow')
class LocalPhotos extends Table {
  TextColumn get id => text()();
  TextColumn get projectId => text().nullable()();
  TextColumn get ownerKind => text()();
  TextColumn get reportId => text().nullable()();
  TextColumn get itemId => text().nullable()();
  TextColumn get issueId => text().nullable()();
  TextColumn get filePath => text()();
  TextColumn get sha256 => text()();
  IntColumn get sizeBytes => integer()();
  DateTimeColumn get takenAt => dateTime()();
  TextColumn get workDate => text()();
  RealColumn get lat => real().nullable()();
  RealColumn get lng => real().nullable()();
  RealColumn get accuracyM => real().nullable()();
  BoolColumn get mocked => boolean().withDefault(const Constant(false))();
  TextColumn get caption => text().nullable()();
  TextColumn get uploadId => text().nullable()();

  /// local | queued | uploaded
  TextColumn get uploadState => text().withDefault(const Constant('local'))();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

@DataClassName('LocalIssueRow')
class LocalIssues extends Table {
  TextColumn get id => text()();
  TextColumn get projectId => text()();
  TextColumn get type => text()();
  TextColumn get title => text()();
  TextColumn get description => text().nullable()();
  TextColumn get effect => text()();
  TextColumn get wbsItemId => text().nullable()();
  DateTimeColumn get deviceRecordedAt => dateTime()();

  /// queued | sent | rejected
  TextColumn get state => text().withDefault(const Constant('queued'))();
  TextColumn get rejectMessage => text().nullable()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

/// ارسال دوباره پس از اصلاح (M11؛ `PUT /field/items/:id`).
@DataClassName('LocalResubmissionRow')
class LocalResubmissions extends Table {
  TextColumn get id => text()();
  TextColumn get itemId => text()();
  TextColumn get projectId => text()();
  RealColumn get reportedPercent => real().nullable()();
  RealColumn get quantityToday => real().nullable()();
  TextColumn get stepsJson => text().nullable()();
  TextColumn get note => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();

  /// queued | sent | rejected
  TextColumn get state => text().withDefault(const Constant('queued'))();
  TextColumn get rejectMessage => text().nullable()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

/// صف ارسال (docs/rules/flutter-clean-bloc.md ۹). هرگز خودکار حذف نمی‌شود.
@DataClassName('OutboxRow')
class Outbox extends Table {
  IntColumn get id => integer().autoIncrement()();

  /// report | issue | resubmit | photo
  TextColumn get kind => text()();
  TextColumn get entityId => text().unique()();
  TextColumn get projectId => text()();

  /// pending | sending | retry | rejected | sent
  TextColumn get state => text().withDefault(const Constant('pending'))();
  IntColumn get attempts => integer().withDefault(const Constant(0))();
  DateTimeColumn get nextAttemptAt => dateTime().nullable()();
  TextColumn get lastErrorCode => text().nullable()();
  TextColumn get lastErrorMessage => text().nullable()();
  IntColumn get bytes => integer().withDefault(const Constant(0))();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
}
