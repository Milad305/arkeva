// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'activities_bloc.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$ActivitiesState {

 String get today; bool get loaded; ActivityFilter get filter; List<Project> get projects; List<Activity> get all;
/// Create a copy of ActivitiesState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ActivitiesStateCopyWith<ActivitiesState> get copyWith => _$ActivitiesStateCopyWithImpl<ActivitiesState>(this as ActivitiesState, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ActivitiesState&&(identical(other.today, today) || other.today == today)&&(identical(other.loaded, loaded) || other.loaded == loaded)&&(identical(other.filter, filter) || other.filter == filter)&&const DeepCollectionEquality().equals(other.projects, projects)&&const DeepCollectionEquality().equals(other.all, all));
}


@override
int get hashCode => Object.hash(runtimeType,today,loaded,filter,const DeepCollectionEquality().hash(projects),const DeepCollectionEquality().hash(all));

@override
String toString() {
  return 'ActivitiesState(today: $today, loaded: $loaded, filter: $filter, projects: $projects, all: $all)';
}


}

/// @nodoc
abstract mixin class $ActivitiesStateCopyWith<$Res>  {
  factory $ActivitiesStateCopyWith(ActivitiesState value, $Res Function(ActivitiesState) _then) = _$ActivitiesStateCopyWithImpl;
@useResult
$Res call({
 String today, bool loaded, ActivityFilter filter, List<Project> projects, List<Activity> all
});




}
/// @nodoc
class _$ActivitiesStateCopyWithImpl<$Res>
    implements $ActivitiesStateCopyWith<$Res> {
  _$ActivitiesStateCopyWithImpl(this._self, this._then);

  final ActivitiesState _self;
  final $Res Function(ActivitiesState) _then;

/// Create a copy of ActivitiesState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? today = null,Object? loaded = null,Object? filter = null,Object? projects = null,Object? all = null,}) {
  return _then(_self.copyWith(
today: null == today ? _self.today : today // ignore: cast_nullable_to_non_nullable
as String,loaded: null == loaded ? _self.loaded : loaded // ignore: cast_nullable_to_non_nullable
as bool,filter: null == filter ? _self.filter : filter // ignore: cast_nullable_to_non_nullable
as ActivityFilter,projects: null == projects ? _self.projects : projects // ignore: cast_nullable_to_non_nullable
as List<Project>,all: null == all ? _self.all : all // ignore: cast_nullable_to_non_nullable
as List<Activity>,
  ));
}

}


/// Adds pattern-matching-related methods to [ActivitiesState].
extension ActivitiesStatePatterns on ActivitiesState {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ActivitiesState value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ActivitiesState() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ActivitiesState value)  $default,){
final _that = this;
switch (_that) {
case _ActivitiesState():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ActivitiesState value)?  $default,){
final _that = this;
switch (_that) {
case _ActivitiesState() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String today,  bool loaded,  ActivityFilter filter,  List<Project> projects,  List<Activity> all)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ActivitiesState() when $default != null:
return $default(_that.today,_that.loaded,_that.filter,_that.projects,_that.all);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String today,  bool loaded,  ActivityFilter filter,  List<Project> projects,  List<Activity> all)  $default,) {final _that = this;
switch (_that) {
case _ActivitiesState():
return $default(_that.today,_that.loaded,_that.filter,_that.projects,_that.all);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String today,  bool loaded,  ActivityFilter filter,  List<Project> projects,  List<Activity> all)?  $default,) {final _that = this;
switch (_that) {
case _ActivitiesState() when $default != null:
return $default(_that.today,_that.loaded,_that.filter,_that.projects,_that.all);case _:
  return null;

}
}

}

/// @nodoc


class _ActivitiesState extends ActivitiesState {
  const _ActivitiesState({required this.today, this.loaded = false, this.filter = ActivityFilter.all, final  List<Project> projects = const <Project>[], final  List<Activity> all = const <Activity>[]}): _projects = projects,_all = all,super._();
  

@override final  String today;
@override@JsonKey() final  bool loaded;
@override@JsonKey() final  ActivityFilter filter;
 final  List<Project> _projects;
@override@JsonKey() List<Project> get projects {
  if (_projects is EqualUnmodifiableListView) return _projects;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_projects);
}

 final  List<Activity> _all;
@override@JsonKey() List<Activity> get all {
  if (_all is EqualUnmodifiableListView) return _all;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_all);
}


/// Create a copy of ActivitiesState
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ActivitiesStateCopyWith<_ActivitiesState> get copyWith => __$ActivitiesStateCopyWithImpl<_ActivitiesState>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ActivitiesState&&(identical(other.today, today) || other.today == today)&&(identical(other.loaded, loaded) || other.loaded == loaded)&&(identical(other.filter, filter) || other.filter == filter)&&const DeepCollectionEquality().equals(other._projects, _projects)&&const DeepCollectionEquality().equals(other._all, _all));
}


@override
int get hashCode => Object.hash(runtimeType,today,loaded,filter,const DeepCollectionEquality().hash(_projects),const DeepCollectionEquality().hash(_all));

@override
String toString() {
  return 'ActivitiesState(today: $today, loaded: $loaded, filter: $filter, projects: $projects, all: $all)';
}


}

/// @nodoc
abstract mixin class _$ActivitiesStateCopyWith<$Res> implements $ActivitiesStateCopyWith<$Res> {
  factory _$ActivitiesStateCopyWith(_ActivitiesState value, $Res Function(_ActivitiesState) _then) = __$ActivitiesStateCopyWithImpl;
@override @useResult
$Res call({
 String today, bool loaded, ActivityFilter filter, List<Project> projects, List<Activity> all
});




}
/// @nodoc
class __$ActivitiesStateCopyWithImpl<$Res>
    implements _$ActivitiesStateCopyWith<$Res> {
  __$ActivitiesStateCopyWithImpl(this._self, this._then);

  final _ActivitiesState _self;
  final $Res Function(_ActivitiesState) _then;

/// Create a copy of ActivitiesState
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? today = null,Object? loaded = null,Object? filter = null,Object? projects = null,Object? all = null,}) {
  return _then(_ActivitiesState(
today: null == today ? _self.today : today // ignore: cast_nullable_to_non_nullable
as String,loaded: null == loaded ? _self.loaded : loaded // ignore: cast_nullable_to_non_nullable
as bool,filter: null == filter ? _self.filter : filter // ignore: cast_nullable_to_non_nullable
as ActivityFilter,projects: null == projects ? _self._projects : projects // ignore: cast_nullable_to_non_nullable
as List<Project>,all: null == all ? _self._all : all // ignore: cast_nullable_to_non_nullable
as List<Activity>,
  ));
}


}

// dart format on
