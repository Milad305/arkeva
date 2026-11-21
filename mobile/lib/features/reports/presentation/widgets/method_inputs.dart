import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:projeyar_field/core/l10n/digit_input_formatter.dart';
import 'package:projeyar_field/core/l10n/fa_num.dart';
import 'package:projeyar_field/core/theme/app_tokens.dart';
import 'package:projeyar_field/features/activities/domain/entities/activity_entities.dart';
import 'package:projeyar_field/features/reports/domain/services/progress_preview.dart';
import 'package:projeyar_field/features/reports/presentation/bloc/report_form_bloc.dart';

/// ورودی پیشرفت به تفکیک روش (F08 ۴.۲).
class MethodInput extends StatelessWidget {
  const MethodInput({required this.state, super.key});

  final ReportFormState state;

  @override
  Widget build(BuildContext context) => switch (state.activity!.method) {
    MeasureMethod.quantity => _QuantityInput(state: state),
    MeasureMethod.percent => _PercentInput(state: state),
    MeasureMethod.steps => _StepsInput(state: state),
  };
}

class _QuantityInput extends StatelessWidget {
  const _QuantityInput({required this.state});

  final ReportFormState state;

  @override
  Widget build(BuildContext context) {
    final a = state.activity!;
    final p = state.preview;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextFormField(
          key: ValueKey('qty-${state.itemId}'),
          initialValue: state.quantity.value,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          inputFormatters: const [LocalizedDigitsFormatter(allowDecimal: true, maxLength: 12)],
          decoration: InputDecoration(labelText: 'مقدار انجام‌شدهٔ امروز', suffixText: a.unit, errorText: state.quantityError),
          onChanged: (v) => context.read<ReportFormBloc>().add(ReportQuantityChanged(v)),
        ),
        if (p?.todayPercent != null && a.totalQuantity != null) ...[
          const SizedBox(height: AppSpace.s8),
          Text(
            'برابر ${faPercent(p!.todayPercent!)} از ${faNum(a.totalQuantity!)} ${a.unit ?? ''} · تجمعی ${faPercent(p.cumulative ?? 0)}',
            style: AppText.ui.copyWith(color: AppColors.primary700),
          ),
        ],
      ],
    );
  }
}

class _PercentInput extends StatefulWidget {
  const _PercentInput({required this.state});

  final ReportFormState state;

  @override
  State<_PercentInput> createState() => _PercentInputState();
}

class _PercentInputState extends State<_PercentInput> {
  late final _controller = TextEditingController(text: widget.state.percent.value);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.state;
    final value = (s.percent.number ?? s.activity!.lastPercent).clamp(0, 100).toDouble();
    final bloc = context.read<ReportFormBloc>();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Slider(
          value: value,
          max: 100,
          divisions: 100,
          label: faPercent(value, maxFractionDigits: 0),
          onChanged: (v) {
            final text = toFaDigits(v.round());
            _controller.text = text;
            bloc.add(ReportPercentChanged(text));
          },
        ),
        TextField(
          controller: _controller,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          inputFormatters: const [LocalizedDigitsFormatter(allowDecimal: true, maxLength: 6)],
          decoration: InputDecoration(labelText: 'درصد تجمعی', suffixText: '٪', errorText: s.percentError),
          onChanged: (v) => bloc.add(ReportPercentChanged(v)),
        ),
        const SizedBox(height: AppSpace.s12),
        TextFormField(
          key: ValueKey('pq-${s.itemId}'),
          initialValue: s.percentQuantity.value,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          inputFormatters: const [LocalizedDigitsFormatter(allowDecimal: true, maxLength: 12)],
          decoration: InputDecoration(labelText: 'مقدار امروز (اختیاری)', suffixText: s.activity!.unit),
          onChanged: (v) => bloc.add(ReportPercentQuantityChanged(v)),
        ),
        if (s.percentQuantity.value.trim().isNotEmpty && s.preview != null) ...[
          const SizedBox(height: AppSpace.s6),
          Text(
            s.preview!.warnings.contains(PreviewWarning.percentQuantityMismatch)
                ? 'مقدار واردشده با درصد هم‌خوانی ندارد.'
                : 'مقدار با درصد هم‌خوان است.',
            style: AppText.caption.copyWith(
              color: s.preview!.warnings.contains(PreviewWarning.percentQuantityMismatch) ? AppColors.warning700 : AppColors.success700,
            ),
          ),
        ],
      ],
    );
  }
}

class _StepsInput extends StatelessWidget {
  const _StepsInput({required this.state});

  final ReportFormState state;

  static const _quick = [0.0, 25.0, 50.0, 75.0, 100.0];

  @override
  Widget build(BuildContext context) {
    final bloc = context.read<ReportFormBloc>();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final step in state.activity!.steps) ...[
          Row(
            children: [
              Expanded(child: Text(step.title, style: AppText.ui)),
              Text(faPercent(state.steps[step.key] ?? 0, maxFractionDigits: 0), style: AppText.subheading),
            ],
          ),
          const SizedBox(height: AppSpace.s6),
          Wrap(
            spacing: AppSpace.s6,
            children: [
              for (final q in _quick)
                ChoiceChip(
                  label: Text(faPercent(q, maxFractionDigits: 0)),
                  selected: (state.steps[step.key] ?? 0) == q,
                  onSelected: (_) => bloc.add(ReportStepChanged(step.key, q)),
                ),
            ],
          ),
          Slider(
            value: (state.steps[step.key] ?? 0).clamp(0, 100).toDouble(),
            max: 100,
            divisions: 20,
            onChanged: (v) => bloc.add(ReportStepChanged(step.key, v)),
          ),
          const Divider(),
        ],
        if (state.preview?.cumulative != null)
          Text('درصد کل: ${faPercent(state.preview!.cumulative!)}', style: AppText.subheading.copyWith(color: AppColors.primary700)),
      ],
    );
  }
}

/// متن هشدارهای پیش‌نمایش (rules ۱۱).
String previewWarningText(PreviewWarning w, {required int minPhotos, double? maxJump}) => switch (w) {
  PreviewWarning.jumpAboveLimit => 'جهش بیشتر از ${maxJump == null ? 'آستانه' : faPercent(maxJump)} است؛ ناظر بررسی دستی می‌کند.',
  PreviewWarning.decreaseNotAllowed => 'کاهش درصد در این پروژه مجاز نیست. عدد را از آخرین مقدار کمتر نکنید.',
  PreviewWarning.photosBelowMin => 'دست‌کم ${toFaDigits(minPhotos)} عکس لازم است.',
  PreviewWarning.gpsOutOfRange => 'بیشتر عکس‌ها بیرون از محدودهٔ کارگاه گرفته شده‌اند.',
  PreviewWarning.overHundred => 'درصد تجمعی از ۱۰۰ بیشتر شده است؛ مقدار را بررسی کنید.',
  PreviewWarning.percentQuantityMismatch => 'مقدار و درصد با هم نمی‌خوانند.',
};
