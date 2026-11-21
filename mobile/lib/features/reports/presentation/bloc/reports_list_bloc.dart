import 'package:bloc_concurrency/bloc_concurrency.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/util/streams.dart';
import 'package:projeyar_field/features/activities/domain/entities/activity_entities.dart';
import 'package:projeyar_field/features/activities/domain/repositories/activities_repository.dart';
import 'package:projeyar_field/features/reports/domain/entities/report_entities.dart';
import 'package:projeyar_field/features/reports/domain/repositories/reports_repository.dart';

part 'reports_list_bloc.freezed.dart';

sealed class ReportsListEvent {
  const ReportsListEvent();
}

final class ReportsListStarted extends ReportsListEvent {
  const ReportsListStarted();
}

@freezed
abstract class ReportsListState with _$ReportsListState {
  const factory ReportsListState({
    @Default(false) bool loaded,
    @Default(<ReportDraft>[]) List<ReportDraft> local,
    @Default(<ServerItem>[]) List<ServerItem> server,
    @Default(<String, Activity>{}) Map<String, Activity> activities,
    @Default(<String>{}) Set<String> queuedResubmissions,
  }) = _ReportsListState;

  const ReportsListState._();

  /// «N گزارش هنوز در گوشی است» (M10).
  int get onDevice => local.where((r) => r.state == LocalReportState.queued || r.state == LocalReportState.rejected).length;

  List<ServerItem> get pending => server.where((i) => i.status.isPending).toList();

  List<ServerItem> get revisions => server.where((i) => i.status == ItemStatus.needsRevision).toList();

  List<ServerItem> get decided => server.where((i) => i.status.isDecided).toList();
}

/// M10 گزارش‌های من.
@injectable
class ReportsListBloc extends Bloc<ReportsListEvent, ReportsListState> {
  ReportsListBloc(this._reports, this._activities) : super(const ReportsListState()) {
    on<ReportsListStarted>(
      (event, emit) => emit.forEach<List<Object?>>(
        combineLatestList([
          _reports.watchLocalReports(),
          _reports.watchServerItems(),
          _activities.watchActivities(),
          _reports.watchQueuedResubmissions(),
        ], (v) => v),
        onData: (v) => state.copyWith(
          loaded: true,
          local: v[0]! as List<ReportDraft>,
          server: v[1]! as List<ServerItem>,
          activities: {for (final a in v[2]! as List<Activity>) a.id: a},
          queuedResubmissions: v[3]! as Set<String>,
        ),
      ),
      transformer: restartable(),
    );
  }

  final ReportsRepository _reports;
  final ActivitiesRepository _activities;
}
