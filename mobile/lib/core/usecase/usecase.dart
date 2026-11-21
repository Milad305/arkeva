import 'package:projeyar_field/core/result/result.dart';

/// یک کار دامنه با یک ورودی (docs/rules/flutter-clean-bloc.md ۴).
// ignore: one_member_abstracts — قرارداد مشترک همهٔ use caseها
abstract interface class UseCase<T, P> {
  Future<Result<T>> call(P params);
}

/// ورودی خالی use case.
final class NoParams {
  const NoParams();
}
