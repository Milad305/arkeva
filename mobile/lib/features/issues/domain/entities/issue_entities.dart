import 'package:equatable/equatable.dart';

/// شش نوع ثابت مشکل کارگاه (risk.md ۵.۳؛ تصمیم 1405/08/25).
enum IssueType { material, safety, equipment, design, weather, other }

/// اثر بر کار (F08 ۴.۸).
enum IssueEffect { stop, slow, none }

/// مشکل ثبت‌شده در گوشی (پیش از ارسال).
final class IssueDraft extends Equatable {
  const IssueDraft({
    required this.id,
    required this.projectId,
    required this.type,
    required this.title,
    required this.effect,
    this.description,
    this.activityId,
  });

  final String id;
  final String projectId;
  final IssueType type;
  final String title;
  final IssueEffect effect;
  final String? description;
  final String? activityId;

  @override
  List<Object?> get props => [id, projectId, type, title, effect, description, activityId];
}

/// مشکل در فهرست (گوشی یا سرور).
final class SiteIssue extends Equatable {
  const SiteIssue({
    required this.id,
    required this.projectId,
    required this.title,
    required this.type,
    required this.effect,
    required this.status,
    required this.reportedAt,
    this.riskCode,
    this.local = false,
    this.rejectMessage,
  });

  final String id;
  final String projectId;
  final String title;
  final String type;
  final String effect;

  /// وضعیت ریسک در سرور، یا queued | rejected برای گوشی
  final String status;
  final DateTime reportedAt;
  final String? riskCode;
  final bool local;
  final String? rejectMessage;

  @override
  List<Object?> get props => [id, projectId, title, type, effect, status, reportedAt, riskCode, local, rejectMessage];
}
