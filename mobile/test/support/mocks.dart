import 'package:mocktail/mocktail.dart';
import 'package:projeyar_field/core/device/location.dart';
import 'package:projeyar_field/features/activities/domain/repositories/activities_repository.dart';
import 'package:projeyar_field/features/camera/domain/repositories/photo_repository.dart';
import 'package:projeyar_field/features/issues/domain/repositories/issues_repository.dart';
import 'package:projeyar_field/features/notifications/domain/repositories/notifications_repository.dart';
import 'package:projeyar_field/features/profile/domain/repositories/profile_repository.dart';
import 'package:projeyar_field/features/profile/domain/usecases/sign_out.dart';
import 'package:projeyar_field/features/queue/domain/repositories/queue_repository.dart';
import 'package:projeyar_field/features/queue/domain/usecases/run_sync_cycle.dart';
import 'package:projeyar_field/features/reports/domain/repositories/reports_repository.dart';
import 'package:projeyar_field/features/sync/domain/repositories/sync_repository.dart';

class MockActivities extends Mock implements ActivitiesRepository {}

class MockReports extends Mock implements ReportsRepository {}

class MockPhotos extends Mock implements PhotoRepository {}

class MockQueue extends Mock implements QueueRepository {}

class MockSync extends Mock implements SyncRepository {}

class MockCycle extends Mock implements RunSyncCycle {}

class MockLocation extends Mock implements LocationService {}

class MockIssues extends Mock implements IssuesRepository {}

class MockNotifications extends Mock implements NotificationsRepository {}

class MockProfile extends Mock implements ProfileRepository {}

class MockSignOut extends Mock implements SignOut {}
