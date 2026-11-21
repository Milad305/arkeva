import 'package:projeyar_field/core/error/exceptions.dart';
import 'package:projeyar_field/core/error/failure.dart';

/// تنها نقطهٔ تبدیل استثنا به Failure (docs/rules/flutter-clean-bloc.md ۷).
abstract final class ErrorMapper {
  static Failure map(Object error) => switch (error) {
    final ApiException e => _api(e),
    MalformedResponseException() => const UnexpectedFailure(),
    LocalStorageException() => const StorageFailure(),
    _ => const UnexpectedFailure(),
  };

  static Failure _api(ApiException e) {
    switch (e.transport) {
      case TransportError.noConnection:
        return const NetworkFailure();
      case TransportError.timeout:
        return const TimeoutFailure();
      case TransportError.badCertificate:
        return const NetworkFailure(message: 'اتصال امن به سرور برقرار نشد. شبکه را عوض کنید یا با پشتیبانی تماس بگیرید.');
      case TransportError.cancelled:
      case TransportError.unknown:
      case null:
        break;
    }
    final status = e.statusCode;
    final body = e.body;
    final traceId = body?.traceId ?? e.traceId;
    if (status == null) return UnexpectedFailure(traceId: traceId);
    final message = body?.message;
    final code = body?.code;

    if (code == 'VALIDATION_FAILED' || status == 400) {
      return ValidationFailure(
        message: message ?? const ValidationFailure().message,
        traceId: traceId,
        fieldErrors: _fields(body?.details),
      );
    }
    switch (status) {
      case 401:
        return UnauthorizedFailure(code: code ?? 'AUTH_REQUIRED', message: message ?? const UnauthorizedFailure().message, traceId: traceId);
      case 403:
        return ForbiddenFailure(code: code ?? 'PERMISSION_DENIED', message: message ?? const ForbiddenFailure().message, traceId: traceId);
      case 404:
        return NotFoundFailure(code: code ?? 'NOT_FOUND', message: message ?? const NotFoundFailure().message, traceId: traceId);
      case 409:
        return ConflictFailure(
          code: code ?? 'CONFLICT',
          message: message ?? const ConflictFailure(code: 'CONFLICT').message,
          traceId: traceId,
          retryable: body?.retryable ?? false,
          details: body?.details ?? const {},
        );
      case 426:
        final min = body?.details['minVersion'];
        return UpdateRequiredFailure(
          message: message ?? const UpdateRequiredFailure().message,
          traceId: traceId,
          minVersion: min is String ? min : null,
        );
      case 429:
        return RateLimitedFailure(
          code: code ?? 'RATE_LIMITED',
          message: message ?? const RateLimitedFailure().message,
          traceId: traceId,
          retryAfter: e.retryAfter ?? _retryAfter(body?.details),
        );
    }
    if (status >= 500) {
      return ServerFailure(
        code: code ?? 'INTERNAL',
        message: message ?? const ServerFailure().message,
        traceId: traceId,
        retryable: body?.retryable ?? true,
      );
    }
    if (body != null) {
      return DomainRuleFailure(code: body.code, message: body.message, traceId: traceId, retryable: body.retryable, details: body.details);
    }
    return UnexpectedFailure(traceId: traceId);
  }

  /// `details.fields: [{field, message}]` (ValidationFailedError بک‌اند).
  static Map<String, String> _fields(Map<String, Object?>? details) {
    final fields = details?['fields'];
    if (fields is! List) return const {};
    final result = <String, String>{};
    for (final entry in fields) {
      if (entry is Map && entry['field'] is String && entry['message'] is String) {
        result[entry['field'] as String] = entry['message'] as String;
      }
    }
    return result;
  }

  static Duration? _retryAfter(Map<String, Object?>? details) {
    final sec = details?['retryAfterSec'];
    return sec is num ? Duration(seconds: sec.toInt()) : null;
  }
}
