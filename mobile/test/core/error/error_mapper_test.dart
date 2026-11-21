import 'package:flutter_test/flutter_test.dart';
import 'package:projeyar_field/core/error/error_mapper.dart';
import 'package:projeyar_field/core/error/exceptions.dart';
import 'package:projeyar_field/core/error/failure.dart';

ApiException _http(int status, {String? code, String message = 'پیام سرور', Map<String, Object?> details = const {}, bool retryable = false}) => ApiException(
  statusCode: status,
  body: code == null ? null : ApiErrorBody(code: code, message: message, retryable: retryable, details: details, traceId: 'trace-1'),
);

void main() {
  group('ErrorMapper — جدول بخش ۷ قواعد', () {
    test('بی‌اتصال ← NetworkFailure قابل تکرار', () {
      final f = ErrorMapper.map(const ApiException(transport: TransportError.noConnection));
      expect(f, isA<NetworkFailure>());
      expect(f.retryable, isTrue);
    });

    test('F08 ۵.۳ — ۴۲۶ APP_VERSION_UNSUPPORTED ← UpdateRequiredFailure با حداقل نسخه، بی تکرار', () {
      final f = ErrorMapper.map(_http(426, code: 'APP_VERSION_UNSUPPORTED', message: 'اپ را به‌روز کنید.', details: {'minVersion': '1.2.0'}));
      expect(f, isA<UpdateRequiredFailure>());
      expect((f as UpdateRequiredFailure).minVersion, '1.2.0');
      expect(f.message, 'اپ را به‌روز کنید.');
      expect(f.retryable, isFalse);
    });

    test('مهلت ← TimeoutFailure', () {
      expect(ErrorMapper.map(const ApiException(transport: TransportError.timeout)), isA<TimeoutFailure>());
    });

    test('۴۲۲ VALIDATION_FAILED ← خطای هر فیلد', () {
      final f = ErrorMapper.map(
        _http(
          422,
          code: 'VALIDATION_FAILED',
          details: {
            'fields': [
              {'field': 'mobile', 'message': 'شمارهٔ همراه را درست وارد کنید.'},
            ],
          },
        ),
      );
      expect(f, isA<ValidationFailure>());
      expect((f as ValidationFailure).fieldErrors['mobile'], 'شمارهٔ همراه را درست وارد کنید.');
      expect(f.traceId, 'trace-1');
    });

    test('۴۰۱ ← UnauthorizedFailure با کد سرور', () {
      final f = ErrorMapper.map(_http(401, code: 'OTP_INVALID', message: 'کد درست نیست.'));
      expect(f, isA<UnauthorizedFailure>());
      expect(f.code, 'OTP_INVALID');
      expect(f.message, 'کد درست نیست.');
    });

    test('۴۰۳ و ۴۰۴', () {
      expect(ErrorMapper.map(_http(403, code: 'PERMISSION_DENIED')), isA<ForbiddenFailure>());
      expect(ErrorMapper.map(_http(404, code: 'PROJECT_NOT_FOUND')), isA<NotFoundFailure>());
    });

    test('۴۰۹ ← ConflictFailure با جزئیات', () {
      final f = ErrorMapper.map(
        _http(
          409,
          code: 'UPLOAD_INCOMPLETE',
          details: {
            'missingParts': [2, 3],
          },
        ),
      );
      expect(f, isA<ConflictFailure>());
      expect((f as ConflictFailure).details['missingParts'], [2, 3]);
    });

    test('۴۲۹ ← Retry-After از سرآیند یا جزئیات', () {
      final fromHeader = ErrorMapper.map(
        const ApiException(statusCode: 429, retryAfter: Duration(seconds: 30)),
      );
      expect((fromHeader as RateLimitedFailure).retryAfter, const Duration(seconds: 30));
      final fromBody = ErrorMapper.map(_http(429, code: 'RATE_LIMITED', details: {'retryAfterSec': 3600}));
      expect((fromBody as RateLimitedFailure).retryAfter, const Duration(hours: 1));
    });

    test('۵xx ← ServerFailure قابل تکرار', () {
      final f = ErrorMapper.map(_http(500, code: 'INTERNAL', retryable: true));
      expect(f, isA<ServerFailure>());
      expect(f.retryable, isTrue);
    });

    test('۴۲۲ دامنه‌ای ← DomainRuleFailure با پیام سرور', () {
      final f = ErrorMapper.map(_http(422, code: 'UPLOAD_HASH_MISMATCH', message: 'هش یکی نیست.', retryable: true));
      expect(f, isA<DomainRuleFailure>());
      expect(f.message, 'هش یکی نیست.');
      expect(f.retryable, isTrue);
    });

    test('بدنهٔ ناشناخته ← UnexpectedFailure، بدون متن استثنا', () {
      final f = ErrorMapper.map(StateError('boom'));
      expect(f, isA<UnexpectedFailure>());
      expect(f.message.contains('boom'), isFalse);
    });
  });
}
