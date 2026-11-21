import 'package:projeyar_field/features/activities/domain/entities/activity_entities.dart';

/// قواعد زمانی فعالیت‌ها (F08 ۴.۱ و M03). تاریخ‌ها `YYYY-MM-DD`؛ مقایسهٔ رشته‌ای همان ترتیب تقویمی است.
abstract final class ActivitySchedule {
  /// «فعالیت‌های امروز» `[تأییدشده]`: امروز در بازهٔ برنامه‌ای است، یا شروع‌نشده و موعد شروع گذشته،
  /// یا تمام‌نشده و موعد پایان گذشته.
  static bool isDueToday(Activity a, String today) {
    final start = a.plannedStart;
    final finish = a.plannedFinish;
    final inWindow = start != null && finish != null && start.compareTo(today) <= 0 && finish.compareTo(today) >= 0;
    final notStarted = a.approvedPercent <= 0 && a.lastPendingPercent == null;
    final startOverdue = notStarted && start != null && start.compareTo(today) < 0;
    final finishOverdue = a.approvedPercent < 100 && finish != null && finish.compareTo(today) < 0;
    return inWindow || startOverdue || finishOverdue;
  }

  /// «برنامهٔ امروز Z٪» از برنامهٔ ۱۴ روزهٔ همگام‌شده؛ بیرون از آن از بازهٔ برنامه‌ای.
  static double? plannedOn(Activity a, String date) {
    for (final point in a.plan) {
      if (point.date == date) return point.plannedPercent;
    }
    final finish = a.plannedFinish;
    if (finish != null && date.compareTo(finish) > 0) return 100;
    final start = a.plannedStart;
    if (start != null && date.compareTo(start) < 0) return 0;
    return null;
  }

  /// انحراف تأییدشده از برنامه به واحد درصد؛ منفی = عقب.
  static double? deviation(Activity a, String date) {
    final planned = plannedOn(a, date);
    return planned == null ? null : a.approvedPercent - planned;
  }

  /// مرتب‌سازی M03: بیشترین عقب‌افتادگی اول، سپس کد.
  static int compareForToday(Activity a, Activity b, String today) {
    final da = deviation(a, today) ?? 0;
    final db = deviation(b, today) ?? 0;
    final byDev = da.compareTo(db);
    return byDev != 0 ? byDev : a.code.compareTo(b.code);
  }
}
