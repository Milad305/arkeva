import 'dart:async';

import 'package:drift/native.dart';
import 'package:projeyar_field/core/database/app_database.dart';
import 'package:projeyar_field/core/device/app_info.dart';
import 'package:projeyar_field/core/network/network_info.dart';
import 'package:projeyar_field/core/time/clock.dart';
import 'package:projeyar_field/features/activities/domain/entities/activity_entities.dart';

/// ساعت قابل تنظیم.
class FakeClock extends Clock {
  FakeClock(this.value);
  DateTime value;

  @override
  DateTime now() => value;
}

class FakeNetwork implements NetworkInfo {
  FakeNetwork([this.kind = NetworkKind.wifi]);

  NetworkKind kind;
  final controller = StreamController<NetworkKind>.broadcast();

  @override
  Future<NetworkKind> current() async => kind;

  @override
  Stream<NetworkKind> get changes => controller.stream;

  void set(NetworkKind next) {
    kind = next;
    controller.add(next);
  }
}

class FakeAppInfo implements AppInfo {
  @override
  Future<String> version() async => '0.1.0+1';
}

/// پایگاه دادهٔ آزمون در حافظه بی هشدار چند نمونه.
AppDatabase memoryDb() => AppDatabase(NativeDatabase.memory());

/// پروژه و فعالیت مثال AC-FA-07: ۲٬۴۰۰ متر با ۵۵٪ تأییدشده.
const pipeProject = Project(
  id: 'p1',
  name: 'پروژهٔ نمونه',
  site: SiteArea(lat: 35.7, lng: 51.4, radiusM: 200),
  rules: ReportRules(minPhotos: 2, maxJumpPct: 20, approvalMode: 'single_stage'),
);

const pipeActivity = Activity(
  id: 'a1',
  projectId: 'p1',
  code: '1.2.3',
  title: 'لوله‌گذاری',
  method: MeasureMethod.quantity,
  unit: 'متر',
  totalQuantity: 2400,
  approvedPercent: 55,
  approvedQuantity: 1320,
  plannedStart: '2026-11-01',
  plannedFinish: '2026-12-30',
  plan: [PlanPoint(date: '2026-11-20', plannedPercent: 60)],
  approverName: 'مهندس کاظمی',
);
