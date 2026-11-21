import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:projeyar_field/app/router/routes.dart';
import 'package:projeyar_field/core/l10n/fa_num.dart';
import 'package:projeyar_field/core/l10n/labels.dart';
import 'package:projeyar_field/core/theme/app_tokens.dart';
import 'package:projeyar_field/core/time/clock.dart';
import 'package:projeyar_field/core/widgets/app_widgets.dart';
import 'package:projeyar_field/features/reports/domain/entities/report_entities.dart';
import 'package:projeyar_field/features/reports/presentation/bloc/reports_list_bloc.dart';

/// M10 گزارش‌های من: زبانه‌ها بر اساس وضعیت و «N گزارش هنوز در گوشی است».
class ReportsPage extends StatelessWidget {
  const ReportsPage({super.key});

  @override
  Widget build(BuildContext context) => BlocBuilder<ReportsListBloc, ReportsListState>(
    builder: (context, state) => DefaultTabController(
      length: 4,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('گزارش‌های من'),
          actions: [IconButton(tooltip: 'مشکل‌های کارگاه', icon: const Icon(Icons.report_problem_outlined), onPressed: () => context.push(Routes.issues))],
          bottom: TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: [
              Tab(text: 'در گوشی (${toFaDigits(state.local.length)})'),
              Tab(text: 'در انتظار (${toFaDigits(state.pending.length)})'),
              Tab(text: 'نیاز به اصلاح (${toFaDigits(state.revisions.length)})'),
              const Tab(text: 'تصمیم‌گرفته'),
            ],
          ),
        ),
        body: !state.loaded
            ? const Center(child: CircularProgressIndicator())
            : Column(
                children: [
                  if (state.onDevice > 0)
                    Material(
                      color: AppColors.warning50,
                      child: ListTile(
                        leading: const Icon(Icons.phone_android, color: AppColors.warning700),
                        title: Text('${toFaDigits(state.onDevice)} گزارش هنوز در گوشی است', style: AppText.ui.copyWith(color: AppColors.warning700)),
                        trailing: const Icon(Icons.chevron_right, color: AppColors.warning700),
                        onTap: () => context.push(Routes.queue),
                      ),
                    ),
                  Expanded(
                    child: TabBarView(
                      children: [
                        _LocalList(state: state),
                        _ServerList(state: state, items: state.pending, empty: 'گزارشی در انتظار تأیید نیست.'),
                        _ServerList(state: state, items: state.revisions, empty: 'درخواست اصلاحی ندارید.'),
                        _ServerList(state: state, items: state.decided, empty: 'در ۱۴ روز اخیر تصمیمی گرفته نشده.'),
                      ],
                    ),
                  ),
                ],
              ),
      ),
    ),
  );
}

class _LocalList extends StatelessWidget {
  const _LocalList({required this.state});

  final ReportsListState state;

  @override
  Widget build(BuildContext context) {
    if (state.local.isEmpty) return const EmptyState(title: 'همهٔ گزارش‌ها ارسال شده‌اند', icon: Icons.cloud_done_outlined);
    return ListView(
      padding: const EdgeInsetsDirectional.all(AppSpace.s16),
      children: [
        for (final r in state.local)
          Card(
            margin: const EdgeInsetsDirectional.only(bottom: AppSpace.s8),
            child: ListTile(
              title: Text(
                r.items.map((i) => state.activities[i.activityId]?.title ?? '—').join('، '),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: AppText.ui,
              ),
              subtitle: Text(
                [
                  JalaliFormat.date(r.workDate),
                  switch (r.state) {
                    LocalReportState.draft => 'پیش‌نویس',
                    LocalReportState.queued => 'در صف ارسال',
                    LocalReportState.rejected => 'پذیرفته نشد: ${r.rejectMessage ?? ''}',
                    LocalReportState.sent => 'ارسال شد',
                  },
                ].join(' · '),
                style: AppText.caption.copyWith(color: r.state == LocalReportState.rejected ? AppColors.error700 : AppColors.gray600),
              ),
              trailing: r.state == LocalReportState.draft ? const Icon(Icons.chevron_right) : null,
              onTap: r.state == LocalReportState.draft ? () => context.push(Routes.reviewOf(r.id)) : null,
            ),
          ),
      ],
    );
  }
}

class _ServerList extends StatelessWidget {
  const _ServerList({required this.state, required this.items, required this.empty});

  final ReportsListState state;
  final List<ServerItem> items;
  final String empty;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return EmptyState(title: empty);
    return ListView(
      padding: const EdgeInsetsDirectional.all(AppSpace.s16),
      children: [
        for (final i in items)
          Card(
            margin: const EdgeInsetsDirectional.only(bottom: AppSpace.s8),
            child: ListTile(
              title: Text(state.activities[i.activityId]?.title ?? 'فعالیت', style: AppText.ui),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      if (i.reportNo != null) ...[LtrCode(i.reportNo!), const SizedBox(width: AppSpace.s8)],
                      if (i.workDate != null) Text(JalaliFormat.date(i.workDate!), style: AppText.caption),
                      if (i.computedPercent != null) Text(' · ${faPercent(i.computedPercent!)}', style: AppText.caption),
                    ],
                  ),
                  if (i.flags.isNotEmpty)
                    Text(i.flags.map(Labels.flag).join('، '), style: AppText.caption.copyWith(color: AppColors.warning700)),
                  if (state.queuedResubmissions.contains(i.id))
                    Text('اصلاح در صف ارسال است', style: AppText.caption.copyWith(color: AppColors.info700)),
                ],
              ),
              trailing: _chip(i.status),
              onTap: i.status == ItemStatus.needsRevision ? () => context.push(Routes.revisionOf(i.id)) : null,
            ),
          ),
      ],
    );
  }

  static Widget _chip(ItemStatus status) {
    final (fg, bg) = Labels.itemStatusColors(status.name);
    return StatusChip(label: Labels.itemStatus(status.name), foreground: fg, background: bg);
  }
}
