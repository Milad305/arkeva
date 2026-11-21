// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'reports_list_bloc.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$ReportsListState {

 bool get loaded; List<ReportDraft> get local; List<ServerItem> get server; Map<String, Activity> get activities; Set<String> get queuedResubmissions;
/// Create a copy of ReportsListState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ReportsListStateCopyWith<ReportsListState> get copyWith => _$ReportsListStateCopyWithImpl<ReportsListState>(this as ReportsListState, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ReportsListState&&(identical(other.loaded, loaded) || other.loaded == loaded)&&const DeepCollectionEquality().equals(other.local, local)&&const DeepCollectionEquality().equals(other.server, server)&&const DeepCollectionEquality().equals(other.activities, activities)&&const DeepCollectionEquality().equals(other.queuedResubmissions, queuedResubmissions));
}


@override
int get hashCode => Object.hash(runtimeType,loaded,const DeepCollectionEquality().hash(local),const DeepCollectionEquality().hash(server),const DeepCollectionEquality().hash(activities),const DeepCollectionEquality().hash(queuedResubmissions));

@override
String toString() {
  return 'ReportsListState(loaded: $loaded, local: $local, server: $server, activities: $activities, queuedResubmissions: $queuedResubmissions)';
}


}

/// @nodoc
abstract mixin class $ReportsListStateCopyWith<$Res>  {
  factory $ReportsListStateCopyWith(ReportsListState value, $Res Function(ReportsListState) _then) = _$ReportsListStateCopyWithImpl;
@useResult
$Res call({
 bool loaded, List<ReportDraft> local, List<ServerItem> server, Map<String, Activity> activities, Set<String> queuedResubmissions
});




}
/// @nodoc
class _$ReportsListStateCopyWithImpl<$Res>
    implements $ReportsListStateCopyWith<$Res> {
  _$ReportsListStateCopyWithImpl(this._self, this._then);

  final ReportsListState _self;
  final $Res Function(ReportsListState) _then;

/// Create a copy of ReportsListState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? loaded = null,Object? local = null,Object? server = null,Object? activities = null,Object? queuedResubmissions = null,}) {
  return _then(_self.copyWith(
loaded: null == loaded ? _self.loaded : loaded // ignore: cast_nullable_to_non_nullable
as bool,local: null == local ? _self.local : local // ignore: cast_nullable_to_non_nullable
as List<ReportDraft>,server: null == server ? _self.server : server // ignore: cast_nullable_to_non_nullable
as List<ServerItem>,activities: null == activities ? _self.activities : activities // ignore: cast_nullable_to_non_nullable
as Map<String, Activity>,queuedResubmissions: null == queuedResubmissions ? _self.queuedResubmissions : queuedResubmissions // ignore: cast_nullable_to_non_nullable
as Set<String>,
  ));
}

}


/// Adds pattern-matching-related methods to [ReportsListState].
extension ReportsListStatePatterns on ReportsListState {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ReportsListState value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ReportsListState() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ReportsListState value)  $default,){
final _that = this;
switch (_that) {
case _ReportsListState():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ReportsListState value)?  $default,){
final _that = this;
switch (_that) {
case _ReportsListState() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( bool loaded,  List<ReportDraft> local,  List<ServerItem> server,  Map<String, Activity> activities,  Set<String> queuedResubmissions)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ReportsListState() when $default != null:
return $default(_that.loaded,_that.local,_that.server,_that.activities,_that.queuedResubmissions);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( bool loaded,  List<ReportDraft> local,  List<ServerItem> server,  Map<String, Activity> activities,  Set<String> queuedResubmissions)  $default,) {final _that = this;
switch (_that) {
case _ReportsListState():
return $default(_that.loaded,_that.local,_that.server,_that.activities,_that.queuedResubmissions);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( bool loaded,  List<ReportDraft> local,  List<ServerItem> server,  Map<String, Activity> activities,  Set<String> queuedResubmissions)?  $default,) {final _that = this;
switch (_that) {
case _ReportsListState() when $default != null:
return $default(_that.loaded,_that.local,_that.server,_that.activities,_that.queuedResubmissions);case _:
  return null;

}
}

}

/// @nodoc


class _ReportsListState extends ReportsListState {
  const _ReportsListState({this.loaded = false, final  List<ReportDraft> local = const <ReportDraft>[], final  List<ServerItem> server = const <ServerItem>[], final  Map<String, Activity> activities = const <String, Activity>{}, final  Set<String> queuedResubmissions = const <String>{}}): _local = local,_server = server,_activities = activities,_queuedResubmissions = queuedResubmissions,super._();
  

@override@JsonKey() final  bool loaded;
 final  List<ReportDraft> _local;
@override@JsonKey() List<ReportDraft> get local {
  if (_local is EqualUnmodifiableListView) return _local;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_local);
}

 final  List<ServerItem> _server;
@override@JsonKey() List<ServerItem> get server {
  if (_server is EqualUnmodifiableListView) return _server;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_server);
}

 final  Map<String, Activity> _activities;
@override@JsonKey() Map<String, Activity> get activities {
  if (_activities is EqualUnmodifiableMapView) return _activities;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(_activities);
}

 final  Set<String> _queuedResubmissions;
@override@JsonKey() Set<String> get queuedResubmissions {
  if (_queuedResubmissions is EqualUnmodifiableSetView) return _queuedResubmissions;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableSetView(_queuedResubmissions);
}


/// Create a copy of ReportsListState
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ReportsListStateCopyWith<_ReportsListState> get copyWith => __$ReportsListStateCopyWithImpl<_ReportsListState>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ReportsListState&&(identical(other.loaded, loaded) || other.loaded == loaded)&&const DeepCollectionEquality().equals(other._local, _local)&&const DeepCollectionEquality().equals(other._server, _server)&&const DeepCollectionEquality().equals(other._activities, _activities)&&const DeepCollectionEquality().equals(other._queuedResubmissions, _queuedResubmissions));
}


@override
int get hashCode => Object.hash(runtimeType,loaded,const DeepCollectionEquality().hash(_local),const DeepCollectionEquality().hash(_server),const DeepCollectionEquality().hash(_activities),const DeepCollectionEquality().hash(_queuedResubmissions));

@override
String toString() {
  return 'ReportsListState(loaded: $loaded, local: $local, server: $server, activities: $activities, queuedResubmissions: $queuedResubmissions)';
}


}

/// @nodoc
abstract mixin class _$ReportsListStateCopyWith<$Res> implements $ReportsListStateCopyWith<$Res> {
  factory _$ReportsListStateCopyWith(_ReportsListState value, $Res Function(_ReportsListState) _then) = __$ReportsListStateCopyWithImpl;
@override @useResult
$Res call({
 bool loaded, List<ReportDraft> local, List<ServerItem> server, Map<String, Activity> activities, Set<String> queuedResubmissions
});




}
/// @nodoc
class __$ReportsListStateCopyWithImpl<$Res>
    implements _$ReportsListStateCopyWith<$Res> {
  __$ReportsListStateCopyWithImpl(this._self, this._then);

  final _ReportsListState _self;
  final $Res Function(_ReportsListState) _then;

/// Create a copy of ReportsListState
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? loaded = null,Object? local = null,Object? server = null,Object? activities = null,Object? queuedResubmissions = null,}) {
  return _then(_ReportsListState(
loaded: null == loaded ? _self.loaded : loaded // ignore: cast_nullable_to_non_nullable
as bool,local: null == local ? _self._local : local // ignore: cast_nullable_to_non_nullable
as List<ReportDraft>,server: null == server ? _self._server : server // ignore: cast_nullable_to_non_nullable
as List<ServerItem>,activities: null == activities ? _self._activities : activities // ignore: cast_nullable_to_non_nullable
as Map<String, Activity>,queuedResubmissions: null == queuedResubmissions ? _self._queuedResubmissions : queuedResubmissions // ignore: cast_nullable_to_non_nullable
as Set<String>,
  ));
}


}

// dart format on
