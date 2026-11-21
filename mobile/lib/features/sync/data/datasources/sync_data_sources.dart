import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/database/app_database.dart';
import 'package:projeyar_field/core/database/meta_store.dart';
import 'package:projeyar_field/core/network/api_client.dart';
import 'package:projeyar_field/features/sync/data/models/sync_models.dart';

@lazySingleton
class SyncRemoteDataSource {
  const SyncRemoteDataSource(this._api);

  final ApiClient _api;

  Future<SyncResponseDto> fetch() async => SyncResponseDto.fromJson(ApiClient.asJson(await _api.get('/field/sync')));

  Future<void> heartbeat(Map<String, Object?> body) => _api.post('/field/heartbeat', body: body);
}

/// جایگزینی تراکنشی آینهٔ سرور (rules ۹: پاسخ کامل است).
@lazySingleton
class SyncLocalDataSource {
  const SyncLocalDataSource(this._db, this._meta);

  final AppDatabase _db;
  final MetaStore _meta;

  Future<void> replace(SyncResponseDto dto, DateTime syncedAt) => _db.transaction(() async {
    await _db.delete(_db.projects).go();
    await _db.delete(_db.activities).go();
    await _db.delete(_db.serverItems).go();
    await _db.delete(_db.siteIssues).go();
    await _db.delete(_db.notifications).go();
    await _db.batch((b) {
      b
        ..insertAll(_db.projects, dto.projects.map(_project))
        ..insertAll(_db.activities, dto.activities.map(_activity))
        ..insertAll(_db.serverItems, dto.items.map(_item))
        ..insertAll(_db.siteIssues, dto.issues.map(_issue))
        ..insertAll(_db.notifications, dto.notifications.map(_notification));
    });
    await _meta.write(MetaKeys.cursor, dto.cursor);
    await _meta.write(MetaKeys.serverTime, dto.serverTime);
    await _meta.write(MetaKeys.today, dto.today);
    await _meta.write(MetaKeys.lastSyncAt, syncedAt.toUtc().toIso8601String());
  });

  ProjectsCompanion _project(SyncProjectDto p) => ProjectsCompanion.insert(
    id: p.id,
    name: p.name,
    siteLat: Value(p.site?.lat),
    siteLng: Value(p.site?.lng),
    radiusM: Value(p.site?.radiusM),
    minPhotos: Value(p.rules.minPhotos ?? 0),
    maxJumpPct: Value(p.rules.maxJumpPct),
    allowDecrease: Value(p.rules.allowDecrease),
    lateAfterHours: Value(p.rules.lateAfterHours),
    gpsMode: Value(p.rules.gpsMode),
    approvalMode: Value(p.rules.approvalMode),
    calendarJson: Value(jsonEncode(p.calendar)),
    reminderEnabled: Value(p.rules.dailyReminder?.enabled ?? true),
    reminderTime: Value(p.rules.dailyReminder?.time ?? '17:00'),
  );

  NotificationsCompanion _notification(SyncNotificationDto n) => NotificationsCompanion.insert(
    id: n.id,
    code: n.code,
    category: Value(n.category),
    severity: Value(n.severity),
    title: n.title,
    body: Value(n.body),
    projectId: Value(n.projectId),
    projectName: Value(n.projectName),
    link: Value(n.link),
    createdAt: n.createdAt,
    readAt: Value(n.readAt),
    mergedCount: Value(n.mergedCount ?? 0),
  );

  ActivitiesCompanion _activity(SyncActivityDto a) => ActivitiesCompanion.insert(
    id: a.id,
    projectId: a.projectId,
    parentId: Value(a.parentId),
    code: a.code,
    title: a.title,
    method: a.method,
    unit: Value(a.unit),
    totalQuantity: Value(a.totalQuantity),
    stepsJson: Value(
      a.steps == null
          ? null
          : jsonEncode([
              for (final s in a.steps!) {'key': s.key, 'title': s.title, 'weight': s.weight, 'approvedPercent': s.approvedPercent},
            ]),
    ),
    plannedStart: Value(a.plannedStart),
    plannedFinish: Value(a.plannedFinish),
    approvedPercent: Value(a.approvedPercent),
    approvedQuantity: Value(a.approvedQuantity),
    lastPendingPercent: Value(a.lastPendingPercent),
    planJson: Value(jsonEncode([for (final p in a.plan) {'date': p.date, 'plannedPercent': p.plannedPercent}])),
    approverUserId: Value(a.approverUserId),
    approverName: Value(a.approverName),
  );

  ServerItemsCompanion _item(SyncItemDto i) => ServerItemsCompanion.insert(
    id: i.id,
    reportId: i.reportId,
    reportNo: Value(i.reportNo),
    projectId: i.projectId,
    wbsItemId: i.wbsItemId,
    workDate: Value(i.workDate),
    status: i.status,
    flagsJson: Value(jsonEncode(i.flags)),
    computedPercent: Value(i.computedPercent),
    revisionCount: Value(i.revisionCount ?? 0),
    revisionJson: Value(i.revision == null ? null : jsonEncode(i.revision)),
    photosJson: Value(jsonEncode(i.photos)),
  );

  SiteIssuesCompanion _issue(SyncIssueDto i) => SiteIssuesCompanion.insert(
    id: i.id,
    projectId: i.projectId,
    title: i.title,
    type: i.type,
    effect: i.effect,
    wbsItemId: Value(i.wbsItemId),
    reportedAt: i.reportedAt,
    riskCode: Value(i.riskCode),
    status: i.status,
    category: Value(i.category),
  );
}
