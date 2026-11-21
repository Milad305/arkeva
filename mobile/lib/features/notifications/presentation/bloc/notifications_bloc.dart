import 'package:bloc_concurrency/bloc_concurrency.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/error/failure.dart';
import 'package:projeyar_field/core/result/result.dart';
import 'package:projeyar_field/core/time/clock.dart';
import 'package:projeyar_field/features/notifications/domain/entities/notification_entities.dart';
import 'package:projeyar_field/features/notifications/domain/repositories/notifications_repository.dart';

part 'notifications_bloc.freezed.dart';

sealed class NotificationsEvent {
  const NotificationsEvent();
}

final class NotificationsStarted extends NotificationsEvent {
  const NotificationsStarted();
}

final class NotificationsRefreshed extends NotificationsEvent {
  const NotificationsRefreshed();
}

final class NotificationsMoreRequested extends NotificationsEvent {
  const NotificationsMoreRequested();
}

final class NotificationsUnreadOnlyToggled extends NotificationsEvent {
  const NotificationsUnreadOnlyToggled({required this.value});
  final bool value;
}

final class NotificationOpened extends NotificationsEvent {
  const NotificationOpened(this.id);
  final String id;
}

final class NotificationsAllRead extends NotificationsEvent {
  const NotificationsAllRead();
}

enum NotificationsStatus { loading, ready, loadingMore }

@freezed
abstract class NotificationsState with _$NotificationsState {
  const factory NotificationsState({
    @Default(NotificationsStatus.loading) NotificationsStatus status,
    @Default(<AppNotification>[]) List<AppNotification> items,
    String? nextCursor,
    @Default(0) int unreadCount,
    @Default(false) bool unreadOnly,

    /// نمایش صفحهٔ ذخیره‌شده چون شبکه نبود
    @Default(false) bool stale,
    Failure? failure,
  }) = _NotificationsState;
}

/// M12 اعلان‌ها: آنلاین با cursor؛ بی‌شبکه از پایگاه دادهٔ محلی (همگام‌سازی، F08 ۵.۱). «خوانده شد» فقط آنلاین.
@injectable
class NotificationsBloc extends Bloc<NotificationsEvent, NotificationsState> {
  NotificationsBloc(this._repository, this._clock) : super(const NotificationsState()) {
    on<NotificationsStarted>((e, emit) => _load(emit), transformer: restartable());
    on<NotificationsRefreshed>((e, emit) => _load(emit), transformer: restartable());
    on<NotificationsUnreadOnlyToggled>((e, emit) async {
      emit(state.copyWith(unreadOnly: e.value, status: NotificationsStatus.loading));
      await _load(emit);
    }, transformer: restartable());
    on<NotificationsMoreRequested>(_onMore, transformer: droppable());
    on<NotificationOpened>(_onOpened);
    on<NotificationsAllRead>(_onAllRead, transformer: droppable());
  }

  final NotificationsRepository _repository;
  final Clock _clock;

  Future<void> _load(Emitter<NotificationsState> emit) async {
    final result = await _repository.fetch(unreadOnly: state.unreadOnly);
    switch (result) {
      case Ok(:final value):
        emit(state.copyWith(status: NotificationsStatus.ready, items: value.items, nextCursor: value.nextCursor, unreadCount: value.unreadCount, stale: false, failure: null));
      case Err(:final failure):
        final local = await _repository.local(unreadOnly: state.unreadOnly);
        emit(
          state.copyWith(
            status: NotificationsStatus.ready,
            items: local.items,
            unreadCount: local.unreadCount,
            nextCursor: null,
            stale: true,
            failure: failure,
          ),
        );
    }
  }

  Future<void> _onMore(NotificationsMoreRequested event, Emitter<NotificationsState> emit) async {
    final cursor = state.nextCursor;
    if (cursor == null) return;
    emit(state.copyWith(status: NotificationsStatus.loadingMore));
    final result = await _repository.fetch(cursor: cursor, unreadOnly: state.unreadOnly);
    switch (result) {
      case Ok(:final value):
        emit(state.copyWith(status: NotificationsStatus.ready, items: [...state.items, ...value.items], nextCursor: value.nextCursor));
      case Err(:final failure):
        emit(state.copyWith(status: NotificationsStatus.ready, failure: failure));
    }
  }

  Future<void> _onOpened(NotificationOpened event, Emitter<NotificationsState> emit) async {
    final target = state.items.where((n) => n.id == event.id).firstOrNull;
    if (target == null || target.isRead) return;
    final now = _clock.now();
    emit(
      state.copyWith(
        items: [for (final n in state.items) n.id == event.id ? n.markRead(now) : n],
        unreadCount: state.unreadCount > 0 ? state.unreadCount - 1 : 0,
      ),
    );
    final result = await _repository.markRead(event.id);
    if (result.failureOrNull != null) emit(state.copyWith(failure: result.failureOrNull));
  }

  Future<void> _onAllRead(NotificationsAllRead event, Emitter<NotificationsState> emit) async {
    final result = await _repository.markAllRead();
    switch (result) {
      case Ok():
        final now = _clock.now();
        emit(state.copyWith(items: [for (final n in state.items) n.markRead(now)], unreadCount: 0));
      case Err(:final failure):
        emit(state.copyWith(failure: failure));
    }
  }
}
