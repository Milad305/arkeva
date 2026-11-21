import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:projeyar_field/app/router/routes.dart';
import 'package:projeyar_field/core/l10n/fa_num.dart';
import 'package:projeyar_field/core/theme/app_tokens.dart';
import 'package:projeyar_field/core/time/clock.dart';
import 'package:projeyar_field/core/widgets/app_widgets.dart';
import 'package:projeyar_field/core/widgets/field_widgets.dart';
import 'package:projeyar_field/features/profile/presentation/bloc/profile_bloc.dart';

/// M14 پروفایل.
class ProfilePage extends StatelessWidget {
  const ProfilePage({required this.userName, required this.mobile, required this.organization, required this.onSignedOut, super.key});

  final String userName;
  final String mobile;
  final String organization;

  /// پس از پاک شدن داده‌ها، مسیریاب به M01 می‌رود (AuthBloc در app است).
  final VoidCallback onSignedOut;

  @override
  Widget build(BuildContext context) => BlocConsumer<ProfileBloc, ProfileState>(
    listenWhen: (a, b) => a.status != b.status || (b.failure != null && a.failure != b.failure),
    listener: (context, state) {
      if (state.status == ProfileStatus.signedOut) {
        onSignedOut();
      } else if (state.failure != null) {
        showAppSnack(context, state.failure!.message, error: true);
      }
    },
    builder: (context, state) {
      final bloc = context.read<ProfileBloc>();
      return Scaffold(
        appBar: AppBar(title: const Text('پروفایل')),
        body: ListView(
          padding: const EdgeInsetsDirectional.all(AppSpace.s16),
          children: [
            SectionCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(userName, style: AppText.title3),
                  Directionality(textDirection: TextDirection.ltr, child: Text(maskMobile(mobile), style: AppText.bodySm)),
                  Text(organization, style: AppText.bodySm.copyWith(color: AppColors.gray600)),
                ],
              ),
            ),
            SectionCard(
              title: 'پروژه‌های من',
              child: state.projects.isEmpty
                  ? Text('هنوز پروژه‌ای همگام نشده است.', style: AppText.bodySm.copyWith(color: AppColors.gray600))
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [for (final p in state.projects) Padding(padding: const EdgeInsetsDirectional.symmetric(vertical: AppSpace.s4), child: Text(p.name, style: AppText.ui))],
                    ),
            ),
            SectionCard(
              title: 'تنظیمات',
              child: Column(
                children: [
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('ارسال عکس فقط با Wi‑Fi'),
                    subtitle: const Text('گزارش‌ها با هر اینترنتی ارسال می‌شوند.', style: AppText.caption),
                    value: state.wifiOnly,
                    onChanged: (v) => bloc.add(ProfileWifiOnlyToggled(value: v)),
                  ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('یادآوری روزانهٔ گزارش'),
                    subtitle: const Text('ساعت ۱۷:۰۰ اگر گزارش امروز ثبت نشده باشد.', style: AppText.caption),
                    value: state.reminderEnabled,
                    onChanged: (v) => bloc.add(ProfileReminderToggled(value: v)),
                  ),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('صف ارسال'),
                    subtitle: Text(state.queue.total == 0 ? 'خالی' : '${toFaDigits(state.queue.total)} مورد', style: AppText.caption),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push(Routes.queue),
                  ),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('اعلان‌ها'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push(Routes.notifications),
                  ),
                ],
              ),
            ),
            ListTile(
              title: const Text('نسخهٔ اپ'),
              trailing: LtrCode(state.version),
              subtitle: state.sync.lastSyncAt == null ? null : Text('آخرین همگام‌سازی ${JalaliFormat.moment(state.sync.lastSyncAt!)}', style: AppText.caption),
            ),
            const SizedBox(height: AppSpace.s16),
            OutlinedButton.icon(
              style: OutlinedButton.styleFrom(foregroundColor: AppColors.error700),
              onPressed: state.status == ProfileStatus.signingOut ? null : () => unawaited(_confirmSignOut(context, state)),
              icon: state.status == ProfileStatus.signingOut
                  ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.logout),
              label: const Text('خروج از حساب'),
            ),
          ],
        ),
      );
    },
  );

  /// صف خالی نیست ← هشدار صریح و تأیید دوباره (F08 ۵.۱؛ rules ۸.۱۰).
  Future<void> _confirmSignOut(BuildContext context, ProfileState state) async {
    final bloc = context.read<ProfileBloc>();
    final unsent = state.unsent;
    final first = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('خروج از حساب'),
        content: Text(
          unsent > 0
              ? '${toFaDigits(unsent)} مورد ارسال‌نشده در گوشی است و با خروج از بین می‌رود. اگر ممکن است اول به اینترنت وصل شوید و صبر کنید تا ارسال شود.'
              : 'با خروج، همهٔ داده‌های این گوشی پاک می‌شود.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('ماندن')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: Text(unsent > 0 ? 'ادامهٔ خروج' : 'خروج')),
        ],
      ),
    );
    if (!(first ?? false) || !context.mounted) return;
    if (unsent > 0) {
      final second = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('تأیید دوباره'),
          content: Text('${toFaDigits(unsent)} گزارش ارسال‌نشده از بین می‌رود و برنمی‌گردد.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('نگه داشتن گزارش‌ها')),
            TextButton(
              style: TextButton.styleFrom(foregroundColor: AppColors.error700),
              onPressed: () => Navigator.pop(context, true),
              child: const Text('حذف و خروج'),
            ),
          ],
        ),
      );
      if (!(second ?? false)) return;
    }
    bloc.add(const ProfileSignOutConfirmed());
  }
}
