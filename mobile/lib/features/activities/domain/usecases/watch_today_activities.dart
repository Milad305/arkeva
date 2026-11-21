import 'package:injectable/injectable.dart';
import 'package:projeyar_field/features/activities/domain/entities/activity_entities.dart';
import 'package:projeyar_field/features/activities/domain/repositories/activities_repository.dart';
import 'package:projeyar_field/features/activities/domain/services/activity_schedule.dart';

/// M03: فعالیت‌های امروز طبق قاعدهٔ F08 ۴.۱، عقب‌افتاده‌ترین اول.
@injectable
class WatchTodayActivities {
  const WatchTodayActivities(this._repository);

  final ActivitiesRepository _repository;

  Stream<List<Activity>> call(String today) => _repository.watchActivities().map((all) => select(all, today));

  static List<Activity> select(List<Activity> all, String today) =>
      all.where((a) => ActivitySchedule.isDueToday(a, today)).toList()
        ..sort((a, b) => ActivitySchedule.compareForToday(a, b, today));
}
