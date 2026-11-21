
import 'package:drift/drift.dart' hide isNotNull, isNull;
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:projeyar_field/core/database/app_database.dart';
import 'package:projeyar_field/core/database/meta_store.dart';
import 'package:projeyar_field/core/error/exceptions.dart';
import 'package:projeyar_field/core/network/network_info.dart';
import 'package:projeyar_field/core/security/file_cipher.dart';
import 'package:projeyar_field/features/queue/data/datasources/outbox_remote_data_source.dart';
import 'package:projeyar_field/features/queue/data/outbox_processor.dart';
import 'package:projeyar_field/features/queue/domain/repositories/queue_repository.dart';
import 'package:projeyar_field/features/reports/data/repositories/reports_repository_impl.dart';
import 'package:projeyar_field/features/reports/domain/entities/report_entities.dart';

import '../../support/fakes.dart';

class _Remote extends Mock implements OutboxRemoteDataSource {}

class _Cipher extends Mock implements FileCipher {}

class _Queue extends Mock implements QueueRepository {}

const _noConnection = ApiException(transport: TransportError.noConnection);

void main() {
  late AppDatabase db;
  late _Remote remote;
  late _Cipher cipher;
  late FakeClock clock;
  late FakeNetwork network;
  late OutboxProcessor processor;
  late ReportsRepositoryImpl reports;

  setUpAll(() => registerFallbackValue(Uint8List(0)));

  setUp(() {
    db = memoryDb();
    remote = _Remote();
    cipher = _Cipher();
    clock = FakeClock(DateTime.utc(2026, 11, 20, 8));
    network = FakeNetwork();
    final meta = MetaStore(db);
    processor = OutboxProcessor(db, remote, cipher, meta, network, clock, FakeAppInfo());
    reports = ReportsRepositoryImpl(db, OutboxWriter(db), _Queue(), cipher, clock);
    when(() => cipher.delete(any())).thenAnswer((_) async {});
    when(() => cipher.readDecrypted(any())).thenAnswer((_) async => Uint8List.fromList(List.generate(10, (i) => i)));
  });

  tearDown(() => db.close());

  /// گزارش در صف با یک آیتم و یک عکس، مثل خروجی M08.
  Future<String> queueReport({bool mocked = false}) async {
    final draft = (await reports.openDraft(projectId: 'p1', workDate: '2026-11-20')).valueOrNull!;
    final item = (await reports.ensureItem(draft.id, 'a1')).valueOrNull!;
    await reports.saveItem(draft.id, DraftItem(id: item.id, activityId: 'a1', values: const ProgressValues(quantityToday: 72), crewCount: 6));
    await db
        .into(db.localPhotos)
        .insert(
          LocalPhotosCompanion.insert(
            id: 'ph1',
            projectId: const Value('p1'),
            ownerKind: 'report',
            reportId: Value(draft.id),
            itemId: Value(item.id),
            filePath: '/x/ph1.enc',
            sha256: 'a' * 64,
            sizeBytes: 10,
            takenAt: clock.value,
            workDate: '2026-11-20',
            mocked: Value(mocked),
          ),
        );
    await reports.submit(draft.id, attestedAt: clock.value);
    return draft.id;
  }

  Future<Map<String, Object?>> reportResponse(String id, {List<String> flags = const []}) async => {
    'reportId': id,
    'reportNo': 'FR-1405-0001',
    'duplicate': false,
    'items': [
      {'id': (await db.select(db.localReportItems).getSingle()).id, 'status': 'stage1', 'flags': flags, 'computedPercent': '58.0000'},
    ],
    'photos': <Object?>[],
  };

  Future<String> outboxState(String entityId) async =>
      (await (db.select(db.outbox)..where((t) => t.entityId.equals(entityId))).getSingle()).state;

  group('AC-FA-01', () {
    test('AC-FA-01 در حالت پرواز در صف می‌ماند و با وصل شدن بی‌دخالت کاربر ارسال می‌شود', () async {
      final id = await queueReport();
      network.kind = NetworkKind.none;
      await processor.run();
      verifyNever(() => remote.postReport(any()));
      expect(await outboxState(id), 'pending');

      network.kind = NetworkKind.wifi;
      when(() => remote.postReport(any())).thenAnswer((i) async => reportResponse(id));
      when(() => remote.createUpload(any())).thenAnswer(
        (_) async => const UploadSessionView(uploadId: 'u1', complete: false, partSize: 10, partCount: 1, missingParts: [1]),
      );
      when(() => remote.putPart(any(), any(), any())).thenAnswer((_) async {});
      when(() => remote.complete(any(), any())).thenAnswer(
        (_) async => const UploadSessionView(uploadId: 'u1', complete: true, partSize: 10, partCount: 1, missingParts: []),
      );
      final run = await processor.run();
      expect(run.sent, 2, reason: 'گزارش و سپس عکسش');
      expect(await outboxState(id), 'sent');
      final local = await (db.select(db.localReports)..where((t) => t.id.equals(id))).getSingle();
      expect(local.state, 'sent');
      expect(local.reportNo, 'FR-1405-0001');
    });

    test('AC-FA-01 قطع وسط ارسال: تکرار با همان UUID گزارش و بدون ردیف تکراری', () async {
      final id = await queueReport();
      when(() => remote.postReport(any())).thenThrow(_noConnection);
      await processor.run();
      expect(await outboxState(id), 'retry');
      verifyNever(() => remote.createUpload(any()));

      clock.value = clock.value.add(const Duration(minutes: 6));
      when(() => remote.postReport(any())).thenAnswer((_) async => reportResponse(id));
      when(() => remote.createUpload(any())).thenThrow(_noConnection);
      await processor.run();

      final bodies = verify(() => remote.postReport(captureAny())).captured.cast<Map<String, Object?>>();
      expect(bodies.map((b) => b['id']).toSet(), {id});
      expect(await db.select(db.localReports).get(), hasLength(1));
      expect((await db.select(db.outbox).get()).where((r) => r.kind == 'report'), hasLength(1));
    });
  });

  test('AC-FA-02 گزارش ۷۳ ساعته ارسال می‌شود، پرچم late_submission می‌گیرد و حذف نمی‌شود', () async {
    final id = await queueReport();
    final recorded = clock.value;
    clock.value = clock.value.add(const Duration(hours: 73));
    when(() => remote.postReport(any())).thenAnswer((_) async => reportResponse(id, flags: ['late_submission']));
    when(() => remote.createUpload(any())).thenThrow(_noConnection);
    await processor.run();
    final body = verify(() => remote.postReport(captureAny())).captured.single as Map<String, Object?>;
    expect(body['deviceRecordedAt'], recorded.toIso8601String(), reason: 'زمان دستگاه خام، تا سرور دیرکرد را بسنجد');
    final local = await (db.select(db.localReports)..where((t) => t.id.equals(id))).getSingle();
    expect(local.state, 'sent');
    final item = await db.select(db.localReportItems).getSingle();
    expect(item.serverFlagsJson, contains('late_submission'));
    expect(item.serverPercent, 58);
  });

  test('AC-FA-05 عکس با موقعیت جعلی ← mockLocation در بدنهٔ گزارش', () async {
    final id = await queueReport(mocked: true);
    when(() => remote.postReport(any())).thenAnswer((_) async => reportResponse(id));
    when(() => remote.createUpload(any())).thenThrow(_noConnection);
    await processor.run();
    final body = verify(() => remote.postReport(captureAny())).captured.single as Map<String, Object?>;
    expect(body['mockLocation'], isTrue);
    expect(body['attested'], isTrue);
    expect((body['items']! as List).single, containsPair('values', {'quantityToday': 72.0}));
  });

  test('AC-FA-03 قطع وسط بارگذاری از همان پارچه ادامه می‌یابد و هش نادرست دوباره ارسال می‌شود', () async {
    final id = await queueReport();
    when(() => remote.postReport(any())).thenAnswer((_) async => reportResponse(id));
    when(() => remote.createUpload(any())).thenAnswer(
      (_) async => const UploadSessionView(uploadId: 'u1', complete: false, partSize: 4, partCount: 3, missingParts: [1, 2, 3]),
    );
    when(() => remote.putPart('u1', 1, any())).thenAnswer((_) async {});
    when(() => remote.putPart('u1', 2, any())).thenThrow(_noConnection);
    await processor.run();
    expect(await outboxState('ph1'), 'retry');
    expect((await (db.select(db.localPhotos)..where((t) => t.id.equals('ph1'))).getSingle()).uploadId, 'u1');

    // ادامه: سرور پارچهٔ ۱ را دارد
    clock.value = clock.value.add(const Duration(minutes: 6));
    when(() => remote.uploadStatus('u1')).thenAnswer(
      (_) async => const UploadSessionView(uploadId: 'u1', complete: false, partSize: 4, partCount: 3, missingParts: [2, 3]),
    );
    when(() => remote.putPart('u1', any(), any())).thenAnswer((_) async {});
    when(() => remote.complete('u1', any())).thenThrow(
      const ApiException(
        statusCode: 422,
        body: ApiErrorBody(code: 'UPLOAD_HASH_MISMATCH', message: 'هش نمی‌خواند.', retryable: true),
      ),
    );
    await processor.run();
    verify(() => remote.createUpload(any())).called(1); // ادامه، نه جلسهٔ تازه
    final calls = verify(() => remote.putPart(captureAny(), captureAny(), captureAny())).captured;
    final parts = [for (var i = 1; i < calls.length; i += 3) calls[i]];
    expect(parts, [1, 2, 2, 3], reason: 'اجرای اول ۱ و ۲ (قطع)، اجرای دوم فقط ۲ و ۳');
    expect((calls.last as Uint8List).length, 2, reason: 'پارچهٔ آخر کوتاه‌تر');
    expect(await outboxState('ph1'), 'retry');

    // سرور پارچه‌ها را پس از ناهمخوانی پاک کرد؛ همه دوباره و تکمیل
    clock.value = clock.value.add(const Duration(minutes: 6));
    when(() => remote.uploadStatus('u1')).thenAnswer(
      (_) async => const UploadSessionView(uploadId: 'u1', complete: false, partSize: 4, partCount: 3, missingParts: [1, 2, 3]),
    );
    when(() => remote.complete('u1', any())).thenAnswer(
      (_) async => const UploadSessionView(uploadId: 'u1', complete: true, partSize: 4, partCount: 3, missingParts: []),
    );
    await processor.run();
    expect(await outboxState('ph1'), 'sent');
    final photo = await (db.select(db.localPhotos)..where((t) => t.id.equals('ph1'))).getSingle();
    expect(photo.uploadState, 'uploaded');
    verify(() => cipher.delete('/x/ph1.enc')).called(1);
  });

  test('AC-FA-09 ارسال دوباره عکس‌های تازهٔ اصلاح را در همان PUT ثبت و پس از آن بارگذاری می‌کند', () async {
    const item = ServerItem(id: 'srv1', reportId: 'r0', projectId: 'p1', activityId: 'a1', status: ItemStatus.needsRevision);
    for (final id in ['rv1', 'rv2']) {
      await db.into(db.localPhotos).insert(
        LocalPhotosCompanion.insert(
          id: id,
          projectId: const Value('p1'),
          ownerKind: 'revision',
          reportId: const Value('rs1'),
          itemId: const Value('srv1'),
          filePath: '/x/$id.enc',
          sha256: 'b' * 64,
          sizeBytes: 10,
          takenAt: clock.value,
          workDate: '2026-11-20',
        ),
      );
    }
    await reports.resubmit(const ResubmissionInput(id: 'rs1', item: item, values: ProgressValues(reportedPercent: 60), reply: 'انجام شد'));
    when(() => remote.putItem(any(), any(), idempotencyKey: any(named: 'idempotencyKey'))).thenAnswer((_) async => null);
    when(() => remote.createUpload(any())).thenAnswer(
      (_) async => const UploadSessionView(uploadId: 'u', complete: false, partSize: 10, partCount: 1, missingParts: [1]),
    );
    when(() => remote.putPart(any(), any(), any())).thenAnswer((_) async {});
    when(() => remote.complete(any(), any())).thenAnswer(
      (_) async => const UploadSessionView(uploadId: 'u', complete: true, partSize: 10, partCount: 1, missingParts: []),
    );
    final run = await processor.run();
    expect(run.sent, 3);
    final captured = verify(() => remote.putItem('srv1', captureAny(), idempotencyKey: 'rs1')).captured.single as Map<String, Object?>;
    expect((captured['photos']! as List).map((p) => (p as Map)['id']), ['rv1', 'rv2']);
    final uploads = verify(() => remote.createUpload(captureAny())).captured.cast<Map<String, Object?>>();
    expect(uploads.map((u) => (u['kind'], u['subjectId'])), [('photo', 'rv1'), ('photo', 'rv2')]);
    expect((await db.select(db.localPhotos).get()).every((p) => p.uploadState == 'uploaded'), isTrue);
  });

  test('خطای غیرقابل تکرار ← «پذیرفته نشد» و حذف نمی‌شود (F08 ۵.۳)', () async {
    final id = await queueReport();
    when(() => remote.postReport(any())).thenThrow(
      const ApiException(statusCode: 404, body: ApiErrorBody(code: 'NOT_FOUND', message: 'پروژه متوقف است.', retryable: false)),
    );
    final run = await processor.run();
    expect(run.rejected, 1);
    expect(await outboxState(id), 'rejected');
    final local = await (db.select(db.localReports)..where((t) => t.id.equals(id))).getSingle();
    expect(local.state, 'rejected');
    expect(local.rejectMessage, 'پروژه متوقف است.');
    verifyNever(() => remote.createUpload(any()));
  });

  test('F08 ۵.۳ — نسخهٔ کهنه (۴۲۶): اجرا متوقف و صف دست‌نخورده در انتظار می‌ماند', () async {
    final id = await queueReport();
    when(() => remote.postReport(any())).thenThrow(
      const ApiException(
        statusCode: 426,
        body: ApiErrorBody(code: 'APP_VERSION_UNSUPPORTED', message: 'اپ را به‌روز کنید.', retryable: false, details: {'minVersion': '1.2.0'}),
      ),
    );
    final run = await processor.run();
    expect((run.sent, run.rejected), (0, 0));
    expect(await outboxState(id), 'pending');
    final local = await (db.select(db.localReports)..where((t) => t.id.equals(id))).getSingle();
    expect(local.state, isNot('rejected'));
  });

  test('قفل یک‌اجرایی: اجرای هم‌زمان کنار گذاشته می‌شود', () async {
    final meta = MetaStore(db);
    await meta.tryLock(MetaKeys.outboxLock, clock.value);
    expect((await processor.run()).skipped, isTrue);
  });
}
