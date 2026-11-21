// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'auth_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$OtpChallengeDto {

 String get otpToken; String get maskedMobile; int get resendAfterSec; int get codeLength;
/// Create a copy of OtpChallengeDto
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$OtpChallengeDtoCopyWith<OtpChallengeDto> get copyWith => _$OtpChallengeDtoCopyWithImpl<OtpChallengeDto>(this as OtpChallengeDto, _$identity);

  /// Serializes this OtpChallengeDto to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is OtpChallengeDto&&(identical(other.otpToken, otpToken) || other.otpToken == otpToken)&&(identical(other.maskedMobile, maskedMobile) || other.maskedMobile == maskedMobile)&&(identical(other.resendAfterSec, resendAfterSec) || other.resendAfterSec == resendAfterSec)&&(identical(other.codeLength, codeLength) || other.codeLength == codeLength));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,otpToken,maskedMobile,resendAfterSec,codeLength);

@override
String toString() {
  return 'OtpChallengeDto(otpToken: $otpToken, maskedMobile: $maskedMobile, resendAfterSec: $resendAfterSec, codeLength: $codeLength)';
}


}

/// @nodoc
abstract mixin class $OtpChallengeDtoCopyWith<$Res>  {
  factory $OtpChallengeDtoCopyWith(OtpChallengeDto value, $Res Function(OtpChallengeDto) _then) = _$OtpChallengeDtoCopyWithImpl;
@useResult
$Res call({
 String otpToken, String maskedMobile, int resendAfterSec, int codeLength
});




}
/// @nodoc
class _$OtpChallengeDtoCopyWithImpl<$Res>
    implements $OtpChallengeDtoCopyWith<$Res> {
  _$OtpChallengeDtoCopyWithImpl(this._self, this._then);

  final OtpChallengeDto _self;
  final $Res Function(OtpChallengeDto) _then;

/// Create a copy of OtpChallengeDto
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? otpToken = null,Object? maskedMobile = null,Object? resendAfterSec = null,Object? codeLength = null,}) {
  return _then(_self.copyWith(
otpToken: null == otpToken ? _self.otpToken : otpToken // ignore: cast_nullable_to_non_nullable
as String,maskedMobile: null == maskedMobile ? _self.maskedMobile : maskedMobile // ignore: cast_nullable_to_non_nullable
as String,resendAfterSec: null == resendAfterSec ? _self.resendAfterSec : resendAfterSec // ignore: cast_nullable_to_non_nullable
as int,codeLength: null == codeLength ? _self.codeLength : codeLength // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [OtpChallengeDto].
extension OtpChallengeDtoPatterns on OtpChallengeDto {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _OtpChallengeDto value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _OtpChallengeDto() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _OtpChallengeDto value)  $default,){
final _that = this;
switch (_that) {
case _OtpChallengeDto():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _OtpChallengeDto value)?  $default,){
final _that = this;
switch (_that) {
case _OtpChallengeDto() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String otpToken,  String maskedMobile,  int resendAfterSec,  int codeLength)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _OtpChallengeDto() when $default != null:
return $default(_that.otpToken,_that.maskedMobile,_that.resendAfterSec,_that.codeLength);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String otpToken,  String maskedMobile,  int resendAfterSec,  int codeLength)  $default,) {final _that = this;
switch (_that) {
case _OtpChallengeDto():
return $default(_that.otpToken,_that.maskedMobile,_that.resendAfterSec,_that.codeLength);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String otpToken,  String maskedMobile,  int resendAfterSec,  int codeLength)?  $default,) {final _that = this;
switch (_that) {
case _OtpChallengeDto() when $default != null:
return $default(_that.otpToken,_that.maskedMobile,_that.resendAfterSec,_that.codeLength);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _OtpChallengeDto extends OtpChallengeDto {
  const _OtpChallengeDto({required this.otpToken, required this.maskedMobile, required this.resendAfterSec, this.codeLength = 5}): super._();
  factory _OtpChallengeDto.fromJson(Map<String, dynamic> json) => _$OtpChallengeDtoFromJson(json);

@override final  String otpToken;
@override final  String maskedMobile;
@override final  int resendAfterSec;
@override@JsonKey() final  int codeLength;

/// Create a copy of OtpChallengeDto
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$OtpChallengeDtoCopyWith<_OtpChallengeDto> get copyWith => __$OtpChallengeDtoCopyWithImpl<_OtpChallengeDto>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$OtpChallengeDtoToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _OtpChallengeDto&&(identical(other.otpToken, otpToken) || other.otpToken == otpToken)&&(identical(other.maskedMobile, maskedMobile) || other.maskedMobile == maskedMobile)&&(identical(other.resendAfterSec, resendAfterSec) || other.resendAfterSec == resendAfterSec)&&(identical(other.codeLength, codeLength) || other.codeLength == codeLength));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,otpToken,maskedMobile,resendAfterSec,codeLength);

@override
String toString() {
  return 'OtpChallengeDto(otpToken: $otpToken, maskedMobile: $maskedMobile, resendAfterSec: $resendAfterSec, codeLength: $codeLength)';
}


}

/// @nodoc
abstract mixin class _$OtpChallengeDtoCopyWith<$Res> implements $OtpChallengeDtoCopyWith<$Res> {
  factory _$OtpChallengeDtoCopyWith(_OtpChallengeDto value, $Res Function(_OtpChallengeDto) _then) = __$OtpChallengeDtoCopyWithImpl;
@override @useResult
$Res call({
 String otpToken, String maskedMobile, int resendAfterSec, int codeLength
});




}
/// @nodoc
class __$OtpChallengeDtoCopyWithImpl<$Res>
    implements _$OtpChallengeDtoCopyWith<$Res> {
  __$OtpChallengeDtoCopyWithImpl(this._self, this._then);

  final _OtpChallengeDto _self;
  final $Res Function(_OtpChallengeDto) _then;

/// Create a copy of OtpChallengeDto
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? otpToken = null,Object? maskedMobile = null,Object? resendAfterSec = null,Object? codeLength = null,}) {
  return _then(_OtpChallengeDto(
otpToken: null == otpToken ? _self.otpToken : otpToken // ignore: cast_nullable_to_non_nullable
as String,maskedMobile: null == maskedMobile ? _self.maskedMobile : maskedMobile // ignore: cast_nullable_to_non_nullable
as String,resendAfterSec: null == resendAfterSec ? _self.resendAfterSec : resendAfterSec // ignore: cast_nullable_to_non_nullable
as int,codeLength: null == codeLength ? _self.codeLength : codeLength // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$SessionUserDto {

 String get id; String get fullName; String get mobile;
/// Create a copy of SessionUserDto
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SessionUserDtoCopyWith<SessionUserDto> get copyWith => _$SessionUserDtoCopyWithImpl<SessionUserDto>(this as SessionUserDto, _$identity);

  /// Serializes this SessionUserDto to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SessionUserDto&&(identical(other.id, id) || other.id == id)&&(identical(other.fullName, fullName) || other.fullName == fullName)&&(identical(other.mobile, mobile) || other.mobile == mobile));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,fullName,mobile);

@override
String toString() {
  return 'SessionUserDto(id: $id, fullName: $fullName, mobile: $mobile)';
}


}

/// @nodoc
abstract mixin class $SessionUserDtoCopyWith<$Res>  {
  factory $SessionUserDtoCopyWith(SessionUserDto value, $Res Function(SessionUserDto) _then) = _$SessionUserDtoCopyWithImpl;
@useResult
$Res call({
 String id, String fullName, String mobile
});




}
/// @nodoc
class _$SessionUserDtoCopyWithImpl<$Res>
    implements $SessionUserDtoCopyWith<$Res> {
  _$SessionUserDtoCopyWithImpl(this._self, this._then);

  final SessionUserDto _self;
  final $Res Function(SessionUserDto) _then;

/// Create a copy of SessionUserDto
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? fullName = null,Object? mobile = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,fullName: null == fullName ? _self.fullName : fullName // ignore: cast_nullable_to_non_nullable
as String,mobile: null == mobile ? _self.mobile : mobile // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [SessionUserDto].
extension SessionUserDtoPatterns on SessionUserDto {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SessionUserDto value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SessionUserDto() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SessionUserDto value)  $default,){
final _that = this;
switch (_that) {
case _SessionUserDto():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SessionUserDto value)?  $default,){
final _that = this;
switch (_that) {
case _SessionUserDto() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String fullName,  String mobile)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SessionUserDto() when $default != null:
return $default(_that.id,_that.fullName,_that.mobile);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String fullName,  String mobile)  $default,) {final _that = this;
switch (_that) {
case _SessionUserDto():
return $default(_that.id,_that.fullName,_that.mobile);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String fullName,  String mobile)?  $default,) {final _that = this;
switch (_that) {
case _SessionUserDto() when $default != null:
return $default(_that.id,_that.fullName,_that.mobile);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SessionUserDto implements SessionUserDto {
  const _SessionUserDto({required this.id, required this.fullName, required this.mobile});
  factory _SessionUserDto.fromJson(Map<String, dynamic> json) => _$SessionUserDtoFromJson(json);

@override final  String id;
@override final  String fullName;
@override final  String mobile;

/// Create a copy of SessionUserDto
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SessionUserDtoCopyWith<_SessionUserDto> get copyWith => __$SessionUserDtoCopyWithImpl<_SessionUserDto>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SessionUserDtoToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SessionUserDto&&(identical(other.id, id) || other.id == id)&&(identical(other.fullName, fullName) || other.fullName == fullName)&&(identical(other.mobile, mobile) || other.mobile == mobile));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,fullName,mobile);

@override
String toString() {
  return 'SessionUserDto(id: $id, fullName: $fullName, mobile: $mobile)';
}


}

/// @nodoc
abstract mixin class _$SessionUserDtoCopyWith<$Res> implements $SessionUserDtoCopyWith<$Res> {
  factory _$SessionUserDtoCopyWith(_SessionUserDto value, $Res Function(_SessionUserDto) _then) = __$SessionUserDtoCopyWithImpl;
@override @useResult
$Res call({
 String id, String fullName, String mobile
});




}
/// @nodoc
class __$SessionUserDtoCopyWithImpl<$Res>
    implements _$SessionUserDtoCopyWith<$Res> {
  __$SessionUserDtoCopyWithImpl(this._self, this._then);

  final _SessionUserDto _self;
  final $Res Function(_SessionUserDto) _then;

/// Create a copy of SessionUserDto
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? fullName = null,Object? mobile = null,}) {
  return _then(_SessionUserDto(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,fullName: null == fullName ? _self.fullName : fullName // ignore: cast_nullable_to_non_nullable
as String,mobile: null == mobile ? _self.mobile : mobile // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$SessionOrgDto {

 String get id; String get name;
/// Create a copy of SessionOrgDto
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SessionOrgDtoCopyWith<SessionOrgDto> get copyWith => _$SessionOrgDtoCopyWithImpl<SessionOrgDto>(this as SessionOrgDto, _$identity);

  /// Serializes this SessionOrgDto to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SessionOrgDto&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name);

@override
String toString() {
  return 'SessionOrgDto(id: $id, name: $name)';
}


}

/// @nodoc
abstract mixin class $SessionOrgDtoCopyWith<$Res>  {
  factory $SessionOrgDtoCopyWith(SessionOrgDto value, $Res Function(SessionOrgDto) _then) = _$SessionOrgDtoCopyWithImpl;
@useResult
$Res call({
 String id, String name
});




}
/// @nodoc
class _$SessionOrgDtoCopyWithImpl<$Res>
    implements $SessionOrgDtoCopyWith<$Res> {
  _$SessionOrgDtoCopyWithImpl(this._self, this._then);

  final SessionOrgDto _self;
  final $Res Function(SessionOrgDto) _then;

/// Create a copy of SessionOrgDto
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [SessionOrgDto].
extension SessionOrgDtoPatterns on SessionOrgDto {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SessionOrgDto value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SessionOrgDto() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SessionOrgDto value)  $default,){
final _that = this;
switch (_that) {
case _SessionOrgDto():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SessionOrgDto value)?  $default,){
final _that = this;
switch (_that) {
case _SessionOrgDto() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SessionOrgDto() when $default != null:
return $default(_that.id,_that.name);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name)  $default,) {final _that = this;
switch (_that) {
case _SessionOrgDto():
return $default(_that.id,_that.name);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name)?  $default,) {final _that = this;
switch (_that) {
case _SessionOrgDto() when $default != null:
return $default(_that.id,_that.name);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SessionOrgDto implements SessionOrgDto {
  const _SessionOrgDto({required this.id, required this.name});
  factory _SessionOrgDto.fromJson(Map<String, dynamic> json) => _$SessionOrgDtoFromJson(json);

@override final  String id;
@override final  String name;

/// Create a copy of SessionOrgDto
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SessionOrgDtoCopyWith<_SessionOrgDto> get copyWith => __$SessionOrgDtoCopyWithImpl<_SessionOrgDto>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SessionOrgDtoToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SessionOrgDto&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name);

@override
String toString() {
  return 'SessionOrgDto(id: $id, name: $name)';
}


}

/// @nodoc
abstract mixin class _$SessionOrgDtoCopyWith<$Res> implements $SessionOrgDtoCopyWith<$Res> {
  factory _$SessionOrgDtoCopyWith(_SessionOrgDto value, $Res Function(_SessionOrgDto) _then) = __$SessionOrgDtoCopyWithImpl;
@override @useResult
$Res call({
 String id, String name
});




}
/// @nodoc
class __$SessionOrgDtoCopyWithImpl<$Res>
    implements _$SessionOrgDtoCopyWith<$Res> {
  __$SessionOrgDtoCopyWithImpl(this._self, this._then);

  final _SessionOrgDto _self;
  final $Res Function(_SessionOrgDto) _then;

/// Create a copy of SessionOrgDto
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,}) {
  return _then(_SessionOrgDto(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$SessionDto {

 String get accessToken; int get expiresInSec; SessionUserDto get user; SessionOrgDto get organization;
/// Create a copy of SessionDto
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SessionDtoCopyWith<SessionDto> get copyWith => _$SessionDtoCopyWithImpl<SessionDto>(this as SessionDto, _$identity);

  /// Serializes this SessionDto to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SessionDto&&(identical(other.accessToken, accessToken) || other.accessToken == accessToken)&&(identical(other.expiresInSec, expiresInSec) || other.expiresInSec == expiresInSec)&&(identical(other.user, user) || other.user == user)&&(identical(other.organization, organization) || other.organization == organization));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,accessToken,expiresInSec,user,organization);

@override
String toString() {
  return 'SessionDto(accessToken: $accessToken, expiresInSec: $expiresInSec, user: $user, organization: $organization)';
}


}

/// @nodoc
abstract mixin class $SessionDtoCopyWith<$Res>  {
  factory $SessionDtoCopyWith(SessionDto value, $Res Function(SessionDto) _then) = _$SessionDtoCopyWithImpl;
@useResult
$Res call({
 String accessToken, int expiresInSec, SessionUserDto user, SessionOrgDto organization
});


$SessionUserDtoCopyWith<$Res> get user;$SessionOrgDtoCopyWith<$Res> get organization;

}
/// @nodoc
class _$SessionDtoCopyWithImpl<$Res>
    implements $SessionDtoCopyWith<$Res> {
  _$SessionDtoCopyWithImpl(this._self, this._then);

  final SessionDto _self;
  final $Res Function(SessionDto) _then;

/// Create a copy of SessionDto
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? accessToken = null,Object? expiresInSec = null,Object? user = null,Object? organization = null,}) {
  return _then(_self.copyWith(
accessToken: null == accessToken ? _self.accessToken : accessToken // ignore: cast_nullable_to_non_nullable
as String,expiresInSec: null == expiresInSec ? _self.expiresInSec : expiresInSec // ignore: cast_nullable_to_non_nullable
as int,user: null == user ? _self.user : user // ignore: cast_nullable_to_non_nullable
as SessionUserDto,organization: null == organization ? _self.organization : organization // ignore: cast_nullable_to_non_nullable
as SessionOrgDto,
  ));
}
/// Create a copy of SessionDto
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SessionUserDtoCopyWith<$Res> get user {
  
  return $SessionUserDtoCopyWith<$Res>(_self.user, (value) {
    return _then(_self.copyWith(user: value));
  });
}/// Create a copy of SessionDto
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SessionOrgDtoCopyWith<$Res> get organization {
  
  return $SessionOrgDtoCopyWith<$Res>(_self.organization, (value) {
    return _then(_self.copyWith(organization: value));
  });
}
}


/// Adds pattern-matching-related methods to [SessionDto].
extension SessionDtoPatterns on SessionDto {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SessionDto value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SessionDto() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SessionDto value)  $default,){
final _that = this;
switch (_that) {
case _SessionDto():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SessionDto value)?  $default,){
final _that = this;
switch (_that) {
case _SessionDto() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String accessToken,  int expiresInSec,  SessionUserDto user,  SessionOrgDto organization)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SessionDto() when $default != null:
return $default(_that.accessToken,_that.expiresInSec,_that.user,_that.organization);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String accessToken,  int expiresInSec,  SessionUserDto user,  SessionOrgDto organization)  $default,) {final _that = this;
switch (_that) {
case _SessionDto():
return $default(_that.accessToken,_that.expiresInSec,_that.user,_that.organization);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String accessToken,  int expiresInSec,  SessionUserDto user,  SessionOrgDto organization)?  $default,) {final _that = this;
switch (_that) {
case _SessionDto() when $default != null:
return $default(_that.accessToken,_that.expiresInSec,_that.user,_that.organization);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SessionDto implements SessionDto {
  const _SessionDto({required this.accessToken, required this.expiresInSec, required this.user, required this.organization});
  factory _SessionDto.fromJson(Map<String, dynamic> json) => _$SessionDtoFromJson(json);

@override final  String accessToken;
@override final  int expiresInSec;
@override final  SessionUserDto user;
@override final  SessionOrgDto organization;

/// Create a copy of SessionDto
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SessionDtoCopyWith<_SessionDto> get copyWith => __$SessionDtoCopyWithImpl<_SessionDto>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SessionDtoToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _SessionDto&&(identical(other.accessToken, accessToken) || other.accessToken == accessToken)&&(identical(other.expiresInSec, expiresInSec) || other.expiresInSec == expiresInSec)&&(identical(other.user, user) || other.user == user)&&(identical(other.organization, organization) || other.organization == organization));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,accessToken,expiresInSec,user,organization);

@override
String toString() {
  return 'SessionDto(accessToken: $accessToken, expiresInSec: $expiresInSec, user: $user, organization: $organization)';
}


}

/// @nodoc
abstract mixin class _$SessionDtoCopyWith<$Res> implements $SessionDtoCopyWith<$Res> {
  factory _$SessionDtoCopyWith(_SessionDto value, $Res Function(_SessionDto) _then) = __$SessionDtoCopyWithImpl;
@override @useResult
$Res call({
 String accessToken, int expiresInSec, SessionUserDto user, SessionOrgDto organization
});


@override $SessionUserDtoCopyWith<$Res> get user;@override $SessionOrgDtoCopyWith<$Res> get organization;

}
/// @nodoc
class __$SessionDtoCopyWithImpl<$Res>
    implements _$SessionDtoCopyWith<$Res> {
  __$SessionDtoCopyWithImpl(this._self, this._then);

  final _SessionDto _self;
  final $Res Function(_SessionDto) _then;

/// Create a copy of SessionDto
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? accessToken = null,Object? expiresInSec = null,Object? user = null,Object? organization = null,}) {
  return _then(_SessionDto(
accessToken: null == accessToken ? _self.accessToken : accessToken // ignore: cast_nullable_to_non_nullable
as String,expiresInSec: null == expiresInSec ? _self.expiresInSec : expiresInSec // ignore: cast_nullable_to_non_nullable
as int,user: null == user ? _self.user : user // ignore: cast_nullable_to_non_nullable
as SessionUserDto,organization: null == organization ? _self.organization : organization // ignore: cast_nullable_to_non_nullable
as SessionOrgDto,
  ));
}

/// Create a copy of SessionDto
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SessionUserDtoCopyWith<$Res> get user {
  
  return $SessionUserDtoCopyWith<$Res>(_self.user, (value) {
    return _then(_self.copyWith(user: value));
  });
}/// Create a copy of SessionDto
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SessionOrgDtoCopyWith<$Res> get organization {
  
  return $SessionOrgDtoCopyWith<$Res>(_self.organization, (value) {
    return _then(_self.copyWith(organization: value));
  });
}
}


/// @nodoc
mixin _$AppSessionDto {

 SessionDto get session; String get refreshToken; String? get refreshExpiresAt;
/// Create a copy of AppSessionDto
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$AppSessionDtoCopyWith<AppSessionDto> get copyWith => _$AppSessionDtoCopyWithImpl<AppSessionDto>(this as AppSessionDto, _$identity);

  /// Serializes this AppSessionDto to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is AppSessionDto&&(identical(other.session, session) || other.session == session)&&(identical(other.refreshToken, refreshToken) || other.refreshToken == refreshToken)&&(identical(other.refreshExpiresAt, refreshExpiresAt) || other.refreshExpiresAt == refreshExpiresAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,session,refreshToken,refreshExpiresAt);

@override
String toString() {
  return 'AppSessionDto(session: $session, refreshToken: $refreshToken, refreshExpiresAt: $refreshExpiresAt)';
}


}

/// @nodoc
abstract mixin class $AppSessionDtoCopyWith<$Res>  {
  factory $AppSessionDtoCopyWith(AppSessionDto value, $Res Function(AppSessionDto) _then) = _$AppSessionDtoCopyWithImpl;
@useResult
$Res call({
 SessionDto session, String refreshToken, String? refreshExpiresAt
});


$SessionDtoCopyWith<$Res> get session;

}
/// @nodoc
class _$AppSessionDtoCopyWithImpl<$Res>
    implements $AppSessionDtoCopyWith<$Res> {
  _$AppSessionDtoCopyWithImpl(this._self, this._then);

  final AppSessionDto _self;
  final $Res Function(AppSessionDto) _then;

/// Create a copy of AppSessionDto
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? session = null,Object? refreshToken = null,Object? refreshExpiresAt = freezed,}) {
  return _then(_self.copyWith(
session: null == session ? _self.session : session // ignore: cast_nullable_to_non_nullable
as SessionDto,refreshToken: null == refreshToken ? _self.refreshToken : refreshToken // ignore: cast_nullable_to_non_nullable
as String,refreshExpiresAt: freezed == refreshExpiresAt ? _self.refreshExpiresAt : refreshExpiresAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}
/// Create a copy of AppSessionDto
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SessionDtoCopyWith<$Res> get session {
  
  return $SessionDtoCopyWith<$Res>(_self.session, (value) {
    return _then(_self.copyWith(session: value));
  });
}
}


/// Adds pattern-matching-related methods to [AppSessionDto].
extension AppSessionDtoPatterns on AppSessionDto {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _AppSessionDto value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _AppSessionDto() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _AppSessionDto value)  $default,){
final _that = this;
switch (_that) {
case _AppSessionDto():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _AppSessionDto value)?  $default,){
final _that = this;
switch (_that) {
case _AppSessionDto() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( SessionDto session,  String refreshToken,  String? refreshExpiresAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _AppSessionDto() when $default != null:
return $default(_that.session,_that.refreshToken,_that.refreshExpiresAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( SessionDto session,  String refreshToken,  String? refreshExpiresAt)  $default,) {final _that = this;
switch (_that) {
case _AppSessionDto():
return $default(_that.session,_that.refreshToken,_that.refreshExpiresAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( SessionDto session,  String refreshToken,  String? refreshExpiresAt)?  $default,) {final _that = this;
switch (_that) {
case _AppSessionDto() when $default != null:
return $default(_that.session,_that.refreshToken,_that.refreshExpiresAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _AppSessionDto extends AppSessionDto {
  const _AppSessionDto({required this.session, required this.refreshToken, this.refreshExpiresAt}): super._();
  factory _AppSessionDto.fromJson(Map<String, dynamic> json) => _$AppSessionDtoFromJson(json);

@override final  SessionDto session;
@override final  String refreshToken;
@override final  String? refreshExpiresAt;

/// Create a copy of AppSessionDto
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$AppSessionDtoCopyWith<_AppSessionDto> get copyWith => __$AppSessionDtoCopyWithImpl<_AppSessionDto>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$AppSessionDtoToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _AppSessionDto&&(identical(other.session, session) || other.session == session)&&(identical(other.refreshToken, refreshToken) || other.refreshToken == refreshToken)&&(identical(other.refreshExpiresAt, refreshExpiresAt) || other.refreshExpiresAt == refreshExpiresAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,session,refreshToken,refreshExpiresAt);

@override
String toString() {
  return 'AppSessionDto(session: $session, refreshToken: $refreshToken, refreshExpiresAt: $refreshExpiresAt)';
}


}

/// @nodoc
abstract mixin class _$AppSessionDtoCopyWith<$Res> implements $AppSessionDtoCopyWith<$Res> {
  factory _$AppSessionDtoCopyWith(_AppSessionDto value, $Res Function(_AppSessionDto) _then) = __$AppSessionDtoCopyWithImpl;
@override @useResult
$Res call({
 SessionDto session, String refreshToken, String? refreshExpiresAt
});


@override $SessionDtoCopyWith<$Res> get session;

}
/// @nodoc
class __$AppSessionDtoCopyWithImpl<$Res>
    implements _$AppSessionDtoCopyWith<$Res> {
  __$AppSessionDtoCopyWithImpl(this._self, this._then);

  final _AppSessionDto _self;
  final $Res Function(_AppSessionDto) _then;

/// Create a copy of AppSessionDto
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? session = null,Object? refreshToken = null,Object? refreshExpiresAt = freezed,}) {
  return _then(_AppSessionDto(
session: null == session ? _self.session : session // ignore: cast_nullable_to_non_nullable
as SessionDto,refreshToken: null == refreshToken ? _self.refreshToken : refreshToken // ignore: cast_nullable_to_non_nullable
as String,refreshExpiresAt: freezed == refreshExpiresAt ? _self.refreshExpiresAt : refreshExpiresAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

/// Create a copy of AppSessionDto
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SessionDtoCopyWith<$Res> get session {
  
  return $SessionDtoCopyWith<$Res>(_self.session, (value) {
    return _then(_self.copyWith(session: value));
  });
}
}


/// @nodoc
mixin _$StoredUserDto {

 String get id; String get fullName; String get mobile; String get organizationName;
/// Create a copy of StoredUserDto
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$StoredUserDtoCopyWith<StoredUserDto> get copyWith => _$StoredUserDtoCopyWithImpl<StoredUserDto>(this as StoredUserDto, _$identity);

  /// Serializes this StoredUserDto to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is StoredUserDto&&(identical(other.id, id) || other.id == id)&&(identical(other.fullName, fullName) || other.fullName == fullName)&&(identical(other.mobile, mobile) || other.mobile == mobile)&&(identical(other.organizationName, organizationName) || other.organizationName == organizationName));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,fullName,mobile,organizationName);

@override
String toString() {
  return 'StoredUserDto(id: $id, fullName: $fullName, mobile: $mobile, organizationName: $organizationName)';
}


}

/// @nodoc
abstract mixin class $StoredUserDtoCopyWith<$Res>  {
  factory $StoredUserDtoCopyWith(StoredUserDto value, $Res Function(StoredUserDto) _then) = _$StoredUserDtoCopyWithImpl;
@useResult
$Res call({
 String id, String fullName, String mobile, String organizationName
});




}
/// @nodoc
class _$StoredUserDtoCopyWithImpl<$Res>
    implements $StoredUserDtoCopyWith<$Res> {
  _$StoredUserDtoCopyWithImpl(this._self, this._then);

  final StoredUserDto _self;
  final $Res Function(StoredUserDto) _then;

/// Create a copy of StoredUserDto
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? fullName = null,Object? mobile = null,Object? organizationName = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,fullName: null == fullName ? _self.fullName : fullName // ignore: cast_nullable_to_non_nullable
as String,mobile: null == mobile ? _self.mobile : mobile // ignore: cast_nullable_to_non_nullable
as String,organizationName: null == organizationName ? _self.organizationName : organizationName // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [StoredUserDto].
extension StoredUserDtoPatterns on StoredUserDto {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _StoredUserDto value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _StoredUserDto() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _StoredUserDto value)  $default,){
final _that = this;
switch (_that) {
case _StoredUserDto():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _StoredUserDto value)?  $default,){
final _that = this;
switch (_that) {
case _StoredUserDto() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String fullName,  String mobile,  String organizationName)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _StoredUserDto() when $default != null:
return $default(_that.id,_that.fullName,_that.mobile,_that.organizationName);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String fullName,  String mobile,  String organizationName)  $default,) {final _that = this;
switch (_that) {
case _StoredUserDto():
return $default(_that.id,_that.fullName,_that.mobile,_that.organizationName);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String fullName,  String mobile,  String organizationName)?  $default,) {final _that = this;
switch (_that) {
case _StoredUserDto() when $default != null:
return $default(_that.id,_that.fullName,_that.mobile,_that.organizationName);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _StoredUserDto extends StoredUserDto {
  const _StoredUserDto({required this.id, required this.fullName, required this.mobile, required this.organizationName}): super._();
  factory _StoredUserDto.fromJson(Map<String, dynamic> json) => _$StoredUserDtoFromJson(json);

@override final  String id;
@override final  String fullName;
@override final  String mobile;
@override final  String organizationName;

/// Create a copy of StoredUserDto
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$StoredUserDtoCopyWith<_StoredUserDto> get copyWith => __$StoredUserDtoCopyWithImpl<_StoredUserDto>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$StoredUserDtoToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _StoredUserDto&&(identical(other.id, id) || other.id == id)&&(identical(other.fullName, fullName) || other.fullName == fullName)&&(identical(other.mobile, mobile) || other.mobile == mobile)&&(identical(other.organizationName, organizationName) || other.organizationName == organizationName));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,fullName,mobile,organizationName);

@override
String toString() {
  return 'StoredUserDto(id: $id, fullName: $fullName, mobile: $mobile, organizationName: $organizationName)';
}


}

/// @nodoc
abstract mixin class _$StoredUserDtoCopyWith<$Res> implements $StoredUserDtoCopyWith<$Res> {
  factory _$StoredUserDtoCopyWith(_StoredUserDto value, $Res Function(_StoredUserDto) _then) = __$StoredUserDtoCopyWithImpl;
@override @useResult
$Res call({
 String id, String fullName, String mobile, String organizationName
});




}
/// @nodoc
class __$StoredUserDtoCopyWithImpl<$Res>
    implements _$StoredUserDtoCopyWith<$Res> {
  __$StoredUserDtoCopyWithImpl(this._self, this._then);

  final _StoredUserDto _self;
  final $Res Function(_StoredUserDto) _then;

/// Create a copy of StoredUserDto
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? fullName = null,Object? mobile = null,Object? organizationName = null,}) {
  return _then(_StoredUserDto(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,fullName: null == fullName ? _self.fullName : fullName // ignore: cast_nullable_to_non_nullable
as String,mobile: null == mobile ? _self.mobile : mobile // ignore: cast_nullable_to_non_nullable
as String,organizationName: null == organizationName ? _self.organizationName : organizationName // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

// dart format on
