import 'package:equatable/equatable.dart';

enum OutboxKind {
  report,
  issue,
  resubmit,
  photo;

  bool get isText => this != photo;

  static OutboxKind parse(String raw) => values.firstWhere((k) => k.name == raw, orElse: () => OutboxKind.report);
}

/// چرخهٔ ردیف صف (rules ۹). `sent` نگه داشته می‌شود؛ هیچ حذف خودکاری نیست.
enum OutboxState {
  pending,
  sending,
  retry,
  rejected,
  sent;

  static OutboxState parse(String raw) => values.firstWhere((s) => s.name == raw, orElse: () => OutboxState.pending);

  bool get isWaiting => this == pending || this == sending || this == retry;
}

/// یک ردیف صف ارسال.
final class QueueEntry extends Equatable {
  const QueueEntry({
    required this.id,
    required this.kind,
    required this.entityId,
    required this.projectId,
    required this.state,
    required this.attempts,
    required this.createdAt,
    this.nextAttemptAt,
    this.lastErrorCode,
    this.lastErrorMessage,
    this.bytes = 0,
    this.parentSent = true,
  });

  final int id;
  final OutboxKind kind;
  final String entityId;
  final String projectId;
  final OutboxState state;
  final int attempts;
  final DateTime createdAt;
  final DateTime? nextAttemptAt;
  final String? lastErrorCode;
  final String? lastErrorMessage;
  final int bytes;

  /// برای عکس: گزارش یا مشکلِ صاحبش پیش‌تر به سرور رسیده است (گزارش پیش از عکس‌هایش؛ HANDOFF ۴).
  final bool parentSent;

  @override
  List<Object?> get props => [id, kind, entityId, projectId, state, attempts, createdAt, nextAttemptAt, lastErrorCode, lastErrorMessage, bytes, parentSent];
}

/// خلاصهٔ صف برای M03، M09، M10، M14 و ضربان.
final class QueueSummary extends Equatable {
  const QueueSummary({
    this.reports = 0,
    this.issues = 0,
    this.resubmits = 0,
    this.photos = 0,
    this.bytes = 0,
    this.rejected = 0,
    this.oldestQueuedAt,
  });

  /// شمارش ردیف‌های در انتظار؛ «پذیرفته نشد»ها جدا شمرده می‌شوند و در قدیمی‌ترین نمی‌آیند.
  factory QueueSummary.fromEntries(Iterable<QueueEntry> entries) {
    var reports = 0;
    var issues = 0;
    var resubmits = 0;
    var photos = 0;
    var bytes = 0;
    var rejected = 0;
    DateTime? oldest;
    for (final e in entries) {
      if (e.state == OutboxState.sent) continue;
      if (e.state == OutboxState.rejected) {
        rejected++;
        continue;
      }
      switch (e.kind) {
        case OutboxKind.report:
          reports++;
        case OutboxKind.issue:
          issues++;
        case OutboxKind.resubmit:
          resubmits++;
        case OutboxKind.photo:
          photos++;
          bytes += e.bytes;
      }
      if (oldest == null || e.createdAt.isBefore(oldest)) oldest = e.createdAt;
    }
    return QueueSummary(reports: reports, issues: issues, resubmits: resubmits, photos: photos, bytes: bytes, rejected: rejected, oldestQueuedAt: oldest);
  }

  final int reports;
  final int issues;
  final int resubmits;
  final int photos;
  final int bytes;
  final int rejected;
  final DateTime? oldestQueuedAt;

  int get texts => reports + issues + resubmits;

  int get total => texts + photos;

  bool get isEmpty => total == 0 && rejected == 0;

  @override
  List<Object?> get props => [reports, issues, resubmits, photos, bytes, rejected, oldestQueuedAt];
}

/// نتیجهٔ یک اجرای صف.
final class QueueRunReport extends Equatable {
  const QueueRunReport({this.sent = 0, this.failed = 0, this.rejected = 0, this.skipped = false});

  final int sent;
  final int failed;
  final int rejected;

  /// اجرای دیگری قفل را داشت.
  final bool skipped;

  @override
  List<Object?> get props => [sent, failed, rejected, skipped];
}
