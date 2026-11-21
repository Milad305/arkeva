import 'dart:async';

import 'package:bloc_concurrency/bloc_concurrency.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:formz/formz.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/error/failure.dart';
import 'package:projeyar_field/core/result/result.dart';
import 'package:projeyar_field/features/auth/domain/entities/auth_entities.dart';
import 'package:projeyar_field/features/auth/domain/usecases/auth_usecases.dart';
import 'package:projeyar_field/features/auth/presentation/forms/auth_inputs.dart';

part 'otp_bloc.freezed.dart';

sealed class OtpEvent {
  const OtpEvent();
}

final class OtpStarted extends OtpEvent {
  const OtpStarted({required this.challenge, required this.mobile, this.inviteCode});
  final OtpChallenge challenge;
  final String mobile;

  /// ورود با کد دعوت (OD-20): ارسال دوباره همان کد دعوت را می‌فرستد.
  final String? inviteCode;
}

final class OtpCodeChanged extends OtpEvent {
  const OtpCodeChanged(this.value);
  final String value;
}

final class OtpSubmitted extends OtpEvent {
  const OtpSubmitted();
}

final class OtpResendRequested extends OtpEvent {
  const OtpResendRequested();
}

final class _OtpTicked extends OtpEvent {
  const _OtpTicked();
}

@freezed
abstract class OtpState with _$OtpState {
  const factory OtpState({
    OtpChallenge? challenge,
    @Default('') String mobile,
    String? inviteCode,
    @Default(OtpCodeInput.pure()) OtpCodeInput code,
    @Default(FormzSubmissionStatus.initial) FormzSubmissionStatus status,
    @Default(false) bool showErrors,
    @Default(0) int resendIn,
    @Default(false) bool resending,
    AppUser? user,
    Failure? failure,
  }) = _OtpState;

  const OtpState._();

  String? get codeError {
    final f = failure;
    if (f is ValidationFailure) return f.fieldErrors['code'] ?? f.message;
    if (f is UnauthorizedFailure) return f.message;
    return showErrors ? code.error?.message : null;
  }

  bool get canResend => resendIn == 0 && !resending;
}

/// M02 کد ورود: تأیید پنج رقم و ارسال دوباره با شمارش معکوس.
@injectable
class OtpBloc extends Bloc<OtpEvent, OtpState> {
  OtpBloc(this._verify, this._requestCode, this._requestInvite) : super(const OtpState()) {
    on<OtpStarted>(_onStarted);
    on<OtpCodeChanged>(_onCodeChanged);
    on<OtpSubmitted>(_onSubmitted, transformer: droppable());
    on<OtpResendRequested>(_onResend, transformer: droppable());
    on<_OtpTicked>((_, emit) {
      final next = state.resendIn - 1;
      emit(state.copyWith(resendIn: next < 0 ? 0 : next));
      if (next <= 0) _timer?.cancel();
    });
  }

  final VerifyLoginCode _verify;
  final RequestLoginCode _requestCode;
  final RequestInviteLoginCode _requestInvite;
  Timer? _timer;

  void _onStarted(OtpStarted event, Emitter<OtpState> emit) {
    final length = event.challenge.codeLength;
    emit(state.copyWith(challenge: event.challenge, mobile: event.mobile, inviteCode: event.inviteCode, code: OtpCodeInput.pure(length: length)));
    _startCountdown(event.challenge.resendAfterSec, emit);
  }

  Future<void> _onCodeChanged(OtpCodeChanged event, Emitter<OtpState> emit) async {
    final length = state.challenge?.codeLength ?? 5;
    final code = OtpCodeInput.dirty(event.value, length: length);
    emit(state.copyWith(code: code, failure: null));
    // با کامل شدن کد، خودکار تأیید می‌شود (کمتر از یک دقیقه؛ F08 ۱)
    if (code.isValid && state.status != FormzSubmissionStatus.inProgress) add(const OtpSubmitted());
  }

  Future<void> _onSubmitted(OtpSubmitted event, Emitter<OtpState> emit) async {
    final challenge = state.challenge;
    if (challenge == null) return;
    if (state.code.isNotValid) {
      emit(state.copyWith(showErrors: true));
      return;
    }
    emit(state.copyWith(status: FormzSubmissionStatus.inProgress, failure: null));
    final result = await _verify(VerifyCodeParams(otpToken: challenge.otpToken, code: state.code.normalized));
    switch (result) {
      case Ok(:final value):
        _timer?.cancel();
        emit(state.copyWith(status: FormzSubmissionStatus.success, user: value));
      case Err(:final failure):
        emit(state.copyWith(status: FormzSubmissionStatus.failure, failure: failure, showErrors: true));
    }
  }

  Future<void> _onResend(OtpResendRequested event, Emitter<OtpState> emit) async {
    if (!state.canResend) return;
    emit(state.copyWith(resending: true, failure: null));
    final invite = state.inviteCode;
    final result = invite != null ? await _requestInvite(invite) : await _requestCode(state.mobile);
    switch (result) {
      case Ok(:final value):
        emit(
          state.copyWith(
            resending: false,
            challenge: value,
            code: OtpCodeInput.pure(length: value.codeLength),
            showErrors: false,
            status: FormzSubmissionStatus.initial,
          ),
        );
        _startCountdown(value.resendAfterSec, emit);
      case Err(:final failure):
        emit(state.copyWith(resending: false, failure: failure));
    }
  }

  void _startCountdown(int seconds, Emitter<OtpState> emit) {
    _timer?.cancel();
    emit(state.copyWith(resendIn: seconds));
    if (seconds <= 0) return;
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => add(const _OtpTicked()));
  }

  @override
  Future<void> close() {
    _timer?.cancel();
    return super.close();
  }
}
