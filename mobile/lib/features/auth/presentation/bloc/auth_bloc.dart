import 'dart:async';

import 'package:bloc_concurrency/bloc_concurrency.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/features/auth/domain/entities/auth_entities.dart';
import 'package:projeyar_field/features/auth/domain/repositories/auth_repository.dart';

sealed class AuthEvent {
  const AuthEvent();
}

final class AuthStarted extends AuthEvent {
  const AuthStarted();
}

final class AuthLoggedIn extends AuthEvent {
  const AuthLoggedIn(this.user);
  final AppUser user;
}

/// خروج پس از تأیید کاربر؛ پاک کردن دادهٔ محلی با `onWipe` بیرون از این Bloc است.
final class AuthLogoutRequested extends AuthEvent {
  const AuthLogoutRequested();
}

/// خروج و پاک کردن داده که بیرون از این Bloc (M14، SignOut) انجام شد.
final class AuthSignedOut extends AuthEvent {
  const AuthSignedOut();
}

final class _AuthSessionExpired extends AuthEvent {
  const _AuthSessionExpired();
}

sealed class AuthState extends Equatable {
  const AuthState();
  @override
  List<Object?> get props => [];
}

final class AuthUnknown extends AuthState {
  const AuthUnknown();
}

final class AuthAuthenticated extends AuthState {
  const AuthAuthenticated(this.user);
  final AppUser user;
  @override
  List<Object?> get props => [user];
}

final class AuthUnauthenticated extends AuthState {
  const AuthUnauthenticated({this.sessionExpired = false});

  /// نشست از سوی سرور تمام شد؛ M01 پیام «دوباره وارد شوید؛ صف می‌ماند» نشان می‌دهد.
  final bool sessionExpired;
  @override
  List<Object?> get props => [sessionExpired];
}

/// حالت سراسری ورود؛ مسیریاب از آن redirect می‌گیرد.
@lazySingleton
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  AuthBloc(this._repository) : super(const AuthUnknown()) {
    on<AuthStarted>(_onStarted, transformer: droppable());
    on<AuthLoggedIn>((event, emit) => emit(AuthAuthenticated(event.user)));
    on<AuthLogoutRequested>(_onLogout, transformer: droppable());
    on<AuthSignedOut>((_, emit) => emit(const AuthUnauthenticated()));
    on<_AuthSessionExpired>((_, emit) => emit(const AuthUnauthenticated(sessionExpired: true)));
    _expiry = _repository.sessionExpired.listen((_) => add(const _AuthSessionExpired()));
  }

  final AuthRepository _repository;
  late final StreamSubscription<void> _expiry;

  Future<void> _onStarted(AuthStarted event, Emitter<AuthState> emit) async {
    final user = await _repository.restore();
    emit(user == null ? const AuthUnauthenticated() : AuthAuthenticated(user));
  }

  Future<void> _onLogout(AuthLogoutRequested event, Emitter<AuthState> emit) async {
    await _repository.logout();
    emit(const AuthUnauthenticated());
  }

  @override
  Future<void> close() async {
    await _expiry.cancel();
    return super.close();
  }
}
