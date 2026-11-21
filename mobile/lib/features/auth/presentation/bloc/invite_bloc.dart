import 'package:bloc_concurrency/bloc_concurrency.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:formz/formz.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/error/failure.dart';
import 'package:projeyar_field/core/result/result.dart';
import 'package:projeyar_field/features/auth/domain/entities/auth_entities.dart';
import 'package:projeyar_field/features/auth/domain/usecases/auth_usecases.dart';
import 'package:projeyar_field/features/auth/domain/value_objects/invite_code.dart';

part 'invite_bloc.freezed.dart';

sealed class InviteEvent {
  const InviteEvent();
}

final class InviteCodeChanged extends InviteEvent {
  const InviteCodeChanged(this.value);
  final String value;
}

final class InviteSubmitted extends InviteEvent {
  const InviteSubmitted();
}

/// متن QR اسکن‌شده: جایگزین فیلد و ارسال خودکار.
final class InviteScanned extends InviteEvent {
  const InviteScanned(this.raw);
  final String raw;
}

final class InviteChallengeConsumed extends InviteEvent {
  const InviteChallengeConsumed();
}

@freezed
abstract class InviteState with _$InviteState {
  const factory InviteState({
    @Default('') String code,
    @Default(FormzSubmissionStatus.initial) FormzSubmissionStatus status,
    OtpChallenge? challenge,
    Failure? failure,
  }) = _InviteState;

  const InviteState._();

  String? get codeError {
    final f = failure;
    if (f is ValidationFailure) return f.fieldErrors['code'] ?? f.message;
    if (f is UnauthorizedFailure) return f.message;
    return null;
  }

  /// کد هنجار برای ارسال دوباره در M02.
  String? get normalized => InviteCode.normalize(code);
}

/// M01 ورود با کد یا QR دعوت (OD-20): کد ← کد پیامکی به شمارهٔ دعوت ← M02.
@injectable
class InviteBloc extends Bloc<InviteEvent, InviteState> {
  InviteBloc(this._request) : super(const InviteState()) {
    on<InviteCodeChanged>((event, emit) => emit(state.copyWith(code: event.value, failure: null)));
    on<InviteSubmitted>((_, emit) => _submit(emit), transformer: droppable());
    on<InviteScanned>((event, emit) async {
      emit(state.copyWith(code: InviteCode.normalize(event.raw) ?? event.raw.trim(), failure: null));
      await _submit(emit);
    }, transformer: droppable());
    on<InviteChallengeConsumed>((_, emit) => emit(state.copyWith(challenge: null, status: FormzSubmissionStatus.initial)));
  }

  final RequestInviteLoginCode _request;

  Future<void> _submit(Emitter<InviteState> emit) async {
    emit(state.copyWith(status: FormzSubmissionStatus.inProgress, failure: null));
    final result = await _request(state.code);
    switch (result) {
      case Ok(:final value):
        emit(state.copyWith(status: FormzSubmissionStatus.success, challenge: value));
      case Err(:final failure):
        emit(state.copyWith(status: FormzSubmissionStatus.failure, failure: failure));
    }
  }
}
