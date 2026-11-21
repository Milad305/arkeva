import 'package:get_it/get_it.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/app/di/injection.config.dart';

/// ظرف وابستگی‌ها (docs/rules/flutter-clean-bloc.md ۶.۷). فقط در `app/` و `bootstrap` مستقیم خوانده می‌شود.
final GetIt getIt = GetIt.instance;

@InjectableInit(preferRelativeImports: false)
Future<void> configureDependencies() => getIt.init();
