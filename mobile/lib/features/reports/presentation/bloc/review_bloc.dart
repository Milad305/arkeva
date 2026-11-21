import 'package:bloc_concurrency/bloc_concurrency.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/device/location.dart';
import 'package:projeyar_field/core/error/failure.dart';
import 'package:projeyar_field/core/network/network_info.dart';
import 'package:projeyar_field/core/result/result.dart';
import 'package:projeyar_field/core/time/clock.dart';
import 'package:projeyar_field/features/activities/domain/entities/activity_entities.dart';
import 'package:projeyar_field/features/activities/domain/repositories/activities_repository.dart';
import 'package:projeyar_field/features/camera/domain/entities/photo_entities.dart';
import 'package:projeyar_field/features/camera/domain/repositories/photo_repository.dart';
import 'package:projeyar_field/features/reports/domain/entities/report_entities.dart';
import 'package:projeyar_field/features/reports/domain/repositories/reports_repository.dart';
import 'package:projeyar_field/features/reports/domain/services/progress_preview.dart';
import 'package:projeyar_field/features/reports/domain/services/route_preview.dart';

part 'review_bloc.freezed.dart';

sealed class ReviewEvent {
  const ReviewEvent();
}

final class ReviewStarted extends ReviewEvent {
  const ReviewStarted(this.reportId);
  final String reportId;
}

final class ReviewAttestChanged extends ReviewEvent {
  const ReviewAttestChanged({required this.value});
  final bool value;
}

final class ReviewItemRemoved extends ReviewEvent {
  const ReviewItemRemoved(this.itemId);
  final String itemId;
}

final class ReviewSubmitted extends ReviewEvent {
  const ReviewSubmitted();
}

final class ReviewDiscarded extends ReviewEvent {
  const ReviewDiscarded();
}

/// یک ردیف بازبینی: «قبل ← بعد» و هشدارها.
final class ReviewLine extends Equatable {
  const ReviewLine({required this.item, required this.activity, required this.photoCount, required this.preview});

  final DraftItem item;
  final Activity? activity;
  final int photoCount;
  final ProgressPreview? preview;

  @override
  List<Object?> get props => [item, activity, photoCount, preview];
}

enum ReviewStatus { loading, ready, submitting, queued, discarded, missing }

@freezed
abstract class ReviewState with _$ReviewState {
  const factory ReviewState({
    @Default(ReviewStatus.loading) ReviewStatus status,
    ReportDraft? draft,
    Project? project,
    @Default(<ReviewLine>[]) List<ReviewLine> lines,
    RoutePreview? route,
    @Default(false) bool attested,
    @Default(false) bool online,
    @Default(false) bool showErrors,
    Failure? failure,
  }) = _ReviewState;

  const ReviewState._();

  /// مانع‌های سمت گوشی: فعالیت ناقص، یا کاهش ممنوع و عکس کمتر از حداقل (rules ۱۱).
  bool get hasBlocking => lines.isEmpty || lines.any((l) => !l.item.isComplete || (l.preview?.blocking ?? false));

  /// دکمهٔ ارسال تا تیک تعهد غیرفعال است (F08 ۴.۶).
  bool get canSubmit => attested && status == ReviewStatus.ready;
}

/// M08 بازبینی و ارسال: «قبل ← بعد»، پیش‌نمایش مسیر، تعهد، ذخیره در صف.
@injectable
class ReviewBloc extends Bloc<ReviewEvent, ReviewState> {
  ReviewBloc(this._reports, this._activities, this._photos, this._location, this._network, this._clock) : super(const ReviewState()) {
    on<ReviewStarted>(_onStarted, transformer: restartable());
    on<ReviewAttestChanged>((e, emit) => emit(state.copyWith(attested: e.value)));
    on<ReviewItemRemoved>((e, emit) async {
      final r = await _reports.removeItem(state.draft!.id, e.itemId);
      if (r.failureOrNull != null) emit(state.copyWith(failure: r.failureOrNull));
    });
    on<ReviewSubmitted>(_onSubmitted, transformer: droppable());
    on<ReviewDiscarded>((e, emit) async {
      final r = await _reports.discardDraft(state.draft!.id);
      emit(r.isOk ? state.copyWith(status: ReviewStatus.discarded) : state.copyWith(failure: r.failureOrNull));
    }, transformer: droppable());
  }

  final ReportsRepository _reports;
  final ActivitiesRepository _activities;
  final PhotoRepository _photos;
  final LocationService _location;
  final NetworkInfo _network;
  final Clock _clock;

  Future<void> _onStarted(ReviewStarted event, Emitter<ReviewState> emit) async {
    emit(state.copyWith(online: (await _network.current()).isOnline));
    await emit.forEach<ReviewState>(
      _reports.watchReport(event.reportId).asyncMap(_build),
      onData: (s) => s,
    );
  }

  Future<ReviewState> _build(ReportDraft? draft) async {
    if (draft == null) return state.copyWith(status: state.status == ReviewStatus.discarded ? ReviewStatus.discarded : ReviewStatus.missing);
    final project = state.project ?? await _activities.project(draft.projectId);
    final lines = <ReviewLine>[];
    final activities = <Activity>[];
    for (final item in draft.items) {
      final activity = await _activities.activity(item.activityId);
      if (activity != null) activities.add(activity);
      final photos = await _photos.photosFor(ReportItemTarget(projectId: draft.projectId, reportId: draft.id, itemId: item.id));
      lines.add(
        ReviewLine(
          item: item,
          activity: activity,
          photoCount: photos.length,
          preview: activity == null || project == null
              ? null
              : ProgressPreviewer.preview(
                  activity: activity,
                  rules: project.rules,
                  values: item.values,
                  photos: [for (final p in photos) PhotoSpot(lat: p.lat, lng: p.lng)],
                  site: project.site,
                ),
        ),
      );
    }
    final keep = state.status == ReviewStatus.submitting || state.status == ReviewStatus.queued;
    return state.copyWith(
      status: keep ? state.status : (draft.state == LocalReportState.draft ? ReviewStatus.ready : ReviewStatus.queued),
      draft: draft,
      project: project,
      lines: lines,
      route: project == null ? null : RoutePreview.of(activities, project.rules),
    );
  }

  Future<void> _onSubmitted(ReviewSubmitted event, Emitter<ReviewState> emit) async {
    if (!state.attested || state.draft == null) return;
    if (state.hasBlocking) {
      emit(state.copyWith(showErrors: true, failure: const ValidationFailure(message: 'چند فعالیت این گزارش کامل نیست. آن‌ها را ویرایش یا حذف کنید.')));
      return;
    }
    emit(state.copyWith(status: ReviewStatus.submitting, failure: null));
    // موقعیت گزارش = لحظهٔ ذخیره (F08 ۶)؛ نبودش مانع نیست
    final gps = (await _location.current()).valueOrNull;
    final result = await _reports.submit(state.draft!.id, attestedAt: _clock.now(), gps: gps);
    switch (result) {
      case Ok():
        emit(state.copyWith(status: ReviewStatus.queued, online: (await _network.current()).isOnline));
      case Err(:final failure):
        emit(state.copyWith(status: ReviewStatus.ready, failure: failure));
    }
  }
}
