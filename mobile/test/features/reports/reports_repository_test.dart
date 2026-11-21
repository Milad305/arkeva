import 'package:drift/drift.dart' hide isNotNull, isNull;
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:projeyar_field/core/database/app_database.dart';
import 'package:projeyar_field/core/database/meta_store.dart';
import 'package:projeyar_field/core/error/failure.dart';
import 'package:projeyar_field/core/security/file_cipher.dart';
import 'package:projeyar_field/features/queue/data/outbox_processor.dart';
import 'package:projeyar_field/features/queue/data/repositories/queue_repository_impl.dart';
import 'package:projeyar_field/features/queue/domain/repositories/queue_repository.dart';
import 'package:projeyar_field/features/reports/data/repositories/reports_repository_impl.dart';
import 'package:projeyar_field/features/reports/domain/entities/report_entities.dart';

import '../../support/fakes.dart';

class _Queue extends Mock implements QueueRepository {}

class _Cipher extends Mock implements FileCipher {}

class _Processor extends Mock implements OutboxProcessor {}

void main() {
  late AppDatabase db;
  late _Queue queue;
  late _Cipher cipher;
  late ReportsRepositoryImpl repo;
  final clock = FakeClock(DateTime.utc(2026, 11, 20, 8));

  setUp(() {
    db = memoryDb();
    queue = _Queue();
    cipher = _Cipher();
    when(() => cipher.delete(any())).thenAnswer((_) async {});
    repo = ReportsRepositoryImpl(db, OutboxWriter(db), queue, cipher, clock);
  });

  tearDown(() => db.close());

  test('پیش‌نویس باز همان پروژه دوباره باز می‌شود و یک برگ یک بار در گزارش است (F08 ۴.۴)', () async {
    final a = (await repo.openDraft(projectId: 'p1', workDate: '2026-11-20')).valueOrNull!;
    final b = (await repo.openDraft(projectId: 'p1', workDate: '2026-11-20')).valueOrNull!;
    expect(b.id, a.id);
    final i1 = (await repo.ensureItem(a.id, 'a1')).valueOrNull!;
    final i2 = (await repo.ensureItem(a.id, 'a1')).valueOrNull!;
    expect(i2.id, i1.id);
  });

  test('ارسال پیش‌نویس ناقص رد می‌شود؛ کامل در صف می‌رود و صف بیدار می‌شود', () async {
    final draft = (await repo.openDraft(projectId: 'p1', workDate: '2026-11-20')).valueOrNull!;
    final item = (await repo.ensureItem(draft.id, 'a1')).valueOrNull!;
    expect((await repo.submit(draft.id, attestedAt: clock.value)).failureOrNull, isA<ValidationFailure>());
    await repo.saveItem(draft.id, DraftItem(id: item.id, activityId: 'a1', values: const ProgressValues(reportedPercent: 40)));
    expect((await repo.submit(draft.id, attestedAt: clock.value)).isOk, isTrue);
    verify(() => queue.kick()).called(1);
    expect((await repo.report(draft.id))!.state, LocalReportState.queued);
    expect(await repo.watchHasReportOn('2026-11-20').first, isTrue);
    expect(await repo.watchHasReportOn('2026-11-19').first, isFalse);
    final outbox = await db.select(db.outbox).getSingle();
    expect(outbox.kind, 'report');
  });

  test('ارسال دوباره (M11) در صف با UUID گوشی', () async {
    const item = ServerItem(id: 'i1', reportId: 'r1', projectId: 'p1', activityId: 'a1', status: ItemStatus.needsRevision);
    await repo.resubmit(const ResubmissionInput(id: 'rs1', item: item, values: ProgressValues(reportedPercent: 60), reply: 'انجام شد'));
    expect(await repo.watchQueuedResubmissions().first, {'i1'});
    final row = await db.select(db.outbox).getSingle();
    expect((row.kind, row.entityId), ('resubmit', 'rs1'));
  });

  test('حذف ردیف «پذیرفته نشد» با عکس‌هایش فقط به خواست سرپرست', () async {
    final now = clock.value;
    await db.into(db.localReports).insert(LocalReportsCompanion.insert(id: 'r1', projectId: 'p1', workDate: '2026-11-20', createdAt: now, state: const Value('rejected')));
    await db.into(db.localPhotos).insert(
      LocalPhotosCompanion.insert(id: 'ph1', ownerKind: 'report', reportId: const Value('r1'), filePath: '/x', sha256: 'a', sizeBytes: 1, takenAt: now, workDate: '2026-11-20'),
    );
    final writer = OutboxWriter(db);
    await writer.enqueue(kind: 'report', entityId: 'r1', projectId: 'p1', now: now);
    await writer.enqueue(kind: 'photo', entityId: 'ph1', projectId: 'p1', now: now, bytes: 1);
    await (db.update(db.outbox)..where((t) => t.entityId.equals('r1'))).write(const OutboxCompanion(state: Value('rejected')));

    final queueRepo = QueueRepositoryImpl(db, MetaStore(db), _Processor(), cipher);
    final summary = await queueRepo.summary();
    expect((summary.rejected, summary.photos, summary.bytes), (1, 1, 1));
    final reportRow = (await db.select(db.outbox).get()).firstWhere((r) => r.entityId == 'r1');
    await queueRepo.discardRejected(reportRow.id);
    expect(await db.select(db.outbox).get(), isEmpty);
    expect(await db.select(db.localReports).get(), isEmpty);
    verify(() => cipher.delete('/x')).called(1);
  });
}
