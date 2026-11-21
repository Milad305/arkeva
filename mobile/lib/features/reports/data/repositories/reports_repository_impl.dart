import 'dart:async';

import 'package:drift/drift.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/database/app_database.dart';
import 'package:projeyar_field/core/database/meta_store.dart';
import 'package:projeyar_field/core/device/location.dart';
import 'package:projeyar_field/core/error/failure.dart';
import 'package:projeyar_field/core/result/result.dart';
import 'package:projeyar_field/core/security/file_cipher.dart';
import 'package:projeyar_field/core/time/clock.dart';
import 'package:projeyar_field/core/util/streams.dart';
import 'package:projeyar_field/features/queue/domain/repositories/queue_repository.dart';
import 'package:projeyar_field/features/reports/data/mappers/report_mappers.dart';
import 'package:projeyar_field/features/reports/domain/entities/report_entities.dart';
import 'package:projeyar_field/features/reports/domain/repositories/reports_repository.dart';
import 'package:uuid/uuid.dart';

@LazySingleton(as: ReportsRepository)
class ReportsRepositoryImpl implements ReportsRepository {
  ReportsRepositoryImpl(this._db, this._outbox, this._queue, this._cipher, this._clock);

  final AppDatabase _db;
  final OutboxWriter _outbox;
  final QueueRepository _queue;
  final FileCipher _cipher;
  final Clock _clock;
  static const _uuid = Uuid();

  Future<Result<T>> _guard<T>(Future<T> Function() body) async {
    try {
      return Ok(await body());
    } on Object {
      return const Err(StorageFailure());
    }
  }

  @override
  Future<Result<ReportDraft>> openDraft({required String projectId, required String workDate}) => _guard(() async {
    final existing = await (_db.select(_db.localReports)
          ..where((t) => t.projectId.equals(projectId) & t.state.equals(LocalReportState.draft.name))
          ..orderBy([(t) => OrderingTerm.desc(t.createdAt)])
          ..limit(1))
        .getSingleOrNull();
    if (existing != null) return (await report(existing.id))!;
    final id = _uuid.v4();
    await _db
        .into(_db.localReports)
        .insert(LocalReportsCompanion.insert(id: id, projectId: projectId, workDate: workDate, createdAt: _clock.now().toUtc()));
    return (await report(id))!;
  });

  @override
  Stream<ReportDraft?> watchReport(String reportId) => combineLatest2(
    (_db.select(_db.localReports)..where((t) => t.id.equals(reportId))).watchSingleOrNull(),
    _itemsQuery(reportId).watch(),
    (LocalReportRow? r, List<LocalReportItemRow> items) => r == null ? null : ReportMappers.report(r, items),
  );

  @override
  Future<ReportDraft?> report(String reportId) async {
    final row = await (_db.select(_db.localReports)..where((t) => t.id.equals(reportId))).getSingleOrNull();
    return row == null ? null : ReportMappers.report(row, await _itemsQuery(reportId).get());
  }

  SimpleSelectStatement<$LocalReportItemsTable, LocalReportItemRow> _itemsQuery(String reportId) =>
      _db.select(_db.localReportItems)..where((t) => t.reportId.equals(reportId));

  @override
  Future<Result<Unit>> updateHeader(String reportId, {required String workDate, Weather? weather, int? temperatureC, String? note}) =>
      _guard(() async {
        await (_db.update(_db.localReports)..where((t) => t.id.equals(reportId) & t.state.equals(LocalReportState.draft.name))).write(
          LocalReportsCompanion(
            workDate: Value(workDate),
            weather: Value(weather?.name),
            temperatureC: Value(temperatureC),
            note: Value(note),
          ),
        );
        return unit;
      });

  @override
  Future<Result<DraftItem>> ensureItem(String reportId, String activityId) => _guard(() async {
    final existing = await (_db.select(_db.localReportItems)..where((t) => t.reportId.equals(reportId) & t.wbsItemId.equals(activityId)))
        .getSingleOrNull();
    if (existing != null) return ReportMappers.item(existing);
    final id = _uuid.v4();
    await _db.into(_db.localReportItems).insert(LocalReportItemsCompanion.insert(id: id, reportId: reportId, wbsItemId: activityId));
    return DraftItem(id: id, activityId: activityId);
  });

  @override
  Future<Result<Unit>> saveItem(String reportId, DraftItem item) => _guard(() async {
    await (_db.update(_db.localReportItems)..where((t) => t.id.equals(item.id) & t.reportId.equals(reportId))).write(
      LocalReportItemsCompanion(
        reportedPercent: Value(item.values.reportedPercent),
        quantityToday: Value(item.values.quantityToday),
        stepsJson: Value(ReportMappers.stepsJson(item.values.steps)),
        crewCount: Value(item.crewCount),
        note: Value(item.note),
      ),
    );
    return unit;
  });

  @override
  Future<Result<Unit>> removeItem(String reportId, String itemId) => _guard(() async {
    final photos = await (_db.select(_db.localPhotos)..where((t) => t.reportId.equals(reportId) & t.itemId.equals(itemId))).get();
    await _db.transaction(() async {
      await (_db.delete(_db.localPhotos)..where((t) => t.reportId.equals(reportId) & t.itemId.equals(itemId))).go();
      await (_db.delete(_db.localReportItems)..where((t) => t.id.equals(itemId))).go();
    });
    for (final p in photos) {
      await _cipher.delete(p.filePath);
    }
    return unit;
  });

  @override
  Future<Result<Unit>> submit(String reportId, {required DateTime attestedAt, GeoFix? gps}) async {
    final draft = await report(reportId);
    if (draft == null || draft.state != LocalReportState.draft) {
      return const Err(NotFoundFailure(message: 'این گزارش دیگر پیش‌نویس نیست. فهرست گزارش‌ها را ببینید.'));
    }
    if (draft.items.isEmpty || draft.items.any((i) => !i.isComplete)) {
      return const Err(ValidationFailure(message: 'هر فعالیت این گزارش باید مقدار داشته باشد. فعالیت ناقص را کامل یا حذف کنید.'));
    }
    final result = await _guard(() async {
      final now = _clock.now().toUtc();
      await _db.transaction(() async {
        await (_db.update(_db.localReports)..where((t) => t.id.equals(reportId))).write(
          LocalReportsCompanion(
            state: Value(LocalReportState.queued.name),
            deviceRecordedAt: Value(now),
            attestedAt: Value(attestedAt.toUtc()),
            gpsLat: Value(gps?.lat),
            gpsLng: Value(gps?.lng),
            gpsAccuracyM: Value(gps?.accuracyM),
            mockLocation: Value(gps?.mocked ?? false),
          ),
        );
        // عکس‌های آیتم‌هایی که حذف شدند در پیش‌نویس نمانده‌اند؛ بقیه به صف
        final photos = await (_db.select(_db.localPhotos)..where((t) => t.ownerKind.equals('report') & t.reportId.equals(reportId))).get();
        await _outbox.enqueue(kind: 'report', entityId: reportId, projectId: draft.projectId, now: now);
        for (final p in photos) {
          await (_db.update(_db.localPhotos)..where((t) => t.id.equals(p.id))).write(const LocalPhotosCompanion(uploadState: Value('queued')));
          await _outbox.enqueue(kind: 'photo', entityId: p.id, projectId: draft.projectId, now: now, bytes: p.sizeBytes);
        }
      });
      return unit;
    });
    if (result.isOk) _queue.kick();
    return result;
  }

  @override
  Future<Result<Unit>> discardDraft(String reportId) => _guard(() async {
    final photos = await (_db.select(_db.localPhotos)..where((t) => t.reportId.equals(reportId))).get();
    await _db.transaction(() async {
      await (_db.delete(_db.localPhotos)..where((t) => t.reportId.equals(reportId))).go();
      await (_db.delete(_db.localReportItems)..where((t) => t.reportId.equals(reportId))).go();
      await (_db.delete(_db.localReports)..where((t) => t.id.equals(reportId) & t.state.equals(LocalReportState.draft.name))).go();
    });
    for (final p in photos) {
      await _cipher.delete(p.filePath);
    }
    return unit;
  });

  @override
  Stream<List<ReportDraft>> watchLocalReports() => combineLatest2(
    (_db.select(_db.localReports)
          ..where((t) => t.state.isNotIn([LocalReportState.sent.name]))
          ..orderBy([(t) => OrderingTerm.desc(t.createdAt)]))
        .watch(),
    _db.select(_db.localReportItems).watch(),
    (List<LocalReportRow> reports, List<LocalReportItemRow> items) => [
      for (final r in reports) ReportMappers.report(r, items.where((i) => i.reportId == r.id).toList()),
    ],
  );

  @override
  Stream<List<ServerItem>> watchServerItems() => (_db.select(_db.serverItems)
        ..orderBy([(t) => OrderingTerm.desc(t.workDate), (t) => OrderingTerm(expression: t.reportNo)]))
      .watch()
      .map((rows) => rows.map(ReportMappers.serverItem).toList());

  @override
  Stream<ServerItem?> watchServerItem(String itemId) => (_db.select(_db.serverItems)..where((t) => t.id.equals(itemId)))
      .watchSingleOrNull()
      .map((r) => r == null ? null : ReportMappers.serverItem(r));

  @override
  Stream<bool> watchHasReportOn(String workDate) => _db
      .customSelect(
        'SELECT (SELECT COUNT(*) FROM local_reports WHERE work_date = ?1 AND state IN (?2, ?3)) '
        '+ (SELECT COUNT(*) FROM server_items WHERE work_date = ?1) AS n',
        variables: [Variable.withString(workDate), Variable.withString(LocalReportState.queued.name), Variable.withString(LocalReportState.sent.name)],
        readsFrom: {_db.localReports, _db.serverItems},
      )
      .watchSingle()
      .map((row) => row.read<int>('n') > 0);

  @override
  Future<Result<Unit>> resubmit(ResubmissionInput input) async {
    final result = await _guard(() async {
      final now = _clock.now().toUtc();
      await _db.transaction(() async {
        await _db
            .into(_db.localResubmissions)
            .insert(
              LocalResubmissionsCompanion.insert(
                id: input.id,
                itemId: input.item.id,
                projectId: input.item.projectId,
                reportedPercent: Value(input.values.reportedPercent),
                quantityToday: Value(input.values.quantityToday),
                stepsJson: Value(ReportMappers.stepsJson(input.values.steps)),
                note: Value(input.reply),
                createdAt: now,
              ),
            );
        await _outbox.enqueue(kind: 'resubmit', entityId: input.id, projectId: input.item.projectId, now: now);
        // عکس‌های تازهٔ اصلاح پس از رسیدن PUT بارگذاری می‌شوند (AC-FA-09؛ تصمیم 1405/08/30)
        final photos = await (_db.select(_db.localPhotos)..where((t) => t.ownerKind.equals('revision') & t.reportId.equals(input.id))).get();
        for (final p in photos) {
          await (_db.update(_db.localPhotos)..where((t) => t.id.equals(p.id))).write(const LocalPhotosCompanion(uploadState: Value('queued')));
          await _outbox.enqueue(kind: 'photo', entityId: p.id, projectId: input.item.projectId, now: now, bytes: p.sizeBytes);
        }
      });
      return unit;
    });
    if (result.isOk) _queue.kick();
    return result;
  }

  @override
  Stream<Set<String>> watchQueuedResubmissions() => (_db.select(_db.localResubmissions)..where((t) => t.state.equals('queued')))
      .watch()
      .map((rows) => rows.map((r) => r.itemId).toSet());
}
