import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:projeyar_field/core/device/qr_decoder.dart';
import 'package:zxing2/qrcode.dart';

/// QR را مثل صفحهٔ Y دوربین می‌سازد: هر ماژول `scale` پیکسل، حاشیهٔ سفید، و `padding` بایت اضافه در هر ردیف (bytesPerRow).
LumaFrame _frame(String text, {int scale = 6, int quiet = 4, int padding = 0}) {
  final matrix = Encoder.encode(text, ErrorCorrectionLevel.m).matrix!;
  final size = (matrix.width + quiet * 2) * scale;
  final stride = size + padding;
  final bytes = Uint8List(stride * size)..fillRange(0, stride * size, 255);
  for (var y = 0; y < matrix.height; y++) {
    for (var x = 0; x < matrix.width; x++) {
      if (matrix.get(x, y) != 1) continue;
      for (var dy = 0; dy < scale; dy++) {
        final row = ((y + quiet) * scale + dy) * stride;
        bytes.fillRange(row + (x + quiet) * scale, row + (x + quiet + 1) * scale, 0);
      }
    }
  }
  return LumaFrame(bytes: bytes, width: size, height: size, rowStride: stride);
}

void main() {
  group('OD-20 رمزگشایی QR دعوت از قاب دوربین', () {
    test('QR دعوت خوانده می‌شود، با bytesPerRow برابر و بزرگ‌تر از عرض', () {
      expect(decodeQr(_frame('projeyar:invite:K7M2Q9XA')), 'projeyar:invite:K7M2Q9XA');
      expect(decodeQr(_frame('projeyar:invite:K7M2Q9XA', padding: 32)), 'projeyar:invite:K7M2Q9XA');
    });

    test('قاب بی QR ← null', () {
      final blank = Uint8List(200 * 200)..fillRange(0, 200 * 200, 200);
      expect(decodeQr(LumaFrame(bytes: blank, width: 200, height: 200, rowStride: 200)), isNull);
    });
  });
}
