import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/database/app_database.dart';
import 'package:projeyar_field/features/activities/domain/entities/activity_entities.dart';
import 'package:projeyar_field/features/activities/domain/repositories/activities_repository.dart';

/// خواندن آینهٔ sync. ستون‌های JSON اینجا به موجودیت تبدیل می‌شوند (mapper لایهٔ داده).
@LazySingleton(as: ActivitiesRepository)
class ActivitiesRepositoryImpl implements ActivitiesRepository {
  const ActivitiesRepositoryImpl(this._db);

  final AppDatabase _db;

  @override
  Stream<List<Project>> watchProjects() =>
      (_db.select(_db.projects)..orderBy([(t) => OrderingTerm(expression: t.name)])).watch().map((rows) => rows.map(projectOf).toList());

  @override
  Stream<List<Activity>> watchActivities() =>
      (_db.select(_db.activities)..orderBy([(t) => OrderingTerm(expression: t.code)])).watch().map((rows) => rows.map(activityOf).toList());

  @override
  Stream<Activity?> watchActivity(String id) =>
      (_db.select(_db.activities)..where((t) => t.id.equals(id))).watchSingleOrNull().map((row) => row == null ? null : activityOf(row));

  @override
  Future<Activity?> activity(String id) async {
    final row = await (_db.select(_db.activities)..where((t) => t.id.equals(id))).getSingleOrNull();
    return row == null ? null : activityOf(row);
  }

  @override
  Future<Project?> project(String id) async {
    final row = await (_db.select(_db.projects)..where((t) => t.id.equals(id))).getSingleOrNull();
    return row == null ? null : projectOf(row);
  }

  @override
  Future<List<Activity>> activitiesOf(String projectId) async {
    final rows = await (_db.select(_db.activities)
          ..where((t) => t.projectId.equals(projectId))
          ..orderBy([(t) => OrderingTerm(expression: t.code)]))
        .get();
    return rows.map(activityOf).toList();
  }

  static Project projectOf(ProjectRow r) => Project(
    id: r.id,
    name: r.name,
    site: r.siteLat == null || r.siteLng == null ? null : SiteArea(lat: r.siteLat!, lng: r.siteLng!, radiusM: r.radiusM),
    rules: ReportRules(
      minPhotos: r.minPhotos,
      maxJumpPct: r.maxJumpPct,
      allowDecrease: r.allowDecrease,
      lateAfterHours: r.lateAfterHours,
      gpsMode: r.gpsMode,
      approvalMode: r.approvalMode,
    ),
    reminder: DailyReminder(enabled: r.reminderEnabled, time: r.reminderTime),
  );

  static Activity activityOf(ActivityRow r) => Activity(
    id: r.id,
    projectId: r.projectId,
    parentId: r.parentId,
    code: r.code,
    title: r.title,
    method: MeasureMethod.parse(r.method),
    unit: r.unit,
    totalQuantity: r.totalQuantity,
    steps: [
      for (final s in _list(r.stepsJson))
        ActivityStep(
          key: '${s['key']}',
          title: '${s['title']}',
          weight: (s['weight'] as num?)?.toDouble() ?? 0,
          approvedPercent: (s['approvedPercent'] as num?)?.toDouble() ?? 0,
        ),
    ],
    plannedStart: r.plannedStart,
    plannedFinish: r.plannedFinish,
    approvedPercent: r.approvedPercent,
    approvedQuantity: r.approvedQuantity,
    lastPendingPercent: r.lastPendingPercent,
    plan: [
      for (final p in _list(r.planJson))
        PlanPoint(date: '${p['date']}', plannedPercent: (p['plannedPercent'] as num?)?.toDouble() ?? 0),
    ],
    approverUserId: r.approverUserId,
    approverName: r.approverName,
  );

  static List<Map<String, Object?>> _list(String? json) {
    if (json == null) return const [];
    final decoded = jsonDecode(json);
    return decoded is List ? decoded.whereType<Map<String, Object?>>().toList() : const [];
  }
}
