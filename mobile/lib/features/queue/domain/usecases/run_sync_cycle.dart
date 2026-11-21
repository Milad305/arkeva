import 'package:equatable/equatable.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/device/app_info.dart';
import 'package:projeyar_field/core/error/failure.dart';
import 'package:projeyar_field/features/queue/domain/entities/queue_entities.dart';
import 'package:projeyar_field/features/queue/domain/repositories/queue_repository.dart';
import 'package:projeyar_field/features/sync/domain/entities/sync_entities.dart';
import 'package:projeyar_field/features/sync/domain/repositories/sync_repository.dart';

final class SyncCycleResult extends Equatable {
  const SyncCycleResult({required this.queue, this.queueFailure, this.syncFailure});

  final QueueRunReport queue;
  final Failure? queueFailure;
  final Failure? syncFailure;

  Failure? get failure => syncFailure ?? queueFailure;

  @override
  List<Object?> get props => [queue, queueFailure, syncFailure];
}

/// یک «تلاش همگام‌سازی» کامل: ارسال صف ← دریافت آینه ← ضربان، که **همیشه** فرستاده می‌شود (AC-FA-08).
/// صف پیش از دریافت می‌رود تا وضعیت گزارش‌های تازه در همان دریافت بیاید. اجراهای هم‌زمان در این فرایند یکی می‌شوند.
@lazySingleton
class RunSyncCycle {
  RunSyncCycle(this._queue, this._sync, this._appInfo);

  final QueueRepository _queue;
  final SyncRepository _sync;
  final AppInfo _appInfo;

  Future<SyncCycleResult>? _inFlight;

  Future<SyncCycleResult> call() => _inFlight ??= _run().whenComplete(() => _inFlight = null);

  Future<SyncCycleResult> _run() async {
    final queued = await _queue.process();
    final synced = await _sync.syncNow();
    await _heartbeat();
    return SyncCycleResult(
      queue: queued.valueOrNull ?? const QueueRunReport(),
      queueFailure: queued.failureOrNull,
      syncFailure: synced.failureOrNull,
    );
  }

  Future<void> _heartbeat() async {
    final summary = await _queue.summary();
    final info = await _sync.info();
    String? version;
    try {
      version = await _appInfo.version();
    } on Object {
      version = null;
    }
    await _sync.sendHeartbeat(
      HeartbeatData(
        queuedReports: summary.reports,
        queuedPhotos: summary.photos,
        queuedBytes: summary.bytes,
        oldestQueuedAt: summary.oldestQueuedAt,
        appVersion: version,
        lastSyncAt: info.lastSyncAt,
        wifiOnly: await _queue.wifiOnly(),
      ),
    );
  }
}
