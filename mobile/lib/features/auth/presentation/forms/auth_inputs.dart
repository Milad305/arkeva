import 'package:formz/formz.dart';
import 'package:projeyar_field/core/l10n/fa_num.dart';
import 'package:projeyar_field/features/auth/domain/value_objects/mobile_number.dart';

enum MobileError {
  empty,
  invalid;

  String get message => switch (this) {
    MobileError.empty => 'شمارهٔ همراه را وارد کنید.',
    MobileError.invalid => 'شمارهٔ همراه ۱۱ رقم است و با ۰۹ شروع می‌شود؛ مثل ۰۹۱۲۳۴۵۶۷۸۹.',
  };
}

final class MobileInput extends FormzInput<String, MobileError> {
  const MobileInput.pure() : super.pure('');
  const MobileInput.dirty([super.value = '']) : super.dirty();

  @override
  MobileError? validator(String value) {
    if (value.trim().isEmpty) return MobileError.empty;
    return MobileNumber.normalize(value) == null ? MobileError.invalid : null;
  }
}

enum OtpCodeError {
  empty,
  invalid;

  String get message => switch (this) {
    OtpCodeError.empty => 'کد پیامک را وارد کنید.',
    OtpCodeError.invalid => 'کد پنج‌رقمی پیامک را کامل وارد کنید.',
  };
}

final class OtpCodeInput extends FormzInput<String, OtpCodeError> {
  const OtpCodeInput.pure({this.length = 5}) : super.pure('');
  const OtpCodeInput.dirty(super.value, {this.length = 5}) : super.dirty();

  final int length;

  /// ارقام لاتین برای ارسال.
  String get normalized => toLatinDigits(value).replaceAll(RegExp(r'\D'), '');

  @override
  OtpCodeError? validator(String value) {
    final digits = toLatinDigits(value).replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty) return OtpCodeError.empty;
    return digits.length == length ? null : OtpCodeError.invalid;
  }
}
