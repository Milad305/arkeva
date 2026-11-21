import 'dart:async';

import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/database/meta_store.dart';
import 'package:projeyar_field/core/device/schedulers.dart';
import 'package:projeyar_field/core/time/clock.dart';
import 'package:projeyar_field/core/util/streams.dart';
import 'package:projeyar_field/features/activities/domain/entities/activity_entities.dart';
import 'package:projeyar_field/features/activities/domain/repositories/activities_repository.dart';
import 'package:projeyar_field/features/queue/presentation/cubit/queue_status_cubit.dart';
import 'package:projeyar_field/features/reports/domain/repositories/reports_repository.dart';

/// کارهای پس از ورود: راه‌انداز صف (باز شدن اپ، اتصال، ذخیرهٔ تازه)، workmanager، و یادآوری روزانه در زودترین ساعت
/// `dailyReminder` پروژه‌ها (از `/field/sync`).
/// با خروج متوقف می‌شود. فقط از `app.dart` صدا زده می‌شود.
@lazySingleton
class SessionServices {
  SessionServices(this._queueStatus, this._background, this._reminder, this._reports, this._activities, this._meta, this._clock);

  final QueueStatusCubit _queueStatus;
  final BackgroundScheduler _background;
  final ReminderScheduler _reminder;
  final ReportsRepository _reports;
  final ActivitiesRepository _activities;
  final MetaStore _meta;
  final Clock _clock;
  StreamSubscription<(bool, bool, String?)>? _reminderSub;

  void start() {
    _queueStatus.start();
    unawaited(_background.register());
    final today = TehranTime.today(_clock.now());
    _reminderSub ??= combineLatest3(
      _reports.watchHasReportOn(today),
      _meta.watchBool(MetaKeys.reminderEnabled, fallback: true),
      _activities.watchProjects().map(DailyReminder.earliest),
      (a, b, c) => (a, b, c),
    ).distinct().listen((v) => unawaited(_reminder.refresh(hasReportToday: v.$1, enabled: v.$2, time: v.$3)));
  }

  void stop() {
    _queueStatus.stop();
    unawaited(_reminderSub?.cancel());
    _reminderSub = null;
  }
}
