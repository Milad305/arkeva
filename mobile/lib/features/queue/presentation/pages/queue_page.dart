import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:projeyar_field/core/l10n/fa_num.dart';
import 'package:projeyar_field/core/network/network_info.dart';
import 'package:projeyar_field/core/theme/app_tokens.dart';
import 'package:projeyar_field/core/time/clock.dart';
import 'package:projeyar_field/core/widgets/app_widgets.dart';
import 'package:projeyar_field/core/widgets/field_widgets.dart';
import 'package:projeyar_field/features/queue/domain/entities/queue_entities.dart';
import 'package:projeyar_field/features/queue/presentation/bloc/queue_bloc.dart';

/// M09 صف ارسال: تعداد و حجم، «رمزنگاری‌شده در گوشی»، وضعیت Wi‑Fi، هشدار حذف اپ (F08 ۹).
class QueuePage extends StatelessWidget {
  const QueuePage({super.key});

  /// هشدار فضای کم بالای ۵۰۰ مگابایت (F08 ۱۰).
  static const int _largeQueueBytes = 500 * 1024 * 1024;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('صف ارسال')),
    body: BlocConsumer<QueueBloc, QueueState>(
      listenWhen: (a, b) => a.lastSent != b.lastSent && b.lastSent != null,
      listener: (context, state) {
        final sent = state.lastSent ?? 0;
        showAppSnack(context, sent > 0 ? '${toFaDigits(sent)} مورد ارسال شد.' : 'موردی آمادهٔ ارسال نبود.');
      },
      builder: (context, state) {
        final s = state.summary;
        return ListView(
          padding: const EdgeInsetsDirectional.all(AppSpace.s16),
          children: [
            SectionCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      _Stat(label: 'گزارش', value: s.reports + s.resubmits),
                      _Stat(label: 'مشکل', value: s.issues),
                      _Stat(label: 'عکس', value: s.photos),
                    ],
                  ),
                  const SizedBox(height: AppSpace.s12),
                  Text('حجم: ${faBytes(s.bytes)}', style: AppText.bodySm),
                  if (s.oldestQueuedAt != null) Text('قدیمی‌ترین: ${JalaliFormat.moment(s.oldestQueuedAt!)}', style: AppText.bodySm),
                  const SizedBox(height: AppSpace.s8),
                  Row(
                    children: [
                      const Icon(Icons.lock_outline, size: 16, color: AppColors.success700),
                      const SizedBox(width: AppSpace.s4),
                      Text('رمزنگاری‌شده در گوشی', style: AppText.caption.copyWith(color: AppColors.success700)),
                    ],
                  ),
                ],
              ),
            ),
            if (s.bytes > _largeQueueBytes)
              const Padding(
                padding: EdgeInsetsDirectional.only(bottom: AppSpace.s12),
                child: _Notice(text: 'صف بزرگ شده است. برای خالی شدن فضای گوشی به Wi‑Fi وصل شوید.', warning: true),
              ),
            if (!s.isEmpty)
              const Padding(
                padding: EdgeInsetsDirectional.only(bottom: AppSpace.s12),
                child: _Notice(text: 'تا همه ارسال نشده، اپ را حذف نکنید و از حساب خارج نشوید.', warning: true),
              ),
            SectionCard(
              child: SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('ارسال عکس فقط با Wi‑Fi'),
                subtitle: Text(_networkText(state.network), style: AppText.caption),
                value: state.wifiOnly,
                onChanged: (v) => context.read<QueueBloc>().add(QueueWifiOnlyToggled(value: v)),
              ),
            ),
            if (state.failure != null) ...[
              FailureBanner(failure: state.failure!),
              const SizedBox(height: AppSpace.s12),
            ],
            PrimaryButton(
              label: 'ارسال الان',
              icon: Icons.cloud_upload_outlined,
              loading: state.status == QueueViewStatus.sending,
              onPressed: state.network.isOnline ? () => context.read<QueueBloc>().add(const QueueSendNow()) : null,
            ),
            const SizedBox(height: AppSpace.s16),
            if (state.entries.isEmpty && state.status != QueueViewStatus.initial)
              const EmptyState(title: 'صف خالی است', message: 'همهٔ گزارش‌ها و عکس‌ها به سرور رسیده‌اند.', icon: Icons.cloud_done_outlined)
            else
              for (final e in state.entries) _EntryTile(entry: e, wifiHeld: state.wifiOnly && state.network == NetworkKind.mobile),
          ],
        );
      },
    ),
  );

  static String _networkText(NetworkKind kind) => switch (kind) {
    NetworkKind.wifi => 'اکنون به Wi‑Fi وصل هستید.',
    NetworkKind.mobile => 'اکنون با دادهٔ همراه وصل هستید؛ گزارش‌ها ارسال می‌شوند.',
    NetworkKind.none => 'اکنون اتصال ندارید.',
  };
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});

  final String label;
  final int value;

  @override
  Widget build(BuildContext context) => Expanded(
    child: Column(
      children: [
        Text(toFaDigits(value), style: AppText.numStat),
        Text(label, style: AppText.caption.copyWith(color: AppColors.gray600)),
      ],
    ),
  );
}

class _Notice extends StatelessWidget {
  const _Notice({required this.text, this.warning = false});

  final String text;
  final bool warning;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsetsDirectional.all(AppSpace.s12),
    decoration: BoxDecoration(color: warning ? AppColors.warning50 : AppColors.info50, borderRadius: BorderRadius.circular(AppRadius.md)),
    child: Row(
      children: [
        Icon(Icons.info_outline, size: AppSize.icon, color: warning ? AppColors.warning700 : AppColors.info700),
        const SizedBox(width: AppSpace.s8),
        Expanded(child: Text(text, style: AppText.bodySm.copyWith(color: warning ? AppColors.warning700 : AppColors.info700))),
      ],
    ),
  );
}

class _EntryTile extends StatelessWidget {
  const _EntryTile({required this.entry, required this.wifiHeld});

  final QueueEntry entry;
  final bool wifiHeld;

  @override
  Widget build(BuildContext context) {
    final title = switch (entry.kind) {
      OutboxKind.report => 'گزارش',
      OutboxKind.issue => 'مشکل کارگاه',
      OutboxKind.resubmit => 'ارسال دوباره پس از اصلاح',
      OutboxKind.photo => 'عکس · ${faBytes(entry.bytes)}',
    };
    final (status, color) = switch (entry.state) {
      OutboxState.rejected => ('پذیرفته نشد: ${entry.lastErrorMessage ?? ''}', AppColors.error700),
      OutboxState.retry => ('تلاش دوباره ${entry.nextAttemptAt == null ? 'به‌زودی' : JalaliFormat.moment(entry.nextAttemptAt!)}', AppColors.warning700),
      OutboxState.sending => ('در حال ارسال', AppColors.info700),
      _ when entry.kind == OutboxKind.photo && !entry.parentSent => ('پس از رسیدن گزارش ارسال می‌شود', AppColors.gray600),
      _ when entry.kind == OutboxKind.photo && wifiHeld => ('منتظر Wi‑Fi', AppColors.gray600),
      _ => ('در انتظار', AppColors.gray600),
    };
    return Card(
      margin: const EdgeInsetsDirectional.only(bottom: AppSpace.s8),
      child: ListTile(
        leading: Icon(entry.kind == OutboxKind.photo ? Icons.image_outlined : Icons.description_outlined),
        title: Text(title, style: AppText.ui),
        subtitle: Text('${JalaliFormat.moment(entry.createdAt)} · $status', style: AppText.caption.copyWith(color: color)),
        trailing: entry.state == OutboxState.rejected
            ? IconButton(
                tooltip: 'حذف از گوشی',
                icon: const Icon(Icons.delete_outline),
                onPressed: () => _confirmDiscard(context),
              )
            : null,
      ),
    );
  }

  Future<void> _confirmDiscard(BuildContext context) async {
    final bloc = context.read<QueueBloc>();
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('حذف از گوشی'),
        content: const Text('این مورد را سرور نپذیرفت. با حذف، داده و عکس‌هایش از گوشی پاک می‌شود و برنمی‌گردد.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('نگه داشتن')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('حذف از گوشی')),
        ],
      ),
    );
    if (ok ?? false) bloc.add(QueueDiscardRequested(entry.id));
  }
}
