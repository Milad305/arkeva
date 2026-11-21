// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'otp_bloc.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$OtpState {

 OtpChallenge? get challenge; String get mobile; String? get inviteCode; OtpCodeInput get code; FormzSubmissionStatus get status; bool get showErrors; int get resendIn; bool get resending; AppUser? get user; Failure? get failure;
/// Create a copy of OtpState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OtpStateCopyWith<OtpState> get copyWith => _$OtpStateCopyWithImpl<OtpState>(this as OtpState, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is OtpState&&(identical(other.challenge, challenge) || other.challenge == challenge)&&(identical(other.mobile, mobile) || other.mobile == mobile)&&(identical(other.inviteCode, inviteCode) || other.inviteCode == inviteCode)&&(identical(other.code, code) || other.code == code)&&(identical(other.status, status) || other.status == status)&&(identical(other.showErrors, showErrors) || other.showErrors == showErrors)&&(identical(other.resendIn, resendIn) || other.resendIn == resendIn)&&(identical(other.resending, resending) || other.resending == resending)&&(identical(other.user, user) || other.user == user)&&(identical(other.failure, failure) || other.failure == failure));
}


@override
int get hashCode => Object.hash(runtimeType,challenge,mobile,inviteCode,code,status,showErrors,resendIn,resending,user,failure);

@override
String toString() {
  return 'OtpState(challenge: $challenge, mobile: $mobile, inviteCode: $inviteCode, code: $code, status: $status, showErrors: $showErrors, resendIn: $resendIn, resending: $resending, user: $user, failure: $failure)';
}


}

/// @nodoc
abstract mixin class $OtpStateCopyWith<$Res>  {
  factory $OtpStateCopyWith(OtpState value, $Res Function(OtpState) _then) = _$OtpStateCopyWithImpl;
@useResult
$Res call({
 OtpChallenge? challenge, String mobile, String? inviteCode, OtpCodeInput code, FormzSubmissionStatus status, bool showErrors, int resendIn, bool resending, AppUser? user, Failure? failure
});




}
/// @nodoc
class _$OtpStateCopyWithImpl<$Res>
    implements $OtpStateCopyWith<$Res> {
  _$OtpStateCopyWithImpl(this._self, this._then);

  final OtpState _self;
  final $Res Function(OtpState) _then;

/// Create a copy of OtpState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? challenge = freezed,Object? mobile = null,Object? inviteCode = freezed,Object? code = null,Object? status = null,Object? showErrors = null,Object? resendIn = null,Object? resending = null,Object? user = freezed,Object? failure = freezed,}) {
  return _then(_self.copyWith(
challenge: freezed == challenge ? _self.challenge : challenge // ignore: cast_nullable_to_non_nullable
as OtpChallenge?,mobile: null == mobile ? _self.mobile : mobile // ignore: cast_nullable_to_non_nullable
as String,inviteCode: freezed == inviteCode ? _self.inviteCode : inviteCode // ignore: cast_nullable_to_non_nullable
as String?,code: null == code ? _self.code : code // ignore: cast_nullable_to_non_nullable
as OtpCodeInput,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as FormzSubmissionStatus,showErrors: null == showErrors ? _self.showErrors : showErrors // ignore: cast_nullable_to_non_nullable
as bool,resendIn: null == resendIn ? _self.resendIn : resendIn // ignore: cast_nullable_to_non_nullable
as int,resending: null == resending ? _self.resending : resending // ignore: cast_nullable_to_non_nullable
as bool,user: freezed == user ? _self.user : user // ignore: cast_nullable_to_non_nullable
as AppUser?,failure: freezed == failure ? _self.failure : failure // ignore: cast_nullable_to_non_nullable
as Failure?,
  ));
}

}


/// Adds pattern-matching-related methods to [OtpState].
extension OtpStatePatterns on OtpState {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _OtpState value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _OtpState() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _OtpState value)  $default,){
final _that = this;
switch (_that) {
case _OtpState():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _OtpState value)?  $default,){
final _that = this;
switch (_that) {
case _OtpState() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( OtpChallenge? challenge,  String mobile,  String? inviteCode,  OtpCodeInput code,  FormzSubmissionStatus status,  bool showErrors,  int resendIn,  bool resending,  AppUser? user,  Failure? failure)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _OtpState() when $default != null:
return $default(_that.challenge,_that.mobile,_that.inviteCode,_that.code,_that.status,_that.showErrors,_that.resendIn,_that.resending,_that.user,_that.failure);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( OtpChallenge? challenge,  String mobile,  String? inviteCode,  OtpCodeInput code,  FormzSubmissionStatus status,  bool showErrors,  int resendIn,  bool resending,  AppUser? user,  Failure? failure)  $default,) {final _that = this;
switch (_that) {
case _OtpState():
return $default(_that.challenge,_that.mobile,_that.inviteCode,_that.code,_that.status,_that.showErrors,_that.resendIn,_that.resending,_that.user,_that.failure);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( OtpChallenge? challenge,  String mobile,  String? inviteCode,  OtpCodeInput code,  FormzSubmissionStatus status,  bool showErrors,  int resendIn,  bool resending,  AppUser? user,  Failure? failure)?  $default,) {final _that = this;
switch (_that) {
case _OtpState() when $default != null:
return $default(_that.challenge,_that.mobile,_that.inviteCode,_that.code,_that.status,_that.showErrors,_that.resendIn,_that.resending,_that.user,_that.failure);case _:
  return null;

}
}

}

/// @nodoc


class _OtpState extends OtpState {
  const _OtpState({this.challenge, this.mobile = '', this.inviteCode, this.code = const OtpCodeInput.pure(), this.status = FormzSubmissionStatus.initial, this.showErrors = false, this.resendIn = 0, this.resending = false, this.user, this.failure}): super._();
  

@override final  OtpChallenge? challenge;
@override@JsonKey() final  String mobile;
@override final  String? inviteCode;
@override@JsonKey() final  OtpCodeInput code;
@override@JsonKey() final  FormzSubmissionStatus status;
@override@JsonKey() final  bool showErrors;
@override@JsonKey() final  int resendIn;
@override@JsonKey() final  bool resending;
@override final  AppUser? user;
@override final  Failure? failure;

/// Create a copy of OtpState
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OtpStateCopyWith<_OtpState> get copyWith => __$OtpStateCopyWithImpl<_OtpState>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _OtpState&&(identical(other.challenge, challenge) || other.challenge == challenge)&&(identical(other.mobile, mobile) || other.mobile == mobile)&&(identical(other.inviteCode, inviteCode) || other.inviteCode == inviteCode)&&(identical(other.code, code) || other.code == code)&&(identical(other.status, status) || other.status == status)&&(identical(other.showErrors, showErrors) || other.showErrors == showErrors)&&(identical(other.resendIn, resendIn) || other.resendIn == resendIn)&&(identical(other.resending, resending) || other.resending == resending)&&(identical(other.user, user) || other.user == user)&&(identical(other.failure, failure) || other.failure == failure));
}


@override
int get hashCode => Object.hash(runtimeType,challenge,mobile,inviteCode,code,status,showErrors,resendIn,resending,user,failure);

@override
String toString() {
  return 'OtpState(challenge: $challenge, mobile: $mobile, inviteCode: $inviteCode, code: $code, status: $status, showErrors: $showErrors, resendIn: $resendIn, resending: $resending, user: $user, failure: $failure)';
}


}

/// @nodoc
abstract mixin class _$OtpStateCopyWith<$Res> implements $OtpStateCopyWith<$Res> {
  factory _$OtpStateCopyWith(_OtpState value, $Res Function(_OtpState) _then) = __$OtpStateCopyWithImpl;
@override @useResult
$Res call({
 OtpChallenge? challenge, String mobile, String? inviteCode, OtpCodeInput code, FormzSubmissionStatus status, bool showErrors, int resendIn, bool resending, AppUser? user, Failure? failure
});




}
/// @nodoc
class __$OtpStateCopyWithImpl<$Res>
    implements _$OtpStateCopyWith<$Res> {
  __$OtpStateCopyWithImpl(this._self, this._then);

  final _OtpState _self;
  final $Res Function(_OtpState) _then;

/// Create a copy of OtpState
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? challenge = freezed,Object? mobile = null,Object? inviteCode = freezed,Object? code = null,Object? status = null,Object? showErrors = null,Object? resendIn = null,Object? resending = null,Object? user = freezed,Object? failure = freezed,}) {
  return _then(_OtpState(
challenge: freezed == challenge ? _self.challenge : challenge // ignore: cast_nullable_to_non_nullable
as OtpChallenge?,mobile: null == mobile ? _self.mobile : mobile // ignore: cast_nullable_to_non_nullable
as String,inviteCode: freezed == inviteCode ? _self.inviteCode : inviteCode // ignore: cast_nullable_to_non_nullable
as String?,code: null == code ? _self.code : code // ignore: cast_nullable_to_non_nullable
as OtpCodeInput,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as FormzSubmissionStatus,showErrors: null == showErrors ? _self.showErrors : showErrors // ignore: cast_nullable_to_non_nullable
as bool,resendIn: null == resendIn ? _self.resendIn : resendIn // ignore: cast_nullable_to_non_nullable
as int,resending: null == resending ? _self.resending : resending // ignore: cast_nullable_to_non_nullable
as bool,user: freezed == user ? _self.user : user // ignore: cast_nullable_to_non_nullable
as AppUser?,failure: freezed == failure ? _self.failure : failure // ignore: cast_nullable_to_non_nullable
as Failure?,
  ));
}


}

// dart format on
