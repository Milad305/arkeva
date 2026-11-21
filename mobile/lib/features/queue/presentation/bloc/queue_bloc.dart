import 'package:bloc_concurrency/bloc_concurrency.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/error/failure.dart';
import 'package:projeyar_field/core/network/network_info.dart';
import 'package:projeyar_field/core/util/streams.dart';
import 'package:projeyar_field/features/queue/domain/entities/queue_entities.dart';
import 'package:projeyar_field/features/queue/domain/repositories/queue_repository.dart';
import 'package:projeyar_field/features/queue/domain/usecases/run_sync_cycle.dart';

part 'queue_bloc.freezed.dart';

sealed class QueueEvent {
  const QueueEvent();
}

final class QueueStarted extends QueueEvent {
  const QueueStarted();
}

final class QueueSendNow extends QueueEvent {
  const QueueSendNow();
}

final class QueueWifiOnlyToggled extends QueueEvent {
  const QueueWifiOnlyToggled({required this.value});
  final bool value;
}

final class QueueDiscardRequested extends QueueEvent {
  const QueueDiscardRequested(this.entryId);
  final int entryId;
}

enum QueueViewStatus { initial, ready, sending }

@freezed
abstract class QueueState with _$QueueState {
  const factory QueueState({
    @Default(QueueViewStatus.initial) QueueViewStatus status,
    @Default(<QueueEntry>[]) List<QueueEntry> entries,
    @Default(QueueSummary()) QueueSummary summary,
    @Default(false) bool wifiOnly,
    @Default(NetworkKind.none) NetworkKind network,
    Failure? failure,
    int? lastSent,
  }) = _QueueState;
}

/// M09 صف ارسال.
@injectable
class QueueBloc extends Bloc<QueueEvent, QueueState> {
  QueueBloc(this._queue, this._cycle, this._network) : super(const QueueState()) {
    on<QueueStarted>(_onStarted, transformer: restartable());
    on<QueueSendNow>(_onSendNow, transformer: droppable());
    on<QueueWifiOnlyToggled>((e, emit) async {
      final result = await _queue.setWifiOnly(value: e.value);
      if (result.failureOrNull != null) emit(state.copyWith(failure: result.failureOrNull));
    });
    on<QueueDiscardRequested>((e, emit) async {
      final result = await _queue.discardRejected(e.entryId);
      if (result.failureOrNull != null) emit(state.copyWith(failure: result.failureOrNull));
    }, transformer: droppable());
  }

  final QueueRepository _queue;
  final RunSyncCycle _cycle;
  final NetworkInfo _network;

  Future<void> _onStarted(QueueStarted event, Emitter<QueueState> emit) async {
    emit(state.copyWith(network: await _network.current()));
    await emit.forEach<(List<QueueEntry>, bool, NetworkKind)>(
      combineLatest3(_queue.watchEntries(), _queue.watchWifiOnly(), startWith(_network.changes, state.network), (a, b, c) => (a, b, c)),
      onData: (v) => state.copyWith(
        status: state.status == QueueViewStatus.sending ? QueueViewStatus.sending : QueueViewStatus.ready,
        entries: v.$1,
        summary: QueueSummary.fromEntries(v.$1),
        wifiOnly: v.$2,
        network: v.$3,
      ),
    );
  }

  Future<void> _onSendNow(QueueSendNow event, Emitter<QueueState> emit) async {
    emit(state.copyWith(status: QueueViewStatus.sending, failure: null, lastSent: null));
    await _queue.retryNow();
    final result = await _cycle();
    emit(state.copyWith(status: QueueViewStatus.ready, failure: result.failure, lastSent: result.queue.sent));
  }

}
