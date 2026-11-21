import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/error/failure.dart';
import 'package:projeyar_field/core/result/result.dart';
import 'package:projeyar_field/core/usecase/usecase.dart';
import 'package:projeyar_field/features/auth/domain/entities/auth_entities.dart';
import 'package:projeyar_field/features/auth/domain/repositories/auth_repository.dart';
import 'package:projeyar_field/features/auth/domain/value_objects/invite_code.dart';
import 'package:projeyar_field/features/auth/domain/value_objects/mobile_number.dart';

@injectable
class RequestLoginCode implements UseCase<OtpChallenge, String> {
  const RequestLoginCode(this._repository);
  final AuthRepository _repository;

  /// شماره پیش از ارسال به قالب ۰۹xxxxxxxxx نرمال می‌شود.
  @override
  Future<Result<OtpChallenge>> call(String mobile) => _repository.requestCode(MobileNumber.normalize(mobile) ?? mobile);
}

/// ورود با کد یا QR دعوت (OD-20). کد بدشکل پیش از شبکه رد می‌شود.
@injectable
class RequestInviteLoginCode implements UseCase<OtpChallenge, String> {
  const RequestInviteLoginCode(this._repository);
  final AuthRepository _repository;

  static const invalidMessage = 'کد دعوت ۸ نویسه است، مثل K7M2Q9XA. آن را از پیامک دعوت بخوانید یا QR را اسکن کنید.';

  @override
  Future<Result<OtpChallenge>> call(String raw) async {
    final code = InviteCode.normalize(raw);
    if (code == null) return const Err(ValidationFailure(message: invalidMessage, fieldErrors: {'code': invalidMessage}));
    return _repository.inviteCode(code);
  }
}

final class VerifyCodeParams {
  const VerifyCodeParams({required this.otpToken, required this.code});
  final String otpToken;
  final String code;
}

@injectable
class VerifyLoginCode implements UseCase<AppUser, VerifyCodeParams> {
  const VerifyLoginCode(this._repository);
  final AuthRepository _repository;

  @override
  Future<Result<AppUser>> call(VerifyCodeParams params) => _repository.verify(otpToken: params.otpToken, code: params.code);
}
