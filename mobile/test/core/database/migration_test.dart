import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:projeyar_field/core/database/app_database.dart';

void main() {
  test('پایگاه دادهٔ نسخهٔ ۱ به ۲ می‌رود: جدول اعلان‌ها و ساعت یادآوری پروژه، دادهٔ موجود می‌ماند', () async {
    final db = AppDatabase(
      NativeDatabase.memory(
        setup: (raw) {
          raw
            ..execute('''
              CREATE TABLE projects (
                id TEXT NOT NULL PRIMARY KEY, name TEXT NOT NULL, site_lat REAL, site_lng REAL, radius_m REAL,
                min_photos INTEGER NOT NULL DEFAULT 0, max_jump_pct REAL, allow_decrease INTEGER NOT NULL DEFAULT 0,
                late_after_hours INTEGER, gps_mode TEXT, approval_mode TEXT, calendar_json TEXT NOT NULL DEFAULT '{}')
            ''')
            ..execute("INSERT INTO projects (id, name) VALUES ('p1', 'پروژه')")
            ..execute('PRAGMA user_version = 1');
        },
      ),
    );
    addTearDown(db.close);
    final project = await db.select(db.projects).getSingle();
    expect((project.name, project.reminderEnabled, project.reminderTime), ('پروژه', true, '17:00'));
    await db.into(db.notifications).insert(NotificationsCompanion.insert(id: 'n1', code: 'X', title: 't', createdAt: '2026-11-20T00:00:00Z'));
    expect(await db.select(db.notifications).get(), hasLength(1));
    expect(db.schemaVersion, 2);
  });
}
