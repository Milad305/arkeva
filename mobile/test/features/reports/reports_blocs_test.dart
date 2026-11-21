import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:projeyar_field/core/device/location.dart';
import 'package:projeyar_field/core/error/failure.dart';
import 'package:projeyar_field/core/network/network_info.dart';
import 'package:projeyar_field/core/result/result.dart';
import 'package:projeyar_field/features/camera/domain/entities/photo_entities.dart';
import 'package:projeyar_field/features/reports/domain/entities/report_entities.dart';
import 'package:projeyar_field/features/reports/domain/services/progress_preview.dart';
import 'package:projeyar_field/features/reports/presentation/bloc/report_form_bloc.dart';
import 'package:projeyar_field/features/reports/presentation/bloc/reports_list_bloc.dart';
import 'package:projeyar_field/features/reports/presentation/bloc/review_bloc.dart';
import 'package:projeyar_field/features/reports/presentation/bloc/revision_bloc.dart';

import '../../support/fakes.dart';
import '../../support/mocks.dart';

StoredPhoto _photo(String id) =>
    StoredPhoto(id: id, sha256: 'a', sizeBytes: 1, takenAt: DateTime.utc(2026, 11, 20), workDate: '2026-11-20', lat: 35.7, lng: 51.4);

void main() {
  late MockActivities activities;
  late MockReports reports;
  late MockPhotos photos;
  final clock = FakeClock(DateTime.utc(2026, 11, 20, 6));
  final draft = ReportDraft(id: 'r1', projectId: 'p1', workDate: '2026-11-20', createdAt: DateTime.utc(2026, 11, 20));

  setUpAll(() {
    registerFallbackValue(const DraftItem(id: '', activityId: ''));
    registerFallbackValue(const QuickTarget());
    registerFallbackValue(
      const ResubmissionInput(id: '', item: ServerItem(id: '', reportId: '', projectId: '', activityId: '', status: ItemStatus.submitted), values: ProgressValues()),
    );
  });

  setUp(() {
    activities = MockActivities();
    reports = MockReports();
    photos = MockPhotos();
    when(() => activities.activity('a1')).thenAnswer((_) async => pipeActivity);
    when(() => activities.project('p1')).thenAnswer((_) async => pipeProject);
    when(() => reports.openDraft(projectId: 'p1', workDate: any(named: 'workDate'))).thenAnswer((_) async => Ok(draft));
    when(() => reports.ensureItem('r1', 'a1')).thenAnswer((_) async => const Ok(DraftItem(id: 'it1', activityId: 'a1')));
    when(() => photos.watchQuick(any())).thenAnswer((_) => Stream.value(const []));
  });

  group('ReportFormBloc (M06)', () {
    ReportFormBloc build() => ReportFormBloc(activities, reports, photos, clock);

    blocTest<ReportFormBloc, ReportFormState>(
      'AC-FA-07 ورود ۷۲ متر از ۲٬۴۰۰ با ۵۵٪ ← پیش‌نمایش ۳٪ و ۵۸٪ در حالت فرم',
      setUp: () => when(() => photos.watchFor(any())).thenAnswer((_) => Stream.value([_photo('1'), _photo('2')])),
      build: build,
      act: (b) async {
        b.add(const ReportFormStarted(projectId: 'p1', activityId: 'a1'));
        await Future<void>.delayed(const Duration(milliseconds: 20));
        b.add(const ReportQuantityChanged('۷۲'));
      },
      wait: const Duration(milliseconds: 20),
      verify: (b) {
        final p = b.state.preview!;
        expect(p.todayPercent, closeTo(3, 1e-9));
        expect(p.cumulative, closeTo(58, 1e-9));
        expect(p.blocking, isFalse);
        expect(b.state.values.quantityToday, 72);
      },
    );

    blocTest<ReportFormBloc, ReportFormState>(
      'ذخیره با عکس کمتر از حداقل مانع است و خطا نشان داده می‌شود',
      setUp: () => when(() => photos.watchFor(any())).thenAnswer((_) => Stream.value(const [])),
      build: build,
      act: (b) async {
        b.add(const ReportFormStarted(projectId: 'p1', activityId: 'a1'));
        await Future<void>.delayed(const Duration(milliseconds: 20));
        b
          ..add(const ReportQuantityChanged('72'))
          ..add(const ReportItemSaved());
      },
      wait: const Duration(milliseconds: 20),
      verify: (b) {
        expect(b.state.status, ReportFormStatus.ready);
        expect(b.state.showErrors, isTrue);
        expect(b.state.preview!.warnings, contains(PreviewWarning.photosBelowMin));
        verifyNever(() => reports.saveItem(any(), any()));
      },
    );

    blocTest<ReportFormBloc, ReportFormState>(
      'ذخیرهٔ معتبر: سربرگ و آیتم با نفرات و رفتن به M08',
      setUp: () {
        when(() => photos.watchFor(any())).thenAnswer((_) => Stream.value([_photo('1'), _photo('2')]));
        when(
          () => reports.updateHeader(any(), workDate: any(named: 'workDate'), weather: any(named: 'weather'), temperatureC: any(named: 'temperatureC')),
        ).thenAnswer((_) async => const Ok(unit));
        when(() => reports.saveItem(any(), any())).thenAnswer((_) async => const Ok(unit));
      },
      build: build,
      act: (b) async {
        b.add(const ReportFormStarted(projectId: 'p1', activityId: 'a1'));
        await Future<void>.delayed(const Duration(milliseconds: 20));
        b
          ..add(const ReportQuantityChanged('72'))
          ..add(const ReportCrewChanged('۶'))
          ..add(const ReportWorkDateChanged('2026-11-25'))
          ..add(const ReportItemSaved());
      },
      wait: const Duration(milliseconds: 20),
      verify: (b) {
        expect(b.state.status, ReportFormStatus.saved);
        expect(b.state.workDate, '2026-11-20', reason: 'تاریخ آینده ممنوع (F08 ۴.۵)');
        final item = verify(() => reports.saveItem('r1', captureAny())).captured.single as DraftItem;
        expect((item.crewCount, item.values.quantityToday), (6, 72.0));
      },
    );

    blocTest<ReportFormBloc, ReportFormState>(
      'فعالیت ناپیدا ← failure',
      setUp: () => when(() => activities.activity('zz')).thenAnswer((_) async => null),
      build: build,
      act: (b) => b.add(const ReportFormStarted(projectId: 'p1', activityId: 'zz')),
      verify: (b) => expect(b.state.failure, isA<NotFoundFailure>()),
    );
  });

  group('ReviewBloc (M08)', () {
    late MockLocation location;
    late FakeNetwork network;
    final full = ReportDraft(
      id: 'r1',
      projectId: 'p1',
      workDate: '2026-11-20',
      createdAt: DateTime.utc(2026, 11, 20),
      items: const [DraftItem(id: 'it1', activityId: 'a1', values: ProgressValues(quantityToday: 72))],
    );

    setUp(() {
      location = MockLocation();
      network = FakeNetwork(NetworkKind.none);
      when(() => reports.watchReport('r1')).thenAnswer((_) => Stream.value(full));
      when(() => photos.photosFor(any())).thenAnswer((_) async => [_photo('1'), _photo('2')]);
      when(() => location.current()).thenAnswer((_) async => const Ok(GeoFix(lat: 35.7, lng: 51.4, accuracyM: 5, mocked: false)));
    });

    ReviewBloc build() => ReviewBloc(reports, activities, photos, location, network, clock);

    blocTest<ReviewBloc, ReviewState>(
      'پیش‌نمایش مسیر و «قبل ← بعد»؛ بی تعهد ارسال نمی‌شود',
      build: build,
      act: (b) async {
        b.add(const ReviewStarted('r1'));
        await Future<void>.delayed(const Duration(milliseconds: 20));
        b.add(const ReviewSubmitted());
      },
      wait: const Duration(milliseconds: 20),
      verify: (b) {
        expect(b.state.route!.approvers, ['مهندس کاظمی']);
        expect(b.state.lines.single.preview!.cumulative, closeTo(58, 1e-9));
        expect(b.state.canSubmit, isFalse);
        verifyNever(() => reports.submit(any(), attestedAt: any(named: 'attestedAt'), gps: any(named: 'gps')));
      },
    );

    blocTest<ReviewBloc, ReviewState>(
      'AC-FA-01 آفلاین: با تعهد «ذخیره در صف ارسال» با موقعیت لحظهٔ ذخیره',
      setUp: () => when(() => reports.submit('r1', attestedAt: any(named: 'attestedAt'), gps: any(named: 'gps'))).thenAnswer((_) async => const Ok(unit)),
      build: build,
      act: (b) async {
        b.add(const ReviewStarted('r1'));
        await Future<void>.delayed(const Duration(milliseconds: 20));
        b
          ..add(const ReviewAttestChanged(value: true))
          ..add(const ReviewSubmitted());
      },
      wait: const Duration(milliseconds: 20),
      verify: (b) {
        expect(b.state.status, ReviewStatus.queued);
        expect(b.state.online, isFalse);
        final gps = verify(() => reports.submit('r1', attestedAt: any(named: 'attestedAt'), gps: captureAny(named: 'gps'))).captured.single as GeoFix;
        expect(gps.lat, 35.7);
      },
    );

    blocTest<ReviewBloc, ReviewState>(
      'خطای ذخیره در حالت می‌ماند',
      setUp: () => when(() => reports.submit('r1', attestedAt: any(named: 'attestedAt'), gps: any(named: 'gps'))).thenAnswer((_) async => const Err(StorageFailure())),
      build: build,
      act: (b) async {
        b.add(const ReviewStarted('r1'));
        await Future<void>.delayed(const Duration(milliseconds: 20));
        b
          ..add(const ReviewAttestChanged(value: true))
          ..add(const ReviewSubmitted());
      },
      wait: const Duration(milliseconds: 20),
      verify: (b) => expect((b.state.status, b.state.failure), (ReviewStatus.ready, const StorageFailure())),
    );
  });

  group('ReportsListBloc (M10)', () {
    blocTest<ReportsListBloc, ReportsListState>(
      'زبانه‌ها بر اساس وضعیت و «N گزارش هنوز در گوشی است»',
      setUp: () {
        when(() => reports.watchLocalReports()).thenAnswer(
          (_) => Stream.value([
            ReportDraft(id: 'q', projectId: 'p1', workDate: '2026-11-20', createdAt: DateTime.utc(2026), state: LocalReportState.queued),
            ReportDraft(id: 'd', projectId: 'p1', workDate: '2026-11-20', createdAt: DateTime.utc(2026)),
          ]),
        );
        when(() => reports.watchServerItems()).thenAnswer(
          (_) => Stream.value(const [
            ServerItem(id: '1', reportId: 'r', projectId: 'p1', activityId: 'a1', status: ItemStatus.stage1),
            ServerItem(id: '2', reportId: 'r', projectId: 'p1', activityId: 'a1', status: ItemStatus.needsRevision),
            ServerItem(id: '3', reportId: 'r', projectId: 'p1', activityId: 'a1', status: ItemStatus.approved),
            ServerItem(id: '4', reportId: 'r', projectId: 'p1', activityId: 'a1', status: ItemStatus.needsResolution),
          ]),
        );
        when(() => activities.watchActivities()).thenAnswer((_) => Stream.value([pipeActivity]));
        when(() => reports.watchQueuedResubmissions()).thenAnswer((_) => Stream.value(const {'2'}));
      },
      build: () => ReportsListBloc(reports, activities),
      act: (b) => b.add(const ReportsListStarted()),
      wait: const Duration(milliseconds: 20),
      verify: (b) {
        final s = b.state;
        expect(s.onDevice, 1);
        expect(s.pending.map((i) => i.id), ['1', '4']);
        expect(s.revisions.map((i) => i.id), ['2']);
        expect(s.decided.map((i) => i.id), ['3']);
        expect(s.activities['a1'], pipeActivity);
      },
    );
  });

  group('RevisionBloc (M11)', () {
    const item = ServerItem(
      id: 'i1',
      reportId: 'r1',
      projectId: 'p1',
      activityId: 'a1',
      status: ItemStatus.needsRevision,
      computedPercent: 58,
      revision: RevisionRequest(
        note: 'عکس نزدیک‌تر',
        actions: [
          RequiredAction(key: 'c', text: 'اندازه را دوباره بگیرید', isPhoto: false),
          RequiredAction(key: 'p', text: 'دو عکس از نزدیک', isPhoto: true, minPhotos: 2),
        ],
      ),
    );

    late List<StoredPhoto> newPhotos;

    setUp(() {
      newPhotos = [];
      when(() => reports.watchServerItem('i1')).thenAnswer((_) => Stream.value(item));
      when(() => reports.watchQueuedResubmissions()).thenAnswer((_) => Stream.value(const <String>{}));
      when(() => photos.watchFor(any())).thenAnswer((_) => Stream.value(newPhotos));
      when(() => reports.resubmit(any())).thenAnswer((_) async => const Ok(unit));
    });

    RevisionBloc build() => RevisionBloc(reports, activities, photos);

    blocTest<RevisionBloc, RevisionState>(
      'AC-FA-09 «ارسال دوباره» تا افزودن ۲ عکس جدید غیرفعال است',
      setUp: () => newPhotos = [_photo('n1')],
      build: build,
      act: (b) async {
        b.add(const RevisionStarted('i1'));
        await Future<void>.delayed(const Duration(milliseconds: 20));
        b
          ..add(const RevisionCheckToggled('c'))
          ..add(const RevisionSubmitted());
      },
      wait: const Duration(milliseconds: 20),
      verify: (b) {
        expect(b.state.requiredPhotos, 2);
        expect(b.state.photosDone, isFalse);
        expect(b.state.canResubmit, isFalse);
        verifyNever(() => reports.resubmit(any()));
      },
    );

    blocTest<RevisionBloc, RevisionState>(
      'AC-FA-09 با ۲ عکس تازه و تیک کارها فعال می‌شود و در صف می‌رود',
      setUp: () => newPhotos = [_photo('n1'), _photo('n2')],
      build: build,
      act: (b) async {
        b.add(const RevisionStarted('i1'));
        await Future<void>.delayed(const Duration(milliseconds: 20));
        expect(b.state.canResubmit, isFalse, reason: 'کار check هنوز تیک نخورده');
        b
          ..add(const RevisionCheckToggled('c'))
          ..add(const RevisionValueChanged('۶۰'))
          ..add(const RevisionReplyChanged('انجام شد'))
          ..add(const RevisionSubmitted());
      },
      wait: const Duration(milliseconds: 20),
      verify: (b) {
        expect(b.state.status, RevisionStatus.queued);
        final input = verify(() => reports.resubmit(captureAny())).captured.single as ResubmissionInput;
        expect(input.values.quantityToday, 60, reason: 'روش مقداری: مقدار آن روز');
        expect(input.reply, 'انجام شد');
        expect(input.id, b.state.resubmissionId);
      },
    );

    blocTest<RevisionBloc, RevisionState>(
      'اصلاحی که در صف است دوباره فرستاده نمی‌شود',
      setUp: () {
        newPhotos = [_photo('n1'), _photo('n2')];
        when(() => reports.watchQueuedResubmissions()).thenAnswer((_) => Stream.value(const {'i1'}));
      },
      build: build,
      act: (b) async {
        b.add(const RevisionStarted('i1'));
        await Future<void>.delayed(const Duration(milliseconds: 20));
        b.add(const RevisionCheckToggled('c'));
      },
      wait: const Duration(milliseconds: 20),
      verify: (b) => expect((b.state.alreadyQueued, b.state.canResubmit), (true, false)),
    );
  });
}
