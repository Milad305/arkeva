// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'review_bloc.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$ReviewState {

 ReviewStatus get status; ReportDraft? get draft; Project? get project; List<ReviewLine> get lines; RoutePreview? get route; bool get attested; bool get online; bool get showErrors; Failure? get failure;
/// Create a copy of ReviewState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ReviewStateCopyWith<ReviewState> get copyWith => _$ReviewStateCopyWithImpl<ReviewState>(this as ReviewState, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ReviewState&&(identical(other.status, status) || other.status == status)&&(identical(other.draft, draft) || other.draft == draft)&&(identical(other.project, project) || other.project == project)&&const DeepCollectionEquality().equals(other.lines, lines)&&(identical(other.route, route) || other.route == route)&&(identical(other.attested, attested) || other.attested == attested)&&(identical(other.online, online) || other.online == online)&&(identical(other.showErrors, showErrors) || other.showErrors == showErrors)&&(identical(other.failure, failure) || other.failure == failure));
}


@override
int get hashCode => Object.hash(runtimeType,status,draft,project,const DeepCollectionEquality().hash(lines),route,attested,online,showErrors,failure);

@override
String toString() {
  return 'ReviewState(status: $status, draft: $draft, project: $project, lines: $lines, route: $route, attested: $attested, online: $online, showErrors: $showErrors, failure: $failure)';
}


}

/// @nodoc
abstract mixin class $ReviewStateCopyWith<$Res>  {
  factory $ReviewStateCopyWith(ReviewState value, $Res Function(ReviewState) _then) = _$ReviewStateCopyWithImpl;
@useResult
$Res call({
 ReviewStatus status, ReportDraft? draft, Project? project, List<ReviewLine> lines, RoutePreview? route, bool attested, bool online, bool showErrors, Failure? failure
});




}
/// @nodoc
class _$ReviewStateCopyWithImpl<$Res>
    implements $ReviewStateCopyWith<$Res> {
  _$ReviewStateCopyWithImpl(this._self, this._then);

  final ReviewState _self;
  final $Res Function(ReviewState) _then;

/// Create a copy of ReviewState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? status = null,Object? draft = freezed,Object? project = freezed,Object? lines = null,Object? route = freezed,Object? attested = null,Object? online = null,Object? showErrors = null,Object? failure = freezed,}) {
  return _then(_self.copyWith(
status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as ReviewStatus,draft: freezed == draft ? _self.draft : draft // ignore: cast_nullable_to_non_nullable
as ReportDraft?,project: freezed == project ? _self.project : project // ignore: cast_nullable_to_non_nullable
as Project?,lines: null == lines ? _self.lines : lines // ignore: cast_nullable_to_non_nullable
as List<ReviewLine>,route: freezed == route ? _self.route : route // ignore: cast_nullable_to_non_nullable
as RoutePreview?,attested: null == attested ? _self.attested : attested // ignore: cast_nullable_to_non_nullable
as bool,online: null == online ? _self.online : online // ignore: cast_nullable_to_non_nullable
as bool,showErrors: null == showErrors ? _self.showErrors : showErrors // ignore: cast_nullable_to_non_nullable
as bool,failure: freezed == failure ? _self.failure : failure // ignore: cast_nullable_to_non_nullable
as Failure?,
  ));
}

}


/// Adds pattern-matching-related methods to [ReviewState].
extension ReviewStatePatterns on ReviewState {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ReviewState value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ReviewState() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ReviewState value)  $default,){
final _that = this;
switch (_that) {
case _ReviewState():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ReviewState value)?  $default,){
final _that = this;
switch (_that) {
case _ReviewState() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( ReviewStatus status,  ReportDraft? draft,  Project? project,  List<ReviewLine> lines,  RoutePreview? route,  bool attested,  bool online,  bool showErrors,  Failure? failure)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ReviewState() when $default != null:
return $default(_that.status,_that.draft,_that.project,_that.lines,_that.route,_that.attested,_that.online,_that.showErrors,_that.failure);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( ReviewStatus status,  ReportDraft? draft,  Project? project,  List<ReviewLine> lines,  RoutePreview? route,  bool attested,  bool online,  bool showErrors,  Failure? failure)  $default,) {final _that = this;
switch (_that) {
case _ReviewState():
return $default(_that.status,_that.draft,_that.project,_that.lines,_that.route,_that.attested,_that.online,_that.showErrors,_that.failure);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( ReviewStatus status,  ReportDraft? draft,  Project? project,  List<ReviewLine> lines,  RoutePreview? route,  bool attested,  bool online,  bool showErrors,  Failure? failure)?  $default,) {final _that = this;
switch (_that) {
case _ReviewState() when $default != null:
return $default(_that.status,_that.draft,_that.project,_that.lines,_that.route,_that.attested,_that.online,_that.showErrors,_that.failure);case _:
  return null;

}
}

}

/// @nodoc


class _ReviewState extends ReviewState {
  const _ReviewState({this.status = ReviewStatus.loading, this.draft, this.project, final  List<ReviewLine> lines = const <ReviewLine>[], this.route, this.attested = false, this.online = false, this.showErrors = false, this.failure}): _lines = lines,super._();
  

@override@JsonKey() final  ReviewStatus status;
@override final  ReportDraft? draft;
@override final  Project? project;
 final  List<ReviewLine> _lines;
@override@JsonKey() List<ReviewLine> get lines {
  if (_lines is EqualUnmodifiableListView) return _lines;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_lines);
}

@override final  RoutePreview? route;
@override@JsonKey() final  bool attested;
@override@JsonKey() final  bool online;
@override@JsonKey() final  bool showErrors;
@override final  Failure? failure;

/// Create a copy of ReviewState
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ReviewStateCopyWith<_ReviewState> get copyWith => __$ReviewStateCopyWithImpl<_ReviewState>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ReviewState&&(identical(other.status, status) || other.status == status)&&(identical(other.draft, draft) || other.draft == draft)&&(identical(other.project, project) || other.project == project)&&const DeepCollectionEquality().equals(other._lines, _lines)&&(identical(other.route, route) || other.route == route)&&(identical(other.attested, attested) || other.attested == attested)&&(identical(other.online, online) || other.online == online)&&(identical(other.showErrors, showErrors) || other.showErrors == showErrors)&&(identical(other.failure, failure) || other.failure == failure));
}


@override
int get hashCode => Object.hash(runtimeType,status,draft,project,const DeepCollectionEquality().hash(_lines),route,attested,online,showErrors,failure);

@override
String toString() {
  return 'ReviewState(status: $status, draft: $draft, project: $project, lines: $lines, route: $route, attested: $attested, online: $online, showErrors: $showErrors, failure: $failure)';
}


}

/// @nodoc
abstract mixin class _$ReviewStateCopyWith<$Res> implements $ReviewStateCopyWith<$Res> {
  factory _$ReviewStateCopyWith(_ReviewState value, $Res Function(_ReviewState) _then) = __$ReviewStateCopyWithImpl;
@override @useResult
$Res call({
 ReviewStatus status, ReportDraft? draft, Project? project, List<ReviewLine> lines, RoutePreview? route, bool attested, bool online, bool showErrors, Failure? failure
});




}
/// @nodoc
class __$ReviewStateCopyWithImpl<$Res>
    implements _$ReviewStateCopyWith<$Res> {
  __$ReviewStateCopyWithImpl(this._self, this._then);

  final _ReviewState _self;
  final $Res Function(_ReviewState) _then;

/// Create a copy of ReviewState
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? status = null,Object? draft = freezed,Object? project = freezed,Object? lines = null,Object? route = freezed,Object? attested = null,Object? online = null,Object? showErrors = null,Object? failure = freezed,}) {
  return _then(_ReviewState(
status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as ReviewStatus,draft: freezed == draft ? _self.draft : draft // ignore: cast_nullable_to_non_nullable
as ReportDraft?,project: freezed == project ? _self.project : project // ignore: cast_nullable_to_non_nullable
as Project?,lines: null == lines ? _self._lines : lines // ignore: cast_nullable_to_non_nullable
as List<ReviewLine>,route: freezed == route ? _self.route : route // ignore: cast_nullable_to_non_nullable
as RoutePreview?,attested: null == attested ? _self.attested : attested // ignore: cast_nullable_to_non_nullable
as bool,online: null == online ? _self.online : online // ignore: cast_nullable_to_non_nullable
as bool,showErrors: null == showErrors ? _self.showErrors : showErrors // ignore: cast_nullable_to_non_nullable
as bool,failure: freezed == failure ? _self.failure : failure // ignore: cast_nullable_to_non_nullable
as Failure?,
  ));
}


}

// dart format on
