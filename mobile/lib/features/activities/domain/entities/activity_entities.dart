import 'package:equatable/equatable.dart';

/// موقعیت و شعاع کارگاه (F02).
final class SiteArea extends Equatable {
  const SiteArea({required this.lat, required this.lng, this.radiusM});

  final double lat;
  final double lng;
  final double? radiusM;

  @override
  List<Object?> get props => [lat, lng, radiusM];
}

/// قواعد گزارش پروژه (F02؛ پاسخ sync).
final class ReportRules extends Equatable {
  const ReportRules({
    this.minPhotos = 0,
    this.maxJumpPct,
    this.allowDecrease = false,
    this.lateAfterHours,
    this.gpsMode,
    this.approvalMode,
  });

  final int minPhotos;
  final double? maxJumpPct;
  final bool allowDecrease;
  final int? lateAfterHours;
  final String? gpsMode;

  /// single_stage | two_stage
  final String? approvalMode;

  bool get twoStage => approvalMode == 'two_stage';

  @override
  List<Object?> get props => [minPhotos, maxJumpPct, allowDecrease, lateAfterHours, gpsMode, approvalMode];
}

/// یادآوری روزانهٔ پروژه (`rules.dailyReminder`؛ NT-FLD-04): ساعت تهران `HH:mm`.
final class DailyReminder extends Equatable {
  const DailyReminder({this.enabled = true, this.time = '17:00'});

  final bool enabled;
  final String time;

  /// زودترین ساعت فعال میان پروژه‌ها؛ هیچ پروژهٔ فعالی نباشد ← null `[پیش‌فرض فنی]`. یک یادآوری محلی و یک مهلت M03 برای همه.
  static String? earliest(Iterable<Project> projects) {
    final times = [for (final p in projects) if (p.reminder.enabled && _valid.hasMatch(p.reminder.time)) p.reminder.time]..sort();
    return times.firstOrNull;
  }

  static final _valid = RegExp(r'^([01]\d|2[0-3]):[0-5]\d$');

  @override
  List<Object?> get props => [enabled, time];
}

final class Project extends Equatable {
  const Project({required this.id, required this.name, required this.rules, this.site, this.reminder = const DailyReminder()});

  final String id;
  final String name;
  final SiteArea? site;
  final ReportRules rules;
  final DailyReminder reminder;

  @override
  List<Object?> get props => [id, name, site, rules, reminder];
}

/// روش اندازه‌گیری برگ (F08 ۴.۲).
enum MeasureMethod {
  quantity,
  percent,
  steps;

  static MeasureMethod parse(String raw) => values.firstWhere((m) => m.name == raw, orElse: () => MeasureMethod.percent);
}

final class ActivityStep extends Equatable {
  const ActivityStep({required this.key, required this.title, required this.weight, required this.approvedPercent});

  final String key;
  final String title;
  final double weight;
  final double approvedPercent;

  @override
  List<Object?> get props => [key, title, weight, approvedPercent];
}

final class PlanPoint extends Equatable {
  const PlanPoint({required this.date, required this.plannedPercent});

  final String date;
  final double plannedPercent;

  @override
  List<Object?> get props => [date, plannedPercent];
}

/// برگ تخصیص‌یافته به سرپرست (آینهٔ sync).
final class Activity extends Equatable {
  const Activity({
    required this.id,
    required this.projectId,
    required this.code,
    required this.title,
    required this.method,
    required this.approvedPercent,
    this.parentId,
    this.unit,
    this.totalQuantity,
    this.steps = const [],
    this.plannedStart,
    this.plannedFinish,
    this.approvedQuantity,
    this.lastPendingPercent,
    this.plan = const [],
    this.approverUserId,
    this.approverName,
  });

  final String id;
  final String projectId;
  final String? parentId;
  final String code;
  final String title;
  final MeasureMethod method;
  final String? unit;
  final double? totalQuantity;
  final List<ActivityStep> steps;
  final String? plannedStart;
  final String? plannedFinish;
  final double approvedPercent;
  final double? approvedQuantity;
  final double? lastPendingPercent;
  final List<PlanPoint> plan;
  final String? approverUserId;
  final String? approverName;

  /// «آخرین X٪»: آخرین گزارش در انتظار، وگرنه تأییدشده.
  double get lastPercent => lastPendingPercent ?? approvedPercent;

  @override
  List<Object?> get props => [
    id,
    projectId,
    parentId,
    code,
    title,
    method,
    unit,
    totalQuantity,
    steps,
    plannedStart,
    plannedFinish,
    approvedPercent,
    approvedQuantity,
    lastPendingPercent,
    plan,
    approverUserId,
    approverName,
  ];
}
