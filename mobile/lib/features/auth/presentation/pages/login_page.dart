import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:formz/formz.dart';
import 'package:go_router/go_router.dart';
import 'package:projeyar_field/app/router/routes.dart';
import 'package:projeyar_field/core/error/failure.dart';
import 'package:projeyar_field/core/l10n/digit_input_formatter.dart';
import 'package:projeyar_field/core/theme/app_tokens.dart';
import 'package:projeyar_field/core/widgets/app_widgets.dart';
import 'package:projeyar_field/features/auth/presentation/bloc/auth_bloc.dart';
import 'package:projeyar_field/features/auth/presentation/bloc/login_bloc.dart';
import 'package:projeyar_field/features/auth/presentation/pages/otp_page.dart';

/// M01 ورود با شمارهٔ همراه.
class LoginPage extends StatelessWidget {
  const LoginPage({super.key});

  @override
  Widget build(BuildContext context) {
    final expired = context.select<AuthBloc, bool>((b) => b.state is AuthUnauthenticated && (b.state as AuthUnauthenticated).sessionExpired);
    return BlocListener<LoginBloc, LoginState>(
      listenWhen: (a, b) => a.challenge == null && b.challenge != null,
      listener: (context, state) {
        unawaited(context.push(Routes.otp, extra: OtpPageArgs(challenge: state.challenge!, mobile: state.mobile.value)));
        context.read<LoginBloc>().add(const LoginChallengeConsumed());
      },
      child: Scaffold(
        backgroundColor: AppColors.gray0,
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsetsDirectional.fromSTEB(AppSpace.s24, AppSpace.s48, AppSpace.s24, AppSpace.s24),
            children: [
              const Icon(Icons.engineering_outlined, size: 48, color: AppColors.primary700),
              const SizedBox(height: AppSpace.s16),
              const Text('پروژه‌یار کارگاه', style: AppText.title1),
              const SizedBox(height: AppSpace.s6),
              Text('برای ورود، شمارهٔ همراهی را که در پروژه ثبت شده وارد کنید.', style: AppText.body.copyWith(color: AppColors.gray600)),
              const SizedBox(height: AppSpace.s32),
              if (expired) ...[
                const FailureBanner(failure: UnauthorizedFailure()),
                const SizedBox(height: AppSpace.s16),
              ],
              const _MobileField(),
              const SizedBox(height: AppSpace.s24),
              BlocBuilder<LoginBloc, LoginState>(
                buildWhen: (a, b) => a.status != b.status || a.failure != b.failure,
                builder: (context, state) => Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (state.failure != null && state.failure is! ValidationFailure) ...[
                      FailureBanner(failure: state.failure!, onRetry: () => context.read<LoginBloc>().add(const LoginSubmitted())),
                      const SizedBox(height: AppSpace.s16),
                    ],
                    PrimaryButton(
                      label: 'دریافت کد ورود',
                      loading: state.status == FormzSubmissionStatus.inProgress,
                      onPressed: () => context.read<LoginBloc>().add(const LoginSubmitted()),
                    ),
                    const SizedBox(height: AppSpace.s12),
                    // OD-20: کد پیامک دعوت یا QR گوشی مدیر پروژه
                    TextButton.icon(
                      onPressed: () => unawaited(context.push(Routes.invite)),
                      icon: const Icon(Icons.qr_code_2),
                      label: const Text('ورود با کد یا QR دعوت'),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MobileField extends StatelessWidget {
  const _MobileField();

  @override
  Widget build(BuildContext context) => BlocBuilder<LoginBloc, LoginState>(
    buildWhen: (a, b) => a.mobileError != b.mobileError,
    builder: (context, state) => TextField(
      autofocus: true,
      keyboardType: TextInputType.phone,
      textInputAction: TextInputAction.done,
      textDirection: TextDirection.ltr,
      autofillHints: const [AutofillHints.telephoneNumber],
      inputFormatters: const [LocalizedDigitsFormatter(maxLength: 14)],
      decoration: InputDecoration(
        labelText: 'شمارهٔ همراه',
        hintText: '۰۹۱۲۳۴۵۶۷۸۹',
        errorText: state.mobileError,
        prefixIcon: const Icon(Icons.phone_iphone),
      ),
      onChanged: (value) => context.read<LoginBloc>().add(LoginMobileChanged(value)),
      onSubmitted: (_) => context.read<LoginBloc>().add(const LoginSubmitted()),
    ),
  );
}
