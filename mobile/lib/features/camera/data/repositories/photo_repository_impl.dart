
import 'package:drift/drift.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/database/app_database.dart';
import 'package:projeyar_field/core/device/location.dart';
import 'package:projeyar_field/core/error/failure.dart';
import 'package:projeyar_field/core/result/result.dart';
import 'package:projeyar_field/core/security/file_cipher.dart';
import 'package:projeyar_field/features/camera/data/datasources/photo_processor.dart';
import 'package:projeyar_field/features/camera/domain/entities/photo_entities.dart';
import 'package:projeyar_field/features/camera/domain/repositories/photo_repository.dart';
import 'package:projeyar_field/features/camera/domain/services/stamp_text.dart';
import 'package:uuid/uuid.dart';

/// `ownerKind` در `LocalPhotos`. عکس اصلاح: `reportId` = شناسهٔ ارسال دوباره، `itemId` = آیتم سرور؛ با همان PUT ثبت و بعد بارگذاری می‌شود.
abstract final class PhotoOwner {
  static const report = 'report';
  static const issue = 'issue';
  static const quick = 'quick';
  static const revision = 'revision';
}

@LazySingleton(as: PhotoRepository)
class PhotoRepositoryImpl implements PhotoRepository {
  PhotoRepositoryImpl(this._db, this._cipher, this._processor);

  final AppDatabase _db;
  final FileCipher _cipher;
  final PhotoProcessor _processor;
  static const _uuid = Uuid();

  @override
  Future<Result<StoredPhoto>> save({
    required Uint8List rawJpeg,
    required PhotoTarget target,
    required StampInfo stamp,
    required String workDate,
    GeoFix? fix,
  }) async {
    try {
      final processed = await _processor.process(rawJpeg, StampText.lines(stamp));
      final id = _uuid.v4();
      final file = await _cipher.writeEncrypted(id, processed.jpeg);
      final row = LocalPhotosCompanion.insert(
        id: id,
        projectId: Value(target.projectId),
        ownerKind: _kindOf(target),
        reportId: Value(switch (target) {
          ReportItemTarget(:final reportId) => reportId,
          RevisionTarget(:final resubmissionId) => resubmissionId,
          _ => null,
        }),
        itemId: Value(switch (target) {
          ReportItemTarget(:final itemId) => itemId,
          RevisionTarget(:final serverItemId) => serverItemId,
          _ => null,
        }),
        issueId: Value(target is IssueTarget ? target.issueId : null),
        filePath: file.path,
        sha256: processed.sha256,
        sizeBytes: processed.jpeg.length,
        takenAt: stamp.takenAt.toUtc(),
        workDate: workDate,
        lat: Value(fix?.lat),
        lng: Value(fix?.lng),
        accuracyM: Value(fix?.accuracyM),
        mocked: Value(fix?.mocked ?? false),
      );
      await _db.into(_db.localPhotos).insert(row);
      return Ok(_entity(await (_db.select(_db.localPhotos)..where((t) => t.id.equals(id))).getSingle()));
    } on FormatException {
      return const Err(PermissionFailure(code: 'PHOTO_UNREADABLE', message: 'عکس خوانده نشد. دوباره عکس بگیرید.'));
    } on Object {
      // نوشتن فایل یا پایگاه داده؛ پیام فضای گوشی
      return const Err(StorageFailure());
    }
  }

  @override
  Stream<List<StoredPhoto>> watchFor(PhotoTarget target) => _query(target).watch().map((rows) => rows.map(_entity).toList());

  @override
  Future<List<StoredPhoto>> photosFor(PhotoTarget target) async => (await _query(target).get()).map(_entity).toList();

  @override
  Stream<List<StoredPhoto>> watchQuick(String workDate) => (_db.select(_db.localPhotos)
        ..where((t) => t.ownerKind.equals(PhotoOwner.quick) & t.workDate.equals(workDate))
        ..orderBy([(t) => OrderingTerm(expression: t.takenAt)]))
      .watch()
      .map((rows) => rows.map(_entity).toList());

  @override
  Future<Result<Unit>> attachQuick(String photoId, PhotoTarget target) async {
    try {
      final updated = await (_db.update(_db.localPhotos)..where((t) => t.id.equals(photoId) & t.ownerKind.equals(PhotoOwner.quick))).write(
        LocalPhotosCompanion(
          ownerKind: Value(_kindOf(target)),
          projectId: Value(target.projectId),
          reportId: Value(target is ReportItemTarget ? target.reportId : null),
          itemId: Value(target is ReportItemTarget ? target.itemId : null),
          issueId: Value(target is IssueTarget ? target.issueId : null),
        ),
      );
      return updated == 0 ? const Err(NotFoundFailure(message: 'این عکس دیگر در عکس‌های امروز نیست.')) : const Ok(unit);
    } on Object {
      return const Err(StorageFailure());
    }
  }

  @override
  Future<Result<Unit>> delete(String photoId) async {
    try {
      final row = await (_db.select(_db.localPhotos)..where((t) => t.id.equals(photoId))).getSingleOrNull();
      if (row == null) return const Ok(unit);
      await (_db.delete(_db.localPhotos)..where((t) => t.id.equals(photoId))).go();
      await _cipher.delete(row.filePath);
      return const Ok(unit);
    } on Object {
      return const Err(StorageFailure());
    }
  }

  @override
  Future<Uint8List?> bytesOf(String photoId) async {
    try {
      final row = await (_db.select(_db.localPhotos)..where((t) => t.id.equals(photoId))).getSingleOrNull();
      if (row == null || row.uploadState == 'uploaded') return null;
      return await _cipher.readDecrypted(row.filePath);
    } on Object {
      return null;
    }
  }

  SimpleSelectStatement<$LocalPhotosTable, LocalPhotoRow> _query(PhotoTarget target) {
    final q = _db.select(_db.localPhotos)..orderBy([(t) => OrderingTerm(expression: t.takenAt)]);
    switch (target) {
      case ReportItemTarget(:final reportId, :final itemId):
        q.where((t) => t.ownerKind.equals(PhotoOwner.report) & t.reportId.equals(reportId) & t.itemId.equals(itemId));
      case IssueTarget(:final issueId):
        q.where((t) => t.ownerKind.equals(PhotoOwner.issue) & t.issueId.equals(issueId));
      case RevisionTarget(:final resubmissionId):
        q.where((t) => t.ownerKind.equals(PhotoOwner.revision) & t.reportId.equals(resubmissionId));
      case QuickTarget():
        q.where((t) => t.ownerKind.equals(PhotoOwner.quick));
    }
    return q;
  }

  static String _kindOf(PhotoTarget target) => switch (target) {
    ReportItemTarget() => PhotoOwner.report,
    IssueTarget() => PhotoOwner.issue,
    RevisionTarget() => PhotoOwner.revision,
    QuickTarget() => PhotoOwner.quick,
  };

  static StoredPhoto _entity(LocalPhotoRow r) => StoredPhoto(
    id: r.id,
    sha256: r.sha256,
    sizeBytes: r.sizeBytes,
    takenAt: r.takenAt,
    workDate: r.workDate,
    lat: r.lat,
    lng: r.lng,
    accuracyM: r.accuracyM,
    mocked: r.mocked,
    uploaded: r.uploadState == 'uploaded',
  );
}
