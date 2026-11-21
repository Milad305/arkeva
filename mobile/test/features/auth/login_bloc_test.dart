import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:formz/formz.dart';
import 'package:mocktail/mocktail.dart';
import 'package:projeyar_field/core/error/failure.dart';
import 'package:projeyar_field/core/result/result.dart';
import 'package:projeyar_field/features/auth/domain/entities/auth_entities.dart';
import 'package:projeyar_field/features/auth/domain/repositories/auth_repository.dart';
import 'package:projeyar_field/features/auth/domain/usecases/auth_usecases.dart';
import 'package:projeyar_field/features/auth/domain/value_objects/invite_code.dart';
import 'package:projeyar_field/features/auth/presentation/bloc/invite_bloc.dart';
import 'package:projeyar_field/features/auth/presentation/bloc/login_bloc.dart';
import 'package:projeyar_field/features/auth/presentation/bloc/otp_bloc.dart';

class _MockAuthRepository extends Mock implements AuthRepository {}

const _challenge = OtpChallenge(otpToken: 'org.id.secret', maskedMobile: '0912***6789', resendAfterSec: 0, codeLength: 5);
const _user = AppUser(id: 'u1', fullName: 'رضا کریمی', mobile: '09123456789', organizationName: 'سازمان');

void main() {
  late _MockAuthRepository repository;

  setUp(() => repository = _MockAuthRepository());

  group('LoginBloc (M01)', () {
    blocTest<LoginBloc, LoginState>(
      'شمارهٔ نامعتبر: بدون درخواست و با خطای فیلد',
      build: () => LoginBloc(RequestLoginCode(repository)),
      act: (bloc) => bloc
        ..add(const LoginMobileChanged('۰۸۱۲'))
        ..add(const LoginSubmitted()),
      verify: (bloc) {
        verifyNever(() => repository.requestCode(any()));
        expect(bloc.state.mobileError, isNotNull);
      },
    );

    blocTest<LoginBloc, LoginState>(
      'شمارهٔ فارسی نرمال و challenge گرفته می‌شود',
      setUp: () => when(() => repository.requestCode('09123456789')).thenAnswer((_) async => const Ok(_challenge)),
      build: () => LoginBloc(RequestLoginCode(repository)),
      act: (bloc) => bloc
        ..add(const LoginMobileChanged('۰۹۱۲۳۴۵۶۷۸۹'))
        ..add(const LoginSubmitted()),
      verify: (bloc) {
        expect(bloc.state.status, FormzSubmissionStatus.success);
        expect(bloc.state.challenge, _challenge);
      },
    );

    blocTest<LoginBloc, LoginState>(
      'خطای اعتبارسنجی سرور روی همان فیلد',
      setUp: () => when(() => repository.requestCode(any())).thenAnswer(
        (_) async => const Err(ValidationFailure(fieldErrors: {'mobile': 'شمارهٔ همراه را درست وارد کنید.'})),
      ),
      build: () => LoginBloc(RequestLoginCode(repository)),
      act: (bloc) => bloc
        ..add(const LoginMobileChanged('09123456789'))
        ..add(const LoginSubmitted()),
      verify: (bloc) => expect(bloc.state.mobileError, 'شمارهٔ همراه را درست وارد کنید.'),
    );

    blocTest<LoginBloc, LoginState>(
      'بی‌اتصال: Failure قابل تکرار در حالت',
      setUp: () => when(() => repository.requestCode(any())).thenAnswer((_) async => const Err(NetworkFailure())),
      build: () => LoginBloc(RequestLoginCode(repository)),
      act: (bloc) => bloc
        ..add(const LoginMobileChanged('09123456789'))
        ..add(const LoginSubmitted()),
      verify: (bloc) {
        expect(bloc.state.failure, isA<NetworkFailure>());
        expect(bloc.state.status, FormzSubmissionStatus.failure);
      },
    );
  });

  group('OtpBloc (M02)', () {
    blocTest<OtpBloc, OtpState>(
      'کامل شدن کد خودکار تأیید می‌کند',
      setUp: () => when(
        () => repository.verify(otpToken: _challenge.otpToken, code: '12345'),
      ).thenAnswer((_) async => const Ok(_user)),
      build: () => OtpBloc(VerifyLoginCode(repository), RequestLoginCode(repository), RequestInviteLoginCode(repository)),
      act: (bloc) => bloc
        ..add(const OtpStarted(challenge: _challenge, mobile: '09123456789'))
        ..add(const OtpCodeChanged('۱۲۳۴۵')),
      wait: const Duration(milliseconds: 50),
      verify: (bloc) => expect(bloc.state.user, _user),
    );

    blocTest<OtpBloc, OtpState>(
      'کد نادرست: پیام سرور زیر فیلد',
      setUp: () => when(
        () => repository.verify(otpToken: any(named: 'otpToken'), code: any(named: 'code')),
      ).thenAnswer((_) async => const Err(UnauthorizedFailure(code: 'OTP_INVALID', message: 'کد درست نیست.'))),
      build: () => OtpBloc(VerifyLoginCode(repository), RequestLoginCode(repository), RequestInviteLoginCode(repository)),
      act: (bloc) => bloc
        ..add(const OtpStarted(challenge: _challenge, mobile: '09123456789'))
        ..add(const OtpCodeChanged('11111')),
      wait: const Duration(milliseconds: 50),
      verify: (bloc) => expect(bloc.state.codeError, 'کد درست نیست.'),
    );
  });

  group('ورود با کد یا QR دعوت (M01؛ OD-20)', () {
    test('OD-20 کد دعوت مثل بک‌اند هنجار می‌شود', () {
      expect(InviteCode.normalize('projeyar:invite:k7m2-q9xa'), 'K7M2Q9XA');
      expect(InviteCode.normalize(' K7M2 Q9XA '), 'K7M2Q9XA');
      expect(InviteCode.normalize('lOIK7M2Q'), '101K7M2Q');
      expect(InviteCode.normalize('K7M2Q9X'), isNull);
      expect(InviteCode.normalize('K7M2Q9XU'), isNull);
    });

    blocTest<InviteBloc, InviteState>(
      'OD-20 کد بدشکل: بی درخواست و با خطای فیلد',
      build: () => InviteBloc(RequestInviteLoginCode(repository)),
      act: (bloc) => bloc
        ..add(const InviteCodeChanged('ABC'))
        ..add(const InviteSubmitted()),
      wait: const Duration(milliseconds: 20),
      verify: (bloc) {
        verifyNever(() => repository.inviteCode(any()));
        expect(bloc.state.codeError, RequestInviteLoginCode.invalidMessage);
      },
    );

    blocTest<InviteBloc, InviteState>(
      'OD-20 QR اسکن‌شده هنجار و خودکار فرستاده می‌شود؛ challenge برای M02',
      setUp: () => when(() => repository.inviteCode('K7M2Q9XA')).thenAnswer((_) async => const Ok(_challenge)),
      build: () => InviteBloc(RequestInviteLoginCode(repository)),
      act: (bloc) => bloc.add(const InviteScanned('projeyar:invite:k7m2q9xa')),
      wait: const Duration(milliseconds: 20),
      verify: (bloc) {
        expect(bloc.state.challenge, _challenge);
        expect(bloc.state.normalized, 'K7M2Q9XA');
      },
    );

    blocTest<InviteBloc, InviteState>(
      'OD-20 کد نامعتبر سرور (۴۰۱ INVITE_CODE_INVALID) زیر فیلد',
      setUp: () => when(() => repository.inviteCode(any())).thenAnswer(
        (_) async => const Err(UnauthorizedFailure(code: 'INVITE_CODE_INVALID', message: 'این کد دعوت معتبر نیست.')),
      ),
      build: () => InviteBloc(RequestInviteLoginCode(repository)),
      act: (bloc) => bloc
        ..add(const InviteCodeChanged('K7M2Q9XA'))
        ..add(const InviteSubmitted()),
      wait: const Duration(milliseconds: 20),
      verify: (bloc) => expect(bloc.state.codeError, 'این کد دعوت معتبر نیست.'),
    );

    blocTest<OtpBloc, OtpState>(
      'OD-20 ارسال دوبارهٔ کد در ورود با دعوت همان کد دعوت را می‌فرستد',
      setUp: () => when(() => repository.inviteCode('K7M2Q9XA')).thenAnswer((_) async => const Ok(_challenge)),
      build: () => OtpBloc(VerifyLoginCode(repository), RequestLoginCode(repository), RequestInviteLoginCode(repository)),
      act: (bloc) => bloc
        ..add(const OtpStarted(challenge: _challenge, mobile: '0912***6789', inviteCode: 'K7M2Q9XA'))
        ..add(const OtpResendRequested()),
      wait: const Duration(milliseconds: 20),
      verify: (_) {
        verify(() => repository.inviteCode('K7M2Q9XA')).called(1);
        verifyNever(() => repository.requestCode(any()));
      },
    );
  });
}
