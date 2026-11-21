import 'package:dio/dio.dart';
import 'package:projeyar_field/core/device/app_info.dart';
import 'package:projeyar_field/core/network/app_update_gate.dart';
import 'package:projeyar_field/core/network/token_store.dart';
import 'package:uuid/uuid.dart';

const _uuid = Uuid();

/// مسیرهایی که نه توکن می‌گیرند و نه تازه‌سازی را راه می‌اندازند.
const _publicPaths = ['/auth/app/request-code', '/auth/app/invite-code', '/auth/app/verify', '/auth/app/refresh', '/auth/app/logout'];

bool _isPublic(RequestOptions options) => _publicPaths.any(options.path.endsWith);

/// `X-Request-Id` برای پیگیری در لاگ سرور.
class RequestIdInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    options.headers['X-Request-Id'] = _uuid.v4();
    handler.next(options);
  }
}

/// `X-App-Version` روی هر درخواست؛ پاسخ ۴۲۶ `APP_VERSION_UNSUPPORTED` دروازهٔ به‌روزرسانی را بالا می‌برد (F08 ۵.۳).
class AppVersionInterceptor extends Interceptor {
  AppVersionInterceptor({required AppInfo info, required AppUpdateGate gate}) : _info = info, _gate = gate;

  static const header = 'X-App-Version';

  final AppInfo _info;
  final AppUpdateGate _gate;

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    try {
      options.headers[header] = await _info.version();
    } on Object {
      // نسخهٔ ناخوانا: بی سرآیند؛ سرور ترافیک اپ بی نسخه را رد می‌کند و صفحهٔ به‌روزرسانی می‌آید
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final response = err.response;
    if (response?.statusCode == 426) {
      final body = response?.data;
      final details = body is Map ? body['details'] : null;
      final min = details is Map ? details['minVersion'] : null;
      final message = body is Map ? body['message'] : null;
      _gate.require(minVersion: min is String ? min : null, message: message is String ? message : null);
    }
    handler.next(err);
  }
}

/// `Idempotency-Key` برای POST و PUT (CLAUDE.md ۴). اگر فراخواننده کلید داده (UUID موجودیت؛ D10)، همان می‌ماند.
class IdempotencyInterceptor extends Interceptor {
  static const header = 'Idempotency-Key';

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final method = options.method.toUpperCase();
    if ((method == 'POST' || method == 'PUT') && !_isPublic(options) && !options.headers.containsKey(header)) {
      options.headers[header] = _uuid.v4();
    }
    handler.next(options);
  }
}

/// توکن Bearer و تازه‌سازی تک‌پرواز روی ۴۰۱ (docs/rules/flutter-clean-bloc.md ۷.۳).
/// `QueuedInterceptor` درخواست‌ها را پشت هم نگه می‌دارد تا فقط یک تازه‌سازی هم‌زمان برود.
class AuthInterceptor extends QueuedInterceptor {
  AuthInterceptor({required TokenStore tokens, required Dio refreshClient, required Dio retryClient})
    : _tokens = tokens,
      _refreshClient = refreshClient,
      _retryClient = retryClient;

  final TokenStore _tokens;

  /// Dio بدون interceptor برای `/auth/app/refresh`.
  final Dio _refreshClient;

  /// Dio اصلی برای تکرار درخواست پس از تازه‌سازی.
  final Dio _retryClient;

  static const _retried = 'auth.retried';

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    if (_isPublic(options)) return handler.next(options);
    if (_tokens.accessToken == null || _tokens.accessExpired) {
      await _refresh();
    }
    final token = _tokens.accessToken;
    if (token != null) options.headers['Authorization'] = 'Bearer $token';
    handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final options = err.requestOptions;
    if (err.response?.statusCode != 401 || _isPublic(options) || options.extra[_retried] == true) {
      return handler.next(err);
    }
    final refreshed = await _refresh(force: true);
    if (!refreshed) return handler.next(err);
    try {
      options
        ..extra[_retried] = true
        ..headers['Authorization'] = 'Bearer ${_tokens.accessToken}';
      final response = await _retryClient.fetch<Object?>(options);
      handler.resolve(response);
    } on DioException catch (retryError) {
      handler.next(retryError);
    }
  }

  /// true اگر توکن دسترسی معتبر است. شکست قطعی (۴۰۱ تازه‌سازی) نشست را تمام می‌کند؛ نبود شبکه نه.
  Future<bool> _refresh({bool force = false}) async {
    if (!force && _tokens.accessToken != null && !_tokens.accessExpired) return true;
    final refreshToken = await _tokens.refreshToken();
    if (refreshToken == null) return false;
    try {
      final response = await _refreshClient.post<Map<String, Object?>>('/auth/app/refresh', data: {'refreshToken': refreshToken});
      final data = response.data?['data'];
      if (data is! Map) return false;
      final session = data['session'];
      if (session is! Map || session['accessToken'] is! String) return false;
      await _tokens.save(
        accessToken: session['accessToken']! as String,
        expiresInSec: (session['expiresInSec'] as num?)?.toInt() ?? 900,
        refreshToken: data['refreshToken'] as String?,
      );
      return true;
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      if (status == 401 || status == 403) {
        await _tokens.clear();
        _tokens.signalExpired();
      }
      return false;
    }
  }
}
