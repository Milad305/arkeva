import 'dart:async';

import 'package:geolocator/geolocator.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/device/location.dart';
import 'package:projeyar_field/core/error/failure.dart';
import 'package:projeyar_field/core/result/result.dart';

@LazySingleton(as: LocationService)
class GeolocatorLocation implements LocationService {
  @override
  Future<Result<GeoFix>> current() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        return const Err(PermissionFailure(code: 'LOCATION_OFF', message: 'مکان‌یاب گوشی خاموش است. آن را روشن کنید تا موقعیت ثبت شود.'));
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        return const Err(PermissionFailure(message: 'اجازهٔ مکان داده نشده است. از تنظیمات گوشی اجازه دهید.'));
      }
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(timeLimit: Duration(seconds: 20)),
      );
      return Ok(GeoFix(lat: position.latitude, lng: position.longitude, accuracyM: position.accuracy, mocked: position.isMocked));
    } on TimeoutException {
      // آخرین موقعیت شناخته‌شده بهتر از هیچ؛ زیرزمین بی‌آنتن (F08 ۱)
      final last = await Geolocator.getLastKnownPosition();
      if (last != null) return Ok(GeoFix(lat: last.latitude, lng: last.longitude, accuracyM: last.accuracy, mocked: last.isMocked));
      return const Err(PermissionFailure(code: 'LOCATION_TIMEOUT', message: 'موقعیت پیدا نشد. کمی در فضای باز صبر کنید و دوباره امتحان کنید.'));
    } on Object {
      return const Err(PermissionFailure(code: 'LOCATION_ERROR', message: 'موقعیت خوانده نشد. دوباره امتحان کنید.'));
    }
  }
}
