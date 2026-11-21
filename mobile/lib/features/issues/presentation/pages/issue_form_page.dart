import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:projeyar_field/app/router/routes.dart';
import 'package:projeyar_field/core/l10n/labels.dart';
import 'package:projeyar_field/core/theme/app_tokens.dart';
import 'package:projeyar_field/core/widgets/app_widgets.dart';
import 'package:projeyar_field/core/widgets/field_widgets.dart';
import 'package:projeyar_field/features/camera/domain/entities/photo_entities.dart';
import 'package:projeyar_field/features/issues/domain/entities/issue_entities.dart';
import 'package:projeyar_field/features/issues/presentation/bloc/issue_form_bloc.dart';

/// M13 گزارش مشکل کارگاه.
class IssueFormPage extends StatelessWidget {
  const IssueFormPage({required this.userName, super.key});

  final String userName;

  @override
  Widget build(BuildContext context) => BlocConsumer<IssueFormBloc, IssueFormState>(
    listenWhen: (a, b) => a.status != b.status || (b.failure != null && a.failure != b.failure),
    listener: (context, state) {
      if (state.status == IssueFormStatus.saved) {
        showAppSnack(context, 'مشکل در صف ارسال ذخیره شد و به مدیر پروژه می‌رسد.');
        context.pop();
      } else if (state.failure != null) {
        showAppSnack(context, state.failure!.message, error: true);
      }
    },
    builder: (context, state) {
      if (state.status == IssueFormStatus.loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
      final bloc = context.read<IssueFormBloc>();
      if (state.projects.isEmpty) {
        return Scaffold(appBar: AppBar(), body: const EmptyState(title: 'پروژه‌ای همگام نشده است', message: 'یک بار به اینترنت وصل شوید.'));
      }
      return Scaffold(
        appBar: AppBar(title: const Text('گزارش مشکل کارگاه')),
        body: ListView(
          padding: const EdgeInsetsDirectional.all(AppSpace.s16),
          children: [
            if (state.projects.length > 1) ...[
              DropdownButtonFormField<String>(
                initialValue: state.projectId,
                decoration: const InputDecoration(labelText: 'پروژه'),
                items: [for (final p in state.projects) DropdownMenuItem(value: p.id, child: Text(p.name))],
                onChanged: (v) => v == null ? null : bloc.add(IssueProjectChanged(v)),
              ),
              const SizedBox(height: AppSpace.s16),
            ],
            const Text('نوع مشکل', style: AppText.label),
            const SizedBox(height: AppSpace.s6),
            Wrap(
              spacing: AppSpace.s6,
              runSpacing: AppSpace.s6,
              children: [
                for (final t in IssueType.values)
                  ChoiceChip(label: Text(Labels.issueType(t.name)), selected: state.type == t, onSelected: (_) => bloc.add(IssueTypeChanged(t))),
              ],
            ),
            if (state.typeError != null) Text(state.typeError!, style: AppText.caption.copyWith(color: AppColors.error700)),
            const SizedBox(height: AppSpace.s16),
            TextField(
              maxLength: 200,
              decoration: InputDecoration(labelText: 'عنوان', errorText: state.titleError),
              onChanged: (v) => bloc.add(IssueTitleChanged(v)),
            ),
            const SizedBox(height: AppSpace.s8),
            const Text('اثر بر کار', style: AppText.label),
            const SizedBox(height: AppSpace.s6),
            Wrap(
              spacing: AppSpace.s6,
              children: [
                for (final e in IssueEffect.values)
                  ChoiceChip(label: Text(Labels.issueEffect(e.name)), selected: state.effect == e, onSelected: (_) => bloc.add(IssueEffectChanged(e))),
              ],
            ),
            if (state.effectError != null) Text(state.effectError!, style: AppText.caption.copyWith(color: AppColors.error700)),
            const SizedBox(height: AppSpace.s16),
            DropdownButtonFormField<String?>(
              initialValue: state.activityId,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'فعالیت مرتبط (اختیاری)'),
              items: [
                const DropdownMenuItem<String?>(child: Text('بدون فعالیت')),
                for (final a in state.projectActivities)
                  DropdownMenuItem<String?>(value: a.id, child: Text('${a.code} · ${a.title}', overflow: TextOverflow.ellipsis)),
              ],
              onChanged: (v) => bloc.add(IssueActivityChanged(v)),
            ),
            const SizedBox(height: AppSpace.s16),
            TextField(
              maxLines: 4,
              maxLength: 4000,
              decoration: InputDecoration(labelText: 'شرح (اختیاری)', errorText: state.descriptionError),
              onChanged: (v) => bloc.add(IssueDescriptionChanged(v)),
            ),
            const SizedBox(height: AppSpace.s8),
            PhotoStrip(
              photoIds: [for (final p in state.photos) p.id],
              loader: bloc.photoBytes,
              maximum: IssueFormState.maxPhotos,
              onAdd: () => _openCamera(context, state),
              onDelete: (id) => bloc.add(IssuePhotoDeleted(id)),
            ),
          ],
        ),
        bottomNavigationBar: SafeArea(
          child: Padding(
            padding: const EdgeInsetsDirectional.all(AppSpace.s16),
            child: PrimaryButton(
              label: 'ذخیره و ارسال',
              icon: Icons.send,
              loading: state.status == IssueFormStatus.submitting,
              onPressed: () => bloc.add(const IssueSubmitted()),
            ),
          ),
        ),
      );
    },
  );

  void _openCamera(BuildContext context, IssueFormState state) {
    final target = context.read<IssueFormBloc>().photoTarget;
    final project = state.project;
    if (target == null) return;
    unawaited(
      context.push(
        Routes.camera,
        extra: CaptureRequest(
          target: target,
          workDate: state.today,
          supervisorName: userName,
          siteName: project?.name,
          siteLat: project?.site?.lat,
          siteLng: project?.site?.lng,
          siteRadiusM: project?.site?.radiusM,
        ),
      ),
    );
  }
}
