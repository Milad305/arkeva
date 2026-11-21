import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:persian_datetime_picker/persian_datetime_picker.dart';
import 'package:projeyar_field/app/router/routes.dart';
import 'package:projeyar_field/core/l10n/digit_input_formatter.dart';
import 'package:projeyar_field/core/l10n/fa_num.dart';
import 'package:projeyar_field/core/l10n/labels.dart';
import 'package:projeyar_field/core/theme/app_tokens.dart';
import 'package:projeyar_field/core/time/clock.dart';
import 'package:projeyar_field/core/widgets/app_widgets.dart';
import 'package:projeyar_field/core/widgets/field_widgets.dart';
import 'package:projeyar_field/features/camera/domain/entities/photo_entities.dart';
import 'package:projeyar_field/features/reports/domain/entities/report_entities.dart';
import 'package:projeyar_field/features/reports/domain/services/progress_preview.dart';
import 'package:projeyar_field/features/reports/presentation/bloc/report_form_bloc.dart';
import 'package:projeyar_field/features/reports/presentation/widgets/method_inputs.dart';

/// M06 ثبت پیشرفت.
class ReportFormPage extends StatelessWidget {
  const ReportFormPage({required this.userName, super.key});

  final String userName;

  @override
  Widget build(BuildContext context) => BlocConsumer<ReportFormBloc, ReportFormState>(
    listenWhen: (a, b) => a.status != b.status || (b.failure != null && a.failure != b.failure),
    listener: (context, state) {
      if (state.status == ReportFormStatus.saved) {
        context.pushReplacement(Routes.reviewOf(state.reportId!));
      } else if (state.failure != null && state.status != ReportFormStatus.failure) {
        showAppSnack(context, state.failure!.message, error: true);
      }
    },
    builder: (context, state) {
      if (state.status == ReportFormStatus.loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
      if (state.status == ReportFormStatus.failure || state.activity == null) {
        return Scaffold(
          appBar: AppBar(),
          body: EmptyState(title: state.failure?.message ?? 'فرم باز نشد.', actionLabel: 'بازگشت', onAction: () => context.pop()),
        );
      }
      final a = state.activity!;
      final bloc = context.read<ReportFormBloc>();
      final rules = state.project!.rules;
      final warnings = state.preview?.warnings ?? const {};
      return Scaffold(
        appBar: AppBar(title: const Text('ثبت پیشرفت')),
        body: ListView(
          padding: const EdgeInsetsDirectional.all(AppSpace.s16),
          children: [
            LtrCode(a.code),
            Text(a.title, style: AppText.title3),
            const SizedBox(height: AppSpace.s4),
            Text(
              [
                if (a.lastPendingPercent != null) 'آخرین ${faPercent(a.lastPendingPercent!)}',
                'تأییدشده ${faPercent(a.approvedPercent)}',
                if (_planned(state) != null) 'برنامهٔ امروز ${faPercent(_planned(state)!)}',
              ].join(' · '),
              style: AppText.bodySm.copyWith(color: AppColors.gray600),
            ),
            const SizedBox(height: AppSpace.s16),
            SectionCard(title: 'پیشرفت · ${Labels.method(a.method.name)}', child: MethodInput(state: state)),
            SectionCard(
              title: 'عکس‌ها',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  PhotoStrip(
                    photoIds: [for (final p in state.photos) p.id],
                    loader: bloc.photoBytes,
                    minimum: rules.minPhotos,
                    onAdd: () => _openCamera(context, state),
                    onDelete: (id) => bloc.add(ReportPhotoDeleted(id)),
                    error: state.showErrors && warnings.contains(PreviewWarning.photosBelowMin)
                        ? previewWarningText(PreviewWarning.photosBelowMin, minPhotos: rules.minPhotos)
                        : null,
                  ),
                  if (state.quickPhotos.isNotEmpty) ...[
                    const SizedBox(height: AppSpace.s12),
                    const Text('عکس‌های سریع امروز؛ برای پیوست لمس کنید', style: AppText.caption),
                    const SizedBox(height: AppSpace.s6),
                    Wrap(
                      spacing: AppSpace.s8,
                      children: [
                        for (final q in state.quickPhotos)
                          GestureDetector(
                            onTap: () => bloc.add(ReportQuickPhotoAttached(q.id)),
                            child: EncryptedThumb(photoId: q.id, loader: bloc.photoBytes, size: 60),
                          ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            SectionCard(
              title: 'روز و نفرات',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  OutlinedButton.icon(
                    onPressed: () => _pickDate(context, state),
                    icon: const Icon(Icons.event_outlined),
                    label: Text('تاریخ کار: ${JalaliFormat.longDate(state.workDate ?? state.today)}'),
                  ),
                  const SizedBox(height: AppSpace.s12),
                  TextFormField(
                    key: ValueKey('crew-${state.itemId}'),
                    initialValue: state.crew.value,
                    keyboardType: TextInputType.number,
                    inputFormatters: const [LocalizedDigitsFormatter(maxLength: 5)],
                    decoration: InputDecoration(labelText: 'نفرات امروز روی این فعالیت', errorText: state.crewError),
                    onChanged: (v) => bloc.add(ReportCrewChanged(v)),
                  ),
                  const SizedBox(height: AppSpace.s12),
                  const Text('آب‌وهوا', style: AppText.label),
                  const SizedBox(height: AppSpace.s6),
                  Wrap(
                    spacing: AppSpace.s6,
                    runSpacing: AppSpace.s6,
                    children: [
                      for (final w in Weather.values)
                        ChoiceChip(
                          label: Text(Labels.weather(w.name)),
                          selected: state.weather == w,
                          onSelected: (sel) => bloc.add(ReportWeatherChanged(sel ? w : null)),
                        ),
                    ],
                  ),
                  const SizedBox(height: AppSpace.s12),
                  TextFormField(
                    key: ValueKey('temp-${state.itemId}'),
                    initialValue: state.temperature.value,
                    keyboardType: const TextInputType.numberWithOptions(signed: true),
                    decoration: InputDecoration(labelText: 'دما (اختیاری)', suffixText: '°C', errorText: state.temperatureError),
                    onChanged: (v) => bloc.add(ReportTemperatureChanged(v)),
                  ),
                ],
              ),
            ),
            SectionCard(
              title: 'توضیح',
              child: TextFormField(
                key: ValueKey('note-${state.itemId}'),
                initialValue: state.note.value,
                maxLines: 3,
                maxLength: 2000,
                decoration: InputDecoration(hintText: 'اختیاری', errorText: state.noteError),
                onChanged: (v) => bloc.add(ReportNoteChanged(v)),
              ),
            ),
            for (final w in warnings.where((w) => w != PreviewWarning.photosBelowMin || state.showErrors))
              Padding(
                padding: const EdgeInsetsDirectional.only(bottom: AppSpace.s6),
                child: Row(
                  children: [
                    Icon(Icons.warning_amber_rounded, size: AppSize.icon, color: _blocking(w) ? AppColors.error700 : AppColors.warning700),
                    const SizedBox(width: AppSpace.s6),
                    Expanded(
                      child: Text(
                        previewWarningText(w, minPhotos: rules.minPhotos, maxJump: rules.maxJumpPct),
                        style: AppText.bodySm.copyWith(color: _blocking(w) ? AppColors.error700 : AppColors.warning700),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
        bottomNavigationBar: SafeArea(
          child: Padding(
            padding: const EdgeInsetsDirectional.all(AppSpace.s16),
            child: PrimaryButton(
              label: 'ذخیره و بازبینی',
              icon: Icons.fact_check_outlined,
              loading: state.status == ReportFormStatus.saving,
              onPressed: () => bloc.add(const ReportItemSaved()),
            ),
          ),
        ),
      );
    },
  );

  static bool _blocking(PreviewWarning w) => w == PreviewWarning.decreaseNotAllowed || w == PreviewWarning.photosBelowMin;

  static double? _planned(ReportFormState s) {
    for (final p in s.activity!.plan) {
      if (p.date == s.today) return p.plannedPercent;
    }
    return null;
  }

  void _openCamera(BuildContext context, ReportFormState state) {
    final target = context.read<ReportFormBloc>().photoTarget;
    if (target == null) return;
    final site = state.project!.site;
    unawaited(
      context.push(
        Routes.camera,
        extra: CaptureRequest(
          target: target,
          workDate: state.workDate ?? state.today,
          supervisorName: userName,
          siteName: state.project!.name,
          activityCode: state.activity!.code,
          siteLat: site?.lat,
          siteLng: site?.lng,
          siteRadiusM: site?.radiusM,
        ),
      ),
    );
  }

  Future<void> _pickDate(BuildContext context, ReportFormState state) async {
    final bloc = context.read<ReportFormBloc>();
    final picked = await showPersianDatePicker(
      context: context,
      initialDate: JalaliFormat.fromIso(state.workDate ?? state.today),
      firstDate: JalaliFormat.fromIso(state.earliestWorkDate),
      lastDate: JalaliFormat.fromIso(state.today),
    );
    if (picked == null) return;
    bloc.add(ReportWorkDateChanged(TehranTime.isoDate(picked.toDateTime())));
  }
}
