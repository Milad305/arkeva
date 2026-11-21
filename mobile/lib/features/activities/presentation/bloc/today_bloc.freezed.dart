// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'today_bloc.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$TodayState {

 String get today; TodayStatus get status; List<Activity> get activities; List<Project> get projects; QueueSummary get queue; SyncInfo get sync; NetworkKind get network; bool get wifiOnly; bool get hasReportToday; int get quickPhotos; bool get refreshing; Failure? get failure;
/// Create a copy of TodayState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$TodayStateCopyWith<TodayState> get copyWith => _$TodayStateCopyWithImpl<TodayState>(this as TodayState, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is TodayState&&(identical(other.today, today) || other.today == today)&&(identical(other.status, status) || other.status == status)&&const DeepCollectionEquality().equals(other.activities, activities)&&const DeepCollectionEquality().equals(other.projects, projects)&&(identical(other.queue, queue) || other.queue == queue)&&(identical(other.sync, sync) || other.sync == sync)&&(identical(other.network, network) || other.network == network)&&(identical(other.wifiOnly, wifiOnly) || other.wifiOnly == wifiOnly)&&(identical(other.hasReportToday, hasReportToday) || other.hasReportToday == hasReportToday)&&(identical(other.quickPhotos, quickPhotos) || other.quickPhotos == quickPhotos)&&(identical(other.refreshing, refreshing) || other.refreshing == refreshing)&&(identical(other.failure, failure) || other.failure == failure));
}


@override
int get hashCode => Object.hash(runtimeType,today,status,const DeepCollectionEquality().hash(activities),const DeepCollectionEquality().hash(projects),queue,sync,network,wifiOnly,hasReportToday,quickPhotos,refreshing,failure);

@override
String toString() {
  return 'TodayState(today: $today, status: $status, activities: $activities, projects: $projects, queue: $queue, sync: $sync, network: $network, wifiOnly: $wifiOnly, hasReportToday: $hasReportToday, quickPhotos: $quickPhotos, refreshing: $refreshing, failure: $failure)';
}


}

/// @nodoc
abstract mixin class $TodayStateCopyWith<$Res>  {
  factory $TodayStateCopyWith(TodayState value, $Res Function(TodayState) _then) = _$TodayStateCopyWithImpl;
@useResult
$Res call({
 String today, TodayStatus status, List<Activity> activities, List<Project> projects, QueueSummary queue, SyncInfo sync, NetworkKind network, bool wifiOnly, bool hasReportToday, int quickPhotos, bool refreshing, Failure? failure
});




}
/// @nodoc
class _$TodayStateCopyWithImpl<$Res>
    implements $TodayStateCopyWith<$Res> {
  _$TodayStateCopyWithImpl(this._self, this._then);

  final TodayState _self;
  final $Res Function(TodayState) _then;

/// Create a copy of TodayState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? today = null,Object? status = null,Object? activities = null,Object? projects = null,Object? queue = null,Object? sync = null,Object? network = null,Object? wifiOnly = null,Object? hasReportToday = null,Object? quickPhotos = null,Object? refreshing = null,Object? failure = freezed,}) {
  return _then(_self.copyWith(
today: null == today ? _self.today : today // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as TodayStatus,activities: null == activities ? _self.activities : activities // ignore: cast_nullable_to_non_nullable
as List<Activity>,projects: null == projects ? _self.projects : projects // ignore: cast_nullable_to_non_nullable
as List<Project>,queue: null == queue ? _self.queue : queue // ignore: cast_nullable_to_non_nullable
as QueueSummary,sync: null == sync ? _self.sync : sync // ignore: cast_nullable_to_non_nullable
as SyncInfo,network: null == network ? _self.network : network // ignore: cast_nullable_to_non_nullable
as NetworkKind,wifiOnly: null == wifiOnly ? _self.wifiOnly : wifiOnly // ignore: cast_nullable_to_non_nullable
as bool,hasReportToday: null == hasReportToday ? _self.hasReportToday : hasReportToday // ignore: cast_nullable_to_non_nullable
as bool,quickPhotos: null == quickPhotos ? _self.quickPhotos : quickPhotos // ignore: cast_nullable_to_non_nullable
as int,refreshing: null == refreshing ? _self.refreshing : refreshing // ignore: cast_nullable_to_non_nullable
as bool,failure: freezed == failure ? _self.failure : failure // ignore: cast_nullable_to_non_nullable
as Failure?,
  ));
}

}


/// Adds pattern-matching-related methods to [TodayState].
extension TodayStatePatterns on TodayState {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _TodayState value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _TodayState() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _TodayState value)  $default,){
final _that = this;
switch (_that) {
case _TodayState():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _TodayState value)?  $default,){
final _that = this;
switch (_that) {
case _TodayState() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String today,  TodayStatus status,  List<Activity> activities,  List<Project> projects,  QueueSummary queue,  SyncInfo sync,  NetworkKind network,  bool wifiOnly,  bool hasReportToday,  int quickPhotos,  bool refreshing,  Failure? failure)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _TodayState() when $default != null:
return $default(_that.today,_that.status,_that.activities,_that.projects,_that.queue,_that.sync,_that.network,_that.wifiOnly,_that.hasReportToday,_that.quickPhotos,_that.refreshing,_that.failure);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String today,  TodayStatus status,  List<Activity> activities,  List<Project> projects,  QueueSummary queue,  SyncInfo sync,  NetworkKind network,  bool wifiOnly,  bool hasReportToday,  int quickPhotos,  bool refreshing,  Failure? failure)  $default,) {final _that = this;
switch (_that) {
case _TodayState():
return $default(_that.today,_that.status,_that.activities,_that.projects,_that.queue,_that.sync,_that.network,_that.wifiOnly,_that.hasReportToday,_that.quickPhotos,_that.refreshing,_that.failure);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String today,  TodayStatus status,  List<Activity> activities,  List<Project> projects,  QueueSummary queue,  SyncInfo sync,  NetworkKind network,  bool wifiOnly,  bool hasReportToday,  int quickPhotos,  bool refreshing,  Failure? failure)?  $default,) {final _that = this;
switch (_that) {
case _TodayState() when $default != null:
return $default(_that.today,_that.status,_that.activities,_that.projects,_that.queue,_that.sync,_that.network,_that.wifiOnly,_that.hasReportToday,_that.quickPhotos,_that.refreshing,_that.failure);case _:
  return null;

}
}

}

/// @nodoc


class _TodayState extends TodayState {
  const _TodayState({required this.today, this.status = TodayStatus.loading, final  List<Activity> activities = const <Activity>[], final  List<Project> projects = const <Project>[], this.queue = const QueueSummary(), this.sync = const SyncInfo(), this.network = NetworkKind.wifi, this.wifiOnly = false, this.hasReportToday = false, this.quickPhotos = 0, this.refreshing = false, this.failure}): _activities = activities,_projects = projects,super._();
  

@override final  String today;
@override@JsonKey() final  TodayStatus status;
 final  List<Activity> _activities;
@override@JsonKey() List<Activity> get activities {
  if (_activities is EqualUnmodifiableListView) return _activities;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_activities);
}

 final  List<Project> _projects;
@override@JsonKey() List<Project> get projects {
  if (_projects is EqualUnmodifiableListView) return _projects;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_projects);
}

@override@JsonKey() final  QueueSummary queue;
@override@JsonKey() final  SyncInfo sync;
@override@JsonKey() final  NetworkKind network;
@override@JsonKey() final  bool wifiOnly;
@override@JsonKey() final  bool hasReportToday;
@override@JsonKey() final  int quickPhotos;
@override@JsonKey() final  bool refreshing;
@override final  Failure? failure;

/// Create a copy of TodayState
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$TodayStateCopyWith<_TodayState> get copyWith => __$TodayStateCopyWithImpl<_TodayState>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _TodayState&&(identical(other.today, today) || other.today == today)&&(identical(other.status, status) || other.status == status)&&const DeepCollectionEquality().equals(other._activities, _activities)&&const DeepCollectionEquality().equals(other._projects, _projects)&&(identical(other.queue, queue) || other.queue == queue)&&(identical(other.sync, sync) || other.sync == sync)&&(identical(other.network, network) || other.network == network)&&(identical(other.wifiOnly, wifiOnly) || other.wifiOnly == wifiOnly)&&(identical(other.hasReportToday, hasReportToday) || other.hasReportToday == hasReportToday)&&(identical(other.quickPhotos, quickPhotos) || other.quickPhotos == quickPhotos)&&(identical(other.refreshing, refreshing) || other.refreshing == refreshing)&&(identical(other.failure, failure) || other.failure == failure));
}


@override
int get hashCode => Object.hash(runtimeType,today,status,const DeepCollectionEquality().hash(_activities),const DeepCollectionEquality().hash(_projects),queue,sync,network,wifiOnly,hasReportToday,quickPhotos,refreshing,failure);

@override
String toString() {
  return 'TodayState(today: $today, status: $status, activities: $activities, projects: $projects, queue: $queue, sync: $sync, network: $network, wifiOnly: $wifiOnly, hasReportToday: $hasReportToday, quickPhotos: $quickPhotos, refreshing: $refreshing, failure: $failure)';
}


}

/// @nodoc
abstract mixin class _$TodayStateCopyWith<$Res> implements $TodayStateCopyWith<$Res> {
  factory _$TodayStateCopyWith(_TodayState value, $Res Function(_TodayState) _then) = __$TodayStateCopyWithImpl;
@override @useResult
$Res call({
 String today, TodayStatus status, List<Activity> activities, List<Project> projects, QueueSummary queue, SyncInfo sync, NetworkKind network, bool wifiOnly, bool hasReportToday, int quickPhotos, bool refreshing, Failure? failure
});




}
/// @nodoc
class __$TodayStateCopyWithImpl<$Res>
    implements _$TodayStateCopyWith<$Res> {
  __$TodayStateCopyWithImpl(this._self, this._then);

  final _TodayState _self;
  final $Res Function(_TodayState) _then;

/// Create a copy of TodayState
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? today = null,Object? status = null,Object? activities = null,Object? projects = null,Object? queue = null,Object? sync = null,Object? network = null,Object? wifiOnly = null,Object? hasReportToday = null,Object? quickPhotos = null,Object? refreshing = null,Object? failure = freezed,}) {
  return _then(_TodayState(
today: null == today ? _self.today : today // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as TodayStatus,activities: null == activities ? _self._activities : activities // ignore: cast_nullable_to_non_nullable
as List<Activity>,projects: null == projects ? _self._projects : projects // ignore: cast_nullable_to_non_nullable
as List<Project>,queue: null == queue ? _self.queue : queue // ignore: cast_nullable_to_non_nullable
as QueueSummary,sync: null == sync ? _self.sync : sync // ignore: cast_nullable_to_non_nullable
as SyncInfo,network: null == network ? _self.network : network // ignore: cast_nullable_to_non_nullable
as NetworkKind,wifiOnly: null == wifiOnly ? _self.wifiOnly : wifiOnly // ignore: cast_nullable_to_non_nullable
as bool,hasReportToday: null == hasReportToday ? _self.hasReportToday : hasReportToday // ignore: cast_nullable_to_non_nullable
as bool,quickPhotos: null == quickPhotos ? _self.quickPhotos : quickPhotos // ignore: cast_nullable_to_non_nullable
as int,refreshing: null == refreshing ? _self.refreshing : refreshing // ignore: cast_nullable_to_non_nullable
as bool,failure: freezed == failure ? _self.failure : failure // ignore: cast_nullable_to_non_nullable
as Failure?,
  ));
}


}

// dart format on
