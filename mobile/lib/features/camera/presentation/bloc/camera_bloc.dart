import 'dart:typed_data';

import 'package:bloc_concurrency/bloc_concurrency.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/device/location.dart';
import 'package:projeyar_field/core/error/failure.dart';
import 'package:projeyar_field/core/result/result.dart';
import 'package:projeyar_field/core/time/clock.dart';
import 'package:projeyar_field/features/camera/domain/entities/photo_entities.dart';
import 'package:projeyar_field/features/camera/domain/repositories/photo_repository.dart';

part 'camera_bloc.freezed.dart';

sealed class CameraEvent {
  const CameraEvent();
}

/// بایت‌های JPEG خام دوربین (فقط `camera`؛ AC-FA-04).
final class CameraShotTaken extends CameraEvent {
  const CameraShotTaken(this.bytes);
  final Uint8List bytes;
}

final class CameraDeviceFailed extends CameraEvent {
  const CameraDeviceFailed(this.failure);
  final Failure failure;
}

enum CameraStatus { ready, processing, failure }

@freezed
abstract class CameraState with _$CameraState {
  const factory CameraState({
    required CaptureRequest request,
    @Default(CameraStatus.ready) CameraStatus status,
    @Default(<StoredPhoto>[]) List<StoredPhoto> taken,
    Failure? failure,

    /// GPS این عکس در دسترس نبود؛ عکس بی مختصات ذخیره شد.
    Failure? locationWarning,
  }) = _CameraState;
}

/// M07 دوربین: GPS هر عکس (`isMocked`)، مهر روی پیکسل، کوچک‌سازی، هش و رمز.
@injectable
class CameraBloc extends Bloc<CameraEvent, CameraState> {
  CameraBloc(this._photos, this._location, this._clock, @factoryParam CaptureRequest? request)
    : super(CameraState(request: request ?? const CaptureRequest(target: QuickTarget(), workDate: '', supervisorName: ''))) {
    on<CameraShotTaken>(_onShot, transformer: droppable());
    on<CameraDeviceFailed>((e, emit) => emit(state.copyWith(status: CameraStatus.failure, failure: e.failure)));
  }

  final PhotoRepository _photos;
  final LocationService _location;
  final Clock _clock;

  Future<void> _onShot(CameraShotTaken event, Emitter<CameraState> emit) async {
    emit(state.copyWith(status: CameraStatus.processing, failure: null, locationWarning: null));
    final takenAt = _clock.now();
    final fixResult = await _location.current();
    final fix = fixResult.valueOrNull;
    final r = state.request;
    bool? inside;
    if (fix != null && r.siteLat != null && r.siteLng != null && r.siteRadiusM != null) {
      inside = distanceMeters(fix.lat, fix.lng, r.siteLat!, r.siteLng!) <= r.siteRadiusM!;
    }
    final stamp = StampInfo(
      takenAt: takenAt,
      supervisorName: r.supervisorName,
      siteName: r.siteName,
      activityCode: r.activityCode,
      lat: fix?.lat,
      lng: fix?.lng,
      accuracyM: fix?.accuracyM,
      insideSite: inside,
    );
    final saved = await _photos.save(rawJpeg: event.bytes, target: r.target, stamp: stamp, workDate: r.workDate, fix: fix);
    switch (saved) {
      case Ok(:final value):
        emit(state.copyWith(status: CameraStatus.ready, taken: [...state.taken, value], locationWarning: fixResult.failureOrNull));
      case Err(:final failure):
        emit(state.copyWith(status: CameraStatus.ready, failure: failure));
    }
  }
}
