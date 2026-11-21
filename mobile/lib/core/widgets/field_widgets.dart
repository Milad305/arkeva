import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:projeyar_field/core/l10n/fa_num.dart';
import 'package:projeyar_field/core/theme/app_tokens.dart';

/// کارت بخش با عنوان کوچک.
class SectionCard extends StatelessWidget {
  const SectionCard({required this.child, super.key, this.title, this.trailing, this.padding = const EdgeInsetsDirectional.all(AppSpace.s16)});

  final String? title;
  final Widget? trailing;
  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) => Card(
    margin: const EdgeInsetsDirectional.only(bottom: AppSpace.s12),
    child: Padding(
      padding: padding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (title != null) ...[
            Row(
              children: [
                Expanded(child: Text(title!, style: AppText.subheading)),
                ?trailing,
              ],
            ),
            const SizedBox(height: AppSpace.s12),
          ],
          child,
        ],
      ),
    ),
  );
}

/// نوار پیشرفت تأییدشده با نشانگر برنامه. نوار زمانی است ولی درصد؛ جهت با متن (راست‌به‌چپ).
class ProgressMeter extends StatelessWidget {
  const ProgressMeter({required this.approved, super.key, this.planned, this.pending});

  final double approved;
  final double? planned;
  final double? pending;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final w = constraints.maxWidth;
      double x(double pct) => (pct.clamp(0, 100) / 100) * w;
      return SizedBox(
        height: 10,
        child: Stack(
          children: [
            Container(
              decoration: BoxDecoration(color: AppColors.gray200, borderRadius: BorderRadius.circular(AppRadius.full)),
            ),
            if (pending != null && pending! > approved)
              PositionedDirectional(
                start: 0,
                top: 0,
                bottom: 0,
                width: x(pending!),
                child: Container(
                  decoration: BoxDecoration(color: AppColors.primary300, borderRadius: BorderRadius.circular(AppRadius.full)),
                ),
              ),
            PositionedDirectional(
              start: 0,
              top: 0,
              bottom: 0,
              width: x(approved),
              child: Container(
                decoration: BoxDecoration(color: AppColors.primary700, borderRadius: BorderRadius.circular(AppRadius.full)),
              ),
            ),
            if (planned != null)
              PositionedDirectional(
                start: (x(planned!) - 1).clamp(0, w - 2),
                top: -2,
                bottom: -2,
                width: 2,
                child: const ColoredBox(color: AppColors.accent500),
              ),
          ],
        ),
      );
    },
  );
}

/// «انحراف ۳٪ عقب» با رنگ.
class DeviationText extends StatelessWidget {
  const DeviationText(this.deviation, {super.key});

  final double? deviation;

  @override
  Widget build(BuildContext context) {
    final d = deviation;
    if (d == null) return const SizedBox.shrink();
    final behind = d < -0.05;
    final ahead = d > 0.05;
    final text = behind ? '${faPercent(-d)} عقب' : (ahead ? '${faPercent(d)} جلو' : 'طبق برنامه');
    final color = behind ? (d < -10 ? AppColors.error700 : AppColors.warning700) : AppColors.success700;
    return Text(text, style: AppText.label.copyWith(color: color));
  }
}

/// عکس رمزنگاری‌شده با بارگذاری تنبل از `loader`.
class EncryptedThumb extends StatelessWidget {
  const EncryptedThumb({required this.photoId, required this.loader, super.key, this.size = 76, this.onDelete, this.badge});

  final String photoId;
  final Future<Uint8List?> Function(String id) loader;
  final double size;
  final VoidCallback? onDelete;
  final String? badge;

  @override
  Widget build(BuildContext context) => SizedBox.square(
    dimension: size,
    child: Stack(
      children: [
        Positioned.fill(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(AppRadius.md),
            child: FutureBuilder<Uint8List?>(
              future: loader(photoId),
              builder: (context, snap) {
                final bytes = snap.data;
                if (bytes == null) {
                  return ColoredBox(
                    color: AppColors.gray100,
                    child: Icon(
                      snap.connectionState == ConnectionState.done ? Icons.cloud_done_outlined : Icons.image_outlined,
                      color: AppColors.gray400,
                    ),
                  );
                }
                return Image.memory(bytes, fit: BoxFit.cover, cacheWidth: (size * 2).round(), gaplessPlayback: true);
              },
            ),
          ),
        ),
        if (badge != null)
          PositionedDirectional(
            start: 4,
            bottom: 4,
            child: Container(
              padding: const EdgeInsetsDirectional.symmetric(horizontal: AppSpace.s4),
              color: AppColors.error700,
              child: Text(badge!, style: AppText.label.copyWith(color: AppColors.gray0)),
            ),
          ),
        if (onDelete != null)
          PositionedDirectional(
            end: 0,
            top: 0,
            child: Material(
              color: AppColors.scrim,
              shape: const CircleBorder(),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: onDelete,
                child: const Padding(padding: EdgeInsets.all(AppSpace.s4), child: Icon(Icons.close, size: 16, color: AppColors.gray0)),
              ),
            ),
          ),
      ],
    ),
  );
}

/// ردیف عکس‌ها با دکمهٔ دوربین و شمارش «۲ از حداقل ۲».
class PhotoStrip extends StatelessWidget {
  const PhotoStrip({
    required this.photoIds,
    required this.loader,
    required this.onAdd,
    super.key,
    this.minimum = 0,
    this.maximum,
    this.onDelete,
    this.error,
  });

  final List<String> photoIds;
  final Future<Uint8List?> Function(String id) loader;
  final VoidCallback? onAdd;
  final void Function(String id)? onDelete;
  final int minimum;
  final int? maximum;
  final String? error;

  @override
  Widget build(BuildContext context) {
    final count = photoIds.length;
    final full = maximum != null && count >= maximum!;
    final caption = minimum > 0
        ? '${toFaDigits(count)} از حداقل ${toFaDigits(minimum)}'
        : (maximum != null ? '${toFaDigits(count)} از حداکثر ${toFaDigits(maximum)}' : '${toFaDigits(count)} عکس');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(caption, style: AppText.caption.copyWith(color: count < minimum ? AppColors.warning700 : AppColors.gray600)),
        const SizedBox(height: AppSpace.s8),
        Wrap(
          spacing: AppSpace.s8,
          runSpacing: AppSpace.s8,
          children: [
            for (final id in photoIds) EncryptedThumb(photoId: id, loader: loader, onDelete: onDelete == null ? null : () => onDelete!(id)),
            if (!full && onAdd != null)
              SizedBox.square(
                dimension: 76,
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size.square(76)),
                  onPressed: onAdd,
                  child: const Icon(Icons.photo_camera_outlined, size: AppSize.iconLg),
                ),
              ),
          ],
        ),
        if (error != null) ...[
          const SizedBox(height: AppSpace.s4),
          Text(error!, style: AppText.caption.copyWith(color: AppColors.error700)),
        ],
      ],
    );
  }
}

/// نوار وضعیت اتصال و صف (M03).
class ConnectionBanner extends StatelessWidget {
  const ConnectionBanner({required this.online, required this.queued, super.key, this.onTap, this.wifiHeld = false});

  final bool online;
  final int queued;
  final bool wifiHeld;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final (fg, bg, icon, text) = online
        ? queued > 0
              ? (
                  AppColors.info700,
                  AppColors.info50,
                  Icons.cloud_upload_outlined,
                  wifiHeld ? '${toFaDigits(queued)} مورد در صف · عکس‌ها منتظر Wi‑Fi' : '${toFaDigits(queued)} مورد در صف ارسال',
                )
              : (AppColors.success700, AppColors.success50, Icons.cloud_done_outlined, 'متصل · همه چیز ارسال شده')
        : (
            AppColors.warning700,
            AppColors.warning50,
            Icons.cloud_off_outlined,
            queued > 0 ? 'آفلاین · ${toFaDigits(queued)} مورد در گوشی می‌ماند' : 'آفلاین · ثبت گزارش ممکن است',
          );
    return Material(
      color: bg,
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.md),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsetsDirectional.symmetric(horizontal: AppSpace.s12, vertical: AppSpace.s10),
          child: Row(
            children: [
              Icon(icon, color: fg, size: AppSize.icon),
              const SizedBox(width: AppSpace.s8),
              Expanded(child: Text(text, style: AppText.ui.copyWith(color: fg))),
              if (onTap != null) Icon(Icons.chevron_right, color: fg, size: AppSize.icon),
            ],
          ),
        ),
      ),
    );
  }
}
