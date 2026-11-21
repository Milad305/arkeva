// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'notifications_bloc.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$NotificationsState {

 NotificationsStatus get status; List<AppNotification> get items; String? get nextCursor; int get unreadCount; bool get unreadOnly;/// نمایش صفحهٔ ذخیره‌شده چون شبکه نبود
 bool get stale; Failure? get failure;
/// Create a copy of NotificationsState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$NotificationsStateCopyWith<NotificationsState> get copyWith => _$NotificationsStateCopyWithImpl<NotificationsState>(this as NotificationsState, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is NotificationsState&&(identical(other.status, status) || other.status == status)&&const DeepCollectionEquality().equals(other.items, items)&&(identical(other.nextCursor, nextCursor) || other.nextCursor == nextCursor)&&(identical(other.unreadCount, unreadCount) || other.unreadCount == unreadCount)&&(identical(other.unreadOnly, unreadOnly) || other.unreadOnly == unreadOnly)&&(identical(other.stale, stale) || other.stale == stale)&&(identical(other.failure, failure) || other.failure == failure));
}


@override
int get hashCode => Object.hash(runtimeType,status,const DeepCollectionEquality().hash(items),nextCursor,unreadCount,unreadOnly,stale,failure);

@override
String toString() {
  return 'NotificationsState(status: $status, items: $items, nextCursor: $nextCursor, unreadCount: $unreadCount, unreadOnly: $unreadOnly, stale: $stale, failure: $failure)';
}


}

/// @nodoc
abstract mixin class $NotificationsStateCopyWith<$Res>  {
  factory $NotificationsStateCopyWith(NotificationsState value, $Res Function(NotificationsState) _then) = _$NotificationsStateCopyWithImpl;
@useResult
$Res call({
 NotificationsStatus status, List<AppNotification> items, String? nextCursor, int unreadCount, bool unreadOnly, bool stale, Failure? failure
});




}
/// @nodoc
class _$NotificationsStateCopyWithImpl<$Res>
    implements $NotificationsStateCopyWith<$Res> {
  _$NotificationsStateCopyWithImpl(this._self, this._then);

  final NotificationsState _self;
  final $Res Function(NotificationsState) _then;

/// Create a copy of NotificationsState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? status = null,Object? items = null,Object? nextCursor = freezed,Object? unreadCount = null,Object? unreadOnly = null,Object? stale = null,Object? failure = freezed,}) {
  return _then(_self.copyWith(
status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as NotificationsStatus,items: null == items ? _self.items : items // ignore: cast_nullable_to_non_nullable
as List<AppNotification>,nextCursor: freezed == nextCursor ? _self.nextCursor : nextCursor // ignore: cast_nullable_to_non_nullable
as String?,unreadCount: null == unreadCount ? _self.unreadCount : unreadCount // ignore: cast_nullable_to_non_nullable
as int,unreadOnly: null == unreadOnly ? _self.unreadOnly : unreadOnly // ignore: cast_nullable_to_non_nullable
as bool,stale: null == stale ? _self.stale : stale // ignore: cast_nullable_to_non_nullable
as bool,failure: freezed == failure ? _self.failure : failure // ignore: cast_nullable_to_non_nullable
as Failure?,
  ));
}

}


/// Adds pattern-matching-related methods to [NotificationsState].
extension NotificationsStatePatterns on NotificationsState {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _NotificationsState value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _NotificationsState() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _NotificationsState value)  $default,){
final _that = this;
switch (_that) {
case _NotificationsState():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _NotificationsState value)?  $default,){
final _that = this;
switch (_that) {
case _NotificationsState() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( NotificationsStatus status,  List<AppNotification> items,  String? nextCursor,  int unreadCount,  bool unreadOnly,  bool stale,  Failure? failure)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _NotificationsState() when $default != null:
return $default(_that.status,_that.items,_that.nextCursor,_that.unreadCount,_that.unreadOnly,_that.stale,_that.failure);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( NotificationsStatus status,  List<AppNotification> items,  String? nextCursor,  int unreadCount,  bool unreadOnly,  bool stale,  Failure? failure)  $default,) {final _that = this;
switch (_that) {
case _NotificationsState():
return $default(_that.status,_that.items,_that.nextCursor,_that.unreadCount,_that.unreadOnly,_that.stale,_that.failure);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( NotificationsStatus status,  List<AppNotification> items,  String? nextCursor,  int unreadCount,  bool unreadOnly,  bool stale,  Failure? failure)?  $default,) {final _that = this;
switch (_that) {
case _NotificationsState() when $default != null:
return $default(_that.status,_that.items,_that.nextCursor,_that.unreadCount,_that.unreadOnly,_that.stale,_that.failure);case _:
  return null;

}
}

}

/// @nodoc


class _NotificationsState implements NotificationsState {
  const _NotificationsState({this.status = NotificationsStatus.loading, final  List<AppNotification> items = const <AppNotification>[], this.nextCursor, this.unreadCount = 0, this.unreadOnly = false, this.stale = false, this.failure}): _items = items;
  

@override@JsonKey() final  NotificationsStatus status;
 final  List<AppNotification> _items;
@override@JsonKey() List<AppNotification> get items {
  if (_items is EqualUnmodifiableListView) return _items;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_items);
}

@override final  String? nextCursor;
@override@JsonKey() final  int unreadCount;
@override@JsonKey() final  bool unreadOnly;
/// نمایش صفحهٔ ذخیره‌شده چون شبکه نبود
@override@JsonKey() final  bool stale;
@override final  Failure? failure;

/// Create a copy of NotificationsState
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$NotificationsStateCopyWith<_NotificationsState> get copyWith => __$NotificationsStateCopyWithImpl<_NotificationsState>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _NotificationsState&&(identical(other.status, status) || other.status == status)&&const DeepCollectionEquality().equals(other._items, _items)&&(identical(other.nextCursor, nextCursor) || other.nextCursor == nextCursor)&&(identical(other.unreadCount, unreadCount) || other.unreadCount == unreadCount)&&(identical(other.unreadOnly, unreadOnly) || other.unreadOnly == unreadOnly)&&(identical(other.stale, stale) || other.stale == stale)&&(identical(other.failure, failure) || other.failure == failure));
}


@override
int get hashCode => Object.hash(runtimeType,status,const DeepCollectionEquality().hash(_items),nextCursor,unreadCount,unreadOnly,stale,failure);

@override
String toString() {
  return 'NotificationsState(status: $status, items: $items, nextCursor: $nextCursor, unreadCount: $unreadCount, unreadOnly: $unreadOnly, stale: $stale, failure: $failure)';
}


}

/// @nodoc
abstract mixin class _$NotificationsStateCopyWith<$Res> implements $NotificationsStateCopyWith<$Res> {
  factory _$NotificationsStateCopyWith(_NotificationsState value, $Res Function(_NotificationsState) _then) = __$NotificationsStateCopyWithImpl;
@override @useResult
$Res call({
 NotificationsStatus status, List<AppNotification> items, String? nextCursor, int unreadCount, bool unreadOnly, bool stale, Failure? failure
});




}
/// @nodoc
class __$NotificationsStateCopyWithImpl<$Res>
    implements _$NotificationsStateCopyWith<$Res> {
  __$NotificationsStateCopyWithImpl(this._self, this._then);

  final _NotificationsState _self;
  final $Res Function(_NotificationsState) _then;

/// Create a copy of NotificationsState
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? status = null,Object? items = null,Object? nextCursor = freezed,Object? unreadCount = null,Object? unreadOnly = null,Object? stale = null,Object? failure = freezed,}) {
  return _then(_NotificationsState(
status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as NotificationsStatus,items: null == items ? _self._items : items // ignore: cast_nullable_to_non_nullable
as List<AppNotification>,nextCursor: freezed == nextCursor ? _self.nextCursor : nextCursor // ignore: cast_nullable_to_non_nullable
as String?,unreadCount: null == unreadCount ? _self.unreadCount : unreadCount // ignore: cast_nullable_to_non_nullable
as int,unreadOnly: null == unreadOnly ? _self.unreadOnly : unreadOnly // ignore: cast_nullable_to_non_nullable
as bool,stale: null == stale ? _self.stale : stale // ignore: cast_nullable_to_non_nullable
as bool,failure: freezed == failure ? _self.failure : failure // ignore: cast_nullable_to_non_nullable
as Failure?,
  ));
}


}

// dart format on
