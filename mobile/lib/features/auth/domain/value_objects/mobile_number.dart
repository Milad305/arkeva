import 'package:projeyar_field/core/l10n/fa_num.dart';

/// قاعدهٔ شمارهٔ همراه ایران؛ پذیرش ارقام فارسی و پیشوند +98 یا 0098.
abstract final class MobileNumber {
  static final _pattern = RegExp(r'^09\d{9}$');

  /// شکل استاندارد ۰۹xxxxxxxxx (لاتین) یا null اگر نامعتبر.
  static String? normalize(String input) {
    var digits = toLatinDigits(input).replaceAll(RegExp(r'[\s\-()]'), '');
    if (digits.startsWith('+98')) {
      digits = '0${digits.substring(3)}';
    } else if (digits.startsWith('0098')) {
      digits = '0${digits.substring(4)}';
    } else if (digits.startsWith('98') && digits.length == 12) {
      digits = '0${digits.substring(2)}';
    } else if (digits.startsWith('9') && digits.length == 10) {
      digits = '0$digits';
    }
    return _pattern.hasMatch(digits) ? digits : null;
  }
}
