import 'package:bloc_concurrency/bloc_concurrency.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/time/clock.dart';
import 'package:projeyar_field/core/util/streams.dart';
import 'package:projeyar_field/features/activities/domain/entities/activity_entities.dart';
import 'package:projeyar_field/features/activities/domain/repositories/activities_repository.dart';
import 'package:projeyar_field/features/activities/domain/services/activity_schedule.dart';

part 'activities_bloc.freezed.dart';

/// فیلتر وضعیت M04.
enum ActivityFilter { all, today, behind, pending, done }

sealed class ActivitiesEvent {
  const ActivitiesEvent();
}

final class ActivitiesStarted extends ActivitiesEvent {
  const ActivitiesStarted();
}

final class ActivitiesFilterChanged extends ActivitiesEvent {
  const ActivitiesFilterChanged(this.filter);
  final ActivityFilter filter;
}

/// گروه «پروژه ← والد».
final class ActivityGroup extends Equatable {
  const ActivityGroup({required this.project, required this.parentCode, required this.activities});

  final Project project;

  /// کد والد از کد فرزندان (sync عنوان والد را نمی‌دهد).
  final String? parentCode;
  final List<Activity> activities;

  @override
  List<Object?> get props => [project, parentCode, activities];
}

@freezed
abstract class ActivitiesState with _$ActivitiesState {
  const factory ActivitiesState({
    required String today,
    @Default(false) bool loaded,
    @Default(ActivityFilter.all) ActivityFilter filter,
    @Default(<Project>[]) List<Project> projects,
    @Default(<Activity>[]) List<Activity> all,
  }) = _ActivitiesState;

  const ActivitiesState._();

  List<ActivityGroup> get groups {
    final visible = all.where((a) => ActivitiesBloc.matches(a, filter, today)).toList();
    final result = <ActivityGroup>[];
    for (final p in projects) {
      final mine = visible.where((a) => a.projectId == p.id).toList();
      final byParent = <String?, List<Activity>>{};
      for (final a in mine) {
        byParent.putIfAbsent(a.parentId, () => []).add(a);
      }
      for (final entry in byParent.entries) {
        result.add(ActivityGroup(project: p, parentCode: ActivitiesBloc.parentCode(entry.value), activities: entry.value));
      }
    }
    return result;
  }
}

/// M04 فعالیت‌های من: گروه‌بندی پروژه و والد با فیلتر وضعیت.
@injectable
class ActivitiesBloc extends Bloc<ActivitiesEvent, ActivitiesState> {
  ActivitiesBloc(this._repository, Clock clock) : super(ActivitiesState(today: TehranTime.today(clock.now()))) {
    on<ActivitiesStarted>(
      (event, emit) => emit.forEach<(List<Project>, List<Activity>)>(
        combineLatest2(_repository.watchProjects(), _repository.watchActivities(), (a, b) => (a, b)),
        onData: (v) => state.copyWith(loaded: true, projects: v.$1, all: v.$2),
      ),
      transformer: restartable(),
    );
    on<ActivitiesFilterChanged>((event, emit) => emit(state.copyWith(filter: event.filter)));
  }

  final ActivitiesRepository _repository;

  static bool matches(Activity a, ActivityFilter filter, String today) => switch (filter) {
    ActivityFilter.all => true,
    ActivityFilter.today => ActivitySchedule.isDueToday(a, today),
    ActivityFilter.behind => (ActivitySchedule.deviation(a, today) ?? 0) < -0.05,
    ActivityFilter.pending => a.lastPendingPercent != null,
    ActivityFilter.done => a.approvedPercent >= 100,
  };

  /// بخش مشترک کدهای فرزندان بدون آخرین جزء؛ «1.2.3» و «1.2.4» ← «1.2».
  static String? parentCode(List<Activity> children) {
    if (children.isEmpty) return null;
    final parts = children.first.code.split(RegExp(r'[.\-/]'));
    if (parts.length < 2) return null;
    final prefix = children.first.code.substring(0, children.first.code.length - parts.last.length - 1);
    return children.every((c) => c.code.startsWith(prefix)) ? prefix : null;
  }
}
