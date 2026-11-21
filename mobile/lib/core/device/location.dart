import 'dart:math' as math;

import 'package:equatable/equatable.dart';
import 'package:projeyar_field/core/result/result.dart';

/// موقعیت لحظه‌ای با دقت و نشانهٔ موقعیت جعلی (AC-FA-05).
final class GeoFix extends Equatable {
  const GeoFix({required this.lat, required this.lng, required this.accuracyM, required this.mocked});

  final double lat;
  final double lng;
  final double accuracyM;
  final bool mocked;

  @override
  List<Object?> get props => [lat, lng, accuracyM, mocked];
}

/// مکان گوشی. پیاده‌سازی با geolocator در `geolocator_location.dart`.
// ignore: one_member_abstracts — رابط برای تست
abstract interface class LocationService {
  /// موقعیت فعلی؛ بی مجوز یا خاموش ← `PermissionFailure`.
  Future<Result<GeoFix>> current();
}

/// فاصلهٔ دو نقطه به متر (هاورسین).
double distanceMeters(double lat1, double lng1, double lat2, double lng2) {
  const earth = 6371000.0;
  double rad(double d) => d * math.pi / 180;
  final dLat = rad(lat2 - lat1);
  final dLng = rad(lng2 - lng1);
  final a = math.pow(math.sin(dLat / 2), 2) + math.cos(rad(lat1)) * math.cos(rad(lat2)) * math.pow(math.sin(dLng / 2), 2);
  return 2 * earth * math.asin(math.sqrt(a));
}
