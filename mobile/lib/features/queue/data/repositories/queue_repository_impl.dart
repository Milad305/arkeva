import 'dart:async';

import 'package:drift/drift.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/database/app_database.dart';
import 'package:projeyar_field/core/database/meta_store.dart';
import 'package:projeyar_field/core/error/error_mapper.dart';
import 'package:projeyar_field/core/error/failure.dart';
import 'package:projeyar_field/core/result/result.dart';
import 'package:projeyar_field/core/security/file_cipher.dart';
import 'package:projeyar_field/features/queue/data/outbox_processor.dart';
import 'package:projeyar_field/features/queue/data/outbox_rows.dart';
import 'package:projeyar_field/features/queue/domain/entities/queue_entities.dart';
import 'package:projeyar_field/features/queue/domain/repositories/queue_repository.dart';

@LazySingleton(as: QueueRepository)
class QueueRepositoryImpl implements QueueRepository {
  QueueRepositoryImpl(this._db, this._meta, this._processor, this._cipher);

  final AppDatabase _db;
  final MetaStore _meta;
  final OutboxProcessor _processor;
  final FileCipher _cipher;
  final _kicks = StreamController<void>.broadcast();

  Selectable<OutboxRow> get _waiting => _db.select(_db.outbox)..where((t) => t.state.isNotIn([OutboxState.sent.name]));

  @override
  Stream<QueueSummary> watchSummary() => _waiting.watch().map(summarize).distinct();

  @override
  Future<QueueSummary> summary() async => summarize(await _waiting.get());

  static QueueSummary summarize(List<OutboxRow> rows) => QueueSummary.fromEntries(
    rows.map(
      (r) => QueueEntry(
        id: r.id,
        kind: OutboxKind.parse(r.kind),
        entityId: r.entityId,
        projectId: r.projectId,
        state: OutboxState.parse(r.state),
        attempts: r.attempts,
        createdAt: r.createdAt,
        bytes: r.bytes,
      ),
    ),
  );

  @override
  Stream<List<QueueEntry>> watchEntries() => (_db.select(_db.outbox)
        ..where((t) => t.state.isNotIn([OutboxState.sent.name]))
        ..orderBy([(t) => OrderingTerm(expression: t.createdAt)]))
      .watch()
      .asyncMap((rows) => OutboxRows.map(_db, rows));

  @override
  Stream<bool> watchWifiOnly() => _meta.watchBool(MetaKeys.wifiOnly);

  @override
  Future<bool> wifiOnly() => _meta.readBool(MetaKeys.wifiOnly);

  @override
  Future<Result<Unit>> setWifiOnly({required bool value}) async {
    try {
      await _meta.write(MetaKeys.wifiOnly, '$value');
      kick();
      return const Ok(unit);
    } on Object {
      return const Err(StorageFailure());
    }
  }

  @override
  Future<Result<QueueRunReport>> process() async {
    try {
      return Ok(await _processor.run());
    } on Object catch (e) {
      return Err(ErrorMapper.map(e));
    }
  }

  @override
  void kick() => _kicks.add(null);

  @override
  Stream<void> get kicks => _kicks.stream;

  @override
  Future<Result<Unit>> retryNow() async {
    try {
      await (_db.update(_db.outbox)..where((t) => t.state.equals(OutboxState.retry.name))).write(const OutboxCompanion(nextAttemptAt: Value(null)));
      kick();
      return const Ok(unit);
    } on Object {
      return const Err(StorageFailure());
    }
  }

  @override
  Future<Result<Unit>> discardRejected(int entryId) async {
    try {
      final row = await (_db.select(_db.outbox)..where((t) => t.id.equals(entryId))).getSingleOrNull();
      if (row == null || row.state != OutboxState.rejected.name) return const Ok(unit);
      final files = <String>[];
      await _db.transaction(() async {
        final kind = OutboxKind.parse(row.kind);
        final photos = await (_db.select(_db.localPhotos)..where((t) => switch (kind) {
              OutboxKind.photo => t.id.equals(row.entityId),
              OutboxKind.issue => t.issueId.equals(row.entityId),
              _ => t.reportId.equals(row.entityId),
            }))
            .get();
        files.addAll(photos.map((p) => p.filePath));
        final photoIds = photos.map((p) => p.id).toList();
        await (_db.delete(_db.outbox)..where((t) => t.id.equals(entryId) | t.entityId.isIn(photoIds))).go();
        await (_db.delete(_db.localPhotos)..where((t) => t.id.isIn(photoIds))).go();
        switch (kind) {
          case OutboxKind.report:
            await (_db.delete(_db.localReports)..where((t) => t.id.equals(row.entityId))).go();
          case OutboxKind.issue:
            await (_db.delete(_db.localIssues)..where((t) => t.id.equals(row.entityId))).go();
          case OutboxKind.resubmit:
            await (_db.delete(_db.localResubmissions)..where((t) => t.id.equals(row.entityId))).go();
          case OutboxKind.photo:
            break;
        }
      });
      for (final f in files) {
        await _cipher.delete(f);
      }
      return const Ok(unit);
    } on Object {
      return const Err(StorageFailure());
    }
  }
}
