import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:projeyar_field/core/error/failure.dart';
import 'package:projeyar_field/core/network/network_info.dart';
import 'package:projeyar_field/features/activities/domain/entities/activity_entities.dart';
import 'package:projeyar_field/features/activities/domain/usecases/watch_today_activities.dart';
import 'package:projeyar_field/features/activities/presentation/bloc/activities_bloc.dart';
import 'package:projeyar_field/features/activities/presentation/bloc/activity_detail_bloc.dart';
import 'package:projeyar_field/features/activities/presentation/bloc/today_bloc.dart';
import 'package:projeyar_field/features/queue/domain/entities/queue_entities.dart';
import 'package:projeyar_field/features/queue/domain/usecases/run_sync_cycle.dart';
import 'package:projeyar_field/features/reports/domain/entities/report_entities.dart';
import 'package:projeyar_field/features/sync/domain/entities/sync_entities.dart';

import '../../support/fakes.dart';
import '../../support/mocks.dart';

void main() {
  late MockActivities activities;
  late MockQueue queue;
  late MockSync sync;
  late MockReports reports;
  late MockPhotos photos;
  late MockCycle cycle;
  late FakeNetwork network;
  final clock = FakeClock(DateTime.utc(2026, 11, 20, 6));

  const future = Activity(id: 'f', projectId: 'p1', code: '9.9', title: 'آینده', method: MeasureMethod.percent, approvedPercent: 0, plannedStart: '2027-01-01', plannedFinish: '2027-02-01');

  setUp(() {
    activities = MockActivities();
    queue = MockQueue();
    sync = MockSync();
    reports = MockReports();
    photos = MockPhotos();
    cycle = MockCycle();
    network = FakeNetwork(NetworkKind.none);
    when(() => activities.watchActivities()).thenAnswer((_) => Stream.value([pipeActivity, future]));
    when(() => activities.watchProjects()).thenAnswer((_) => Stream.value([pipeProject]));
    when(() => queue.watchSummary()).thenAnswer((_) => Stream.value(const QueueSummary(reports: 1, photos: 2)));
    when(() => queue.watchWifiOnly()).thenAnswer((_) => Stream.value(false));
    when(() => sync.watchInfo()).thenAnswer((_) => Stream.value(const SyncInfo()));
    when(() => reports.watchHasReportOn(any())).thenAnswer((_) => Stream.value(false));
    when(() => photos.watchQuick(any())).thenAnswer((_) => Stream.value(const []));
  });

  TodayBloc today() => TodayBloc(WatchTodayActivities(activities), activities, queue, sync, reports, photos, network, cycle, clock);

  group('TodayBloc (M03)', () {
    blocTest<TodayBloc, TodayState>(
      'بی‌شبکه از دادهٔ محلی: فعالیت‌های امروز، صف و ناظر',
      build: today,
      act: (b) => b.add(const TodayStarted()),
      wait: const Duration(milliseconds: 50),
      verify: (b) {
        final s = b.state;
        expect(s.status, TodayStatus.ready);
        expect(s.today, '2026-11-20');
        expect(s.activities.map((a) => a.id), ['a1']);
        expect(s.queue.total, 3);
        expect(s.network, NetworkKind.none);
        expect(s.approverName, 'مهندس کاظمی');
        expect(s.neverSynced, isTrue);
      },
    );

    blocTest<TodayBloc, TodayState>(
      'تازه‌سازی با شکست شبکه: Failure در حالت',
      setUp: () => when(() => cycle()).thenAnswer((_) async => const SyncCycleResult(queue: QueueRunReport(), syncFailure: NetworkFailure())),
      build: today,
      act: (b) => b.add(const TodayRefreshed()),
      expect: () => [
        isA<TodayState>().having((s) => s.refreshing, 'refreshing', true),
        isA<TodayState>().having((s) => s.failure, 'failure', isA<NetworkFailure>()),
      ],
    );

    blocTest<TodayBloc, TodayState>(
      'تازه‌سازی پشت هم فقط یک بار اجرا می‌شود (droppable)',
      setUp: () => when(() => cycle()).thenAnswer(
        (_) => Future.delayed(const Duration(milliseconds: 20), () => const SyncCycleResult(queue: QueueRunReport())),
      ),
      build: today,
      wait: const Duration(milliseconds: 50),
      act: (b) => b
        ..add(const TodayRefreshed())
        ..add(const TodayRefreshed()),
      verify: (_) => verify(() => cycle()).called(1),
    );
  });

  group('ActivitiesBloc (M04)', () {
    blocTest<ActivitiesBloc, ActivitiesState>(
      'گروه پروژه و والد، و فیلتر «امروز»',
      build: () => ActivitiesBloc(activities, clock),
      act: (b) => b
        ..add(const ActivitiesStarted())
        ..add(const ActivitiesFilterChanged(ActivityFilter.today)),
      wait: const Duration(milliseconds: 20),
      verify: (b) {
        final groups = b.state.groups;
        expect(groups.single.project.id, 'p1');
        expect(groups.single.activities.map((a) => a.id), ['a1']);
        expect(groups.single.parentCode, '1.2');
      },
    );

    blocTest<ActivitiesBloc, ActivitiesState>(
      'فیلتر «عقب از برنامه»',
      build: () => ActivitiesBloc(activities, clock),
      act: (b) => b
        ..add(const ActivitiesStarted())
        ..add(const ActivitiesFilterChanged(ActivityFilter.behind)),
      wait: const Duration(milliseconds: 20),
      verify: (b) => expect(b.state.groups.expand((g) => g.activities).map((a) => a.id), ['a1']),
    );
  });

  group('ActivityDetailBloc (M05)', () {
    blocTest<ActivityDetailBloc, ActivityDetailState>(
      'تاریخچه و درخواست اصلاح باز همین فعالیت',
      setUp: () {
        when(() => activities.activity('a1')).thenAnswer((_) async => pipeActivity);
        when(() => activities.project('p1')).thenAnswer((_) async => pipeProject);
        when(() => activities.watchActivity('a1')).thenAnswer((_) => Stream.value(pipeActivity));
        when(() => reports.watchServerItems()).thenAnswer(
          (_) => Stream.value(const [
            ServerItem(id: 'i1', reportId: 'r', projectId: 'p1', activityId: 'a1', status: ItemStatus.needsRevision),
            ServerItem(id: 'i2', reportId: 'r', projectId: 'p1', activityId: 'other', status: ItemStatus.approved),
          ]),
        );
      },
      build: () => ActivityDetailBloc(activities, reports, clock),
      act: (b) => b.add(const ActivityDetailStarted('a1')),
      wait: const Duration(milliseconds: 20),
      verify: (b) {
        expect(b.state.history.map((i) => i.id), ['i1']);
        expect(b.state.revision?.id, 'i1');
        expect(b.state.project, pipeProject);
      },
    );

    blocTest<ActivityDetailBloc, ActivityDetailState>(
      'فعالیتی که دیگر سپرده نیست',
      setUp: () {
        when(() => activities.activity('x')).thenAnswer((_) async => null);
        when(() => activities.watchActivity('x')).thenAnswer((_) => Stream.value(null));
        when(() => reports.watchServerItems()).thenAnswer((_) => Stream.value(const []));
      },
      build: () => ActivityDetailBloc(activities, reports, clock),
      act: (b) => b.add(const ActivityDetailStarted('x')),
      wait: const Duration(milliseconds: 20),
      verify: (b) => expect((b.state.loaded, b.state.activity), (true, null)),
    );
  });
}
