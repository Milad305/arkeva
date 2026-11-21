import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/database/app_database.dart';
import 'package:projeyar_field/core/database/meta_store.dart';
import 'package:projeyar_field/core/device/app_info.dart';
import 'package:projeyar_field/core/device/schedulers.dart';
import 'package:projeyar_field/core/error/failure.dart';
import 'package:projeyar_field/core/result/result.dart';
import 'package:projeyar_field/core/security/file_cipher.dart';
import 'package:projeyar_field/core/security/secure_store.dart';
import 'package:projeyar_field/features/profile/domain/repositories/profile_repository.dart';

@LazySingleton(as: ProfileRepository)
class ProfileRepositoryImpl implements ProfileRepository {
  const ProfileRepositoryImpl(this._db, this._meta, this._cipher, this._secure, this._appInfo, this._reminder, this._background);

  final AppDatabase _db;
  final MetaStore _meta;
  final FileCipher _cipher;
  final SecureStore _secure;
  final AppInfo _appInfo;
  final ReminderScheduler _reminder;
  final BackgroundScheduler _background;

  @override
  Stream<bool> watchReminderEnabled() => _meta.watchBool(MetaKeys.reminderEnabled, fallback: true);

  @override
  Future<Result<Unit>> setReminderEnabled({required bool enabled}) async {
    try {
      await _meta.write(MetaKeys.reminderEnabled, '$enabled');
      if (!enabled) await _reminder.cancel();
      return const Ok(unit);
    } on Object {
      return const Err(StorageFailure());
    }
  }

  @override
  Future<String> appVersion() async {
    try {
      return await _appInfo.version();
    } on Object {
      return '-';
    }
  }

  @override
  Future<Result<Unit>> wipeLocalData() async {
    try {
      await _background.cancel();
      await _reminder.cancel();
      await _db.wipe();
      // کلید پایگاه داده می‌ماند چون فایل رمزنگاری‌شده با همان کلید باز است؛ ردیف‌ها پاک شدند
      await _secure.clearSession(wipeKeys: true, keepDatabaseKey: true);
      await _cipher.wipeAll();
      return const Ok(unit);
    } on Object {
      return const Err(StorageFailure(message: 'پاک کردن دادهٔ گوشی کامل نشد. اپ را ببندید و دوباره خارج شوید.'));
    }
  }
}
