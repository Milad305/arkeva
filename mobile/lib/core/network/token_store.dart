import 'dart:async';

import 'package:projeyar_field/core/security/secure_store.dart';

/// رویداد پایان نشست که AuthBloc گوش می‌دهد (تازه‌سازی شکست خورد).
enum SessionSignal { expired }

/// توکن دسترسی فقط در حافظه؛ توکن تازه‌سازی در ذخیرهٔ امن (docs/rules/flutter-clean-bloc.md ۸.۱).
class TokenStore {
  TokenStore(this._secure);

  final SecureStore _secure;
  final _signals = StreamController<SessionSignal>.broadcast();

  String? _accessToken;
  DateTime? _accessExpiresAt;

  String? get accessToken => _accessToken;

  bool get accessExpired => _accessExpiresAt == null || DateTime.now().isAfter(_accessExpiresAt!.subtract(const Duration(seconds: 30)));

  Stream<SessionSignal> get signals => _signals.stream;

  Future<String?> refreshToken() => _secure.readRefreshToken();

  Future<void> save({required String accessToken, required int expiresInSec, String? refreshToken, String? refreshExpiresAt}) async {
    _accessToken = accessToken;
    _accessExpiresAt = DateTime.now().add(Duration(seconds: expiresInSec));
    if (refreshToken != null) await _secure.writeRefreshToken(refreshToken, expiresAt: refreshExpiresAt);
  }

  Future<void> clear() async {
    _accessToken = null;
    _accessExpiresAt = null;
    await _secure.clearSession();
  }

  void signalExpired() => _signals.add(SessionSignal.expired);
}
