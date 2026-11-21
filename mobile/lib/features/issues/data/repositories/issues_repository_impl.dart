import 'package:drift/drift.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/database/app_database.dart';
import 'package:projeyar_field/core/database/meta_store.dart';
import 'package:projeyar_field/core/error/failure.dart';
import 'package:projeyar_field/core/result/result.dart';
import 'package:projeyar_field/core/security/file_cipher.dart';
import 'package:projeyar_field/core/time/clock.dart';
import 'package:projeyar_field/core/util/streams.dart';
import 'package:projeyar_field/features/issues/domain/entities/issue_entities.dart';
import 'package:projeyar_field/features/issues/domain/repositories/issues_repository.dart';
import 'package:projeyar_field/features/queue/domain/repositories/queue_repository.dart';
import 'package:uuid/uuid.dart';

@LazySingleton(as: IssuesRepository)
class IssuesRepositoryImpl implements IssuesRepository {
  IssuesRepositoryImpl(this._db, this._outbox, this._queue, this._cipher, this._clock);

  final AppDatabase _db;
  final OutboxWriter _outbox;
  final QueueRepository _queue;
  final FileCipher _cipher;
  final Clock _clock;

  @override
  String newIssueId() => const Uuid().v4();

  @override
  Future<Result<Unit>> submit(IssueDraft draft) async {
    try {
      final now = _clock.now().toUtc();
      await _db.transaction(() async {
        await _db
            .into(_db.localIssues)
            .insert(
              LocalIssuesCompanion.insert(
                id: draft.id,
                projectId: draft.projectId,
                type: draft.type.name,
                title: draft.title,
                description: Value(draft.description),
                effect: draft.effect.name,
                wbsItemId: Value(draft.activityId),
                deviceRecordedAt: now,
              ),
            );
        await _outbox.enqueue(kind: 'issue', entityId: draft.id, projectId: draft.projectId, now: now);
        final photos = await (_db.select(_db.localPhotos)..where((t) => t.ownerKind.equals('issue') & t.issueId.equals(draft.id))).get();
        for (final p in photos) {
          await (_db.update(_db.localPhotos)..where((t) => t.id.equals(p.id))).write(
            LocalPhotosCompanion(uploadState: const Value('queued'), projectId: Value(draft.projectId)),
          );
          await _outbox.enqueue(kind: 'photo', entityId: p.id, projectId: draft.projectId, now: now, bytes: p.sizeBytes);
        }
      });
      _queue.kick();
      return const Ok(unit);
    } on Object {
      return const Err(StorageFailure());
    }
  }

  @override
  Future<void> discard(String issueId) async {
    final saved = await (_db.select(_db.localIssues)..where((t) => t.id.equals(issueId))).getSingleOrNull();
    if (saved != null) return;
    final photos = await (_db.select(_db.localPhotos)..where((t) => t.issueId.equals(issueId))).get();
    await (_db.delete(_db.localPhotos)..where((t) => t.issueId.equals(issueId))).go();
    for (final p in photos) {
      await _cipher.delete(p.filePath);
    }
  }

  @override
  Stream<List<SiteIssue>> watchIssues() => combineLatest2(
    (_db.select(_db.localIssues)..where((t) => t.state.isNotIn(['sent']))).watch(),
    _db.select(_db.siteIssues).watch(),
    (List<LocalIssueRow> local, List<SiteIssueRow> server) {
      final serverIds = server.map((s) => s.id).toSet();
      final list = <SiteIssue>[
        for (final l in local.where((l) => !serverIds.contains(l.id)))
          SiteIssue(
            id: l.id,
            projectId: l.projectId,
            title: l.title,
            type: l.type,
            effect: l.effect,
            status: l.state,
            reportedAt: l.deviceRecordedAt,
            local: true,
            rejectMessage: l.rejectMessage,
          ),
        for (final s in server)
          SiteIssue(
            id: s.id,
            projectId: s.projectId,
            title: s.title,
            type: s.type,
            effect: s.effect,
            status: s.status,
            reportedAt: DateTime.tryParse(s.reportedAt) ?? DateTime.fromMillisecondsSinceEpoch(0),
            riskCode: s.riskCode,
          ),
      ]..sort((a, b) => b.reportedAt.compareTo(a.reportedAt));
      return list;
    },
  );
}
