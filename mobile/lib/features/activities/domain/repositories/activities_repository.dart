import 'package:projeyar_field/features/activities/domain/entities/activity_entities.dart';

/// فهرست پروژه‌ها و برگ‌های تخصیص‌یافته از پایگاه دادهٔ محلی (آینهٔ sync). فقط خواندنی.
abstract interface class ActivitiesRepository {
  Stream<List<Project>> watchProjects();

  Stream<List<Activity>> watchActivities();

  Stream<Activity?> watchActivity(String id);

  Future<Activity?> activity(String id);

  Future<Project?> project(String id);

  Future<List<Activity>> activitiesOf(String projectId);
}
