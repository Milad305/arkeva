import 'package:projeyar_field/core/result/result.dart';
import 'package:projeyar_field/features/issues/domain/entities/issue_entities.dart';

/// مشکل کارگاه (M13): ذخیره در صف با UUID گوشی (F08 ۴.۸).
abstract interface class IssuesRepository {
  /// شناسهٔ تازه برای مشکل، تا عکس‌ها پیش از ذخیره به آن بچسبند.
  String newIssueId();

  Future<Result<Unit>> submit(IssueDraft draft);

  /// حذف عکس‌های مشکلی که ذخیره نشد.
  Future<void> discard(String issueId);

  Stream<List<SiteIssue>> watchIssues();
}
