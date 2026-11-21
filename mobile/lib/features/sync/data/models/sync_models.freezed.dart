// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'sync_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$SyncResponseDto {

 String get cursor; String get serverTime; String get today; List<SyncProjectDto> get projects; List<SyncActivityDto> get activities; List<SyncItemDto> get items; List<SyncIssueDto> get issues; List<SyncNotificationDto> get notifications;
/// Create a copy of SyncResponseDto
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SyncResponseDtoCopyWith<SyncResponseDto> get copyWith => _$SyncResponseDtoCopyWithImpl<SyncResponseDto>(this as SyncResponseDto, _$identity);

  /// Serializes this SyncResponseDto to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SyncResponseDto&&(identical(other.cursor, cursor) || other.cursor == cursor)&&(identical(other.serverTime, serverTime) || other.serverTime == serverTime)&&(identical(other.today, today) || other.today == today)&&const DeepCollectionEquality().equals(other.projects, projects)&&const DeepCollectionEquality().equals(other.activities, activities)&&const DeepCollectionEquality().equals(other.items, items)&&const DeepCollectionEquality().equals(other.issues, issues)&&const DeepCollectionEquality().equals(other.notifications, notifications));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,cursor,serverTime,today,const DeepCollectionEquality().hash(projects),const DeepCollectionEquality().hash(activities),const DeepCollectionEquality().hash(items),const DeepCollectionEquality().hash(issues),const DeepCollectionEquality().hash(notifications));

@override
String toString() {
  return 'SyncResponseDto(cursor: $cursor, serverTime: $serverTime, today: $today, projects: $projects, activities: $activities, items: $items, issues: $issues, notifications: $notifications)';
}


}

/// @nodoc
abstract mixin class $SyncResponseDtoCopyWith<$Res>  {
  factory $SyncResponseDtoCopyWith(SyncResponseDto value, $Res Function(SyncResponseDto) _then) = _$SyncResponseDtoCopyWithImpl;
@useResult
$Res call({
 String cursor, String serverTime, String today, List<SyncProjectDto> projects, List<SyncActivityDto> activities, List<SyncItemDto> items, List<SyncIssueDto> issues, List<SyncNotificationDto> notifications
});




}
/// @nodoc
class _$SyncResponseDtoCopyWithImpl<$Res>
    implements $SyncResponseDtoCopyWith<$Res> {
  _$SyncResponseDtoCopyWithImpl(this._self, this._then);

  final SyncResponseDto _self;
  final $Res Function(SyncResponseDto) _then;

/// Create a copy of SyncResponseDto
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? cursor = null,Object? serverTime = null,Object? today = null,Object? projects = null,Object? activities = null,Object? items = null,Object? issues = null,Object? notifications = null,}) {
  return _then(_self.copyWith(
cursor: null == cursor ? _self.cursor : cursor // ignore: cast_nullable_to_non_nullable
as String,serverTime: null == serverTime ? _self.serverTime : serverTime // ignore: cast_nullable_to_non_nullable
as String,today: null == today ? _self.today : today // ignore: cast_nullable_to_non_nullable
as String,projects: null == projects ? _self.projects : projects // ignore: cast_nullable_to_non_nullable
as List<SyncProjectDto>,activities: null == activities ? _self.activities : activities // ignore: cast_nullable_to_non_nullable
as List<SyncActivityDto>,items: null == items ? _self.items : items // ignore: cast_nullable_to_non_nullable
as List<SyncItemDto>,issues: null == issues ? _self.issues : issues // ignore: cast_nullable_to_non_nullable
as List<SyncIssueDto>,notifications: null == notifications ? _self.notifications : notifications // ignore: cast_nullable_to_non_nullable
as List<SyncNotificationDto>,
  ));
}

}


/// Adds pattern-matching-related methods to [SyncResponseDto].
extension SyncResponseDtoPatterns on SyncResponseDto {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SyncResponseDto value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SyncResponseDto() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SyncResponseDto value)  $default,){
final _that = this;
switch (_that) {
case _SyncResponseDto():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SyncResponseDto value)?  $default,){
final _that = this;
switch (_that) {
case _SyncResponseDto() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String cursor,  String serverTime,  String today,  List<SyncProjectDto> projects,  List<SyncActivityDto> activities,  List<SyncItemDto> items,  List<SyncIssueDto> issues,  List<SyncNotificationDto> notifications)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SyncResponseDto() when $default != null:
return $default(_that.cursor,_that.serverTime,_that.today,_that.projects,_that.activities,_that.items,_that.issues,_that.notifications);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String cursor,  String serverTime,  String today,  List<SyncProjectDto> projects,  List<SyncActivityDto> activities,  List<SyncItemDto> items,  List<SyncIssueDto> issues,  List<SyncNotificationDto> notifications)  $default,) {final _that = this;
switch (_that) {
case _SyncResponseDto():
return $default(_that.cursor,_that.serverTime,_that.today,_that.projects,_that.activities,_that.items,_that.issues,_that.notifications);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String cursor,  String serverTime,  String today,  List<SyncProjectDto> projects,  List<SyncActivityDto> activities,  List<SyncItemDto> items,  List<SyncIssueDto> issues,  List<SyncNotificationDto> notifications)?  $default,) {final _that = this;
switch (_that) {
case _SyncResponseDto() when $default != null:
return $default(_that.cursor,_that.serverTime,_that.today,_that.projects,_that.activities,_that.items,_that.issues,_that.notifications);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SyncResponseDto implements SyncResponseDto {
  const _SyncResponseDto({required this.cursor, required this.serverTime, required this.today, final  List<SyncProjectDto> projects = const [], final  List<SyncActivityDto> activities = const [], final  List<SyncItemDto> items = const [], final  List<SyncIssueDto> issues = const [], final  List<SyncNotificationDto> notifications = const []}): _projects = projects,_activities = activities,_items = items,_issues = issues,_notifications = notifications;
  factory _SyncResponseDto.fromJson(Map<String, dynamic> json) => _$SyncResponseDtoFromJson(json);

@override final  String cursor;
@override final  String serverTime;
@override final  String today;
 final  List<SyncProjectDto> _projects;
@override@JsonKey() List<SyncProjectDto> get projects {
  if (_projects is EqualUnmodifiableListView) return _projects;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_projects);
}

 final  List<SyncActivityDto> _activities;
@override@JsonKey() List<SyncActivityDto> get activities {
  if (_activities is EqualUnmodifiableListView) return _activities;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_activities);
}

 final  List<SyncItemDto> _items;
@override@JsonKey() List<SyncItemDto> get items {
  if (_items is EqualUnmodifiableListView) return _items;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_items);
}

 final  List<SyncIssueDto> _issues;
@override@JsonKey() List<SyncIssueDto> get issues {
  if (_issues is EqualUnmodifiableListView) return _issues;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_issues);
}

 final  List<SyncNotificationDto> _notifications;
@override@JsonKey() List<SyncNotificationDto> get notifications {
  if (_notifications is EqualUnmodifiableListView) return _notifications;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_notifications);
}


/// Create a copy of SyncResponseDto
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SyncResponseDtoCopyWith<_SyncResponseDto> get copyWith => __$SyncResponseDtoCopyWithImpl<_SyncResponseDto>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SyncResponseDtoToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SyncResponseDto&&(identical(other.cursor, cursor) || other.cursor == cursor)&&(identical(other.serverTime, serverTime) || other.serverTime == serverTime)&&(identical(other.today, today) || other.today == today)&&const DeepCollectionEquality().equals(other._projects, _projects)&&const DeepCollectionEquality().equals(other._activities, _activities)&&const DeepCollectionEquality().equals(other._items, _items)&&const DeepCollectionEquality().equals(other._issues, _issues)&&const DeepCollectionEquality().equals(other._notifications, _notifications));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,cursor,serverTime,today,const DeepCollectionEquality().hash(_projects),const DeepCollectionEquality().hash(_activities),const DeepCollectionEquality().hash(_items),const DeepCollectionEquality().hash(_issues),const DeepCollectionEquality().hash(_notifications));

@override
String toString() {
  return 'SyncResponseDto(cursor: $cursor, serverTime: $serverTime, today: $today, projects: $projects, activities: $activities, items: $items, issues: $issues, notifications: $notifications)';
}


}

/// @nodoc
abstract mixin class _$SyncResponseDtoCopyWith<$Res> implements $SyncResponseDtoCopyWith<$Res> {
  factory _$SyncResponseDtoCopyWith(_SyncResponseDto value, $Res Function(_SyncResponseDto) _then) = __$SyncResponseDtoCopyWithImpl;
@override @useResult
$Res call({
 String cursor, String serverTime, String today, List<SyncProjectDto> projects, List<SyncActivityDto> activities, List<SyncItemDto> items, List<SyncIssueDto> issues, List<SyncNotificationDto> notifications
});




}
/// @nodoc
class __$SyncResponseDtoCopyWithImpl<$Res>
    implements _$SyncResponseDtoCopyWith<$Res> {
  __$SyncResponseDtoCopyWithImpl(this._self, this._then);

  final _SyncResponseDto _self;
  final $Res Function(_SyncResponseDto) _then;

/// Create a copy of SyncResponseDto
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? cursor = null,Object? serverTime = null,Object? today = null,Object? projects = null,Object? activities = null,Object? items = null,Object? issues = null,Object? notifications = null,}) {
  return _then(_SyncResponseDto(
cursor: null == cursor ? _self.cursor : cursor // ignore: cast_nullable_to_non_nullable
as String,serverTime: null == serverTime ? _self.serverTime : serverTime // ignore: cast_nullable_to_non_nullable
as String,today: null == today ? _self.today : today // ignore: cast_nullable_to_non_nullable
as String,projects: null == projects ? _self._projects : projects // ignore: cast_nullable_to_non_nullable
as List<SyncProjectDto>,activities: null == activities ? _self._activities : activities // ignore: cast_nullable_to_non_nullable
as List<SyncActivityDto>,items: null == items ? _self._items : items // ignore: cast_nullable_to_non_nullable
as List<SyncItemDto>,issues: null == issues ? _self._issues : issues // ignore: cast_nullable_to_non_nullable
as List<SyncIssueDto>,notifications: null == notifications ? _self._notifications : notifications // ignore: cast_nullable_to_non_nullable
as List<SyncNotificationDto>,
  ));
}


}


/// @nodoc
mixin _$SyncSiteDto {

@JsonKey(fromJson: readNumOr0) double get lat;@JsonKey(fromJson: readNumOr0) double get lng;@JsonKey(fromJson: readNum) double? get radiusM;
/// Create a copy of SyncSiteDto
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SyncSiteDtoCopyWith<SyncSiteDto> get copyWith => _$SyncSiteDtoCopyWithImpl<SyncSiteDto>(this as SyncSiteDto, _$identity);

  /// Serializes this SyncSiteDto to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SyncSiteDto&&(identical(other.lat, lat) || other.lat == lat)&&(identical(other.lng, lng) || other.lng == lng)&&(identical(other.radiusM, radiusM) || other.radiusM == radiusM));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,lat,lng,radiusM);

@override
String toString() {
  return 'SyncSiteDto(lat: $lat, lng: $lng, radiusM: $radiusM)';
}


}

/// @nodoc
abstract mixin class $SyncSiteDtoCopyWith<$Res>  {
  factory $SyncSiteDtoCopyWith(SyncSiteDto value, $Res Function(SyncSiteDto) _then) = _$SyncSiteDtoCopyWithImpl;
@useResult
$Res call({
@JsonKey(fromJson: readNumOr0) double lat,@JsonKey(fromJson: readNumOr0) double lng,@JsonKey(fromJson: readNum) double? radiusM
});




}
/// @nodoc
class _$SyncSiteDtoCopyWithImpl<$Res>
    implements $SyncSiteDtoCopyWith<$Res> {
  _$SyncSiteDtoCopyWithImpl(this._self, this._then);

  final SyncSiteDto _self;
  final $Res Function(SyncSiteDto) _then;

/// Create a copy of SyncSiteDto
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? lat = null,Object? lng = null,Object? radiusM = freezed,}) {
  return _then(_self.copyWith(
lat: null == lat ? _self.lat : lat // ignore: cast_nullable_to_non_nullable
as double,lng: null == lng ? _self.lng : lng // ignore: cast_nullable_to_non_nullable
as double,radiusM: freezed == radiusM ? _self.radiusM : radiusM // ignore: cast_nullable_to_non_nullable
as double?,
  ));
}

}


/// Adds pattern-matching-related methods to [SyncSiteDto].
extension SyncSiteDtoPatterns on SyncSiteDto {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SyncSiteDto value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SyncSiteDto() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SyncSiteDto value)  $default,){
final _that = this;
switch (_that) {
case _SyncSiteDto():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SyncSiteDto value)?  $default,){
final _that = this;
switch (_that) {
case _SyncSiteDto() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(fromJson: readNumOr0)  double lat, @JsonKey(fromJson: readNumOr0)  double lng, @JsonKey(fromJson: readNum)  double? radiusM)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SyncSiteDto() when $default != null:
return $default(_that.lat,_that.lng,_that.radiusM);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(fromJson: readNumOr0)  double lat, @JsonKey(fromJson: readNumOr0)  double lng, @JsonKey(fromJson: readNum)  double? radiusM)  $default,) {final _that = this;
switch (_that) {
case _SyncSiteDto():
return $default(_that.lat,_that.lng,_that.radiusM);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(fromJson: readNumOr0)  double lat, @JsonKey(fromJson: readNumOr0)  double lng, @JsonKey(fromJson: readNum)  double? radiusM)?  $default,) {final _that = this;
switch (_that) {
case _SyncSiteDto() when $default != null:
return $default(_that.lat,_that.lng,_that.radiusM);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SyncSiteDto implements SyncSiteDto {
  const _SyncSiteDto({@JsonKey(fromJson: readNumOr0) required this.lat, @JsonKey(fromJson: readNumOr0) required this.lng, @JsonKey(fromJson: readNum) this.radiusM});
  factory _SyncSiteDto.fromJson(Map<String, dynamic> json) => _$SyncSiteDtoFromJson(json);

@override@JsonKey(fromJson: readNumOr0) final  double lat;
@override@JsonKey(fromJson: readNumOr0) final  double lng;
@override@JsonKey(fromJson: readNum) final  double? radiusM;

/// Create a copy of SyncSiteDto
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SyncSiteDtoCopyWith<_SyncSiteDto> get copyWith => __$SyncSiteDtoCopyWithImpl<_SyncSiteDto>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SyncSiteDtoToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SyncSiteDto&&(identical(other.lat, lat) || other.lat == lat)&&(identical(other.lng, lng) || other.lng == lng)&&(identical(other.radiusM, radiusM) || other.radiusM == radiusM));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,lat,lng,radiusM);

@override
String toString() {
  return 'SyncSiteDto(lat: $lat, lng: $lng, radiusM: $radiusM)';
}


}

/// @nodoc
abstract mixin class _$SyncSiteDtoCopyWith<$Res> implements $SyncSiteDtoCopyWith<$Res> {
  factory _$SyncSiteDtoCopyWith(_SyncSiteDto value, $Res Function(_SyncSiteDto) _then) = __$SyncSiteDtoCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(fromJson: readNumOr0) double lat,@JsonKey(fromJson: readNumOr0) double lng,@JsonKey(fromJson: readNum) double? radiusM
});




}
/// @nodoc
class __$SyncSiteDtoCopyWithImpl<$Res>
    implements _$SyncSiteDtoCopyWith<$Res> {
  __$SyncSiteDtoCopyWithImpl(this._self, this._then);

  final _SyncSiteDto _self;
  final $Res Function(_SyncSiteDto) _then;

/// Create a copy of SyncSiteDto
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? lat = null,Object? lng = null,Object? radiusM = freezed,}) {
  return _then(_SyncSiteDto(
lat: null == lat ? _self.lat : lat // ignore: cast_nullable_to_non_nullable
as double,lng: null == lng ? _self.lng : lng // ignore: cast_nullable_to_non_nullable
as double,radiusM: freezed == radiusM ? _self.radiusM : radiusM // ignore: cast_nullable_to_non_nullable
as double?,
  ));
}


}


/// @nodoc
mixin _$SyncRulesDto {

@JsonKey(fromJson: readInt) int? get minPhotos;@JsonKey(fromJson: readNum) double? get maxJumpPct; bool get allowDecrease;@JsonKey(fromJson: readInt) int? get lateAfterHours; String? get gpsMode; String? get approvalMode; SyncDailyReminderDto? get dailyReminder;
/// Create a copy of SyncRulesDto
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SyncRulesDtoCopyWith<SyncRulesDto> get copyWith => _$SyncRulesDtoCopyWithImpl<SyncRulesDto>(this as SyncRulesDto, _$identity);

  /// Serializes this SyncRulesDto to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SyncRulesDto&&(identical(other.minPhotos, minPhotos) || other.minPhotos == minPhotos)&&(identical(other.maxJumpPct, maxJumpPct) || other.maxJumpPct == maxJumpPct)&&(identical(other.allowDecrease, allowDecrease) || other.allowDecrease == allowDecrease)&&(identical(other.lateAfterHours, lateAfterHours) || other.lateAfterHours == lateAfterHours)&&(identical(other.gpsMode, gpsMode) || other.gpsMode == gpsMode)&&(identical(other.approvalMode, approvalMode) || other.approvalMode == approvalMode)&&(identical(other.dailyReminder, dailyReminder) || other.dailyReminder == dailyReminder));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,minPhotos,maxJumpPct,allowDecrease,lateAfterHours,gpsMode,approvalMode,dailyReminder);

@override
String toString() {
  return 'SyncRulesDto(minPhotos: $minPhotos, maxJumpPct: $maxJumpPct, allowDecrease: $allowDecrease, lateAfterHours: $lateAfterHours, gpsMode: $gpsMode, approvalMode: $approvalMode, dailyReminder: $dailyReminder)';
}


}

/// @nodoc
abstract mixin class $SyncRulesDtoCopyWith<$Res>  {
  factory $SyncRulesDtoCopyWith(SyncRulesDto value, $Res Function(SyncRulesDto) _then) = _$SyncRulesDtoCopyWithImpl;
@useResult
$Res call({
@JsonKey(fromJson: readInt) int? minPhotos,@JsonKey(fromJson: readNum) double? maxJumpPct, bool allowDecrease,@JsonKey(fromJson: readInt) int? lateAfterHours, String? gpsMode, String? approvalMode, SyncDailyReminderDto? dailyReminder
});


$SyncDailyReminderDtoCopyWith<$Res>? get dailyReminder;

}
/// @nodoc
class _$SyncRulesDtoCopyWithImpl<$Res>
    implements $SyncRulesDtoCopyWith<$Res> {
  _$SyncRulesDtoCopyWithImpl(this._self, this._then);

  final SyncRulesDto _self;
  final $Res Function(SyncRulesDto) _then;

/// Create a copy of SyncRulesDto
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? minPhotos = freezed,Object? maxJumpPct = freezed,Object? allowDecrease = null,Object? lateAfterHours = freezed,Object? gpsMode = freezed,Object? approvalMode = freezed,Object? dailyReminder = freezed,}) {
  return _then(_self.copyWith(
minPhotos: freezed == minPhotos ? _self.minPhotos : minPhotos // ignore: cast_nullable_to_non_nullable
as int?,maxJumpPct: freezed == maxJumpPct ? _self.maxJumpPct : maxJumpPct // ignore: cast_nullable_to_non_nullable
as double?,allowDecrease: null == allowDecrease ? _self.allowDecrease : allowDecrease // ignore: cast_nullable_to_non_nullable
as bool,lateAfterHours: freezed == lateAfterHours ? _self.lateAfterHours : lateAfterHours // ignore: cast_nullable_to_non_nullable
as int?,gpsMode: freezed == gpsMode ? _self.gpsMode : gpsMode // ignore: cast_nullable_to_non_nullable
as String?,approvalMode: freezed == approvalMode ? _self.approvalMode : approvalMode // ignore: cast_nullable_to_non_nullable
as String?,dailyReminder: freezed == dailyReminder ? _self.dailyReminder : dailyReminder // ignore: cast_nullable_to_non_nullable
as SyncDailyReminderDto?,
  ));
}
/// Create a copy of SyncRulesDto
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SyncDailyReminderDtoCopyWith<$Res>? get dailyReminder {
    if (_self.dailyReminder == null) {
    return null;
  }

  return $SyncDailyReminderDtoCopyWith<$Res>(_self.dailyReminder!, (value) {
    return _then(_self.copyWith(dailyReminder: value));
  });
}
}


/// Adds pattern-matching-related methods to [SyncRulesDto].
extension SyncRulesDtoPatterns on SyncRulesDto {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SyncRulesDto value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SyncRulesDto() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SyncRulesDto value)  $default,){
final _that = this;
switch (_that) {
case _SyncRulesDto():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SyncRulesDto value)?  $default,){
final _that = this;
switch (_that) {
case _SyncRulesDto() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(fromJson: readInt)  int? minPhotos, @JsonKey(fromJson: readNum)  double? maxJumpPct,  bool allowDecrease, @JsonKey(fromJson: readInt)  int? lateAfterHours,  String? gpsMode,  String? approvalMode,  SyncDailyReminderDto? dailyReminder)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SyncRulesDto() when $default != null:
return $default(_that.minPhotos,_that.maxJumpPct,_that.allowDecrease,_that.lateAfterHours,_that.gpsMode,_that.approvalMode,_that.dailyReminder);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(fromJson: readInt)  int? minPhotos, @JsonKey(fromJson: readNum)  double? maxJumpPct,  bool allowDecrease, @JsonKey(fromJson: readInt)  int? lateAfterHours,  String? gpsMode,  String? approvalMode,  SyncDailyReminderDto? dailyReminder)  $default,) {final _that = this;
switch (_that) {
case _SyncRulesDto():
return $default(_that.minPhotos,_that.maxJumpPct,_that.allowDecrease,_that.lateAfterHours,_that.gpsMode,_that.approvalMode,_that.dailyReminder);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(fromJson: readInt)  int? minPhotos, @JsonKey(fromJson: readNum)  double? maxJumpPct,  bool allowDecrease, @JsonKey(fromJson: readInt)  int? lateAfterHours,  String? gpsMode,  String? approvalMode,  SyncDailyReminderDto? dailyReminder)?  $default,) {final _that = this;
switch (_that) {
case _SyncRulesDto() when $default != null:
return $default(_that.minPhotos,_that.maxJumpPct,_that.allowDecrease,_that.lateAfterHours,_that.gpsMode,_that.approvalMode,_that.dailyReminder);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SyncRulesDto implements SyncRulesDto {
  const _SyncRulesDto({@JsonKey(fromJson: readInt) this.minPhotos, @JsonKey(fromJson: readNum) this.maxJumpPct, this.allowDecrease = false, @JsonKey(fromJson: readInt) this.lateAfterHours, this.gpsMode, this.approvalMode, this.dailyReminder});
  factory _SyncRulesDto.fromJson(Map<String, dynamic> json) => _$SyncRulesDtoFromJson(json);

@override@JsonKey(fromJson: readInt) final  int? minPhotos;
@override@JsonKey(fromJson: readNum) final  double? maxJumpPct;
@override@JsonKey() final  bool allowDecrease;
@override@JsonKey(fromJson: readInt) final  int? lateAfterHours;
@override final  String? gpsMode;
@override final  String? approvalMode;
@override final  SyncDailyReminderDto? dailyReminder;

/// Create a copy of SyncRulesDto
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SyncRulesDtoCopyWith<_SyncRulesDto> get copyWith => __$SyncRulesDtoCopyWithImpl<_SyncRulesDto>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SyncRulesDtoToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SyncRulesDto&&(identical(other.minPhotos, minPhotos) || other.minPhotos == minPhotos)&&(identical(other.maxJumpPct, maxJumpPct) || other.maxJumpPct == maxJumpPct)&&(identical(other.allowDecrease, allowDecrease) || other.allowDecrease == allowDecrease)&&(identical(other.lateAfterHours, lateAfterHours) || other.lateAfterHours == lateAfterHours)&&(identical(other.gpsMode, gpsMode) || other.gpsMode == gpsMode)&&(identical(other.approvalMode, approvalMode) || other.approvalMode == approvalMode)&&(identical(other.dailyReminder, dailyReminder) || other.dailyReminder == dailyReminder));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,minPhotos,maxJumpPct,allowDecrease,lateAfterHours,gpsMode,approvalMode,dailyReminder);

@override
String toString() {
  return 'SyncRulesDto(minPhotos: $minPhotos, maxJumpPct: $maxJumpPct, allowDecrease: $allowDecrease, lateAfterHours: $lateAfterHours, gpsMode: $gpsMode, approvalMode: $approvalMode, dailyReminder: $dailyReminder)';
}


}

/// @nodoc
abstract mixin class _$SyncRulesDtoCopyWith<$Res> implements $SyncRulesDtoCopyWith<$Res> {
  factory _$SyncRulesDtoCopyWith(_SyncRulesDto value, $Res Function(_SyncRulesDto) _then) = __$SyncRulesDtoCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(fromJson: readInt) int? minPhotos,@JsonKey(fromJson: readNum) double? maxJumpPct, bool allowDecrease,@JsonKey(fromJson: readInt) int? lateAfterHours, String? gpsMode, String? approvalMode, SyncDailyReminderDto? dailyReminder
});


@override $SyncDailyReminderDtoCopyWith<$Res>? get dailyReminder;

}
/// @nodoc
class __$SyncRulesDtoCopyWithImpl<$Res>
    implements _$SyncRulesDtoCopyWith<$Res> {
  __$SyncRulesDtoCopyWithImpl(this._self, this._then);

  final _SyncRulesDto _self;
  final $Res Function(_SyncRulesDto) _then;

/// Create a copy of SyncRulesDto
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? minPhotos = freezed,Object? maxJumpPct = freezed,Object? allowDecrease = null,Object? lateAfterHours = freezed,Object? gpsMode = freezed,Object? approvalMode = freezed,Object? dailyReminder = freezed,}) {
  return _then(_SyncRulesDto(
minPhotos: freezed == minPhotos ? _self.minPhotos : minPhotos // ignore: cast_nullable_to_non_nullable
as int?,maxJumpPct: freezed == maxJumpPct ? _self.maxJumpPct : maxJumpPct // ignore: cast_nullable_to_non_nullable
as double?,allowDecrease: null == allowDecrease ? _self.allowDecrease : allowDecrease // ignore: cast_nullable_to_non_nullable
as bool,lateAfterHours: freezed == lateAfterHours ? _self.lateAfterHours : lateAfterHours // ignore: cast_nullable_to_non_nullable
as int?,gpsMode: freezed == gpsMode ? _self.gpsMode : gpsMode // ignore: cast_nullable_to_non_nullable
as String?,approvalMode: freezed == approvalMode ? _self.approvalMode : approvalMode // ignore: cast_nullable_to_non_nullable
as String?,dailyReminder: freezed == dailyReminder ? _self.dailyReminder : dailyReminder // ignore: cast_nullable_to_non_nullable
as SyncDailyReminderDto?,
  ));
}

/// Create a copy of SyncRulesDto
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SyncDailyReminderDtoCopyWith<$Res>? get dailyReminder {
    if (_self.dailyReminder == null) {
    return null;
  }

  return $SyncDailyReminderDtoCopyWith<$Res>(_self.dailyReminder!, (value) {
    return _then(_self.copyWith(dailyReminder: value));
  });
}
}


/// @nodoc
mixin _$SyncProjectDto {

 String get id; String get name; SyncSiteDto? get site; SyncRulesDto get rules; Map<String, Object?> get calendar;
/// Create a copy of SyncProjectDto
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SyncProjectDtoCopyWith<SyncProjectDto> get copyWith => _$SyncProjectDtoCopyWithImpl<SyncProjectDto>(this as SyncProjectDto, _$identity);

  /// Serializes this SyncProjectDto to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SyncProjectDto&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.site, site) || other.site == site)&&(identical(other.rules, rules) || other.rules == rules)&&const DeepCollectionEquality().equals(other.calendar, calendar));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,site,rules,const DeepCollectionEquality().hash(calendar));

@override
String toString() {
  return 'SyncProjectDto(id: $id, name: $name, site: $site, rules: $rules, calendar: $calendar)';
}


}

/// @nodoc
abstract mixin class $SyncProjectDtoCopyWith<$Res>  {
  factory $SyncProjectDtoCopyWith(SyncProjectDto value, $Res Function(SyncProjectDto) _then) = _$SyncProjectDtoCopyWithImpl;
@useResult
$Res call({
 String id, String name, SyncSiteDto? site, SyncRulesDto rules, Map<String, Object?> calendar
});


$SyncSiteDtoCopyWith<$Res>? get site;$SyncRulesDtoCopyWith<$Res> get rules;

}
/// @nodoc
class _$SyncProjectDtoCopyWithImpl<$Res>
    implements $SyncProjectDtoCopyWith<$Res> {
  _$SyncProjectDtoCopyWithImpl(this._self, this._then);

  final SyncProjectDto _self;
  final $Res Function(SyncProjectDto) _then;

/// Create a copy of SyncProjectDto
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? site = freezed,Object? rules = null,Object? calendar = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,site: freezed == site ? _self.site : site // ignore: cast_nullable_to_non_nullable
as SyncSiteDto?,rules: null == rules ? _self.rules : rules // ignore: cast_nullable_to_non_nullable
as SyncRulesDto,calendar: null == calendar ? _self.calendar : calendar // ignore: cast_nullable_to_non_nullable
as Map<String, Object?>,
  ));
}
/// Create a copy of SyncProjectDto
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SyncSiteDtoCopyWith<$Res>? get site {
    if (_self.site == null) {
    return null;
  }

  return $SyncSiteDtoCopyWith<$Res>(_self.site!, (value) {
    return _then(_self.copyWith(site: value));
  });
}/// Create a copy of SyncProjectDto
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SyncRulesDtoCopyWith<$Res> get rules {
  
  return $SyncRulesDtoCopyWith<$Res>(_self.rules, (value) {
    return _then(_self.copyWith(rules: value));
  });
}
}


/// Adds pattern-matching-related methods to [SyncProjectDto].
extension SyncProjectDtoPatterns on SyncProjectDto {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SyncProjectDto value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SyncProjectDto() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SyncProjectDto value)  $default,){
final _that = this;
switch (_that) {
case _SyncProjectDto():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SyncProjectDto value)?  $default,){
final _that = this;
switch (_that) {
case _SyncProjectDto() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  SyncSiteDto? site,  SyncRulesDto rules,  Map<String, Object?> calendar)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SyncProjectDto() when $default != null:
return $default(_that.id,_that.name,_that.site,_that.rules,_that.calendar);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  SyncSiteDto? site,  SyncRulesDto rules,  Map<String, Object?> calendar)  $default,) {final _that = this;
switch (_that) {
case _SyncProjectDto():
return $default(_that.id,_that.name,_that.site,_that.rules,_that.calendar);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  SyncSiteDto? site,  SyncRulesDto rules,  Map<String, Object?> calendar)?  $default,) {final _that = this;
switch (_that) {
case _SyncProjectDto() when $default != null:
return $default(_that.id,_that.name,_that.site,_that.rules,_that.calendar);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SyncProjectDto implements SyncProjectDto {
  const _SyncProjectDto({required this.id, required this.name, this.site, this.rules = const SyncRulesDto(), final  Map<String, Object?> calendar = const <String, Object?>{}}): _calendar = calendar;
  factory _SyncProjectDto.fromJson(Map<String, dynamic> json) => _$SyncProjectDtoFromJson(json);

@override final  String id;
@override final  String name;
@override final  SyncSiteDto? site;
@override@JsonKey() final  SyncRulesDto rules;
 final  Map<String, Object?> _calendar;
@override@JsonKey() Map<String, Object?> get calendar {
  if (_calendar is EqualUnmodifiableMapView) return _calendar;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(_calendar);
}


/// Create a copy of SyncProjectDto
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SyncProjectDtoCopyWith<_SyncProjectDto> get copyWith => __$SyncProjectDtoCopyWithImpl<_SyncProjectDto>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SyncProjectDtoToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SyncProjectDto&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.site, site) || other.site == site)&&(identical(other.rules, rules) || other.rules == rules)&&const DeepCollectionEquality().equals(other._calendar, _calendar));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,site,rules,const DeepCollectionEquality().hash(_calendar));

@override
String toString() {
  return 'SyncProjectDto(id: $id, name: $name, site: $site, rules: $rules, calendar: $calendar)';
}


}

/// @nodoc
abstract mixin class _$SyncProjectDtoCopyWith<$Res> implements $SyncProjectDtoCopyWith<$Res> {
  factory _$SyncProjectDtoCopyWith(_SyncProjectDto value, $Res Function(_SyncProjectDto) _then) = __$SyncProjectDtoCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, SyncSiteDto? site, SyncRulesDto rules, Map<String, Object?> calendar
});


@override $SyncSiteDtoCopyWith<$Res>? get site;@override $SyncRulesDtoCopyWith<$Res> get rules;

}
/// @nodoc
class __$SyncProjectDtoCopyWithImpl<$Res>
    implements _$SyncProjectDtoCopyWith<$Res> {
  __$SyncProjectDtoCopyWithImpl(this._self, this._then);

  final _SyncProjectDto _self;
  final $Res Function(_SyncProjectDto) _then;

/// Create a copy of SyncProjectDto
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? site = freezed,Object? rules = null,Object? calendar = null,}) {
  return _then(_SyncProjectDto(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,site: freezed == site ? _self.site : site // ignore: cast_nullable_to_non_nullable
as SyncSiteDto?,rules: null == rules ? _self.rules : rules // ignore: cast_nullable_to_non_nullable
as SyncRulesDto,calendar: null == calendar ? _self._calendar : calendar // ignore: cast_nullable_to_non_nullable
as Map<String, Object?>,
  ));
}

/// Create a copy of SyncProjectDto
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SyncSiteDtoCopyWith<$Res>? get site {
    if (_self.site == null) {
    return null;
  }

  return $SyncSiteDtoCopyWith<$Res>(_self.site!, (value) {
    return _then(_self.copyWith(site: value));
  });
}/// Create a copy of SyncProjectDto
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SyncRulesDtoCopyWith<$Res> get rules {
  
  return $SyncRulesDtoCopyWith<$Res>(_self.rules, (value) {
    return _then(_self.copyWith(rules: value));
  });
}
}


/// @nodoc
mixin _$SyncStepDto {

 String get key; String get title;@JsonKey(fromJson: readNumOr0) double get weight;@JsonKey(fromJson: readNumOr0) double get approvedPercent;
/// Create a copy of SyncStepDto
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SyncStepDtoCopyWith<SyncStepDto> get copyWith => _$SyncStepDtoCopyWithImpl<SyncStepDto>(this as SyncStepDto, _$identity);

  /// Serializes this SyncStepDto to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SyncStepDto&&(identical(other.key, key) || other.key == key)&&(identical(other.title, title) || other.title == title)&&(identical(other.weight, weight) || other.weight == weight)&&(identical(other.approvedPercent, approvedPercent) || other.approvedPercent == approvedPercent));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,key,title,weight,approvedPercent);

@override
String toString() {
  return 'SyncStepDto(key: $key, title: $title, weight: $weight, approvedPercent: $approvedPercent)';
}


}

/// @nodoc
abstract mixin class $SyncStepDtoCopyWith<$Res>  {
  factory $SyncStepDtoCopyWith(SyncStepDto value, $Res Function(SyncStepDto) _then) = _$SyncStepDtoCopyWithImpl;
@useResult
$Res call({
 String key, String title,@JsonKey(fromJson: readNumOr0) double weight,@JsonKey(fromJson: readNumOr0) double approvedPercent
});




}
/// @nodoc
class _$SyncStepDtoCopyWithImpl<$Res>
    implements $SyncStepDtoCopyWith<$Res> {
  _$SyncStepDtoCopyWithImpl(this._self, this._then);

  final SyncStepDto _self;
  final $Res Function(SyncStepDto) _then;

/// Create a copy of SyncStepDto
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? key = null,Object? title = null,Object? weight = null,Object? approvedPercent = null,}) {
  return _then(_self.copyWith(
key: null == key ? _self.key : key // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,weight: null == weight ? _self.weight : weight // ignore: cast_nullable_to_non_nullable
as double,approvedPercent: null == approvedPercent ? _self.approvedPercent : approvedPercent // ignore: cast_nullable_to_non_nullable
as double,
  ));
}

}


/// Adds pattern-matching-related methods to [SyncStepDto].
extension SyncStepDtoPatterns on SyncStepDto {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SyncStepDto value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SyncStepDto() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SyncStepDto value)  $default,){
final _that = this;
switch (_that) {
case _SyncStepDto():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SyncStepDto value)?  $default,){
final _that = this;
switch (_that) {
case _SyncStepDto() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String key,  String title, @JsonKey(fromJson: readNumOr0)  double weight, @JsonKey(fromJson: readNumOr0)  double approvedPercent)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SyncStepDto() when $default != null:
return $default(_that.key,_that.title,_that.weight,_that.approvedPercent);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String key,  String title, @JsonKey(fromJson: readNumOr0)  double weight, @JsonKey(fromJson: readNumOr0)  double approvedPercent)  $default,) {final _that = this;
switch (_that) {
case _SyncStepDto():
return $default(_that.key,_that.title,_that.weight,_that.approvedPercent);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String key,  String title, @JsonKey(fromJson: readNumOr0)  double weight, @JsonKey(fromJson: readNumOr0)  double approvedPercent)?  $default,) {final _that = this;
switch (_that) {
case _SyncStepDto() when $default != null:
return $default(_that.key,_that.title,_that.weight,_that.approvedPercent);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SyncStepDto implements SyncStepDto {
  const _SyncStepDto({required this.key, required this.title, @JsonKey(fromJson: readNumOr0) required this.weight, @JsonKey(fromJson: readNumOr0) this.approvedPercent = 0});
  factory _SyncStepDto.fromJson(Map<String, dynamic> json) => _$SyncStepDtoFromJson(json);

@override final  String key;
@override final  String title;
@override@JsonKey(fromJson: readNumOr0) final  double weight;
@override@JsonKey(fromJson: readNumOr0) final  double approvedPercent;

/// Create a copy of SyncStepDto
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SyncStepDtoCopyWith<_SyncStepDto> get copyWith => __$SyncStepDtoCopyWithImpl<_SyncStepDto>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SyncStepDtoToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SyncStepDto&&(identical(other.key, key) || other.key == key)&&(identical(other.title, title) || other.title == title)&&(identical(other.weight, weight) || other.weight == weight)&&(identical(other.approvedPercent, approvedPercent) || other.approvedPercent == approvedPercent));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,key,title,weight,approvedPercent);

@override
String toString() {
  return 'SyncStepDto(key: $key, title: $title, weight: $weight, approvedPercent: $approvedPercent)';
}


}

/// @nodoc
abstract mixin class _$SyncStepDtoCopyWith<$Res> implements $SyncStepDtoCopyWith<$Res> {
  factory _$SyncStepDtoCopyWith(_SyncStepDto value, $Res Function(_SyncStepDto) _then) = __$SyncStepDtoCopyWithImpl;
@override @useResult
$Res call({
 String key, String title,@JsonKey(fromJson: readNumOr0) double weight,@JsonKey(fromJson: readNumOr0) double approvedPercent
});




}
/// @nodoc
class __$SyncStepDtoCopyWithImpl<$Res>
    implements _$SyncStepDtoCopyWith<$Res> {
  __$SyncStepDtoCopyWithImpl(this._self, this._then);

  final _SyncStepDto _self;
  final $Res Function(_SyncStepDto) _then;

/// Create a copy of SyncStepDto
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? key = null,Object? title = null,Object? weight = null,Object? approvedPercent = null,}) {
  return _then(_SyncStepDto(
key: null == key ? _self.key : key // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,weight: null == weight ? _self.weight : weight // ignore: cast_nullable_to_non_nullable
as double,approvedPercent: null == approvedPercent ? _self.approvedPercent : approvedPercent // ignore: cast_nullable_to_non_nullable
as double,
  ));
}


}


/// @nodoc
mixin _$SyncPlanPointDto {

 String get date;@JsonKey(fromJson: readNumOr0) double get plannedPercent;
/// Create a copy of SyncPlanPointDto
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SyncPlanPointDtoCopyWith<SyncPlanPointDto> get copyWith => _$SyncPlanPointDtoCopyWithImpl<SyncPlanPointDto>(this as SyncPlanPointDto, _$identity);

  /// Serializes this SyncPlanPointDto to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SyncPlanPointDto&&(identical(other.date, date) || other.date == date)&&(identical(other.plannedPercent, plannedPercent) || other.plannedPercent == plannedPercent));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,date,plannedPercent);

@override
String toString() {
  return 'SyncPlanPointDto(date: $date, plannedPercent: $plannedPercent)';
}


}

/// @nodoc
abstract mixin class $SyncPlanPointDtoCopyWith<$Res>  {
  factory $SyncPlanPointDtoCopyWith(SyncPlanPointDto value, $Res Function(SyncPlanPointDto) _then) = _$SyncPlanPointDtoCopyWithImpl;
@useResult
$Res call({
 String date,@JsonKey(fromJson: readNumOr0) double plannedPercent
});




}
/// @nodoc
class _$SyncPlanPointDtoCopyWithImpl<$Res>
    implements $SyncPlanPointDtoCopyWith<$Res> {
  _$SyncPlanPointDtoCopyWithImpl(this._self, this._then);

  final SyncPlanPointDto _self;
  final $Res Function(SyncPlanPointDto) _then;

/// Create a copy of SyncPlanPointDto
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? date = null,Object? plannedPercent = null,}) {
  return _then(_self.copyWith(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,plannedPercent: null == plannedPercent ? _self.plannedPercent : plannedPercent // ignore: cast_nullable_to_non_nullable
as double,
  ));
}

}


/// Adds pattern-matching-related methods to [SyncPlanPointDto].
extension SyncPlanPointDtoPatterns on SyncPlanPointDto {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SyncPlanPointDto value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SyncPlanPointDto() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SyncPlanPointDto value)  $default,){
final _that = this;
switch (_that) {
case _SyncPlanPointDto():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SyncPlanPointDto value)?  $default,){
final _that = this;
switch (_that) {
case _SyncPlanPointDto() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String date, @JsonKey(fromJson: readNumOr0)  double plannedPercent)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SyncPlanPointDto() when $default != null:
return $default(_that.date,_that.plannedPercent);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String date, @JsonKey(fromJson: readNumOr0)  double plannedPercent)  $default,) {final _that = this;
switch (_that) {
case _SyncPlanPointDto():
return $default(_that.date,_that.plannedPercent);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String date, @JsonKey(fromJson: readNumOr0)  double plannedPercent)?  $default,) {final _that = this;
switch (_that) {
case _SyncPlanPointDto() when $default != null:
return $default(_that.date,_that.plannedPercent);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SyncPlanPointDto implements SyncPlanPointDto {
  const _SyncPlanPointDto({required this.date, @JsonKey(fromJson: readNumOr0) required this.plannedPercent});
  factory _SyncPlanPointDto.fromJson(Map<String, dynamic> json) => _$SyncPlanPointDtoFromJson(json);

@override final  String date;
@override@JsonKey(fromJson: readNumOr0) final  double plannedPercent;

/// Create a copy of SyncPlanPointDto
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SyncPlanPointDtoCopyWith<_SyncPlanPointDto> get copyWith => __$SyncPlanPointDtoCopyWithImpl<_SyncPlanPointDto>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SyncPlanPointDtoToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SyncPlanPointDto&&(identical(other.date, date) || other.date == date)&&(identical(other.plannedPercent, plannedPercent) || other.plannedPercent == plannedPercent));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,date,plannedPercent);

@override
String toString() {
  return 'SyncPlanPointDto(date: $date, plannedPercent: $plannedPercent)';
}


}

/// @nodoc
abstract mixin class _$SyncPlanPointDtoCopyWith<$Res> implements $SyncPlanPointDtoCopyWith<$Res> {
  factory _$SyncPlanPointDtoCopyWith(_SyncPlanPointDto value, $Res Function(_SyncPlanPointDto) _then) = __$SyncPlanPointDtoCopyWithImpl;
@override @useResult
$Res call({
 String date,@JsonKey(fromJson: readNumOr0) double plannedPercent
});




}
/// @nodoc
class __$SyncPlanPointDtoCopyWithImpl<$Res>
    implements _$SyncPlanPointDtoCopyWith<$Res> {
  __$SyncPlanPointDtoCopyWithImpl(this._self, this._then);

  final _SyncPlanPointDto _self;
  final $Res Function(_SyncPlanPointDto) _then;

/// Create a copy of SyncPlanPointDto
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? date = null,Object? plannedPercent = null,}) {
  return _then(_SyncPlanPointDto(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,plannedPercent: null == plannedPercent ? _self.plannedPercent : plannedPercent // ignore: cast_nullable_to_non_nullable
as double,
  ));
}


}


/// @nodoc
mixin _$SyncActivityDto {

 String get id; String get projectId; String get code; String get title; String get method; String? get parentId; String? get unit;@JsonKey(fromJson: readNum) double? get totalQuantity; List<SyncStepDto>? get steps; String? get plannedStart; String? get plannedFinish;@JsonKey(fromJson: readNumOr0) double get approvedPercent;@JsonKey(fromJson: readNum) double? get approvedQuantity;@JsonKey(fromJson: readNum) double? get lastPendingPercent; List<SyncPlanPointDto> get plan; String? get approverUserId; String? get approverName;
/// Create a copy of SyncActivityDto
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SyncActivityDtoCopyWith<SyncActivityDto> get copyWith => _$SyncActivityDtoCopyWithImpl<SyncActivityDto>(this as SyncActivityDto, _$identity);

  /// Serializes this SyncActivityDto to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SyncActivityDto&&(identical(other.id, id) || other.id == id)&&(identical(other.projectId, projectId) || other.projectId == projectId)&&(identical(other.code, code) || other.code == code)&&(identical(other.title, title) || other.title == title)&&(identical(other.method, method) || other.method == method)&&(identical(other.parentId, parentId) || other.parentId == parentId)&&(identical(other.unit, unit) || other.unit == unit)&&(identical(other.totalQuantity, totalQuantity) || other.totalQuantity == totalQuantity)&&const DeepCollectionEquality().equals(other.steps, steps)&&(identical(other.plannedStart, plannedStart) || other.plannedStart == plannedStart)&&(identical(other.plannedFinish, plannedFinish) || other.plannedFinish == plannedFinish)&&(identical(other.approvedPercent, approvedPercent) || other.approvedPercent == approvedPercent)&&(identical(other.approvedQuantity, approvedQuantity) || other.approvedQuantity == approvedQuantity)&&(identical(other.lastPendingPercent, lastPendingPercent) || other.lastPendingPercent == lastPendingPercent)&&const DeepCollectionEquality().equals(other.plan, plan)&&(identical(other.approverUserId, approverUserId) || other.approverUserId == approverUserId)&&(identical(other.approverName, approverName) || other.approverName == approverName));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,projectId,code,title,method,parentId,unit,totalQuantity,const DeepCollectionEquality().hash(steps),plannedStart,plannedFinish,approvedPercent,approvedQuantity,lastPendingPercent,const DeepCollectionEquality().hash(plan),approverUserId,approverName);

@override
String toString() {
  return 'SyncActivityDto(id: $id, projectId: $projectId, code: $code, title: $title, method: $method, parentId: $parentId, unit: $unit, totalQuantity: $totalQuantity, steps: $steps, plannedStart: $plannedStart, plannedFinish: $plannedFinish, approvedPercent: $approvedPercent, approvedQuantity: $approvedQuantity, lastPendingPercent: $lastPendingPercent, plan: $plan, approverUserId: $approverUserId, approverName: $approverName)';
}


}

/// @nodoc
abstract mixin class $SyncActivityDtoCopyWith<$Res>  {
  factory $SyncActivityDtoCopyWith(SyncActivityDto value, $Res Function(SyncActivityDto) _then) = _$SyncActivityDtoCopyWithImpl;
@useResult
$Res call({
 String id, String projectId, String code, String title, String method, String? parentId, String? unit,@JsonKey(fromJson: readNum) double? totalQuantity, List<SyncStepDto>? steps, String? plannedStart, String? plannedFinish,@JsonKey(fromJson: readNumOr0) double approvedPercent,@JsonKey(fromJson: readNum) double? approvedQuantity,@JsonKey(fromJson: readNum) double? lastPendingPercent, List<SyncPlanPointDto> plan, String? approverUserId, String? approverName
});




}
/// @nodoc
class _$SyncActivityDtoCopyWithImpl<$Res>
    implements $SyncActivityDtoCopyWith<$Res> {
  _$SyncActivityDtoCopyWithImpl(this._self, this._then);

  final SyncActivityDto _self;
  final $Res Function(SyncActivityDto) _then;

/// Create a copy of SyncActivityDto
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? projectId = null,Object? code = null,Object? title = null,Object? method = null,Object? parentId = freezed,Object? unit = freezed,Object? totalQuantity = freezed,Object? steps = freezed,Object? plannedStart = freezed,Object? plannedFinish = freezed,Object? approvedPercent = null,Object? approvedQuantity = freezed,Object? lastPendingPercent = freezed,Object? plan = null,Object? approverUserId = freezed,Object? approverName = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,projectId: null == projectId ? _self.projectId : projectId // ignore: cast_nullable_to_non_nullable
as String,code: null == code ? _self.code : code // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,method: null == method ? _self.method : method // ignore: cast_nullable_to_non_nullable
as String,parentId: freezed == parentId ? _self.parentId : parentId // ignore: cast_nullable_to_non_nullable
as String?,unit: freezed == unit ? _self.unit : unit // ignore: cast_nullable_to_non_nullable
as String?,totalQuantity: freezed == totalQuantity ? _self.totalQuantity : totalQuantity // ignore: cast_nullable_to_non_nullable
as double?,steps: freezed == steps ? _self.steps : steps // ignore: cast_nullable_to_non_nullable
as List<SyncStepDto>?,plannedStart: freezed == plannedStart ? _self.plannedStart : plannedStart // ignore: cast_nullable_to_non_nullable
as String?,plannedFinish: freezed == plannedFinish ? _self.plannedFinish : plannedFinish // ignore: cast_nullable_to_non_nullable
as String?,approvedPercent: null == approvedPercent ? _self.approvedPercent : approvedPercent // ignore: cast_nullable_to_non_nullable
as double,approvedQuantity: freezed == approvedQuantity ? _self.approvedQuantity : approvedQuantity // ignore: cast_nullable_to_non_nullable
as double?,lastPendingPercent: freezed == lastPendingPercent ? _self.lastPendingPercent : lastPendingPercent // ignore: cast_nullable_to_non_nullable
as double?,plan: null == plan ? _self.plan : plan // ignore: cast_nullable_to_non_nullable
as List<SyncPlanPointDto>,approverUserId: freezed == approverUserId ? _self.approverUserId : approverUserId // ignore: cast_nullable_to_non_nullable
as String?,approverName: freezed == approverName ? _self.approverName : approverName // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [SyncActivityDto].
extension SyncActivityDtoPatterns on SyncActivityDto {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SyncActivityDto value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SyncActivityDto() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SyncActivityDto value)  $default,){
final _that = this;
switch (_that) {
case _SyncActivityDto():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SyncActivityDto value)?  $default,){
final _that = this;
switch (_that) {
case _SyncActivityDto() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String projectId,  String code,  String title,  String method,  String? parentId,  String? unit, @JsonKey(fromJson: readNum)  double? totalQuantity,  List<SyncStepDto>? steps,  String? plannedStart,  String? plannedFinish, @JsonKey(fromJson: readNumOr0)  double approvedPercent, @JsonKey(fromJson: readNum)  double? approvedQuantity, @JsonKey(fromJson: readNum)  double? lastPendingPercent,  List<SyncPlanPointDto> plan,  String? approverUserId,  String? approverName)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SyncActivityDto() when $default != null:
return $default(_that.id,_that.projectId,_that.code,_that.title,_that.method,_that.parentId,_that.unit,_that.totalQuantity,_that.steps,_that.plannedStart,_that.plannedFinish,_that.approvedPercent,_that.approvedQuantity,_that.lastPendingPercent,_that.plan,_that.approverUserId,_that.approverName);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String projectId,  String code,  String title,  String method,  String? parentId,  String? unit, @JsonKey(fromJson: readNum)  double? totalQuantity,  List<SyncStepDto>? steps,  String? plannedStart,  String? plannedFinish, @JsonKey(fromJson: readNumOr0)  double approvedPercent, @JsonKey(fromJson: readNum)  double? approvedQuantity, @JsonKey(fromJson: readNum)  double? lastPendingPercent,  List<SyncPlanPointDto> plan,  String? approverUserId,  String? approverName)  $default,) {final _that = this;
switch (_that) {
case _SyncActivityDto():
return $default(_that.id,_that.projectId,_that.code,_that.title,_that.method,_that.parentId,_that.unit,_that.totalQuantity,_that.steps,_that.plannedStart,_that.plannedFinish,_that.approvedPercent,_that.approvedQuantity,_that.lastPendingPercent,_that.plan,_that.approverUserId,_that.approverName);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String projectId,  String code,  String title,  String method,  String? parentId,  String? unit, @JsonKey(fromJson: readNum)  double? totalQuantity,  List<SyncStepDto>? steps,  String? plannedStart,  String? plannedFinish, @JsonKey(fromJson: readNumOr0)  double approvedPercent, @JsonKey(fromJson: readNum)  double? approvedQuantity, @JsonKey(fromJson: readNum)  double? lastPendingPercent,  List<SyncPlanPointDto> plan,  String? approverUserId,  String? approverName)?  $default,) {final _that = this;
switch (_that) {
case _SyncActivityDto() when $default != null:
return $default(_that.id,_that.projectId,_that.code,_that.title,_that.method,_that.parentId,_that.unit,_that.totalQuantity,_that.steps,_that.plannedStart,_that.plannedFinish,_that.approvedPercent,_that.approvedQuantity,_that.lastPendingPercent,_that.plan,_that.approverUserId,_that.approverName);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SyncActivityDto implements SyncActivityDto {
  const _SyncActivityDto({required this.id, required this.projectId, required this.code, required this.title, required this.method, this.parentId, this.unit, @JsonKey(fromJson: readNum) this.totalQuantity, final  List<SyncStepDto>? steps, this.plannedStart, this.plannedFinish, @JsonKey(fromJson: readNumOr0) this.approvedPercent = 0, @JsonKey(fromJson: readNum) this.approvedQuantity, @JsonKey(fromJson: readNum) this.lastPendingPercent, final  List<SyncPlanPointDto> plan = const [], this.approverUserId, this.approverName}): _steps = steps,_plan = plan;
  factory _SyncActivityDto.fromJson(Map<String, dynamic> json) => _$SyncActivityDtoFromJson(json);

@override final  String id;
@override final  String projectId;
@override final  String code;
@override final  String title;
@override final  String method;
@override final  String? parentId;
@override final  String? unit;
@override@JsonKey(fromJson: readNum) final  double? totalQuantity;
 final  List<SyncStepDto>? _steps;
@override List<SyncStepDto>? get steps {
  final value = _steps;
  if (value == null) return null;
  if (_steps is EqualUnmodifiableListView) return _steps;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(value);
}

@override final  String? plannedStart;
@override final  String? plannedFinish;
@override@JsonKey(fromJson: readNumOr0) final  double approvedPercent;
@override@JsonKey(fromJson: readNum) final  double? approvedQuantity;
@override@JsonKey(fromJson: readNum) final  double? lastPendingPercent;
 final  List<SyncPlanPointDto> _plan;
@override@JsonKey() List<SyncPlanPointDto> get plan {
  if (_plan is EqualUnmodifiableListView) return _plan;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_plan);
}

@override final  String? approverUserId;
@override final  String? approverName;

/// Create a copy of SyncActivityDto
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SyncActivityDtoCopyWith<_SyncActivityDto> get copyWith => __$SyncActivityDtoCopyWithImpl<_SyncActivityDto>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SyncActivityDtoToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SyncActivityDto&&(identical(other.id, id) || other.id == id)&&(identical(other.projectId, projectId) || other.projectId == projectId)&&(identical(other.code, code) || other.code == code)&&(identical(other.title, title) || other.title == title)&&(identical(other.method, method) || other.method == method)&&(identical(other.parentId, parentId) || other.parentId == parentId)&&(identical(other.unit, unit) || other.unit == unit)&&(identical(other.totalQuantity, totalQuantity) || other.totalQuantity == totalQuantity)&&const DeepCollectionEquality().equals(other._steps, _steps)&&(identical(other.plannedStart, plannedStart) || other.plannedStart == plannedStart)&&(identical(other.plannedFinish, plannedFinish) || other.plannedFinish == plannedFinish)&&(identical(other.approvedPercent, approvedPercent) || other.approvedPercent == approvedPercent)&&(identical(other.approvedQuantity, approvedQuantity) || other.approvedQuantity == approvedQuantity)&&(identical(other.lastPendingPercent, lastPendingPercent) || other.lastPendingPercent == lastPendingPercent)&&const DeepCollectionEquality().equals(other._plan, _plan)&&(identical(other.approverUserId, approverUserId) || other.approverUserId == approverUserId)&&(identical(other.approverName, approverName) || other.approverName == approverName));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,projectId,code,title,method,parentId,unit,totalQuantity,const DeepCollectionEquality().hash(_steps),plannedStart,plannedFinish,approvedPercent,approvedQuantity,lastPendingPercent,const DeepCollectionEquality().hash(_plan),approverUserId,approverName);

@override
String toString() {
  return 'SyncActivityDto(id: $id, projectId: $projectId, code: $code, title: $title, method: $method, parentId: $parentId, unit: $unit, totalQuantity: $totalQuantity, steps: $steps, plannedStart: $plannedStart, plannedFinish: $plannedFinish, approvedPercent: $approvedPercent, approvedQuantity: $approvedQuantity, lastPendingPercent: $lastPendingPercent, plan: $plan, approverUserId: $approverUserId, approverName: $approverName)';
}


}

/// @nodoc
abstract mixin class _$SyncActivityDtoCopyWith<$Res> implements $SyncActivityDtoCopyWith<$Res> {
  factory _$SyncActivityDtoCopyWith(_SyncActivityDto value, $Res Function(_SyncActivityDto) _then) = __$SyncActivityDtoCopyWithImpl;
@override @useResult
$Res call({
 String id, String projectId, String code, String title, String method, String? parentId, String? unit,@JsonKey(fromJson: readNum) double? totalQuantity, List<SyncStepDto>? steps, String? plannedStart, String? plannedFinish,@JsonKey(fromJson: readNumOr0) double approvedPercent,@JsonKey(fromJson: readNum) double? approvedQuantity,@JsonKey(fromJson: readNum) double? lastPendingPercent, List<SyncPlanPointDto> plan, String? approverUserId, String? approverName
});




}
/// @nodoc
class __$SyncActivityDtoCopyWithImpl<$Res>
    implements _$SyncActivityDtoCopyWith<$Res> {
  __$SyncActivityDtoCopyWithImpl(this._self, this._then);

  final _SyncActivityDto _self;
  final $Res Function(_SyncActivityDto) _then;

/// Create a copy of SyncActivityDto
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? projectId = null,Object? code = null,Object? title = null,Object? method = null,Object? parentId = freezed,Object? unit = freezed,Object? totalQuantity = freezed,Object? steps = freezed,Object? plannedStart = freezed,Object? plannedFinish = freezed,Object? approvedPercent = null,Object? approvedQuantity = freezed,Object? lastPendingPercent = freezed,Object? plan = null,Object? approverUserId = freezed,Object? approverName = freezed,}) {
  return _then(_SyncActivityDto(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,projectId: null == projectId ? _self.projectId : projectId // ignore: cast_nullable_to_non_nullable
as String,code: null == code ? _self.code : code // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,method: null == method ? _self.method : method // ignore: cast_nullable_to_non_nullable
as String,parentId: freezed == parentId ? _self.parentId : parentId // ignore: cast_nullable_to_non_nullable
as String?,unit: freezed == unit ? _self.unit : unit // ignore: cast_nullable_to_non_nullable
as String?,totalQuantity: freezed == totalQuantity ? _self.totalQuantity : totalQuantity // ignore: cast_nullable_to_non_nullable
as double?,steps: freezed == steps ? _self._steps : steps // ignore: cast_nullable_to_non_nullable
as List<SyncStepDto>?,plannedStart: freezed == plannedStart ? _self.plannedStart : plannedStart // ignore: cast_nullable_to_non_nullable
as String?,plannedFinish: freezed == plannedFinish ? _self.plannedFinish : plannedFinish // ignore: cast_nullable_to_non_nullable
as String?,approvedPercent: null == approvedPercent ? _self.approvedPercent : approvedPercent // ignore: cast_nullable_to_non_nullable
as double,approvedQuantity: freezed == approvedQuantity ? _self.approvedQuantity : approvedQuantity // ignore: cast_nullable_to_non_nullable
as double?,lastPendingPercent: freezed == lastPendingPercent ? _self.lastPendingPercent : lastPendingPercent // ignore: cast_nullable_to_non_nullable
as double?,plan: null == plan ? _self._plan : plan // ignore: cast_nullable_to_non_nullable
as List<SyncPlanPointDto>,approverUserId: freezed == approverUserId ? _self.approverUserId : approverUserId // ignore: cast_nullable_to_non_nullable
as String?,approverName: freezed == approverName ? _self.approverName : approverName // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$SyncItemDto {

 String get id; String get reportId; String get projectId; String get wbsItemId; String get status; String? get reportNo; String? get workDate; List<String> get flags;@JsonKey(fromJson: readNum) double? get computedPercent;@JsonKey(fromJson: readInt) int? get revisionCount; Map<String, Object?>? get revision; List<Map<String, Object?>> get photos;
/// Create a copy of SyncItemDto
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SyncItemDtoCopyWith<SyncItemDto> get copyWith => _$SyncItemDtoCopyWithImpl<SyncItemDto>(this as SyncItemDto, _$identity);

  /// Serializes this SyncItemDto to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SyncItemDto&&(identical(other.id, id) || other.id == id)&&(identical(other.reportId, reportId) || other.reportId == reportId)&&(identical(other.projectId, projectId) || other.projectId == projectId)&&(identical(other.wbsItemId, wbsItemId) || other.wbsItemId == wbsItemId)&&(identical(other.status, status) || other.status == status)&&(identical(other.reportNo, reportNo) || other.reportNo == reportNo)&&(identical(other.workDate, workDate) || other.workDate == workDate)&&const DeepCollectionEquality().equals(other.flags, flags)&&(identical(other.computedPercent, computedPercent) || other.computedPercent == computedPercent)&&(identical(other.revisionCount, revisionCount) || other.revisionCount == revisionCount)&&const DeepCollectionEquality().equals(other.revision, revision)&&const DeepCollectionEquality().equals(other.photos, photos));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,reportId,projectId,wbsItemId,status,reportNo,workDate,const DeepCollectionEquality().hash(flags),computedPercent,revisionCount,const DeepCollectionEquality().hash(revision),const DeepCollectionEquality().hash(photos));

@override
String toString() {
  return 'SyncItemDto(id: $id, reportId: $reportId, projectId: $projectId, wbsItemId: $wbsItemId, status: $status, reportNo: $reportNo, workDate: $workDate, flags: $flags, computedPercent: $computedPercent, revisionCount: $revisionCount, revision: $revision, photos: $photos)';
}


}

/// @nodoc
abstract mixin class $SyncItemDtoCopyWith<$Res>  {
  factory $SyncItemDtoCopyWith(SyncItemDto value, $Res Function(SyncItemDto) _then) = _$SyncItemDtoCopyWithImpl;
@useResult
$Res call({
 String id, String reportId, String projectId, String wbsItemId, String status, String? reportNo, String? workDate, List<String> flags,@JsonKey(fromJson: readNum) double? computedPercent,@JsonKey(fromJson: readInt) int? revisionCount, Map<String, Object?>? revision, List<Map<String, Object?>> photos
});




}
/// @nodoc
class _$SyncItemDtoCopyWithImpl<$Res>
    implements $SyncItemDtoCopyWith<$Res> {
  _$SyncItemDtoCopyWithImpl(this._self, this._then);

  final SyncItemDto _self;
  final $Res Function(SyncItemDto) _then;

/// Create a copy of SyncItemDto
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? reportId = null,Object? projectId = null,Object? wbsItemId = null,Object? status = null,Object? reportNo = freezed,Object? workDate = freezed,Object? flags = null,Object? computedPercent = freezed,Object? revisionCount = freezed,Object? revision = freezed,Object? photos = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,reportId: null == reportId ? _self.reportId : reportId // ignore: cast_nullable_to_non_nullable
as String,projectId: null == projectId ? _self.projectId : projectId // ignore: cast_nullable_to_non_nullable
as String,wbsItemId: null == wbsItemId ? _self.wbsItemId : wbsItemId // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,reportNo: freezed == reportNo ? _self.reportNo : reportNo // ignore: cast_nullable_to_non_nullable
as String?,workDate: freezed == workDate ? _self.workDate : workDate // ignore: cast_nullable_to_non_nullable
as String?,flags: null == flags ? _self.flags : flags // ignore: cast_nullable_to_non_nullable
as List<String>,computedPercent: freezed == computedPercent ? _self.computedPercent : computedPercent // ignore: cast_nullable_to_non_nullable
as double?,revisionCount: freezed == revisionCount ? _self.revisionCount : revisionCount // ignore: cast_nullable_to_non_nullable
as int?,revision: freezed == revision ? _self.revision : revision // ignore: cast_nullable_to_non_nullable
as Map<String, Object?>?,photos: null == photos ? _self.photos : photos // ignore: cast_nullable_to_non_nullable
as List<Map<String, Object?>>,
  ));
}

}


/// Adds pattern-matching-related methods to [SyncItemDto].
extension SyncItemDtoPatterns on SyncItemDto {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SyncItemDto value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SyncItemDto() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SyncItemDto value)  $default,){
final _that = this;
switch (_that) {
case _SyncItemDto():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SyncItemDto value)?  $default,){
final _that = this;
switch (_that) {
case _SyncItemDto() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String reportId,  String projectId,  String wbsItemId,  String status,  String? reportNo,  String? workDate,  List<String> flags, @JsonKey(fromJson: readNum)  double? computedPercent, @JsonKey(fromJson: readInt)  int? revisionCount,  Map<String, Object?>? revision,  List<Map<String, Object?>> photos)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SyncItemDto() when $default != null:
return $default(_that.id,_that.reportId,_that.projectId,_that.wbsItemId,_that.status,_that.reportNo,_that.workDate,_that.flags,_that.computedPercent,_that.revisionCount,_that.revision,_that.photos);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String reportId,  String projectId,  String wbsItemId,  String status,  String? reportNo,  String? workDate,  List<String> flags, @JsonKey(fromJson: readNum)  double? computedPercent, @JsonKey(fromJson: readInt)  int? revisionCount,  Map<String, Object?>? revision,  List<Map<String, Object?>> photos)  $default,) {final _that = this;
switch (_that) {
case _SyncItemDto():
return $default(_that.id,_that.reportId,_that.projectId,_that.wbsItemId,_that.status,_that.reportNo,_that.workDate,_that.flags,_that.computedPercent,_that.revisionCount,_that.revision,_that.photos);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String reportId,  String projectId,  String wbsItemId,  String status,  String? reportNo,  String? workDate,  List<String> flags, @JsonKey(fromJson: readNum)  double? computedPercent, @JsonKey(fromJson: readInt)  int? revisionCount,  Map<String, Object?>? revision,  List<Map<String, Object?>> photos)?  $default,) {final _that = this;
switch (_that) {
case _SyncItemDto() when $default != null:
return $default(_that.id,_that.reportId,_that.projectId,_that.wbsItemId,_that.status,_that.reportNo,_that.workDate,_that.flags,_that.computedPercent,_that.revisionCount,_that.revision,_that.photos);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SyncItemDto implements SyncItemDto {
  const _SyncItemDto({required this.id, required this.reportId, required this.projectId, required this.wbsItemId, required this.status, this.reportNo, this.workDate, final  List<String> flags = const [], @JsonKey(fromJson: readNum) this.computedPercent, @JsonKey(fromJson: readInt) this.revisionCount, final  Map<String, Object?>? revision, final  List<Map<String, Object?>> photos = const []}): _flags = flags,_revision = revision,_photos = photos;
  factory _SyncItemDto.fromJson(Map<String, dynamic> json) => _$SyncItemDtoFromJson(json);

@override final  String id;
@override final  String reportId;
@override final  String projectId;
@override final  String wbsItemId;
@override final  String status;
@override final  String? reportNo;
@override final  String? workDate;
 final  List<String> _flags;
@override@JsonKey() List<String> get flags {
  if (_flags is EqualUnmodifiableListView) return _flags;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_flags);
}

@override@JsonKey(fromJson: readNum) final  double? computedPercent;
@override@JsonKey(fromJson: readInt) final  int? revisionCount;
 final  Map<String, Object?>? _revision;
@override Map<String, Object?>? get revision {
  final value = _revision;
  if (value == null) return null;
  if (_revision is EqualUnmodifiableMapView) return _revision;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(value);
}

 final  List<Map<String, Object?>> _photos;
@override@JsonKey() List<Map<String, Object?>> get photos {
  if (_photos is EqualUnmodifiableListView) return _photos;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_photos);
}


/// Create a copy of SyncItemDto
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SyncItemDtoCopyWith<_SyncItemDto> get copyWith => __$SyncItemDtoCopyWithImpl<_SyncItemDto>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SyncItemDtoToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SyncItemDto&&(identical(other.id, id) || other.id == id)&&(identical(other.reportId, reportId) || other.reportId == reportId)&&(identical(other.projectId, projectId) || other.projectId == projectId)&&(identical(other.wbsItemId, wbsItemId) || other.wbsItemId == wbsItemId)&&(identical(other.status, status) || other.status == status)&&(identical(other.reportNo, reportNo) || other.reportNo == reportNo)&&(identical(other.workDate, workDate) || other.workDate == workDate)&&const DeepCollectionEquality().equals(other._flags, _flags)&&(identical(other.computedPercent, computedPercent) || other.computedPercent == computedPercent)&&(identical(other.revisionCount, revisionCount) || other.revisionCount == revisionCount)&&const DeepCollectionEquality().equals(other._revision, _revision)&&const DeepCollectionEquality().equals(other._photos, _photos));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,reportId,projectId,wbsItemId,status,reportNo,workDate,const DeepCollectionEquality().hash(_flags),computedPercent,revisionCount,const DeepCollectionEquality().hash(_revision),const DeepCollectionEquality().hash(_photos));

@override
String toString() {
  return 'SyncItemDto(id: $id, reportId: $reportId, projectId: $projectId, wbsItemId: $wbsItemId, status: $status, reportNo: $reportNo, workDate: $workDate, flags: $flags, computedPercent: $computedPercent, revisionCount: $revisionCount, revision: $revision, photos: $photos)';
}


}

/// @nodoc
abstract mixin class _$SyncItemDtoCopyWith<$Res> implements $SyncItemDtoCopyWith<$Res> {
  factory _$SyncItemDtoCopyWith(_SyncItemDto value, $Res Function(_SyncItemDto) _then) = __$SyncItemDtoCopyWithImpl;
@override @useResult
$Res call({
 String id, String reportId, String projectId, String wbsItemId, String status, String? reportNo, String? workDate, List<String> flags,@JsonKey(fromJson: readNum) double? computedPercent,@JsonKey(fromJson: readInt) int? revisionCount, Map<String, Object?>? revision, List<Map<String, Object?>> photos
});




}
/// @nodoc
class __$SyncItemDtoCopyWithImpl<$Res>
    implements _$SyncItemDtoCopyWith<$Res> {
  __$SyncItemDtoCopyWithImpl(this._self, this._then);

  final _SyncItemDto _self;
  final $Res Function(_SyncItemDto) _then;

/// Create a copy of SyncItemDto
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? reportId = null,Object? projectId = null,Object? wbsItemId = null,Object? status = null,Object? reportNo = freezed,Object? workDate = freezed,Object? flags = null,Object? computedPercent = freezed,Object? revisionCount = freezed,Object? revision = freezed,Object? photos = null,}) {
  return _then(_SyncItemDto(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,reportId: null == reportId ? _self.reportId : reportId // ignore: cast_nullable_to_non_nullable
as String,projectId: null == projectId ? _self.projectId : projectId // ignore: cast_nullable_to_non_nullable
as String,wbsItemId: null == wbsItemId ? _self.wbsItemId : wbsItemId // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,reportNo: freezed == reportNo ? _self.reportNo : reportNo // ignore: cast_nullable_to_non_nullable
as String?,workDate: freezed == workDate ? _self.workDate : workDate // ignore: cast_nullable_to_non_nullable
as String?,flags: null == flags ? _self._flags : flags // ignore: cast_nullable_to_non_nullable
as List<String>,computedPercent: freezed == computedPercent ? _self.computedPercent : computedPercent // ignore: cast_nullable_to_non_nullable
as double?,revisionCount: freezed == revisionCount ? _self.revisionCount : revisionCount // ignore: cast_nullable_to_non_nullable
as int?,revision: freezed == revision ? _self._revision : revision // ignore: cast_nullable_to_non_nullable
as Map<String, Object?>?,photos: null == photos ? _self._photos : photos // ignore: cast_nullable_to_non_nullable
as List<Map<String, Object?>>,
  ));
}


}


/// @nodoc
mixin _$SyncIssueDto {

 String get id; String get projectId; String get title; String get type; String get effect; String get reportedAt; String get status; String? get wbsItemId; String? get riskCode; String? get category;
/// Create a copy of SyncIssueDto
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SyncIssueDtoCopyWith<SyncIssueDto> get copyWith => _$SyncIssueDtoCopyWithImpl<SyncIssueDto>(this as SyncIssueDto, _$identity);

  /// Serializes this SyncIssueDto to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SyncIssueDto&&(identical(other.id, id) || other.id == id)&&(identical(other.projectId, projectId) || other.projectId == projectId)&&(identical(other.title, title) || other.title == title)&&(identical(other.type, type) || other.type == type)&&(identical(other.effect, effect) || other.effect == effect)&&(identical(other.reportedAt, reportedAt) || other.reportedAt == reportedAt)&&(identical(other.status, status) || other.status == status)&&(identical(other.wbsItemId, wbsItemId) || other.wbsItemId == wbsItemId)&&(identical(other.riskCode, riskCode) || other.riskCode == riskCode)&&(identical(other.category, category) || other.category == category));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,projectId,title,type,effect,reportedAt,status,wbsItemId,riskCode,category);

@override
String toString() {
  return 'SyncIssueDto(id: $id, projectId: $projectId, title: $title, type: $type, effect: $effect, reportedAt: $reportedAt, status: $status, wbsItemId: $wbsItemId, riskCode: $riskCode, category: $category)';
}


}

/// @nodoc
abstract mixin class $SyncIssueDtoCopyWith<$Res>  {
  factory $SyncIssueDtoCopyWith(SyncIssueDto value, $Res Function(SyncIssueDto) _then) = _$SyncIssueDtoCopyWithImpl;
@useResult
$Res call({
 String id, String projectId, String title, String type, String effect, String reportedAt, String status, String? wbsItemId, String? riskCode, String? category
});




}
/// @nodoc
class _$SyncIssueDtoCopyWithImpl<$Res>
    implements $SyncIssueDtoCopyWith<$Res> {
  _$SyncIssueDtoCopyWithImpl(this._self, this._then);

  final SyncIssueDto _self;
  final $Res Function(SyncIssueDto) _then;

/// Create a copy of SyncIssueDto
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? projectId = null,Object? title = null,Object? type = null,Object? effect = null,Object? reportedAt = null,Object? status = null,Object? wbsItemId = freezed,Object? riskCode = freezed,Object? category = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,projectId: null == projectId ? _self.projectId : projectId // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String,effect: null == effect ? _self.effect : effect // ignore: cast_nullable_to_non_nullable
as String,reportedAt: null == reportedAt ? _self.reportedAt : reportedAt // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,wbsItemId: freezed == wbsItemId ? _self.wbsItemId : wbsItemId // ignore: cast_nullable_to_non_nullable
as String?,riskCode: freezed == riskCode ? _self.riskCode : riskCode // ignore: cast_nullable_to_non_nullable
as String?,category: freezed == category ? _self.category : category // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [SyncIssueDto].
extension SyncIssueDtoPatterns on SyncIssueDto {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SyncIssueDto value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SyncIssueDto() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SyncIssueDto value)  $default,){
final _that = this;
switch (_that) {
case _SyncIssueDto():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SyncIssueDto value)?  $default,){
final _that = this;
switch (_that) {
case _SyncIssueDto() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String projectId,  String title,  String type,  String effect,  String reportedAt,  String status,  String? wbsItemId,  String? riskCode,  String? category)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SyncIssueDto() when $default != null:
return $default(_that.id,_that.projectId,_that.title,_that.type,_that.effect,_that.reportedAt,_that.status,_that.wbsItemId,_that.riskCode,_that.category);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String projectId,  String title,  String type,  String effect,  String reportedAt,  String status,  String? wbsItemId,  String? riskCode,  String? category)  $default,) {final _that = this;
switch (_that) {
case _SyncIssueDto():
return $default(_that.id,_that.projectId,_that.title,_that.type,_that.effect,_that.reportedAt,_that.status,_that.wbsItemId,_that.riskCode,_that.category);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String projectId,  String title,  String type,  String effect,  String reportedAt,  String status,  String? wbsItemId,  String? riskCode,  String? category)?  $default,) {final _that = this;
switch (_that) {
case _SyncIssueDto() when $default != null:
return $default(_that.id,_that.projectId,_that.title,_that.type,_that.effect,_that.reportedAt,_that.status,_that.wbsItemId,_that.riskCode,_that.category);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SyncIssueDto implements SyncIssueDto {
  const _SyncIssueDto({required this.id, required this.projectId, required this.title, required this.type, required this.effect, required this.reportedAt, required this.status, this.wbsItemId, this.riskCode, this.category});
  factory _SyncIssueDto.fromJson(Map<String, dynamic> json) => _$SyncIssueDtoFromJson(json);

@override final  String id;
@override final  String projectId;
@override final  String title;
@override final  String type;
@override final  String effect;
@override final  String reportedAt;
@override final  String status;
@override final  String? wbsItemId;
@override final  String? riskCode;
@override final  String? category;

/// Create a copy of SyncIssueDto
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SyncIssueDtoCopyWith<_SyncIssueDto> get copyWith => __$SyncIssueDtoCopyWithImpl<_SyncIssueDto>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SyncIssueDtoToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SyncIssueDto&&(identical(other.id, id) || other.id == id)&&(identical(other.projectId, projectId) || other.projectId == projectId)&&(identical(other.title, title) || other.title == title)&&(identical(other.type, type) || other.type == type)&&(identical(other.effect, effect) || other.effect == effect)&&(identical(other.reportedAt, reportedAt) || other.reportedAt == reportedAt)&&(identical(other.status, status) || other.status == status)&&(identical(other.wbsItemId, wbsItemId) || other.wbsItemId == wbsItemId)&&(identical(other.riskCode, riskCode) || other.riskCode == riskCode)&&(identical(other.category, category) || other.category == category));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,projectId,title,type,effect,reportedAt,status,wbsItemId,riskCode,category);

@override
String toString() {
  return 'SyncIssueDto(id: $id, projectId: $projectId, title: $title, type: $type, effect: $effect, reportedAt: $reportedAt, status: $status, wbsItemId: $wbsItemId, riskCode: $riskCode, category: $category)';
}


}

/// @nodoc
abstract mixin class _$SyncIssueDtoCopyWith<$Res> implements $SyncIssueDtoCopyWith<$Res> {
  factory _$SyncIssueDtoCopyWith(_SyncIssueDto value, $Res Function(_SyncIssueDto) _then) = __$SyncIssueDtoCopyWithImpl;
@override @useResult
$Res call({
 String id, String projectId, String title, String type, String effect, String reportedAt, String status, String? wbsItemId, String? riskCode, String? category
});




}
/// @nodoc
class __$SyncIssueDtoCopyWithImpl<$Res>
    implements _$SyncIssueDtoCopyWith<$Res> {
  __$SyncIssueDtoCopyWithImpl(this._self, this._then);

  final _SyncIssueDto _self;
  final $Res Function(_SyncIssueDto) _then;

/// Create a copy of SyncIssueDto
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? projectId = null,Object? title = null,Object? type = null,Object? effect = null,Object? reportedAt = null,Object? status = null,Object? wbsItemId = freezed,Object? riskCode = freezed,Object? category = freezed,}) {
  return _then(_SyncIssueDto(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,projectId: null == projectId ? _self.projectId : projectId // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String,effect: null == effect ? _self.effect : effect // ignore: cast_nullable_to_non_nullable
as String,reportedAt: null == reportedAt ? _self.reportedAt : reportedAt // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,wbsItemId: freezed == wbsItemId ? _self.wbsItemId : wbsItemId // ignore: cast_nullable_to_non_nullable
as String?,riskCode: freezed == riskCode ? _self.riskCode : riskCode // ignore: cast_nullable_to_non_nullable
as String?,category: freezed == category ? _self.category : category // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$SyncDailyReminderDto {

 bool get enabled; String get time;
/// Create a copy of SyncDailyReminderDto
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SyncDailyReminderDtoCopyWith<SyncDailyReminderDto> get copyWith => _$SyncDailyReminderDtoCopyWithImpl<SyncDailyReminderDto>(this as SyncDailyReminderDto, _$identity);

  /// Serializes this SyncDailyReminderDto to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SyncDailyReminderDto&&(identical(other.enabled, enabled) || other.enabled == enabled)&&(identical(other.time, time) || other.time == time));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,enabled,time);

@override
String toString() {
  return 'SyncDailyReminderDto(enabled: $enabled, time: $time)';
}


}

/// @nodoc
abstract mixin class $SyncDailyReminderDtoCopyWith<$Res>  {
  factory $SyncDailyReminderDtoCopyWith(SyncDailyReminderDto value, $Res Function(SyncDailyReminderDto) _then) = _$SyncDailyReminderDtoCopyWithImpl;
@useResult
$Res call({
 bool enabled, String time
});




}
/// @nodoc
class _$SyncDailyReminderDtoCopyWithImpl<$Res>
    implements $SyncDailyReminderDtoCopyWith<$Res> {
  _$SyncDailyReminderDtoCopyWithImpl(this._self, this._then);

  final SyncDailyReminderDto _self;
  final $Res Function(SyncDailyReminderDto) _then;

/// Create a copy of SyncDailyReminderDto
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? enabled = null,Object? time = null,}) {
  return _then(_self.copyWith(
enabled: null == enabled ? _self.enabled : enabled // ignore: cast_nullable_to_non_nullable
as bool,time: null == time ? _self.time : time // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [SyncDailyReminderDto].
extension SyncDailyReminderDtoPatterns on SyncDailyReminderDto {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SyncDailyReminderDto value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SyncDailyReminderDto() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SyncDailyReminderDto value)  $default,){
final _that = this;
switch (_that) {
case _SyncDailyReminderDto():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SyncDailyReminderDto value)?  $default,){
final _that = this;
switch (_that) {
case _SyncDailyReminderDto() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( bool enabled,  String time)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SyncDailyReminderDto() when $default != null:
return $default(_that.enabled,_that.time);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( bool enabled,  String time)  $default,) {final _that = this;
switch (_that) {
case _SyncDailyReminderDto():
return $default(_that.enabled,_that.time);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( bool enabled,  String time)?  $default,) {final _that = this;
switch (_that) {
case _SyncDailyReminderDto() when $default != null:
return $default(_that.enabled,_that.time);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SyncDailyReminderDto implements SyncDailyReminderDto {
  const _SyncDailyReminderDto({this.enabled = true, this.time = '17:00'});
  factory _SyncDailyReminderDto.fromJson(Map<String, dynamic> json) => _$SyncDailyReminderDtoFromJson(json);

@override@JsonKey() final  bool enabled;
@override@JsonKey() final  String time;

/// Create a copy of SyncDailyReminderDto
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SyncDailyReminderDtoCopyWith<_SyncDailyReminderDto> get copyWith => __$SyncDailyReminderDtoCopyWithImpl<_SyncDailyReminderDto>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SyncDailyReminderDtoToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SyncDailyReminderDto&&(identical(other.enabled, enabled) || other.enabled == enabled)&&(identical(other.time, time) || other.time == time));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,enabled,time);

@override
String toString() {
  return 'SyncDailyReminderDto(enabled: $enabled, time: $time)';
}


}

/// @nodoc
abstract mixin class _$SyncDailyReminderDtoCopyWith<$Res> implements $SyncDailyReminderDtoCopyWith<$Res> {
  factory _$SyncDailyReminderDtoCopyWith(_SyncDailyReminderDto value, $Res Function(_SyncDailyReminderDto) _then) = __$SyncDailyReminderDtoCopyWithImpl;
@override @useResult
$Res call({
 bool enabled, String time
});




}
/// @nodoc
class __$SyncDailyReminderDtoCopyWithImpl<$Res>
    implements _$SyncDailyReminderDtoCopyWith<$Res> {
  __$SyncDailyReminderDtoCopyWithImpl(this._self, this._then);

  final _SyncDailyReminderDto _self;
  final $Res Function(_SyncDailyReminderDto) _then;

/// Create a copy of SyncDailyReminderDto
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? enabled = null,Object? time = null,}) {
  return _then(_SyncDailyReminderDto(
enabled: null == enabled ? _self.enabled : enabled // ignore: cast_nullable_to_non_nullable
as bool,time: null == time ? _self.time : time // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$SyncNotificationDto {

 String get id; String get title; String get createdAt; String get code; String? get category; String? get severity; String? get body; String? get projectId; String? get projectName; String? get link; String? get readAt;@JsonKey(fromJson: readInt) int? get mergedCount;
/// Create a copy of SyncNotificationDto
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SyncNotificationDtoCopyWith<SyncNotificationDto> get copyWith => _$SyncNotificationDtoCopyWithImpl<SyncNotificationDto>(this as SyncNotificationDto, _$identity);

  /// Serializes this SyncNotificationDto to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SyncNotificationDto&&(identical(other.id, id) || other.id == id)&&(identical(other.title, title) || other.title == title)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.code, code) || other.code == code)&&(identical(other.category, category) || other.category == category)&&(identical(other.severity, severity) || other.severity == severity)&&(identical(other.body, body) || other.body == body)&&(identical(other.projectId, projectId) || other.projectId == projectId)&&(identical(other.projectName, projectName) || other.projectName == projectName)&&(identical(other.link, link) || other.link == link)&&(identical(other.readAt, readAt) || other.readAt == readAt)&&(identical(other.mergedCount, mergedCount) || other.mergedCount == mergedCount));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,title,createdAt,code,category,severity,body,projectId,projectName,link,readAt,mergedCount);

@override
String toString() {
  return 'SyncNotificationDto(id: $id, title: $title, createdAt: $createdAt, code: $code, category: $category, severity: $severity, body: $body, projectId: $projectId, projectName: $projectName, link: $link, readAt: $readAt, mergedCount: $mergedCount)';
}


}

/// @nodoc
abstract mixin class $SyncNotificationDtoCopyWith<$Res>  {
  factory $SyncNotificationDtoCopyWith(SyncNotificationDto value, $Res Function(SyncNotificationDto) _then) = _$SyncNotificationDtoCopyWithImpl;
@useResult
$Res call({
 String id, String title, String createdAt, String code, String? category, String? severity, String? body, String? projectId, String? projectName, String? link, String? readAt,@JsonKey(fromJson: readInt) int? mergedCount
});




}
/// @nodoc
class _$SyncNotificationDtoCopyWithImpl<$Res>
    implements $SyncNotificationDtoCopyWith<$Res> {
  _$SyncNotificationDtoCopyWithImpl(this._self, this._then);

  final SyncNotificationDto _self;
  final $Res Function(SyncNotificationDto) _then;

/// Create a copy of SyncNotificationDto
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? title = null,Object? createdAt = null,Object? code = null,Object? category = freezed,Object? severity = freezed,Object? body = freezed,Object? projectId = freezed,Object? projectName = freezed,Object? link = freezed,Object? readAt = freezed,Object? mergedCount = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String,code: null == code ? _self.code : code // ignore: cast_nullable_to_non_nullable
as String,category: freezed == category ? _self.category : category // ignore: cast_nullable_to_non_nullable
as String?,severity: freezed == severity ? _self.severity : severity // ignore: cast_nullable_to_non_nullable
as String?,body: freezed == body ? _self.body : body // ignore: cast_nullable_to_non_nullable
as String?,projectId: freezed == projectId ? _self.projectId : projectId // ignore: cast_nullable_to_non_nullable
as String?,projectName: freezed == projectName ? _self.projectName : projectName // ignore: cast_nullable_to_non_nullable
as String?,link: freezed == link ? _self.link : link // ignore: cast_nullable_to_non_nullable
as String?,readAt: freezed == readAt ? _self.readAt : readAt // ignore: cast_nullable_to_non_nullable
as String?,mergedCount: freezed == mergedCount ? _self.mergedCount : mergedCount // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}

}


/// Adds pattern-matching-related methods to [SyncNotificationDto].
extension SyncNotificationDtoPatterns on SyncNotificationDto {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SyncNotificationDto value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SyncNotificationDto() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SyncNotificationDto value)  $default,){
final _that = this;
switch (_that) {
case _SyncNotificationDto():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SyncNotificationDto value)?  $default,){
final _that = this;
switch (_that) {
case _SyncNotificationDto() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String title,  String createdAt,  String code,  String? category,  String? severity,  String? body,  String? projectId,  String? projectName,  String? link,  String? readAt, @JsonKey(fromJson: readInt)  int? mergedCount)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SyncNotificationDto() when $default != null:
return $default(_that.id,_that.title,_that.createdAt,_that.code,_that.category,_that.severity,_that.body,_that.projectId,_that.projectName,_that.link,_that.readAt,_that.mergedCount);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String title,  String createdAt,  String code,  String? category,  String? severity,  String? body,  String? projectId,  String? projectName,  String? link,  String? readAt, @JsonKey(fromJson: readInt)  int? mergedCount)  $default,) {final _that = this;
switch (_that) {
case _SyncNotificationDto():
return $default(_that.id,_that.title,_that.createdAt,_that.code,_that.category,_that.severity,_that.body,_that.projectId,_that.projectName,_that.link,_that.readAt,_that.mergedCount);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String title,  String createdAt,  String code,  String? category,  String? severity,  String? body,  String? projectId,  String? projectName,  String? link,  String? readAt, @JsonKey(fromJson: readInt)  int? mergedCount)?  $default,) {final _that = this;
switch (_that) {
case _SyncNotificationDto() when $default != null:
return $default(_that.id,_that.title,_that.createdAt,_that.code,_that.category,_that.severity,_that.body,_that.projectId,_that.projectName,_that.link,_that.readAt,_that.mergedCount);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SyncNotificationDto implements SyncNotificationDto {
  const _SyncNotificationDto({required this.id, required this.title, required this.createdAt, this.code = '', this.category, this.severity, this.body, this.projectId, this.projectName, this.link, this.readAt, @JsonKey(fromJson: readInt) this.mergedCount});
  factory _SyncNotificationDto.fromJson(Map<String, dynamic> json) => _$SyncNotificationDtoFromJson(json);

@override final  String id;
@override final  String title;
@override final  String createdAt;
@override@JsonKey() final  String code;
@override final  String? category;
@override final  String? severity;
@override final  String? body;
@override final  String? projectId;
@override final  String? projectName;
@override final  String? link;
@override final  String? readAt;
@override@JsonKey(fromJson: readInt) final  int? mergedCount;

/// Create a copy of SyncNotificationDto
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SyncNotificationDtoCopyWith<_SyncNotificationDto> get copyWith => __$SyncNotificationDtoCopyWithImpl<_SyncNotificationDto>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SyncNotificationDtoToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SyncNotificationDto&&(identical(other.id, id) || other.id == id)&&(identical(other.title, title) || other.title == title)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.code, code) || other.code == code)&&(identical(other.category, category) || other.category == category)&&(identical(other.severity, severity) || other.severity == severity)&&(identical(other.body, body) || other.body == body)&&(identical(other.projectId, projectId) || other.projectId == projectId)&&(identical(other.projectName, projectName) || other.projectName == projectName)&&(identical(other.link, link) || other.link == link)&&(identical(other.readAt, readAt) || other.readAt == readAt)&&(identical(other.mergedCount, mergedCount) || other.mergedCount == mergedCount));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,title,createdAt,code,category,severity,body,projectId,projectName,link,readAt,mergedCount);

@override
String toString() {
  return 'SyncNotificationDto(id: $id, title: $title, createdAt: $createdAt, code: $code, category: $category, severity: $severity, body: $body, projectId: $projectId, projectName: $projectName, link: $link, readAt: $readAt, mergedCount: $mergedCount)';
}


}

/// @nodoc
abstract mixin class _$SyncNotificationDtoCopyWith<$Res> implements $SyncNotificationDtoCopyWith<$Res> {
  factory _$SyncNotificationDtoCopyWith(_SyncNotificationDto value, $Res Function(_SyncNotificationDto) _then) = __$SyncNotificationDtoCopyWithImpl;
@override @useResult
$Res call({
 String id, String title, String createdAt, String code, String? category, String? severity, String? body, String? projectId, String? projectName, String? link, String? readAt,@JsonKey(fromJson: readInt) int? mergedCount
});




}
/// @nodoc
class __$SyncNotificationDtoCopyWithImpl<$Res>
    implements _$SyncNotificationDtoCopyWith<$Res> {
  __$SyncNotificationDtoCopyWithImpl(this._self, this._then);

  final _SyncNotificationDto _self;
  final $Res Function(_SyncNotificationDto) _then;

/// Create a copy of SyncNotificationDto
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? title = null,Object? createdAt = null,Object? code = null,Object? category = freezed,Object? severity = freezed,Object? body = freezed,Object? projectId = freezed,Object? projectName = freezed,Object? link = freezed,Object? readAt = freezed,Object? mergedCount = freezed,}) {
  return _then(_SyncNotificationDto(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String,code: null == code ? _self.code : code // ignore: cast_nullable_to_non_nullable
as String,category: freezed == category ? _self.category : category // ignore: cast_nullable_to_non_nullable
as String?,severity: freezed == severity ? _self.severity : severity // ignore: cast_nullable_to_non_nullable
as String?,body: freezed == body ? _self.body : body // ignore: cast_nullable_to_non_nullable
as String?,projectId: freezed == projectId ? _self.projectId : projectId // ignore: cast_nullable_to_non_nullable
as String?,projectName: freezed == projectName ? _self.projectName : projectName // ignore: cast_nullable_to_non_nullable
as String?,link: freezed == link ? _self.link : link // ignore: cast_nullable_to_non_nullable
as String?,readAt: freezed == readAt ? _self.readAt : readAt // ignore: cast_nullable_to_non_nullable
as String?,mergedCount: freezed == mergedCount ? _self.mergedCount : mergedCount // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}


}

// dart format on
