import 'package:flutter/material.dart';
import 'package:projeyar_field/core/theme/app_tokens.dart';

/// برچسب‌های فارسی مقادیر ثابت دامنه. ورودی نام enum (`ItemStatus.name` و …) است تا core به ویژگی‌ها وابسته نشود.
abstract final class Labels {
  static String itemStatus(String name) => switch (name) {
    'submitted' => 'ارسال‌شده',
    'stage1' => 'در بررسی ناظر',
    'stage2' => 'مرحلهٔ دوم تأیید',
    'approved' => 'تأیید شد',
    'needsRevision' || 'needs_revision' => 'نیاز به اصلاح',
    'rejected' => 'رد شد',
    'superseded' => 'جایگزین شد',
    'needsResolution' || 'needs_resolution' => 'در انتظار تعیین تکلیف ناظر',
    _ => name,
  };

  static (Color fg, Color bg) itemStatusColors(String name) => switch (name) {
    'approved' => (AppColors.success700, AppColors.success50),
    'needsRevision' || 'needs_revision' => (AppColors.warning700, AppColors.warning50),
    'rejected' => (AppColors.error700, AppColors.error50),
    'superseded' => (AppColors.gray600, AppColors.gray100),
    'needsResolution' || 'needs_resolution' => (AppColors.violet700, AppColors.violet50),
    _ => (AppColors.info700, AppColors.info50),
  };

  static String flag(String code) => switch (code) {
    'late_submission' => 'ارسال دیرهنگام',
    'mock_location' => 'موقعیت جعلی',
    'gps_out_of_range' => 'خارج از محدودهٔ کارگاه',
    'clock_skew' => 'ساعت گوشی نادرست',
    'photo_time_mismatch' => 'زمان عکس با تاریخ کار نمی‌خواند',
    'jump_above_limit' || 'jump' => 'جهش بالای آستانه',
    'decrease' => 'کاهش درصد',
    'photos_below_min' => 'عکس کمتر از حداقل',
    _ => code,
  };

  static String weather(String name) => switch (name) {
    'sunny' => 'آفتابی',
    'cloudy' => 'ابری',
    'rainy' => 'بارانی',
    'snowy' => 'برفی',
    'windy' => 'باد شدید',
    'dusty' => 'گرد و خاک',
    _ => name,
  };

  static String issueType(String name) => switch (name) {
    'material' => 'مصالح',
    'safety' => 'ایمنی',
    'equipment' => 'ماشین‌آلات و تجهیزات',
    'design' => 'نقشه و طراحی',
    'weather' => 'آب‌وهوا',
    'other' => 'سایر',
    _ => name,
  };

  static String issueEffect(String name) => switch (name) {
    'stop' => 'کار متوقف شده',
    'slow' => 'کار کند شده',
    'none' => 'فعلاً بدون اثر',
    _ => name,
  };

  static String issueStatus(String name) => switch (name) {
    'queued' => 'در صف ارسال',
    'rejected' => 'پذیرفته نشد',
    'open' || 'identified' => 'باز',
    'mitigating' || 'in_progress' => 'در حال پیگیری',
    'closed' || 'resolved' => 'بسته شد',
    _ => name,
  };

  static String method(String name) => switch (name) {
    'quantity' => 'مقداری',
    'percent' => 'درصدی',
    'steps' => 'گام‌به‌گام',
    _ => name,
  };
}
