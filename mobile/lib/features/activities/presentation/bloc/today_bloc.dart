import 'package:bloc_concurrency/bloc_concurrency.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/error/failure.dart';
import 'package:projeyar_field/core/network/network_info.dart';
import 'package:projeyar_field/core/time/clock.dart';
import 'package:projeyar_field/core/util/streams.dart';
import 'package:projeyar_field/features/activities/domain/entities/activity_entities.dart';
import 'package:projeyar_field/features/activities/domain/repositories/activities_repository.dart';
import 'package:projeyar_field/features/activities/domain/usecases/watch_today_activities.dart';
import 'package:projeyar_field/features/camera/domain/repositories/photo_repository.dart';
import 'package:projeyar_field/features/queue/domain/entities/queue_entities.dart';
import 'package:projeyar_field/features/queue/domain/repositories/queue_repository.dart';
import 'package:projeyar_field/features/queue/domain/usecases/run_sync_cycle.dart';
import 'package:projeyar_field/features/reports/domain/repositories/reports_repository.dart';
import 'package:projeyar_field/features/sync/domain/entities/sync_entities.dart';
import 'package:projeyar_field/features/sync/domain/repositories/sync_repository.dart';

part 'today_bloc.freezed.dart';

sealed class TodayEvent {
  const TodayEvent();
}

final class TodayStarted extends TodayEvent {
  const TodayStarted();
}

/// کشیدن برای تازه‌سازی: یک تلاش همگام‌سازی کامل.
final class TodayRefreshed extends TodayEvent {
  const TodayRefreshed();
}

enum TodayStatus { loading, ready }

@freezed
abstract class TodayState with _$TodayState {
  const factory TodayState({
    required String today,
    @Default(TodayStatus.loading) TodayStatus status,
    @Default(<Activity>[]) List<Activity> activities,
    @Default(<Project>[]) List<Project> projects,
    @Default(QueueSummary()) QueueSummary queue,
    @Default(SyncInfo()) SyncInfo sync,
    @Default(NetworkKind.wifi) NetworkKind network,
    @Default(false) bool wifiOnly,
    @Default(false) bool hasReportToday,
    @Default(0) int quickPhotos,
    @Default(false) bool refreshing,
    Failure? failure,
  }) = _TodayState;

  const TodayState._();

  /// ناظر فعالیت‌های امروز برای «ناظر: …».
  String? get approverName => activities.map((a) => a.approverName).whereType<String>().firstOrNull;

  /// مهلت گزارش امروز: زودترین ساعت یادآوری فعال پروژه‌ها (`rules.dailyReminder`).
  String? get deadline => DailyReminder.earliest(projects);

  Project? projectOf(String id) => projects.where((p) => p.id == id).firstOrNull;

  bool get neverSynced => sync.lastSyncAt == null;
}

/// M03 امروز (F08 ۹): همه از پایگاه دادهٔ محلی تا بی‌شبکه هم زیر ۲ ثانیه باز شود.
@injectable
class TodayBloc extends Bloc<TodayEvent, TodayState> {
  TodayBloc(this._today, this._activities, this._queue, this._sync, this._reports, this._photos, this._network, this._cycle, Clock clock)
    : super(TodayState(today: TehranTime.today(clock.now()))) {
    on<TodayStarted>(_onStarted, transformer: restartable());
    on<TodayRefreshed>(_onRefreshed, transformer: droppable());
  }

  final WatchTodayActivities _today;
  final ActivitiesRepository _activities;
  final QueueRepository _queue;
  final SyncRepository _sync;
  final ReportsRepository _reports;
  final PhotoRepository _photos;
  final NetworkInfo _network;
  final RunSyncCycle _cycle;

  Future<void> _onStarted(TodayStarted event, Emitter<TodayState> emit) async {
    final day = state.today;
    final network = await _network.current();
    emit(state.copyWith(network: network));
    await emit.forEach<List<Object?>>(
      combineLatestList([
        _today(day),
        _activities.watchProjects(),
        _queue.watchSummary(),
        _sync.watchInfo(),
        _reports.watchHasReportOn(day),
        _photos.watchQuick(day),
        startWith(_network.changes, network),
        _queue.watchWifiOnly(),
      ], (v) => v),
      onData: (v) => state.copyWith(
        status: TodayStatus.ready,
        activities: v[0]! as List<Activity>,
        projects: v[1]! as List<Project>,
        queue: v[2]! as QueueSummary,
        sync: v[3]! as SyncInfo,
        hasReportToday: v[4]! as bool,
        quickPhotos: (v[5]! as List<Object?>).length,
        network: v[6]! as NetworkKind,
        wifiOnly: v[7]! as bool,
      ),
    );
  }

  Future<void> _onRefreshed(TodayRefreshed event, Emitter<TodayState> emit) async {
    emit(state.copyWith(refreshing: true, failure: null));
    final result = await _cycle();
    emit(state.copyWith(refreshing: false, failure: result.failure));
  }
}
