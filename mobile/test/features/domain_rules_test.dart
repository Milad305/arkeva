import 'package:flutter_test/flutter_test.dart';
import 'package:projeyar_field/core/l10n/labels.dart';
import 'package:projeyar_field/core/network/network_info.dart';
import 'package:projeyar_field/features/activities/domain/entities/activity_entities.dart';
import 'package:projeyar_field/features/activities/domain/services/activity_schedule.dart';
import 'package:projeyar_field/features/activities/domain/usecases/watch_today_activities.dart';
import 'package:projeyar_field/features/camera/domain/entities/photo_entities.dart';
import 'package:projeyar_field/features/camera/domain/services/stamp_text.dart';
import 'package:projeyar_field/features/queue/domain/entities/queue_entities.dart';
import 'package:projeyar_field/features/queue/domain/services/outbox_planner.dart';
import 'package:projeyar_field/features/reports/domain/entities/report_entities.dart';
import 'package:projeyar_field/features/reports/domain/services/progress_preview.dart';
import 'package:projeyar_field/features/reports/domain/services/route_preview.dart';

import '../support/fakes.dart';

Activity _act({String? start, String? finish, double approved = 0, double? pending, String code = 'X', List<PlanPoint> plan = const []}) => Activity(
  id: code,
  projectId: 'p1',
  code: code,
  title: code,
  method: MeasureMethod.percent,
  approvedPercent: approved,
  lastPendingPercent: pending,
  plannedStart: start,
  plannedFinish: finish,
  plan: plan,
);

QueueEntry _entry(int id, OutboxKind kind, {int minute = 0, OutboxState state = OutboxState.pending, bool parentSent = true, DateTime? next}) =>
    QueueEntry(
      id: id,
      kind: kind,
      entityId: 'e$id',
      projectId: 'p1',
      state: state,
      attempts: 0,
      createdAt: DateTime.utc(2026, 11, 20, 8, minute),
      parentSent: parentSent,
      nextAttemptAt: next,
    );

void main() {
  const today = '2026-11-20';

  group('فعالیت‌های امروز (F08 ۴.۱)', () {
    test('در بازهٔ برنامه‌ای', () => expect(ActivitySchedule.isDueToday(_act(start: '2026-11-10', finish: '2026-11-25'), today), isTrue));
    test('شروع‌نشده با موعد شروع گذشته', () => expect(ActivitySchedule.isDueToday(_act(start: '2026-11-01', finish: '2026-11-05'), today), isTrue));
    test('تمام‌نشده با موعد پایان گذشته', () => expect(ActivitySchedule.isDueToday(_act(start: '2026-10-01', finish: '2026-11-05', approved: 40), today), isTrue));
    test('تمام‌شده با پایان گذشته نیست', () => expect(ActivitySchedule.isDueToday(_act(start: '2026-10-01', finish: '2026-11-05', approved: 100), today), isFalse));
    test('آینده نیست', () => expect(ActivitySchedule.isDueToday(_act(start: '2026-12-01', finish: '2026-12-10'), today), isFalse));
    test('عقب‌افتاده‌ترین اول', () {
      const plan = [PlanPoint(date: '2026-11-20', plannedPercent: 60)];
      final behind = _act(start: '2026-11-01', finish: '2026-11-30', code: 'B', plan: plan);
      final ok = _act(start: '2026-11-01', finish: '2026-11-30', approved: 70, code: 'A', plan: plan);
      final selected = WatchTodayActivities.select([ok, behind], today);
      expect(selected.first.code, 'B');
    });
    test('برنامهٔ امروز از برنامهٔ ۱۴ روزه، بیرون از آن از بازه', () {
      expect(ActivitySchedule.plannedOn(pipeActivity, today), 60);
      expect(ActivitySchedule.plannedOn(pipeActivity, '2027-01-05'), 100);
      expect(ActivitySchedule.plannedOn(pipeActivity, '2026-10-01'), 0);
      expect(ActivitySchedule.deviation(pipeActivity, today), -5);
    });
  });

  group('پیش‌نمایش درصد (D07)', () {
    test('AC-FA-07 روش مقداری: ۷۲ متر از ۲٬۴۰۰ با ۵۵٪ ← امروز ۳٪ و تجمعی ۵۸٪', () {
      final p = ProgressPreviewer.preview(
        activity: pipeActivity,
        rules: pipeProject.rules,
        values: const ProgressValues(quantityToday: 72),
        photos: const [PhotoSpot(lat: 35.7, lng: 51.4), PhotoSpot(lat: 35.7, lng: 51.4)],
        site: pipeProject.site,
      );
      expect(p.todayPercent, closeTo(3, 1e-9));
      expect(p.cumulative, closeTo(58, 1e-9));
      expect(p.warnings, isEmpty);
    });

    test('جهش بالای آستانه هشدار است، نه مانع', () {
      final p = ProgressPreviewer.preview(activity: pipeActivity, rules: pipeProject.rules, values: const ProgressValues(quantityToday: 720), photos: const [PhotoSpot(), PhotoSpot()]);
      expect(p.warnings, contains(PreviewWarning.jumpAboveLimit));
      expect(p.blocking, isFalse);
    });

    test('کاهش ممنوع و عکس کمتر از حداقل مانع‌اند', () {
      final percent = _act(approved: 50);
      final p = ProgressPreviewer.preview(activity: percent, rules: pipeProject.rules, values: const ProgressValues(reportedPercent: 40));
      expect(p.warnings, containsAll([PreviewWarning.decreaseNotAllowed, PreviewWarning.photosBelowMin]));
      expect(p.blocking, isTrue);
    });

    test('گام‌ها با وزن؛ گام واردنشده تأییدشده‌اش', () {
      const steps = Activity(
        id: 's',
        projectId: 'p1',
        code: 'S',
        title: 'S',
        method: MeasureMethod.steps,
        approvedPercent: 0,
        steps: [
          ActivityStep(key: 'a', title: 'الف', weight: 1, approvedPercent: 100),
          ActivityStep(key: 'b', title: 'ب', weight: 3, approvedPercent: 0),
        ],
      );
      expect(ProgressPreviewer.stepsPercent(steps, {'b': 50}), closeTo(62.5, 1e-9));
    });

    test('قاعدهٔ اکثریت GPS: بیرون بودن بیشتر عکس‌ها', () {
      const site = SiteArea(lat: 35.7, lng: 51.4, radiusM: 200);
      const inside = PhotoSpot(lat: 35.7, lng: 51.4);
      const outside = PhotoSpot(lat: 35.8, lng: 51.4);
      expect(ProgressPreviewer.isMostlyOutside([inside, outside], site), isFalse);
      expect(ProgressPreviewer.isMostlyOutside([inside, outside, outside], site), isTrue);
    });
  });

  test('پیش‌نمایش مسیر M08: نام تأییدکننده و تک‌مرحله‌ای', () {
    final r = RoutePreview.of(const [pipeActivity, pipeActivity], pipeProject.rules);
    expect(r.approvers, ['مهندس کاظمی']);
    expect(r.twoStage, isFalse);
  });

  group('ترتیب صف (F08 ۵.۲)', () {
    final now = DateTime.utc(2026, 11, 20, 12);

    test('همهٔ متن‌ها پیش از عکس‌ها و قدیمی‌ترین اول', () {
      final plan = OutboxPlanner.plan(
        [_entry(1, OutboxKind.photo), _entry(2, OutboxKind.report, minute: 5), _entry(3, OutboxKind.issue, minute: 1)],
        now: now,
        network: NetworkKind.wifi,
        wifiOnly: false,
      );
      expect(plan.map((e) => e.id), [3, 2, 1]);
    });

    test('«فقط Wi‑Fi» فقط عکس‌ها را روی دادهٔ همراه نگه می‌دارد', () {
      final plan = OutboxPlanner.plan([_entry(1, OutboxKind.photo), _entry(2, OutboxKind.report)], now: now, network: NetworkKind.mobile, wifiOnly: true);
      expect(plan.map((e) => e.id), [2]);
    });

    test('عکسی که گزارشش نرسیده، رد‌شده‌ها و تأخیر آینده منتظر می‌مانند', () {
      final plan = OutboxPlanner.plan(
        [
          _entry(1, OutboxKind.photo, parentSent: false),
          _entry(2, OutboxKind.report, state: OutboxState.rejected),
          _entry(3, OutboxKind.report, state: OutboxState.retry, next: now.add(const Duration(minutes: 1))),
        ],
        now: now,
        network: NetworkKind.wifi,
        wifiOnly: false,
      );
      expect(plan, isEmpty);
    });

    test('بی‌شبکه هیچ', () => expect(OutboxPlanner.plan([_entry(1, OutboxKind.report)], now: now, network: NetworkKind.none, wifiOnly: false), isEmpty));

    test('پس‌روی نمایی ۲، ۴، ۸ تا ۵ دقیقه', () {
      expect(OutboxPlanner.backoff(1).inSeconds, 2);
      expect(OutboxPlanner.backoff(3).inSeconds, 8);
      expect(OutboxPlanner.backoff(20).inSeconds, 300);
      expect(OutboxPlanner.backoff(2, retryAfter: const Duration(seconds: 30)).inSeconds, 30);
    });
  });

  group('مهر عکس', () {
    test('AC-FA-04 مهر کامل: زمان شمسی، مختصات و دقت، داخل کارگاه، کد فعالیت و سرپرست', () {
      final lines = StampText.lines(
        StampInfo(
          takenAt: DateTime.utc(2026, 11, 20, 6, 30, 15),
          supervisorName: 'رضا کریمی',
          siteName: 'کارگاه شمال',
          activityCode: '1.2.3',
          lat: 35.7,
          lng: 51.4,
          accuracyM: 8,
          insideSite: true,
        ),
      );
      expect(lines[0], '۱۴۰۵/۰۸/۲۹  ۱۰:۰۰:۱۵');
      expect(lines[1], contains('۳۵٫۷۰۰۰۰۰'.replaceAll('٫', '.')));
      expect(lines[1], contains('±۸ متر'));
      expect(lines[2], 'کارگاه شمال · داخل کارگاه');
      expect(lines[3], '1.2.3 · رضا کریمی');
    });

    test('بی GPS: «موقعیت در دسترس نبود»', () {
      final lines = StampText.lines(StampInfo(takenAt: DateTime.utc(2026), supervisorName: 'رضا'));
      expect(lines, contains('موقعیت در دسترس نبود'));
    });
  });

  test('AC-FA-06 وضعیت needs_resolution با برچسب «در انتظار تعیین تکلیف ناظر»', () {
    final status = ItemStatus.parse('needs_resolution');
    expect(status, ItemStatus.needsResolution);
    expect(status.isPending, isTrue);
    expect(Labels.itemStatus(status.name), 'در انتظار تعیین تکلیف ناظر');
  });

  test('AC-FA-09 کارهای نوع photo تعداد عکس تازهٔ لازم را می‌سازند', () {
    const r = RevisionRequest(
      actions: [
        RequiredAction(key: 'c', text: 'بررسی', isPhoto: false),
        RequiredAction(key: 'p', text: 'دو عکس از نمای نزدیک', isPhoto: true, minPhotos: 2),
      ],
    );
    expect(r.requiredNewPhotos, 2);
  });
}
