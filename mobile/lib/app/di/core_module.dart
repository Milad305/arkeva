import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/config/app_config.dart';
import 'package:projeyar_field/core/database/app_database.dart';
import 'package:projeyar_field/core/device/app_info.dart';
import 'package:projeyar_field/core/network/api_client.dart';
import 'package:projeyar_field/core/network/app_update_gate.dart';
import 'package:projeyar_field/core/network/token_store.dart';
import 'package:projeyar_field/core/security/file_cipher.dart';
import 'package:projeyar_field/core/security/secure_store.dart';
import 'package:projeyar_field/core/time/clock.dart';
import 'package:talker_flutter/talker_flutter.dart';

/// ثبت زیرساخت‌های بیرونی که خودشان حاشیه‌نویسی injectable ندارند.
@module
abstract class CoreModule {
  @lazySingleton
  AppConfig get config => AppConfig.fromEnvironment();

  @lazySingleton
  Talker talker(AppConfig config) => TalkerFlutter.init(settings: TalkerSettings(enabled: !config.isRelease, useConsoleLogs: !config.isRelease));

  @lazySingleton
  SecureStore get secureStore => SecureStore();

  @lazySingleton
  TokenStore tokenStore(SecureStore secure) => TokenStore(secure);

  @lazySingleton
  AppUpdateGate get appUpdateGate => AppUpdateGate();

  @lazySingleton
  ApiClient apiClient(AppConfig config, TokenStore tokens, Talker talker, AppInfo appInfo, AppUpdateGate updateGate) =>
      ApiClient(config: config, tokens: tokens, talker: talker, appInfo: appInfo, updateGate: updateGate);

  @preResolve
  @lazySingleton
  Future<AppDatabase> database(SecureStore secure) async => AppDatabase.openEncrypted(await secure.databaseKeyHex());

  @lazySingleton
  FileCipher fileCipher(SecureStore secure) => FileCipher(secure.fileKeyBytes);

  @lazySingleton
  Clock get clock => const Clock();

  @lazySingleton
  Connectivity get connectivity => Connectivity();
}
