import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:projeyar_field/core/l10n/fa_num.dart';
import 'package:projeyar_field/core/network/app_update_gate.dart';
import 'package:projeyar_field/core/theme/app_tokens.dart';
import 'package:projeyar_field/core/widgets/app_widgets.dart';
import 'package:projeyar_field/features/queue/presentation/cubit/queue_status_cubit.dart';

/// به‌روزرسانی اجباری (F08 ۵.۳؛ پاسخ ۴۲۶). صف حفظ می‌شود و پس از به‌روزرسانی ارسال می‌شود؛ «بررسی دوباره» دروازه را پایین می‌آورد
/// و همگام‌سازی را راه می‌اندازد؛ اگر نسخه هنوز کم باشد، سرور دوباره ۴۲۶ می‌دهد و همین صفحه برمی‌گردد.
class UpdateRequiredPage extends StatelessWidget {
  const UpdateRequiredPage({required this.gate, super.key});

  final AppUpdateGate gate;

  @override
  Widget build(BuildContext context) {
    final queued = context.select<QueueStatusCubit, int>((cubit) {
      final summary = cubit.state.summary;
      return summary.reports + summary.issues + summary.resubmits;
    });
    final photos = context.select<QueueStatusCubit, int>((cubit) => cubit.state.summary.photos);
    final min = gate.minVersion;
    return Scaffold(
      backgroundColor: AppColors.gray0,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsetsDirectional.fromSTEB(AppSpace.s24, AppSpace.s48, AppSpace.s24, AppSpace.s24),
          children: [
            const Icon(Icons.system_update_outlined, size: 48, color: AppColors.primary700),
            const SizedBox(height: AppSpace.s16),
            const Text('به‌روزرسانی اپ لازم است', style: AppText.title1),
            const SizedBox(height: AppSpace.s8),
            Text(
              gate.message ?? 'این نسخهٔ اپ دیگر پشتیبانی نمی‌شود. اپ را به‌روز کنید؛ گزارش‌های در صف حفظ می‌شوند.',
              style: AppText.body.copyWith(color: AppColors.gray600),
            ),
            if (min != null) ...[
              const SizedBox(height: AppSpace.s16),
              Row(
                children: [
                  Text('کمترین نسخهٔ مجاز: ', style: AppText.body.copyWith(color: AppColors.gray600)),
                  LtrCode(min),
                ],
              ),
            ],
            const SizedBox(height: AppSpace.s16),
            Text(
              queued + photos == 0
                  ? 'چیزی در صف ارسال نیست.'
                  : '${toFaDigits(queued)} مورد و ${toFaDigits(photos)} عکس در صف گوشی مانده و پس از به‌روزرسانی ارسال می‌شود.',
              style: AppText.body,
            ),
            const SizedBox(height: AppSpace.s8),
            Text('نسخهٔ تازه را از مدیر پروژه یا پشتیبانی بگیرید و نصب کنید؛ نیازی به حذف اپ فعلی نیست.', style: AppText.body.copyWith(color: AppColors.gray600)),
            const SizedBox(height: AppSpace.s32),
            PrimaryButton(
              label: 'بررسی دوباره',
              icon: Icons.refresh,
              onPressed: () {
                gate.clear();
                context.read<QueueStatusCubit>().syncNow().ignore();
              },
            ),
          ],
        ),
      ),
    );
  }
}
