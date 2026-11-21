import 'dart:convert';
import 'dart:math' as math;

import 'package:drift/drift.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/database/app_database.dart';
import 'package:projeyar_field/core/database/meta_store.dart';
import 'package:projeyar_field/core/device/app_info.dart';
import 'package:projeyar_field/core/error/error_mapper.dart';
import 'package:projeyar_field/core/error/exceptions.dart';
import 'package:projeyar_field/core/error/failure.dart';
import 'package:projeyar_field/core/network/json_read.dart';
import 'package:projeyar_field/core/network/network_info.dart';
import 'package:projeyar_field/core/security/file_cipher.dart';
import 'package:projeyar_field/core/time/clock.dart';
import 'package:projeyar_field/features/queue/data/datasources/outbox_remote_data_source.dart';
import 'package:projeyar_field/features/queue/data/outbox_rows.dart';
import 'package:projeyar_field/features/queue/domain/entities/queue_entities.dart';
import 'package:projeyar_field/features/queue/domain/services/outbox_planner.dart';

enum _Outcome { sent, failed, rejected, stop }

/// پردازشگر صف (M09؛ AC-FA-01، 02، 03). یک اجرا در هر لحظه با قفل `SyncMeta` میان اپ و workmanager.
/// پس از هر ارسال دوباره برنامه‌ریزی می‌کند، چون عکس‌ها فقط پس از رسیدن گزارش صاحبشان آماده می‌شوند.
@lazySingleton
class OutboxProcessor {
  OutboxProcessor(this._db, this._remote, this._cipher, this._meta, this._network, this._clock, this._appInfo);

  final AppDatabase _db;
  final OutboxRemoteDataSource _remote;
  final FileCipher _cipher;
  final MetaStore _meta;
  final NetworkInfo _network;
  final Clock _clock;
  final AppInfo _appInfo;

  Future<QueueRunReport> run() async {
    if (!await _meta.tryLock(MetaKeys.outboxLock, _clock.now())) return const QueueRunReport(skipped: true);
    var sent = 0;
    var failed = 0;
    var rejected = 0;
    try {
      final attempted = <int>{};
      while (true) {
        final plan = OutboxPlanner.plan(
          await OutboxRows.entries(_db),
          now: _clock.now(),
          network: await _network.current(),
          wifiOnly: await _meta.readBool(MetaKeys.wifiOnly),
        ).where((e) => !attempted.contains(e.id));
        if (plan.isEmpty) break;
        final entry = plan.first;
        attempted.add(entry.id);
        final outcome = await _attempt(entry);
        if (outcome == _Outcome.sent) sent++;
        if (outcome == _Outcome.failed) failed++;
        if (outcome == _Outcome.rejected) rejected++;
        if (outcome == _Outcome.stop) {
          failed++;
          break;
        }
      }
    } finally {
      await _meta.unlock(MetaKeys.outboxLock);
    }
    return QueueRunReport(sent: sent, failed: failed, rejected: rejected);
  }

  Future<_Outcome> _attempt(QueueEntry entry) async {
    await _setState(entry.id, OutboxState.sending);
    try {
      switch (entry.kind) {
        case OutboxKind.report:
          await _sendReport(entry.entityId);
        case OutboxKind.issue:
          await _sendIssue(entry.entityId);
        case OutboxKind.resubmit:
          await _sendResubmit(entry.entityId);
        case OutboxKind.photo:
          await _sendPhoto(entry.entityId);
      }
      await _setState(entry.id, OutboxState.sent, clearError: true);
      return _Outcome.sent;
    } on Object catch (e) {
      final failure = ErrorMapper.map(e);
      if (failure is UnauthorizedFailure || failure is UpdateRequiredFailure) {
        // نشست تمام شد یا نسخهٔ اپ کهنه است؛ صف دست‌نخورده می‌ماند (rules ۷.۳؛ F08 ۵.۳)
        await _setState(entry.id, OutboxState.pending);
        return _Outcome.stop;
      }
      if (failure.retryable) {
        final attempts = entry.attempts + 1;
        final retryAfter = failure is RateLimitedFailure ? failure.retryAfter : null;
        await (_db.update(_db.outbox)..where((t) => t.id.equals(entry.id))).write(
          OutboxCompanion(
            state: Value(OutboxState.retry.name),
            attempts: Value(attempts),
            nextAttemptAt: Value(_clock.now().toUtc().add(OutboxPlanner.backoff(attempts, retryAfter: retryAfter))),
            lastErrorCode: Value(failure.code),
            lastErrorMessage: Value(failure.message),
            updatedAt: Value(_clock.now().toUtc()),
          ),
        );
        return failure is NetworkFailure || failure is TimeoutFailure ? _Outcome.stop : _Outcome.failed;
      }
      await _reject(entry, failure);
      return _Outcome.rejected;
    }
  }

  Future<void> _setState(int id, OutboxState state, {bool clearError = false}) =>
      (_db.update(_db.outbox)..where((t) => t.id.equals(id))).write(
        OutboxCompanion(
          state: Value(state.name),
          updatedAt: Value(_clock.now().toUtc()),
          lastErrorCode: clearError ? const Value(null) : const Value.absent(),
          lastErrorMessage: clearError ? const Value(null) : const Value.absent(),
        ),
      );

  /// «پذیرفته نشد» (F08 ۵.۳): ردیف و دادهٔ محلی می‌مانند تا سرپرست تصمیم بگیرد.
  Future<void> _reject(QueueEntry entry, Failure failure) => _db.transaction(() async {
    await (_db.update(_db.outbox)..where((t) => t.id.equals(entry.id))).write(
      OutboxCompanion(
        state: Value(OutboxState.rejected.name),
        attempts: Value(entry.attempts + 1),
        lastErrorCode: Value(failure.code),
        lastErrorMessage: Value(failure.message),
        updatedAt: Value(_clock.now().toUtc()),
      ),
    );
    switch (entry.kind) {
      case OutboxKind.report:
        await (_db.update(_db.localReports)..where((t) => t.id.equals(entry.entityId))).write(
          LocalReportsCompanion(state: const Value('rejected'), rejectCode: Value(failure.code), rejectMessage: Value(failure.message)),
        );
      case OutboxKind.issue:
        await (_db.update(_db.localIssues)..where((t) => t.id.equals(entry.entityId))).write(
          LocalIssuesCompanion(state: const Value('rejected'), rejectMessage: Value(failure.message)),
        );
      case OutboxKind.resubmit:
        await (_db.update(_db.localResubmissions)..where((t) => t.id.equals(entry.entityId))).write(
          LocalResubmissionsCompanion(state: const Value('rejected'), rejectMessage: Value(failure.message)),
        );
      case OutboxKind.photo:
        break;
    }
  });

  // ---------------------------------------------------------------- گزارش

  Future<void> _sendReport(String reportId) async {
    final report = await (_db.select(_db.localReports)..where((t) => t.id.equals(reportId))).getSingle();
    final items = await (_db.select(_db.localReportItems)..where((t) => t.reportId.equals(reportId))).get();
    final photos = await (_db.select(_db.localPhotos)..where((t) => t.ownerKind.equals('report') & t.reportId.equals(reportId))).get();
    final body = <String, Object?>{
      'id': report.id,
      'projectId': report.projectId,
      'workDate': report.workDate,
      'deviceRecordedAt': (report.deviceRecordedAt ?? report.createdAt).toUtc().toIso8601String(),
      'appVersion': await _version(),
      if (report.gpsLat != null && report.gpsLng != null)
        'gps': {'lat': report.gpsLat, 'lng': report.gpsLng, 'accuracyM': report.gpsAccuracyM},
      'weather': report.weather,
      'temperatureC': report.temperatureC,
      'note': report.note,
      'attested': report.attestedAt != null,
      'mockLocation': report.mockLocation || photos.any((p) => p.mocked),
      'items': [
        for (final i in items)
          {
            'id': i.id,
            'wbsItemId': i.wbsItemId,
            'values': _values(i.reportedPercent, i.quantityToday, i.stepsJson),
            'crewCount': i.crewCount,
            'note': i.note,
          },
      ],
      'photos': [
        for (final p in photos)
          {
            'id': p.id,
            'itemId': p.itemId,
            'sha256': p.sha256,
            'takenAt': p.takenAt.toUtc().toIso8601String(),
            'lat': p.lat,
            'lng': p.lng,
            'accuracyM': p.accuracyM,
            'caption': p.caption,
          },
      ],
    };
    final response = await _remote.postReport(body);
    await _db.transaction(() async {
      await (_db.update(_db.localReports)..where((t) => t.id.equals(reportId))).write(
        LocalReportsCompanion(state: const Value('sent'), reportNo: Value(response['reportNo'] as String?)),
      );
      for (final item in (response['items'] as List?) ?? const []) {
        if (item is! Map) continue;
        await (_db.update(_db.localReportItems)..where((t) => t.id.equals('${item['id']}'))).write(
          LocalReportItemsCompanion(
            serverStatus: Value(item['status'] as String?),
            serverFlagsJson: Value(item['flags'] == null ? null : jsonEncode(item['flags'])),
            serverPercent: Value(readNum(item['computedPercent'])),
          ),
        );
      }
    });
  }

  static Map<String, Object?> _values(double? percent, double? quantity, String? stepsJson) => {
    'reportedPercent': ?percent,
    'quantityToday': ?quantity,
    if (stepsJson != null) 'steps': OutboxRows.decodeSteps(stepsJson),
  };

  // ---------------------------------------------------------------- مشکل و اصلاح

  Future<void> _sendIssue(String issueId) async {
    final issue = await (_db.select(_db.localIssues)..where((t) => t.id.equals(issueId))).getSingle();
    final photos = await (_db.select(_db.localPhotos)..where((t) => t.ownerKind.equals('issue') & t.issueId.equals(issueId))).get();
    await _remote.postIssue({
      'id': issue.id,
      'projectId': issue.projectId,
      'type': issue.type,
      'title': issue.title,
      'description': issue.description,
      'effect': issue.effect,
      'wbsItemId': issue.wbsItemId,
      'deviceRecordedAt': issue.deviceRecordedAt.toUtc().toIso8601String(),
      'photos': [for (final p in photos) {'id': p.id, 'sha256': p.sha256, 'takenAt': p.takenAt.toUtc().toIso8601String()}],
    });
    await (_db.update(_db.localIssues)..where((t) => t.id.equals(issueId))).write(const LocalIssuesCompanion(state: Value('sent')));
  }

  Future<void> _sendResubmit(String id) async {
    final row = await (_db.select(_db.localResubmissions)..where((t) => t.id.equals(id))).getSingle();
    final photos = await (_db.select(_db.localPhotos)..where((t) => t.ownerKind.equals('revision') & t.reportId.equals(id))).get();
    await _remote.putItem(row.itemId, {
      'values': _values(row.reportedPercent, row.quantityToday, row.stepsJson),
      'note': row.note,
      'photos': [
        for (final p in photos)
          {'id': p.id, 'sha256': p.sha256, 'takenAt': p.takenAt.toUtc().toIso8601String(), 'lat': p.lat, 'lng': p.lng, 'accuracyM': p.accuracyM},
      ],
    }, idempotencyKey: row.id);
    await (_db.update(_db.localResubmissions)..where((t) => t.id.equals(id))).write(const LocalResubmissionsCompanion(state: Value('sent')));
  }

  // ---------------------------------------------------------------- عکس (F20؛ AC-FA-03)

  Future<void> _sendPhoto(String photoId) async {
    final photo = await (_db.select(_db.localPhotos)..where((t) => t.id.equals(photoId))).getSingleOrNull();
    if (photo == null || photo.uploadState == 'uploaded') return;
    final bytes = await _cipher.readDecrypted(photo.filePath);
    var session = await _resume(photo.uploadId);
    if (session == null) {
      try {
        session = await _remote.createUpload({
          'projectId': photo.projectId,
          'kind': photo.ownerKind == 'issue' ? 'issue_photo' : 'photo',
          'subjectId': photo.id,
          'fileName': '${photo.id}.jpg',
          'contentType': 'image/jpeg',
          'size': bytes.length,
        });
      } on ApiException catch (e) {
        // «این عکس پیش‌تر کامل بارگذاری شده است»: پاسخ قبلی گم شده بود
        if (e.statusCode == 409 && e.body?.code == 'UPLOAD_INVALID') return _uploaded(photo);
        rethrow;
      }
      await (_db.update(_db.localPhotos)..where((t) => t.id.equals(photoId))).write(LocalPhotosCompanion(uploadId: Value(session.uploadId)));
    }
    if (!session.complete) {
      await _putParts(session, session.missingParts, bytes);
      try {
        await _remote.complete(session.uploadId, photo.sha256);
      } on ApiException catch (e) {
        if (e.statusCode != 409 || e.body?.code != 'UPLOAD_INCOMPLETE') rethrow;
        final missing = [for (final p in (e.body?.details['missingParts'] as List?) ?? const []) readInt(p) ?? 0];
        await _putParts(session, missing, bytes);
        await _remote.complete(session.uploadId, photo.sha256);
      }
    }
    await _uploaded(photo);
  }

  /// ادامه از همان نقطه با `GET /uploads/:id`؛ جلسهٔ منقضی یا ناپیدا ← جلسهٔ تازه.
  Future<UploadSessionView?> _resume(String? uploadId) async {
    if (uploadId == null) return null;
    try {
      return await _remote.uploadStatus(uploadId);
    } on ApiException catch (e) {
      if (e.statusCode == 404 || e.statusCode == 410) return null;
      rethrow;
    }
  }

  Future<void> _putParts(UploadSessionView session, List<int> parts, Uint8List bytes) async {
    for (final part in parts) {
      if (part < 1 || part > session.partCount) continue;
      final start = (part - 1) * session.partSize;
      final end = math.min(start + session.partSize, bytes.length);
      await _remote.putPart(session.uploadId, part, Uint8List.sublistView(bytes, start, end));
    }
  }

  /// پس از موفقیت دادهٔ عکس پاک می‌شود و ردیف می‌ماند (rules ۹).
  Future<void> _uploaded(LocalPhotoRow photo) async {
    await (_db.update(_db.localPhotos)..where((t) => t.id.equals(photo.id))).write(const LocalPhotosCompanion(uploadState: Value('uploaded')));
    await _cipher.delete(photo.filePath);
  }

  Future<String?> _version() async {
    try {
      return await _appInfo.version();
    } on Object {
      return null;
    }
  }
}
