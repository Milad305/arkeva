import 'package:bloc_concurrency/bloc_concurrency.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/time/clock.dart';
import 'package:projeyar_field/core/util/streams.dart';
import 'package:projeyar_field/features/activities/domain/entities/activity_entities.dart';
import 'package:projeyar_field/features/activities/domain/repositories/activities_repository.dart';
import 'package:projeyar_field/features/reports/domain/entities/report_entities.dart';
import 'package:projeyar_field/features/reports/domain/repositories/reports_repository.dart';

part 'activity_detail_bloc.freezed.dart';

sealed class ActivityDetailEvent {
  const ActivityDetailEvent();
}

final class ActivityDetailStarted extends ActivityDetailEvent {
  const ActivityDetailStarted(this.activityId);
  final String activityId;
}

@freezed
abstract class ActivityDetailState with _$ActivityDetailState {
  const factory ActivityDetailState({
    required String today,
    @Default(false) bool loaded,
    Activity? activity,
    Project? project,
    @Default(<ServerItem>[]) List<ServerItem> history,
  }) = _ActivityDetailState;

  const ActivityDetailState._();

  /// آخرین درخواست اصلاح باز این فعالیت.
  ServerItem? get revision => history.where((i) => i.status == ItemStatus.needsRevision).firstOrNull;
}

/// M05 جزئیات فعالیت: تأییدشده، انحراف، برنامه تا امروز، مقدار از کل، پیام اصلاح، تاریخچه.
@injectable
class ActivityDetailBloc extends Bloc<ActivityDetailEvent, ActivityDetailState> {
  ActivityDetailBloc(this._activities, this._reports, Clock clock) : super(ActivityDetailState(today: TehranTime.today(clock.now()))) {
    on<ActivityDetailStarted>(_onStarted, transformer: restartable());
  }

  final ActivitiesRepository _activities;
  final ReportsRepository _reports;

  Future<void> _onStarted(ActivityDetailStarted event, Emitter<ActivityDetailState> emit) async {
    final activity = await _activities.activity(event.activityId);
    final project = activity == null ? null : await _activities.project(activity.projectId);
    emit(state.copyWith(activity: activity, project: project));
    await emit.forEach<(Activity?, List<ServerItem>)>(
      combineLatest2(_activities.watchActivity(event.activityId), _reports.watchServerItems(), (a, b) => (a, b)),
      onData: (v) => state.copyWith(
        loaded: true,
        activity: v.$1,
        history: v.$2.where((i) => i.activityId == event.activityId).toList(),
      ),
    );
  }
}
