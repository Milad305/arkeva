import 'package:projeyar_field/core/result/result.dart';

/// تنظیمات و دادهٔ محلی M14.
abstract interface class ProfileRepository {
  Stream<bool> watchReminderEnabled();

  Future<Result<Unit>> setReminderEnabled({required bool enabled});

  Future<String> appVersion();

  /// پاک کردن کامل گوشی پس از خروج: پایگاه داده، عکس‌ها، کلید عکس‌ها، کار پس‌زمینه و یادآوری (rules ۸.۱۰).
  Future<Result<Unit>> wipeLocalData();
}
