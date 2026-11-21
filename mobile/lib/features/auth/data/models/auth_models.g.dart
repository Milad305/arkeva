// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'auth_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_OtpChallengeDto _$OtpChallengeDtoFromJson(Map<String, dynamic> json) =>
    _OtpChallengeDto(
      otpToken: json['otpToken'] as String,
      maskedMobile: json['maskedMobile'] as String,
      resendAfterSec: (json['resendAfterSec'] as num).toInt(),
      codeLength: (json['codeLength'] as num?)?.toInt() ?? 5,
    );

Map<String, dynamic> _$OtpChallengeDtoToJson(_OtpChallengeDto instance) =>
    <String, dynamic>{
      'otpToken': instance.otpToken,
      'maskedMobile': instance.maskedMobile,
      'resendAfterSec': instance.resendAfterSec,
      'codeLength': instance.codeLength,
    };

_SessionUserDto _$SessionUserDtoFromJson(Map<String, dynamic> json) =>
    _SessionUserDto(
      id: json['id'] as String,
      fullName: json['fullName'] as String,
      mobile: json['mobile'] as String,
    );

Map<String, dynamic> _$SessionUserDtoToJson(_SessionUserDto instance) =>
    <String, dynamic>{
      'id': instance.id,
      'fullName': instance.fullName,
      'mobile': instance.mobile,
    };

_SessionOrgDto _$SessionOrgDtoFromJson(Map<String, dynamic> json) =>
    _SessionOrgDto(id: json['id'] as String, name: json['name'] as String);

Map<String, dynamic> _$SessionOrgDtoToJson(_SessionOrgDto instance) =>
    <String, dynamic>{'id': instance.id, 'name': instance.name};

_SessionDto _$SessionDtoFromJson(Map<String, dynamic> json) => _SessionDto(
  accessToken: json['accessToken'] as String,
  expiresInSec: (json['expiresInSec'] as num).toInt(),
  user: SessionUserDto.fromJson(json['user'] as Map<String, dynamic>),
  organization: SessionOrgDto.fromJson(
    json['organization'] as Map<String, dynamic>,
  ),
);

Map<String, dynamic> _$SessionDtoToJson(_SessionDto instance) =>
    <String, dynamic>{
      'accessToken': instance.accessToken,
      'expiresInSec': instance.expiresInSec,
      'user': instance.user,
      'organization': instance.organization,
    };

_AppSessionDto _$AppSessionDtoFromJson(Map<String, dynamic> json) =>
    _AppSessionDto(
      session: SessionDto.fromJson(json['session'] as Map<String, dynamic>),
      refreshToken: json['refreshToken'] as String,
      refreshExpiresAt: json['refreshExpiresAt'] as String?,
    );

Map<String, dynamic> _$AppSessionDtoToJson(_AppSessionDto instance) =>
    <String, dynamic>{
      'session': instance.session,
      'refreshToken': instance.refreshToken,
      'refreshExpiresAt': instance.refreshExpiresAt,
    };

_StoredUserDto _$StoredUserDtoFromJson(Map<String, dynamic> json) =>
    _StoredUserDto(
      id: json['id'] as String,
      fullName: json['fullName'] as String,
      mobile: json['mobile'] as String,
      organizationName: json['organizationName'] as String,
    );

Map<String, dynamic> _$StoredUserDtoToJson(_StoredUserDto instance) =>
    <String, dynamic>{
      'id': instance.id,
      'fullName': instance.fullName,
      'mobile': instance.mobile,
      'organizationName': instance.organizationName,
    };
