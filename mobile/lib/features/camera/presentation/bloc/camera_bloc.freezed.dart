// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'camera_bloc.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$CameraState {

 CaptureRequest get request; CameraStatus get status; List<StoredPhoto> get taken; Failure? get failure;/// GPS این عکس در دسترس نبود؛ عکس بی مختصات ذخیره شد.
 Failure? get locationWarning;
/// Create a copy of CameraState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CameraStateCopyWith<CameraState> get copyWith => _$CameraStateCopyWithImpl<CameraState>(this as CameraState, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CameraState&&(identical(other.request, request) || other.request == request)&&(identical(other.status, status) || other.status == status)&&const DeepCollectionEquality().equals(other.taken, taken)&&(identical(other.failure, failure) || other.failure == failure)&&(identical(other.locationWarning, locationWarning) || other.locationWarning == locationWarning));
}


@override
int get hashCode => Object.hash(runtimeType,request,status,const DeepCollectionEquality().hash(taken),failure,locationWarning);

@override
String toString() {
  return 'CameraState(request: $request, status: $status, taken: $taken, failure: $failure, locationWarning: $locationWarning)';
}


}

/// @nodoc
abstract mixin class $CameraStateCopyWith<$Res>  {
  factory $CameraStateCopyWith(CameraState value, $Res Function(CameraState) _then) = _$CameraStateCopyWithImpl;
@useResult
$Res call({
 CaptureRequest request, CameraStatus status, List<StoredPhoto> taken, Failure? failure, Failure? locationWarning
});




}
/// @nodoc
class _$CameraStateCopyWithImpl<$Res>
    implements $CameraStateCopyWith<$Res> {
  _$CameraStateCopyWithImpl(this._self, this._then);

  final CameraState _self;
  final $Res Function(CameraState) _then;

/// Create a copy of CameraState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? request = null,Object? status = null,Object? taken = null,Object? failure = freezed,Object? locationWarning = freezed,}) {
  return _then(_self.copyWith(
request: null == request ? _self.request : request // ignore: cast_nullable_to_non_nullable
as CaptureRequest,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as CameraStatus,taken: null == taken ? _self.taken : taken // ignore: cast_nullable_to_non_nullable
as List<StoredPhoto>,failure: freezed == failure ? _self.failure : failure // ignore: cast_nullable_to_non_nullable
as Failure?,locationWarning: freezed == locationWarning ? _self.locationWarning : locationWarning // ignore: cast_nullable_to_non_nullable
as Failure?,
  ));
}

}


/// Adds pattern-matching-related methods to [CameraState].
extension CameraStatePatterns on CameraState {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CameraState value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CameraState() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CameraState value)  $default,){
final _that = this;
switch (_that) {
case _CameraState():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CameraState value)?  $default,){
final _that = this;
switch (_that) {
case _CameraState() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( CaptureRequest request,  CameraStatus status,  List<StoredPhoto> taken,  Failure? failure,  Failure? locationWarning)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CameraState() when $default != null:
return $default(_that.request,_that.status,_that.taken,_that.failure,_that.locationWarning);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( CaptureRequest request,  CameraStatus status,  List<StoredPhoto> taken,  Failure? failure,  Failure? locationWarning)  $default,) {final _that = this;
switch (_that) {
case _CameraState():
return $default(_that.request,_that.status,_that.taken,_that.failure,_that.locationWarning);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( CaptureRequest request,  CameraStatus status,  List<StoredPhoto> taken,  Failure? failure,  Failure? locationWarning)?  $default,) {final _that = this;
switch (_that) {
case _CameraState() when $default != null:
return $default(_that.request,_that.status,_that.taken,_that.failure,_that.locationWarning);case _:
  return null;

}
}

}

/// @nodoc


class _CameraState implements CameraState {
  const _CameraState({required this.request, this.status = CameraStatus.ready, final  List<StoredPhoto> taken = const <StoredPhoto>[], this.failure, this.locationWarning}): _taken = taken;
  

@override final  CaptureRequest request;
@override@JsonKey() final  CameraStatus status;
 final  List<StoredPhoto> _taken;
@override@JsonKey() List<StoredPhoto> get taken {
  if (_taken is EqualUnmodifiableListView) return _taken;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_taken);
}

@override final  Failure? failure;
/// GPS این عکس در دسترس نبود؛ عکس بی مختصات ذخیره شد.
@override final  Failure? locationWarning;

/// Create a copy of CameraState
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CameraStateCopyWith<_CameraState> get copyWith => __$CameraStateCopyWithImpl<_CameraState>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CameraState&&(identical(other.request, request) || other.request == request)&&(identical(other.status, status) || other.status == status)&&const DeepCollectionEquality().equals(other._taken, _taken)&&(identical(other.failure, failure) || other.failure == failure)&&(identical(other.locationWarning, locationWarning) || other.locationWarning == locationWarning));
}


@override
int get hashCode => Object.hash(runtimeType,request,status,const DeepCollectionEquality().hash(_taken),failure,locationWarning);

@override
String toString() {
  return 'CameraState(request: $request, status: $status, taken: $taken, failure: $failure, locationWarning: $locationWarning)';
}


}

/// @nodoc
abstract mixin class _$CameraStateCopyWith<$Res> implements $CameraStateCopyWith<$Res> {
  factory _$CameraStateCopyWith(_CameraState value, $Res Function(_CameraState) _then) = __$CameraStateCopyWithImpl;
@override @useResult
$Res call({
 CaptureRequest request, CameraStatus status, List<StoredPhoto> taken, Failure? failure, Failure? locationWarning
});




}
/// @nodoc
class __$CameraStateCopyWithImpl<$Res>
    implements _$CameraStateCopyWith<$Res> {
  __$CameraStateCopyWithImpl(this._self, this._then);

  final _CameraState _self;
  final $Res Function(_CameraState) _then;

/// Create a copy of CameraState
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? request = null,Object? status = null,Object? taken = null,Object? failure = freezed,Object? locationWarning = freezed,}) {
  return _then(_CameraState(
request: null == request ? _self.request : request // ignore: cast_nullable_to_non_nullable
as CaptureRequest,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as CameraStatus,taken: null == taken ? _self._taken : taken // ignore: cast_nullable_to_non_nullable
as List<StoredPhoto>,failure: freezed == failure ? _self.failure : failure // ignore: cast_nullable_to_non_nullable
as Failure?,locationWarning: freezed == locationWarning ? _self.locationWarning : locationWarning // ignore: cast_nullable_to_non_nullable
as Failure?,
  ));
}


}

// dart format on
