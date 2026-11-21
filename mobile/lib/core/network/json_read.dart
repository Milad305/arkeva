// خواندن مقادیر JSON بک‌اند که ممکن است عدد یا رشتهٔ عددی باشند (ستون‌های numeric در PostgreSQL).
// فقط در لایهٔ داده و حاشیه‌نویسی `@JsonKey(fromJson: ...)` به کار می‌رود.

double? readNum(Object? value) => switch (value) {
  final num n => n.toDouble(),
  final String s => double.tryParse(s),
  _ => null,
};

double readNumOr0(Object? value) => readNum(value) ?? 0;

int? readInt(Object? value) => readNum(value)?.round();
