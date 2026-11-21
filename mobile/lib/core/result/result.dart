import 'package:projeyar_field/core/error/failure.dart';

/// خروجی همهٔ repositoryها و use caseها؛ جریان کنترل بدون استثنا
/// (https://docs.flutter.dev/app-architecture/design-patterns/result).
sealed class Result<T> {
  const Result();

  const factory Result.ok(T value) = Ok<T>;
  const factory Result.err(Failure failure) = Err<T>;

  R fold<R>(R Function(Failure failure) onErr, R Function(T value) onOk) => switch (this) {
    Ok<T>(:final value) => onOk(value),
    Err<T>(:final failure) => onErr(failure),
  };

  T? get valueOrNull => switch (this) {
    Ok<T>(:final value) => value,
    Err<T>() => null,
  };

  Failure? get failureOrNull => switch (this) {
    Ok<T>() => null,
    Err<T>(:final failure) => failure,
  };

  bool get isOk => this is Ok<T>;

  Result<R> map<R>(R Function(T value) transform) => switch (this) {
    Ok<T>(:final value) => Ok<R>(transform(value)),
    Err<T>(:final failure) => Err<R>(failure),
  };

  Future<Result<R>> then<R>(Future<Result<R>> Function(T value) next) async => switch (this) {
    Ok<T>(:final value) => next(value),
    Err<T>(:final failure) => Err<R>(failure),
  };
}

final class Ok<T> extends Result<T> {
  const Ok(this.value);
  final T value;
}

final class Err<T> extends Result<T> {
  const Err(this.failure);
  final Failure failure;
}

/// نتیجهٔ بی‌مقدار.
final class Unit {
  const Unit._();
}

const unit = Unit._();
