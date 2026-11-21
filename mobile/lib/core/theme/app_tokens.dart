import 'package:flutter/material.dart';

/// رنگ‌ها و اندازه‌ها از `design/ui/tokens.css` — منبع یگانه؛ عدد خام در ویجت ممنوع.
abstract final class AppColors {
  static const primary100 = Color(0xFFE5EBF3);
  static const primary300 = Color(0xFF8AA2C2);
  static const primary500 = Color(0xFF2C4A73);
  static const primary700 = Color(0xFF1A3354);
  static const primary900 = Color(0xFF0E1E38);
  static const accent100 = Color(0xFFFCEAD9);
  static const accent500 = Color(0xFFE07A2C);
  static const accent700 = Color(0xFFB45813);
  static const success50 = Color(0xFFECFDF3);
  static const success500 = Color(0xFF16A34A);
  static const success700 = Color(0xFF15803D);
  static const warning50 = Color(0xFFFFF8EB);
  static const warning500 = Color(0xFFD97706);
  static const warning700 = Color(0xFFB45309);
  static const error50 = Color(0xFFFEF2F2);
  static const error500 = Color(0xFFDC2626);
  static const error700 = Color(0xFFB91C1C);
  static const info50 = Color(0xFFEFF6FF);
  static const info500 = Color(0xFF2563EB);
  static const info700 = Color(0xFF1D4ED8);
  static const violet50 = Color(0xFFF3EEFE);
  static const violet700 = Color(0xFF6D28D9);
  static const gray0 = Color(0xFFFFFFFF);
  static const gray50 = Color(0xFFFAFAFA);
  static const gray100 = Color(0xFFF4F4F5);
  static const gray200 = Color(0xFFE4E4E7);
  static const gray300 = Color(0xFFD4D4D8);
  static const gray400 = Color(0xFFA1A1AA);
  static const gray500 = Color(0xFF71717A);
  static const gray600 = Color(0xFF52525B);
  static const gray700 = Color(0xFF3F3F46);
  static const gray800 = Color(0xFF27272A);
  static const gray900 = Color(0xFF18181B);
  static const photoStripeA = Color(0xFFC7CED8);
  static const scrim = Color(0x7A18181B);
}

abstract final class AppSpace {
  static const s2 = 2.0;
  static const s4 = 4.0;
  static const s6 = 6.0;
  static const s8 = 8.0;
  static const s10 = 10.0;
  static const s12 = 12.0;
  static const s16 = 16.0;
  static const s20 = 20.0;
  static const s24 = 24.0;
  static const s32 = 32.0;
  static const s40 = 40.0;
  static const s48 = 48.0;
}

abstract final class AppRadius {
  static const sm = 4.0;
  static const smPlus = 6.0;
  static const md = 8.0;
  static const lg = 12.0;
  static const xl = 16.0;
  static const full = 999.0;
}

abstract final class AppSize {
  /// اندازهٔ لمسی اپ کارگاه: انگشت با دستکش (F08 ۱) — بزرگ‌تر از وب.
  static const control = 48.0;
  static const controlLg = 56.0;
  static const icon = 20.0;
  static const iconLg = 24.0;
}

abstract final class AppFonts {
  static const sans = 'Vazirmatn';
  static const mono = 'JetBrainsMono';
}

/// مقیاس متن هم‌خوان با کلاس‌های `text-*` بوم، یک پله بزرگ‌تر برای گوشی.
abstract final class AppText {
  static const display = TextStyle(fontFamily: AppFonts.sans, fontSize: 28, height: 1.3, fontWeight: FontWeight.w700);
  static const title1 = TextStyle(fontFamily: AppFonts.sans, fontSize: 22, height: 1.3, fontWeight: FontWeight.w700);
  static const title2 = TextStyle(fontFamily: AppFonts.sans, fontSize: 19, height: 1.35, fontWeight: FontWeight.w700);
  static const title3 = TextStyle(fontFamily: AppFonts.sans, fontSize: 17, height: 1.4, fontWeight: FontWeight.w700);
  static const heading = TextStyle(fontFamily: AppFonts.sans, fontSize: 16, height: 1.4, fontWeight: FontWeight.w600);
  static const subheading = TextStyle(fontFamily: AppFonts.sans, fontSize: 15, height: 1.4, fontWeight: FontWeight.w600);
  static const body = TextStyle(fontFamily: AppFonts.sans, fontSize: 15, height: 1.7, fontWeight: FontWeight.w400);
  static const ui = TextStyle(fontFamily: AppFonts.sans, fontSize: 14, height: 1.35, fontWeight: FontWeight.w500);
  static const bodySm = TextStyle(fontFamily: AppFonts.sans, fontSize: 13.5, height: 1.6, fontWeight: FontWeight.w400);
  static const caption = TextStyle(fontFamily: AppFonts.sans, fontSize: 12.5, height: 1.5, fontWeight: FontWeight.w400);
  static const label = TextStyle(fontFamily: AppFonts.sans, fontSize: 11.5, height: 1.4, fontWeight: FontWeight.w600);
  static const numStat = TextStyle(fontFamily: AppFonts.sans, fontSize: 22, height: 1.1, fontWeight: FontWeight.w700);
  static const code = TextStyle(fontFamily: AppFonts.mono, fontSize: 12.5, height: 1.4, fontWeight: FontWeight.w400);
}
