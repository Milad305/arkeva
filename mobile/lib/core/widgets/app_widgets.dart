import 'package:flutter/material.dart';
import 'package:projeyar_field/core/error/failure.dart';
import 'package:projeyar_field/core/theme/app_tokens.dart';

/// کد لاتین (WBS، FR-…، کد پیگیری) چپ‌به‌راست با فونت مونو (CLAUDE.md ۵).
class LtrCode extends StatelessWidget {
  const LtrCode(this.text, {super.key, this.style});
  final String text;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) => Directionality(
    textDirection: TextDirection.ltr,
    child: Text(text, style: AppText.code.copyWith(color: AppColors.gray600).merge(style)),
  );
}

/// دکمهٔ اقدام اصلی با حالت در حال انجام.
class PrimaryButton extends StatelessWidget {
  const PrimaryButton({required this.label, required this.onPressed, super.key, this.loading = false, this.icon, this.success = false});

  final String label;
  final VoidCallback? onPressed;
  final bool loading;
  final IconData? icon;

  /// دکمهٔ تأیید با success-700 (CLAUDE.md ۵).
  final bool success;

  @override
  Widget build(BuildContext context) {
    final child = loading
        ? const SizedBox.square(dimension: 22, child: CircularProgressIndicator(strokeWidth: 2.4, color: AppColors.gray0))
        : Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[Icon(icon, size: AppSize.icon), const SizedBox(width: AppSpace.s8)],
              Flexible(child: Text(label, overflow: TextOverflow.ellipsis)),
            ],
          );
    return FilledButton(
      style: success ? FilledButton.styleFrom(backgroundColor: AppColors.success700) : null,
      onPressed: loading ? () {} : onPressed,
      child: child,
    );
  }
}

/// نوار خطا: پیام بدون سرزنش + کد پیگیری + یک راه ادامه.
class FailureBanner extends StatelessWidget {
  const FailureBanner({required this.failure, super.key, this.onRetry});
  final Failure failure;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final trace = failure.traceId;
    return Semantics(
      liveRegion: true,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsetsDirectional.all(AppSpace.s12),
        decoration: BoxDecoration(
          color: AppColors.error50,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: AppColors.error500.withValues(alpha: 0.3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.error_outline, color: AppColors.error700, size: AppSize.icon),
                const SizedBox(width: AppSpace.s8),
                Expanded(child: Text(failure.message, style: AppText.bodySm.copyWith(color: AppColors.error700))),
              ],
            ),
            if (trace != null) ...[
              const SizedBox(height: AppSpace.s4),
              Row(
                children: [
                  Text('کد پیگیری: ', style: AppText.caption.copyWith(color: AppColors.gray600)),
                  LtrCode(trace),
                ],
              ),
            ],
            if (onRetry != null && failure.retryable)
              Align(
                alignment: AlignmentDirectional.centerEnd,
                child: TextButton(onPressed: onRetry, child: const Text('تلاش دوباره')),
              ),
          ],
        ),
      ),
    );
  }
}

/// SnackBar یک‌خطی برای خطا یا موفقیت.
void showAppSnack(BuildContext context, String message, {bool error = false}) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: error ? AppColors.error700 : AppColors.gray900,
      ),
    );
}

/// برچسب وضعیت کوچک.
class StatusChip extends StatelessWidget {
  const StatusChip({required this.label, required this.foreground, required this.background, super.key, this.icon});
  final String label;
  final Color foreground;
  final Color background;
  final IconData? icon;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsetsDirectional.symmetric(horizontal: AppSpace.s8, vertical: AppSpace.s2),
    decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(AppRadius.full)),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (icon != null) ...[Icon(icon, size: 14, color: foreground), const SizedBox(width: AppSpace.s4)],
        Text(label, style: AppText.label.copyWith(color: foreground)),
      ],
    ),
  );
}

/// حالت خالی با یک اقدام.
class EmptyState extends StatelessWidget {
  const EmptyState({required this.title, super.key, this.message, this.actionLabel, this.onAction, this.icon = Icons.inbox_outlined});
  final String title;
  final String? message;
  final String? actionLabel;
  final VoidCallback? onAction;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsetsDirectional.all(AppSpace.s32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 40, color: AppColors.gray400),
          const SizedBox(height: AppSpace.s12),
          Text(title, style: AppText.heading, textAlign: TextAlign.center),
          if (message != null) ...[
            const SizedBox(height: AppSpace.s6),
            Text(message!, style: AppText.bodySm.copyWith(color: AppColors.gray600), textAlign: TextAlign.center),
          ],
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: AppSpace.s16),
            OutlinedButton(onPressed: onAction, child: Text(actionLabel!)),
          ],
        ],
      ),
    ),
  );
}
