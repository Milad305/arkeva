import 'package:intl/intl.dart';

/// ارقام فارسی فقط از این توابع (CLAUDE.md ۵).
const _fa = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const _ar = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/// رقم لاتین ← فارسی؛ بقیهٔ نویسه‌ها دست‌نخورده.
String toFaDigits(Object? value) {
  final text = '$value';
  final buffer = StringBuffer();
  for (final unit in text.runes) {
    final c = String.fromCharCode(unit);
    final d = int.tryParse(c);
    buffer.write(d != null && c.codeUnitAt(0) < 128 ? _fa[d] : c);
  }
  return buffer.toString();
}

/// رقم فارسی و عربی ← لاتین؛ جداکنندهٔ اعشار فارسی «٫» و «,» ← «.»، جداکنندهٔ هزارگان حذف.
String toLatinDigits(String text) {
  var result = text;
  for (var i = 0; i < 10; i++) {
    result = result.replaceAll(_fa[i], '$i').replaceAll(_ar[i], '$i');
  }
  return result.replaceAll('٫', '.').replaceAll('٬', '').replaceAll('،', '');
}

/// عدد ورودی کاربر با ارقام فارسی، عربی یا لاتین (F08 ۴.۲). نامعتبر ← null.
num? parseLocalizedNumber(String input) {
  final normalized = toLatinDigits(input.trim()).replaceAll(',', '');
  if (normalized.isEmpty) return null;
  return num.tryParse(normalized);
}

final _grouped = NumberFormat.decimalPattern('en_US');

/// عدد با جداکنندهٔ هزارگان و ارقام فارسی: ۲٬۴۰۰ یا ۱۲٫۵.
/// گرد کردن فقط در نمایش (C04).
String faNum(num value, {int maxFractionDigits = 1}) {
  final rounded = maxFractionDigits == 0 ? value.round() : value;
  final formatter = NumberFormat.decimalPattern('en_US')
    ..minimumFractionDigits = 0
    ..maximumFractionDigits = maxFractionDigits;
  final text = (maxFractionDigits == 0 ? _grouped.format(rounded) : formatter.format(rounded)).replaceAll(',', '٬').replaceAll('.', '٫');
  return toFaDigits(text);
}

/// درصد: «۵۸٪».
String faPercent(num value, {int maxFractionDigits = 1}) => '${faNum(value, maxFractionDigits: maxFractionDigits)}٪';

/// ماسک شمارهٔ همراه برای لاگ و نمایش: ۰۹۱۲***۶۷۸۹.
String maskMobile(String mobile) {
  final digits = toLatinDigits(mobile);
  if (digits.length < 8) return toFaDigits(digits);
  return toFaDigits('${digits.substring(0, 4)}***${digits.substring(digits.length - 4)}');
}

/// حجم بایت: «۱٫۲ مگابایت».
String faBytes(int bytes) {
  if (bytes < 1024) return '${faNum(bytes, maxFractionDigits: 0)} بایت';
  if (bytes < 1024 * 1024) return '${faNum(bytes / 1024)} کیلوبایت';
  return '${faNum(bytes / (1024 * 1024))} مگابایت';
}
