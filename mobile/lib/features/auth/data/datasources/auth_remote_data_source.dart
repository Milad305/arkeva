import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/network/api_client.dart';
import 'package:projeyar_field/features/auth/data/models/auth_models.dart';

/// `/v1/auth/app/*` (backend app-auth.controller.ts).
@lazySingleton
class AuthRemoteDataSource {
  const AuthRemoteDataSource(this._api);
  final ApiClient _api;

  Future<OtpChallengeDto> requestCode(String mobile) async =>
      OtpChallengeDto.fromJson(ApiClient.asJson(await _api.post('/auth/app/request-code', body: {'mobile': mobile})));

  Future<OtpChallengeDto> inviteCode(String code) async =>
      OtpChallengeDto.fromJson(ApiClient.asJson(await _api.post('/auth/app/invite-code', body: {'code': code})));

  Future<AppSessionDto> verify({required String otpToken, required String code}) async =>
      AppSessionDto.fromJson(ApiClient.asJson(await _api.post('/auth/app/verify', body: {'otpToken': otpToken, 'code': code})));

  Future<void> logout(String refreshToken) => _api.post('/auth/app/logout', body: {'refreshToken': refreshToken});
}
