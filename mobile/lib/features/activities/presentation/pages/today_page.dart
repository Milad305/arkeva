import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:projeyar_field/app/router/routes.dart';
import 'package:projeyar_field/core/l10n/fa_num.dart';
import 'package:projeyar_field/core/network/network_info.dart';
import 'package:projeyar_field/core/theme/app_tokens.dart';
import 'package:projeyar_field/core/time/clock.dart';
import 'package:projeyar_field/core/widgets/app_widgets.dart';
import 'package:projeyar_field/core/widgets/field_widgets.dart';
import 'package:projeyar_field/features/activities/presentation/bloc/today_bloc.dart';
import 'package:projeyar_field/features/activities/presentation/widgets/activity_tile.dart';
import 'package:projeyar_field/features/camera/domain/entities/photo_entities.dart';

/// M03 امروز.
class TodayPage extends StatelessWidget {
  const TodayPage({required this.userName, super.key});

  final String userName;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('امروز'),
      actions: [
        IconButton(tooltip: 'اعلان‌ها', icon: const Icon(Icons.notifications_outlined), onPressed: () => context.push(Routes.notifications)),
      ],
    ),
    body: BlocConsumer<TodayBloc, TodayState>(
      listenWhen: (a, b) => a.failure != b.failure && b.failure != null,
      listener: (context, state) => showAppSnack(context, state.failure!.message, error: true),
      builder: (context, state) {
        if (state.status == TodayStatus.loading) return const Center(child: CircularProgressIndicator());
        final bloc = context.read<TodayBloc>();
        return RefreshIndicator(
          onRefresh: () async {
            bloc.add(const TodayRefreshed());
            await bloc.stream.firstWhere((s) => !s.refreshing);
          },
          child: ListView(
            padding: const EdgeInsetsDirectional.all(AppSpace.s16),
            children: [
              _Header(userName: userName, state: state),
              const SizedBox(height: AppSpace.s12),
              ConnectionBanner(
                online: state.network.isOnline,
                queued: state.queue.total,
                wifiHeld: state.wifiOnly && state.network == NetworkKind.mobile && state.queue.photos > 0,
                onTap: () => context.push(Routes.queue),
              ),
              const SizedBox(height: AppSpace.s12),
              _ReportStatus(state: state),
              const SizedBox(height: AppSpace.s12),
              _QuickActions(state: state, userName: userName),
              const SizedBox(height: AppSpace.s16),
              const Text('فعالیت‌های امروز', style: AppText.title3),
              const SizedBox(height: AppSpace.s8),
              if (state.activities.isEmpty)
                EmptyState(
                  title: state.neverSynced ? 'هنوز همگام‌سازی نشده' : 'فعالیتی برای امروز نیست',
                  message: state.neverSynced
                      ? 'برای دریافت فعالیت‌ها یک بار به اینترنت وصل شوید و صفحه را پایین بکشید.'
                      : 'همهٔ فعالیت‌های شما در زبانهٔ «فعالیت‌ها» هست.',
                  icon: Icons.event_available_outlined,
                  actionLabel: state.neverSynced ? 'همگام‌سازی' : null,
                  onAction: state.neverSynced ? () => bloc.add(const TodayRefreshed()) : null,
                )
              else
                for (final a in state.activities)
                  ActivityTile(
                    activity: a,
                    today: state.today,
                    onOpen: () => context.push(Routes.activityOf(a.id)),
                    onReport: () => context.push(Routes.reportFormFor(projectId: a.projectId, activityId: a.id)),
                  ),
            ],
          ),
        );
      },
    ),
  );
}

class _Header extends StatelessWidget {
  const _Header({required this.userName, required this.state});

  final String userName;
  final TodayState state;

  @override
  Widget build(BuildContext context) {
    final project = state.projects.firstOrNull;
    final more = state.projects.length - 1;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('سلام، $userName', style: AppText.title2),
        Text(JalaliFormat.longDate(state.today), style: AppText.bodySm.copyWith(color: AppColors.gray600)),
        if (project != null)
          Text(
            more > 0 ? '${project.name} و ${toFaDigits(more)} پروژهٔ دیگر' : project.name,
            style: AppText.bodySm.copyWith(color: AppColors.gray600),
          ),
        if (state.sync.lastSyncAt != null)
          Text('آخرین همگام‌سازی: ${JalaliFormat.moment(state.sync.lastSyncAt!)}', style: AppText.caption.copyWith(color: AppColors.gray500)),
      ],
    );
  }
}

class _ReportStatus extends StatelessWidget {
  const _ReportStatus({required this.state});

  final TodayState state;

  @override
  Widget build(BuildContext context) {
    final done = state.hasReportToday;
    final approver = state.approverName;
    final deadline = state.deadline;
    return Container(
      padding: const EdgeInsetsDirectional.all(AppSpace.s12),
      decoration: BoxDecoration(color: done ? AppColors.success50 : AppColors.warning50, borderRadius: BorderRadius.circular(AppRadius.md)),
      child: Row(
        children: [
          Icon(done ? Icons.check_circle_outline : Icons.schedule, color: done ? AppColors.success700 : AppColors.warning700),
          const SizedBox(width: AppSpace.s8),
          Expanded(
            child: Text(
              [
                if (done) 'گزارش امروز ثبت شد' else 'گزارش امروز ثبت نشده',
                if (!done && deadline != null) 'مهلت تا ${toFaDigits(deadline)}',
                if (approver != null) 'ناظر: $approver',
              ].join(' · '),
              style: AppText.ui.copyWith(color: done ? AppColors.success700 : AppColors.warning700),
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickActions extends StatelessWidget {
  const _QuickActions({required this.state, required this.userName});

  final TodayState state;
  final String userName;

  @override
  Widget build(BuildContext context) {
    final project = state.projects.firstOrNull;
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: project == null ? null : () => context.push(Routes.issueNew),
            icon: const Icon(Icons.report_problem_outlined),
            label: const Text('گزارش مشکل'),
          ),
        ),
        const SizedBox(width: AppSpace.s8),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => unawaited(
              context.push(
                Routes.camera,
                extra: CaptureRequest(
                  target: QuickTarget(projectId: project?.id),
                  workDate: state.today,
                  supervisorName: userName,
                  siteName: project?.name,
                  siteLat: project?.site?.lat,
                  siteLng: project?.site?.lng,
                  siteRadiusM: project?.site?.radiusM,
                ),
              ),
            ),
            icon: const Icon(Icons.photo_camera_outlined),
            label: Text(state.quickPhotos > 0 ? 'عکس سریع (${toFaDigits(state.quickPhotos)})' : 'عکس سریع'),
          ),
        ),
      ],
    );
  }
}
