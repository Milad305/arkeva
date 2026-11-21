import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:formz/formz.dart';
import 'package:go_router/go_router.dart';
import 'package:projeyar_field/app/router/routes.dart';
import 'package:projeyar_field/core/error/failure.dart';
import 'package:projeyar_field/core/theme/app_tokens.dart';
import 'package:projeyar_field/core/widgets/app_widgets.dart';
import 'package:projeyar_field/features/auth/presentation/bloc/invite_bloc.dart';
import 'package:projeyar_field/features/auth/presentation/pages/otp_page.dart';

/// M01 ورود با کد دعوت (OD-20): کد پیامک دعوت را بنویسید یا QR را از گوشی مدیر پروژه اسکن کنید.
class InvitePage extends StatefulWidget {
  const InvitePage({super.key});

  @override
  State<InvitePage> createState() => _InvitePageState();
}

class _InvitePageState extends State<InvitePage> {
  final _field = TextEditingController();

  @override
  void dispose() {
    _field.dispose();
    super.dispose();
  }

  Future<void> _scan() async {
    final raw = await context.push<String>(Routes.inviteScan);
    if (raw == null || !mounted) return;
    final bloc = context.read<InviteBloc>()..add(InviteScanned(raw));
    _field.text = bloc.state.normalized ?? raw;
  }

  @override
  Widget build(BuildContext context) => BlocListener<InviteBloc, InviteState>(
    listenWhen: (a, b) => a.challenge == null && b.challenge != null,
    listener: (context, state) {
      if (_field.text != state.code) _field.text = state.code;
      unawaited(
        context.push(
          Routes.otp,
          extra: OtpPageArgs(challenge: state.challenge!, mobile: state.challenge!.maskedMobile, inviteCode: state.normalized),
        ),
      );
      context.read<InviteBloc>().add(const InviteChallengeConsumed());
    },
    child: Scaffold(
      appBar: AppBar(title: const Text('ورود با کد دعوت')),
      backgroundColor: AppColors.gray0,
      body: SafeArea(
        child: BlocBuilder<InviteBloc, InviteState>(
          builder: (context, state) {
            final bloc = context.read<InviteBloc>();
            final failure = state.failure;
            return ListView(
              padding: const EdgeInsetsDirectional.all(AppSpace.s24),
              children: [
                Text(
                  'کد دعوت در پیامک دعوت آمده است. می‌توانید QR دعوت را هم از گوشی مدیر پروژه اسکن کنید.',
                  style: AppText.body.copyWith(color: AppColors.gray600),
                ),
                const SizedBox(height: AppSpace.s24),
                TextField(
                  controller: _field,
                  autofocus: true,
                  textAlign: TextAlign.center,
                  textDirection: TextDirection.ltr,
                  textCapitalization: TextCapitalization.characters,
                  style: AppText.title2.copyWith(fontFamily: 'JetBrainsMono', letterSpacing: 4),
                  inputFormatters: [LengthLimitingTextInputFormatter(24)],
                  decoration: InputDecoration(labelText: 'کد دعوت', hintText: 'K7M2Q9XA', errorText: state.codeError),
                  onChanged: (value) => bloc.add(InviteCodeChanged(value)),
                  onSubmitted: (_) => bloc.add(const InviteSubmitted()),
                ),
                const SizedBox(height: AppSpace.s16),
                if (failure != null && failure is! ValidationFailure && failure is! UnauthorizedFailure) ...[
                  FailureBanner(failure: failure, onRetry: () => bloc.add(const InviteSubmitted())),
                  const SizedBox(height: AppSpace.s16),
                ],
                PrimaryButton(
                  label: 'دریافت کد ورود',
                  loading: state.status == FormzSubmissionStatus.inProgress,
                  onPressed: () => bloc.add(const InviteSubmitted()),
                ),
                const SizedBox(height: AppSpace.s12),
                OutlinedButton.icon(onPressed: _scan, icon: const Icon(Icons.qr_code_scanner), label: const Text('اسکن QR دعوت')),
              ],
            );
          },
        ),
      ),
    ),
  );
}
