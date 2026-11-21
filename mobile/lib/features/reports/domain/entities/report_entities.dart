import 'package:equatable/equatable.dart';

/// وضعیت آیتم در سرور (F09).
enum ItemStatus {
  submitted,
  stage1,
  stage2,
  approved,
  needsRevision,
  rejected,
  superseded,
  needsResolution;

  static ItemStatus parse(String raw) => switch (raw) {
    'needs_revision' => needsRevision,
    'needs_resolution' => needsResolution,
    _ => values.firstWhere((s) => s.name == raw, orElse: () => submitted),
  };

  /// هنوز تصمیم نهایی نگرفته (زبانهٔ «در انتظار» M10).
  bool get isPending => this == submitted || this == stage1 || this == stage2 || this == needsResolution;

  bool get isDecided => this == approved || this == rejected || this == superseded;
}

enum Weather { sunny, cloudy, rainy, snowy, windy, dusty }

/// مقادیر پیشرفت یک آیتم به تفکیک روش (`values` در API).
final class ProgressValues extends Equatable {
  const ProgressValues({this.reportedPercent, this.quantityToday, this.steps = const {}});

  final double? reportedPercent;
  final double? quantityToday;

  /// کلید گام ← درصد
  final Map<String, double> steps;

  bool get isEmpty => reportedPercent == null && quantityToday == null && steps.isEmpty;

  ProgressValues copyWith({double? reportedPercent, double? quantityToday, Map<String, double>? steps, bool clearPercent = false, bool clearQuantity = false}) =>
      ProgressValues(
        reportedPercent: clearPercent ? null : reportedPercent ?? this.reportedPercent,
        quantityToday: clearQuantity ? null : quantityToday ?? this.quantityToday,
        steps: steps ?? this.steps,
      );

  @override
  List<Object?> get props => [reportedPercent, quantityToday, steps];
}

/// آیتم پیش‌نویس گزارش در گوشی.
final class DraftItem extends Equatable {
  const DraftItem({required this.id, required this.activityId, this.values = const ProgressValues(), this.crewCount, this.note});

  final String id;
  final String activityId;
  final ProgressValues values;
  final int? crewCount;
  final String? note;

  bool get isComplete => !values.isEmpty;

  @override
  List<Object?> get props => [id, activityId, values, crewCount, note];
}

/// گزارش در گوشی: پیش‌نویس، در صف، رسیده یا «پذیرفته نشد».
enum LocalReportState {
  draft,
  queued,
  sent,
  rejected;

  static LocalReportState parse(String raw) => values.firstWhere((s) => s.name == raw, orElse: () => draft);
}

final class ReportDraft extends Equatable {
  const ReportDraft({
    required this.id,
    required this.projectId,
    required this.workDate,
    required this.createdAt,
    this.state = LocalReportState.draft,
    this.weather,
    this.temperatureC,
    this.note,
    this.items = const [],
    this.reportNo,
    this.rejectMessage,
  });

  final String id;
  final String projectId;
  final String workDate;
  final DateTime createdAt;
  final LocalReportState state;
  final Weather? weather;
  final int? temperatureC;
  final String? note;
  final List<DraftItem> items;
  final String? reportNo;
  final String? rejectMessage;

  DraftItem? itemFor(String activityId) {
    for (final item in items) {
      if (item.activityId == activityId) return item;
    }
    return null;
  }

  @override
  List<Object?> get props => [id, projectId, workDate, createdAt, state, weather, temperatureC, note, items, reportNo, rejectMessage];
}

/// کار لازم در درخواست اصلاح (F09 ۴.۳).
final class RequiredAction extends Equatable {
  const RequiredAction({required this.key, required this.text, required this.isPhoto, this.minPhotos});

  final String key;
  final String text;
  final bool isPhoto;
  final int? minPhotos;

  @override
  List<Object?> get props => [key, text, isPhoto, minPhotos];
}

final class RevisionRequest extends Equatable {
  const RevisionRequest({this.note, this.actions = const [], this.requestedAt});

  final String? note;
  final List<RequiredAction> actions;
  final DateTime? requestedAt;

  /// کمترین تعداد عکس تازه که کارهای نوع `photo` می‌خواهند (AC-FA-09).
  int get requiredNewPhotos {
    var total = 0;
    for (final a in actions) {
      if (a.isPhoto) total += a.minPhotos ?? 1;
    }
    return total;
  }

  @override
  List<Object?> get props => [note, actions, requestedAt];
}

final class ServerPhotoRef extends Equatable {
  const ServerPhotoRef({required this.id, required this.uploadStatus, required this.markedUnsuitable});

  final String id;
  final String uploadStatus;
  final bool markedUnsuitable;

  @override
  List<Object?> get props => [id, uploadStatus, markedUnsuitable];
}

/// آیتم ارسال‌شدهٔ کاربر با وضعیت سرور (آینهٔ sync).
final class ServerItem extends Equatable {
  const ServerItem({
    required this.id,
    required this.reportId,
    required this.projectId,
    required this.activityId,
    required this.status,
    this.reportNo,
    this.workDate,
    this.flags = const [],
    this.computedPercent,
    this.revisionCount = 0,
    this.revision,
    this.photos = const [],
  });

  final String id;
  final String reportId;
  final String projectId;
  final String activityId;
  final ItemStatus status;
  final String? reportNo;
  final String? workDate;
  final List<String> flags;
  final double? computedPercent;
  final int revisionCount;
  final RevisionRequest? revision;
  final List<ServerPhotoRef> photos;

  @override
  List<Object?> get props => [id, reportId, projectId, activityId, status, reportNo, workDate, flags, computedPercent, revisionCount, revision, photos];
}

/// ورودی ارسال دوباره (M11).
final class ResubmissionInput extends Equatable {
  const ResubmissionInput({required this.id, required this.item, required this.values, this.reply});

  /// UUID گوشی برای ردیف صف و عکس‌های تازه
  final String id;
  final ServerItem item;
  final ProgressValues values;
  final String? reply;

  @override
  List<Object?> get props => [id, item, values, reply];
}
