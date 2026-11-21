import 'package:formz/formz.dart';
import 'package:projeyar_field/core/l10n/fa_num.dart';

// ورودی‌های مشترک فرم‌ها (M06، M11، M13؛ rules ۱۱).

enum NumberError { required, invalid, negative, outOfRange, notInteger }

extension NumberErrorMessage on NumberError {
  String message({String? range}) => switch (this) {
    NumberError.required => 'این مقدار را وارد کنید.',
    NumberError.invalid => 'عدد را درست وارد کنید؛ ارقام فارسی و لاتین هر دو پذیرفته است.',
    NumberError.negative => 'مقدار نمی‌تواند منفی باشد.',
    NumberError.outOfRange => 'عدد باید ${range ?? 'در بازهٔ مجاز'} باشد.',
    NumberError.notInteger => 'عدد صحیح وارد کنید.',
  };
}

/// مقدار انجام‌شدهٔ امروز (روش مقداری).
class QuantityInput extends FormzInput<String, NumberError> {
  const QuantityInput.pure([super.value = '']) : super.pure();
  const QuantityInput.dirty([super.value = '']) : super.dirty();

  double? get number => parseLocalizedNumber(value)?.toDouble();

  @override
  NumberError? validator(String value) {
    if (value.trim().isEmpty) return NumberError.required;
    final n = parseLocalizedNumber(value);
    if (n == null) return NumberError.invalid;
    if (n < 0) return NumberError.negative;
    return null;
  }
}

/// مقدار اختیاری غیرمنفی (مقدار کنار درصد).
class OptionalQuantityInput extends FormzInput<String, NumberError> {
  const OptionalQuantityInput.pure([super.value = '']) : super.pure();
  const OptionalQuantityInput.dirty([super.value = '']) : super.dirty();

  double? get number => parseLocalizedNumber(value)?.toDouble();

  @override
  NumberError? validator(String value) {
    if (value.trim().isEmpty) return null;
    final n = parseLocalizedNumber(value);
    if (n == null) return NumberError.invalid;
    if (n < 0) return NumberError.negative;
    return null;
  }
}

/// درصد تجمعی ۰ تا ۱۰۰.
class PercentInput extends FormzInput<String, NumberError> {
  const PercentInput.pure([super.value = '']) : super.pure();
  const PercentInput.dirty([super.value = '']) : super.dirty();

  double? get number => parseLocalizedNumber(value)?.toDouble();

  @override
  NumberError? validator(String value) {
    if (value.trim().isEmpty) return NumberError.required;
    final n = parseLocalizedNumber(value);
    if (n == null) return NumberError.invalid;
    if (n < 0 || n > 100) return NumberError.outOfRange;
    return null;
  }
}

/// عدد صحیح اختیاری در بازه: نفرات ۰ تا ۱۰٬۰۰۰، دما ۶۰- تا ۷۰.
class BoundedIntInput extends FormzInput<String, NumberError> {
  const BoundedIntInput.pure({required this.min, required this.max, String value = ''}) : super.pure(value);
  const BoundedIntInput.dirty({required this.min, required this.max, String value = ''}) : super.dirty(value);

  final int min;
  final int max;

  int? get number => parseLocalizedNumber(value.replaceAll('−', '-'))?.toInt();

  BoundedIntInput change(String value) => BoundedIntInput.dirty(min: min, max: max, value: value);

  String get rangeText => '${toFaDigits(min)} تا ${faNum(max, maxFractionDigits: 0)}';

  @override
  NumberError? validator(String value) {
    if (value.trim().isEmpty) return null;
    final n = parseLocalizedNumber(value.replaceAll('−', '-'));
    if (n == null) return NumberError.invalid;
    if (n != n.roundToDouble()) return NumberError.notInteger;
    if (n < min || n > max) return NumberError.outOfRange;
    return null;
  }
}

enum TextError { tooLong, required }

/// متن با سقف طول (توضیح ۲٬۰۰۰، عنوان ۲۰۰، شرح ۴٬۰۰۰).
class LimitedText extends FormzInput<String, TextError> {
  const LimitedText.pure({required this.maxLength, this.isRequired = false, String value = ''}) : super.pure(value);
  const LimitedText.dirty({required this.maxLength, this.isRequired = false, String value = ''}) : super.dirty(value);

  final int maxLength;
  final bool isRequired;

  LimitedText change(String value) => LimitedText.dirty(maxLength: maxLength, isRequired: isRequired, value: value);

  String? get trimmedOrNull => value.trim().isEmpty ? null : value.trim();

  String? messageOf(TextError? e) => switch (e) {
    TextError.tooLong => 'حداکثر ${faNum(maxLength, maxFractionDigits: 0)} نویسه.',
    TextError.required => 'این بخش را پر کنید.',
    null => null,
  };

  @override
  TextError? validator(String value) {
    if (isRequired && value.trim().isEmpty) return TextError.required;
    if (value.trim().length > maxLength) return TextError.tooLong;
    return null;
  }
}
