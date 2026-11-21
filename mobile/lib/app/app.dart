import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:go_router/go_router.dart';
import 'package:persian_datetime_picker/persian_datetime_picker.dart';
import 'package:projeyar_field/app/di/injection.dart';
import 'package:projeyar_field/app/router/app_router.dart';
import 'package:projeyar_field/app/session_services.dart';
import 'package:projeyar_field/core/network/app_update_gate.dart';
import 'package:projeyar_field/core/status/connectivity_cubit.dart';
import 'package:projeyar_field/core/theme/app_theme.dart';
import 'package:projeyar_field/features/auth/presentation/bloc/auth_bloc.dart';
import 'package:projeyar_field/features/queue/presentation/cubit/queue_status_cubit.dart';

/// ریشهٔ اپ: فارسی و راست‌به‌چپ (CLAUDE.md ۵؛ rules ۱۰). Blocهای سراسری: Auth، Connectivity، QueueStatus (rules ۶.۱).
class ProjeyarFieldApp extends StatefulWidget {
  const ProjeyarFieldApp({super.key});

  @override
  State<ProjeyarFieldApp> createState() => _ProjeyarFieldAppState();
}

class _ProjeyarFieldAppState extends State<ProjeyarFieldApp> with WidgetsBindingObserver {
  late final AuthBloc _auth = getIt<AuthBloc>()..add(const AuthStarted());
  late final GoRouter _router = buildRouter(_auth, getIt<AppUpdateGate>());
  late final SessionServices _session = getIt<SessionServices>();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  /// بازگشت به اپ یکی از راه‌اندازهای صف است (rules ۹).
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _auth.state is AuthAuthenticated) getIt<QueueStatusCubit>().syncNow().ignore();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => MultiBlocProvider(
    providers: [
      BlocProvider.value(value: _auth),
      BlocProvider.value(value: getIt<ConnectivityCubit>()),
      BlocProvider.value(value: getIt<QueueStatusCubit>()),
    ],
    child: BlocListener<AuthBloc, AuthState>(
      listenWhen: (a, b) => a.runtimeType != b.runtimeType,
      listener: (context, state) => switch (state) {
        AuthAuthenticated() => _session.start(),
        AuthUnauthenticated() => _session.stop(),
        AuthUnknown() => null,
      },
      child: MaterialApp.router(
        title: 'پروژه‌یار کارگاه',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light(),
        locale: const Locale('fa', 'IR'),
        supportedLocales: const [Locale('fa', 'IR')],
        localizationsDelegates: const [
          PersianMaterialLocalizations.delegate,
          PersianCupertinoLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        routerConfig: _router,
      ),
    ),
  );
}
