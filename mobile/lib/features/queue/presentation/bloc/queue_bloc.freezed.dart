// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'queue_bloc.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$QueueState {

 QueueViewStatus get status; List<QueueEntry> get entries; QueueSummary get summary; bool get wifiOnly; NetworkKind get network; Failure? get failure; int? get lastSent;
/// Create a copy of QueueState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$QueueStateCopyWith<QueueState> get copyWith => _$QueueStateCopyWithImpl<QueueState>(this as QueueState, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is QueueState&&(identical(other.status, status) || other.status == status)&&const DeepCollectionEquality().equals(other.entries, entries)&&(identical(other.summary, summary) || other.summary == summary)&&(identical(other.wifiOnly, wifiOnly) || other.wifiOnly == wifiOnly)&&(identical(other.network, network) || other.network == network)&&(identical(other.failure, failure) || other.failure == failure)&&(identical(other.lastSent, lastSent) || other.lastSent == lastSent));
}


@override
int get hashCode => Object.hash(runtimeType,status,const DeepCollectionEquality().hash(entries),summary,wifiOnly,network,failure,lastSent);

@override
String toString() {
  return 'QueueState(status: $status, entries: $entries, summary: $summary, wifiOnly: $wifiOnly, network: $network, failure: $failure, lastSent: $lastSent)';
}


}

/// @nodoc
abstract mixin class $QueueStateCopyWith<$Res>  {
  factory $QueueStateCopyWith(QueueState value, $Res Function(QueueState) _then) = _$QueueStateCopyWithImpl;
@useResult
$Res call({
 QueueViewStatus status, List<QueueEntry> entries, QueueSummary summary, bool wifiOnly, NetworkKind network, Failure? failure, int? lastSent
});




}
/// @nodoc
class _$QueueStateCopyWithImpl<$Res>
    implements $QueueStateCopyWith<$Res> {
  _$QueueStateCopyWithImpl(this._self, this._then);

  final QueueState _self;
  final $Res Function(QueueState) _then;

/// Create a copy of QueueState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? status = null,Object? entries = null,Object? summary = null,Object? wifiOnly = null,Object? network = null,Object? failure = freezed,Object? lastSent = freezed,}) {
  return _then(_self.copyWith(
status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as QueueViewStatus,entries: null == entries ? _self.entries : entries // ignore: cast_nullable_to_non_nullable
as List<QueueEntry>,summary: null == summary ? _self.summary : summary // ignore: cast_nullable_to_non_nullable
as QueueSummary,wifiOnly: null == wifiOnly ? _self.wifiOnly : wifiOnly // ignore: cast_nullable_to_non_nullable
as bool,network: null == network ? _self.network : network // ignore: cast_nullable_to_non_nullable
as NetworkKind,failure: freezed == failure ? _self.failure : failure // ignore: cast_nullable_to_non_nullable
as Failure?,lastSent: freezed == lastSent ? _self.lastSent : lastSent // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}

}


/// Adds pattern-matching-related methods to [QueueState].
extension QueueStatePatterns on QueueState {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _QueueState value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _QueueState() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _QueueState value)  $default,){
final _that = this;
switch (_that) {
case _QueueState():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _QueueState value)?  $default,){
final _that = this;
switch (_that) {
case _QueueState() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( QueueViewStatus status,  List<QueueEntry> entries,  QueueSummary summary,  bool wifiOnly,  NetworkKind network,  Failure? failure,  int? lastSent)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _QueueState() when $default != null:
return $default(_that.status,_that.entries,_that.summary,_that.wifiOnly,_that.network,_that.failure,_that.lastSent);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( QueueViewStatus status,  List<QueueEntry> entries,  QueueSummary summary,  bool wifiOnly,  NetworkKind network,  Failure? failure,  int? lastSent)  $default,) {final _that = this;
switch (_that) {
case _QueueState():
return $default(_that.status,_that.entries,_that.summary,_that.wifiOnly,_that.network,_that.failure,_that.lastSent);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( QueueViewStatus status,  List<QueueEntry> entries,  QueueSummary summary,  bool wifiOnly,  NetworkKind network,  Failure? failure,  int? lastSent)?  $default,) {final _that = this;
switch (_that) {
case _QueueState() when $default != null:
return $default(_that.status,_that.entries,_that.summary,_that.wifiOnly,_that.network,_that.failure,_that.lastSent);case _:
  return null;

}
}

}

/// @nodoc


class _QueueState implements QueueState {
  const _QueueState({this.status = QueueViewStatus.initial, final  List<QueueEntry> entries = const <QueueEntry>[], this.summary = const QueueSummary(), this.wifiOnly = false, this.network = NetworkKind.none, this.failure, this.lastSent}): _entries = entries;
  

@override@JsonKey() final  QueueViewStatus status;
 final  List<QueueEntry> _entries;
@override@JsonKey() List<QueueEntry> get entries {
  if (_entries is EqualUnmodifiableListView) return _entries;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_entries);
}

@override@JsonKey() final  QueueSummary summary;
@override@JsonKey() final  bool wifiOnly;
@override@JsonKey() final  NetworkKind network;
@override final  Failure? failure;
@override final  int? lastSent;

/// Create a copy of QueueState
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$QueueStateCopyWith<_QueueState> get copyWith => __$QueueStateCopyWithImpl<_QueueState>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _QueueState&&(identical(other.status, status) || other.status == status)&&const DeepCollectionEquality().equals(other._entries, _entries)&&(identical(other.summary, summary) || other.summary == summary)&&(identical(other.wifiOnly, wifiOnly) || other.wifiOnly == wifiOnly)&&(identical(other.network, network) || other.network == network)&&(identical(other.failure, failure) || other.failure == failure)&&(identical(other.lastSent, lastSent) || other.lastSent == lastSent));
}


@override
int get hashCode => Object.hash(runtimeType,status,const DeepCollectionEquality().hash(_entries),summary,wifiOnly,network,failure,lastSent);

@override
String toString() {
  return 'QueueState(status: $status, entries: $entries, summary: $summary, wifiOnly: $wifiOnly, network: $network, failure: $failure, lastSent: $lastSent)';
}


}

/// @nodoc
abstract mixin class _$QueueStateCopyWith<$Res> implements $QueueStateCopyWith<$Res> {
  factory _$QueueStateCopyWith(_QueueState value, $Res Function(_QueueState) _then) = __$QueueStateCopyWithImpl;
@override @useResult
$Res call({
 QueueViewStatus status, List<QueueEntry> entries, QueueSummary summary, bool wifiOnly, NetworkKind network, Failure? failure, int? lastSent
});




}
/// @nodoc
class __$QueueStateCopyWithImpl<$Res>
    implements _$QueueStateCopyWith<$Res> {
  __$QueueStateCopyWithImpl(this._self, this._then);

  final _QueueState _self;
  final $Res Function(_QueueState) _then;

/// Create a copy of QueueState
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? status = null,Object? entries = null,Object? summary = null,Object? wifiOnly = null,Object? network = null,Object? failure = freezed,Object? lastSent = freezed,}) {
  return _then(_QueueState(
status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as QueueViewStatus,entries: null == entries ? _self._entries : entries // ignore: cast_nullable_to_non_nullable
as List<QueueEntry>,summary: null == summary ? _self.summary : summary // ignore: cast_nullable_to_non_nullable
as QueueSummary,wifiOnly: null == wifiOnly ? _self.wifiOnly : wifiOnly // ignore: cast_nullable_to_non_nullable
as bool,network: null == network ? _self.network : network // ignore: cast_nullable_to_non_nullable
as NetworkKind,failure: freezed == failure ? _self.failure : failure // ignore: cast_nullable_to_non_nullable
as Failure?,lastSent: freezed == lastSent ? _self.lastSent : lastSent // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}


}

// dart format on
