import 'package:equatable/equatable.dart';

/// صاحب عکس؛ `ownerKind` جدول `LocalPhotos`.
sealed class PhotoTarget extends Equatable {
  const PhotoTarget(this.projectId);

  final String? projectId;
}

/// عکس آیتم گزارش (M06).
final class ReportItemTarget extends PhotoTarget {
  const ReportItemTarget({required String projectId, required this.reportId, required this.itemId}) : super(projectId);

  final String reportId;
  final String itemId;

  @override
  List<Object?> get props => [projectId, reportId, itemId];
}

/// عکس مشکل کارگاه (M13).
final class IssueTarget extends PhotoTarget {
  const IssueTarget({required String projectId, required this.issueId}) : super(projectId);

  final String issueId;

  @override
  List<Object?> get props => [projectId, issueId];
}

/// عکس اصلاح (M11): به ارسال دوباره بسته است.
final class RevisionTarget extends PhotoTarget {
  const RevisionTarget({required String projectId, required this.resubmissionId, required this.serverItemId}) : super(projectId);

  final String resubmissionId;
  final String serverItemId;

  @override
  List<Object?> get props => [projectId, resubmissionId, serverItemId];
}

/// عکس سریع (F08 ۴.۹): تا پایان همان روز پیوست‌پذیر.
final class QuickTarget extends PhotoTarget {
  const QuickTarget({String? projectId}) : super(projectId);

  @override
  List<Object?> get props => [projectId];
}

/// عکس ذخیره‌شده و رمزنگاری‌شده در گوشی.
final class StoredPhoto extends Equatable {
  const StoredPhoto({
    required this.id,
    required this.sha256,
    required this.sizeBytes,
    required this.takenAt,
    required this.workDate,
    this.lat,
    this.lng,
    this.accuracyM,
    this.mocked = false,
    this.uploaded = false,
  });

  final String id;
  final String sha256;
  final int sizeBytes;
  final DateTime takenAt;
  final String workDate;
  final double? lat;
  final double? lng;
  final double? accuracyM;
  final bool mocked;
  final bool uploaded;

  @override
  List<Object?> get props => [id, sha256, sizeBytes, takenAt, workDate, lat, lng, accuracyM, mocked, uploaded];
}

/// متن مهر روی پیکسل (F08 ۶): زمان، تاریخ شمسی، مختصات، دقت، داخل/خارج کارگاه، کد فعالیت، نام سرپرست.
final class StampInfo extends Equatable {
  const StampInfo({
    required this.takenAt,
    required this.supervisorName,
    this.siteName,
    this.activityCode,
    this.lat,
    this.lng,
    this.accuracyM,
    this.insideSite,
  });

  final DateTime takenAt;
  final String supervisorName;
  final String? siteName;
  final String? activityCode;
  final double? lat;
  final double? lng;
  final double? accuracyM;

  /// null = کارگاه موقعیت ندارد یا GPS نیست.
  final bool? insideSite;

  @override
  List<Object?> get props => [takenAt, supervisorName, siteName, activityCode, lat, lng, accuracyM, insideSite];
}

/// درخواست باز کردن دوربین (M07) از صفحهٔ دیگر؛ `extra` مسیر.
final class CaptureRequest extends Equatable {
  const CaptureRequest({
    required this.target,
    required this.workDate,
    required this.supervisorName,
    this.siteName,
    this.activityCode,
    this.siteLat,
    this.siteLng,
    this.siteRadiusM,
  });

  final PhotoTarget target;
  final String workDate;
  final String supervisorName;
  final String? siteName;
  final String? activityCode;
  final double? siteLat;
  final double? siteLng;
  final double? siteRadiusM;

  @override
  List<Object?> get props => [target, workDate, supervisorName, siteName, activityCode, siteLat, siteLng, siteRadiusM];
}
