import 'dart:io';
import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'package:projeyar_field/core/config/app_config.dart';
import 'package:projeyar_field/core/device/app_info.dart';
import 'package:projeyar_field/core/error/exceptions.dart';
import 'package:projeyar_field/core/network/app_update_gate.dart';
import 'package:projeyar_field/core/network/interceptors.dart';
import 'package:projeyar_field/core/network/token_store.dart';
import 'package:talker_dio_logger/talker_dio_logger.dart';
import 'package:talker_flutter/talker_flutter.dart';

typedef Json = Map<String, Object?>;

/// تنها درگاه HTTP اپ. پاسخ `{success, data}` را باز می‌کند و هر شکست را `ApiException` می‌کند.
class ApiClient {
  ApiClient({
    required AppConfig config,
    required TokenStore tokens,
    required Talker talker,
    required AppInfo appInfo,
    required AppUpdateGate updateGate,
  }) {
    final base = BaseOptions(
      baseUrl: config.apiV1,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      sendTimeout: const Duration(seconds: 60),
      headers: {'Accept': 'application/json', 'Accept-Language': 'fa'},
    );
    final refreshClient = Dio(base);
    _dio = Dio(base);
    // تازه‌سازی هم مسیر اپ است و نسخه را می‌خواهد (F08 ۵.۳)
    refreshClient.interceptors.add(AppVersionInterceptor(info: appInfo, gate: updateGate));
    _pin(refreshClient, config);
    _pin(_dio, config);
    _dio.interceptors.addAll([
      RequestIdInterceptor(),
      AppVersionInterceptor(info: appInfo, gate: updateGate),
      IdempotencyInterceptor(),
      AuthInterceptor(tokens: tokens, refreshClient: refreshClient, retryClient: _dio),
      if (!config.isRelease)
        TalkerDioLogger(
          talker: talker,
          settings: const TalkerDioLoggerSettings(
            printRequestData: false,
            printResponseData: false,
            hiddenHeaders: {'authorization', 'idempotency-key'},
          ),
        ),
    ]);
  }

  late final Dio _dio;

  Future<Object?> get(String path, {Map<String, Object?>? query}) =>
      _send(() => _dio.get<Object?>(path, queryParameters: query));

  Future<Object?> post(String path, {Object? body, String? idempotencyKey}) =>
      _send(() => _dio.post<Object?>(path, data: body, options: _idem(idempotencyKey)));

  Future<Object?> put(String path, {Object? body, String? idempotencyKey}) =>
      _send(() => _dio.put<Object?>(path, data: body, options: _idem(idempotencyKey)));

  /// بدنهٔ خام `application/octet-stream` (پارچهٔ بارگذاری).
  Future<Object?> putBytes(String path, Uint8List bytes) => _send(
    () => _dio.put<Object?>(
      path,
      data: Stream<List<int>>.value(bytes),
      options: Options(contentType: 'application/octet-stream', headers: {Headers.contentLengthHeader: bytes.length}),
    ),
  );

  /// خواندن `data` به‌شکل شیء JSON.
  static Json asJson(Object? data) {
    if (data is Map<String, Object?>) return data;
    if (data is Map) return data.cast<String, Object?>();
    throw MalformedResponseException('expected object, got ${data.runtimeType}');
  }

  Options? _idem(String? key) => key == null ? null : Options(headers: {IdempotencyInterceptor.header: key});

  Future<Object?> _send(Future<Response<Object?>> Function() request) async {
    try {
      final response = await request();
      final body = response.data;
      if (body is Map && body['success'] == true) return body['data'];
      // ۲۰۴ (خروج) بدنه ندارد
      if (body == null || body == '') return null;
      throw const MalformedResponseException('missing envelope');
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  static ApiException _toApiException(DioException e) {
    final response = e.response;
    final traceId = response?.headers.value('x-trace-id');
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.transformTimeout:
        return ApiException(transport: TransportError.timeout, traceId: traceId);
      case DioExceptionType.connectionError:
        return ApiException(transport: TransportError.noConnection, traceId: traceId);
      case DioExceptionType.badCertificate:
        return ApiException(transport: TransportError.badCertificate, traceId: traceId);
      case DioExceptionType.cancel:
        return ApiException(transport: TransportError.cancelled, traceId: traceId);
      case DioExceptionType.unknown:
        if (e.error is SocketException || e.error is HttpException) {
          return ApiException(transport: TransportError.noConnection, traceId: traceId);
        }
        if (response == null) return ApiException(transport: TransportError.unknown, traceId: traceId);
      case DioExceptionType.badResponse:
        break;
    }
    final retryAfter = int.tryParse(response?.headers.value('retry-after') ?? '');
    return ApiException(
      statusCode: response?.statusCode,
      body: ApiErrorBody.tryParse(response?.data),
      traceId: traceId,
      retryAfter: retryAfter == null ? null : Duration(seconds: retryAfter),
    );
  }

  /// pinning اختیاری گواهی برگ با SHA-256 (docs/rules/flutter-clean-bloc.md ۸.۴).
  static void _pin(Dio dio, AppConfig config) {
    final pin = config.certSha256;
    if (pin == null) return;
    dio.httpClientAdapter = IOHttpClientAdapter(
      validateCertificate: (cert, host, port) => cert != null && sha256.convert(cert.der).toString() == pin,
    );
  }
}
