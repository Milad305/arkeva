import 'package:flutter_test/flutter_test.dart';
import 'package:projeyar_field/core/l10n/fa_num.dart';
import 'package:projeyar_field/core/time/clock.dart';
import 'package:projeyar_field/features/auth/domain/value_objects/mobile_number.dart';

void main() {
  group('ارقام', () {
    test('toFaDigits و toLatinDigits', () {
      expect(toFaDigits('FR-1405-0012'), 'FR-۱۴۰۵-۰۰۱۲');
      expect(toLatinDigits('۷۲٫۵'), '72.5');
      expect(toLatinDigits('٧٢'), '72');
    });

    test('parseLocalizedNumber ارقام فارسی و لاتین را می‌پذیرد (F08 ۴.۲)', () {
      expect(parseLocalizedNumber('۷۲'), 72);
      expect(parseLocalizedNumber('2,400'), 2400);
      expect(parseLocalizedNumber('۱۲٫۵'), 12.5);
      expect(parseLocalizedNumber('abc'), isNull);
      expect(parseLocalizedNumber(''), isNull);
    });

    test('faNum با جداکنندهٔ هزارگان؛ گرد کردن فقط در نمایش', () {
      expect(faNum(2400), '۲٬۴۰۰');
      expect(faNum(58.04), '۵۸');
      expect(faNum(49.25), '۴۹٫۳');
      expect(faPercent(3), '۳٪');
    });
  });

  group('شمارهٔ همراه', () {
    test('نرمال‌سازی', () {
      expect(MobileNumber.normalize('۰۹۱۲۳۴۵۶۷۸۹'), '09123456789');
      expect(MobileNumber.normalize('+989123456789'), '09123456789');
      expect(MobileNumber.normalize('9123456789'), '09123456789');
      expect(MobileNumber.normalize('0912 345 6789'), '09123456789');
      expect(MobileNumber.normalize('0812345678'), isNull);
    });
  });

  group('تاریخ', () {
    test('شمسی', () {
      expect(JalaliFormat.date('2026-11-18'), '۲۷ آبان ۱۴۰۵');
      expect(JalaliFormat.numeric('2026-11-18'), '۱۴۰۵/۰۸/۲۷');
      expect(TehranTime.addDays('2026-11-18', -3), '2026-11-15');
    });
  });
}
