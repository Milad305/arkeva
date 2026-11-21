// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'invite_bloc.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$InviteState {

 String get code; FormzSubmissionStatus get status; OtpChallenge? get challenge; Failure? get failure;
/// Create a copy of InviteState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$InviteStateCopyWith<InviteState> get copyWith => _$InviteStateCopyWithImpl<InviteState>(this as InviteState, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is InviteState&&(identical(other.code, code) || other.code == code)&&(identical(other.status, status) || other.status == status)&&(identical(other.challenge, challenge) || other.challenge == challenge)&&(identical(other.failure, failure) || other.failure == failure));
}


@override
int get hashCode => Object.hash(runtimeType,code,status,challenge,failure);

@override
String toString() {
  return 'InviteState(code: $code, status: $status, challenge: $challenge, failure: $failure)';
}


}

/// @nodoc
abstract mixin class $InviteStateCopyWith<$Res>  {
  factory $InviteStateCopyWith(InviteState value, $Res Function(InviteState) _then) = _$InviteStateCopyWithImpl;
@useResult
$Res call({
 String code, FormzSubmissionStatus status, OtpChallenge? challenge, Failure? failure
});




}
/// @nodoc
class _$InviteStateCopyWithImpl<$Res>
    implements $InviteStateCopyWith<$Res> {
  _$InviteStateCopyWithImpl(this._self, this._then);

  final InviteState _self;
  final $Res Function(InviteState) _then;

/// Create a copy of InviteState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? code = null,Object? status = null,Object? challenge = freezed,Object? failure = freezed,}) {
  return _then(_self.copyWith(
code: null == code ? _self.code : code // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as FormzSubmissionStatus,challenge: freezed == challenge ? _self.challenge : challenge // ignore: cast_nullable_to_non_nullable
as OtpChallenge?,failure: freezed == failure ? _self.failure : failure // ignore: cast_nullable_to_non_nullable
as Failure?,
  ));
}

}


/// Adds pattern-matching-related methods to [InviteState].
extension InviteStatePatterns on InviteState {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _InviteState value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _InviteState() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _InviteState value)  $default,){
final _that = this;
switch (_that) {
case _InviteState():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _InviteState value)?  $default,){
final _that = this;
switch (_that) {
case _InviteState() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String code,  FormzSubmissionStatus status,  OtpChallenge? challenge,  Failure? failure)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _InviteState() when $default != null:
return $default(_that.code,_that.status,_that.challenge,_that.failure);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String code,  FormzSubmissionStatus status,  OtpChallenge? challenge,  Failure? failure)  $default,) {final _that = this;
switch (_that) {
case _InviteState():
return $default(_that.code,_that.status,_that.challenge,_that.failure);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String code,  FormzSubmissionStatus status,  OtpChallenge? challenge,  Failure? failure)?  $default,) {final _that = this;
switch (_that) {
case _InviteState() when $default != null:
return $default(_that.code,_that.status,_that.challenge,_that.failure);case _:
  return null;

}
}

}

/// @nodoc


class _InviteState extends InviteState {
  const _InviteState({this.code = '', this.status = FormzSubmissionStatus.initial, this.challenge, this.failure}): super._();
  

@override@JsonKey() final  String code;
@override@JsonKey() final  FormzSubmissionStatus status;
@override final  OtpChallenge? challenge;
@override final  Failure? failure;

/// Create a copy of InviteState
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$InviteStateCopyWith<_InviteState> get copyWith => __$InviteStateCopyWithImpl<_InviteState>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _InviteState&&(identical(other.code, code) || other.code == code)&&(identical(other.status, status) || other.status == status)&&(identical(other.challenge, challenge) || other.challenge == challenge)&&(identical(other.failure, failure) || other.failure == failure));
}


@override
int get hashCode => Object.hash(runtimeType,code,status,challenge,failure);

@override
String toString() {
  return 'InviteState(code: $code, status: $status, challenge: $challenge, failure: $failure)';
}


}

/// @nodoc
abstract mixin class _$InviteStateCopyWith<$Res> implements $InviteStateCopyWith<$Res> {
  factory _$InviteStateCopyWith(_InviteState value, $Res Function(_InviteState) _then) = __$InviteStateCopyWithImpl;
@override @useResult
$Res call({
 String code, FormzSubmissionStatus status, OtpChallenge? challenge, Failure? failure
});




}
/// @nodoc
class __$InviteStateCopyWithImpl<$Res>
    implements _$InviteStateCopyWith<$Res> {
  __$InviteStateCopyWithImpl(this._self, this._then);

  final _InviteState _self;
  final $Res Function(_InviteState) _then;

/// Create a copy of InviteState
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? code = null,Object? status = null,Object? challenge = freezed,Object? failure = freezed,}) {
  return _then(_InviteState(
code: null == code ? _self.code : code // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as FormzSubmissionStatus,challenge: freezed == challenge ? _self.challenge : challenge // ignore: cast_nullable_to_non_nullable
as OtpChallenge?,failure: freezed == failure ? _self.failure : failure // ignore: cast_nullable_to_non_nullable
as Failure?,
  ));
}


}

// dart format on
