// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'revision_bloc.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$RevisionState {

 String get resubmissionId; RevisionStatus get status; ServerItem? get item; Activity? get activity;/// مقدار تازه: مقدار امروز (روش مقداری) یا درصد تجمعی
 String get value; Map<String, double> get steps; Set<String> get checkedKeys; LimitedText get reply; List<StoredPhoto> get newPhotos; bool get alreadyQueued; bool get showErrors; Failure? get failure;
/// Create a copy of RevisionState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RevisionStateCopyWith<RevisionState> get copyWith => _$RevisionStateCopyWithImpl<RevisionState>(this as RevisionState, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RevisionState&&(identical(other.resubmissionId, resubmissionId) || other.resubmissionId == resubmissionId)&&(identical(other.status, status) || other.status == status)&&(identical(other.item, item) || other.item == item)&&(identical(other.activity, activity) || other.activity == activity)&&(identical(other.value, value) || other.value == value)&&const DeepCollectionEquality().equals(other.steps, steps)&&const DeepCollectionEquality().equals(other.checkedKeys, checkedKeys)&&(identical(other.reply, reply) || other.reply == reply)&&const DeepCollectionEquality().equals(other.newPhotos, newPhotos)&&(identical(other.alreadyQueued, alreadyQueued) || other.alreadyQueued == alreadyQueued)&&(identical(other.showErrors, showErrors) || other.showErrors == showErrors)&&(identical(other.failure, failure) || other.failure == failure));
}


@override
int get hashCode => Object.hash(runtimeType,resubmissionId,status,item,activity,value,const DeepCollectionEquality().hash(steps),const DeepCollectionEquality().hash(checkedKeys),reply,const DeepCollectionEquality().hash(newPhotos),alreadyQueued,showErrors,failure);

@override
String toString() {
  return 'RevisionState(resubmissionId: $resubmissionId, status: $status, item: $item, activity: $activity, value: $value, steps: $steps, checkedKeys: $checkedKeys, reply: $reply, newPhotos: $newPhotos, alreadyQueued: $alreadyQueued, showErrors: $showErrors, failure: $failure)';
}


}

/// @nodoc
abstract mixin class $RevisionStateCopyWith<$Res>  {
  factory $RevisionStateCopyWith(RevisionState value, $Res Function(RevisionState) _then) = _$RevisionStateCopyWithImpl;
@useResult
$Res call({
 String resubmissionId, RevisionStatus status, ServerItem? item, Activity? activity, String value, Map<String, double> steps, Set<String> checkedKeys, LimitedText reply, List<StoredPhoto> newPhotos, bool alreadyQueued, bool showErrors, Failure? failure
});




}
/// @nodoc
class _$RevisionStateCopyWithImpl<$Res>
    implements $RevisionStateCopyWith<$Res> {
  _$RevisionStateCopyWithImpl(this._self, this._then);

  final RevisionState _self;
  final $Res Function(RevisionState) _then;

/// Create a copy of RevisionState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? resubmissionId = null,Object? status = null,Object? item = freezed,Object? activity = freezed,Object? value = null,Object? steps = null,Object? checkedKeys = null,Object? reply = null,Object? newPhotos = null,Object? alreadyQueued = null,Object? showErrors = null,Object? failure = freezed,}) {
  return _then(_self.copyWith(
resubmissionId: null == resubmissionId ? _self.resubmissionId : resubmissionId // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as RevisionStatus,item: freezed == item ? _self.item : item // ignore: cast_nullable_to_non_nullable
as ServerItem?,activity: freezed == activity ? _self.activity : activity // ignore: cast_nullable_to_non_nullable
as Activity?,value: null == value ? _self.value : value // ignore: cast_nullable_to_non_nullable
as String,steps: null == steps ? _self.steps : steps // ignore: cast_nullable_to_non_nullable
as Map<String, double>,checkedKeys: null == checkedKeys ? _self.checkedKeys : checkedKeys // ignore: cast_nullable_to_non_nullable
as Set<String>,reply: null == reply ? _self.reply : reply // ignore: cast_nullable_to_non_nullable
as LimitedText,newPhotos: null == newPhotos ? _self.newPhotos : newPhotos // ignore: cast_nullable_to_non_nullable
as List<StoredPhoto>,alreadyQueued: null == alreadyQueued ? _self.alreadyQueued : alreadyQueued // ignore: cast_nullable_to_non_nullable
as bool,showErrors: null == showErrors ? _self.showErrors : showErrors // ignore: cast_nullable_to_non_nullable
as bool,failure: freezed == failure ? _self.failure : failure // ignore: cast_nullable_to_non_nullable
as Failure?,
  ));
}

}


/// Adds pattern-matching-related methods to [RevisionState].
extension RevisionStatePatterns on RevisionState {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RevisionState value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RevisionState() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RevisionState value)  $default,){
final _that = this;
switch (_that) {
case _RevisionState():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RevisionState value)?  $default,){
final _that = this;
switch (_that) {
case _RevisionState() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String resubmissionId,  RevisionStatus status,  ServerItem? item,  Activity? activity,  String value,  Map<String, double> steps,  Set<String> checkedKeys,  LimitedText reply,  List<StoredPhoto> newPhotos,  bool alreadyQueued,  bool showErrors,  Failure? failure)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RevisionState() when $default != null:
return $default(_that.resubmissionId,_that.status,_that.item,_that.activity,_that.value,_that.steps,_that.checkedKeys,_that.reply,_that.newPhotos,_that.alreadyQueued,_that.showErrors,_that.failure);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String resubmissionId,  RevisionStatus status,  ServerItem? item,  Activity? activity,  String value,  Map<String, double> steps,  Set<String> checkedKeys,  LimitedText reply,  List<StoredPhoto> newPhotos,  bool alreadyQueued,  bool showErrors,  Failure? failure)  $default,) {final _that = this;
switch (_that) {
case _RevisionState():
return $default(_that.resubmissionId,_that.status,_that.item,_that.activity,_that.value,_that.steps,_that.checkedKeys,_that.reply,_that.newPhotos,_that.alreadyQueued,_that.showErrors,_that.failure);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String resubmissionId,  RevisionStatus status,  ServerItem? item,  Activity? activity,  String value,  Map<String, double> steps,  Set<String> checkedKeys,  LimitedText reply,  List<StoredPhoto> newPhotos,  bool alreadyQueued,  bool showErrors,  Failure? failure)?  $default,) {final _that = this;
switch (_that) {
case _RevisionState() when $default != null:
return $default(_that.resubmissionId,_that.status,_that.item,_that.activity,_that.value,_that.steps,_that.checkedKeys,_that.reply,_that.newPhotos,_that.alreadyQueued,_that.showErrors,_that.failure);case _:
  return null;

}
}

}

/// @nodoc


class _RevisionState extends RevisionState {
  const _RevisionState({required this.resubmissionId, this.status = RevisionStatus.loading, this.item, this.activity, this.value = '', final  Map<String, double> steps = const <String, double>{}, final  Set<String> checkedKeys = const <String>{}, this.reply = const LimitedText.pure(maxLength: 2000), final  List<StoredPhoto> newPhotos = const <StoredPhoto>[], this.alreadyQueued = false, this.showErrors = false, this.failure}): _steps = steps,_checkedKeys = checkedKeys,_newPhotos = newPhotos,super._();
  

@override final  String resubmissionId;
@override@JsonKey() final  RevisionStatus status;
@override final  ServerItem? item;
@override final  Activity? activity;
/// مقدار تازه: مقدار امروز (روش مقداری) یا درصد تجمعی
@override@JsonKey() final  String value;
 final  Map<String, double> _steps;
@override@JsonKey() Map<String, double> get steps {
  if (_steps is EqualUnmodifiableMapView) return _steps;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(_steps);
}

 final  Set<String> _checkedKeys;
@override@JsonKey() Set<String> get checkedKeys {
  if (_checkedKeys is EqualUnmodifiableSetView) return _checkedKeys;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableSetView(_checkedKeys);
}

@override@JsonKey() final  LimitedText reply;
 final  List<StoredPhoto> _newPhotos;
@override@JsonKey() List<StoredPhoto> get newPhotos {
  if (_newPhotos is EqualUnmodifiableListView) return _newPhotos;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_newPhotos);
}

@override@JsonKey() final  bool alreadyQueued;
@override@JsonKey() final  bool showErrors;
@override final  Failure? failure;

/// Create a copy of RevisionState
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RevisionStateCopyWith<_RevisionState> get copyWith => __$RevisionStateCopyWithImpl<_RevisionState>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _RevisionState&&(identical(other.resubmissionId, resubmissionId) || other.resubmissionId == resubmissionId)&&(identical(other.status, status) || other.status == status)&&(identical(other.item, item) || other.item == item)&&(identical(other.activity, activity) || other.activity == activity)&&(identical(other.value, value) || other.value == value)&&const DeepCollectionEquality().equals(other._steps, _steps)&&const DeepCollectionEquality().equals(other._checkedKeys, _checkedKeys)&&(identical(other.reply, reply) || other.reply == reply)&&const DeepCollectionEquality().equals(other._newPhotos, _newPhotos)&&(identical(other.alreadyQueued, alreadyQueued) || other.alreadyQueued == alreadyQueued)&&(identical(other.showErrors, showErrors) || other.showErrors == showErrors)&&(identical(other.failure, failure) || other.failure == failure));
}


@override
int get hashCode => Object.hash(runtimeType,resubmissionId,status,item,activity,value,const DeepCollectionEquality().hash(_steps),const DeepCollectionEquality().hash(_checkedKeys),reply,const DeepCollectionEquality().hash(_newPhotos),alreadyQueued,showErrors,failure);

@override
String toString() {
  return 'RevisionState(resubmissionId: $resubmissionId, status: $status, item: $item, activity: $activity, value: $value, steps: $steps, checkedKeys: $checkedKeys, reply: $reply, newPhotos: $newPhotos, alreadyQueued: $alreadyQueued, showErrors: $showErrors, failure: $failure)';
}


}

/// @nodoc
abstract mixin class _$RevisionStateCopyWith<$Res> implements $RevisionStateCopyWith<$Res> {
  factory _$RevisionStateCopyWith(_RevisionState value, $Res Function(_RevisionState) _then) = __$RevisionStateCopyWithImpl;
@override @useResult
$Res call({
 String resubmissionId, RevisionStatus status, ServerItem? item, Activity? activity, String value, Map<String, double> steps, Set<String> checkedKeys, LimitedText reply, List<StoredPhoto> newPhotos, bool alreadyQueued, bool showErrors, Failure? failure
});




}
/// @nodoc
class __$RevisionStateCopyWithImpl<$Res>
    implements _$RevisionStateCopyWith<$Res> {
  __$RevisionStateCopyWithImpl(this._self, this._then);

  final _RevisionState _self;
  final $Res Function(_RevisionState) _then;

/// Create a copy of RevisionState
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? resubmissionId = null,Object? status = null,Object? item = freezed,Object? activity = freezed,Object? value = null,Object? steps = null,Object? checkedKeys = null,Object? reply = null,Object? newPhotos = null,Object? alreadyQueued = null,Object? showErrors = null,Object? failure = freezed,}) {
  return _then(_RevisionState(
resubmissionId: null == resubmissionId ? _self.resubmissionId : resubmissionId // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as RevisionStatus,item: freezed == item ? _self.item : item // ignore: cast_nullable_to_non_nullable
as ServerItem?,activity: freezed == activity ? _self.activity : activity // ignore: cast_nullable_to_non_nullable
as Activity?,value: null == value ? _self.value : value // ignore: cast_nullable_to_non_nullable
as String,steps: null == steps ? _self._steps : steps // ignore: cast_nullable_to_non_nullable
as Map<String, double>,checkedKeys: null == checkedKeys ? _self._checkedKeys : checkedKeys // ignore: cast_nullable_to_non_nullable
as Set<String>,reply: null == reply ? _self.reply : reply // ignore: cast_nullable_to_non_nullable
as LimitedText,newPhotos: null == newPhotos ? _self._newPhotos : newPhotos // ignore: cast_nullable_to_non_nullable
as List<StoredPhoto>,alreadyQueued: null == alreadyQueued ? _self.alreadyQueued : alreadyQueued // ignore: cast_nullable_to_non_nullable
as bool,showErrors: null == showErrors ? _self.showErrors : showErrors // ignore: cast_nullable_to_non_nullable
as bool,failure: freezed == failure ? _self.failure : failure // ignore: cast_nullable_to_non_nullable
as Failure?,
  ));
}


}

// dart format on
