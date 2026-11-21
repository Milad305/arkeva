// dart format width=80
// GENERATED CODE - DO NOT MODIFY BY HAND

// **************************************************************************
// InjectableConfigGenerator
// **************************************************************************

// ignore_for_file: type=lint
// coverage:ignore-file

// ignore_for_file: no_leading_underscores_for_library_prefixes
import 'package:connectivity_plus/connectivity_plus.dart' as _i895;
import 'package:get_it/get_it.dart' as _i174;
import 'package:injectable/injectable.dart' as _i526;
import 'package:projeyar_field/app/background.dart' as _i706;
import 'package:projeyar_field/app/di/core_module.dart' as _i893;
import 'package:projeyar_field/app/session_services.dart' as _i54;
import 'package:projeyar_field/core/config/app_config.dart' as _i622;
import 'package:projeyar_field/core/database/app_database.dart' as _i233;
import 'package:projeyar_field/core/database/meta_store.dart' as _i463;
import 'package:projeyar_field/core/device/app_info.dart' as _i1073;
import 'package:projeyar_field/core/device/geolocator_location.dart' as _i420;
import 'package:projeyar_field/core/device/local_reminder.dart' as _i919;
import 'package:projeyar_field/core/device/location.dart' as _i581;
import 'package:projeyar_field/core/device/schedulers.dart' as _i877;
import 'package:projeyar_field/core/network/api_client.dart' as _i339;
import 'package:projeyar_field/core/network/app_update_gate.dart' as _i27;
import 'package:projeyar_field/core/network/connectivity_network_info.dart'
    as _i421;
import 'package:projeyar_field/core/network/network_info.dart' as _i636;
import 'package:projeyar_field/core/network/token_store.dart' as _i790;
import 'package:projeyar_field/core/security/file_cipher.dart' as _i672;
import 'package:projeyar_field/core/security/secure_store.dart' as _i787;
import 'package:projeyar_field/core/status/connectivity_cubit.dart' as _i617;
import 'package:projeyar_field/core/time/clock.dart' as _i752;
import 'package:projeyar_field/features/activities/data/repositories/activities_repository_impl.dart'
    as _i519;
import 'package:projeyar_field/features/activities/domain/repositories/activities_repository.dart'
    as _i475;
import 'package:projeyar_field/features/activities/domain/usecases/watch_today_activities.dart'
    as _i651;
import 'package:projeyar_field/features/activities/presentation/bloc/activities_bloc.dart'
    as _i861;
import 'package:projeyar_field/features/activities/presentation/bloc/activity_detail_bloc.dart'
    as _i575;
import 'package:projeyar_field/features/activities/presentation/bloc/today_bloc.dart'
    as _i1070;
import 'package:projeyar_field/features/auth/data/datasources/auth_remote_data_source.dart'
    as _i669;
import 'package:projeyar_field/features/auth/data/repositories/auth_repository_impl.dart'
    as _i433;
import 'package:projeyar_field/features/auth/domain/repositories/auth_repository.dart'
    as _i571;
import 'package:projeyar_field/features/auth/domain/usecases/auth_usecases.dart'
    as _i217;
import 'package:projeyar_field/features/auth/presentation/bloc/auth_bloc.dart'
    as _i170;
import 'package:projeyar_field/features/auth/presentation/bloc/invite_bloc.dart'
    as _i904;
import 'package:projeyar_field/features/auth/presentation/bloc/login_bloc.dart'
    as _i89;
import 'package:projeyar_field/features/auth/presentation/bloc/otp_bloc.dart'
    as _i711;
import 'package:projeyar_field/features/camera/data/datasources/photo_processor.dart'
    as _i507;
import 'package:projeyar_field/features/camera/data/repositories/photo_repository_impl.dart'
    as _i192;
import 'package:projeyar_field/features/camera/domain/entities/photo_entities.dart'
    as _i223;
import 'package:projeyar_field/features/camera/domain/repositories/photo_repository.dart'
    as _i236;
import 'package:projeyar_field/features/camera/presentation/bloc/camera_bloc.dart'
    as _i534;
import 'package:projeyar_field/features/issues/data/repositories/issues_repository_impl.dart'
    as _i217;
import 'package:projeyar_field/features/issues/domain/repositories/issues_repository.dart'
    as _i280;
import 'package:projeyar_field/features/issues/presentation/bloc/issue_form_bloc.dart'
    as _i298;
import 'package:projeyar_field/features/issues/presentation/bloc/issues_list_cubit.dart'
    as _i302;
import 'package:projeyar_field/features/notifications/data/repositories/notifications_repository_impl.dart'
    as _i763;
import 'package:projeyar_field/features/notifications/domain/repositories/notifications_repository.dart'
    as _i14;
import 'package:projeyar_field/features/notifications/presentation/bloc/notifications_bloc.dart'
    as _i56;
import 'package:projeyar_field/features/profile/data/repositories/profile_repository_impl.dart'
    as _i126;
import 'package:projeyar_field/features/profile/domain/repositories/profile_repository.dart'
    as _i647;
import 'package:projeyar_field/features/profile/domain/usecases/sign_out.dart'
    as _i9;
import 'package:projeyar_field/features/profile/presentation/bloc/profile_bloc.dart'
    as _i618;
import 'package:projeyar_field/features/queue/data/datasources/outbox_remote_data_source.dart'
    as _i1031;
import 'package:projeyar_field/features/queue/data/outbox_processor.dart'
    as _i809;
import 'package:projeyar_field/features/queue/data/repositories/queue_repository_impl.dart'
    as _i353;
import 'package:projeyar_field/features/queue/domain/repositories/queue_repository.dart'
    as _i827;
import 'package:projeyar_field/features/queue/domain/usecases/run_sync_cycle.dart'
    as _i769;
import 'package:projeyar_field/features/queue/presentation/bloc/queue_bloc.dart'
    as _i496;
import 'package:projeyar_field/features/queue/presentation/cubit/queue_status_cubit.dart'
    as _i144;
import 'package:projeyar_field/features/reports/data/repositories/reports_repository_impl.dart'
    as _i42;
import 'package:projeyar_field/features/reports/domain/repositories/reports_repository.dart'
    as _i660;
import 'package:projeyar_field/features/reports/presentation/bloc/report_form_bloc.dart'
    as _i157;
import 'package:projeyar_field/features/reports/presentation/bloc/reports_list_bloc.dart'
    as _i665;
import 'package:projeyar_field/features/reports/presentation/bloc/review_bloc.dart'
    as _i35;
import 'package:projeyar_field/features/reports/presentation/bloc/revision_bloc.dart'
    as _i70;
import 'package:projeyar_field/features/sync/data/datasources/sync_data_sources.dart'
    as _i651;
import 'package:projeyar_field/features/sync/data/repositories/sync_repository_impl.dart'
    as _i338;
import 'package:projeyar_field/features/sync/domain/repositories/sync_repository.dart'
    as _i601;
import 'package:talker_flutter/talker_flutter.dart' as _i207;

extension GetItInjectableX on _i174.GetIt {
  // initializes the registration of main-scope dependencies inside of GetIt
  Future<_i174.GetIt> init({
    String? environment,
    _i526.EnvironmentFilter? environmentFilter,
  }) async {
    final gh = _i526.GetItHelper(this, environment, environmentFilter);
    final coreModule = _$CoreModule();
    gh.lazySingleton<_i622.AppConfig>(() => coreModule.config);
    gh.lazySingleton<_i787.SecureStore>(() => coreModule.secureStore);
    gh.lazySingleton<_i27.AppUpdateGate>(() => coreModule.appUpdateGate);
    gh.lazySingleton<_i752.Clock>(() => coreModule.clock);
    gh.lazySingleton<_i895.Connectivity>(() => coreModule.connectivity);
    gh.lazySingleton<_i507.PhotoProcessor>(() => _i507.PhotoProcessor());
    gh.lazySingleton<_i877.BackgroundScheduler>(
      () => _i706.WorkmanagerScheduler(),
    );
    gh.lazySingleton<_i581.LocationService>(() => _i420.GeolocatorLocation());
    gh.lazySingleton<_i207.Talker>(
      () => coreModule.talker(gh<_i622.AppConfig>()),
    );
    gh.lazySingleton<_i1073.AppInfo>(() => _i1073.PackageAppInfo());
    gh.lazySingleton<_i790.TokenStore>(
      () => coreModule.tokenStore(gh<_i787.SecureStore>()),
    );
    await gh.lazySingletonAsync<_i233.AppDatabase>(
      () => coreModule.database(gh<_i787.SecureStore>()),
      preResolve: true,
    );
    gh.lazySingleton<_i672.FileCipher>(
      () => coreModule.fileCipher(gh<_i787.SecureStore>()),
    );
    gh.lazySingleton<_i636.NetworkInfo>(
      () => _i421.ConnectivityNetworkInfo(gh<_i895.Connectivity>()),
    );
    gh.lazySingleton<_i877.ReminderScheduler>(
      () => _i919.LocalReminderScheduler(gh<_i752.Clock>()),
    );
    gh.lazySingleton<_i236.PhotoRepository>(
      () => _i192.PhotoRepositoryImpl(
        gh<_i233.AppDatabase>(),
        gh<_i672.FileCipher>(),
        gh<_i507.PhotoProcessor>(),
      ),
    );
    gh.lazySingleton<_i339.ApiClient>(
      () => coreModule.apiClient(
        gh<_i622.AppConfig>(),
        gh<_i790.TokenStore>(),
        gh<_i207.Talker>(),
        gh<_i1073.AppInfo>(),
        gh<_i27.AppUpdateGate>(),
      ),
    );
    gh.lazySingleton<_i463.MetaStore>(
      () => _i463.MetaStore(gh<_i233.AppDatabase>()),
    );
    gh.lazySingleton<_i463.OutboxWriter>(
      () => _i463.OutboxWriter(gh<_i233.AppDatabase>()),
    );
    gh.lazySingleton<_i475.ActivitiesRepository>(
      () => _i519.ActivitiesRepositoryImpl(gh<_i233.AppDatabase>()),
    );
    gh.factory<_i861.ActivitiesBloc>(
      () => _i861.ActivitiesBloc(
        gh<_i475.ActivitiesRepository>(),
        gh<_i752.Clock>(),
      ),
    );
    gh.lazySingleton<_i617.ConnectivityCubit>(
      () => _i617.ConnectivityCubit(gh<_i636.NetworkInfo>()),
    );
    gh.lazySingleton<_i14.NotificationsRepository>(
      () => _i763.NotificationsRepositoryImpl(
        gh<_i339.ApiClient>(),
        gh<_i233.AppDatabase>(),
      ),
    );
    gh.factoryParam<_i534.CameraBloc, _i223.CaptureRequest?, dynamic>(
      (request, _) => _i534.CameraBloc(
        gh<_i236.PhotoRepository>(),
        gh<_i581.LocationService>(),
        gh<_i752.Clock>(),
        request,
      ),
    );
    gh.lazySingleton<_i647.ProfileRepository>(
      () => _i126.ProfileRepositoryImpl(
        gh<_i233.AppDatabase>(),
        gh<_i463.MetaStore>(),
        gh<_i672.FileCipher>(),
        gh<_i787.SecureStore>(),
        gh<_i1073.AppInfo>(),
        gh<_i877.ReminderScheduler>(),
        gh<_i877.BackgroundScheduler>(),
      ),
    );
    gh.lazySingleton<_i669.AuthRemoteDataSource>(
      () => _i669.AuthRemoteDataSource(gh<_i339.ApiClient>()),
    );
    gh.lazySingleton<_i1031.OutboxRemoteDataSource>(
      () => _i1031.OutboxRemoteDataSource(gh<_i339.ApiClient>()),
    );
    gh.lazySingleton<_i651.SyncRemoteDataSource>(
      () => _i651.SyncRemoteDataSource(gh<_i339.ApiClient>()),
    );
    gh.lazySingleton<_i651.SyncLocalDataSource>(
      () => _i651.SyncLocalDataSource(
        gh<_i233.AppDatabase>(),
        gh<_i463.MetaStore>(),
      ),
    );
    gh.factory<_i651.WatchTodayActivities>(
      () => _i651.WatchTodayActivities(gh<_i475.ActivitiesRepository>()),
    );
    gh.lazySingleton<_i809.OutboxProcessor>(
      () => _i809.OutboxProcessor(
        gh<_i233.AppDatabase>(),
        gh<_i1031.OutboxRemoteDataSource>(),
        gh<_i672.FileCipher>(),
        gh<_i463.MetaStore>(),
        gh<_i636.NetworkInfo>(),
        gh<_i752.Clock>(),
        gh<_i1073.AppInfo>(),
      ),
    );
    gh.lazySingleton<_i571.AuthRepository>(
      () => _i433.AuthRepositoryImpl(
        gh<_i669.AuthRemoteDataSource>(),
        gh<_i790.TokenStore>(),
        gh<_i787.SecureStore>(),
      ),
    );
    gh.factory<_i56.NotificationsBloc>(
      () => _i56.NotificationsBloc(
        gh<_i14.NotificationsRepository>(),
        gh<_i752.Clock>(),
      ),
    );
    gh.factory<_i9.SignOut>(
      () => _i9.SignOut(
        gh<_i571.AuthRepository>(),
        gh<_i647.ProfileRepository>(),
      ),
    );
    gh.lazySingleton<_i601.SyncRepository>(
      () => _i338.SyncRepositoryImpl(
        gh<_i651.SyncRemoteDataSource>(),
        gh<_i651.SyncLocalDataSource>(),
        gh<_i463.MetaStore>(),
        gh<_i752.Clock>(),
      ),
    );
    gh.lazySingleton<_i170.AuthBloc>(
      () => _i170.AuthBloc(gh<_i571.AuthRepository>()),
    );
    gh.factory<_i217.RequestLoginCode>(
      () => _i217.RequestLoginCode(gh<_i571.AuthRepository>()),
    );
    gh.factory<_i217.RequestInviteLoginCode>(
      () => _i217.RequestInviteLoginCode(gh<_i571.AuthRepository>()),
    );
    gh.factory<_i217.VerifyLoginCode>(
      () => _i217.VerifyLoginCode(gh<_i571.AuthRepository>()),
    );
    gh.lazySingleton<_i827.QueueRepository>(
      () => _i353.QueueRepositoryImpl(
        gh<_i233.AppDatabase>(),
        gh<_i463.MetaStore>(),
        gh<_i809.OutboxProcessor>(),
        gh<_i672.FileCipher>(),
      ),
    );
    gh.factory<_i618.ProfileBloc>(
      () => _i618.ProfileBloc(
        gh<_i647.ProfileRepository>(),
        gh<_i827.QueueRepository>(),
        gh<_i475.ActivitiesRepository>(),
        gh<_i601.SyncRepository>(),
        gh<_i9.SignOut>(),
      ),
    );
    gh.factory<_i711.OtpBloc>(
      () => _i711.OtpBloc(
        gh<_i217.VerifyLoginCode>(),
        gh<_i217.RequestLoginCode>(),
        gh<_i217.RequestInviteLoginCode>(),
      ),
    );
    gh.factory<_i89.LoginBloc>(
      () => _i89.LoginBloc(gh<_i217.RequestLoginCode>()),
    );
    gh.lazySingleton<_i660.ReportsRepository>(
      () => _i42.ReportsRepositoryImpl(
        gh<_i233.AppDatabase>(),
        gh<_i463.OutboxWriter>(),
        gh<_i827.QueueRepository>(),
        gh<_i672.FileCipher>(),
        gh<_i752.Clock>(),
      ),
    );
    gh.lazySingleton<_i280.IssuesRepository>(
      () => _i217.IssuesRepositoryImpl(
        gh<_i233.AppDatabase>(),
        gh<_i463.OutboxWriter>(),
        gh<_i827.QueueRepository>(),
        gh<_i672.FileCipher>(),
        gh<_i752.Clock>(),
      ),
    );
    gh.factory<_i904.InviteBloc>(
      () => _i904.InviteBloc(gh<_i217.RequestInviteLoginCode>()),
    );
    gh.factory<_i157.ReportFormBloc>(
      () => _i157.ReportFormBloc(
        gh<_i475.ActivitiesRepository>(),
        gh<_i660.ReportsRepository>(),
        gh<_i236.PhotoRepository>(),
        gh<_i752.Clock>(),
      ),
    );
    gh.lazySingleton<_i769.RunSyncCycle>(
      () => _i769.RunSyncCycle(
        gh<_i827.QueueRepository>(),
        gh<_i601.SyncRepository>(),
        gh<_i1073.AppInfo>(),
      ),
    );
    gh.factory<_i1070.TodayBloc>(
      () => _i1070.TodayBloc(
        gh<_i651.WatchTodayActivities>(),
        gh<_i475.ActivitiesRepository>(),
        gh<_i827.QueueRepository>(),
        gh<_i601.SyncRepository>(),
        gh<_i660.ReportsRepository>(),
        gh<_i236.PhotoRepository>(),
        gh<_i636.NetworkInfo>(),
        gh<_i769.RunSyncCycle>(),
        gh<_i752.Clock>(),
      ),
    );
    gh.factory<_i302.IssuesListCubit>(
      () => _i302.IssuesListCubit(gh<_i280.IssuesRepository>()),
    );
    gh.factory<_i35.ReviewBloc>(
      () => _i35.ReviewBloc(
        gh<_i660.ReportsRepository>(),
        gh<_i475.ActivitiesRepository>(),
        gh<_i236.PhotoRepository>(),
        gh<_i581.LocationService>(),
        gh<_i636.NetworkInfo>(),
        gh<_i752.Clock>(),
      ),
    );
    gh.factory<_i575.ActivityDetailBloc>(
      () => _i575.ActivityDetailBloc(
        gh<_i475.ActivitiesRepository>(),
        gh<_i660.ReportsRepository>(),
        gh<_i752.Clock>(),
      ),
    );
    gh.factory<_i70.RevisionBloc>(
      () => _i70.RevisionBloc(
        gh<_i660.ReportsRepository>(),
        gh<_i475.ActivitiesRepository>(),
        gh<_i236.PhotoRepository>(),
      ),
    );
    gh.factory<_i298.IssueFormBloc>(
      () => _i298.IssueFormBloc(
        gh<_i280.IssuesRepository>(),
        gh<_i475.ActivitiesRepository>(),
        gh<_i236.PhotoRepository>(),
        gh<_i752.Clock>(),
      ),
    );
    gh.lazySingleton<_i144.QueueStatusCubit>(
      () => _i144.QueueStatusCubit(
        gh<_i827.QueueRepository>(),
        gh<_i769.RunSyncCycle>(),
        gh<_i636.NetworkInfo>(),
      ),
    );
    gh.factory<_i496.QueueBloc>(
      () => _i496.QueueBloc(
        gh<_i827.QueueRepository>(),
        gh<_i769.RunSyncCycle>(),
        gh<_i636.NetworkInfo>(),
      ),
    );
    gh.factory<_i665.ReportsListBloc>(
      () => _i665.ReportsListBloc(
        gh<_i660.ReportsRepository>(),
        gh<_i475.ActivitiesRepository>(),
      ),
    );
    gh.lazySingleton<_i54.SessionServices>(
      () => _i54.SessionServices(
        gh<_i144.QueueStatusCubit>(),
        gh<_i877.BackgroundScheduler>(),
        gh<_i877.ReminderScheduler>(),
        gh<_i660.ReportsRepository>(),
        gh<_i475.ActivitiesRepository>(),
        gh<_i463.MetaStore>(),
        gh<_i752.Clock>(),
      ),
    );
    return this;
  }
}

class _$CoreModule extends _i893.CoreModule {}
