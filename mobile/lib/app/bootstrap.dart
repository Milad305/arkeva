import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:projeyar_field/app/app.dart';
import 'package:projeyar_field/app/di/injection.dart';
import 'package:projeyar_field/core/time/clock.dart';
import 'package:talker_bloc_logger/talker_bloc_logger.dart';
import 'package:talker_flutter/talker_flutter.dart';
import 'package:timezone/data/latest.dart' as tzdata;

/// راه‌اندازی: منطقهٔ زمانی، DI، ناظر Bloc و گرفتن خطاهای مهارنشده.
Future<void> bootstrap() async {
  await runZonedGuarded(
    () async {
      WidgetsFlutterBinding.ensureInitialized();
      await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
      tzdata.initializeTimeZones();
      TehranTime.init();
      await configureDependencies();

      final talker = getIt<Talker>();
      if (kDebugMode) {
        // داده‌های کامل حالت در لاگ نمی‌آید (شمارهٔ همراه، مختصات؛ rules ۶.۹)
        Bloc.observer = TalkerBlocObserver(
          talker: talker,
          settings: const TalkerBlocLoggerSettings(printStateFullData: false, printEventFullData: false),
        );
      }
      FlutterError.onError = (details) => talker.handle(details.exception, details.stack, 'FlutterError');
      PlatformDispatcher.instance.onError = (error, stack) {
        talker.handle(error, stack, 'PlatformDispatcher');
        return true;
      };

      runApp(const ProjeyarFieldApp());
    },
    (error, stack) {
      if (getIt.isRegistered<Talker>()) getIt<Talker>().handle(error, stack, 'Zone');
    },
  );
}
