import 'dart:typed_data';

import 'package:zxing2/qrcode.dart';

/// قاب درخشندگی (صفحهٔ Y دوربین با `ImageFormatGroup.yuv420`).
final class LumaFrame {
  const LumaFrame({required this.bytes, required this.width, required this.height, required this.rowStride});

  final Uint8List bytes;
  final int width;
  final int height;
  final int rowStride;
}

/// رمزگشایی QR از یک قاب (خالص Dart با `zxing2`؛ بی سرویس Google). نبود QR ← null. در isolate با `compute` صدا زده می‌شود.
String? decodeQr(LumaFrame frame) {
  try {
    return QRCodeReader().decode(BinaryBitmap(HybridBinarizer(_LumaSource(frame)))).text;
  } on Object {
    return null;
  }
}

class _LumaSource extends LuminanceSource {
  _LumaSource(this._frame) : super(_frame.width, _frame.height);

  final LumaFrame _frame;

  @override
  Int8List getRow(int y, Int8List? row) {
    final start = y * _frame.rowStride;
    return (row != null && row.length >= width ? row : Int8List(width))
      ..setRange(0, width, Int8List.sublistView(_frame.bytes, start, start + width));
  }

  @override
  Int8List getMatrix() {
    if (_frame.rowStride == width) return Int8List.sublistView(_frame.bytes, 0, width * height);
    final matrix = Int8List(width * height);
    for (var y = 0; y < height; y++) {
      final start = y * _frame.rowStride;
      matrix.setRange(y * width, (y + 1) * width, Int8List.sublistView(_frame.bytes, start, start + width));
    }
    return matrix;
  }
}
