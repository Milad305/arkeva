import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;
import 'package:mocktail/mocktail.dart';
import 'package:persian_datetime_picker/persian_datetime_picker.dart';
import 'package:projeyar_field/core/result/result.dart';
import 'package:projeyar_field/core/theme/app_theme.dart';
import 'package:projeyar_field/features/camera/data/datasources/photo_processor.dart';
import 'package:projeyar_field/features/camera/domain/entities/photo_entities.dart';
import 'package:projeyar_field/features/issues/presentation/bloc/issue_form_bloc.dart';
import 'package:projeyar_field/features/issues/presentation/pages/issue_form_page.dart';
import 'package:projeyar_field/features/reports/domain/entities/report_entities.dart';
import 'package:projeyar_field/features/reports/presentation/bloc/report_form_bloc.dart';
import 'package:projeyar_field/features/reports/presentation/pages/report_form_page.dart';

import '../support/fakes.dart';
import '../support/mocks.dart';

Widget _app(Widget child) => MaterialApp(
  theme: AppTheme.light(),
  locale: const Locale('fa', 'IR'),
  supportedLocales: const [Locale('fa', 'IR')],
  localizationsDelegates: const [
    PersianMaterialLocalizations.delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
  ],
  home: child,
);

void main() {
  final clock = FakeClock(DateTime.utc(2026, 11, 20, 6));

  setUpAll(() => registerFallbackValue(const QuickTarget()));

  testWidgets('M06 راست‌به‌چپ؛ AC-FA-07 «برابر ۳٪ از ۲٬۴۰۰ متر · تجمعی ۵۸٪» زیر ورودی', (tester) async {
    final activities = MockActivities();
    final reports = MockReports();
    final photos = MockPhotos();
    when(() => activities.activity('a1')).thenAnswer((_) async => pipeActivity);
    when(() => activities.project('p1')).thenAnswer((_) async => pipeProject);
    when(() => reports.openDraft(projectId: 'p1', workDate: any(named: 'workDate'))).thenAnswer(
      (_) async => Ok(ReportDraft(id: 'r1', projectId: 'p1', workDate: '2026-11-20', createdAt: DateTime.utc(2026))),
    );
    when(() => reports.ensureItem('r1', 'a1')).thenAnswer((_) async => const Ok(DraftItem(id: 'it1', activityId: 'a1')));
    when(() => photos.watchFor(any())).thenAnswer((_) => Stream.value(const []));
    when(() => photos.watchQuick(any())).thenAnswer((_) => Stream.value(const []));
    final bloc = ReportFormBloc(activities, reports, photos, clock)..add(const ReportFormStarted(projectId: 'p1', activityId: 'a1'));

    await tester.pumpWidget(_app(BlocProvider.value(value: bloc, child: const ReportFormPage(userName: 'رضا'))));
    await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 50)));
    await tester.pump();
    expect(Directionality.of(tester.element(find.text('ثبت پیشرفت').first)), TextDirection.rtl);

    await tester.enterText(find.widgetWithText(TextFormField, 'مقدار انجام‌شدهٔ امروز'), '72');
    await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 50)));
    await tester.pump();
    expect(find.text('برابر ۳٪ از ۲٬۴۰۰ متر · تجمعی ۵۸٪'), findsOneWidget);
    expect(find.text('۰ از حداقل ۲'), findsOneWidget);
    // Bloc بسته نمی‌شود: پایان آزمون درخت را برمی‌چیند
  });

  testWidgets('M13 خطاها پس از تلاش ارسال زیر همان فیلد', (tester) async {
    final issues = MockIssues();
    final activities = MockActivities();
    final photos = MockPhotos();
    when(issues.newIssueId).thenReturn('iss1');
    when(() => issues.discard(any())).thenAnswer((_) async {});
    when(activities.watchProjects).thenAnswer((_) => Stream.value([pipeProject]));
    when(activities.watchActivities).thenAnswer((_) => Stream.value([pipeActivity]));
    when(() => photos.watchFor(any())).thenAnswer((_) => Stream.value(const []));
    final bloc = IssueFormBloc(issues, activities, photos, clock)..add(const IssueFormStarted());

    await tester.pumpWidget(_app(BlocProvider.value(value: bloc, child: const IssueFormPage(userName: 'رضا'))));
    await tester.pumpAndSettle();
    expect(find.text('این بخش را پر کنید.'), findsNothing, reason: 'پیش از ارسال خطایی نیست');
    await tester.tap(find.text('ذخیره و ارسال'));
    await tester.pumpAndSettle();
    expect(find.text('این بخش را پر کنید.'), findsOneWidget);
    expect(find.text('نوع مشکل را انتخاب کنید.'), findsOneWidget);
    // Bloc بسته نمی‌شود: پایان آزمون درخت را برمی‌چیند
  });

  testWidgets('AC-FA-04 مهر روی پیکسل، کوچک‌سازی ۱۶۰۰ و هش JPEG نهایی', (tester) async {
    await tester.runAsync(() async {
      final source = img.Image(width: 2000, height: 1000)..clear(img.ColorRgb8(200, 200, 200));
      final raw = Uint8List.fromList(img.encodeJpg(source));
      final out = await PhotoProcessor().process(raw, ['۱۴۰۵/۰۸/۲۹  ۱۰:۰۰:۰۰', 'رضا کریمی']);
      final decoded = img.decodeJpg(out.jpeg)!;
      expect((decoded.width, decoded.height), (1600, 800));
      // نوار مهر در پایین تیره است؛ بالای عکس دست‌نخورده
      final top = decoded.getPixel(800, 50);
      final band = decoded.getPixel(20, 795);
      expect(top.r, greaterThan(180));
      expect(band.r, lessThan(120));
      expect(out.sha256, hasLength(64));
    });
  });
}
