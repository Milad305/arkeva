import 'dart:convert';

import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/error/error_mapper.dart';
import 'package:projeyar_field/core/network/token_store.dart';
import 'package:projeyar_field/core/result/result.dart';
import 'package:projeyar_field/core/security/secure_store.dart';
import 'package:projeyar_field/features/auth/data/datasources/auth_remote_data_source.dart';
import 'package:projeyar_field/features/auth/data/models/auth_models.dart';
import 'package:projeyar_field/features/auth/domain/entities/auth_entities.dart';
import 'package:projeyar_field/features/auth/domain/repositories/auth_repository.dart';

@LazySingleton(as: AuthRepository)
class AuthRepositoryImpl implements AuthRepository {
  AuthRepositoryImpl(this._remote, this._tokens, this._secure);

  final AuthRemoteDataSource _remote;
  final TokenStore _tokens;
  final SecureStore _secure;

  @override
  Future<Result<OtpChallenge>> requestCode(String mobile) async {
    try {
      return Ok((await _remote.requestCode(mobile)).toEntity());
    } on Object catch (e) {
      return Err(ErrorMapper.map(e));
    }
  }

  @override
  Future<Result<OtpChallenge>> inviteCode(String code) async {
    try {
      return Ok((await _remote.inviteCode(code)).toEntity());
    } on Object catch (e) {
      return Err(ErrorMapper.map(e));
    }
  }

  @override
  Future<Result<AppUser>> verify({required String otpToken, required String code}) async {
    try {
      final dto = await _remote.verify(otpToken: otpToken, code: code);
      await _tokens.save(
        accessToken: dto.session.accessToken,
        expiresInSec: dto.session.expiresInSec,
        refreshToken: dto.refreshToken,
        refreshExpiresAt: dto.refreshExpiresAt,
      );
      final user = dto.toUser();
      await _secure.writeProfileJson(jsonEncode(StoredUserDto.fromEntity(user).toJson()));
      return Ok(user);
    } on Object catch (e) {
      return Err(ErrorMapper.map(e));
    }
  }

  @override
  Future<AppUser?> restore() async {
    try {
      if (await _tokens.refreshToken() == null) return null;
      final json = decodeJsonObject(await _secure.readProfileJson());
      return json == null ? null : StoredUserDto.fromJson(json).toEntity();
    } on Object {
      return null;
    }
  }

  @override
  Future<Result<Unit>> logout() async {
    final refresh = await _tokens.refreshToken();
    try {
      if (refresh != null) await _remote.logout(refresh);
    } on Object {
      // بی‌شبکه هم خروج محلی انجام می‌شود؛ نشست سرور با پایان عمرش باطل می‌شود
    }
    await _tokens.clear();
    return const Ok(unit);
  }

  @override
  Stream<void> get sessionExpired => _tokens.signals.where((s) => s == SessionSignal.expired);
}
