import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:projeyar_field/app/di/injection.dart';
import 'package:projeyar_field/app/router/routes.dart';
import 'package:projeyar_field/core/l10n/fa_num.dart';
import 'package:projeyar_field/features/activities/presentation/bloc/activities_bloc.dart';
import 'package:projeyar_field/features/activities/presentation/bloc/activity_detail_bloc.dart';
import 'package:projeyar_field/features/activities/presentation/bloc/today_bloc.dart';
import 'package:projeyar_field/features/activities/presentation/pages/activities_page.dart';
import 'package:projeyar_field/features/activities/presentation/pages/activity_detail_page.dart';
import 'package:projeyar_field/features/activities/presentation/pages/today_page.dart';
import 'package:projeyar_field/features/auth/domain/entities/auth_entities.dart';
import 'package:projeyar_field/features/auth/presentation/bloc/auth_bloc.dart';
import 'package:projeyar_field/features/camera/domain/entities/photo_entities.dart';
import 'package:projeyar_field/features/camera/presentation/bloc/camera_bloc.dart';
import 'package:projeyar_field/features/camera/presentation/pages/camera_page.dart';
import 'package:projeyar_field/features/issues/presentation/bloc/issue_form_bloc.dart';
import 'package:projeyar_field/features/issues/presentation/bloc/issues_list_cubit.dart';
import 'package:projeyar_field/features/issues/presentation/pages/issue_form_page.dart';
import 'package:projeyar_field/features/issues/presentation/pages/issues_page.dart';
import 'package:projeyar_field/features/notifications/presentation/bloc/notifications_bloc.dart';
import 'package:projeyar_field/features/notifications/presentation/pages/notifications_page.dart';
import 'package:projeyar_field/features/profile/presentation/bloc/profile_bloc.dart';
import 'package:projeyar_field/features/profile/presentation/pages/profile_page.dart';
import 'package:projeyar_field/features/queue/presentation/bloc/queue_bloc.dart';
import 'package:projeyar_field/features/queue/presentation/cubit/queue_status_cubit.dart';
import 'package:projeyar_field/features/queue/presentation/pages/queue_page.dart';
import 'package:projeyar_field/features/reports/presentation/bloc/report_form_bloc.dart';
import 'package:projeyar_field/features/reports/presentation/bloc/reports_list_bloc.dart';
import 'package:projeyar_field/features/reports/presentation/bloc/review_bloc.dart';
import 'package:projeyar_field/features/reports/presentation/bloc/revision_bloc.dart';
import 'package:projeyar_field/features/reports/presentation/pages/report_form_page.dart';
import 'package:projeyar_field/features/reports/presentation/pages/reports_page.dart';
import 'package:projeyar_field/features/reports/presentation/pages/review_page.dart';
import 'package:projeyar_field/features/reports/presentation/pages/revision_page.dart';

/// کاربر واردشده برای سلام، مهر عکس و پروفایل.
AppUser? _user(BuildContext context) {
  final state = context.read<AuthBloc>().state;
  return state is AuthAuthenticated ? state.user : null;
}

String _name(BuildContext context) => _user(context)?.fullName ?? '';

/// پوستهٔ چهار زبانه‌ای پس از ورود و صفحه‌های بالای آن. هر صفحه Bloc خودش را در سطح مسیر می‌سازد (rules ۶.۷).
List<RouteBase> homeRoutes() => [
  StatefulShellRoute.indexedStack(
    builder: (context, state, shell) => HomeShell(shell: shell),
    branches: [
      StatefulShellBranch(
        routes: [
          GoRoute(
            path: Routes.today,
            builder: (context, _) => BlocProvider(
              create: (_) => getIt<TodayBloc>()..add(const TodayStarted()),
              child: TodayPage(userName: _name(context)),
            ),
          ),
        ],
      ),
      StatefulShellBranch(
        routes: [
          GoRoute(
            path: Routes.activities,
            builder: (_, _) => BlocProvider(create: (_) => getIt<ActivitiesBloc>()..add(const ActivitiesStarted()), child: const ActivitiesPage()),
          ),
        ],
      ),
      StatefulShellBranch(
        routes: [
          GoRoute(
            path: Routes.reports,
            builder: (_, _) => BlocProvider(create: (_) => getIt<ReportsListBloc>()..add(const ReportsListStarted()), child: const ReportsPage()),
          ),
        ],
      ),
      StatefulShellBranch(
        routes: [
          GoRoute(
            path: Routes.profile,
            builder: (context, _) {
              final user = _user(context);
              return BlocProvider(
                create: (_) => getIt<ProfileBloc>()..add(const ProfileStarted()),
                child: ProfilePage(
                  userName: user?.fullName ?? '',
                  mobile: user?.mobile ?? '',
                  organization: user?.organizationName ?? '',
                  onSignedOut: () => context.read<AuthBloc>().add(const AuthSignedOut()),
                ),
              );
            },
          ),
        ],
      ),
    ],
  ),
  GoRoute(
    path: Routes.activity,
    builder: (_, state) => BlocProvider(
      create: (_) => getIt<ActivityDetailBloc>()..add(ActivityDetailStarted(state.pathParameters['id']!)),
      child: const ActivityDetailPage(),
    ),
  ),
  GoRoute(
    path: Routes.reportForm,
    redirect: (_, state) =>
        state.uri.queryParameters['project'] == null || state.uri.queryParameters['activity'] == null ? Routes.today : null,
    builder: (context, state) => BlocProvider(
      create: (_) => getIt<ReportFormBloc>()
        ..add(ReportFormStarted(projectId: state.uri.queryParameters['project']!, activityId: state.uri.queryParameters['activity']!)),
      child: ReportFormPage(userName: _name(context)),
    ),
  ),
  GoRoute(
    path: Routes.reportReview,
    builder: (_, state) => BlocProvider(
      create: (_) => getIt<ReviewBloc>()..add(ReviewStarted(state.pathParameters['reportId']!)),
      child: const ReviewPage(),
    ),
  ),
  GoRoute(
    path: Routes.camera,
    redirect: (_, state) => state.extra is CaptureRequest ? null : Routes.today,
    builder: (_, state) => BlocProvider(
      create: (_) => getIt<CameraBloc>(param1: state.extra! as CaptureRequest),
      child: const CameraPage(),
    ),
  ),
  GoRoute(
    path: Routes.queue,
    builder: (_, _) => BlocProvider(create: (_) => getIt<QueueBloc>()..add(const QueueStarted()), child: const QueuePage()),
  ),
  GoRoute(
    path: Routes.revision,
    builder: (context, state) => BlocProvider(
      create: (_) => getIt<RevisionBloc>()..add(RevisionStarted(state.pathParameters['itemId']!)),
      child: RevisionPage(userName: _name(context)),
    ),
  ),
  GoRoute(
    path: Routes.notifications,
    builder: (_, _) => BlocProvider(create: (_) => getIt<NotificationsBloc>()..add(const NotificationsStarted()), child: const NotificationsPage()),
  ),
  GoRoute(
    path: Routes.issueNew,
    builder: (context, state) => BlocProvider(
      create: (_) => getIt<IssueFormBloc>()..add(IssueFormStarted(activityId: state.uri.queryParameters['activity'])),
      child: IssueFormPage(userName: _name(context)),
    ),
  ),
  GoRoute(
    path: Routes.issues,
    builder: (_, _) => BlocProvider(create: (_) => getIt<IssuesListCubit>(), child: const IssuesPage()),
  ),
];

class HomeShell extends StatelessWidget {
  const HomeShell({required this.shell, super.key});

  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context) {
    final pending = context.select<QueueStatusCubit, int>((c) => c.state.summary.total);
    return Scaffold(
      body: shell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: shell.currentIndex,
        onDestinationSelected: (i) => shell.goBranch(i, initialLocation: i == shell.currentIndex),
        destinations: [
          const NavigationDestination(icon: Icon(Icons.today_outlined), selectedIcon: Icon(Icons.today), label: 'امروز'),
          const NavigationDestination(icon: Icon(Icons.checklist_outlined), selectedIcon: Icon(Icons.checklist), label: 'فعالیت‌ها'),
          NavigationDestination(
            icon: Badge(isLabelVisible: pending > 0, label: Text(toFaDigits(pending)), child: const Icon(Icons.description_outlined)),
            selectedIcon: const Icon(Icons.description),
            label: 'گزارش‌ها',
          ),
          const NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'پروفایل'),
        ],
      ),
    );
  }
}
