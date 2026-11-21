import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:projeyar_field/core/database/app_database.dart';
import 'package:projeyar_field/core/database/meta_store.dart';
import 'package:projeyar_field/core/error/exceptions.dart';
import 'package:projeyar_field/core/error/failure.dart';
import 'package:projeyar_field/core/network/api_client.dart';
import 'package:projeyar_field/core/result/result.dart';
import 'package:projeyar_field/features/activities/data/repositories/activities_repository_impl.dart';
import 'package:projeyar_field/features/activities/domain/entities/activity_entities.dart';
import 'package:projeyar_field/features/activities/presentation/bloc/today_bloc.dart';
import 'package:projeyar_field/features/notifications/data/repositories/notifications_repository_impl.dart';
import 'package:projeyar_field/features/queue/domain/entities/queue_entities.dart';
import 'package:projeyar_field/features/queue/domain/repositories/queue_repository.dart';
import 'package:projeyar_field/features/queue/domain/usecases/run_sync_cycle.dart';
import 'package:projeyar_field/features/sync/data/datasources/sync_data_sources.dart';
import 'package:projeyar_field/features/sync/data/models/sync_models.dart';
import 'package:projeyar_field/features/sync/data/repositories/sync_repository_impl.dart';
import 'package:projeyar_field/features/sync/domain/entities/sync_entities.dart';
import 'package:projeyar_field/features/sync/domain/repositories/sync_repository.dart';

import '../../support/fakes.dart';

class _Remote extends Mock implements SyncRemoteDataSource {}

class _Queue extends Mock implements QueueRepository {}

class _Sync extends Mock implements SyncRepository {}

class _Api extends Mock implements ApiClient {}

Map<String, Object?> _payload({bool withSecond = true}) => {
  'cursor': '2026-11-20T08:00:00.000Z',
  'serverTime': '2026-11-20T08:00:00.000Z',
  'today': '2026-11-20',
  'projects': [
    {
      'id': 'p1',
      'name': 'پروژهٔ نمونه',
      'site': {'lat': 35.7, 'lng': 51.4, 'radiusM': 200},
      'rules': {
        'minPhotos': 2,
        'maxJumpPct': '20.0000',
        'allowDecrease': false,
        'lateAfterHours': 72,
        'gpsMode': 'warn',
        'approvalMode': 'two_stage',
        'dailyReminder': {'enabled': true, 'time': '16:30'},
      },
      'calendar': {'weekModes': <Object?>[], 'holidays': <Object?>[]},
    },
  ],
  'activities': [
    {
      'id': 'a1',
      'projectId': 'p1',
      'parentId': 'w1',
      'code': '1.2.3',
      'title': 'لوله‌گذاری',
      'method': 'quantity',
      'unit': 'متر',
      'totalQuantity': '2400.0000',
      'steps': null,
      'plannedStart': '2026-11-01',
      'plannedFinish': '2026-12-30',
      'approvedPercent': '55.0000',
      'approvedQuantity': 1320,
      'lastPendingPercent': null,
      'plan': [
        {'date': '2026-11-20', 'plannedPercent': 60},
      ],
      'approverUserId': 'u2',
      'approverName': 'مهندس کاظمی',
    },
    if (withSecond)
      {
        'id': 'a2',
        'projectId': 'p1',
        'code': '1.2.4',
        'title': 'جوشکاری',
        'method': 'steps',
        'steps': [
          {'key': 's1', 'title': 'برش', 'weight': '1', 'approvedPercent': 100},
        ],
        'approvedPercent': 0,
        'plan': <Object?>[],
      },
  ],
  'items': [
    {
      'id': 'i1',
      'reportId': 'r1',
      'reportNo': 'FR-1405-0001',
      'projectId': 'p1',
      'wbsItemId': 'a1',
      'workDate': '2026-11-19',
      'status': 'needs_revision',
      'flags': ['late_submission'],
      'computedPercent': '58.0000',
      'revisionCount': 1,
      'revision': {
        'note': 'عکس نزدیک‌تر',
        'requiredActions': [
          {'key': 'p', 'text': 'دو عکس', 'type': 'photo', 'minPhotos': 2},
        ],
        'reviewerUserId': 'u2',
        'requestedAt': '2026-11-19T10:00:00.000Z',
      },
      'photos': [
        {'id': 'f1', 'uploadStatus': 'complete', 'markedUnsuitable': true},
      ],
    },
  ],
  'issues': <Object?>[],
  'notifications': [
    {
      'id': 'n2',
      'code': 'NT-FLD-02',
      'category': 'approvals',
      'severity': 'info',
      'title': 'اصلاح خواسته شد',
      'body': 'عکس نزدیک‌تر',
      'projectId': 'p1',
      'projectName': 'پروژهٔ نمونه',
      'link': '/approvals/revision/i1',
      'createdAt': '2026-11-20T07:00:00.000Z',
      'readAt': null,
      'mergedCount': 0,
    },
    {
      'id': 'n1',
      'code': 'NT-FLD-01',
      'title': 'تأیید شد',
      'createdAt': '2026-11-19T07:00:00.000Z',
      'readAt': '2026-11-19T08:00:00.000Z',
    },
  ],
};

void main() {
  late AppDatabase db;
  late _Remote remote;
  late SyncRepositoryImpl repository;

  setUp(() {
    db = memoryDb();
    remote = _Remote();
    final meta = MetaStore(db);
    repository = SyncRepositoryImpl(remote, SyncLocalDataSource(db, meta), meta, FakeClock(DateTime.utc(2026, 11, 20, 8)));
  });

  tearDown(() => db.close());

  test('پاسخ sync با عددهای رشته‌ای numeric در آینه جایگزین می‌شود', () async {
    when(() => remote.fetch()).thenAnswer((_) async => SyncResponseDto.fromJson(_payload()));
    final result = await repository.syncNow();
    expect(result.valueOrNull?.serverToday, '2026-11-20');
    final activities = ActivitiesRepositoryImpl(db);
    final a1 = (await activities.activity('a1'))!;
    expect(a1.totalQuantity, 2400);
    expect(a1.approvedPercent, 55);
    expect(a1.method, MeasureMethod.quantity);
    expect(a1.plan.single.plannedPercent, 60);
    final project = (await activities.project('p1'))!;
    expect(project.rules.maxJumpPct, 20);
    expect(project.rules.twoStage, isTrue);
    expect((await activities.activity('a2'))!.steps.single.weight, 1);
    expect((await repository.info()).lastSyncAt, isNotNull);
  });

  test('F08 ۵.۱ — ساعت یادآوری پروژه و اعلان‌ها در آینه؛ M12 بی‌شبکه از پایگاه دادهٔ محلی', () async {
    when(() => remote.fetch()).thenAnswer((_) async => SyncResponseDto.fromJson(_payload()));
    await repository.syncNow();
    final project = (await ActivitiesRepositoryImpl(db).project('p1'))!;
    expect(project.reminder, const DailyReminder(time: '16:30'));
    final notifications = NotificationsRepositoryImpl(_Api(), db);
    final page = await notifications.local();
    expect(page.items.map((n) => n.id), ['n2', 'n1']);
    expect(page.unreadCount, 1);
    expect(page.items.first.projectName, 'پروژهٔ نمونه');
    expect((await notifications.local(unreadOnly: true)).items.map((n) => n.id), ['n2']);
    // همگام‌سازی بعدی جایگزین می‌کند
    when(() => remote.fetch()).thenAnswer((_) async => SyncResponseDto.fromJson({..._payload(), 'notifications': <Object?>[]}));
    await repository.syncNow();
    expect((await notifications.local()).items, isEmpty);
  });

  test('DailyReminder.earliest — زودترین ساعت فعال؛ هیچ پروژهٔ فعال ← null', () {
    Project p(String id, DailyReminder r) => Project(id: id, name: id, rules: const ReportRules(), reminder: r);
    expect(DailyReminder.earliest([p('a', const DailyReminder(time: '18:00')), p('b', const DailyReminder(time: '09:30'))]), '09:30');
    expect(DailyReminder.earliest([p('a', const DailyReminder(enabled: false, time: '08:00')), p('b', const DailyReminder())]), '17:00');
    expect(DailyReminder.earliest([p('a', const DailyReminder(enabled: false))]), isNull);
    expect(DailyReminder.earliest(const []), isNull);
    // M03: «مهلت تا …» از همان ساعت
    expect(TodayState(today: '2026-11-20', projects: [p('a', const DailyReminder(time: '16:30'))]).deadline, '16:30');
  });

  test('AC-FA-10 برگی که در پاسخ تازه نیست (زمانی یا پروژهٔ متوقف) از گوشی هم حذف می‌شود', () async {
    when(() => remote.fetch()).thenAnswer((_) async => SyncResponseDto.fromJson(_payload()));
    await repository.syncNow();
    when(() => remote.fetch()).thenAnswer((_) async => SyncResponseDto.fromJson(_payload(withSecond: false)));
    await repository.syncNow();
    final all = await ActivitiesRepositoryImpl(db).watchActivities().first;
    expect(all.map((a) => a.id), ['a1']);
  });

  test('شکست شبکه: آینهٔ قبلی دست‌نخورده و Failure', () async {
    when(() => remote.fetch()).thenAnswer((_) async => SyncResponseDto.fromJson(_payload()));
    await repository.syncNow();
    when(() => remote.fetch()).thenThrow(const ApiException(transport: TransportError.noConnection));
    final result = await repository.syncNow();
    expect(result.failureOrNull, isA<NetworkFailure>());
    expect(await ActivitiesRepositoryImpl(db).watchActivities().first, hasLength(2));
  });

  group('RunSyncCycle', () {
    late _Queue queue;
    late _Sync sync;

    setUpAll(() => registerFallbackValue(const HeartbeatData(queuedReports: 0, queuedPhotos: 0, queuedBytes: 0, wifiOnly: false)));

    setUp(() {
      queue = _Queue();
      sync = _Sync();
      when(() => queue.summary()).thenAnswer(
        (_) async => QueueSummary(reports: 2, photos: 3, bytes: 900, oldestQueuedAt: DateTime.utc(2026, 11, 17)),
      );
      when(() => queue.wifiOnly()).thenAnswer((_) async => true);
      when(() => sync.info()).thenAnswer((_) async => SyncInfo(lastSyncAt: DateTime.utc(2026, 11, 19)));
      when(() => sync.sendHeartbeat(any())).thenAnswer((_) async => const Ok(unit));
    });

    test('AC-FA-08 ضربان پس از تلاش ناموفق هم با تعداد صف و قدیمی‌ترین مورد فرستاده می‌شود', () async {
      when(() => queue.process()).thenAnswer((_) async => const Err(NetworkFailure()));
      when(() => sync.syncNow()).thenAnswer((_) async => const Err(NetworkFailure()));
      final result = await RunSyncCycle(queue, sync, FakeAppInfo())();
      expect(result.failure, isA<NetworkFailure>());
      final hb = verify(() => sync.sendHeartbeat(captureAny())).captured.single as HeartbeatData;
      expect(hb.queuedReports, 2);
      expect(hb.queuedPhotos, 3);
      expect(hb.queuedBytes, 900);
      expect(hb.oldestQueuedAt, DateTime.utc(2026, 11, 17));
      expect(hb.wifiOnly, isTrue);
      expect(hb.appVersion, '0.1.0+1');
    });

    test('AC-FA-08 تلاش موفق: صف پیش از دریافت، سپس ضربان؛ اجراهای هم‌زمان یکی می‌شوند', () async {
      final order = <String>[];
      when(() => queue.process()).thenAnswer((_) async {
        order.add('queue');
        return const Ok(QueueRunReport(sent: 1));
      });
      when(() => sync.syncNow()).thenAnswer((_) async {
        order.add('sync');
        return const Ok(SyncInfo());
      });
      final cycle = RunSyncCycle(queue, sync, FakeAppInfo());
      final results = await Future.wait([cycle(), cycle()]);
      expect(results.first.queue.sent, 1);
      expect(order, ['queue', 'sync']);
      verify(() => sync.sendHeartbeat(any())).called(1);
    });
  });
}
