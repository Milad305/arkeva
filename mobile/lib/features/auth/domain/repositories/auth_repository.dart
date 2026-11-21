import 'package:projeyar_field/core/result/result.dart';
import 'package:projeyar_field/features/auth/domain/entities/auth_entities.dart';

abstract interface class AuthRepository {
  /// `POST /auth/app/request-code`
  Future<Result<OtpChallenge>> requestCode(String mobile);

  /// `POST /auth/app/invite-code` (OD-20): کد پیامکی به شمارهٔ دعوت؛ ورود با همان `verify`.
  Future<Result<OtpChallenge>> inviteCode(String code);

  /// `POST /auth/app/verify` و ذخیرهٔ امن نشست.
  Future<Result<AppUser>> verify({required String otpToken, required String code});

  /// کاربر ذخیره‌شده، بدون شبکه (کار آفلاین؛ F08 ۷). null = واردنشده.
  Future<AppUser?> restore();

  /// خروج: باطل کردن نشست در سرور (اگر شبکه بود) و پاک کردن ذخیرهٔ امن.
  Future<Result<Unit>> logout();

  /// پایان نشست از سوی سرور (تازه‌سازی رد شد).
  Stream<void> get sessionExpired;
}
