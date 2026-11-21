import 'dart:math' as math;

import 'package:equatable/equatable.dart';
import 'package:projeyar_field/core/device/location.dart';
import 'package:projeyar_field/features/activities/domain/entities/activity_entities.dart';
import 'package:projeyar_field/features/reports/domain/entities/report_entities.dart';

/// هشدار پیش‌نمایش؛ هشدار است نه مانع (rules ۱۱)، جز `photosBelowMin` و `decreaseNotAllowed` که سرور هم پرچم یا رد می‌کند.
enum PreviewWarning { jumpAboveLimit, decreaseNotAllowed, photosBelowMin, gpsOutOfRange, overHundred, percentQuantityMismatch }

final class ProgressPreview extends Equatable {
  const ProgressPreview({
    required this.base,
    this.todayPercent,
    this.cumulative,
    this.warnings = const {},
  });

  /// مبنای مقایسه: آخرین در انتظار یا تأییدشده.
  final double base;

  /// سهم امروز (روش مقداری): «برابر ۳٪ از ۲٬۴۰۰ متر».
  final double? todayPercent;

  /// درصد تجمعی پس از این گزارش.
  final double? cumulative;

  final Set<PreviewWarning> warnings;

  /// مانع ارسال سمت گوشی: فقط آنچه سرور هم رد یا پرچم می‌کند.
  bool get blocking => warnings.contains(PreviewWarning.decreaseNotAllowed) || warnings.contains(PreviewWarning.photosBelowMin);

  @override
  List<Object?> get props => [base, todayPercent, cumulative, warnings];
}

/// موقعیت یک عکس برای قاعدهٔ اکثریت GPS.
final class PhotoSpot extends Equatable {
  const PhotoSpot({this.lat, this.lng});

  final double? lat;
  final double? lng;

  @override
  List<Object?> get props => [lat, lng];
}

/// پیش‌نمایش خالص درصد (D07؛ AC-FA-07). عدد سرور همیشه مرجع است و پس از پاسخ جایگزین می‌شود.
abstract final class ProgressPreviewer {
  static ProgressPreview preview({
    required Activity activity,
    required ReportRules rules,
    required ProgressValues values,
    List<PhotoSpot> photos = const [],
    SiteArea? site,
  }) {
    final base = activity.lastPercent;
    double? today;
    double? cumulative;
    final warnings = <PreviewWarning>{};

    switch (activity.method) {
      case MeasureMethod.quantity:
        final total = activity.totalQuantity;
        final qty = values.quantityToday;
        if (total != null && total > 0 && qty != null) {
          today = qty / total * 100;
          // مبنای مقدار: مقدار تأییدشده؛ اگر نبود، از درصد تأییدشده
          final approvedQty = activity.approvedQuantity ?? activity.approvedPercent * total / 100;
          cumulative = (approvedQty + qty) / total * 100;
        }
      case MeasureMethod.percent:
        cumulative = values.reportedPercent;
        final qty = values.quantityToday;
        final total = activity.totalQuantity;
        if (cumulative != null && qty != null && total != null && total > 0) {
          final implied = (activity.approvedQuantity ?? activity.approvedPercent * total / 100) + qty;
          if (((implied / total * 100) - cumulative).abs() > 1) warnings.add(PreviewWarning.percentQuantityMismatch);
        }
      case MeasureMethod.steps:
        cumulative = stepsPercent(activity, values.steps);
    }

    if (cumulative != null) {
      final jump = cumulative - base;
      final limit = rules.maxJumpPct;
      if (limit != null && jump > limit) warnings.add(PreviewWarning.jumpAboveLimit);
      if (!rules.allowDecrease && cumulative < base - 1e-9) warnings.add(PreviewWarning.decreaseNotAllowed);
      if (cumulative > 100 + 1e-9) warnings.add(PreviewWarning.overHundred);
    }
    if (photos.length < rules.minPhotos) warnings.add(PreviewWarning.photosBelowMin);
    if (site != null && site.radiusM != null && isMostlyOutside(photos, site)) warnings.add(PreviewWarning.gpsOutOfRange);

    return ProgressPreview(base: base, todayPercent: today, cumulative: cumulative, warnings: warnings);
  }

  /// درصد کل گام‌ها با وزن (G12). گامی که وارد نشده، تأییدشده‌اش حساب می‌شود.
  static double? stepsPercent(Activity activity, Map<String, double> entered) {
    if (activity.steps.isEmpty) return null;
    var weighted = 0.0;
    var weights = 0.0;
    for (final step in activity.steps) {
      final pct = entered[step.key] ?? step.approvedPercent;
      weighted += step.weight * pct;
      weights += step.weight;
    }
    return weights <= 0 ? null : weighted / weights;
  }

  /// پرچم `gps_out_of_range` وقتی **بیشتر** عکس‌ها بیرون از شعاع باشند `[تأییدشده]`.
  static bool isMostlyOutside(List<PhotoSpot> photos, SiteArea site) {
    final located = photos.where((p) => p.lat != null && p.lng != null).toList();
    if (located.isEmpty) return false;
    final radius = site.radiusM!;
    final outside = located.where((p) => distanceMeters(p.lat!, p.lng!, site.lat, site.lng) > radius).length;
    return outside * 2 > located.length;
  }

  static bool isInside(double lat, double lng, SiteArea site) =>
      site.radiusM == null || distanceMeters(lat, lng, site.lat, site.lng) <= site.radiusM!;

  /// گرد کردن فقط در نمایش (C04)؛ اینجا فقط برای مقایسه.
  static double clampPercent(double value) => math.max(0, math.min(100, value));
}
