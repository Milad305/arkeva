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

part 'login_bloc.freezed.dart';

sealed class LoginEvent {
  const LoginEvent();
}

final class LoginMobileChanged extends LoginEvent {
  const LoginMobileChanged(this.value);
  final String value;
}

final class LoginSubmitted extends LoginEvent {
  const LoginSubmitted();
}

/// پس از رفتن به M02، challenge مصرف شده است.
final class LoginChallengeConsumed extends LoginEvent {
  const LoginChallengeConsumed();
}

@freezed
abstract class LoginState with _$LoginState {
  const factory LoginState({
    @Default(MobileInput.pure()) MobileInput mobile,
    @Default(FormzSubmissionStatus.initial) FormzSubmissionStatus status,
    @Default(false) bool showErrors,
    OtpChallenge? challenge,
    Failure? failure,
  }) = _LoginState;

  const LoginState._();

  /// خطای فیلد: محلی پس از تلاش ارسال، یا خطای سرور برای `mobile`.
  String? get mobileError {
    final server = failure is ValidationFailure ? (failure! as ValidationFailure).fieldErrors['mobile'] : null;
    if (server != null) return server;
    return showErrors ? mobile.error?.message : null;
  }
}

/// M01 ورود: شمارهٔ همراه ← درخواست کد.
@injectable
class LoginBloc extends Bloc<LoginEvent, LoginState> {
  LoginBloc(this._requestCode) : super(const LoginState()) {
    on<LoginMobileChanged>((event, emit) => emit(state.copyWith(mobile: MobileInput.dirty(event.value), failure: null)));
    on<LoginSubmitted>(_onSubmitted, transformer: droppable());
    on<LoginChallengeConsumed>((_, emit) => emit(state.copyWith(challenge: null, status: FormzSubmissionStatus.initial)));
  }

  final RequestLoginCode _requestCode;

  Future<void> _onSubmitted(LoginSubmitted event, Emitter<LoginState> emit) async {
    final mobile = MobileInput.dirty(state.mobile.value);
    if (mobile.isNotValid) {
      emit(state.copyWith(mobile: mobile, showErrors: true));
      return;
    }
    emit(state.copyWith(mobile: mobile, status: FormzSubmissionStatus.inProgress, failure: null));
    final result = await _requestCode(mobile.value);
    switch (result) {
      case Ok(:final value):
        emit(state.copyWith(status: FormzSubmissionStatus.success, challenge: value));
      case Err(:final failure):
        emit(state.copyWith(status: FormzSubmissionStatus.failure, failure: failure, showErrors: true));
    }
  }
}
