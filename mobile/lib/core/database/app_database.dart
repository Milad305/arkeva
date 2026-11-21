import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:projeyar_field/core/database/tables.dart';
import 'package:sqlcipher_flutter_libs/sqlcipher_flutter_libs.dart';
import 'package:sqlite3/open.dart';

part 'app_database.g.dart';

/// پایگاه دادهٔ محلی رمزنگاری‌شده با SQLCipher (D10؛ docs/rules/flutter-clean-bloc.md ۸.۲).
@DriftDatabase(
  tables: [
    Projects,
    Activities,
    ServerItems,
    SiteIssues,
    Notifications,
    SyncMeta,
    LocalReports,
    LocalReportItems,
    LocalPhotos,
    LocalIssues,
    LocalResubmissions,
    Outbox,
  ],
)
class AppDatabase extends _$AppDatabase {
  AppDatabase(super.e);

  /// پایگاه دادهٔ تست در حافظه.
  factory AppDatabase.memory() => AppDatabase(NativeDatabase.memory());

  /// باز کردن فایل رمزنگاری‌شده با کلید hex ۶۴ نویسه‌ای.
  static Future<AppDatabase> openEncrypted(String keyHex) async {
    final dir = await getApplicationSupportDirectory();
    final file = File(p.join(dir.path, 'projeyar_field.db'));
    return AppDatabase(
      NativeDatabase.createInBackground(
        file,
        isolateSetup: _setupSqlCipher,
        setup: (db) {
          // کلید خام؛ بدون مشتق‌سازی کلمهٔ عبور
          db.execute("PRAGMA key = \"x'$keyHex'\";");
          final cipher = db.select('PRAGMA cipher_version;');
          if (cipher.isEmpty) throw StateError('SQLCipher is not available');
          db.execute('PRAGMA foreign_keys = ON;');
        },
      ),
    );
  }

  static void _setupSqlCipher() {
    open.overrideFor(OperatingSystem.android, openCipherOnAndroid);
  }

  @override
  int get schemaVersion => 2;

  @override
  MigrationStrategy get migration => MigrationStrategy(
    onCreate: (m) => m.createAll(),
    onUpgrade: (m, from, to) async {
      // ۲: اعلان‌ها در sync و ساعت یادآوری پروژه (1405/08/30). صف و دادهٔ گوشی دست نمی‌خورند.
      if (from < 2) {
        await m.createTable(notifications);
        await m.addColumn(projects, projects.reminderEnabled);
        await m.addColumn(projects, projects.reminderTime);
      }
    },
    beforeOpen: (details) async {
      await customStatement('PRAGMA foreign_keys = ON');
    },
  );

  /// پاک کردن همهٔ داده‌ها هنگام خروج (پس از هشدار صف؛ F08 ۵.۱).
  Future<void> wipe() => transaction(() async {
    for (final table in allTables) {
      await delete(table).go();
    }
  });
}
