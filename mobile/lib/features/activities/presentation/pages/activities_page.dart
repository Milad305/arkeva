import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:projeyar_field/app/router/routes.dart';
import 'package:projeyar_field/core/theme/app_tokens.dart';
import 'package:projeyar_field/core/widgets/app_widgets.dart';
import 'package:projeyar_field/features/activities/presentation/bloc/activities_bloc.dart';
import 'package:projeyar_field/features/activities/presentation/widgets/activity_tile.dart';

/// M04 فعالیت‌های من.
class ActivitiesPage extends StatelessWidget {
  const ActivitiesPage({super.key});

  static const Map<ActivityFilter, String> _filters = {
    ActivityFilter.all: 'همه',
    ActivityFilter.today: 'امروز',
    ActivityFilter.behind: 'عقب از برنامه',
    ActivityFilter.pending: 'در انتظار تأیید',
    ActivityFilter.done: 'تمام‌شده',
  };

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('فعالیت‌های من')),
    body: BlocBuilder<ActivitiesBloc, ActivitiesState>(
      builder: (context, state) {
        if (!state.loaded) return const Center(child: CircularProgressIndicator());
        final groups = state.groups;
        return Column(
          children: [
            SizedBox(
              height: AppSize.controlLg,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsetsDirectional.symmetric(horizontal: AppSpace.s16, vertical: AppSpace.s8),
                children: [
                  for (final f in _filters.entries)
                    Padding(
                      padding: const EdgeInsetsDirectional.only(end: AppSpace.s8),
                      child: ChoiceChip(
                        label: Text(f.value),
                        selected: state.filter == f.key,
                        onSelected: (_) => context.read<ActivitiesBloc>().add(ActivitiesFilterChanged(f.key)),
                      ),
                    ),
                ],
              ),
            ),
            Expanded(
              child: groups.isEmpty
                  ? EmptyState(
                      title: state.all.isEmpty ? 'فعالیتی به شما سپرده نشده' : 'فعالیتی با این فیلتر نیست',
                      message: state.all.isEmpty ? 'پس از تخصیص در وب و همگام‌سازی، فعالیت‌ها اینجا می‌آیند.' : null,
                      actionLabel: state.all.isEmpty ? null : 'نمایش همه',
                      onAction: state.all.isEmpty ? null : () => context.read<ActivitiesBloc>().add(const ActivitiesFilterChanged(ActivityFilter.all)),
                      icon: Icons.checklist,
                    )
                  : ListView(
                      padding: const EdgeInsetsDirectional.fromSTEB(AppSpace.s16, 0, AppSpace.s16, AppSpace.s16),
                      children: [
                        for (final g in groups) ...[
                          Padding(
                            padding: const EdgeInsetsDirectional.only(top: AppSpace.s12, bottom: AppSpace.s8),
                            child: Row(
                              children: [
                                Flexible(child: Text(g.project.name, style: AppText.subheading)),
                                if (g.parentCode != null) ...[
                                  const SizedBox(width: AppSpace.s8),
                                  LtrCode(g.parentCode!),
                                ],
                              ],
                            ),
                          ),
                          for (final a in g.activities)
                            ActivityTile(
                              activity: a,
                              today: state.today,
                              onOpen: () => context.push(Routes.activityOf(a.id)),
                              onReport: () => context.push(Routes.reportFormFor(projectId: a.projectId, activityId: a.id)),
                            ),
                        ],
                      ],
                    ),
            ),
          ],
        );
      },
    ),
  );
}
