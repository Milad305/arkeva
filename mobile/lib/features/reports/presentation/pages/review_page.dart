import 'dart:async';

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
import 'package:projeyar_field/features/reports/presentation/bloc/review_bloc.dart';
import 'package:projeyar_field/features/reports/presentation/widgets/method_inputs.dart';

/// M08 بازبینی و ارسال.
class ReviewPage extends StatelessWidget {
  const ReviewPage({super.key});

  @override
  Widget build(BuildContext context) => BlocConsumer<ReviewBloc, ReviewState>(
    listenWhen: (a, b) => a.status != b.status || (b.failure != null && a.failure != b.failure),
    listener: (context, state) {
      if (state.status == ReviewStatus.queued) {
        showAppSnack(context, state.online ? 'گزارش ذخیره شد و در حال ارسال است.' : 'گزارش در صف ارسال ذخیره شد؛ با وصل شدن خودکار می‌رود.');
        context.go(Routes.today);
      } else if (state.status == ReviewStatus.discarded) {
        context.go(Routes.today);
      } else if (state.failure != null) {
        showAppSnack(context, state.failure!.message, error: true);
      }
    },
    builder: (context, state) {
      final draft = state.draft;
      if (state.status == ReviewStatus.missing) {
        return Scaffold(appBar: AppBar(), body: const EmptyState(title: 'این گزارش دیگر پیش‌نویس نیست.'));
      }
      if (draft == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));
      final bloc = context.read<ReviewBloc>();
      final crew = state.lines.fold<int>(0, (sum, l) => sum + (l.item.crewCount ?? 0));
      return Scaffold(
        appBar: AppBar(
          title: const Text('بازبینی و ارسال'),
          actions: [IconButton(tooltip: 'حذف پیش‌نویس', icon: const Icon(Icons.delete_outline), onPressed: () => _confirmDiscard(context))],
        ),
        body: ListView(
          padding: const EdgeInsetsDirectional.all(AppSpace.s16),
          children: [
            Text(state.project?.name ?? '', style: AppText.title3),
            Text(
              [
                'تاریخ کار ${JalaliFormat.longDate(draft.workDate)}',
                if (draft.weather != null) Labels.weather(draft.weather!.name),
                if (draft.temperatureC != null) '${toFaDigits(draft.temperatureC)}°',
                if (crew > 0) '${toFaDigits(crew)} نفر',
              ].join(' · '),
              style: AppText.bodySm.copyWith(color: AppColors.gray600),
            ),
            const SizedBox(height: AppSpace.s16),
            for (final line in state.lines) _LineCard(line: line, projectId: draft.projectId, showErrors: state.showErrors, minPhotos: state.project?.rules.minPhotos ?? 0),
            OutlinedButton.icon(
              onPressed: () => _addActivity(context, state),
              icon: const Icon(Icons.add),
              label: const Text('افزودن فعالیت دیگر به این گزارش'),
            ),
            const SizedBox(height: AppSpace.s16),
            if (state.route != null) _RouteNotice(approvers: state.route!.approvers, twoStage: state.route!.twoStage),
            const SizedBox(height: AppSpace.s12),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              value: state.attested,
              onChanged: (v) => bloc.add(ReviewAttestChanged(value: v ?? false)),
              title: const Text('صحت درصد، مقدار و عکس‌های این گزارش را تأیید می‌کنم'),
            ),
          ],
        ),
        bottomNavigationBar: SafeArea(
          child: Padding(
            padding: const EdgeInsetsDirectional.all(AppSpace.s16),
            child: PrimaryButton(
              success: true,
              label: state.online ? 'ارسال گزارش' : 'ذخیره در صف ارسال',
              icon: state.online ? Icons.send : Icons.save_alt,
              loading: state.status == ReviewStatus.submitting,
              onPressed: state.canSubmit ? () => bloc.add(const ReviewSubmitted()) : null,
            ),
          ),
        ),
      );
    },
  );

  /// انتخاب فعالیت دیگر در M04؛ M06 پیش‌نویس باز همان پروژه را ادامه می‌دهد.
  void _addActivity(BuildContext context, ReviewState state) {
    context.go(Routes.activities);
    showAppSnack(context, 'فعالیت دیگری از «${state.project?.name ?? ''}» را ثبت کنید؛ به همین گزارش اضافه می‌شود.');
  }

  Future<void> _confirmDiscard(BuildContext context) async {
    final bloc = context.read<ReviewBloc>();
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('حذف پیش‌نویس'),
        content: const Text('این پیش‌نویس و عکس‌هایش از گوشی پاک می‌شود.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('نگه داشتن')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('حذف پیش‌نویس')),
        ],
      ),
    );
    if (ok ?? false) bloc.add(const ReviewDiscarded());
  }
}

class _LineCard extends StatelessWidget {
  const _LineCard({required this.line, required this.projectId, required this.showErrors, required this.minPhotos});

  final ReviewLine line;
  final String projectId;
  final bool showErrors;
  final int minPhotos;

  @override
  Widget build(BuildContext context) {
    final a = line.activity;
    final p = line.preview;
    final incomplete = !line.item.isComplete;
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (a != null) LtrCode(a.code),
                    Text(a?.title ?? 'فعالیتی که دیگر سپرده نیست', style: AppText.heading),
                  ],
                ),
              ),
              IconButton(
                tooltip: 'ویرایش',
                icon: const Icon(Icons.edit_outlined),
                onPressed: () => context.push(Routes.reportFormFor(projectId: projectId, activityId: line.item.activityId)),
              ),
              IconButton(
                tooltip: 'حذف از گزارش',
                icon: const Icon(Icons.remove_circle_outline),
                onPressed: () => context.read<ReviewBloc>().add(ReviewItemRemoved(line.item.id)),
              ),
            ],
          ),
          const SizedBox(height: AppSpace.s6),
          if (incomplete)
            Text('مقدار وارد نشده است؛ ویرایش کنید یا حذف کنید.', style: AppText.bodySm.copyWith(color: AppColors.error700))
          else if (p != null)
            Text(
              '${faPercent(p.base)} ← ${p.cumulative == null ? '—' : faPercent(p.cumulative!)}'
              '${line.item.values.quantityToday != null && a?.unit != null ? ' · ${faNum(line.item.values.quantityToday!)} ${a!.unit}' : ''}',
              style: AppText.subheading.copyWith(color: AppColors.primary700),
            ),
          Text(
            [
              '${toFaDigits(line.photoCount)} عکس',
              if (line.item.crewCount != null) '${toFaDigits(line.item.crewCount)} نفر',
            ].join(' · '),
            style: AppText.caption,
          ),
          if (p != null)
            for (final w in p.warnings)
              Text(previewWarningText(w, minPhotos: minPhotos), style: AppText.caption.copyWith(color: AppColors.warning700)),
        ],
      ),
    );
  }
}

class _RouteNotice extends StatelessWidget {
  const _RouteNotice({required this.approvers, required this.twoStage});

  final List<String> approvers;
  final bool twoStage;

  @override
  Widget build(BuildContext context) {
    final who = approvers.isEmpty ? 'ناظر پروژه' : approvers.join(' و ');
    final text = 'برای تأیید به $who می‌رود؛ ${twoStage ? 'پس از آن مرحلهٔ دوم هم لازم است' : 'مرحلهٔ دوم لازم نیست'}.';
    return Container(
      padding: const EdgeInsetsDirectional.all(AppSpace.s12),
      decoration: BoxDecoration(color: AppColors.info50, borderRadius: BorderRadius.circular(AppRadius.md)),
      child: Row(
        children: [
          const Icon(Icons.alt_route, color: AppColors.info700, size: AppSize.icon),
          const SizedBox(width: AppSpace.s8),
          Expanded(child: Text(text, style: AppText.bodySm.copyWith(color: AppColors.info700))),
        ],
      ),
    );
  }
}
