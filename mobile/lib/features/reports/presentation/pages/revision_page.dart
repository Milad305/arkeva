import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:projeyar_field/app/router/routes.dart';
import 'package:projeyar_field/core/l10n/digit_input_formatter.dart';
import 'package:projeyar_field/core/l10n/fa_num.dart';
import 'package:projeyar_field/core/theme/app_tokens.dart';
import 'package:projeyar_field/core/time/clock.dart';
import 'package:projeyar_field/core/widgets/app_widgets.dart';
import 'package:projeyar_field/core/widgets/field_widgets.dart';
import 'package:projeyar_field/features/activities/domain/entities/activity_entities.dart';
import 'package:projeyar_field/features/camera/domain/entities/photo_entities.dart';
import 'package:projeyar_field/features/reports/presentation/bloc/revision_bloc.dart';

/// M11 اصلاح: یادداشت ناظر، چک‌لیست، عکس‌های «نامناسب»، مقدار تازه، عکس تازه و پاسخ.
class RevisionPage extends StatelessWidget {
  const RevisionPage({required this.userName, super.key});

  final String userName;

  @override
  Widget build(BuildContext context) => BlocConsumer<RevisionBloc, RevisionState>(
    listenWhen: (a, b) => a.status != b.status || (b.failure != null && a.failure != b.failure),
    listener: (context, state) {
      if (state.status == RevisionStatus.queued) {
        showAppSnack(context, 'اصلاح در صف ارسال ذخیره شد.');
        context.pop();
      } else if (state.failure != null) {
        showAppSnack(context, state.failure!.message, error: true);
      }
    },
    builder: (context, state) {
      final item = state.item;
      if (state.status == RevisionStatus.missing) {
        return Scaffold(appBar: AppBar(), body: const EmptyState(title: 'این درخواست اصلاح دیگر باز نیست.'));
      }
      if (item == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));
      final bloc = context.read<RevisionBloc>();
      final request = state.request;
      final a = state.activity;
      final unsuitable = item.photos.where((p) => p.markedUnsuitable).length;
      return Scaffold(
        appBar: AppBar(title: const Text('اصلاح گزارش')),
        body: ListView(
          padding: const EdgeInsetsDirectional.all(AppSpace.s16),
          children: [
            if (a != null) ...[LtrCode(a.code), Text(a.title, style: AppText.title3)],
            if (item.reportNo != null) LtrCode(item.reportNo!),
            const SizedBox(height: AppSpace.s12),
            SectionCard(
              title: 'یادداشت ناظر',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(request?.note ?? 'ناظر یادداشتی ننوشته است.', style: AppText.body),
                  if (request?.requestedAt != null)
                    Text(JalaliFormat.moment(request!.requestedAt!), style: AppText.caption.copyWith(color: AppColors.gray500)),
                  if (unsuitable > 0)
                    Text('${toFaDigits(unsuitable)} عکس «نامناسب» علامت خورده است.', style: AppText.bodySm.copyWith(color: AppColors.error700)),
                ],
              ),
            ),
            if (request != null && request.actions.isNotEmpty)
              SectionCard(
                title: 'کارهای لازم',
                child: Column(
                  children: [
                    for (final action in request.actions)
                      action.isPhoto
                          ? ListTile(
                              contentPadding: EdgeInsets.zero,
                              leading: Icon(
                                state.photosDone ? Icons.check_circle : Icons.photo_camera_outlined,
                                color: state.photosDone ? AppColors.success700 : AppColors.warning700,
                              ),
                              title: Text(action.text),
                              subtitle: Text('${toFaDigits(action.minPhotos ?? 1)} عکس تازه', style: AppText.caption),
                            )
                          : CheckboxListTile(
                              contentPadding: EdgeInsets.zero,
                              controlAffinity: ListTileControlAffinity.leading,
                              value: state.checkedKeys.contains(action.key),
                              onChanged: (_) => bloc.add(RevisionCheckToggled(action.key)),
                              title: Text(action.text),
                            ),
                  ],
                ),
              ),
            SectionCard(title: 'مقدار تازه', child: _ValueInput(state: state)),
            SectionCard(
              title: 'عکس تازه',
              child: PhotoStrip(
                photoIds: [for (final p in state.newPhotos) p.id],
                loader: bloc.photoBytes,
                minimum: state.requiredPhotos,
                onAdd: () => _openCamera(context, state),
                onDelete: (id) => bloc.add(RevisionPhotoDeleted(id)),
              ),
            ),
            SectionCard(
              title: 'پاسخ به ناظر',
              child: TextField(
                maxLines: 3,
                maxLength: 2000,
                decoration: InputDecoration(hintText: 'اختیاری', errorText: state.showErrors ? state.reply.messageOf(state.reply.error) : null),
                onChanged: (v) => bloc.add(RevisionReplyChanged(v)),
              ),
            ),
            if (state.alreadyQueued)
              Text('اصلاح قبلی این آیتم هنوز در صف است.', style: AppText.bodySm.copyWith(color: AppColors.info700))
            else if (!state.photosDone)
              Text(
                'برای ارسال دوباره ${toFaDigits(state.requiredPhotos - state.newPhotos.length)} عکس تازه دیگر بگیرید.',
                style: AppText.bodySm.copyWith(color: AppColors.warning700),
              )
            else if (!state.checksDone)
              Text('همهٔ کارهای لازم را تیک بزنید.', style: AppText.bodySm.copyWith(color: AppColors.warning700)),
          ],
        ),
        bottomNavigationBar: SafeArea(
          child: Padding(
            padding: const EdgeInsetsDirectional.all(AppSpace.s16),
            child: PrimaryButton(
              label: 'ارسال دوباره',
              icon: Icons.send,
              loading: state.status == RevisionStatus.submitting,
              onPressed: state.canResubmit ? () => bloc.add(const RevisionSubmitted()) : null,
            ),
          ),
        ),
      );
    },
  );

  void _openCamera(BuildContext context, RevisionState state) {
    final target = context.read<RevisionBloc>().photoTarget;
    if (target == null) return;
    unawaited(
      context.push(
        Routes.camera,
        extra: CaptureRequest(
          target: target,
          workDate: state.item!.workDate ?? TehranTime.today(DateTime.now()),
          supervisorName: userName,
          activityCode: state.activity?.code,
        ),
      ),
    );
  }
}

class _ValueInput extends StatelessWidget {
  const _ValueInput({required this.state});

  final RevisionState state;

  @override
  Widget build(BuildContext context) {
    final bloc = context.read<RevisionBloc>();
    final a = state.activity;
    if (a?.method == MeasureMethod.steps) {
      return Column(
        children: [
          for (final step in a!.steps)
            Row(
              children: [
                Expanded(child: Text(step.title, style: AppText.ui)),
                SizedBox(
                  width: 180,
                  child: Slider(
                    value: (state.steps[step.key] ?? 0).clamp(0, 100).toDouble(),
                    max: 100,
                    divisions: 20,
                    label: faPercent(state.steps[step.key] ?? 0, maxFractionDigits: 0),
                    onChanged: (v) => bloc.add(RevisionStepChanged(step.key, v)),
                  ),
                ),
              ],
            ),
        ],
      );
    }
    final quantity = a?.method == MeasureMethod.quantity;
    return TextFormField(
      initialValue: state.value,
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      inputFormatters: const [LocalizedDigitsFormatter(allowDecimal: true, maxLength: 12)],
      decoration: InputDecoration(
        labelText: quantity ? 'مقدار انجام‌شدهٔ آن روز' : 'درصد تجمعی',
        suffixText: quantity ? a?.unit : '٪',
        errorText: state.valueError,
      ),
      onChanged: (v) => bloc.add(RevisionValueChanged(v)),
    );
  }
}
