// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'activity_detail_bloc.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$ActivityDetailState {

 String get today; bool get loaded; Activity? get activity; Project? get project; List<ServerItem> get history;
/// Create a copy of ActivityDetailState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ActivityDetailStateCopyWith<ActivityDetailState> get copyWith => _$ActivityDetailStateCopyWithImpl<ActivityDetailState>(this as ActivityDetailState, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ActivityDetailState&&(identical(other.today, today) || other.today == today)&&(identical(other.loaded, loaded) || other.loaded == loaded)&&(identical(other.activity, activity) || other.activity == activity)&&(identical(other.project, project) || other.project == project)&&const DeepCollectionEquality().equals(other.history, history));
}


@override
int get hashCode => Object.hash(runtimeType,today,loaded,activity,project,const DeepCollectionEquality().hash(history));

@override
String toString() {
  return 'ActivityDetailState(today: $today, loaded: $loaded, activity: $activity, project: $project, history: $history)';
}


}

/// @nodoc
abstract mixin class $ActivityDetailStateCopyWith<$Res>  {
  factory $ActivityDetailStateCopyWith(ActivityDetailState value, $Res Function(ActivityDetailState) _then) = _$ActivityDetailStateCopyWithImpl;
@useResult
$Res call({
 String today, bool loaded, Activity? activity, Project? project, List<ServerItem> history
});




}
/// @nodoc
class _$ActivityDetailStateCopyWithImpl<$Res>
    implements $ActivityDetailStateCopyWith<$Res> {
  _$ActivityDetailStateCopyWithImpl(this._self, this._then);

  final ActivityDetailState _self;
  final $Res Function(ActivityDetailState) _then;

/// Create a copy of ActivityDetailState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? today = null,Object? loaded = null,Object? activity = freezed,Object? project = freezed,Object? history = null,}) {
  return _then(_self.copyWith(
today: null == today ? _self.today : today // ignore: cast_nullable_to_non_nullable
as String,loaded: null == loaded ? _self.loaded : loaded // ignore: cast_nullable_to_non_nullable
as bool,activity: freezed == activity ? _self.activity : activity // ignore: cast_nullable_to_non_nullable
as Activity?,project: freezed == project ? _self.project : project // ignore: cast_nullable_to_non_nullable
as Project?,history: null == history ? _self.history : history // ignore: cast_nullable_to_non_nullable
as List<ServerItem>,
  ));
}

}


/// Adds pattern-matching-related methods to [ActivityDetailState].
extension ActivityDetailStatePatterns on ActivityDetailState {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ActivityDetailState value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ActivityDetailState() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ActivityDetailState value)  $default,){
final _that = this;
switch (_that) {
case _ActivityDetailState():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ActivityDetailState value)?  $default,){
final _that = this;
switch (_that) {
case _ActivityDetailState() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String today,  bool loaded,  Activity? activity,  Project? project,  List<ServerItem> history)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ActivityDetailState() when $default != null:
return $default(_that.today,_that.loaded,_that.activity,_that.project,_that.history);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String today,  bool loaded,  Activity? activity,  Project? project,  List<ServerItem> history)  $default,) {final _that = this;
switch (_that) {
case _ActivityDetailState():
return $default(_that.today,_that.loaded,_that.activity,_that.project,_that.history);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String today,  bool loaded,  Activity? activity,  Project? project,  List<ServerItem> history)?  $default,) {final _that = this;
switch (_that) {
case _ActivityDetailState() when $default != null:
return $default(_that.today,_that.loaded,_that.activity,_that.project,_that.history);case _:
  return null;

}
}

}

/// @nodoc


class _ActivityDetailState extends ActivityDetailState {
  const _ActivityDetailState({required this.today, this.loaded = false, this.activity, this.project, final  List<ServerItem> history = const <ServerItem>[]}): _history = history,super._();
  

@override final  String today;
@override@JsonKey() final  bool loaded;
@override final  Activity? activity;
@override final  Project? project;
 final  List<ServerItem> _history;
@override@JsonKey() List<ServerItem> get history {
  if (_history is EqualUnmodifiableListView) return _history;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_history);
}


/// Create a copy of ActivityDetailState
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ActivityDetailStateCopyWith<_ActivityDetailState> get copyWith => __$ActivityDetailStateCopyWithImpl<_ActivityDetailState>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ActivityDetailState&&(identical(other.today, today) || other.today == today)&&(identical(other.loaded, loaded) || other.loaded == loaded)&&(identical(other.activity, activity) || other.activity == activity)&&(identical(other.project, project) || other.project == project)&&const DeepCollectionEquality().equals(other._history, _history));
}


@override
int get hashCode => Object.hash(runtimeType,today,loaded,activity,project,const DeepCollectionEquality().hash(_history));

@override
String toString() {
  return 'ActivityDetailState(today: $today, loaded: $loaded, activity: $activity, project: $project, history: $history)';
}


}

/// @nodoc
abstract mixin class _$ActivityDetailStateCopyWith<$Res> implements $ActivityDetailStateCopyWith<$Res> {
  factory _$ActivityDetailStateCopyWith(_ActivityDetailState value, $Res Function(_ActivityDetailState) _then) = __$ActivityDetailStateCopyWithImpl;
@override @useResult
$Res call({
 String today, bool loaded, Activity? activity, Project? project, List<ServerItem> history
});




}
/// @nodoc
class __$ActivityDetailStateCopyWithImpl<$Res>
    implements _$ActivityDetailStateCopyWith<$Res> {
  __$ActivityDetailStateCopyWithImpl(this._self, this._then);

  final _ActivityDetailState _self;
  final $Res Function(_ActivityDetailState) _then;

/// Create a copy of ActivityDetailState
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? today = null,Object? loaded = null,Object? activity = freezed,Object? project = freezed,Object? history = null,}) {
  return _then(_ActivityDetailState(
today: null == today ? _self.today : today // ignore: cast_nullable_to_non_nullable
as String,loaded: null == loaded ? _self.loaded : loaded // ignore: cast_nullable_to_non_nullable
as bool,activity: freezed == activity ? _self.activity : activity // ignore: cast_nullable_to_non_nullable
as Activity?,project: freezed == project ? _self.project : project // ignore: cast_nullable_to_non_nullable
as Project?,history: null == history ? _self._history : history // ignore: cast_nullable_to_non_nullable
as List<ServerItem>,
  ));
}


}

// dart format on
