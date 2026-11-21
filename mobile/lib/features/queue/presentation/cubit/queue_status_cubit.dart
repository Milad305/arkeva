import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/error/failure.dart';
import 'package:projeyar_field/core/network/network_info.dart';
import 'package:projeyar_field/features/queue/domain/entities/queue_entities.dart';
import 'package:projeyar_field/features/queue/domain/repositories/queue_repository.dart';
import 'package:projeyar_field/features/queue/domain/usecases/run_sync_cycle.dart';

final class QueueStatus extends Equatable {
  const QueueStatus({this.summary = const QueueSummary(), this.running = false, this.lastFailure, this.lastRunAt});

  final QueueSummary summary;
  final bool running;
  final Failure? lastFailure;
  final DateTime? lastRunAt;

  QueueStatus copyWith({QueueSummary? summary, bool? running, Failure? lastFailure, bool clearFailure = false, DateTime? lastRunAt}) => QueueStatus(
    summary: summary ?? this.summary,
    running: running ?? this.running,
    lastFailure: clearFailure ? null : lastFailure ?? this.lastFailure,
    lastRunAt: lastRunAt ?? this.lastRunAt,
  );

  @override
  List<Object?> get props => [summary, running, lastFailure, lastRunAt];
}

/// وضعیت سراسری صف و راه‌انداز ارسال (rules ۶.۱ و ۹): باز شدن اپ، برگشت اتصال و ذخیرهٔ تازه در صف.
/// ارسال با `RunSyncCycle` است که ضربان را هم پس از هر تلاش می‌فرستد (AC-FA-08).
@lazySingleton
class QueueStatusCubit extends Cubit<QueueStatus> {
  QueueStatusCubit(this._queue, this._cycle, this._network) : super(const QueueStatus());

  final QueueRepository _queue;
  final RunSyncCycle _cycle;
  final NetworkInfo _network;
  final _subscriptions = <StreamSubscription<Object?>>[];
  Timer? _debounce;
  NetworkKind? _lastNetwork;

  /// پس از ورود صدا زده می‌شود؛ دوباره صدا زدن بی‌اثر است.
  void start() {
    if (_subscriptions.isNotEmpty) return;
    _subscriptions
      ..add(_queue.watchSummary().listen((s) => emit(state.copyWith(summary: s))))
      ..add(_queue.kicks.listen((_) => _schedule()))
      ..add(
        _network.changes.listen((kind) {
          final cameOnline = kind.isOnline && !(_lastNetwork?.isOnline ?? false);
          final toWifi = kind == NetworkKind.wifi && _lastNetwork != NetworkKind.wifi;
          _lastNetwork = kind;
          if (cameOnline || toWifi) _schedule();
        }),
      );
    unawaited(syncNow());
  }

  void stop() {
    for (final s in _subscriptions) {
      unawaited(s.cancel());
    }
    _subscriptions.clear();
    _debounce?.cancel();
  }

  void _schedule() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(seconds: 2), () => unawaited(syncNow()));
  }

  /// یک تلاش کامل؛ اجراهای هم‌زمان در RunSyncCycle یکی می‌شوند.
  Future<SyncCycleResult> syncNow() async {
    if (!isClosed) emit(state.copyWith(running: true));
    final result = await _cycle();
    if (!isClosed) {
      emit(state.copyWith(running: false, lastFailure: result.failure, clearFailure: result.failure == null, lastRunAt: DateTime.now()));
    }
    return result;
  }

  @override
  Future<void> close() {
    stop();
    return super.close();
  }
}
