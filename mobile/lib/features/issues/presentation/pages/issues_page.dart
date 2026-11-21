import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:projeyar_field/app/router/routes.dart';
import 'package:projeyar_field/core/l10n/labels.dart';
import 'package:projeyar_field/core/theme/app_tokens.dart';
import 'package:projeyar_field/core/time/clock.dart';
import 'package:projeyar_field/core/widgets/app_widgets.dart';
import 'package:projeyar_field/features/issues/domain/entities/issue_entities.dart';
import 'package:projeyar_field/features/issues/presentation/bloc/issues_list_cubit.dart';

/// مشکل‌های کارگاه من (M13 فهرست).
class IssuesPage extends StatelessWidget {
  const IssuesPage({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('مشکل‌های کارگاه')),
    floatingActionButton: FloatingActionButton.extended(
      onPressed: () => context.push(Routes.issueNew),
      icon: const Icon(Icons.add),
      label: const Text('گزارش مشکل'),
    ),
    body: BlocBuilder<IssuesListCubit, List<SiteIssue>?>(
      builder: (context, issues) {
        if (issues == null) return const Center(child: CircularProgressIndicator());
        if (issues.isEmpty) return const EmptyState(title: 'مشکلی ثبت نکرده‌اید', icon: Icons.report_problem_outlined);
        return ListView(
          padding: const EdgeInsetsDirectional.fromSTEB(AppSpace.s16, AppSpace.s16, AppSpace.s16, 96),
          children: [
            for (final i in issues)
              Card(
                margin: const EdgeInsetsDirectional.only(bottom: AppSpace.s8),
                child: ListTile(
                  title: Text(i.title, style: AppText.ui),
                  subtitle: Text(
                    [
                      Labels.issueType(i.type),
                      Labels.issueEffect(i.effect),
                      JalaliFormat.moment(i.reportedAt),
                      if (i.rejectMessage != null) i.rejectMessage!,
                    ].join(' · '),
                    style: AppText.caption,
                  ),
                  trailing: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      if (i.riskCode != null) LtrCode(i.riskCode!),
                      Text(
                        Labels.issueStatus(i.status),
                        style: AppText.label.copyWith(color: i.status == 'rejected' ? AppColors.error700 : AppColors.gray600),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        );
      },
    ),
  );
}
