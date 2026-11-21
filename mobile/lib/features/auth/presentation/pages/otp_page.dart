import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:formz/formz.dart';
import 'package:projeyar_field/core/error/failure.dart';
import 'package:projeyar_field/core/l10n/digit_input_formatter.dart';
import 'package:projeyar_field/core/l10n/fa_num.dart';
import 'package:projeyar_field/core/theme/app_tokens.dart';
import 'package:projeyar_field/core/widgets/app_widgets.dart';
import 'package:projeyar_field/features/auth/domain/entities/auth_entities.dart';
import 'package:projeyar_field/features/auth/presentation/bloc/auth_bloc.dart';
import 'package:projeyar_field/features/auth/presentation/bloc/otp_bloc.dart';

final class OtpPageArgs {
  const OtpPageArgs({required this.challenge, required this.mobile, this.inviteCode});
  final OtpChallenge challenge;
  final String mobile;

  /// ورود با کد دعوت (OD-20)
  final String? inviteCode;
}

/// M02 کد پیامکی.
class OtpPage extends StatelessWidget {
  const OtpPage({super.key});

  @override
  Widget build(BuildContext context) => BlocListener<OtpBloc, OtpState>(
    listenWhen: (a, b) => a.user == null && b.user != null,
    // مسیریاب با تغییر AuthBloc به M03 می‌رود
    listener: (context, state) => context.read<AuthBloc>().add(AuthLoggedIn(state.user!)),
    child: Scaffold(
      appBar: AppBar(title: const Text('کد ورود')),
      backgroundColor: AppColors.gray0,
      body: SafeArea(
        child: BlocBuilder<OtpBloc, OtpState>(
          builder: (context, state) {
            final bloc = context.read<OtpBloc>();
            final length = state.challenge?.codeLength ?? 5;
            final failure = state.failure;
            return ListView(
              padding: const EdgeInsetsDirectional.all(AppSpace.s24),
              children: [
                Text(
                  'کد ${toFaDigits(length)} رقمی به شمارهٔ ${toFaDigits(state.challenge?.maskedMobile ?? '')} پیامک شد.',
                  style: AppText.body.copyWith(color: AppColors.gray600),
                ),
                const SizedBox(height: AppSpace.s24),
                TextField(
                  autofocus: true,
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.center,
                  textDirection: TextDirection.ltr,
                  autofillHints: const [AutofillHints.oneTimeCode],
                  style: AppText.title2.copyWith(letterSpacing: 8),
                  inputFormatters: [LocalizedDigitsFormatter(maxLength: length)],
                  decoration: InputDecoration(labelText: 'کد پیامک', errorText: state.codeError, counterText: ''),
                  onChanged: (value) => bloc.add(OtpCodeChanged(value)),
                ),
                const SizedBox(height: AppSpace.s16),
                if (failure != null && failure is! ValidationFailure && failure is! UnauthorizedFailure) ...[
                  FailureBanner(failure: failure, onRetry: () => bloc.add(const OtpSubmitted())),
                  const SizedBox(height: AppSpace.s16),
                ],
                PrimaryButton(
                  label: 'ورود',
                  loading: state.status == FormzSubmissionStatus.inProgress,
                  onPressed: () => bloc.add(const OtpSubmitted()),
                ),
                const SizedBox(height: AppSpace.s12),
                Center(
                  child: state.canResend
                      ? TextButton(onPressed: () => bloc.add(const OtpResendRequested()), child: const Text('ارسال دوبارهٔ کد'))
                      : Text(
                          state.resending ? 'در حال ارسال…' : 'ارسال دوباره تا ${toFaDigits(state.resendIn)} ثانیهٔ دیگر',
                          style: AppText.caption.copyWith(color: AppColors.gray500),
                        ),
                ),
              ],
            );
          },
        ),
      ),
    ),
  );
}
