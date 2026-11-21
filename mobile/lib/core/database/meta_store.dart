import 'package:drift/drift.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/database/app_database.dart';

/// کلیدهای جدول `SyncMeta`؛ فقط لایهٔ داده آن را می‌خواند.
abstract final class MetaKeys {
  static const cursor = 'sync.cursor';
  static const serverTime = 'sync.server_time';
  static const today = 'sync.today';
  static const lastSyncAt = 'sync.last_sync_at';
  static const lastAttemptAt = 'sync.last_attempt_at';
  static const wifiOnly = 'pref.wifi_only';
  static const reminderEnabled = 'pref.reminder_enabled';
  static const outboxLock = 'outbox.lock';
}

/// کلید ← مقدار کوچک در پایگاه دادهٔ رمزنگاری‌شده.
@lazySingleton
class MetaStore {
  const MetaStore(this._db);

  final AppDatabase _db;

  Future<String?> read(String key) async =>
      (await (_db.select(_db.syncMeta)..where((t) => t.key.equals(key))).getSingleOrNull())?.value;

  Stream<String?> watch(String key) =>
      (_db.select(_db.syncMeta)..where((t) => t.key.equals(key))).watchSingleOrNull().map((row) => row?.value);

  Future<void> write(String key, String value) =>
      _db.into(_db.syncMeta).insertOnConflictUpdate(SyncMetaCompanion.insert(key: key, value: value));

  Future<void> remove(String key) => (_db.delete(_db.syncMeta)..where((t) => t.key.equals(key))).go();

  Future<bool> readBool(String key, {bool fallback = false}) async {
    final raw = await read(key);
    return raw == null ? fallback : raw == 'true';
  }

  Stream<bool> watchBool(String key, {bool fallback = false}) => watch(key).map((raw) => raw == null ? fallback : raw == 'true');

  Future<DateTime?> readTime(String key) async {
    final raw = await read(key);
    return raw == null ? null : DateTime.tryParse(raw);
  }

  /// قفل یک‌اجرایی میان اپ و کار پس‌زمینه (دو isolate). قفل کهنه‌تر از `stale` شکسته می‌شود.
  Future<bool> tryLock(String key, DateTime now, {Duration stale = const Duration(minutes: 10)}) =>
      _db.transaction(() async {
        final held = await readTime(key);
        if (held != null && now.difference(held) < stale) return false;
        await write(key, now.toUtc().toIso8601String());
        return true;
      });

  Future<void> unlock(String key) => remove(key);
}

/// افزودن به صف ارسال از لایهٔ دادهٔ هر ویژگی، درون همان تراکنش ذخیرهٔ موجودیت.
@lazySingleton
class OutboxWriter {
  const OutboxWriter(this._db);

  final AppDatabase _db;

  Future<void> enqueue({
    required String kind,
    required String entityId,
    required String projectId,
    required DateTime now,
    int bytes = 0,
  }) => _db
      .into(_db.outbox)
      .insert(
        OutboxCompanion.insert(
          kind: kind,
          entityId: entityId,
          projectId: projectId,
          bytes: Value(bytes),
          createdAt: now,
          updatedAt: now,
        ),
        mode: InsertMode.insertOrIgnore,
      );
}
