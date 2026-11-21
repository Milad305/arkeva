// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'report_form_bloc.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$ReportFormState {

 String get today; ReportFormStatus get status; Activity? get activity; Project? get project; String? get reportId; String? get itemId; String? get workDate; Weather? get weather; QuantityInput get quantity; PercentInput get percent; OptionalQuantityInput get percentQuantity; Map<String, double> get steps; BoundedIntInput get crew; BoundedIntInput get temperature; LimitedText get note; List<StoredPhoto> get photos; List<StoredPhoto> get quickPhotos; bool get showErrors; ProgressPreview? get preview; Failure? get failure;
/// Create a copy of ReportFormState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ReportFormStateCopyWith<ReportFormState> get copyWith => _$ReportFormStateCopyWithImpl<ReportFormState>(this as ReportFormState, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ReportFormState&&(identical(other.today, today) || other.today == today)&&(identical(other.status, status) || other.status == status)&&(identical(other.activity, activity) || other.activity == activity)&&(identical(other.project, project) || other.project == project)&&(identical(other.reportId, reportId) || other.reportId == reportId)&&(identical(other.itemId, itemId) || other.itemId == itemId)&&(identical(other.workDate, workDate) || other.workDate == workDate)&&(identical(other.weather, weather) || other.weather == weather)&&(identical(other.quantity, quantity) || other.quantity == quantity)&&(identical(other.percent, percent) || other.percent == percent)&&(identical(other.percentQuantity, percentQuantity) || other.percentQuantity == percentQuantity)&&const DeepCollectionEquality().equals(other.steps, steps)&&(identical(other.crew, crew) || other.crew == crew)&&(identical(other.temperature, temperature) || other.temperature == temperature)&&(identical(other.note, note) || other.note == note)&&const DeepCollectionEquality().equals(other.photos, photos)&&const DeepCollectionEquality().equals(other.quickPhotos, quickPhotos)&&(identical(other.showErrors, showErrors) || other.showErrors == showErrors)&&(identical(other.preview, preview) || other.preview == preview)&&(identical(other.failure, failure) || other.failure == failure));
}


@override
int get hashCode => Object.hashAll([runtimeType,today,status,activity,project,reportId,itemId,workDate,weather,quantity,percent,percentQuantity,const DeepCollectionEquality().hash(steps),crew,temperature,note,const DeepCollectionEquality().hash(photos),const DeepCollectionEquality().hash(quickPhotos),showErrors,preview,failure]);

@override
String toString() {
  return 'ReportFormState(today: $today, status: $status, activity: $activity, project: $project, reportId: $reportId, itemId: $itemId, workDate: $workDate, weather: $weather, quantity: $quantity, percent: $percent, percentQuantity: $percentQuantity, steps: $steps, crew: $crew, temperature: $temperature, note: $note, photos: $photos, quickPhotos: $quickPhotos, showErrors: $showErrors, preview: $preview, failure: $failure)';
}


}

/// @nodoc
abstract mixin class $ReportFormStateCopyWith<$Res>  {
  factory $ReportFormStateCopyWith(ReportFormState value, $Res Function(ReportFormState) _then) = _$ReportFormStateCopyWithImpl;
@useResult
$Res call({
 String today, ReportFormStatus status, Activity? activity, Project? project, String? reportId, String? itemId, String? workDate, Weather? weather, QuantityInput quantity, PercentInput percent, OptionalQuantityInput percentQuantity, Map<String, double> steps, BoundedIntInput crew, BoundedIntInput temperature, LimitedText note, List<StoredPhoto> photos, List<StoredPhoto> quickPhotos, bool showErrors, ProgressPreview? preview, Failure? failure
});




}
/// @nodoc
class _$ReportFormStateCopyWithImpl<$Res>
    implements $ReportFormStateCopyWith<$Res> {
  _$ReportFormStateCopyWithImpl(this._self, this._then);

  final ReportFormState _self;
  final $Res Function(ReportFormState) _then;

/// Create a copy of ReportFormState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? today = null,Object? status = null,Object? activity = freezed,Object? project = freezed,Object? reportId = freezed,Object? itemId = freezed,Object? workDate = freezed,Object? weather = freezed,Object? quantity = null,Object? percent = null,Object? percentQuantity = null,Object? steps = null,Object? crew = null,Object? temperature = null,Object? note = null,Object? photos = null,Object? quickPhotos = null,Object? showErrors = null,Object? preview = freezed,Object? failure = freezed,}) {
  return _then(_self.copyWith(
today: null == today ? _self.today : today // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as ReportFormStatus,activity: freezed == activity ? _self.activity : activity // ignore: cast_nullable_to_non_nullable
as Activity?,project: freezed == project ? _self.project : project // ignore: cast_nullable_to_non_nullable
as Project?,reportId: freezed == reportId ? _self.reportId : reportId // ignore: cast_nullable_to_non_nullable
as String?,itemId: freezed == itemId ? _self.itemId : itemId // ignore: cast_nullable_to_non_nullable
as String?,workDate: freezed == workDate ? _self.workDate : workDate // ignore: cast_nullable_to_non_nullable
as String?,weather: freezed == weather ? _self.weather : weather // ignore: cast_nullable_to_non_nullable
as Weather?,quantity: null == quantity ? _self.quantity : quantity // ignore: cast_nullable_to_non_nullable
as QuantityInput,percent: null == percent ? _self.percent : percent // ignore: cast_nullable_to_non_nullable
as PercentInput,percentQuantity: null == percentQuantity ? _self.percentQuantity : percentQuantity // ignore: cast_nullable_to_non_nullable
as OptionalQuantityInput,steps: null == steps ? _self.steps : steps // ignore: cast_nullable_to_non_nullable
as Map<String, double>,crew: null == crew ? _self.crew : crew // ignore: cast_nullable_to_non_nullable
as BoundedIntInput,temperature: null == temperature ? _self.temperature : temperature // ignore: cast_nullable_to_non_nullable
as BoundedIntInput,note: null == note ? _self.note : note // ignore: cast_nullable_to_non_nullable
as LimitedText,photos: null == photos ? _self.photos : photos // ignore: cast_nullable_to_non_nullable
as List<StoredPhoto>,quickPhotos: null == quickPhotos ? _self.quickPhotos : quickPhotos // ignore: cast_nullable_to_non_nullable
as List<StoredPhoto>,showErrors: null == showErrors ? _self.showErrors : showErrors // ignore: cast_nullable_to_non_nullable
as bool,preview: freezed == preview ? _self.preview : preview // ignore: cast_nullable_to_non_nullable
as ProgressPreview?,failure: freezed == failure ? _self.failure : failure // ignore: cast_nullable_to_non_nullable
as Failure?,
  ));
}

}


/// Adds pattern-matching-related methods to [ReportFormState].
extension ReportFormStatePatterns on ReportFormState {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ReportFormState value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ReportFormState() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ReportFormState value)  $default,){
final _that = this;
switch (_that) {
case _ReportFormState():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ReportFormState value)?  $default,){
final _that = this;
switch (_that) {
case _ReportFormState() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String today,  ReportFormStatus status,  Activity? activity,  Project? project,  String? reportId,  String? itemId,  String? workDate,  Weather? weather,  QuantityInput quantity,  PercentInput percent,  OptionalQuantityInput percentQuantity,  Map<String, double> steps,  BoundedIntInput crew,  BoundedIntInput temperature,  LimitedText note,  List<StoredPhoto> photos,  List<StoredPhoto> quickPhotos,  bool showErrors,  ProgressPreview? preview,  Failure? failure)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ReportFormState() when $default != null:
return $default(_that.today,_that.status,_that.activity,_that.project,_that.reportId,_that.itemId,_that.workDate,_that.weather,_that.quantity,_that.percent,_that.percentQuantity,_that.steps,_that.crew,_that.temperature,_that.note,_that.photos,_that.quickPhotos,_that.showErrors,_that.preview,_that.failure);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String today,  ReportFormStatus status,  Activity? activity,  Project? project,  String? reportId,  String? itemId,  String? workDate,  Weather? weather,  QuantityInput quantity,  PercentInput percent,  OptionalQuantityInput percentQuantity,  Map<String, double> steps,  BoundedIntInput crew,  BoundedIntInput temperature,  LimitedText note,  List<StoredPhoto> photos,  List<StoredPhoto> quickPhotos,  bool showErrors,  ProgressPreview? preview,  Failure? failure)  $default,) {final _that = this;
switch (_that) {
case _ReportFormState():
return $default(_that.today,_that.status,_that.activity,_that.project,_that.reportId,_that.itemId,_that.workDate,_that.weather,_that.quantity,_that.percent,_that.percentQuantity,_that.steps,_that.crew,_that.temperature,_that.note,_that.photos,_that.quickPhotos,_that.showErrors,_that.preview,_that.failure);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String today,  ReportFormStatus status,  Activity? activity,  Project? project,  String? reportId,  String? itemId,  String? workDate,  Weather? weather,  QuantityInput quantity,  PercentInput percent,  OptionalQuantityInput percentQuantity,  Map<String, double> steps,  BoundedIntInput crew,  BoundedIntInput temperature,  LimitedText note,  List<StoredPhoto> photos,  List<StoredPhoto> quickPhotos,  bool showErrors,  ProgressPreview? preview,  Failure? failure)?  $default,) {final _that = this;
switch (_that) {
case _ReportFormState() when $default != null:
return $default(_that.today,_that.status,_that.activity,_that.project,_that.reportId,_that.itemId,_that.workDate,_that.weather,_that.quantity,_that.percent,_that.percentQuantity,_that.steps,_that.crew,_that.temperature,_that.note,_that.photos,_that.quickPhotos,_that.showErrors,_that.preview,_that.failure);case _:
  return null;

}
}

}

/// @nodoc


class _ReportFormState extends ReportFormState {
  const _ReportFormState({required this.today, this.status = ReportFormStatus.loading, this.activity, this.project, this.reportId, this.itemId, this.workDate, this.weather, this.quantity = const QuantityInput.pure(), this.percent = const PercentInput.pure(), this.percentQuantity = const OptionalQuantityInput.pure(), final  Map<String, double> steps = const <String, double>{}, this.crew = const BoundedIntInput.pure(min: 0, max: 10000), this.temperature = const BoundedIntInput.pure(min: -60, max: 70), this.note = const LimitedText.pure(maxLength: 2000), final  List<StoredPhoto> photos = const <StoredPhoto>[], final  List<StoredPhoto> quickPhotos = const <StoredPhoto>[], this.showErrors = false, this.preview, this.failure}): _steps = steps,_photos = photos,_quickPhotos = quickPhotos,super._();
  

@override final  String today;
@override@JsonKey() final  ReportFormStatus status;
@override final  Activity? activity;
@override final  Project? project;
@override final  String? reportId;
@override final  String? itemId;
@override final  String? workDate;
@override final  Weather? weather;
@override@JsonKey() final  QuantityInput quantity;
@override@JsonKey() final  PercentInput percent;
@override@JsonKey() final  OptionalQuantityInput percentQuantity;
 final  Map<String, double> _steps;
@override@JsonKey() Map<String, double> get steps {
  if (_steps is EqualUnmodifiableMapView) return _steps;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(_steps);
}

@override@JsonKey() final  BoundedIntInput crew;
@override@JsonKey() final  BoundedIntInput temperature;
@override@JsonKey() final  LimitedText note;
 final  List<StoredPhoto> _photos;
@override@JsonKey() List<StoredPhoto> get photos {
  if (_photos is EqualUnmodifiableListView) return _photos;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_photos);
}

 final  List<StoredPhoto> _quickPhotos;
@override@JsonKey() List<StoredPhoto> get quickPhotos {
  if (_quickPhotos is EqualUnmodifiableListView) return _quickPhotos;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_quickPhotos);
}

@override@JsonKey() final  bool showErrors;
@override final  ProgressPreview? preview;
@override final  Failure? failure;

/// Create a copy of ReportFormState
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ReportFormStateCopyWith<_ReportFormState> get copyWith => __$ReportFormStateCopyWithImpl<_ReportFormState>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ReportFormState&&(identical(other.today, today) || other.today == today)&&(identical(other.status, status) || other.status == status)&&(identical(other.activity, activity) || other.activity == activity)&&(identical(other.project, project) || other.project == project)&&(identical(other.reportId, reportId) || other.reportId == reportId)&&(identical(other.itemId, itemId) || other.itemId == itemId)&&(identical(other.workDate, workDate) || other.workDate == workDate)&&(identical(other.weather, weather) || other.weather == weather)&&(identical(other.quantity, quantity) || other.quantity == quantity)&&(identical(other.percent, percent) || other.percent == percent)&&(identical(other.percentQuantity, percentQuantity) || other.percentQuantity == percentQuantity)&&const DeepCollectionEquality().equals(other._steps, _steps)&&(identical(other.crew, crew) || other.crew == crew)&&(identical(other.temperature, temperature) || other.temperature == temperature)&&(identical(other.note, note) || other.note == note)&&const DeepCollectionEquality().equals(other._photos, _photos)&&const DeepCollectionEquality().equals(other._quickPhotos, _quickPhotos)&&(identical(other.showErrors, showErrors) || other.showErrors == showErrors)&&(identical(other.preview, preview) || other.preview == preview)&&(identical(other.failure, failure) || other.failure == failure));
}


@override
int get hashCode => Object.hashAll([runtimeType,today,status,activity,project,reportId,itemId,workDate,weather,quantity,percent,percentQuantity,const DeepCollectionEquality().hash(_steps),crew,temperature,note,const DeepCollectionEquality().hash(_photos),const DeepCollectionEquality().hash(_quickPhotos),showErrors,preview,failure]);

@override
String toString() {
  return 'ReportFormState(today: $today, status: $status, activity: $activity, project: $project, reportId: $reportId, itemId: $itemId, workDate: $workDate, weather: $weather, quantity: $quantity, percent: $percent, percentQuantity: $percentQuantity, steps: $steps, crew: $crew, temperature: $temperature, note: $note, photos: $photos, quickPhotos: $quickPhotos, showErrors: $showErrors, preview: $preview, failure: $failure)';
}


}

/// @nodoc
abstract mixin class _$ReportFormStateCopyWith<$Res> implements $ReportFormStateCopyWith<$Res> {
  factory _$ReportFormStateCopyWith(_ReportFormState value, $Res Function(_ReportFormState) _then) = __$ReportFormStateCopyWithImpl;
@override @useResult
$Res call({
 String today, ReportFormStatus status, Activity? activity, Project? project, String? reportId, String? itemId, String? workDate, Weather? weather, QuantityInput quantity, PercentInput percent, OptionalQuantityInput percentQuantity, Map<String, double> steps, BoundedIntInput crew, BoundedIntInput temperature, LimitedText note, List<StoredPhoto> photos, List<StoredPhoto> quickPhotos, bool showErrors, ProgressPreview? preview, Failure? failure
});




}
/// @nodoc
class __$ReportFormStateCopyWithImpl<$Res>
    implements _$ReportFormStateCopyWith<$Res> {
  __$ReportFormStateCopyWithImpl(this._self, this._then);

  final _ReportFormState _self;
  final $Res Function(_ReportFormState) _then;

/// Create a copy of ReportFormState
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? today = null,Object? status = null,Object? activity = freezed,Object? project = freezed,Object? reportId = freezed,Object? itemId = freezed,Object? workDate = freezed,Object? weather = freezed,Object? quantity = null,Object? percent = null,Object? percentQuantity = null,Object? steps = null,Object? crew = null,Object? temperature = null,Object? note = null,Object? photos = null,Object? quickPhotos = null,Object? showErrors = null,Object? preview = freezed,Object? failure = freezed,}) {
  return _then(_ReportFormState(
today: null == today ? _self.today : today // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as ReportFormStatus,activity: freezed == activity ? _self.activity : activity // ignore: cast_nullable_to_non_nullable
as Activity?,project: freezed == project ? _self.project : project // ignore: cast_nullable_to_non_nullable
as Project?,reportId: freezed == reportId ? _self.reportId : reportId // ignore: cast_nullable_to_non_nullable
as String?,itemId: freezed == itemId ? _self.itemId : itemId // ignore: cast_nullable_to_non_nullable
as String?,workDate: freezed == workDate ? _self.workDate : workDate // ignore: cast_nullable_to_non_nullable
as String?,weather: freezed == weather ? _self.weather : weather // ignore: cast_nullable_to_non_nullable
as Weather?,quantity: null == quantity ? _self.quantity : quantity // ignore: cast_nullable_to_non_nullable
as QuantityInput,percent: null == percent ? _self.percent : percent // ignore: cast_nullable_to_non_nullable
as PercentInput,percentQuantity: null == percentQuantity ? _self.percentQuantity : percentQuantity // ignore: cast_nullable_to_non_nullable
as OptionalQuantityInput,steps: null == steps ? _self._steps : steps // ignore: cast_nullable_to_non_nullable
as Map<String, double>,crew: null == crew ? _self.crew : crew // ignore: cast_nullable_to_non_nullable
as BoundedIntInput,temperature: null == temperature ? _self.temperature : temperature // ignore: cast_nullable_to_non_nullable
as BoundedIntInput,note: null == note ? _self.note : note // ignore: cast_nullable_to_non_nullable
as LimitedText,photos: null == photos ? _self._photos : photos // ignore: cast_nullable_to_non_nullable
as List<StoredPhoto>,quickPhotos: null == quickPhotos ? _self._quickPhotos : quickPhotos // ignore: cast_nullable_to_non_nullable
as List<StoredPhoto>,showErrors: null == showErrors ? _self.showErrors : showErrors // ignore: cast_nullable_to_non_nullable
as bool,preview: freezed == preview ? _self.preview : preview // ignore: cast_nullable_to_non_nullable
as ProgressPreview?,failure: freezed == failure ? _self.failure : failure // ignore: cast_nullable_to_non_nullable
as Failure?,
  ));
}


}

// dart format on
