// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'issue_form_bloc.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$IssueFormState {

 String get issueId; String get today; IssueFormStatus get status; List<Project> get projects; List<Activity> get activities; String? get projectId; IssueType? get type; IssueEffect? get effect; String? get activityId; LimitedText get title; LimitedText get description; List<StoredPhoto> get photos; bool get showErrors; Failure? get failure;
/// Create a copy of IssueFormState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$IssueFormStateCopyWith<IssueFormState> get copyWith => _$IssueFormStateCopyWithImpl<IssueFormState>(this as IssueFormState, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is IssueFormState&&(identical(other.issueId, issueId) || other.issueId == issueId)&&(identical(other.today, today) || other.today == today)&&(identical(other.status, status) || other.status == status)&&const DeepCollectionEquality().equals(other.projects, projects)&&const DeepCollectionEquality().equals(other.activities, activities)&&(identical(other.projectId, projectId) || other.projectId == projectId)&&(identical(other.type, type) || other.type == type)&&(identical(other.effect, effect) || other.effect == effect)&&(identical(other.activityId, activityId) || other.activityId == activityId)&&(identical(other.title, title) || other.title == title)&&(identical(other.description, description) || other.description == description)&&const DeepCollectionEquality().equals(other.photos, photos)&&(identical(other.showErrors, showErrors) || other.showErrors == showErrors)&&(identical(other.failure, failure) || other.failure == failure));
}


@override
int get hashCode => Object.hash(runtimeType,issueId,today,status,const DeepCollectionEquality().hash(projects),const DeepCollectionEquality().hash(activities),projectId,type,effect,activityId,title,description,const DeepCollectionEquality().hash(photos),showErrors,failure);

@override
String toString() {
  return 'IssueFormState(issueId: $issueId, today: $today, status: $status, projects: $projects, activities: $activities, projectId: $projectId, type: $type, effect: $effect, activityId: $activityId, title: $title, description: $description, photos: $photos, showErrors: $showErrors, failure: $failure)';
}


}

/// @nodoc
abstract mixin class $IssueFormStateCopyWith<$Res>  {
  factory $IssueFormStateCopyWith(IssueFormState value, $Res Function(IssueFormState) _then) = _$IssueFormStateCopyWithImpl;
@useResult
$Res call({
 String issueId, String today, IssueFormStatus status, List<Project> projects, List<Activity> activities, String? projectId, IssueType? type, IssueEffect? effect, String? activityId, LimitedText title, LimitedText description, List<StoredPhoto> photos, bool showErrors, Failure? failure
});




}
/// @nodoc
class _$IssueFormStateCopyWithImpl<$Res>
    implements $IssueFormStateCopyWith<$Res> {
  _$IssueFormStateCopyWithImpl(this._self, this._then);

  final IssueFormState _self;
  final $Res Function(IssueFormState) _then;

/// Create a copy of IssueFormState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? issueId = null,Object? today = null,Object? status = null,Object? projects = null,Object? activities = null,Object? projectId = freezed,Object? type = freezed,Object? effect = freezed,Object? activityId = freezed,Object? title = null,Object? description = null,Object? photos = null,Object? showErrors = null,Object? failure = freezed,}) {
  return _then(_self.copyWith(
issueId: null == issueId ? _self.issueId : issueId // ignore: cast_nullable_to_non_nullable
as String,today: null == today ? _self.today : today // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as IssueFormStatus,projects: null == projects ? _self.projects : projects // ignore: cast_nullable_to_non_nullable
as List<Project>,activities: null == activities ? _self.activities : activities // ignore: cast_nullable_to_non_nullable
as List<Activity>,projectId: freezed == projectId ? _self.projectId : projectId // ignore: cast_nullable_to_non_nullable
as String?,type: freezed == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as IssueType?,effect: freezed == effect ? _self.effect : effect // ignore: cast_nullable_to_non_nullable
as IssueEffect?,activityId: freezed == activityId ? _self.activityId : activityId // ignore: cast_nullable_to_non_nullable
as String?,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as LimitedText,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as LimitedText,photos: null == photos ? _self.photos : photos // ignore: cast_nullable_to_non_nullable
as List<StoredPhoto>,showErrors: null == showErrors ? _self.showErrors : showErrors // ignore: cast_nullable_to_non_nullable
as bool,failure: freezed == failure ? _self.failure : failure // ignore: cast_nullable_to_non_nullable
as Failure?,
  ));
}

}


/// Adds pattern-matching-related methods to [IssueFormState].
extension IssueFormStatePatterns on IssueFormState {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _IssueFormState value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _IssueFormState() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _IssueFormState value)  $default,){
final _that = this;
switch (_that) {
case _IssueFormState():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _IssueFormState value)?  $default,){
final _that = this;
switch (_that) {
case _IssueFormState() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String issueId,  String today,  IssueFormStatus status,  List<Project> projects,  List<Activity> activities,  String? projectId,  IssueType? type,  IssueEffect? effect,  String? activityId,  LimitedText title,  LimitedText description,  List<StoredPhoto> photos,  bool showErrors,  Failure? failure)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _IssueFormState() when $default != null:
return $default(_that.issueId,_that.today,_that.status,_that.projects,_that.activities,_that.projectId,_that.type,_that.effect,_that.activityId,_that.title,_that.description,_that.photos,_that.showErrors,_that.failure);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String issueId,  String today,  IssueFormStatus status,  List<Project> projects,  List<Activity> activities,  String? projectId,  IssueType? type,  IssueEffect? effect,  String? activityId,  LimitedText title,  LimitedText description,  List<StoredPhoto> photos,  bool showErrors,  Failure? failure)  $default,) {final _that = this;
switch (_that) {
case _IssueFormState():
return $default(_that.issueId,_that.today,_that.status,_that.projects,_that.activities,_that.projectId,_that.type,_that.effect,_that.activityId,_that.title,_that.description,_that.photos,_that.showErrors,_that.failure);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String issueId,  String today,  IssueFormStatus status,  List<Project> projects,  List<Activity> activities,  String? projectId,  IssueType? type,  IssueEffect? effect,  String? activityId,  LimitedText title,  LimitedText description,  List<StoredPhoto> photos,  bool showErrors,  Failure? failure)?  $default,) {final _that = this;
switch (_that) {
case _IssueFormState() when $default != null:
return $default(_that.issueId,_that.today,_that.status,_that.projects,_that.activities,_that.projectId,_that.type,_that.effect,_that.activityId,_that.title,_that.description,_that.photos,_that.showErrors,_that.failure);case _:
  return null;

}
}

}

/// @nodoc


class _IssueFormState extends IssueFormState {
  const _IssueFormState({required this.issueId, required this.today, this.status = IssueFormStatus.loading, final  List<Project> projects = const <Project>[], final  List<Activity> activities = const <Activity>[], this.projectId, this.type, this.effect, this.activityId, this.title = const LimitedText.pure(maxLength: 200, isRequired: true), this.description = const LimitedText.pure(maxLength: 4000), final  List<StoredPhoto> photos = const <StoredPhoto>[], this.showErrors = false, this.failure}): _projects = projects,_activities = activities,_photos = photos,super._();
  

@override final  String issueId;
@override final  String today;
@override@JsonKey() final  IssueFormStatus status;
 final  List<Project> _projects;
@override@JsonKey() List<Project> get projects {
  if (_projects is EqualUnmodifiableListView) return _projects;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_projects);
}

 final  List<Activity> _activities;
@override@JsonKey() List<Activity> get activities {
  if (_activities is EqualUnmodifiableListView) return _activities;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_activities);
}

@override final  String? projectId;
@override final  IssueType? type;
@override final  IssueEffect? effect;
@override final  String? activityId;
@override@JsonKey() final  LimitedText title;
@override@JsonKey() final  LimitedText description;
 final  List<StoredPhoto> _photos;
@override@JsonKey() List<StoredPhoto> get photos {
  if (_photos is EqualUnmodifiableListView) return _photos;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_photos);
}

@override@JsonKey() final  bool showErrors;
@override final  Failure? failure;

/// Create a copy of IssueFormState
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$IssueFormStateCopyWith<_IssueFormState> get copyWith => __$IssueFormStateCopyWithImpl<_IssueFormState>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _IssueFormState&&(identical(other.issueId, issueId) || other.issueId == issueId)&&(identical(other.today, today) || other.today == today)&&(identical(other.status, status) || other.status == status)&&const DeepCollectionEquality().equals(other._projects, _projects)&&const DeepCollectionEquality().equals(other._activities, _activities)&&(identical(other.projectId, projectId) || other.projectId == projectId)&&(identical(other.type, type) || other.type == type)&&(identical(other.effect, effect) || other.effect == effect)&&(identical(other.activityId, activityId) || other.activityId == activityId)&&(identical(other.title, title) || other.title == title)&&(identical(other.description, description) || other.description == description)&&const DeepCollectionEquality().equals(other._photos, _photos)&&(identical(other.showErrors, showErrors) || other.showErrors == showErrors)&&(identical(other.failure, failure) || other.failure == failure));
}


@override
int get hashCode => Object.hash(runtimeType,issueId,today,status,const DeepCollectionEquality().hash(_projects),const DeepCollectionEquality().hash(_activities),projectId,type,effect,activityId,title,description,const DeepCollectionEquality().hash(_photos),showErrors,failure);

@override
String toString() {
  return 'IssueFormState(issueId: $issueId, today: $today, status: $status, projects: $projects, activities: $activities, projectId: $projectId, type: $type, effect: $effect, activityId: $activityId, title: $title, description: $description, photos: $photos, showErrors: $showErrors, failure: $failure)';
}


}

/// @nodoc
abstract mixin class _$IssueFormStateCopyWith<$Res> implements $IssueFormStateCopyWith<$Res> {
  factory _$IssueFormStateCopyWith(_IssueFormState value, $Res Function(_IssueFormState) _then) = __$IssueFormStateCopyWithImpl;
@override @useResult
$Res call({
 String issueId, String today, IssueFormStatus status, List<Project> projects, List<Activity> activities, String? projectId, IssueType? type, IssueEffect? effect, String? activityId, LimitedText title, LimitedText description, List<StoredPhoto> photos, bool showErrors, Failure? failure
});




}
/// @nodoc
class __$IssueFormStateCopyWithImpl<$Res>
    implements _$IssueFormStateCopyWith<$Res> {
  __$IssueFormStateCopyWithImpl(this._self, this._then);

  final _IssueFormState _self;
  final $Res Function(_IssueFormState) _then;

/// Create a copy of IssueFormState
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? issueId = null,Object? today = null,Object? status = null,Object? projects = null,Object? activities = null,Object? projectId = freezed,Object? type = freezed,Object? effect = freezed,Object? activityId = freezed,Object? title = null,Object? description = null,Object? photos = null,Object? showErrors = null,Object? failure = freezed,}) {
  return _then(_IssueFormState(
issueId: null == issueId ? _self.issueId : issueId // ignore: cast_nullable_to_non_nullable
as String,today: null == today ? _self.today : today // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as IssueFormStatus,projects: null == projects ? _self._projects : projects // ignore: cast_nullable_to_non_nullable
as List<Project>,activities: null == activities ? _self._activities : activities // ignore: cast_nullable_to_non_nullable
as List<Activity>,projectId: freezed == projectId ? _self.projectId : projectId // ignore: cast_nullable_to_non_nullable
as String?,type: freezed == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as IssueType?,effect: freezed == effect ? _self.effect : effect // ignore: cast_nullable_to_non_nullable
as IssueEffect?,activityId: freezed == activityId ? _self.activityId : activityId // ignore: cast_nullable_to_non_nullable
as String?,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as LimitedText,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as LimitedText,photos: null == photos ? _self._photos : photos // ignore: cast_nullable_to_non_nullable
as List<StoredPhoto>,showErrors: null == showErrors ? _self.showErrors : showErrors // ignore: cast_nullable_to_non_nullable
as bool,failure: freezed == failure ? _self.failure : failure // ignore: cast_nullable_to_non_nullable
as Failure?,
  ));
}


}

// dart format on
