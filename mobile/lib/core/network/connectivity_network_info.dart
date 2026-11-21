import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/network/network_info.dart';

@LazySingleton(as: NetworkInfo)
class ConnectivityNetworkInfo implements NetworkInfo {
  ConnectivityNetworkInfo(this._connectivity);

  final Connectivity _connectivity;

  @override
  Future<NetworkKind> current() async => kindOf(await _connectivity.checkConnectivity());

  @override
  Stream<NetworkKind> get changes => _connectivity.onConnectivityChanged.map(kindOf).distinct();

  /// Wi‑Fi و اترنت «بی‌هزینه»اند؛ بقیهٔ اتصال‌ها داده همراه.
  static NetworkKind kindOf(List<ConnectivityResult> results) {
    if (results.contains(ConnectivityResult.wifi) || results.contains(ConnectivityResult.ethernet)) return NetworkKind.wifi;
    if (results.any((r) => r != ConnectivityResult.none)) return NetworkKind.mobile;
    return NetworkKind.none;
  }
}
