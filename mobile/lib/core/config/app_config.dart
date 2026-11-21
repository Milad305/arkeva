import 'package:flutter/foundation.dart';

/// پیکربندی فقط از `--dart-define` (docs/rules/flutter-clean-bloc.md ۸.۷). هیچ آدرس یا رازی در کد نیست.
final class AppConfig {
  const AppConfig({required this.apiBaseUrl, required this.certSha256, required this.isRelease});

  factory AppConfig.fromEnvironment() {
    const base = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:3000');
    const pin = String.fromEnvironment('CERT_SHA256');
    final config = AppConfig(
      apiBaseUrl: base.endsWith('/') ? base.substring(0, base.length - 1) : base,
      certSha256: pin.isEmpty ? null : pin.toLowerCase().replaceAll(':', ''),
      isRelease: kReleaseMode,
    );
    // در release فقط HTTPS؛ manifest هم cleartext را می‌بندد
    if (config.isRelease && !config.apiBaseUrl.startsWith('https://')) {
      throw StateError('API_BASE_URL must be https in release builds');
    }
    return config;
  }

  /// بدون `/v1`؛ مثل `https://api.example.ir`.
  final String apiBaseUrl;

  /// SHA-256 گواهی سرور (hex) برای pinning؛ خالی = خاموش.
  final String? certSha256;

  final bool isRelease;

  String get apiV1 => '$apiBaseUrl/v1';
}
