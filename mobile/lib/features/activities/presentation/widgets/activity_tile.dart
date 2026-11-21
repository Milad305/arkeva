import 'package:flutter/material.dart';
import 'package:projeyar_field/core/l10n/fa_num.dart';
import 'package:projeyar_field/core/theme/app_tokens.dart';
import 'package:projeyar_field/core/widgets/app_widgets.dart';
import 'package:projeyar_field/core/widgets/field_widgets.dart';
import 'package:projeyar_field/features/activities/domain/entities/activity_entities.dart';
import 'package:projeyar_field/features/activities/domain/services/activity_schedule.dart';

/// کارت فعالیت در M03 و M04: کد، عنوان، تأییدشده، برنامهٔ امروز، انحراف و دکمهٔ ثبت.
class ActivityTile extends StatelessWidget {
  const ActivityTile({required this.activity, required this.today, required this.onOpen, required this.onReport, super.key});

  final Activity activity;
  final String today;
  final VoidCallback onOpen;
  final VoidCallback onReport;

  @override
  Widget build(BuildContext context) {
    final planned = ActivitySchedule.plannedOn(activity, today);
    final pending = activity.lastPendingPercent;
    return Card(
      margin: const EdgeInsetsDirectional.only(bottom: AppSpace.s8),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        onTap: onOpen,
        child: Padding(
          padding: const EdgeInsetsDirectional.fromSTEB(AppSpace.s16, AppSpace.s12, AppSpace.s8, AppSpace.s12),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    LtrCode(activity.code),
                    const SizedBox(height: AppSpace.s2),
                    Text(activity.title, style: AppText.heading, maxLines: 2, overflow: TextOverflow.ellipsis),
                    const SizedBox(height: AppSpace.s8),
                    ProgressMeter(approved: activity.approvedPercent, planned: planned, pending: pending),
                    const SizedBox(height: AppSpace.s6),
                    Wrap(
                      spacing: AppSpace.s8,
                      children: [
                        Text('تأییدشده ${faPercent(activity.approvedPercent)}', style: AppText.caption),
                        if (pending != null) Text('آخرین ${faPercent(pending)}', style: AppText.caption.copyWith(color: AppColors.primary500)),
                        if (planned != null) Text('برنامهٔ امروز ${faPercent(planned)}', style: AppText.caption.copyWith(color: AppColors.gray600)),
                        DeviationText(ActivitySchedule.deviation(activity, today)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: AppSpace.s8),
              IconButton.filledTonal(
                tooltip: 'ثبت پیشرفت',
                iconSize: AppSize.iconLg,
                constraints: const BoxConstraints.tightFor(width: AppSize.controlLg, height: AppSize.controlLg),
                onPressed: onReport,
                icon: const Icon(Icons.edit_note),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
