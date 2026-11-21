/// یادآوری روزانهٔ محلی (F08 ۷؛ NT-FLD-04) بدون Firebase.
abstract interface class ReminderScheduler {
  /// نوبت بعدی را در ساعت `time` (`HH:mm` تهران) می‌چیند: اگر امروز گزارش ثبت شده یا ساعت گذشته، فردا؛ وگرنه امروز.
  /// `time == null` (هیچ پروژه‌ای یادآوری ندارد) یا `enabled == false` (ترجیح کاربر) ← بی یادآوری.
  Future<void> refresh({required bool hasReportToday, required bool enabled, required String? time});

  Future<void> cancel();
}

/// کار پس‌زمینهٔ ارسال صف (workmanager هر ۱۵ دقیقه با قید اتصال).
abstract interface class BackgroundScheduler {
  Future<void> register();

  Future<void> cancel();
}
