import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/database/meta_store.dart';
import 'package:projeyar_field/core/error/error_mapper.dart';
import 'package:projeyar_field/core/result/result.dart';
import 'package:projeyar_field/core/time/clock.dart';
import 'package:projeyar_field/core/util/streams.dart';
import 'package:projeyar_field/features/sync/data/datasources/sync_data_sources.dart';
import 'package:projeyar_field/features/sync/domain/entities/sync_entities.dart';
import 'package:projeyar_field/features/sync/domain/repositories/sync_repository.dart';


@LazySingleton(as: SyncRepository)
class SyncRepositoryImpl implements SyncRepository {
  SyncRepositoryImpl(this._remote, this._local, this._meta, this._clock);

  final SyncRemoteDataSource _remote;
  final SyncLocalDataSource _local;
  final MetaStore _meta;
  final Clock _clock;

  @override
  Future<Result<SyncInfo>> syncNow() async {
    try {
      final now = _clock.now();
      await _meta.write(MetaKeys.lastAttemptAt, now.toUtc().toIso8601String());
      final dto = await _remote.fetch();
      await _local.replace(dto, now);
      return Ok(SyncInfo(lastSyncAt: now.toUtc(), serverToday: dto.today));
    } on Object catch (e) {
      return Err(ErrorMapper.map(e));
    }
  }

  @override
  Stream<SyncInfo> watchInfo() => combineLatest2(
    _meta.watch(MetaKeys.lastSyncAt),
    _meta.watch(MetaKeys.today),
    (String? last, String? today) => SyncInfo(lastSyncAt: last == null ? null : DateTime.tryParse(last), serverToday: today),
  ).distinct();

  @override
  Future<SyncInfo> info() async =>
      SyncInfo(lastSyncAt: await _meta.readTime(MetaKeys.lastSyncAt), serverToday: await _meta.read(MetaKeys.today));

  @override
  Future<Result<Unit>> sendHeartbeat(HeartbeatData data) async {
    try {
      await _remote.heartbeat({
        'queuedReports': data.queuedReports,
        'queuedPhotos': data.queuedPhotos,
        'queuedBytes': data.queuedBytes,
        'oldestQueuedAt': data.oldestQueuedAt?.toUtc().toIso8601String(),
        'appVersion': data.appVersion,
        'lastSyncAt': data.lastSyncAt?.toUtc().toIso8601String(),
        'wifiOnly': data.wifiOnly,
      });
      return const Ok(unit);
    } on Object catch (e) {
      return Err(ErrorMapper.map(e));
    }
  }
}
