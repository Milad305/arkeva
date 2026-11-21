import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/device/schedulers.dart';
import 'package:projeyar_field/core/time/clock.dart';
import 'package:timezone/timezone.dart' as tz;

/// یادآوری «گزارش امروز ثبت نشده» با اعلان محلی در ساعت تهران.
/// ساعت از `rules.dailyReminder` پروژه‌ها در `/field/sync` (زودترین ساعت فعال؛ `SessionServices`).
@LazySingleton(as: ReminderScheduler)
class LocalReminderScheduler implements ReminderScheduler {
  LocalReminderScheduler(this._clock);

  final Clock _clock;
  final _plugin = FlutterLocalNotificationsPlugin();
  bool _ready = false;

  static const _id = 4104;

  Future<void> _init() async {
    if (_ready) return;
    await _plugin.initialize(
      settings: const InitializationSettings(android: AndroidInitializationSettings('@mipmap/ic_launcher')),
    );
    await _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()?.requestNotificationsPermission();
    _ready = true;
  }

  @override
  Future<void> refresh({required bool hasReportToday, required bool enabled, required String? time}) async {
    try {
      await _init();
      await _plugin.cancel(id: _id);
      final parts = time?.split(':');
      final hour = parts == null || parts.length != 2 ? null : int.tryParse(parts[0]);
      final minute = parts == null || parts.length != 2 ? null : int.tryParse(parts[1]);
      if (!enabled || hour == null || minute == null) return;
      final tehran = tz.getLocation('Asia/Tehran');
      final now = tz.TZDateTime.from(_clock.now(), tehran);
      var at = tz.TZDateTime(tehran, now.year, now.month, now.day, hour, minute);
      if (hasReportToday || !at.isAfter(now)) at = at.add(const Duration(days: 1));
      await _plugin.zonedSchedule(
        id: _id,
        scheduledDate: at,
        title: 'گزارش امروز',
        body: 'گزارش امروز هنوز ثبت نشده است. بدون اینترنت هم می‌توانید ثبت کنید.',
        notificationDetails: const NotificationDetails(
          android: AndroidNotificationDetails('daily_reminder', 'یادآوری روزانه', importance: Importance.high, priority: Priority.high),
        ),
        androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
      );
    } on Object {
      // نبود مجوز اعلان نباید کار اپ را متوقف کند
    }
  }

  @override
  Future<void> cancel() async {
    try {
      await _init();
      await _plugin.cancel(id: _id);
    } on Object {
      return;
    }
  }
}
