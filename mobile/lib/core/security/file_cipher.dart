import 'dart:io';
import 'dart:typed_data';

import 'package:cryptography/cryptography.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

/// رمز AES-256-GCM برای عکس‌های صف در حافظهٔ خصوصی (docs/rules/flutter-clean-bloc.md ۸.۳).
/// قالب فایل: nonce(12) + ciphertext + mac(16).
class FileCipher {
  FileCipher(this._keyLoader);

  final Future<List<int>> Function() _keyLoader;
  final _algorithm = AesGcm.with256bits();
  SecretKey? _key;

  Future<SecretKey> _secret() async => _key ??= SecretKey(await _keyLoader());

  /// پوشهٔ خصوصی عکس‌ها؛ زیر Application Support که در پشتیبان نمی‌رود.
  static Future<Directory> photosDir() async {
    final base = await getApplicationSupportDirectory();
    final dir = Directory(p.join(base.path, 'photos'));
    if (!dir.existsSync()) await dir.create(recursive: true);
    return dir;
  }

  Future<File> writeEncrypted(String fileName, Uint8List plain) async {
    final box = await _algorithm.encrypt(plain, secretKey: await _secret());
    final dir = await photosDir();
    final file = File(p.join(dir.path, '$fileName.enc'));
    await file.writeAsBytes(box.concatenation(), flush: true);
    return file;
  }

  Future<Uint8List> readDecrypted(String path) async {
    final bytes = await File(path).readAsBytes();
    final box = SecretBox.fromConcatenation(bytes, nonceLength: 12, macLength: 16);
    final plain = await _algorithm.decrypt(box, secretKey: await _secret());
    return Uint8List.fromList(plain);
  }

  Future<void> delete(String path) async {
    final file = File(path);
    if (file.existsSync()) await file.delete();
  }

  /// حذف همهٔ عکس‌ها و فراموشی کلید حافظه؛ کلید تازه از ذخیرهٔ امن خوانده (یا ساخته) می‌شود.
  Future<void> wipeAll() async {
    final dir = await photosDir();
    if (dir.existsSync()) await dir.delete(recursive: true);
    _key = null;
  }

  /// حجم کل عکس‌های رمزنگاری‌شده (M09، هشدار ۵۰۰ مگابایت F08 ۱۰).
  Future<int> totalBytes() async {
    final dir = await photosDir();
    var total = 0;
    await for (final entity in dir.list()) {
      if (entity is File) total += await entity.length();
    }
    return total;
  }
}
