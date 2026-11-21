import 'package:projeyar_field/core/result/result.dart';
import 'package:projeyar_field/features/sync/domain/entities/sync_entities.dart';

/// همگام‌سازی آینهٔ سرور (`GET /field/sync`) و ضربان (`POST /field/heartbeat`).
abstract interface class SyncRepository {
  /// دریافت کامل و جایگزینی تراکنشی جدول‌های آینه.
  Future<Result<SyncInfo>> syncNow();

  Stream<SyncInfo> watchInfo();

  Future<SyncInfo> info();

  Future<Result<Unit>> sendHeartbeat(HeartbeatData data);
}
