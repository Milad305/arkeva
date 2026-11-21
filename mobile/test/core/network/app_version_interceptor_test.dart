import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:projeyar_field/core/device/app_info.dart';
import 'package:projeyar_field/core/network/app_update_gate.dart';
import 'package:projeyar_field/core/network/interceptors.dart';

class _Info implements AppInfo {
  @override
  Future<String> version() async => '1.1.0+12';
}

void main() {
  test('F08 ۵.۳ — X-App-Version روی هر درخواست؛ ۴۲۶ دروازهٔ به‌روزرسانی را بالا می‌برد و «بررسی دوباره» پایین می‌آورد', () async {
    final gate = AppUpdateGate();
    final interceptor = AppVersionInterceptor(info: _Info(), gate: gate);
    final options = RequestOptions(path: '/field/sync');
    await interceptor.onRequest(options, RequestInterceptorHandler());
    expect(options.headers['X-App-Version'], '1.1.0+12');

    final changes = <void>[];
    final sub = gate.changes.listen(changes.add);
    final error = DioException(
      requestOptions: options,
      response: Response<Object?>(
        requestOptions: options,
        statusCode: 426,
        data: {'code': 'APP_VERSION_UNSUPPORTED', 'message': 'اپ را به‌روز کنید.', 'details': {'minVersion': '1.2.0'}, 'retryable': false},
      ),
    );
    // دروازه پیش از ادامهٔ خطا بالا می‌رود؛ ادامهٔ خطا در این تست بی گیرنده است
    await runZonedGuarded(() async => interceptor.onError(error, ErrorInterceptorHandler()), (_, _) {});
    expect((gate.required, gate.minVersion, gate.message), (true, '1.2.0', 'اپ را به‌روز کنید.'));
    gate.clear();
    expect(gate.required, isFalse);
    await Future<void>.delayed(Duration.zero);
    expect(changes, hasLength(2));
    await sub.cancel();
  });
}
