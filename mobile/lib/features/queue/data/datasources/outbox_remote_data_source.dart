import 'dart:typed_data';

import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/network/api_client.dart';
import 'package:projeyar_field/core/network/json_read.dart';

/// وضعیت جلسهٔ بارگذاری (`UploadView` بک‌اند F20).
final class UploadSessionView {
  const UploadSessionView({required this.uploadId, required this.complete, required this.partSize, required this.partCount, required this.missingParts});

  factory UploadSessionView.fromJson(Json json) => UploadSessionView(
    uploadId: '${json['uploadId']}',
    complete: json['status'] == 'complete',
    partSize: readInt(json['partSize']) ?? 0,
    partCount: readInt(json['partCount']) ?? 0,
    missingParts: [for (final p in (json['missingParts'] as List?) ?? const []) readInt(p) ?? 0],
  );

  final String uploadId;
  final bool complete;
  final int partSize;
  final int partCount;
  final List<int> missingParts;
}

/// فراخوانی‌های HTTP صف ارسال. Idempotency-Key = UUID موجودیت (D10).
@lazySingleton
class OutboxRemoteDataSource {
  const OutboxRemoteDataSource(this._api);

  final ApiClient _api;

  Future<Json> postReport(Json body) async =>
      ApiClient.asJson(await _api.post('/field/reports', body: body, idempotencyKey: body['id']! as String));

  Future<Json> postIssue(Json body) async => ApiClient.asJson(await _api.post('/field/issues', body: body, idempotencyKey: body['id']! as String));

  Future<Object?> putItem(String itemId, Json body, {required String idempotencyKey}) =>
      _api.put('/field/items/$itemId', body: body, idempotencyKey: idempotencyKey);

  Future<UploadSessionView> createUpload(Json body) async =>
      UploadSessionView.fromJson(ApiClient.asJson(await _api.post('/uploads', body: body)));

  Future<UploadSessionView> uploadStatus(String uploadId) async => UploadSessionView.fromJson(ApiClient.asJson(await _api.get('/uploads/$uploadId')));

  Future<void> putPart(String uploadId, int part, Uint8List bytes) => _api.putBytes('/uploads/$uploadId/parts/$part', bytes);

  Future<UploadSessionView> complete(String uploadId, String sha256) async =>
      UploadSessionView.fromJson(ApiClient.asJson(await _api.post('/uploads/$uploadId/complete', body: {'sha256': sha256})));
}
