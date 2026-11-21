import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/result/result.dart';
import 'package:projeyar_field/features/auth/domain/repositories/auth_repository.dart';
import 'package:projeyar_field/features/profile/domain/repositories/profile_repository.dart';

/// خروج کامل (M14): باطل کردن نشست در سرور اگر شبکه هست، سپس پاک کردن همهٔ دادهٔ گوشی.
/// هشدار صف پیش از این، در صفحه و با تأیید دوباره است (F08 ۵.۱).
@injectable
class SignOut {
  const SignOut(this._auth, this._profile);

  final AuthRepository _auth;
  final ProfileRepository _profile;

  Future<Result<Unit>> call() async {
    await _auth.logout();
    return _profile.wipeLocalData();
  }
}
