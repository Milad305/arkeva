import 'dart:typed_data';

import 'package:projeyar_field/core/device/location.dart';
import 'package:projeyar_field/core/result/result.dart';
import 'package:projeyar_field/features/camera/domain/entities/photo_entities.dart';

/// عکس‌های رمزنگاری‌شدهٔ گوشی (M07). فقط از دوربین؛ هیچ ورودی گالری (AC-FA-04).
abstract interface class PhotoRepository {
  /// مهر روی پیکسل، کوچک‌سازی ۱۶۰۰ و JPEG ۸۰، SHA-256 پیش از رمز، ذخیره با AES-GCM.
  Future<Result<StoredPhoto>> save({required Uint8List rawJpeg, required PhotoTarget target, required StampInfo stamp, required String workDate, GeoFix? fix});

  Stream<List<StoredPhoto>> watchFor(PhotoTarget target);

  Future<List<StoredPhoto>> photosFor(PhotoTarget target);

  /// عکس‌های سریع پیوست‌نشدهٔ این روز کاری.
  Stream<List<StoredPhoto>> watchQuick(String workDate);

  Future<Result<Unit>> attachQuick(String photoId, PhotoTarget target);

  Future<Result<Unit>> delete(String photoId);

  /// بایت‌های رمزگشایی‌شده برای نمایش بندانگشتی.
  Future<Uint8List?> bytesOf(String photoId);
}
