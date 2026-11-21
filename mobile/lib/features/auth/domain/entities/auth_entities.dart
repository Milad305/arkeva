import 'package:equatable/equatable.dart';

/// کاربر واردشده؛ برای نمایش آفلاین در ذخیرهٔ امن هم نگه داشته می‌شود.
final class AppUser extends Equatable {
  const AppUser({required this.id, required this.fullName, required this.mobile, required this.organizationName});

  final String id;
  final String fullName;
  final String mobile;
  final String organizationName;

  @override
  List<Object?> get props => [id, fullName, mobile, organizationName];
}

/// پاسخ درخواست کد (M01 ← M02).
final class OtpChallenge extends Equatable {
  const OtpChallenge({required this.otpToken, required this.maskedMobile, required this.resendAfterSec, required this.codeLength});

  final String otpToken;
  final String maskedMobile;
  final int resendAfterSec;
  final int codeLength;

  @override
  List<Object?> get props => [otpToken, maskedMobile, resendAfterSec, codeLength];
}
