import 'package:injectable/injectable.dart';
import 'package:package_info_plus/package_info_plus.dart';

/// نسخهٔ اپ برای گزارش و ضربان (`appVersion`).
// ignore: one_member_abstracts — رابط برای تست
abstract interface class AppInfo {
  Future<String> version();
}

@LazySingleton(as: AppInfo)
class PackageAppInfo implements AppInfo {
  String? _cached;

  @override
  Future<String> version() async {
    if (_cached != null) return _cached!;
    final info = await PackageInfo.fromPlatform();
    return _cached = '${info.version}+${info.buildNumber}';
  }
}
