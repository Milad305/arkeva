import 'dart:async';
import 'dart:io';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:projeyar_field/core/error/failure.dart';
import 'package:projeyar_field/core/l10n/fa_num.dart';
import 'package:projeyar_field/core/theme/app_tokens.dart';
import 'package:projeyar_field/core/widgets/app_widgets.dart';
import 'package:projeyar_field/features/camera/presentation/bloc/camera_bloc.dart';

/// M07 دوربین. فقط از پلاگین `camera`؛ هیچ انتخاب از گالری (AC-FA-04).
/// CameraController مال ویجت است (چرخهٔ عمر نما)؛ Bloc فقط بایت‌ها را می‌گیرد.
class CameraPage extends StatefulWidget {
  const CameraPage({super.key});

  @override
  State<CameraPage> createState() => _CameraPageState();
}

class _CameraPageState extends State<CameraPage> with WidgetsBindingObserver {
  CameraController? _controller;
  bool _shooting = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    unawaited(_open());
  }

  Future<void> _open() async {
    try {
      final cameras = await availableCameras();
      final back = cameras.where((c) => c.lensDirection == CameraLensDirection.back).firstOrNull ?? cameras.firstOrNull;
      if (back == null) throw CameraException('none', 'no camera');
      final controller = CameraController(back, ResolutionPreset.veryHigh, enableAudio: false, imageFormatGroup: ImageFormatGroup.jpeg);
      await controller.initialize();
      if (!mounted) {
        await controller.dispose();
        return;
      }
      setState(() => _controller = controller);
    } on CameraException catch (e) {
      if (!mounted) return;
      context.read<CameraBloc>().add(
        CameraDeviceFailed(
          PermissionFailure(
            code: 'CAMERA_${e.code}',
            message: e.code.contains('Access') || e.code.contains('Denied')
                ? 'اجازهٔ دوربین داده نشده است. از تنظیمات گوشی اجازه دهید.'
                : 'دوربین باز نشد. اپ را ببندید و دوباره امتحان کنید.',
          ),
        ),
      );
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;
    if (state == AppLifecycleState.inactive) {
      _controller = null;
      unawaited(controller.dispose());
    } else if (state == AppLifecycleState.resumed) {
      unawaited(_open());
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    unawaited(_controller?.dispose());
    super.dispose();
  }

  Future<void> _shoot() async {
    final controller = _controller;
    if (controller == null || _shooting || controller.value.isTakingPicture) return;
    final bloc = context.read<CameraBloc>();
    setState(() => _shooting = true);
    try {
      final file = await controller.takePicture();
      bloc.add(CameraShotTaken(await file.readAsBytes()));
      // فایل خام دوربین رمز ندارد؛ فوراً پاک می‌شود
      unawaited(File(file.path).delete().then((_) {}, onError: (_) {}));
    } on CameraException {
      if (mounted) showAppSnack(context, 'عکس گرفته نشد. دوباره امتحان کنید.', error: true);
    } finally {
      if (mounted) setState(() => _shooting = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.gray900,
    appBar: AppBar(
      backgroundColor: AppColors.gray900,
      foregroundColor: AppColors.gray0,
      title: const Text('دوربین'),
      actions: [
        BlocSelector<CameraBloc, CameraState, int>(
          selector: (s) => s.taken.length,
          builder: (context, n) => TextButton(
            onPressed: () => context.pop(n),
            child: Text(n == 0 ? 'بستن' : 'تمام (${toFaDigits(n)})', style: AppText.ui.copyWith(color: AppColors.gray0)),
          ),
        ),
      ],
    ),
    body: BlocConsumer<CameraBloc, CameraState>(
      listenWhen: (a, b) => (b.failure != null && a.failure != b.failure) || (b.locationWarning != null && a.locationWarning != b.locationWarning),
      listener: (context, state) {
        if (state.failure != null && state.status != CameraStatus.failure) {
          showAppSnack(context, state.failure!.message, error: true);
        } else if (state.locationWarning != null) {
          showAppSnack(context, 'عکس بدون مختصات ذخیره شد: ${state.locationWarning!.message}');
        }
      },
      builder: (context, state) {
        if (state.status == CameraStatus.failure) {
          return EmptyState(title: state.failure?.message ?? 'دوربین باز نشد.', icon: Icons.no_photography_outlined);
        }
        final controller = _controller;
        return Column(
          children: [
            Expanded(
              child: controller == null
                  ? const Center(child: CircularProgressIndicator())
                  : Center(child: CameraPreview(controller)),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsetsDirectional.symmetric(vertical: AppSpace.s20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    SizedBox.square(
                      dimension: 76,
                      child: FilledButton(
                        style: FilledButton.styleFrom(shape: const CircleBorder(), backgroundColor: AppColors.gray0, padding: EdgeInsets.zero),
                        onPressed: state.status == CameraStatus.processing || _shooting ? null : _shoot,
                        child: state.status == CameraStatus.processing || _shooting
                            ? const CircularProgressIndicator(color: AppColors.primary700)
                            : const Icon(Icons.camera_alt, color: AppColors.gray900, size: 32),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    ),
  );
}
