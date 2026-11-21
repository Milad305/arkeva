import 'package:equatable/equatable.dart';

/// خطای دامنه. پیام فارسی، بدون سرزنش و با یک راه ادامه (CLAUDE.md ۵).
/// متن‌های پیش‌فرض اینجا؛ پیام سرور اگر باشد جایگزین می‌شود.
sealed class Failure extends Equatable {
  const Failure({required this.code, required this.message, this.traceId, this.retryable = false});

  final String code;
  final String message;
  final String? traceId;
  final bool retryable;

  @override
  List<Object?> get props => [runtimeType, code, message, traceId, retryable];
}

final class NetworkFailure extends Failure {
  const NetworkFailure({
    super.message = 'اتصال به اینترنت برقرار نیست. پس از وصل شدن دوباره امتحان کنید.',
  }) : super(code: 'NETWORK', retryable: true);
}

final class TimeoutFailure extends Failure {
  const TimeoutFailure({
    super.message = 'پاسخ سرور طول کشید. چند لحظه بعد دوباره امتحان کنید.',
  }) : super(code: 'TIMEOUT', retryable: true);
}

final class UnauthorizedFailure extends Failure {
  const UnauthorizedFailure({
    super.code = 'AUTH_REQUIRED',
    super.message = 'نشست شما تمام شده است. دوباره وارد شوید؛ گزارش‌های ذخیره‌شده می‌مانند.',
    super.traceId,
  });
}

final class ForbiddenFailure extends Failure {
  const ForbiddenFailure({
    super.code = 'PERMISSION_DENIED',
    super.message = 'برای این کار دسترسی ندارید. اگر لازم است با مدیر پروژه تماس بگیرید.',
    super.traceId,
  });
}

final class NotFoundFailure extends Failure {
  const NotFoundFailure({
    super.code = 'NOT_FOUND',
    super.message = 'مورد خواسته‌شده پیدا نشد. فهرست را تازه کنید.',
    super.traceId,
  });
}

final class ConflictFailure extends Failure {
  const ConflictFailure({
    required super.code,
    super.message = 'این مورد هم‌زمان تغییر کرده است. فهرست را تازه کنید.',
    super.traceId,
    super.retryable,
    this.details = const {},
  });

  final Map<String, Object?> details;

  @override
  List<Object?> get props => [...super.props, details];
}

/// خطای اعتبارسنجی؛ `fieldErrors` نام فیلد ← پیام سرور.
final class ValidationFailure extends Failure {
  const ValidationFailure({
    super.code = 'VALIDATION_FAILED',
    super.message = 'چند مورد نیاز به اصلاح دارد.',
    super.traceId,
    this.fieldErrors = const {},
  });

  final Map<String, String> fieldErrors;

  @override
  List<Object?> get props => [...super.props, fieldErrors];
}

final class RateLimitedFailure extends Failure {
  const RateLimitedFailure({
    super.code = 'RATE_LIMITED',
    super.message = 'تعداد درخواست‌ها زیاد بود. کمی بعد دوباره امتحان کنید.',
    super.traceId,
    this.retryAfter,
  }) : super(retryable: true);

  final Duration? retryAfter;

  @override
  List<Object?> get props => [...super.props, retryAfter];
}

final class ServerFailure extends Failure {
  const ServerFailure({
    super.code = 'INTERNAL',
    super.message = 'سرور موقتاً پاسخ نمی‌دهد. کمی بعد دوباره امتحان کنید.',
    super.traceId,
    super.retryable = true,
  });
}

/// خطای سرور با کد دامنه‌ای که در دسته‌های بالا نیست (مثل ۴۲۲ غیر اعتبارسنجی).
final class DomainRuleFailure extends Failure {
  const DomainRuleFailure({
    required super.code,
    required super.message,
    super.traceId,
    super.retryable,
    this.details = const {},
  });

  final Map<String, Object?> details;

  @override
  List<Object?> get props => [...super.props, details];
}

/// نسخهٔ اپ کمتر از حداقل سرور (۴۲۶ `APP_VERSION_UNSUPPORTED`؛ F08 ۵.۳). صف دست نمی‌خورد؛ صفحهٔ به‌روزرسانی اجباری.
final class UpdateRequiredFailure extends Failure {
  const UpdateRequiredFailure({
    super.message = 'این نسخهٔ اپ دیگر پشتیبانی نمی‌شود. اپ را به‌روز کنید؛ گزارش‌های در صف حفظ می‌شوند.',
    super.traceId,
    this.minVersion,
  }) : super(code: 'APP_VERSION_UNSUPPORTED');

  final String? minVersion;

  @override
  List<Object?> get props => [...super.props, minVersion];
}

final class StorageFailure extends Failure {
  const StorageFailure({
    super.message = 'ذخیره در گوشی انجام نشد. فضای خالی گوشی را بررسی کنید.',
  }) : super(code: 'LOCAL_STORAGE');
}

final class PermissionFailure extends Failure {
  const PermissionFailure({required super.message, super.code = 'DEVICE_PERMISSION'});
}

final class UnexpectedFailure extends Failure {
  const UnexpectedFailure({
    super.message = 'مشکلی پیش آمد. دوباره امتحان کنید.',
    super.traceId,
  }) : super(code: 'UNEXPECTED');
}
