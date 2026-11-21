/// استثناهای لایهٔ داده. هرگز از data بیرون نمی‌روند؛ repository آن‌ها را به Failure تبدیل می‌کند.
sealed class DataException implements Exception {
  const DataException();
}

/// بدنهٔ خطای استاندارد بک‌اند: `{code, message(fa), details?, traceId, retryable}`.
final class ApiErrorBody {
  const ApiErrorBody({required this.code, required this.message, required this.retryable, this.details = const {}, this.traceId});

  final String code;
  final String message;
  final bool retryable;
  final Map<String, Object?> details;
  final String? traceId;

  static ApiErrorBody? tryParse(Object? data) {
    if (data is! Map) return null;
    final code = data['code'];
    final message = data['message'];
    if (code is! String || message is! String) return null;
    final details = data['details'];
    final traceId = data['traceId'];
    return ApiErrorBody(
      code: code,
      message: message,
      retryable: data['retryable'] == true,
      traceId: traceId is String ? traceId : null,
      details: details is Map ? details.cast<String, Object?>() : const {},
    );
  }
}

enum TransportError { noConnection, timeout, cancelled, badCertificate, unknown }

/// شکست HTTP: یا پاسخ خطای سرور، یا شکست انتقال.
final class ApiException extends DataException {
  const ApiException({this.statusCode, this.body, this.transport, this.retryAfter, this.traceId});

  final int? statusCode;
  final ApiErrorBody? body;
  final TransportError? transport;
  final Duration? retryAfter;
  final String? traceId;

  @override
  String toString() => 'ApiException($statusCode, ${body?.code ?? transport})';
}

/// پاسخ موفق با شکل نامنتظره.
final class MalformedResponseException extends DataException {
  const MalformedResponseException(this.reason);
  final String reason;

  @override
  String toString() => 'MalformedResponseException($reason)';
}

final class LocalStorageException extends DataException {
  const LocalStorageException(this.cause);
  final Object cause;

  @override
  String toString() => 'LocalStorageException($cause)';
}
