import 'package:bloc_concurrency/bloc_concurrency.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/error/failure.dart';
import 'package:projeyar_field/core/util/streams.dart';
import 'package:projeyar_field/features/activities/domain/entities/activity_entities.dart';
import 'package:projeyar_field/features/activities/domain/repositories/activities_repository.dart';
import 'package:projeyar_field/features/profile/domain/repositories/profile_repository.dart';
import 'package:projeyar_field/features/profile/domain/usecases/sign_out.dart';
import 'package:projeyar_field/features/queue/domain/entities/queue_entities.dart';
import 'package:projeyar_field/features/queue/domain/repositories/queue_repository.dart';
import 'package:projeyar_field/features/sync/domain/entities/sync_entities.dart';
import 'package:projeyar_field/features/sync/domain/repositories/sync_repository.dart';

part 'profile_bloc.freezed.dart';

sealed class ProfileEvent {
  const ProfileEvent();
}

final class ProfileStarted extends ProfileEvent {
  const ProfileStarted();
}

final class ProfileWifiOnlyToggled extends ProfileEvent {
  const ProfileWifiOnlyToggled({required this.value});
  final bool value;
}

final class ProfileReminderToggled extends ProfileEvent {
  const ProfileReminderToggled({required this.value});
  final bool value;
}

/// خروج پس از هشدار صف و تأیید دوباره در صفحه.
final class ProfileSignOutConfirmed extends ProfileEvent {
  const ProfileSignOutConfirmed();
}

enum ProfileStatus { loading, ready, signingOut, signedOut }

@freezed
abstract class ProfileState with _$ProfileState {
  const factory ProfileState({
    @Default(ProfileStatus.loading) ProfileStatus status,
    @Default(<Project>[]) List<Project> projects,
    @Default(false) bool wifiOnly,
    @Default(true) bool reminderEnabled,
    @Default(QueueSummary()) QueueSummary queue,
    @Default(SyncInfo()) SyncInfo sync,
    @Default('') String version,
    Failure? failure,
  }) = _ProfileState;

  const ProfileState._();

  /// مواردی که با خروج از بین می‌روند (F08 ۵.۱).
  int get unsent => queue.total + queue.rejected;
}

/// M14 پروفایل: پروژه‌ها، «فقط Wi‑Fi»، یادآوری، نسخه، خروج با پاک کردن کامل.
@injectable
class ProfileBloc extends Bloc<ProfileEvent, ProfileState> {
  ProfileBloc(this._profile, this._queue, this._activities, this._sync, this._signOut) : super(const ProfileState()) {
    on<ProfileStarted>(_onStarted, transformer: restartable());
    on<ProfileWifiOnlyToggled>((e, emit) async {
      final r = await _queue.setWifiOnly(value: e.value);
      if (r.failureOrNull != null) emit(state.copyWith(failure: r.failureOrNull));
    });
    on<ProfileReminderToggled>((e, emit) async {
      final r = await _profile.setReminderEnabled(enabled: e.value);
      if (r.failureOrNull != null) emit(state.copyWith(failure: r.failureOrNull));
    });
    on<ProfileSignOutConfirmed>((e, emit) async {
      emit(state.copyWith(status: ProfileStatus.signingOut, failure: null));
      final r = await _signOut();
      emit(r.isOk ? state.copyWith(status: ProfileStatus.signedOut) : state.copyWith(status: ProfileStatus.ready, failure: r.failureOrNull));
    }, transformer: droppable());
  }

  final ProfileRepository _profile;
  final QueueRepository _queue;
  final ActivitiesRepository _activities;
  final SyncRepository _sync;
  final SignOut _signOut;

  Future<void> _onStarted(ProfileStarted event, Emitter<ProfileState> emit) async {
    emit(state.copyWith(version: await _profile.appVersion()));
    await emit.forEach<List<Object?>>(
      combineLatestList([
        _activities.watchProjects(),
        _queue.watchWifiOnly(),
        _profile.watchReminderEnabled(),
        _queue.watchSummary(),
        _sync.watchInfo(),
      ], (v) => v),
      onData: (v) => state.status == ProfileStatus.signingOut || state.status == ProfileStatus.signedOut
          ? state
          : state.copyWith(
              status: ProfileStatus.ready,
              projects: v[0]! as List<Project>,
              wifiOnly: v[1]! as bool,
              reminderEnabled: v[2]! as bool,
              queue: v[3]! as QueueSummary,
              sync: v[4]! as SyncInfo,
            ),
    );
  }
}
