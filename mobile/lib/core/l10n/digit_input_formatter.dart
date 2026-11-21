import 'package:flutter/services.dart';
import 'package:projeyar_field/core/l10n/fa_num.dart';

/// ورودی عددی: ارقام فارسی، عربی و لاتین را می‌پذیرد و همه را فارسی نمایش می‌دهد (F08 ۴.۲).
class LocalizedDigitsFormatter extends TextInputFormatter {
  const LocalizedDigitsFormatter({this.allowDecimal = false, this.maxLength});

  final bool allowDecimal;
  final int? maxLength;

  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final latin = toLatinDigits(newValue.text);
    final pattern = allowDecimal ? RegExp('[^0-9.]') : RegExp('[^0-9]');
    var cleaned = latin.replaceAll(pattern, '');
    if (allowDecimal) {
      final dot = cleaned.indexOf('.');
      if (dot >= 0) cleaned = cleaned.substring(0, dot + 1) + cleaned.substring(dot + 1).replaceAll('.', '');
    }
    if (maxLength != null && cleaned.length > maxLength!) return oldValue;
    final display = toFaDigits(cleaned).replaceAll('.', '٫');
    return TextEditingValue(text: display, selection: TextSelection.collapsed(offset: display.length));
  }
}
