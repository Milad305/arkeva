import 'dart:convert';
import 'dart:math';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// ذخیرهٔ امن روی Android Keystore (docs/rules/flutter-clean-bloc.md ۸). فقط رازها: توکن تازه‌سازی، کلید پایگاه داده و کلید عکس‌ها.
class SecureStore {
  SecureStore([FlutterSecureStorage? storage])
    : _storage = storage ?? const FlutterSecureStorage(aOptions: AndroidOptions(encryptedSharedPreferences: true));

  final FlutterSecureStorage _storage;

  static const _refreshToken = 'auth.refresh_token';
  static const _refreshExpiresAt = 'auth.refresh_expires_at';
  static const _profile = 'auth.profile';
  static const _dbKey = 'crypto.db_key';
  static const _fileKey = 'crypto.file_key';

  Future<String?> readRefreshToken() => _storage.read(key: _refreshToken);

  Future<void> writeRefreshToken(String token, {String? expiresAt}) async {
    await _storage.write(key: _refreshToken, value: token);
    if (expiresAt != null) await _storage.write(key: _refreshExpiresAt, value: expiresAt);
  }

  Future<String?> readProfileJson() => _storage.read(key: _profile);
  Future<void> writeProfileJson(String json) => _storage.write(key: _profile, value: json);

  /// کلید ۳۲ بایتی پایگاه داده (SQLCipher)؛ یک بار ساخته می‌شود.
  Future<String> databaseKeyHex() async => _hexKey(_dbKey);

  /// کلید ۳۲ بایتی AES-GCM عکس‌های صف.
  Future<List<int>> fileKeyBytes() async {
    final hex = await _hexKey(_fileKey);
    return [for (var i = 0; i < hex.length; i += 2) int.parse(hex.substring(i, i + 2), radix: 16)];
  }

  /// پاک کردن نشست؛ کلیدهای رمز می‌مانند مگر `wipeKeys` (خروج کامل با پاک شدن داده‌ها).
  /// کلید پایگاه داده فقط وقتی پاک می‌شود که فایل پایگاه داده هم حذف شود؛ وگرنه فایل باز در اجرای بعد باز نمی‌شود.
  Future<void> clearSession({bool wipeKeys = false, bool keepDatabaseKey = false}) async {
    await _storage.delete(key: _refreshToken);
    await _storage.delete(key: _refreshExpiresAt);
    await _storage.delete(key: _profile);
    if (wipeKeys) {
      if (!keepDatabaseKey) await _storage.delete(key: _dbKey);
      await _storage.delete(key: _fileKey);
    }
  }

  Future<String> _hexKey(String name) async {
    final existing = await _storage.read(key: name);
    if (existing != null && existing.length == 64) return existing;
    final random = Random.secure();
    final bytes = List<int>.generate(32, (_) => random.nextInt(256));
    final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
    await _storage.write(key: name, value: hex);
    return hex;
  }
}

/// کمک برای JSON پروفایل ذخیره‌شده.
Map<String, Object?>? decodeJsonObject(String? raw) {
  if (raw == null) return null;
  try {
    final decoded = jsonDecode(raw);
    return decoded is Map<String, Object?> ? decoded : null;
  } on FormatException {
    return null;
  }
}
