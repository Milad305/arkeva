import 'dart:typed_data';

import 'package:bloc_concurrency/bloc_concurrency.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/error/failure.dart';
import 'package:projeyar_field/core/forms/inputs.dart';
import 'package:projeyar_field/core/l10n/fa_num.dart';
import 'package:projeyar_field/core/result/result.dart';
import 'package:projeyar_field/core/util/streams.dart';
import 'package:projeyar_field/features/activities/domain/entities/activity_entities.dart';
import 'package:projeyar_field/features/activities/domain/repositories/activities_repository.dart';
import 'package:projeyar_field/features/camera/domain/entities/photo_entities.dart';
import 'package:projeyar_field/features/camera/domain/repositories/photo_repository.dart';
import 'package:projeyar_field/features/reports/domain/entities/report_entities.dart';
import 'package:projeyar_field/features/reports/domain/repositories/reports_repository.dart';
import 'package:uuid/uuid.dart';

part 'revision_bloc.freezed.dart';

sealed class RevisionEvent {
  const RevisionEvent();
}

final class RevisionStarted extends RevisionEvent {
  const RevisionStarted(this.itemId);
  final String itemId;
}

final class RevisionValueChanged extends RevisionEvent {
  const RevisionValueChanged(this.value);
  final String value;
}

final class RevisionStepChanged extends RevisionEvent {
  const RevisionStepChanged(this.key, this.percent);
  final String key;
  final double percent;
}

final class RevisionCheckToggled extends RevisionEvent {
  const RevisionCheckToggled(this.key);
  final String key;
}

final class RevisionReplyChanged extends RevisionEvent {
  const RevisionReplyChanged(this.value);
  final String value;
}

final class RevisionPhotoDeleted extends RevisionEvent {
  const RevisionPhotoDeleted(this.photoId);
  final String photoId;
}

final class RevisionSubmitted extends RevisionEvent {
  const RevisionSubmitted();
}

enum RevisionStatus { loading, ready, submitting, queued, missing }

@freezed
abstract class RevisionState with _$RevisionState {
  const factory RevisionState({
    required String resubmissionId,
    @Default(RevisionStatus.loading) RevisionStatus status,
    ServerItem? item,
    Activity? activity,

    /// مقدار تازه: مقدار امروز (روش مقداری) یا درصد تجمعی
    @Default('') String value,
    @Default(<String, double>{}) Map<String, double> steps,
    @Default(<String>{}) Set<String> checkedKeys,
    @Default(LimitedText.pure(maxLength: 2000)) LimitedText reply,
    @Default(<StoredPhoto>[]) List<StoredPhoto> newPhotos,
    @Default(false) bool alreadyQueued,
    @Default(false) bool showErrors,
    Failure? failure,
  }) = _RevisionState;

  const RevisionState._();

  RevisionRequest? get request => item?.revision;

  int get requiredPhotos => request?.requiredNewPhotos ?? 0;

  bool get checksDone => (request?.actions ?? const []).where((a) => !a.isPhoto).every((a) => checkedKeys.contains(a.key));

  /// AC-FA-09: «ارسال دوباره» تا انجام همهٔ کارهای نوع `photo` (افزودن عکس تازه) غیرفعال است.
  bool get photosDone => newPhotos.length >= requiredPhotos;

  ProgressValues get values {
    final number = parseLocalizedNumber(value)?.toDouble();
    return switch (activity?.method) {
      MeasureMethod.quantity => ProgressValues(quantityToday: number),
      MeasureMethod.steps => ProgressValues(steps: steps),
      _ => ProgressValues(reportedPercent: number),
    };
  }

  bool get valueValid {
    if (activity?.method == MeasureMethod.steps) return steps.isNotEmpty;
    final n = parseLocalizedNumber(value);
    if (n == null || n < 0) return false;
    return activity?.method == MeasureMethod.quantity || n <= 100;
  }

  bool get canResubmit => status == RevisionStatus.ready && !alreadyQueued && photosDone && checksDone;

  String? get valueError => showErrors && !valueValid ? 'مقدار را درست وارد کنید.' : null;
}

/// M11 اصلاح (F08 ۴.۷؛ AC-FA-09).
@injectable
class RevisionBloc extends Bloc<RevisionEvent, RevisionState> {
  RevisionBloc(this._reports, this._activities, this._photos) : super(RevisionState(resubmissionId: const Uuid().v4())) {
    on<RevisionStarted>(_onStarted, transformer: restartable());
    on<RevisionValueChanged>((e, emit) => emit(state.copyWith(value: e.value)));
    on<RevisionStepChanged>((e, emit) => emit(state.copyWith(steps: {...state.steps, e.key: e.percent})));
    on<RevisionCheckToggled>((e, emit) {
      final next = {...state.checkedKeys};
      if (!next.remove(e.key)) next.add(e.key);
      emit(state.copyWith(checkedKeys: next));
    });
    on<RevisionReplyChanged>((e, emit) => emit(state.copyWith(reply: state.reply.change(e.value))));
    on<RevisionPhotoDeleted>((e, emit) async => _photos.delete(e.photoId));
    on<RevisionSubmitted>(_onSubmitted, transformer: droppable());
  }

  final ReportsRepository _reports;
  final ActivitiesRepository _activities;
  final PhotoRepository _photos;

  RevisionTarget? get photoTarget {
    final item = state.item;
    return item == null ? null : RevisionTarget(projectId: item.projectId, resubmissionId: state.resubmissionId, serverItemId: item.id);
  }

  Future<Uint8List?> photoBytes(String id) => _photos.bytesOf(id);

  Future<void> _onStarted(RevisionStarted event, Emitter<RevisionState> emit) async {
    final first = await _reports.watchServerItem(event.itemId).first;
    if (first == null) {
      emit(state.copyWith(status: RevisionStatus.missing));
      return;
    }
    final activity = await _activities.activity(first.activityId);
    final previous = first.computedPercent;
    emit(
      state.copyWith(
        status: RevisionStatus.ready,
        item: first,
        activity: activity,
        value: activity?.method == MeasureMethod.percent && previous != null ? toFaDigits(previous.toStringAsFixed(previous == previous.roundToDouble() ? 0 : 1)) : '',
        steps: {for (final s in activity?.steps ?? const <ActivityStep>[]) s.key: s.approvedPercent},
      ),
    );
    await emit.forEach<(ServerItem?, Set<String>, List<StoredPhoto>)>(
      combineLatest3(
        _reports.watchServerItem(event.itemId),
        _reports.watchQueuedResubmissions(),
        _photos.watchFor(photoTarget!),
        (a, b, c) => (a, b, c),
      ),
      onData: (v) {
        final item = v.$1;
        if (item == null) return state.copyWith(status: state.status == RevisionStatus.queued ? RevisionStatus.queued : RevisionStatus.missing);
        return state.copyWith(item: item, alreadyQueued: v.$2.contains(item.id), newPhotos: v.$3);
      },
    );
  }

  Future<void> _onSubmitted(RevisionSubmitted event, Emitter<RevisionState> emit) async {
    if (!state.canResubmit) return;
    if (!state.valueValid || state.reply.isNotValid) {
      emit(state.copyWith(showErrors: true));
      return;
    }
    emit(state.copyWith(status: RevisionStatus.submitting, failure: null));
    final result = await _reports.resubmit(
      ResubmissionInput(id: state.resubmissionId, item: state.item!, values: state.values, reply: state.reply.trimmedOrNull),
    );
    switch (result) {
      case Ok():
        emit(state.copyWith(status: RevisionStatus.queued));
      case Err(:final failure):
        emit(state.copyWith(status: RevisionStatus.ready, failure: failure));
    }
  }
}
