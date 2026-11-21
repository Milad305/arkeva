import 'dart:async';
import 'dart:typed_data';

import 'package:bloc_concurrency/bloc_concurrency.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/error/failure.dart';
import 'package:projeyar_field/core/forms/inputs.dart';
import 'package:projeyar_field/core/result/result.dart';
import 'package:projeyar_field/core/time/clock.dart';
import 'package:projeyar_field/features/activities/domain/entities/activity_entities.dart';
import 'package:projeyar_field/features/activities/domain/repositories/activities_repository.dart';
import 'package:projeyar_field/features/camera/domain/entities/photo_entities.dart';
import 'package:projeyar_field/features/camera/domain/repositories/photo_repository.dart';
import 'package:projeyar_field/features/issues/domain/entities/issue_entities.dart';
import 'package:projeyar_field/features/issues/domain/repositories/issues_repository.dart';

part 'issue_form_bloc.freezed.dart';

sealed class IssueFormEvent {
  const IssueFormEvent();
}

final class IssueFormStarted extends IssueFormEvent {
  const IssueFormStarted({this.activityId});
  final String? activityId;
}

final class IssueProjectChanged extends IssueFormEvent {
  const IssueProjectChanged(this.projectId);
  final String projectId;
}

final class IssueTypeChanged extends IssueFormEvent {
  const IssueTypeChanged(this.type);
  final IssueType type;
}

final class IssueEffectChanged extends IssueFormEvent {
  const IssueEffectChanged(this.effect);
  final IssueEffect effect;
}

final class IssueTitleChanged extends IssueFormEvent {
  const IssueTitleChanged(this.value);
  final String value;
}

final class IssueDescriptionChanged extends IssueFormEvent {
  const IssueDescriptionChanged(this.value);
  final String value;
}

final class IssueActivityChanged extends IssueFormEvent {
  const IssueActivityChanged(this.activityId);
  final String? activityId;
}

final class IssuePhotoDeleted extends IssueFormEvent {
  const IssuePhotoDeleted(this.photoId);
  final String photoId;
}

final class IssueSubmitted extends IssueFormEvent {
  const IssueSubmitted();
}

enum IssueFormStatus { loading, ready, submitting, saved }

@freezed
abstract class IssueFormState with _$IssueFormState {
  const factory IssueFormState({
    required String issueId,
    required String today,
    @Default(IssueFormStatus.loading) IssueFormStatus status,
    @Default(<Project>[]) List<Project> projects,
    @Default(<Activity>[]) List<Activity> activities,
    String? projectId,
    IssueType? type,
    IssueEffect? effect,
    String? activityId,
    @Default(LimitedText.pure(maxLength: 200, isRequired: true)) LimitedText title,
    @Default(LimitedText.pure(maxLength: 4000)) LimitedText description,
    @Default(<StoredPhoto>[]) List<StoredPhoto> photos,
    @Default(false) bool showErrors,
    Failure? failure,
  }) = _IssueFormState;

  const IssueFormState._();

  static const maxPhotos = 5;

  Project? get project => projects.where((p) => p.id == projectId).firstOrNull;

  List<Activity> get projectActivities => activities.where((a) => a.projectId == projectId).toList();

  String? get typeError => showErrors && type == null ? 'نوع مشکل را انتخاب کنید.' : null;
  String? get effectError => showErrors && effect == null ? 'اثر بر کار را انتخاب کنید.' : null;
  String? get titleError => showErrors ? title.messageOf(title.error) : null;
  String? get descriptionError => showErrors ? description.messageOf(description.error) : null;

  bool get valid => projectId != null && type != null && effect != null && title.isValid && description.isValid && photos.length <= maxPhotos;
}

/// M13 گزارش مشکل کارگاه: آفلاین در صف با UUID گوشی (F08 ۴.۸).
@injectable
class IssueFormBloc extends Bloc<IssueFormEvent, IssueFormState> {
  IssueFormBloc(this._issues, this._activities, this._photos, Clock clock)
    : super(IssueFormState(issueId: _issues.newIssueId(), today: TehranTime.today(clock.now()))) {
    on<IssueFormStarted>(_onStarted, transformer: droppable());
    on<IssueProjectChanged>((e, emit) => emit(state.copyWith(projectId: e.projectId, activityId: null)));
    on<IssueTypeChanged>((e, emit) => emit(state.copyWith(type: e.type)));
    on<IssueEffectChanged>((e, emit) => emit(state.copyWith(effect: e.effect)));
    on<IssueTitleChanged>((e, emit) => emit(state.copyWith(title: state.title.change(e.value))));
    on<IssueDescriptionChanged>((e, emit) => emit(state.copyWith(description: state.description.change(e.value))));
    on<IssueActivityChanged>((e, emit) => emit(state.copyWith(activityId: e.activityId)));
    on<IssuePhotoDeleted>((e, emit) async => _photos.delete(e.photoId));
    on<_IssuePhotosUpdated>((e, emit) => emit(state.copyWith(photos: e.photos)));
    on<IssueSubmitted>(_onSubmitted, transformer: droppable());
  }

  final IssuesRepository _issues;
  final ActivitiesRepository _activities;
  final PhotoRepository _photos;
  StreamSubscription<List<StoredPhoto>>? _photoSub;

  IssueTarget? get photoTarget {
    final projectId = state.projectId;
    return projectId == null ? null : IssueTarget(projectId: projectId, issueId: state.issueId);
  }

  Future<Uint8List?> photoBytes(String id) => _photos.bytesOf(id);

  Future<void> _onStarted(IssueFormStarted event, Emitter<IssueFormState> emit) async {
    final projects = await _activities.watchProjects().first;
    final activities = await _activities.watchActivities().first;
    final activity = event.activityId == null ? null : activities.where((a) => a.id == event.activityId).firstOrNull;
    emit(
      state.copyWith(
        status: IssueFormStatus.ready,
        projects: projects,
        activities: activities,
        projectId: activity?.projectId ?? projects.firstOrNull?.id,
        activityId: activity?.id,
      ),
    );
    // عکس‌ها به شناسهٔ مشکل بسته‌اند، نه پروژه؛ تغییر پروژه آن‌ها را جابه‌جا نمی‌کند
    _photoSub = _photos
        .watchFor(IssueTarget(projectId: state.projectId ?? '', issueId: state.issueId))
        .listen((p) => add(_IssuePhotosUpdated(p)));
  }

  Future<void> _onSubmitted(IssueSubmitted event, Emitter<IssueFormState> emit) async {
    final s = state.copyWith(showErrors: true, title: state.title.change(state.title.value), failure: null);
    if (!s.valid) {
      emit(s);
      return;
    }
    emit(s.copyWith(status: IssueFormStatus.submitting));
    final result = await _issues.submit(
      IssueDraft(
        id: s.issueId,
        projectId: s.projectId!,
        type: s.type!,
        title: s.title.value.trim(),
        effect: s.effect!,
        description: s.description.trimmedOrNull,
        activityId: s.activityId,
      ),
    );
    switch (result) {
      case Ok():
        emit(s.copyWith(status: IssueFormStatus.saved));
      case Err(:final failure):
        emit(s.copyWith(status: IssueFormStatus.ready, failure: failure));
    }
  }

  @override
  Future<void> close() async {
    await _photoSub?.cancel();
    // عکس‌های مشکلی که ذخیره نشد در گوشی نمی‌مانند
    if (state.status != IssueFormStatus.saved) await _issues.discard(state.issueId);
    return super.close();
  }
}

final class _IssuePhotosUpdated extends IssueFormEvent {
  const _IssuePhotosUpdated(this.photos);
  final List<StoredPhoto> photos;
}
