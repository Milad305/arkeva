import 'dart:typed_data';

import 'package:bloc_concurrency/bloc_concurrency.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/error/failure.dart';
import 'package:projeyar_field/core/forms/inputs.dart';
import 'package:projeyar_field/core/l10n/fa_num.dart';
import 'package:projeyar_field/core/result/result.dart';
import 'package:projeyar_field/core/time/clock.dart';
import 'package:projeyar_field/core/util/streams.dart';
import 'package:projeyar_field/features/activities/domain/entities/activity_entities.dart';
import 'package:projeyar_field/features/activities/domain/repositories/activities_repository.dart';
import 'package:projeyar_field/features/camera/domain/entities/photo_entities.dart';
import 'package:projeyar_field/features/camera/domain/repositories/photo_repository.dart';
import 'package:projeyar_field/features/reports/domain/entities/report_entities.dart';
import 'package:projeyar_field/features/reports/domain/repositories/reports_repository.dart';
import 'package:projeyar_field/features/reports/domain/services/progress_preview.dart';

part 'report_form_bloc.freezed.dart';

sealed class ReportFormEvent {
  const ReportFormEvent();
}

final class ReportFormStarted extends ReportFormEvent {
  const ReportFormStarted({required this.projectId, required this.activityId});
  final String projectId;
  final String activityId;
}

final class ReportQuantityChanged extends ReportFormEvent {
  const ReportQuantityChanged(this.value);
  final String value;
}

final class ReportPercentChanged extends ReportFormEvent {
  const ReportPercentChanged(this.value);
  final String value;
}

final class ReportPercentQuantityChanged extends ReportFormEvent {
  const ReportPercentQuantityChanged(this.value);
  final String value;
}

final class ReportStepChanged extends ReportFormEvent {
  const ReportStepChanged(this.key, this.percent);
  final String key;
  final double percent;
}

final class ReportCrewChanged extends ReportFormEvent {
  const ReportCrewChanged(this.value);
  final String value;
}

final class ReportNoteChanged extends ReportFormEvent {
  const ReportNoteChanged(this.value);
  final String value;
}

final class ReportWorkDateChanged extends ReportFormEvent {
  const ReportWorkDateChanged(this.workDate);
  final String workDate;
}

final class ReportWeatherChanged extends ReportFormEvent {
  const ReportWeatherChanged(this.weather);
  final Weather? weather;
}

final class ReportTemperatureChanged extends ReportFormEvent {
  const ReportTemperatureChanged(this.value);
  final String value;
}

final class ReportPhotoDeleted extends ReportFormEvent {
  const ReportPhotoDeleted(this.photoId);
  final String photoId;
}

final class ReportQuickPhotoAttached extends ReportFormEvent {
  const ReportQuickPhotoAttached(this.photoId);
  final String photoId;
}

/// ذخیرهٔ آیتم و رفتن به M08.
final class ReportItemSaved extends ReportFormEvent {
  const ReportItemSaved();
}

final class _PhotosUpdated extends ReportFormEvent {
  const _PhotosUpdated(this.photos, this.quick);
  final List<StoredPhoto> photos;
  final List<StoredPhoto> quick;
}

enum ReportFormStatus { loading, ready, saving, saved, failure }

@freezed
abstract class ReportFormState with _$ReportFormState {
  const factory ReportFormState({
    required String today,
    @Default(ReportFormStatus.loading) ReportFormStatus status,
    Activity? activity,
    Project? project,
    String? reportId,
    String? itemId,
    String? workDate,
    Weather? weather,
    @Default(QuantityInput.pure()) QuantityInput quantity,
    @Default(PercentInput.pure()) PercentInput percent,
    @Default(OptionalQuantityInput.pure()) OptionalQuantityInput percentQuantity,
    @Default(<String, double>{}) Map<String, double> steps,
    @Default(BoundedIntInput.pure(min: 0, max: 10000)) BoundedIntInput crew,
    @Default(BoundedIntInput.pure(min: -60, max: 70)) BoundedIntInput temperature,
    @Default(LimitedText.pure(maxLength: 2000)) LimitedText note,
    @Default(<StoredPhoto>[]) List<StoredPhoto> photos,
    @Default(<StoredPhoto>[]) List<StoredPhoto> quickPhotos,
    @Default(false) bool showErrors,
    ProgressPreview? preview,
    Failure? failure,
  }) = _ReportFormState;

  const ReportFormState._();

  /// تاریخ کار: امروز تا ۳ روز قبل (F08 ۴.۵).
  String get earliestWorkDate => TehranTime.addDays(today, -3);

  ProgressValues get values => switch (activity?.method) {
    MeasureMethod.quantity => ProgressValues(quantityToday: quantity.number),
    MeasureMethod.percent => ProgressValues(reportedPercent: percent.number, quantityToday: percentQuantity.number),
    MeasureMethod.steps => ProgressValues(steps: steps),
    null => const ProgressValues(),
  };

  String? get quantityError => showErrors ? quantity.error?.message() : null;
  String? get percentError => showErrors ? percent.error?.message(range: '۰ تا ۱۰۰') : null;
  String? get crewError => showErrors ? crew.error?.message(range: crew.rangeText) : null;
  String? get temperatureError => showErrors ? temperature.error?.message(range: '${toFaDigits('-60')} تا ${toFaDigits(70)}') : null;
  String? get noteError => showErrors ? note.messageOf(note.error) : null;
}

/// M06 ثبت پیشرفت به تفکیک روش، با پیش‌نمایش خالص domain (AC-FA-07) و عکس‌ها.
@injectable
class ReportFormBloc extends Bloc<ReportFormEvent, ReportFormState> {
  ReportFormBloc(this._activities, this._reports, this._photos, Clock clock) : super(ReportFormState(today: TehranTime.today(clock.now()))) {
    on<ReportFormStarted>(_onStarted, transformer: droppable());
    on<_PhotosUpdated>((e, emit) => emit(_withPreview(state.copyWith(photos: e.photos, quickPhotos: e.quick))));
    on<ReportQuantityChanged>((e, emit) => emit(_withPreview(state.copyWith(quantity: QuantityInput.dirty(e.value), failure: null))));
    on<ReportPercentChanged>((e, emit) => emit(_withPreview(state.copyWith(percent: PercentInput.dirty(e.value), failure: null))));
    on<ReportPercentQuantityChanged>((e, emit) => emit(_withPreview(state.copyWith(percentQuantity: OptionalQuantityInput.dirty(e.value)))));
    on<ReportStepChanged>((e, emit) => emit(_withPreview(state.copyWith(steps: {...state.steps, e.key: e.percent}))));
    on<ReportCrewChanged>((e, emit) => emit(state.copyWith(crew: state.crew.change(e.value))));
    on<ReportNoteChanged>((e, emit) => emit(state.copyWith(note: state.note.change(e.value))));
    on<ReportTemperatureChanged>((e, emit) => emit(state.copyWith(temperature: state.temperature.change(e.value))));
    on<ReportWeatherChanged>((e, emit) => emit(state.copyWith(weather: e.weather)));
    on<ReportWorkDateChanged>((e, emit) {
      if (e.workDate.compareTo(state.today) > 0 || e.workDate.compareTo(state.earliestWorkDate) < 0) return;
      emit(state.copyWith(workDate: e.workDate));
    });
    on<ReportPhotoDeleted>((e, emit) async {
      final r = await _photos.delete(e.photoId);
      if (r.failureOrNull != null) emit(state.copyWith(failure: r.failureOrNull));
    });
    on<ReportQuickPhotoAttached>((e, emit) async {
      final target = photoTarget;
      if (target == null) return;
      final r = await _photos.attachQuick(e.photoId, target);
      if (r.failureOrNull != null) emit(state.copyWith(failure: r.failureOrNull));
    });
    on<ReportItemSaved>(_onSaved, transformer: droppable());
  }

  final ActivitiesRepository _activities;
  final ReportsRepository _reports;
  final PhotoRepository _photos;

  ReportItemTarget? get photoTarget {
    final reportId = state.reportId;
    final itemId = state.itemId;
    final project = state.project;
    return reportId == null || itemId == null || project == null
        ? null
        : ReportItemTarget(projectId: project.id, reportId: reportId, itemId: itemId);
  }

  Future<Uint8List?> photoBytes(String id) => _photos.bytesOf(id);

  Future<void> _onStarted(ReportFormStarted event, Emitter<ReportFormState> emit) async {
    final activity = await _activities.activity(event.activityId);
    final project = await _activities.project(event.projectId);
    if (activity == null || project == null) {
      emit(state.copyWith(status: ReportFormStatus.failure, failure: const NotFoundFailure(message: 'این فعالیت دیگر به شما سپرده نیست. فهرست را تازه کنید.')));
      return;
    }
    final draftResult = await _reports.openDraft(projectId: project.id, workDate: state.today);
    final draft = draftResult.valueOrNull;
    if (draft == null) {
      emit(state.copyWith(status: ReportFormStatus.failure, failure: draftResult.failureOrNull));
      return;
    }
    final itemResult = await _reports.ensureItem(draft.id, activity.id);
    final item = itemResult.valueOrNull;
    if (item == null) {
      emit(state.copyWith(status: ReportFormStatus.failure, failure: itemResult.failureOrNull));
      return;
    }
    final v = item.values;
    emit(
      _withPreview(
        state.copyWith(
          status: ReportFormStatus.ready,
          activity: activity,
          project: project,
          reportId: draft.id,
          itemId: item.id,
          workDate: draft.workDate.compareTo(state.earliestWorkDate) < 0 ? state.today : draft.workDate,
          weather: draft.weather,
          temperature: draft.temperatureC == null ? state.temperature : state.temperature.change(toFaDigits(draft.temperatureC)),
          quantity: v.quantityToday == null ? const QuantityInput.pure() : QuantityInput.dirty(_num(v.quantityToday!)),
          percent: v.reportedPercent == null ? const PercentInput.pure() : PercentInput.dirty(_num(v.reportedPercent!)),
          percentQuantity: activity.method == MeasureMethod.percent && v.quantityToday != null
              ? OptionalQuantityInput.dirty(_num(v.quantityToday!))
              : const OptionalQuantityInput.pure(),
          steps: {for (final s in activity.steps) s.key: v.steps[s.key] ?? s.approvedPercent},
          crew: item.crewCount == null ? state.crew : state.crew.change(toFaDigits(item.crewCount)),
          note: state.note.change(item.note ?? ''),
        ),
      ),
    );
    final target = photoTarget!;
    await emit.onEach<(List<StoredPhoto>, List<StoredPhoto>)>(
      combineLatest2(_photos.watchFor(target), _photos.watchQuick(state.today), (a, b) => (a, b)),
      onData: (v) => add(_PhotosUpdated(v.$1, v.$2)),
    );
  }

  ReportFormState _withPreview(ReportFormState s) {
    final activity = s.activity;
    final project = s.project;
    if (activity == null || project == null) return s;
    return s.copyWith(
      preview: ProgressPreviewer.preview(
        activity: activity,
        rules: project.rules,
        values: s.values,
        photos: [for (final p in s.photos) PhotoSpot(lat: p.lat, lng: p.lng)],
        site: project.site,
      ),
    );
  }

  bool _valid(ReportFormState s) {
    final methodOk = switch (s.activity?.method) {
      MeasureMethod.quantity => s.quantity.isValid,
      MeasureMethod.percent => s.percent.isValid && s.percentQuantity.isValid,
      MeasureMethod.steps => s.steps.isNotEmpty,
      null => false,
    };
    return methodOk && s.crew.isValid && s.temperature.isValid && s.note.isValid;
  }

  Future<void> _onSaved(ReportItemSaved event, Emitter<ReportFormState> emit) async {
    final s = _withPreview(
      state.copyWith(
        quantity: QuantityInput.dirty(state.quantity.value),
        percent: PercentInput.dirty(state.percent.value),
        showErrors: true,
        failure: null,
      ),
    );
    if (!_valid(s) || (s.preview?.blocking ?? false)) {
      emit(s);
      return;
    }
    emit(s.copyWith(status: ReportFormStatus.saving));
    final header = await _reports.updateHeader(s.reportId!, workDate: s.workDate ?? s.today, weather: s.weather, temperatureC: s.temperature.number);
    final saved = await header.then(
      (_) => _reports.saveItem(
        s.reportId!,
        DraftItem(id: s.itemId!, activityId: s.activity!.id, values: s.values, crewCount: s.crew.number, note: s.note.trimmedOrNull),
      ),
    );
    switch (saved) {
      case Ok():
        emit(s.copyWith(status: ReportFormStatus.saved));
      case Err(:final failure):
        emit(s.copyWith(status: ReportFormStatus.ready, failure: failure));
    }
  }

  static String _num(double v) => toFaDigits(v == v.roundToDouble() ? v.toInt() : v).replaceAll('.', '٫');
}
