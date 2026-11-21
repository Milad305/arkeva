// ignore_for_file: unreachable_from_main — WorkmanagerScheduler با injectable ثبت می‌شود
import 'package:flutter/widgets.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/app/di/injection.dart';
import 'package:projeyar_field/core/database/meta_store.dart';
import 'package:projeyar_field/core/device/schedulers.dart';
import 'package:projeyar_field/core/time/clock.dart';
import 'package:projeyar_field/features/activities/domain/entities/activity_entities.dart';
import 'package:projeyar_field/features/activities/domain/repositories/activities_repository.dart';
import 'package:projeyar_field/features/queue/domain/usecases/run_sync_cycle.dart';
import 'package:projeyar_field/features/reports/domain/repositories/reports_repository.dart';
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:workmanager/workmanager.dart';

const _periodicTask = 'projeyar.outbox.periodic';

/// ورودی isolate پس‌زمینهٔ workmanager: یک تلاش همگام‌سازی کامل (صف، دریافت، ضربان) و تازه کردن یادآوری.
/// توکن دسترسی در این isolate نیست؛ AuthInterceptor با توکن تازه‌سازی ذخیرهٔ امن می‌گیردش.
@pragma('vm:entry-point')
void backgroundDispatcher() {
  Workmanager().executeTask((task, input) async {
    try {
      WidgetsFlutterBinding.ensureInitialized();
      tzdata.initializeTimeZones();
      TehranTime.init();
      if (!getIt.isRegistered<RunSyncCycle>()) await configureDependencies();
      await getIt<RunSyncCycle>()();
      final today = TehranTime.today(getIt<Clock>().now());
      final has = await getIt<ReportsRepository>().watchHasReportOn(today).first;
      await getIt<ReminderScheduler>().refresh(
        hasReportToday: has,
        enabled: await getIt<MetaStore>().readBool(MetaKeys.reminderEnabled, fallback: true),
        time: DailyReminder.earliest(await getIt<ActivitiesRepository>().watchProjects().first),
      );
      return true;
    } on Object {
      // workmanager دوباره امتحان می‌کند؛ صف دست‌نخورده است
      return false;
    }
  });
}


@LazySingleton(as: BackgroundScheduler)
class WorkmanagerScheduler implements BackgroundScheduler {
  bool _initialized = false;

  Future<void> _init() async {
    if (_initialized) return;
    await Workmanager().initialize(backgroundDispatcher);
    _initialized = true;
  }

  /// هر ۱۵ دقیقه (کمینهٔ اندروید) و فقط با اتصال (rules ۹).
  @override
  Future<void> register() async {
    try {
      await _init();
      await Workmanager().registerPeriodicTask(
        _periodicTask,
        _periodicTask,
        frequency: const Duration(minutes: 15),
        constraints: Constraints(networkType: NetworkType.connected),
        existingWorkPolicy: ExistingPeriodicWorkPolicy.keep,
        backoffPolicy: BackoffPolicy.exponential,
      );
    } on Object {
      return;
    }
  }

  @override
  Future<void> cancel() async {
    try {
      await _init();
      await Workmanager().cancelAll();
    } on Object {
      return;
    }
  }
}
