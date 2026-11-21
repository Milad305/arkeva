import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:projeyar_field/features/auth/domain/entities/auth_entities.dart';

part 'auth_models.freezed.dart';
part 'auth_models.g.dart';

/// پاسخ `POST /auth/app/request-code` (backend app-login.ts).
@freezed
abstract class OtpChallengeDto with _$OtpChallengeDto {
  const factory OtpChallengeDto({
    required String otpToken,
    required String maskedMobile,
    required int resendAfterSec,
    @Default(5) int codeLength,
  }) = _OtpChallengeDto;

  const OtpChallengeDto._();

  factory OtpChallengeDto.fromJson(Map<String, dynamic> json) => _$OtpChallengeDtoFromJson(json);

  OtpChallenge toEntity() => OtpChallenge(otpToken: otpToken, maskedMobile: maskedMobile, resendAfterSec: resendAfterSec, codeLength: codeLength);
}

@freezed
abstract class SessionUserDto with _$SessionUserDto {
  const factory SessionUserDto({required String id, required String fullName, required String mobile}) = _SessionUserDto;

  factory SessionUserDto.fromJson(Map<String, dynamic> json) => _$SessionUserDtoFromJson(json);
}

@freezed
abstract class SessionOrgDto with _$SessionOrgDto {
  const factory SessionOrgDto({required String id, required String name}) = _SessionOrgDto;

  factory SessionOrgDto.fromJson(Map<String, dynamic> json) => _$SessionOrgDtoFromJson(json);
}

/// `SessionView` بک‌اند؛ فقط فیلدهایی که اپ لازم دارد.
@freezed
abstract class SessionDto with _$SessionDto {
  const factory SessionDto({
    required String accessToken,
    required int expiresInSec,
    required SessionUserDto user,
    required SessionOrgDto organization,
  }) = _SessionDto;

  factory SessionDto.fromJson(Map<String, dynamic> json) => _$SessionDtoFromJson(json);
}

/// پاسخ `POST /auth/app/verify`.
@freezed
abstract class AppSessionDto with _$AppSessionDto {
  const factory AppSessionDto({required SessionDto session, required String refreshToken, String? refreshExpiresAt}) = _AppSessionDto;

  const AppSessionDto._();

  factory AppSessionDto.fromJson(Map<String, dynamic> json) => _$AppSessionDtoFromJson(json);

  AppUser toUser() => AppUser(id: session.user.id, fullName: session.user.fullName, mobile: session.user.mobile, organizationName: session.organization.name);
}

/// شکل ذخیره‌شدهٔ کاربر در ذخیرهٔ امن.
@freezed
abstract class StoredUserDto with _$StoredUserDto {
  const factory StoredUserDto({required String id, required String fullName, required String mobile, required String organizationName}) = _StoredUserDto;

  const StoredUserDto._();

  factory StoredUserDto.fromJson(Map<String, dynamic> json) => _$StoredUserDtoFromJson(json);

  factory StoredUserDto.fromEntity(AppUser user) =>
      StoredUserDto(id: user.id, fullName: user.fullName, mobile: user.mobile, organizationName: user.organizationName);

  AppUser toEntity() => AppUser(id: id, fullName: fullName, mobile: mobile, organizationName: organizationName);
}
