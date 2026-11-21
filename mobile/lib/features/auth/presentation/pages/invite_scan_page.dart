import 'dart:async';

import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:projeyar_field/core/device/qr_decoder.dart';
import 'package:projeyar_field/core/theme/app_tokens.dart';
import 'package:projeyar_field/features/auth/domain/value_objects/invite_code.dart';

/// اسکن QR دعوت (M01؛ OD-20) فقط با پلاگین `camera` و پیش‌نمایش زنده؛ بی گالری. هر بار یک قاب در isolate با `zxing2`
/// رمزگشایی می‌شود؛ نخستین QR معتبر دعوت با `pop` به صفحهٔ کد دعوت برمی‌گردد. CameraController مال ویجت است (مثل M07).
class InviteScanPage extends StatefulWidget {
  const InviteScanPage({super.key});

  @override
  State<InviteScanPage> createState() => _InviteScanPageState();
}

class _InviteScanPageState extends State<InviteScanPage> with WidgetsBindingObserver {
  CameraController? _controller;
  bool _busy = false;
  bool _done = false;
  bool _foreignQr = false;
  String? _error;

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
      final controller = CameraController(back, ResolutionPreset.medium, enableAudio: false, imageFormatGroup: ImageFormatGroup.yuv420);
      await controller.initialize();
      if (!mounted) {
        await controller.dispose();
        return;
      }
      setState(() => _controller = controller);
      await controller.startImageStream(_onFrame);
    } on CameraException catch (e) {
      if (!mounted) return;
      setState(
        () => _error = e.code.contains('Access') || e.code.contains('Denied')
            ? 'اجازهٔ دوربین داده نشده است. از تنظیمات گوشی اجازه دهید یا کد را دستی بنویسید.'
            : 'دوربین باز نشد. کد دعوت را دستی بنویسید.',
      );
    }
  }

  void _onFrame(CameraImage image) {
    if (_busy || _done || image.planes.isEmpty) return;
    _busy = true;
    final plane = image.planes.first;
    final frame = LumaFrame(bytes: Uint8List.fromList(plane.bytes), width: image.width, height: image.height, rowStride: plane.bytesPerRow);
    unawaited(
      compute(decodeQr, frame).then((text) {
        _busy = false;
        if (text == null || _done || !mounted) return;
        if (InviteCode.normalize(text) == null) {
          if (!_foreignQr) setState(() => _foreignQr = true);
          return;
        }
        _done = true;
        unawaited(_controller?.stopImageStream().catchError((Object _) {}));
        context.pop(text);
      }),
    );
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

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    return Scaffold(
      backgroundColor: AppColors.gray900,
      appBar: AppBar(backgroundColor: AppColors.gray900, foregroundColor: AppColors.gray0, title: const Text('اسکن QR دعوت')),
      body: _error != null
          ? Center(
              child: Padding(
                padding: const EdgeInsetsDirectional.all(AppSpace.s24),
                child: Text(_error!, style: AppText.body.copyWith(color: AppColors.gray0), textAlign: TextAlign.center),
              ),
            )
          : Column(
              children: [
                Expanded(
                  child: controller == null || !controller.value.isInitialized
                      ? const Center(child: CircularProgressIndicator())
                      : Center(child: CameraPreview(controller)),
                ),
                Padding(
                  padding: const EdgeInsetsDirectional.all(AppSpace.s16),
                  child: Text(
                    _foreignQr ? 'این QR دعوت پروژه‌یار نیست. QR صفحهٔ دعوت را جلوی دوربین بگیرید.' : 'QR دعوت را درون کادر نگه دارید.',
                    style: AppText.body.copyWith(color: AppColors.gray0),
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
            ),
    );
  }
}
