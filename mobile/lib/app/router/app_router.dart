import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:projeyar_field/app/di/injection.dart';
import 'package:projeyar_field/app/router/home_shell.dart';
import 'package:projeyar_field/app/router/routes.dart';
import 'package:projeyar_field/core/network/app_update_gate.dart';
import 'package:projeyar_field/features/app_update/presentation/pages/update_required_page.dart';
import 'package:projeyar_field/features/auth/presentation/bloc/auth_bloc.dart';
import 'package:projeyar_field/features/auth/presentation/bloc/invite_bloc.dart';
import 'package:projeyar_field/features/auth/presentation/bloc/login_bloc.dart';
import 'package:projeyar_field/features/auth/presentation/bloc/otp_bloc.dart';
import 'package:projeyar_field/features/auth/presentation/pages/invite_page.dart';
import 'package:projeyar_field/features/auth/presentation/pages/invite_scan_page.dart';
import 'package:projeyar_field/features/auth/presentation/pages/login_page.dart';
import 'package:projeyar_field/features/auth/presentation/pages/otp_page.dart';

/// مسیریاب با redirect از AuthBloc و دروازهٔ به‌روزرسانی (F08 ۵.۳). هر صفحه Bloc خودش را در سطح مسیر می‌سازد (rules ۶.۷).
GoRouter buildRouter(AuthBloc auth, AppUpdateGate updateGate) => GoRouter(
  initialLocation: Routes.splash,
  refreshListenable: Listenable.merge([_StreamListenable(auth.stream), _StreamListenable(updateGate.changes)]),
  redirect: (context, state) {
    final location = state.matchedLocation;
    if (updateGate.required) return location == Routes.updateRequired ? null : Routes.updateRequired;
    if (location == Routes.updateRequired) return Routes.splash;
    final onAuth = location.startsWith(Routes.login);
    return switch (auth.state) {
      AuthUnknown() => location == Routes.splash ? null : Routes.splash,
      AuthUnauthenticated() => onAuth ? null : Routes.login,
      AuthAuthenticated() => (onAuth || location == Routes.splash) ? Routes.today : null,
    };
  },
  routes: [
    GoRoute(path: Routes.splash, builder: (_, _) => const _SplashPage()),
    GoRoute(path: Routes.updateRequired, builder: (_, _) => UpdateRequiredPage(gate: updateGate)),
    GoRoute(
      path: Routes.login,
      builder: (_, _) => BlocProvider(create: (_) => getIt<LoginBloc>(), child: const LoginPage()),
      routes: [
        GoRoute(
          path: 'invite',
          builder: (_, _) => BlocProvider(create: (_) => getIt<InviteBloc>(), child: const InvitePage()),
          routes: [GoRoute(path: 'scan', builder: (_, _) => const InviteScanPage())],
        ),
        GoRoute(
          path: 'otp',
          redirect: (_, state) => state.extra is OtpPageArgs ? null : Routes.login,
          builder: (_, state) {
            final args = state.extra! as OtpPageArgs;
            return BlocProvider(
              create: (_) => getIt<OtpBloc>()..add(OtpStarted(challenge: args.challenge, mobile: args.mobile, inviteCode: args.inviteCode)),
              child: const OtpPage(),
            );
          },
        ),
      ],
    ),
    ...homeRoutes(),
  ],
);

class _SplashPage extends StatelessWidget {
  const _SplashPage();

  @override
  Widget build(BuildContext context) => const Scaffold(body: Center(child: CircularProgressIndicator()));
}

/// تبدیل Stream حالت به Listenable برای refresh مسیریاب.
class _StreamListenable extends ChangeNotifier {
  _StreamListenable(Stream<Object?> stream) {
    _subscription = stream.listen((_) => notifyListeners());
  }

  late final StreamSubscription<Object?> _subscription;

  @override
  void dispose() {
    unawaited(_subscription.cancel());
    super.dispose();
  }
}
