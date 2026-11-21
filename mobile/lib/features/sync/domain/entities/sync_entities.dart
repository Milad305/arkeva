import 'package:equatable/equatable.dart';

/// وضعیت همگام‌سازی برای M03 و M14.
final class SyncInfo extends Equatable {
  const SyncInfo({this.lastSyncAt, this.serverToday});

  /// آخرین همگام‌سازی موفق (UTC).
  final DateTime? lastSyncAt;

  /// «امروز» تهران از دید سرور در آخرین همگام‌سازی.
  final String? serverToday;

  @override
  List<Object?> get props => [lastSyncAt, serverToday];
}

/// ضربان صف گوشی (G7؛ AC-FA-08).
final class HeartbeatData extends Equatable {
  const HeartbeatData({
    required this.queuedReports,
    required this.queuedPhotos,
    required this.queuedBytes,
    required this.wifiOnly,
    this.oldestQueuedAt,
    this.appVersion,
    this.lastSyncAt,
  });

  final int queuedReports;
  final int queuedPhotos;
  final int queuedBytes;
  final DateTime? oldestQueuedAt;
  final String? appVersion;
  final DateTime? lastSyncAt;
  final bool wifiOnly;

  @override
  List<Object?> get props => [queuedReports, queuedPhotos, queuedBytes, oldestQueuedAt, appVersion, lastSyncAt, wifiOnly];
}
