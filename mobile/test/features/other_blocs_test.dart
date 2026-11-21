import 'dart:typed_data';

import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:projeyar_field/core/device/location.dart';
import 'package:projeyar_field/core/error/failure.dart';
import 'package:projeyar_field/core/network/network_info.dart';
import 'package:projeyar_field/core/result/result.dart';
import 'package:projeyar_field/features/camera/domain/entities/photo_entities.dart';
import 'package:projeyar_field/features/camera/presentation/bloc/camera_bloc.dart';
import 'package:projeyar_field/features/issues/domain/entities/issue_entities.dart';
import 'package:projeyar_field/features/issues/presentation/bloc/issue_form_bloc.dart';
import 'package:projeyar_field/features/notifications/domain/entities/notification_entities.dart';
import 'package:projeyar_field/features/notifications/presentation/bloc/notifications_bloc.dart';
import 'package:projeyar_field/features/notifications/presentation/notification_links.dart';
import 'package:projeyar_field/features/profile/presentation/bloc/profile_bloc.dart';
import 'package:projeyar_field/features/queue/domain/entities/queue_entities.dart';
import 'package:projeyar_field/features/queue/domain/usecases/run_sync_cycle.dart';
import 'package:projeyar_field/features/queue/presentation/bloc/queue_bloc.dart';
import 'package:projeyar_field/features/queue/presentation/cubit/queue_status_cubit.dart';
import 'package:projeyar_field/features/sync/domain/entities/sync_entities.dart';

import '../support/fakes.dart';
import '../support/mocks.dart';

StoredPhoto _photo(String id) => StoredPhoto(id: id, sha256: 'a', sizeBytes: 1, takenAt: DateTime.utc(2026), workDate: '2026-11-20');

void main() {
  final clock = FakeClock(DateTime.utc(2026, 11, 20, 6));

  setUpAll(() {
    registerFallbackValue(Uint8List(0));
    registerFallbackValue(const QuickTarget());
    registerFallbackValue(StampInfo(takenAt: DateTime.utc(2026), supervisorName: ''));
    registerFallbackValue(const IssueDraft(id: '', projectId: '', type: IssueType.other, title: '', effect: IssueEffect.none));
  });

  group('CameraBloc (M07)', () {
    late MockPhotos photos;
    late MockLocation location;
    const request = CaptureRequest(
      target: ReportItemTarget(projectId: 'p1', reportId: 'r1', itemId: 'i1'),
      workDate: '2026-11-20',
      supervisorName: 'رضا کریمی',
      siteName: 'کارگاه',
      activityCode: '1.2.3',
      siteLat: 35.7,
      siteLng: 51.4,
      siteRadiusM: 200,
    );

    setUp(() {
      photos = MockPhotos();
      location = MockLocation();
      when(
        () => photos.save(
          rawJpeg: any(named: 'rawJpeg'),
          target: any(named: 'target'),
          stamp: any(named: 'stamp'),
          workDate: any(named: 'workDate'),
          fix: any(named: 'fix'),
        ),
      ).thenAnswer((_) async => Ok(_photo('n')));
    });

    blocTest<CameraBloc, CameraState>(
      'AC-FA-05 موقعیت جعلی گوشی همراه عکس ذخیره می‌شود و مهر «داخل کارگاه» می‌گیرد',
      setUp: () => when(() => location.current()).thenAnswer((_) async => const Ok(GeoFix(lat: 35.7, lng: 51.4, accuracyM: 5, mocked: true))),
      build: () => CameraBloc(photos, location, clock, request),
      act: (b) => b.add(CameraShotTaken(Uint8List.fromList([1, 2]))),
      verify: (b) {
        expect(b.state.taken, hasLength(1));
        final captured = verify(
          () => photos.save(
            rawJpeg: any(named: 'rawJpeg'),
            target: request.target,
            stamp: captureAny(named: 'stamp'),
            workDate: '2026-11-20',
            fix: captureAny(named: 'fix'),
          ),
        ).captured;
        final stamp = captured[0] as StampInfo;
        expect(stamp.insideSite, isTrue);
        expect(stamp.activityCode, '1.2.3');
        expect((captured[1] as GeoFix).mocked, isTrue);
      },
    );

    blocTest<CameraBloc, CameraState>(
      'بی GPS عکس بی مختصات ذخیره و هشدار داده می‌شود',
      setUp: () => when(() => location.current()).thenAnswer((_) async => const Err(PermissionFailure(message: 'مکان‌یاب خاموش است.'))),
      build: () => CameraBloc(photos, location, clock, request),
      act: (b) => b.add(CameraShotTaken(Uint8List.fromList([1]))),
      verify: (b) {
        expect(b.state.taken, hasLength(1));
        expect(b.state.locationWarning, isA<PermissionFailure>());
      },
    );

    blocTest<CameraBloc, CameraState>(
      'خطای ذخیره در حالت',
      setUp: () {
        when(() => location.current()).thenAnswer((_) async => const Ok(GeoFix(lat: 0, lng: 0, accuracyM: 1, mocked: false)));
        when(
          () => photos.save(
            rawJpeg: any(named: 'rawJpeg'),
            target: any(named: 'target'),
            stamp: any(named: 'stamp'),
            workDate: any(named: 'workDate'),
            fix: any(named: 'fix'),
          ),
        ).thenAnswer((_) async => const Err(StorageFailure()));
      },
      build: () => CameraBloc(photos, location, clock, request),
      act: (b) => b.add(CameraShotTaken(Uint8List(1))),
      verify: (b) => expect((b.state.taken.length, b.state.failure), (0, const StorageFailure())),
    );
  });

  group('QueueBloc و QueueStatusCubit (M09)', () {
    late MockQueue queue;
    late MockCycle cycle;
    late FakeNetwork network;

    setUp(() {
      queue = MockQueue();
      cycle = MockCycle();
      network = FakeNetwork(NetworkKind.mobile);
      when(() => queue.watchEntries()).thenAnswer(
        (_) => Stream.value([
          QueueEntry(id: 1, kind: OutboxKind.report, entityId: 'r', projectId: 'p1', state: OutboxState.pending, attempts: 0, createdAt: DateTime.utc(2026, 11, 17)),
          QueueEntry(id: 2, kind: OutboxKind.photo, entityId: 'ph', projectId: 'p1', state: OutboxState.pending, attempts: 0, createdAt: DateTime.utc(2026, 11, 18), bytes: 700),
        ]),
      );
      when(() => queue.watchWifiOnly()).thenAnswer((_) => Stream.value(true));
      when(() => queue.setWifiOnly(value: any(named: 'value'))).thenAnswer((_) async => const Ok(unit));
      when(() => queue.retryNow()).thenAnswer((_) async => const Ok(unit));
      when(() => cycle()).thenAnswer((_) async => const SyncCycleResult(queue: QueueRunReport(sent: 2)));
    });

    blocTest<QueueBloc, QueueState>(
      'تعداد، حجم و قدیمی‌ترین؛ «فقط Wi‑Fi» و «ارسال الان»',
      build: () => QueueBloc(queue, cycle, network),
      act: (b) async {
        b.add(const QueueStarted());
        await Future<void>.delayed(const Duration(milliseconds: 20));
        b
          ..add(const QueueWifiOnlyToggled(value: false))
          ..add(const QueueSendNow());
      },
      wait: const Duration(milliseconds: 20),
      verify: (b) {
        expect(b.state.summary.reports, 1);
        expect(b.state.summary.bytes, 700);
        expect(b.state.summary.oldestQueuedAt, DateTime.utc(2026, 11, 17));
        expect(b.state.network, NetworkKind.mobile);
        expect(b.state.lastSent, 2);
        verify(() => queue.setWifiOnly(value: false)).called(1);
        verify(() => queue.retryNow()).called(1);
      },
    );

    blocTest<QueueStatusCubit, QueueStatus>(
      'AC-FA-01 برگشت اتصال صف را بی‌دخالت کاربر راه می‌اندازد',
      setUp: () {
        when(() => queue.watchSummary()).thenAnswer((_) => Stream.value(const QueueSummary(reports: 1)));
        when(() => queue.kicks).thenAnswer((_) => const Stream.empty());
      },
      build: () => QueueStatusCubit(queue, cycle, network),
      act: (c) async {
        c.start();
        await Future<void>.delayed(const Duration(milliseconds: 10));
        network
          ..set(NetworkKind.none)
          ..set(NetworkKind.wifi);
        await Future<void>.delayed(const Duration(milliseconds: 2200));
      },
      wait: const Duration(milliseconds: 50),
      verify: (c) {
        // یک بار با شروع و یک بار با برگشت اتصال
        verify(() => cycle()).called(2);
        expect(c.state.summary.reports, 1);
      },
    );
  });

  group('IssueFormBloc (M13)', () {
    late MockIssues issues;
    late MockActivities activities;
    late MockPhotos photos;

    setUp(() {
      issues = MockIssues();
      activities = MockActivities();
      photos = MockPhotos();
      when(() => issues.newIssueId()).thenReturn('iss1');
      when(() => issues.discard(any())).thenAnswer((_) async {});
      when(() => issues.submit(any())).thenAnswer((_) async => const Ok(unit));
      when(() => activities.watchProjects()).thenAnswer((_) => Stream.value([pipeProject]));
      when(() => activities.watchActivities()).thenAnswer((_) => Stream.value([pipeActivity]));
      when(() => photos.watchFor(any())).thenAnswer((_) => Stream.value([_photo('1')]));
    });

    blocTest<IssueFormBloc, IssueFormState>(
      'فیلدهای لازم: بی نوع، عنوان و اثر ذخیره نمی‌شود',
      build: () => IssueFormBloc(issues, activities, photos, clock),
      act: (b) async {
        b.add(const IssueFormStarted());
        await Future<void>.delayed(const Duration(milliseconds: 20));
        b.add(const IssueSubmitted());
      },
      wait: const Duration(milliseconds: 20),
      verify: (b) {
        expect(b.state.typeError, isNotNull);
        expect(b.state.titleError, isNotNull);
        expect(b.state.effectError, isNotNull);
        verifyNever(() => issues.submit(any()));
      },
    );

    blocTest<IssueFormBloc, IssueFormState>(
      'ذخیره با UUID گوشی، فعالیت مرتبط و عکس',
      build: () => IssueFormBloc(issues, activities, photos, clock),
      act: (b) async {
        b.add(const IssueFormStarted(activityId: 'a1'));
        await Future<void>.delayed(const Duration(milliseconds: 20));
        b
          ..add(const IssueTypeChanged(IssueType.material))
          ..add(const IssueTitleChanged('  کمبود سیمان '))
          ..add(const IssueEffectChanged(IssueEffect.slow))
          ..add(const IssueSubmitted());
      },
      wait: const Duration(milliseconds: 20),
      verify: (b) {
        expect(b.state.status, IssueFormStatus.saved);
        expect(b.state.photos, hasLength(1));
        final draft = verify(() => issues.submit(captureAny())).captured.single as IssueDraft;
        expect((draft.id, draft.projectId, draft.title, draft.activityId), ('iss1', 'p1', 'کمبود سیمان', 'a1'));
      },
    );

    test('بسته شدن بی ذخیره عکس‌های مشکل را پاک می‌کند', () async {
      final bloc = IssueFormBloc(issues, activities, photos, clock)..add(const IssueFormStarted());
      await Future<void>.delayed(const Duration(milliseconds: 20));
      await bloc.close();
      verify(() => issues.discard('iss1')).called(1);
    });
  });

  group('NotificationsBloc (M12)', () {
    late MockNotifications repo;
    final n1 = AppNotification(id: 'n1', code: 'NT-FLD-02', title: 'اصلاح لازم است', createdAt: DateTime.utc(2026, 11, 20));

    setUp(() {
      repo = MockNotifications();
      when(() => repo.markRead(any())).thenAnswer((_) async => const Ok(unit));
    });

    blocTest<NotificationsBloc, NotificationsState>(
      'صفحه‌بندی cursor و خواندن',
      setUp: () {
        when(() => repo.fetch()).thenAnswer((_) async => Ok(NotificationPage(items: [n1], nextCursor: 'c2', unreadCount: 2)));
        when(() => repo.fetch(cursor: 'c2')).thenAnswer(
          (_) async => Ok(NotificationPage(items: [AppNotification(id: 'n2', code: 'x', title: 'دوم', createdAt: DateTime.utc(2026))], unreadCount: 2)),
        );
      },
      build: () => NotificationsBloc(repo, clock),
      act: (b) async {
        b.add(const NotificationsStarted());
        await Future<void>.delayed(const Duration(milliseconds: 10));
        b
          ..add(const NotificationsMoreRequested())
          ..add(const NotificationOpened('n1'));
      },
      wait: const Duration(milliseconds: 20),
      verify: (b) {
        expect(b.state.items.map((n) => n.id), ['n1', 'n2']);
        expect(b.state.nextCursor, isNull);
        expect(b.state.items.first.isRead, isTrue);
        expect(b.state.unreadCount, 1);
      },
    );

    blocTest<NotificationsBloc, NotificationsState>(
      'F08 ۵.۱ — بی‌شبکه: اعلان‌های همگام‌شده از پایگاه دادهٔ محلی با برچسب کهنه',
      setUp: () {
        when(() => repo.fetch()).thenAnswer((_) async => const Err(NetworkFailure()));
        when(() => repo.local()).thenAnswer((_) async => NotificationPage(items: [n1], unreadCount: 1));
      },
      build: () => NotificationsBloc(repo, clock),
      act: (b) => b.add(const NotificationsStarted()),
      verify: (b) => expect((b.state.stale, b.state.items.length, b.state.failure), (true, 1, const NetworkFailure())),
    );

    test('پیوند اعلان فقط به مسیرهای داخلی', () {
      String rev(String id) => '/revision/$id';
      expect(NotificationLinks.route('https://evil.example/x', revision: rev, reports: '/reports'), isNull);
      expect(
        NotificationLinks.route('/approvals/revision/0b0e6c2a-2a7c-4c39-9d0b-6f1a1a1a1a1a', revision: rev, reports: '/reports'),
        '/revision/0b0e6c2a-2a7c-4c39-9d0b-6f1a1a1a1a1a',
      );
      expect(NotificationLinks.route('/projects/p1/settings', revision: rev, reports: '/reports'), isNull);
    });
  });

  group('ProfileBloc (M14)', () {
    late MockProfile profile;
    late MockQueue queue;
    late MockActivities activities;
    late MockSync sync;
    late MockSignOut signOut;

    setUp(() {
      profile = MockProfile();
      queue = MockQueue();
      activities = MockActivities();
      sync = MockSync();
      signOut = MockSignOut();
      when(() => profile.appVersion()).thenAnswer((_) async => '0.1.0+1');
      when(() => profile.watchReminderEnabled()).thenAnswer((_) => Stream.value(true));
      when(() => profile.setReminderEnabled(enabled: any(named: 'enabled'))).thenAnswer((_) async => const Ok(unit));
      when(() => queue.watchWifiOnly()).thenAnswer((_) => Stream.value(false));
      when(() => queue.watchSummary()).thenAnswer((_) => Stream.value(const QueueSummary(reports: 2, photos: 3, rejected: 1)));
      when(() => queue.setWifiOnly(value: any(named: 'value'))).thenAnswer((_) async => const Ok(unit));
      when(() => activities.watchProjects()).thenAnswer((_) => Stream.value([pipeProject]));
      when(() => sync.watchInfo()).thenAnswer((_) => Stream.value(const SyncInfo()));
    });

    ProfileBloc build() => ProfileBloc(profile, queue, activities, sync, signOut);

    blocTest<ProfileBloc, ProfileState>(
      'تعداد ارسال‌نشده برای هشدار خروج، و تنظیم «فقط Wi‑Fi» و یادآوری',
      build: build,
      act: (b) async {
        b.add(const ProfileStarted());
        await Future<void>.delayed(const Duration(milliseconds: 10));
        b
          ..add(const ProfileWifiOnlyToggled(value: true))
          ..add(const ProfileReminderToggled(value: false));
      },
      wait: const Duration(milliseconds: 20),
      verify: (b) {
        expect(b.state.unsent, 6);
        expect(b.state.version, '0.1.0+1');
        verify(() => queue.setWifiOnly(value: true)).called(1);
        verify(() => profile.setReminderEnabled(enabled: false)).called(1);
      },
    );

    blocTest<ProfileBloc, ProfileState>(
      'خروج کامل پس از تأیید',
      setUp: () => when(() => signOut()).thenAnswer((_) async => const Ok(unit)),
      build: build,
      act: (b) => b.add(const ProfileSignOutConfirmed()),
      expect: () => [
        isA<ProfileState>().having((s) => s.status, 'status', ProfileStatus.signingOut),
        isA<ProfileState>().having((s) => s.status, 'status', ProfileStatus.signedOut),
      ],
    );

    blocTest<ProfileBloc, ProfileState>(
      'پاک کردن ناموفق: خطا و ماندن در صفحه',
      setUp: () => when(() => signOut()).thenAnswer((_) async => const Err(StorageFailure())),
      build: build,
      act: (b) => b.add(const ProfileSignOutConfirmed()),
      verify: (b) => expect((b.state.status, b.state.failure), (ProfileStatus.ready, const StorageFailure())),
    );
  });
}
