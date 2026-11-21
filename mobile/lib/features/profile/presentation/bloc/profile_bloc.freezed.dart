// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'profile_bloc.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$ProfileState {

 ProfileStatus get status; List<Project> get projects; bool get wifiOnly; bool get reminderEnabled; QueueSummary get queue; SyncInfo get sync; String get version; Failure? get failure;
/// Create a copy of ProfileState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ProfileStateCopyWith<ProfileState> get copyWith => _$ProfileStateCopyWithImpl<ProfileState>(this as ProfileState, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ProfileState&&(identical(other.status, status) || other.status == status)&&const DeepCollectionEquality().equals(other.projects, projects)&&(identical(other.wifiOnly, wifiOnly) || other.wifiOnly == wifiOnly)&&(identical(other.reminderEnabled, reminderEnabled) || other.reminderEnabled == reminderEnabled)&&(identical(other.queue, queue) || other.queue == queue)&&(identical(other.sync, sync) || other.sync == sync)&&(identical(other.version, version) || other.version == version)&&(identical(other.failure, failure) || other.failure == failure));
}


@override
int get hashCode => Object.hash(runtimeType,status,const DeepCollectionEquality().hash(projects),wifiOnly,reminderEnabled,queue,sync,version,failure);

@override
String toString() {
  return 'ProfileState(status: $status, projects: $projects, wifiOnly: $wifiOnly, reminderEnabled: $reminderEnabled, queue: $queue, sync: $sync, version: $version, failure: $failure)';
}


}

/// @nodoc
abstract mixin class $ProfileStateCopyWith<$Res>  {
  factory $ProfileStateCopyWith(ProfileState value, $Res Function(ProfileState) _then) = _$ProfileStateCopyWithImpl;
@useResult
$Res call({
 ProfileStatus status, List<Project> projects, bool wifiOnly, bool reminderEnabled, QueueSummary queue, SyncInfo sync, String version, Failure? failure
});




}
/// @nodoc
class _$ProfileStateCopyWithImpl<$Res>
    implements $ProfileStateCopyWith<$Res> {
  _$ProfileStateCopyWithImpl(this._self, this._then);

  final ProfileState _self;
  final $Res Function(ProfileState) _then;

/// Create a copy of ProfileState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? status = null,Object? projects = null,Object? wifiOnly = null,Object? reminderEnabled = null,Object? queue = null,Object? sync = null,Object? version = null,Object? failure = freezed,}) {
  return _then(_self.copyWith(
status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as ProfileStatus,projects: null == projects ? _self.projects : projects // ignore: cast_nullable_to_non_nullable
as List<Project>,wifiOnly: null == wifiOnly ? _self.wifiOnly : wifiOnly // ignore: cast_nullable_to_non_nullable
as bool,reminderEnabled: null == reminderEnabled ? _self.reminderEnabled : reminderEnabled // ignore: cast_nullable_to_non_nullable
as bool,queue: null == queue ? _self.queue : queue // ignore: cast_nullable_to_non_nullable
as QueueSummary,sync: null == sync ? _self.sync : sync // ignore: cast_nullable_to_non_nullable
as SyncInfo,version: null == version ? _self.version : version // ignore: cast_nullable_to_non_nullable
as String,failure: freezed == failure ? _self.failure : failure // ignore: cast_nullable_to_non_nullable
as Failure?,
  ));
}

}


/// Adds pattern-matching-related methods to [ProfileState].
extension ProfileStatePatterns on ProfileState {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ProfileState value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ProfileState() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ProfileState value)  $default,){
final _that = this;
switch (_that) {
case _ProfileState():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ProfileState value)?  $default,){
final _that = this;
switch (_that) {
case _ProfileState() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( ProfileStatus status,  List<Project> projects,  bool wifiOnly,  bool reminderEnabled,  QueueSummary queue,  SyncInfo sync,  String version,  Failure? failure)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ProfileState() when $default != null:
return $default(_that.status,_that.projects,_that.wifiOnly,_that.reminderEnabled,_that.queue,_that.sync,_that.version,_that.failure);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( ProfileStatus status,  List<Project> projects,  bool wifiOnly,  bool reminderEnabled,  QueueSummary queue,  SyncInfo sync,  String version,  Failure? failure)  $default,) {final _that = this;
switch (_that) {
case _ProfileState():
return $default(_that.status,_that.projects,_that.wifiOnly,_that.reminderEnabled,_that.queue,_that.sync,_that.version,_that.failure);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( ProfileStatus status,  List<Project> projects,  bool wifiOnly,  bool reminderEnabled,  QueueSummary queue,  SyncInfo sync,  String version,  Failure? failure)?  $default,) {final _that = this;
switch (_that) {
case _ProfileState() when $default != null:
return $default(_that.status,_that.projects,_that.wifiOnly,_that.reminderEnabled,_that.queue,_that.sync,_that.version,_that.failure);case _:
  return null;

}
}

}

/// @nodoc


class _ProfileState extends ProfileState {
  const _ProfileState({this.status = ProfileStatus.loading, final  List<Project> projects = const <Project>[], this.wifiOnly = false, this.reminderEnabled = true, this.queue = const QueueSummary(), this.sync = const SyncInfo(), this.version = '', this.failure}): _projects = projects,super._();
  

@override@JsonKey() final  ProfileStatus status;
 final  List<Project> _projects;
@override@JsonKey() List<Project> get projects {
  if (_projects is EqualUnmodifiableListView) return _projects;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_projects);
}

@override@JsonKey() final  bool wifiOnly;
@override@JsonKey() final  bool reminderEnabled;
@override@JsonKey() final  QueueSummary queue;
@override@JsonKey() final  SyncInfo sync;
@override@JsonKey() final  String version;
@override final  Failure? failure;

/// Create a copy of ProfileState
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ProfileStateCopyWith<_ProfileState> get copyWith => __$ProfileStateCopyWithImpl<_ProfileState>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ProfileState&&(identical(other.status, status) || other.status == status)&&const DeepCollectionEquality().equals(other._projects, _projects)&&(identical(other.wifiOnly, wifiOnly) || other.wifiOnly == wifiOnly)&&(identical(other.reminderEnabled, reminderEnabled) || other.reminderEnabled == reminderEnabled)&&(identical(other.queue, queue) || other.queue == queue)&&(identical(other.sync, sync) || other.sync == sync)&&(identical(other.version, version) || other.version == version)&&(identical(other.failure, failure) || other.failure == failure));
}


@override
int get hashCode => Object.hash(runtimeType,status,const DeepCollectionEquality().hash(_projects),wifiOnly,reminderEnabled,queue,sync,version,failure);

@override
String toString() {
  return 'ProfileState(status: $status, projects: $projects, wifiOnly: $wifiOnly, reminderEnabled: $reminderEnabled, queue: $queue, sync: $sync, version: $version, failure: $failure)';
}


}

/// @nodoc
abstract mixin class _$ProfileStateCopyWith<$Res> implements $ProfileStateCopyWith<$Res> {
  factory _$ProfileStateCopyWith(_ProfileState value, $Res Function(_ProfileState) _then) = __$ProfileStateCopyWithImpl;
@override @useResult
$Res call({
 ProfileStatus status, List<Project> projects, bool wifiOnly, bool reminderEnabled, QueueSummary queue, SyncInfo sync, String version, Failure? failure
});




}
/// @nodoc
class __$ProfileStateCopyWithImpl<$Res>
    implements _$ProfileStateCopyWith<$Res> {
  __$ProfileStateCopyWithImpl(this._self, this._then);

  final _ProfileState _self;
  final $Res Function(_ProfileState) _then;

/// Create a copy of ProfileState
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? status = null,Object? projects = null,Object? wifiOnly = null,Object? reminderEnabled = null,Object? queue = null,Object? sync = null,Object? version = null,Object? failure = freezed,}) {
  return _then(_ProfileState(
status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as ProfileStatus,projects: null == projects ? _self._projects : projects // ignore: cast_nullable_to_non_nullable
as List<Project>,wifiOnly: null == wifiOnly ? _self.wifiOnly : wifiOnly // ignore: cast_nullable_to_non_nullable
as bool,reminderEnabled: null == reminderEnabled ? _self.reminderEnabled : reminderEnabled // ignore: cast_nullable_to_non_nullable
as bool,queue: null == queue ? _self.queue : queue // ignore: cast_nullable_to_non_nullable
as QueueSummary,sync: null == sync ? _self.sync : sync // ignore: cast_nullable_to_non_nullable
as SyncInfo,version: null == version ? _self.version : version // ignore: cast_nullable_to_non_nullable
as String,failure: freezed == failure ? _self.failure : failure // ignore: cast_nullable_to_non_nullable
as Failure?,
  ));
}


}

// dart format on
