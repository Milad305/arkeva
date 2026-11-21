import 'dart:async';
import 'dart:ui' as ui;

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/painting.dart';
import 'package:image/image.dart' as img;
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/theme/app_tokens.dart';

/// خروجی پردازش: JPEG نهایی و هش آن پیش از رمز (rules ۸.۳).
final class ProcessedPhoto {
  const ProcessedPhoto({required this.jpeg, required this.sha256});

  final Uint8List jpeg;
  final String sha256;
}

/// کوچک‌سازی ۱۶۰۰ و JPEG ۸۰ در isolate، و مهر روی پیکسل با Canvas و TextPainter راست‌به‌چپ (F08 ۶؛ AC-FA-04).
/// EXIF اصلی نگه داشته می‌شود؛ جهت عکس پیش از مهر روی پیکسل اعمال می‌شود.
@lazySingleton
class PhotoProcessor {
  static const maxSide = 1600;
  static const quality = 80;

  Future<ProcessedPhoto> process(Uint8List rawJpeg, List<String> stampLines) async {
    final prepared = await compute(_prepare, rawJpeg);
    final stamped = await _stamp(prepared, stampLines);
    final jpeg = await compute(_encode, _EncodeJob(stamped, prepared.width, prepared.height, prepared.exif));
    return ProcessedPhoto(jpeg: jpeg, sha256: sha256.convert(jpeg).toString());
  }

  Future<Uint8List> _stamp(_Prepared p, List<String> lines) async {
    final source = await _decodeRgba(p.rgba, p.width, p.height);
    final w = p.width.toDouble();
    final h = p.height.toDouble();
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder)..drawImage(source, Offset.zero, Paint());
    final fontSize = (w * 0.026).clamp(14.0, 44.0);
    final pad = fontSize * 0.7;
    final painter = TextPainter(
      text: TextSpan(
        text: lines.join('\n'),
        style: TextStyle(color: AppColors.gray0, fontSize: fontSize, fontFamily: AppFonts.sans, height: 1.45, fontWeight: FontWeight.w500),
      ),
      textDirection: TextDirection.rtl,
      textAlign: TextAlign.right,
    )..layout(maxWidth: w - 2 * pad);
    final band = painter.height + 2 * pad;
    // کد تصویر: جهت فیزیکی چپ و راست مجاز است (rules ۱۰.۲)
    canvas.drawRect(Rect.fromLTWH(0, h - band, w, band), Paint()..color = AppColors.gray900.withValues(alpha: 0.62));
    painter.paint(canvas, Offset(w - pad - painter.width, h - band + pad));
    final picture = recorder.endRecording();
    final out = await picture.toImage(p.width, p.height);
    final data = await out.toByteData();
    source.dispose();
    out.dispose();
    picture.dispose();
    painter.dispose();
    if (data == null) throw StateError('stamp render failed');
    return data.buffer.asUint8List();
  }

  static Future<ui.Image> _decodeRgba(Uint8List rgba, int width, int height) {
    final completer = Completer<ui.Image>();
    ui.decodeImageFromPixels(rgba, width, height, ui.PixelFormat.rgba8888, completer.complete);
    return completer.future;
  }
}

final class _Prepared {
  const _Prepared(this.rgba, this.width, this.height, this.exif);

  final Uint8List rgba;
  final int width;
  final int height;
  final img.ExifData? exif;
}

final class _EncodeJob {
  const _EncodeJob(this.rgba, this.width, this.height, this.exif);

  final Uint8List rgba;
  final int width;
  final int height;
  final img.ExifData? exif;
}

_Prepared _prepare(Uint8List raw) {
  final decoded = img.decodeJpg(raw) ?? img.decodeImage(raw);
  if (decoded == null) throw const FormatException('unreadable camera image');
  final exif = decoded.hasExif ? img.ExifData.from(decoded.exif) : null;
  var image = img.bakeOrientation(decoded);
  final longest = image.width > image.height ? image.width : image.height;
  if (longest > PhotoProcessor.maxSide) {
    image = image.width >= image.height
        ? img.copyResize(image, width: PhotoProcessor.maxSide, interpolation: img.Interpolation.average)
        : img.copyResize(image, height: PhotoProcessor.maxSide, interpolation: img.Interpolation.average);
  }
  final rgba = image.convert(numChannels: 4).getBytes(order: img.ChannelOrder.rgba);
  // جهت روی پیکسل اعمال شد
  exif?.imageIfd.orientation = null;
  return _Prepared(rgba, image.width, image.height, exif);
}

Uint8List _encode(_EncodeJob job) {
  final image = img.Image.fromBytes(width: job.width, height: job.height, bytes: job.rgba.buffer, numChannels: 4, order: img.ChannelOrder.rgba);
  final exif = job.exif;
  if (exif != null) image.exif = exif;
  return img.encodeJpg(image, quality: PhotoProcessor.quality);
}
