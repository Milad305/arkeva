import 'package:equatable/equatable.dart';
import 'package:projeyar_field/features/activities/domain/entities/activity_entities.dart';

/// پیش‌نمایش مسیر تأیید M08: «برای تأیید به مهندس کاظمی می‌رود؛ مرحلهٔ دوم لازم نیست». فقط تخمین (F08 ۴.۶).
final class RoutePreview extends Equatable {
  const RoutePreview({required this.approvers, required this.twoStage});

  factory RoutePreview.of(List<Activity> activities, ReportRules rules) {
    final names = <String>[];
    for (final a in activities) {
      final name = a.approverName;
      if (name != null && name.isNotEmpty && !names.contains(name)) names.add(name);
    }
    return RoutePreview(approvers: names, twoStage: rules.twoStage);
  }

  /// نام تأییدکنندگان مرحلهٔ اول (یکتا، به ترتیب ورود)؛ نام نامعلوم حذف می‌شود.
  final List<String> approvers;
  final bool twoStage;

  @override
  List<Object?> get props => [approvers, twoStage];
}
