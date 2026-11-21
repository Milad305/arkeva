import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:projeyar_field/app/router/routes.dart';
import 'package:projeyar_field/core/l10n/fa_num.dart';
import 'package:projeyar_field/core/l10n/labels.dart';
import 'package:projeyar_field/core/theme/app_tokens.dart';
import 'package:projeyar_field/core/time/clock.dart';
import 'package:projeyar_field/core/widgets/app_widgets.dart';
import 'package:projeyar_field/core/widgets/field_widgets.dart';
import 'package:projeyar_field/features/activities/domain/entities/activity_entities.dart';
import 'package:projeyar_field/features/activities/domain/services/activity_schedule.dart';
import 'package:projeyar_field/features/activities/presentation/bloc/activity_detail_bloc.dart';
import 'package:projeyar_field/features/reports/domain/entities/report_entities.dart';

/// M05 جزئیات فعالیت.
class ActivityDetailPage extends StatelessWidget {
  const ActivityDetailPage({super.key});

  @override
  Widget build(BuildContext context) => BlocBuilder<ActivityDetailBloc, ActivityDetailState>(
    builder: (context, state) {
      final a = state.activity;
      if (a == null) {
        return Scaffold(
          appBar: AppBar(),
          body: state.loaded
              ? const EmptyState(title: 'این فعالیت دیگر به شما سپرده نیست', message: 'فهرست فعالیت‌ها را پس از همگام‌سازی ببینید.')
              : const Center(child: CircularProgressIndicator()),
        );
      }
      final planned = ActivitySchedule.plannedOn(a, state.today);
      final revision = state.revision;
      return Scaffold(
        appBar: AppBar(title: LtrCode(a.code, style: AppText.code.copyWith(fontSize: 15, color: AppColors.gray900))),
        body: ListView(
          padding: const EdgeInsetsDirectional.all(AppSpace.s16),
          children: [
            Text(a.title, style: AppText.title3),
            if (state.project != null) Text(state.project!.name, style: AppText.bodySm.copyWith(color: AppColors.gray600)),
            const SizedBox(height: AppSpace.s16),
            if (revision != null) ...[
              _RevisionNotice(item: revision),
              const SizedBox(height: AppSpace.s12),
            ],
            SectionCard(
              title: 'پیشرفت',
              trailing: DeviationText(ActivitySchedule.deviation(a, state.today)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  ProgressMeter(approved: a.approvedPercent, planned: planned, pending: a.lastPendingPercent),
                  const SizedBox(height: AppSpace.s12),
                  _Row('تأییدشده', faPercent(a.approvedPercent)),
                  if (a.lastPendingPercent != null) _Row('آخرین گزارش در انتظار', faPercent(a.lastPendingPercent!)),
                  if (planned != null) _Row('برنامه تا امروز', faPercent(planned)),
                  if (a.method == MeasureMethod.quantity && a.totalQuantity != null)
                    _Row(
                      'انجام‌شده از کل',
                      '${faNum(a.approvedQuantity ?? a.approvedPercent * a.totalQuantity! / 100)} از ${faNum(a.totalQuantity!)} ${a.unit ?? ''}',
                    ),
                  _Row('روش ثبت', Labels.method(a.method.name)),
                  if (a.plannedStart != null && a.plannedFinish != null)
                    _Row('بازهٔ برنامه', '${JalaliFormat.date(a.plannedStart!)} تا ${JalaliFormat.date(a.plannedFinish!)}'),
                  if (a.approverName != null) _Row('تأییدکننده', a.approverName!),
                ],
              ),
            ),
            if (a.steps.isNotEmpty)
              SectionCard(
                title: 'گام‌ها',
                child: Column(children: [for (final s in a.steps) _Row(s.title, faPercent(s.approvedPercent))]),
              ),
            SectionCard(
              title: 'تاریخچهٔ گزارش‌ها',
              child: state.history.isEmpty
                  ? Text('هنوز گزارشی از این فعالیت در سرور نیست.', style: AppText.bodySm.copyWith(color: AppColors.gray600))
                  : Column(children: [for (final i in state.history) _HistoryRow(item: i)]),
            ),
          ],
        ),
        bottomNavigationBar: SafeArea(
          child: Padding(
            padding: const EdgeInsetsDirectional.all(AppSpace.s16),
            child: PrimaryButton(
              label: 'ثبت پیشرفت',
              icon: Icons.edit_note,
              onPressed: () => context.push(Routes.reportFormFor(projectId: a.projectId, activityId: a.id)),
            ),
          ),
        ),
      );
    },
  );
}

class _Row extends StatelessWidget {
  const _Row(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsetsDirectional.symmetric(vertical: AppSpace.s4),
    child: Row(
      children: [
        Expanded(child: Text(label, style: AppText.bodySm.copyWith(color: AppColors.gray600))),
        Text(value, style: AppText.ui),
      ],
    ),
  );
}

class _RevisionNotice extends StatelessWidget {
  const _RevisionNotice({required this.item});

  final ServerItem item;

  @override
  Widget build(BuildContext context) => Material(
    color: AppColors.warning50,
    borderRadius: BorderRadius.circular(AppRadius.md),
    child: InkWell(
      borderRadius: BorderRadius.circular(AppRadius.md),
      onTap: () => context.push(Routes.revisionOf(item.id)),
      child: Padding(
        padding: const EdgeInsetsDirectional.all(AppSpace.s12),
        child: Row(
          children: [
            const Icon(Icons.assignment_return_outlined, color: AppColors.warning700),
            const SizedBox(width: AppSpace.s8),
            Expanded(
              child: Text(
                'ناظر اصلاح خواسته است${item.revision?.note == null ? '' : ': ${item.revision!.note}'}',
                style: AppText.bodySm.copyWith(color: AppColors.warning700),
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.warning700),
          ],
        ),
      ),
    ),
  );
}

class _HistoryRow extends StatelessWidget {
  const _HistoryRow({required this.item});

  final ServerItem item;

  @override
  Widget build(BuildContext context) {
    final (fg, bg) = Labels.itemStatusColors(item.status.name);
    return Padding(
      padding: const EdgeInsetsDirectional.symmetric(vertical: AppSpace.s6),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (item.reportNo != null) LtrCode(item.reportNo!),
                Text(
                  [if (item.workDate != null) JalaliFormat.date(item.workDate!), if (item.computedPercent != null) faPercent(item.computedPercent!)].join(' · '),
                  style: AppText.caption,
                ),
              ],
            ),
          ),
          StatusChip(label: Labels.itemStatus(item.status.name), foreground: fg, background: bg),
        ],
      ),
    );
  }
}
