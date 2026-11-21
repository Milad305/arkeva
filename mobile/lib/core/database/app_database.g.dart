// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_database.dart';

// ignore_for_file: type=lint
class $ProjectsTable extends Projects
    with TableInfo<$ProjectsTable, ProjectRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $ProjectsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
    'name',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _siteLatMeta = const VerificationMeta(
    'siteLat',
  );
  @override
  late final GeneratedColumn<double> siteLat = GeneratedColumn<double>(
    'site_lat',
    aliasedName,
    true,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _siteLngMeta = const VerificationMeta(
    'siteLng',
  );
  @override
  late final GeneratedColumn<double> siteLng = GeneratedColumn<double>(
    'site_lng',
    aliasedName,
    true,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _radiusMMeta = const VerificationMeta(
    'radiusM',
  );
  @override
  late final GeneratedColumn<double> radiusM = GeneratedColumn<double>(
    'radius_m',
    aliasedName,
    true,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _minPhotosMeta = const VerificationMeta(
    'minPhotos',
  );
  @override
  late final GeneratedColumn<int> minPhotos = GeneratedColumn<int>(
    'min_photos',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _maxJumpPctMeta = const VerificationMeta(
    'maxJumpPct',
  );
  @override
  late final GeneratedColumn<double> maxJumpPct = GeneratedColumn<double>(
    'max_jump_pct',
    aliasedName,
    true,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _allowDecreaseMeta = const VerificationMeta(
    'allowDecrease',
  );
  @override
  late final GeneratedColumn<bool> allowDecrease = GeneratedColumn<bool>(
    'allow_decrease',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("allow_decrease" IN (0, 1))',
    ),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _lateAfterHoursMeta = const VerificationMeta(
    'lateAfterHours',
  );
  @override
  late final GeneratedColumn<int> lateAfterHours = GeneratedColumn<int>(
    'late_after_hours',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _gpsModeMeta = const VerificationMeta(
    'gpsMode',
  );
  @override
  late final GeneratedColumn<String> gpsMode = GeneratedColumn<String>(
    'gps_mode',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _approvalModeMeta = const VerificationMeta(
    'approvalMode',
  );
  @override
  late final GeneratedColumn<String> approvalMode = GeneratedColumn<String>(
    'approval_mode',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _calendarJsonMeta = const VerificationMeta(
    'calendarJson',
  );
  @override
  late final GeneratedColumn<String> calendarJson = GeneratedColumn<String>(
    'calendar_json',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('{}'),
  );
  static const VerificationMeta _reminderEnabledMeta = const VerificationMeta(
    'reminderEnabled',
  );
  @override
  late final GeneratedColumn<bool> reminderEnabled = GeneratedColumn<bool>(
    'reminder_enabled',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("reminder_enabled" IN (0, 1))',
    ),
    defaultValue: const Constant(true),
  );
  static const VerificationMeta _reminderTimeMeta = const VerificationMeta(
    'reminderTime',
  );
  @override
  late final GeneratedColumn<String> reminderTime = GeneratedColumn<String>(
    'reminder_time',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('17:00'),
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    name,
    siteLat,
    siteLng,
    radiusM,
    minPhotos,
    maxJumpPct,
    allowDecrease,
    lateAfterHours,
    gpsMode,
    approvalMode,
    calendarJson,
    reminderEnabled,
    reminderTime,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'projects';
  @override
  VerificationContext validateIntegrity(
    Insertable<ProjectRow> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('name')) {
      context.handle(
        _nameMeta,
        name.isAcceptableOrUnknown(data['name']!, _nameMeta),
      );
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('site_lat')) {
      context.handle(
        _siteLatMeta,
        siteLat.isAcceptableOrUnknown(data['site_lat']!, _siteLatMeta),
      );
    }
    if (data.containsKey('site_lng')) {
      context.handle(
        _siteLngMeta,
        siteLng.isAcceptableOrUnknown(data['site_lng']!, _siteLngMeta),
      );
    }
    if (data.containsKey('radius_m')) {
      context.handle(
        _radiusMMeta,
        radiusM.isAcceptableOrUnknown(data['radius_m']!, _radiusMMeta),
      );
    }
    if (data.containsKey('min_photos')) {
      context.handle(
        _minPhotosMeta,
        minPhotos.isAcceptableOrUnknown(data['min_photos']!, _minPhotosMeta),
      );
    }
    if (data.containsKey('max_jump_pct')) {
      context.handle(
        _maxJumpPctMeta,
        maxJumpPct.isAcceptableOrUnknown(
          data['max_jump_pct']!,
          _maxJumpPctMeta,
        ),
      );
    }
    if (data.containsKey('allow_decrease')) {
      context.handle(
        _allowDecreaseMeta,
        allowDecrease.isAcceptableOrUnknown(
          data['allow_decrease']!,
          _allowDecreaseMeta,
        ),
      );
    }
    if (data.containsKey('late_after_hours')) {
      context.handle(
        _lateAfterHoursMeta,
        lateAfterHours.isAcceptableOrUnknown(
          data['late_after_hours']!,
          _lateAfterHoursMeta,
        ),
      );
    }
    if (data.containsKey('gps_mode')) {
      context.handle(
        _gpsModeMeta,
        gpsMode.isAcceptableOrUnknown(data['gps_mode']!, _gpsModeMeta),
      );
    }
    if (data.containsKey('approval_mode')) {
      context.handle(
        _approvalModeMeta,
        approvalMode.isAcceptableOrUnknown(
          data['approval_mode']!,
          _approvalModeMeta,
        ),
      );
    }
    if (data.containsKey('calendar_json')) {
      context.handle(
        _calendarJsonMeta,
        calendarJson.isAcceptableOrUnknown(
          data['calendar_json']!,
          _calendarJsonMeta,
        ),
      );
    }
    if (data.containsKey('reminder_enabled')) {
      context.handle(
        _reminderEnabledMeta,
        reminderEnabled.isAcceptableOrUnknown(
          data['reminder_enabled']!,
          _reminderEnabledMeta,
        ),
      );
    }
    if (data.containsKey('reminder_time')) {
      context.handle(
        _reminderTimeMeta,
        reminderTime.isAcceptableOrUnknown(
          data['reminder_time']!,
          _reminderTimeMeta,
        ),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  ProjectRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return ProjectRow(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      name: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}name'],
      )!,
      siteLat: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}site_lat'],
      ),
      siteLng: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}site_lng'],
      ),
      radiusM: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}radius_m'],
      ),
      minPhotos: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}min_photos'],
      )!,
      maxJumpPct: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}max_jump_pct'],
      ),
      allowDecrease: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}allow_decrease'],
      )!,
      lateAfterHours: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}late_after_hours'],
      ),
      gpsMode: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}gps_mode'],
      ),
      approvalMode: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}approval_mode'],
      ),
      calendarJson: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}calendar_json'],
      )!,
      reminderEnabled: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}reminder_enabled'],
      )!,
      reminderTime: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}reminder_time'],
      )!,
    );
  }

  @override
  $ProjectsTable createAlias(String alias) {
    return $ProjectsTable(attachedDatabase, alias);
  }
}

class ProjectRow extends DataClass implements Insertable<ProjectRow> {
  final String id;
  final String name;
  final double? siteLat;
  final double? siteLng;
  final double? radiusM;
  final int minPhotos;
  final double? maxJumpPct;
  final bool allowDecrease;
  final int? lateAfterHours;
  final String? gpsMode;
  final String? approvalMode;
  final String calendarJson;

  /// یادآوری روزانهٔ پروژه (`rules.dailyReminder`؛ NT-FLD-04)؛ از نسخهٔ ۲ پایگاه داده.
  final bool reminderEnabled;
  final String reminderTime;
  const ProjectRow({
    required this.id,
    required this.name,
    this.siteLat,
    this.siteLng,
    this.radiusM,
    required this.minPhotos,
    this.maxJumpPct,
    required this.allowDecrease,
    this.lateAfterHours,
    this.gpsMode,
    this.approvalMode,
    required this.calendarJson,
    required this.reminderEnabled,
    required this.reminderTime,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['name'] = Variable<String>(name);
    if (!nullToAbsent || siteLat != null) {
      map['site_lat'] = Variable<double>(siteLat);
    }
    if (!nullToAbsent || siteLng != null) {
      map['site_lng'] = Variable<double>(siteLng);
    }
    if (!nullToAbsent || radiusM != null) {
      map['radius_m'] = Variable<double>(radiusM);
    }
    map['min_photos'] = Variable<int>(minPhotos);
    if (!nullToAbsent || maxJumpPct != null) {
      map['max_jump_pct'] = Variable<double>(maxJumpPct);
    }
    map['allow_decrease'] = Variable<bool>(allowDecrease);
    if (!nullToAbsent || lateAfterHours != null) {
      map['late_after_hours'] = Variable<int>(lateAfterHours);
    }
    if (!nullToAbsent || gpsMode != null) {
      map['gps_mode'] = Variable<String>(gpsMode);
    }
    if (!nullToAbsent || approvalMode != null) {
      map['approval_mode'] = Variable<String>(approvalMode);
    }
    map['calendar_json'] = Variable<String>(calendarJson);
    map['reminder_enabled'] = Variable<bool>(reminderEnabled);
    map['reminder_time'] = Variable<String>(reminderTime);
    return map;
  }

  ProjectsCompanion toCompanion(bool nullToAbsent) {
    return ProjectsCompanion(
      id: Value(id),
      name: Value(name),
      siteLat: siteLat == null && nullToAbsent
          ? const Value.absent()
          : Value(siteLat),
      siteLng: siteLng == null && nullToAbsent
          ? const Value.absent()
          : Value(siteLng),
      radiusM: radiusM == null && nullToAbsent
          ? const Value.absent()
          : Value(radiusM),
      minPhotos: Value(minPhotos),
      maxJumpPct: maxJumpPct == null && nullToAbsent
          ? const Value.absent()
          : Value(maxJumpPct),
      allowDecrease: Value(allowDecrease),
      lateAfterHours: lateAfterHours == null && nullToAbsent
          ? const Value.absent()
          : Value(lateAfterHours),
      gpsMode: gpsMode == null && nullToAbsent
          ? const Value.absent()
          : Value(gpsMode),
      approvalMode: approvalMode == null && nullToAbsent
          ? const Value.absent()
          : Value(approvalMode),
      calendarJson: Value(calendarJson),
      reminderEnabled: Value(reminderEnabled),
      reminderTime: Value(reminderTime),
    );
  }

  factory ProjectRow.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return ProjectRow(
      id: serializer.fromJson<String>(json['id']),
      name: serializer.fromJson<String>(json['name']),
      siteLat: serializer.fromJson<double?>(json['siteLat']),
      siteLng: serializer.fromJson<double?>(json['siteLng']),
      radiusM: serializer.fromJson<double?>(json['radiusM']),
      minPhotos: serializer.fromJson<int>(json['minPhotos']),
      maxJumpPct: serializer.fromJson<double?>(json['maxJumpPct']),
      allowDecrease: serializer.fromJson<bool>(json['allowDecrease']),
      lateAfterHours: serializer.fromJson<int?>(json['lateAfterHours']),
      gpsMode: serializer.fromJson<String?>(json['gpsMode']),
      approvalMode: serializer.fromJson<String?>(json['approvalMode']),
      calendarJson: serializer.fromJson<String>(json['calendarJson']),
      reminderEnabled: serializer.fromJson<bool>(json['reminderEnabled']),
      reminderTime: serializer.fromJson<String>(json['reminderTime']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'name': serializer.toJson<String>(name),
      'siteLat': serializer.toJson<double?>(siteLat),
      'siteLng': serializer.toJson<double?>(siteLng),
      'radiusM': serializer.toJson<double?>(radiusM),
      'minPhotos': serializer.toJson<int>(minPhotos),
      'maxJumpPct': serializer.toJson<double?>(maxJumpPct),
      'allowDecrease': serializer.toJson<bool>(allowDecrease),
      'lateAfterHours': serializer.toJson<int?>(lateAfterHours),
      'gpsMode': serializer.toJson<String?>(gpsMode),
      'approvalMode': serializer.toJson<String?>(approvalMode),
      'calendarJson': serializer.toJson<String>(calendarJson),
      'reminderEnabled': serializer.toJson<bool>(reminderEnabled),
      'reminderTime': serializer.toJson<String>(reminderTime),
    };
  }

  ProjectRow copyWith({
    String? id,
    String? name,
    Value<double?> siteLat = const Value.absent(),
    Value<double?> siteLng = const Value.absent(),
    Value<double?> radiusM = const Value.absent(),
    int? minPhotos,
    Value<double?> maxJumpPct = const Value.absent(),
    bool? allowDecrease,
    Value<int?> lateAfterHours = const Value.absent(),
    Value<String?> gpsMode = const Value.absent(),
    Value<String?> approvalMode = const Value.absent(),
    String? calendarJson,
    bool? reminderEnabled,
    String? reminderTime,
  }) => ProjectRow(
    id: id ?? this.id,
    name: name ?? this.name,
    siteLat: siteLat.present ? siteLat.value : this.siteLat,
    siteLng: siteLng.present ? siteLng.value : this.siteLng,
    radiusM: radiusM.present ? radiusM.value : this.radiusM,
    minPhotos: minPhotos ?? this.minPhotos,
    maxJumpPct: maxJumpPct.present ? maxJumpPct.value : this.maxJumpPct,
    allowDecrease: allowDecrease ?? this.allowDecrease,
    lateAfterHours: lateAfterHours.present
        ? lateAfterHours.value
        : this.lateAfterHours,
    gpsMode: gpsMode.present ? gpsMode.value : this.gpsMode,
    approvalMode: approvalMode.present ? approvalMode.value : this.approvalMode,
    calendarJson: calendarJson ?? this.calendarJson,
    reminderEnabled: reminderEnabled ?? this.reminderEnabled,
    reminderTime: reminderTime ?? this.reminderTime,
  );
  ProjectRow copyWithCompanion(ProjectsCompanion data) {
    return ProjectRow(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
      siteLat: data.siteLat.present ? data.siteLat.value : this.siteLat,
      siteLng: data.siteLng.present ? data.siteLng.value : this.siteLng,
      radiusM: data.radiusM.present ? data.radiusM.value : this.radiusM,
      minPhotos: data.minPhotos.present ? data.minPhotos.value : this.minPhotos,
      maxJumpPct: data.maxJumpPct.present
          ? data.maxJumpPct.value
          : this.maxJumpPct,
      allowDecrease: data.allowDecrease.present
          ? data.allowDecrease.value
          : this.allowDecrease,
      lateAfterHours: data.lateAfterHours.present
          ? data.lateAfterHours.value
          : this.lateAfterHours,
      gpsMode: data.gpsMode.present ? data.gpsMode.value : this.gpsMode,
      approvalMode: data.approvalMode.present
          ? data.approvalMode.value
          : this.approvalMode,
      calendarJson: data.calendarJson.present
          ? data.calendarJson.value
          : this.calendarJson,
      reminderEnabled: data.reminderEnabled.present
          ? data.reminderEnabled.value
          : this.reminderEnabled,
      reminderTime: data.reminderTime.present
          ? data.reminderTime.value
          : this.reminderTime,
    );
  }

  @override
  String toString() {
    return (StringBuffer('ProjectRow(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('siteLat: $siteLat, ')
          ..write('siteLng: $siteLng, ')
          ..write('radiusM: $radiusM, ')
          ..write('minPhotos: $minPhotos, ')
          ..write('maxJumpPct: $maxJumpPct, ')
          ..write('allowDecrease: $allowDecrease, ')
          ..write('lateAfterHours: $lateAfterHours, ')
          ..write('gpsMode: $gpsMode, ')
          ..write('approvalMode: $approvalMode, ')
          ..write('calendarJson: $calendarJson, ')
          ..write('reminderEnabled: $reminderEnabled, ')
          ..write('reminderTime: $reminderTime')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    name,
    siteLat,
    siteLng,
    radiusM,
    minPhotos,
    maxJumpPct,
    allowDecrease,
    lateAfterHours,
    gpsMode,
    approvalMode,
    calendarJson,
    reminderEnabled,
    reminderTime,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is ProjectRow &&
          other.id == this.id &&
          other.name == this.name &&
          other.siteLat == this.siteLat &&
          other.siteLng == this.siteLng &&
          other.radiusM == this.radiusM &&
          other.minPhotos == this.minPhotos &&
          other.maxJumpPct == this.maxJumpPct &&
          other.allowDecrease == this.allowDecrease &&
          other.lateAfterHours == this.lateAfterHours &&
          other.gpsMode == this.gpsMode &&
          other.approvalMode == this.approvalMode &&
          other.calendarJson == this.calendarJson &&
          other.reminderEnabled == this.reminderEnabled &&
          other.reminderTime == this.reminderTime);
}

class ProjectsCompanion extends UpdateCompanion<ProjectRow> {
  final Value<String> id;
  final Value<String> name;
  final Value<double?> siteLat;
  final Value<double?> siteLng;
  final Value<double?> radiusM;
  final Value<int> minPhotos;
  final Value<double?> maxJumpPct;
  final Value<bool> allowDecrease;
  final Value<int?> lateAfterHours;
  final Value<String?> gpsMode;
  final Value<String?> approvalMode;
  final Value<String> calendarJson;
  final Value<bool> reminderEnabled;
  final Value<String> reminderTime;
  final Value<int> rowid;
  const ProjectsCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
    this.siteLat = const Value.absent(),
    this.siteLng = const Value.absent(),
    this.radiusM = const Value.absent(),
    this.minPhotos = const Value.absent(),
    this.maxJumpPct = const Value.absent(),
    this.allowDecrease = const Value.absent(),
    this.lateAfterHours = const Value.absent(),
    this.gpsMode = const Value.absent(),
    this.approvalMode = const Value.absent(),
    this.calendarJson = const Value.absent(),
    this.reminderEnabled = const Value.absent(),
    this.reminderTime = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  ProjectsCompanion.insert({
    required String id,
    required String name,
    this.siteLat = const Value.absent(),
    this.siteLng = const Value.absent(),
    this.radiusM = const Value.absent(),
    this.minPhotos = const Value.absent(),
    this.maxJumpPct = const Value.absent(),
    this.allowDecrease = const Value.absent(),
    this.lateAfterHours = const Value.absent(),
    this.gpsMode = const Value.absent(),
    this.approvalMode = const Value.absent(),
    this.calendarJson = const Value.absent(),
    this.reminderEnabled = const Value.absent(),
    this.reminderTime = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       name = Value(name);
  static Insertable<ProjectRow> custom({
    Expression<String>? id,
    Expression<String>? name,
    Expression<double>? siteLat,
    Expression<double>? siteLng,
    Expression<double>? radiusM,
    Expression<int>? minPhotos,
    Expression<double>? maxJumpPct,
    Expression<bool>? allowDecrease,
    Expression<int>? lateAfterHours,
    Expression<String>? gpsMode,
    Expression<String>? approvalMode,
    Expression<String>? calendarJson,
    Expression<bool>? reminderEnabled,
    Expression<String>? reminderTime,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (siteLat != null) 'site_lat': siteLat,
      if (siteLng != null) 'site_lng': siteLng,
      if (radiusM != null) 'radius_m': radiusM,
      if (minPhotos != null) 'min_photos': minPhotos,
      if (maxJumpPct != null) 'max_jump_pct': maxJumpPct,
      if (allowDecrease != null) 'allow_decrease': allowDecrease,
      if (lateAfterHours != null) 'late_after_hours': lateAfterHours,
      if (gpsMode != null) 'gps_mode': gpsMode,
      if (approvalMode != null) 'approval_mode': approvalMode,
      if (calendarJson != null) 'calendar_json': calendarJson,
      if (reminderEnabled != null) 'reminder_enabled': reminderEnabled,
      if (reminderTime != null) 'reminder_time': reminderTime,
      if (rowid != null) 'rowid': rowid,
    });
  }

  ProjectsCompanion copyWith({
    Value<String>? id,
    Value<String>? name,
    Value<double?>? siteLat,
    Value<double?>? siteLng,
    Value<double?>? radiusM,
    Value<int>? minPhotos,
    Value<double?>? maxJumpPct,
    Value<bool>? allowDecrease,
    Value<int?>? lateAfterHours,
    Value<String?>? gpsMode,
    Value<String?>? approvalMode,
    Value<String>? calendarJson,
    Value<bool>? reminderEnabled,
    Value<String>? reminderTime,
    Value<int>? rowid,
  }) {
    return ProjectsCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
      siteLat: siteLat ?? this.siteLat,
      siteLng: siteLng ?? this.siteLng,
      radiusM: radiusM ?? this.radiusM,
      minPhotos: minPhotos ?? this.minPhotos,
      maxJumpPct: maxJumpPct ?? this.maxJumpPct,
      allowDecrease: allowDecrease ?? this.allowDecrease,
      lateAfterHours: lateAfterHours ?? this.lateAfterHours,
      gpsMode: gpsMode ?? this.gpsMode,
      approvalMode: approvalMode ?? this.approvalMode,
      calendarJson: calendarJson ?? this.calendarJson,
      reminderEnabled: reminderEnabled ?? this.reminderEnabled,
      reminderTime: reminderTime ?? this.reminderTime,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (siteLat.present) {
      map['site_lat'] = Variable<double>(siteLat.value);
    }
    if (siteLng.present) {
      map['site_lng'] = Variable<double>(siteLng.value);
    }
    if (radiusM.present) {
      map['radius_m'] = Variable<double>(radiusM.value);
    }
    if (minPhotos.present) {
      map['min_photos'] = Variable<int>(minPhotos.value);
    }
    if (maxJumpPct.present) {
      map['max_jump_pct'] = Variable<double>(maxJumpPct.value);
    }
    if (allowDecrease.present) {
      map['allow_decrease'] = Variable<bool>(allowDecrease.value);
    }
    if (lateAfterHours.present) {
      map['late_after_hours'] = Variable<int>(lateAfterHours.value);
    }
    if (gpsMode.present) {
      map['gps_mode'] = Variable<String>(gpsMode.value);
    }
    if (approvalMode.present) {
      map['approval_mode'] = Variable<String>(approvalMode.value);
    }
    if (calendarJson.present) {
      map['calendar_json'] = Variable<String>(calendarJson.value);
    }
    if (reminderEnabled.present) {
      map['reminder_enabled'] = Variable<bool>(reminderEnabled.value);
    }
    if (reminderTime.present) {
      map['reminder_time'] = Variable<String>(reminderTime.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('ProjectsCompanion(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('siteLat: $siteLat, ')
          ..write('siteLng: $siteLng, ')
          ..write('radiusM: $radiusM, ')
          ..write('minPhotos: $minPhotos, ')
          ..write('maxJumpPct: $maxJumpPct, ')
          ..write('allowDecrease: $allowDecrease, ')
          ..write('lateAfterHours: $lateAfterHours, ')
          ..write('gpsMode: $gpsMode, ')
          ..write('approvalMode: $approvalMode, ')
          ..write('calendarJson: $calendarJson, ')
          ..write('reminderEnabled: $reminderEnabled, ')
          ..write('reminderTime: $reminderTime, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $ActivitiesTable extends Activities
    with TableInfo<$ActivitiesTable, ActivityRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $ActivitiesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _projectIdMeta = const VerificationMeta(
    'projectId',
  );
  @override
  late final GeneratedColumn<String> projectId = GeneratedColumn<String>(
    'project_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _parentIdMeta = const VerificationMeta(
    'parentId',
  );
  @override
  late final GeneratedColumn<String> parentId = GeneratedColumn<String>(
    'parent_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _codeMeta = const VerificationMeta('code');
  @override
  late final GeneratedColumn<String> code = GeneratedColumn<String>(
    'code',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _titleMeta = const VerificationMeta('title');
  @override
  late final GeneratedColumn<String> title = GeneratedColumn<String>(
    'title',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _methodMeta = const VerificationMeta('method');
  @override
  late final GeneratedColumn<String> method = GeneratedColumn<String>(
    'method',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _unitMeta = const VerificationMeta('unit');
  @override
  late final GeneratedColumn<String> unit = GeneratedColumn<String>(
    'unit',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _totalQuantityMeta = const VerificationMeta(
    'totalQuantity',
  );
  @override
  late final GeneratedColumn<double> totalQuantity = GeneratedColumn<double>(
    'total_quantity',
    aliasedName,
    true,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _stepsJsonMeta = const VerificationMeta(
    'stepsJson',
  );
  @override
  late final GeneratedColumn<String> stepsJson = GeneratedColumn<String>(
    'steps_json',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _plannedStartMeta = const VerificationMeta(
    'plannedStart',
  );
  @override
  late final GeneratedColumn<String> plannedStart = GeneratedColumn<String>(
    'planned_start',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _plannedFinishMeta = const VerificationMeta(
    'plannedFinish',
  );
  @override
  late final GeneratedColumn<String> plannedFinish = GeneratedColumn<String>(
    'planned_finish',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _approvedPercentMeta = const VerificationMeta(
    'approvedPercent',
  );
  @override
  late final GeneratedColumn<double> approvedPercent = GeneratedColumn<double>(
    'approved_percent',
    aliasedName,
    false,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _approvedQuantityMeta = const VerificationMeta(
    'approvedQuantity',
  );
  @override
  late final GeneratedColumn<double> approvedQuantity = GeneratedColumn<double>(
    'approved_quantity',
    aliasedName,
    true,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _lastPendingPercentMeta =
      const VerificationMeta('lastPendingPercent');
  @override
  late final GeneratedColumn<double> lastPendingPercent =
      GeneratedColumn<double>(
        'last_pending_percent',
        aliasedName,
        true,
        type: DriftSqlType.double,
        requiredDuringInsert: false,
      );
  static const VerificationMeta _planJsonMeta = const VerificationMeta(
    'planJson',
  );
  @override
  late final GeneratedColumn<String> planJson = GeneratedColumn<String>(
    'plan_json',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('[]'),
  );
  static const VerificationMeta _approverUserIdMeta = const VerificationMeta(
    'approverUserId',
  );
  @override
  late final GeneratedColumn<String> approverUserId = GeneratedColumn<String>(
    'approver_user_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _approverNameMeta = const VerificationMeta(
    'approverName',
  );
  @override
  late final GeneratedColumn<String> approverName = GeneratedColumn<String>(
    'approver_name',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    projectId,
    parentId,
    code,
    title,
    method,
    unit,
    totalQuantity,
    stepsJson,
    plannedStart,
    plannedFinish,
    approvedPercent,
    approvedQuantity,
    lastPendingPercent,
    planJson,
    approverUserId,
    approverName,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'activities';
  @override
  VerificationContext validateIntegrity(
    Insertable<ActivityRow> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('project_id')) {
      context.handle(
        _projectIdMeta,
        projectId.isAcceptableOrUnknown(data['project_id']!, _projectIdMeta),
      );
    } else if (isInserting) {
      context.missing(_projectIdMeta);
    }
    if (data.containsKey('parent_id')) {
      context.handle(
        _parentIdMeta,
        parentId.isAcceptableOrUnknown(data['parent_id']!, _parentIdMeta),
      );
    }
    if (data.containsKey('code')) {
      context.handle(
        _codeMeta,
        code.isAcceptableOrUnknown(data['code']!, _codeMeta),
      );
    } else if (isInserting) {
      context.missing(_codeMeta);
    }
    if (data.containsKey('title')) {
      context.handle(
        _titleMeta,
        title.isAcceptableOrUnknown(data['title']!, _titleMeta),
      );
    } else if (isInserting) {
      context.missing(_titleMeta);
    }
    if (data.containsKey('method')) {
      context.handle(
        _methodMeta,
        method.isAcceptableOrUnknown(data['method']!, _methodMeta),
      );
    } else if (isInserting) {
      context.missing(_methodMeta);
    }
    if (data.containsKey('unit')) {
      context.handle(
        _unitMeta,
        unit.isAcceptableOrUnknown(data['unit']!, _unitMeta),
      );
    }
    if (data.containsKey('total_quantity')) {
      context.handle(
        _totalQuantityMeta,
        totalQuantity.isAcceptableOrUnknown(
          data['total_quantity']!,
          _totalQuantityMeta,
        ),
      );
    }
    if (data.containsKey('steps_json')) {
      context.handle(
        _stepsJsonMeta,
        stepsJson.isAcceptableOrUnknown(data['steps_json']!, _stepsJsonMeta),
      );
    }
    if (data.containsKey('planned_start')) {
      context.handle(
        _plannedStartMeta,
        plannedStart.isAcceptableOrUnknown(
          data['planned_start']!,
          _plannedStartMeta,
        ),
      );
    }
    if (data.containsKey('planned_finish')) {
      context.handle(
        _plannedFinishMeta,
        plannedFinish.isAcceptableOrUnknown(
          data['planned_finish']!,
          _plannedFinishMeta,
        ),
      );
    }
    if (data.containsKey('approved_percent')) {
      context.handle(
        _approvedPercentMeta,
        approvedPercent.isAcceptableOrUnknown(
          data['approved_percent']!,
          _approvedPercentMeta,
        ),
      );
    }
    if (data.containsKey('approved_quantity')) {
      context.handle(
        _approvedQuantityMeta,
        approvedQuantity.isAcceptableOrUnknown(
          data['approved_quantity']!,
          _approvedQuantityMeta,
        ),
      );
    }
    if (data.containsKey('last_pending_percent')) {
      context.handle(
        _lastPendingPercentMeta,
        lastPendingPercent.isAcceptableOrUnknown(
          data['last_pending_percent']!,
          _lastPendingPercentMeta,
        ),
      );
    }
    if (data.containsKey('plan_json')) {
      context.handle(
        _planJsonMeta,
        planJson.isAcceptableOrUnknown(data['plan_json']!, _planJsonMeta),
      );
    }
    if (data.containsKey('approver_user_id')) {
      context.handle(
        _approverUserIdMeta,
        approverUserId.isAcceptableOrUnknown(
          data['approver_user_id']!,
          _approverUserIdMeta,
        ),
      );
    }
    if (data.containsKey('approver_name')) {
      context.handle(
        _approverNameMeta,
        approverName.isAcceptableOrUnknown(
          data['approver_name']!,
          _approverNameMeta,
        ),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  ActivityRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return ActivityRow(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      projectId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}project_id'],
      )!,
      parentId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}parent_id'],
      ),
      code: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}code'],
      )!,
      title: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}title'],
      )!,
      method: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}method'],
      )!,
      unit: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}unit'],
      ),
      totalQuantity: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}total_quantity'],
      ),
      stepsJson: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}steps_json'],
      ),
      plannedStart: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}planned_start'],
      ),
      plannedFinish: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}planned_finish'],
      ),
      approvedPercent: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}approved_percent'],
      )!,
      approvedQuantity: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}approved_quantity'],
      ),
      lastPendingPercent: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}last_pending_percent'],
      ),
      planJson: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}plan_json'],
      )!,
      approverUserId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}approver_user_id'],
      ),
      approverName: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}approver_name'],
      ),
    );
  }

  @override
  $ActivitiesTable createAlias(String alias) {
    return $ActivitiesTable(attachedDatabase, alias);
  }
}

class ActivityRow extends DataClass implements Insertable<ActivityRow> {
  final String id;
  final String projectId;
  final String? parentId;
  final String code;
  final String title;

  /// quantity | percent | steps
  final String method;
  final String? unit;
  final double? totalQuantity;
  final String? stepsJson;
  final String? plannedStart;
  final String? plannedFinish;
  final double approvedPercent;
  final double? approvedQuantity;
  final double? lastPendingPercent;
  final String planJson;
  final String? approverUserId;
  final String? approverName;
  const ActivityRow({
    required this.id,
    required this.projectId,
    this.parentId,
    required this.code,
    required this.title,
    required this.method,
    this.unit,
    this.totalQuantity,
    this.stepsJson,
    this.plannedStart,
    this.plannedFinish,
    required this.approvedPercent,
    this.approvedQuantity,
    this.lastPendingPercent,
    required this.planJson,
    this.approverUserId,
    this.approverName,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['project_id'] = Variable<String>(projectId);
    if (!nullToAbsent || parentId != null) {
      map['parent_id'] = Variable<String>(parentId);
    }
    map['code'] = Variable<String>(code);
    map['title'] = Variable<String>(title);
    map['method'] = Variable<String>(method);
    if (!nullToAbsent || unit != null) {
      map['unit'] = Variable<String>(unit);
    }
    if (!nullToAbsent || totalQuantity != null) {
      map['total_quantity'] = Variable<double>(totalQuantity);
    }
    if (!nullToAbsent || stepsJson != null) {
      map['steps_json'] = Variable<String>(stepsJson);
    }
    if (!nullToAbsent || plannedStart != null) {
      map['planned_start'] = Variable<String>(plannedStart);
    }
    if (!nullToAbsent || plannedFinish != null) {
      map['planned_finish'] = Variable<String>(plannedFinish);
    }
    map['approved_percent'] = Variable<double>(approvedPercent);
    if (!nullToAbsent || approvedQuantity != null) {
      map['approved_quantity'] = Variable<double>(approvedQuantity);
    }
    if (!nullToAbsent || lastPendingPercent != null) {
      map['last_pending_percent'] = Variable<double>(lastPendingPercent);
    }
    map['plan_json'] = Variable<String>(planJson);
    if (!nullToAbsent || approverUserId != null) {
      map['approver_user_id'] = Variable<String>(approverUserId);
    }
    if (!nullToAbsent || approverName != null) {
      map['approver_name'] = Variable<String>(approverName);
    }
    return map;
  }

  ActivitiesCompanion toCompanion(bool nullToAbsent) {
    return ActivitiesCompanion(
      id: Value(id),
      projectId: Value(projectId),
      parentId: parentId == null && nullToAbsent
          ? const Value.absent()
          : Value(parentId),
      code: Value(code),
      title: Value(title),
      method: Value(method),
      unit: unit == null && nullToAbsent ? const Value.absent() : Value(unit),
      totalQuantity: totalQuantity == null && nullToAbsent
          ? const Value.absent()
          : Value(totalQuantity),
      stepsJson: stepsJson == null && nullToAbsent
          ? const Value.absent()
          : Value(stepsJson),
      plannedStart: plannedStart == null && nullToAbsent
          ? const Value.absent()
          : Value(plannedStart),
      plannedFinish: plannedFinish == null && nullToAbsent
          ? const Value.absent()
          : Value(plannedFinish),
      approvedPercent: Value(approvedPercent),
      approvedQuantity: approvedQuantity == null && nullToAbsent
          ? const Value.absent()
          : Value(approvedQuantity),
      lastPendingPercent: lastPendingPercent == null && nullToAbsent
          ? const Value.absent()
          : Value(lastPendingPercent),
      planJson: Value(planJson),
      approverUserId: approverUserId == null && nullToAbsent
          ? const Value.absent()
          : Value(approverUserId),
      approverName: approverName == null && nullToAbsent
          ? const Value.absent()
          : Value(approverName),
    );
  }

  factory ActivityRow.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return ActivityRow(
      id: serializer.fromJson<String>(json['id']),
      projectId: serializer.fromJson<String>(json['projectId']),
      parentId: serializer.fromJson<String?>(json['parentId']),
      code: serializer.fromJson<String>(json['code']),
      title: serializer.fromJson<String>(json['title']),
      method: serializer.fromJson<String>(json['method']),
      unit: serializer.fromJson<String?>(json['unit']),
      totalQuantity: serializer.fromJson<double?>(json['totalQuantity']),
      stepsJson: serializer.fromJson<String?>(json['stepsJson']),
      plannedStart: serializer.fromJson<String?>(json['plannedStart']),
      plannedFinish: serializer.fromJson<String?>(json['plannedFinish']),
      approvedPercent: serializer.fromJson<double>(json['approvedPercent']),
      approvedQuantity: serializer.fromJson<double?>(json['approvedQuantity']),
      lastPendingPercent: serializer.fromJson<double?>(
        json['lastPendingPercent'],
      ),
      planJson: serializer.fromJson<String>(json['planJson']),
      approverUserId: serializer.fromJson<String?>(json['approverUserId']),
      approverName: serializer.fromJson<String?>(json['approverName']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'projectId': serializer.toJson<String>(projectId),
      'parentId': serializer.toJson<String?>(parentId),
      'code': serializer.toJson<String>(code),
      'title': serializer.toJson<String>(title),
      'method': serializer.toJson<String>(method),
      'unit': serializer.toJson<String?>(unit),
      'totalQuantity': serializer.toJson<double?>(totalQuantity),
      'stepsJson': serializer.toJson<String?>(stepsJson),
      'plannedStart': serializer.toJson<String?>(plannedStart),
      'plannedFinish': serializer.toJson<String?>(plannedFinish),
      'approvedPercent': serializer.toJson<double>(approvedPercent),
      'approvedQuantity': serializer.toJson<double?>(approvedQuantity),
      'lastPendingPercent': serializer.toJson<double?>(lastPendingPercent),
      'planJson': serializer.toJson<String>(planJson),
      'approverUserId': serializer.toJson<String?>(approverUserId),
      'approverName': serializer.toJson<String?>(approverName),
    };
  }

  ActivityRow copyWith({
    String? id,
    String? projectId,
    Value<String?> parentId = const Value.absent(),
    String? code,
    String? title,
    String? method,
    Value<String?> unit = const Value.absent(),
    Value<double?> totalQuantity = const Value.absent(),
    Value<String?> stepsJson = const Value.absent(),
    Value<String?> plannedStart = const Value.absent(),
    Value<String?> plannedFinish = const Value.absent(),
    double? approvedPercent,
    Value<double?> approvedQuantity = const Value.absent(),
    Value<double?> lastPendingPercent = const Value.absent(),
    String? planJson,
    Value<String?> approverUserId = const Value.absent(),
    Value<String?> approverName = const Value.absent(),
  }) => ActivityRow(
    id: id ?? this.id,
    projectId: projectId ?? this.projectId,
    parentId: parentId.present ? parentId.value : this.parentId,
    code: code ?? this.code,
    title: title ?? this.title,
    method: method ?? this.method,
    unit: unit.present ? unit.value : this.unit,
    totalQuantity: totalQuantity.present
        ? totalQuantity.value
        : this.totalQuantity,
    stepsJson: stepsJson.present ? stepsJson.value : this.stepsJson,
    plannedStart: plannedStart.present ? plannedStart.value : this.plannedStart,
    plannedFinish: plannedFinish.present
        ? plannedFinish.value
        : this.plannedFinish,
    approvedPercent: approvedPercent ?? this.approvedPercent,
    approvedQuantity: approvedQuantity.present
        ? approvedQuantity.value
        : this.approvedQuantity,
    lastPendingPercent: lastPendingPercent.present
        ? lastPendingPercent.value
        : this.lastPendingPercent,
    planJson: planJson ?? this.planJson,
    approverUserId: approverUserId.present
        ? approverUserId.value
        : this.approverUserId,
    approverName: approverName.present ? approverName.value : this.approverName,
  );
  ActivityRow copyWithCompanion(ActivitiesCompanion data) {
    return ActivityRow(
      id: data.id.present ? data.id.value : this.id,
      projectId: data.projectId.present ? data.projectId.value : this.projectId,
      parentId: data.parentId.present ? data.parentId.value : this.parentId,
      code: data.code.present ? data.code.value : this.code,
      title: data.title.present ? data.title.value : this.title,
      method: data.method.present ? data.method.value : this.method,
      unit: data.unit.present ? data.unit.value : this.unit,
      totalQuantity: data.totalQuantity.present
          ? data.totalQuantity.value
          : this.totalQuantity,
      stepsJson: data.stepsJson.present ? data.stepsJson.value : this.stepsJson,
      plannedStart: data.plannedStart.present
          ? data.plannedStart.value
          : this.plannedStart,
      plannedFinish: data.plannedFinish.present
          ? data.plannedFinish.value
          : this.plannedFinish,
      approvedPercent: data.approvedPercent.present
          ? data.approvedPercent.value
          : this.approvedPercent,
      approvedQuantity: data.approvedQuantity.present
          ? data.approvedQuantity.value
          : this.approvedQuantity,
      lastPendingPercent: data.lastPendingPercent.present
          ? data.lastPendingPercent.value
          : this.lastPendingPercent,
      planJson: data.planJson.present ? data.planJson.value : this.planJson,
      approverUserId: data.approverUserId.present
          ? data.approverUserId.value
          : this.approverUserId,
      approverName: data.approverName.present
          ? data.approverName.value
          : this.approverName,
    );
  }

  @override
  String toString() {
    return (StringBuffer('ActivityRow(')
          ..write('id: $id, ')
          ..write('projectId: $projectId, ')
          ..write('parentId: $parentId, ')
          ..write('code: $code, ')
          ..write('title: $title, ')
          ..write('method: $method, ')
          ..write('unit: $unit, ')
          ..write('totalQuantity: $totalQuantity, ')
          ..write('stepsJson: $stepsJson, ')
          ..write('plannedStart: $plannedStart, ')
          ..write('plannedFinish: $plannedFinish, ')
          ..write('approvedPercent: $approvedPercent, ')
          ..write('approvedQuantity: $approvedQuantity, ')
          ..write('lastPendingPercent: $lastPendingPercent, ')
          ..write('planJson: $planJson, ')
          ..write('approverUserId: $approverUserId, ')
          ..write('approverName: $approverName')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    projectId,
    parentId,
    code,
    title,
    method,
    unit,
    totalQuantity,
    stepsJson,
    plannedStart,
    plannedFinish,
    approvedPercent,
    approvedQuantity,
    lastPendingPercent,
    planJson,
    approverUserId,
    approverName,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is ActivityRow &&
          other.id == this.id &&
          other.projectId == this.projectId &&
          other.parentId == this.parentId &&
          other.code == this.code &&
          other.title == this.title &&
          other.method == this.method &&
          other.unit == this.unit &&
          other.totalQuantity == this.totalQuantity &&
          other.stepsJson == this.stepsJson &&
          other.plannedStart == this.plannedStart &&
          other.plannedFinish == this.plannedFinish &&
          other.approvedPercent == this.approvedPercent &&
          other.approvedQuantity == this.approvedQuantity &&
          other.lastPendingPercent == this.lastPendingPercent &&
          other.planJson == this.planJson &&
          other.approverUserId == this.approverUserId &&
          other.approverName == this.approverName);
}

class ActivitiesCompanion extends UpdateCompanion<ActivityRow> {
  final Value<String> id;
  final Value<String> projectId;
  final Value<String?> parentId;
  final Value<String> code;
  final Value<String> title;
  final Value<String> method;
  final Value<String?> unit;
  final Value<double?> totalQuantity;
  final Value<String?> stepsJson;
  final Value<String?> plannedStart;
  final Value<String?> plannedFinish;
  final Value<double> approvedPercent;
  final Value<double?> approvedQuantity;
  final Value<double?> lastPendingPercent;
  final Value<String> planJson;
  final Value<String?> approverUserId;
  final Value<String?> approverName;
  final Value<int> rowid;
  const ActivitiesCompanion({
    this.id = const Value.absent(),
    this.projectId = const Value.absent(),
    this.parentId = const Value.absent(),
    this.code = const Value.absent(),
    this.title = const Value.absent(),
    this.method = const Value.absent(),
    this.unit = const Value.absent(),
    this.totalQuantity = const Value.absent(),
    this.stepsJson = const Value.absent(),
    this.plannedStart = const Value.absent(),
    this.plannedFinish = const Value.absent(),
    this.approvedPercent = const Value.absent(),
    this.approvedQuantity = const Value.absent(),
    this.lastPendingPercent = const Value.absent(),
    this.planJson = const Value.absent(),
    this.approverUserId = const Value.absent(),
    this.approverName = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  ActivitiesCompanion.insert({
    required String id,
    required String projectId,
    this.parentId = const Value.absent(),
    required String code,
    required String title,
    required String method,
    this.unit = const Value.absent(),
    this.totalQuantity = const Value.absent(),
    this.stepsJson = const Value.absent(),
    this.plannedStart = const Value.absent(),
    this.plannedFinish = const Value.absent(),
    this.approvedPercent = const Value.absent(),
    this.approvedQuantity = const Value.absent(),
    this.lastPendingPercent = const Value.absent(),
    this.planJson = const Value.absent(),
    this.approverUserId = const Value.absent(),
    this.approverName = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       projectId = Value(projectId),
       code = Value(code),
       title = Value(title),
       method = Value(method);
  static Insertable<ActivityRow> custom({
    Expression<String>? id,
    Expression<String>? projectId,
    Expression<String>? parentId,
    Expression<String>? code,
    Expression<String>? title,
    Expression<String>? method,
    Expression<String>? unit,
    Expression<double>? totalQuantity,
    Expression<String>? stepsJson,
    Expression<String>? plannedStart,
    Expression<String>? plannedFinish,
    Expression<double>? approvedPercent,
    Expression<double>? approvedQuantity,
    Expression<double>? lastPendingPercent,
    Expression<String>? planJson,
    Expression<String>? approverUserId,
    Expression<String>? approverName,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (projectId != null) 'project_id': projectId,
      if (parentId != null) 'parent_id': parentId,
      if (code != null) 'code': code,
      if (title != null) 'title': title,
      if (method != null) 'method': method,
      if (unit != null) 'unit': unit,
      if (totalQuantity != null) 'total_quantity': totalQuantity,
      if (stepsJson != null) 'steps_json': stepsJson,
      if (plannedStart != null) 'planned_start': plannedStart,
      if (plannedFinish != null) 'planned_finish': plannedFinish,
      if (approvedPercent != null) 'approved_percent': approvedPercent,
      if (approvedQuantity != null) 'approved_quantity': approvedQuantity,
      if (lastPendingPercent != null)
        'last_pending_percent': lastPendingPercent,
      if (planJson != null) 'plan_json': planJson,
      if (approverUserId != null) 'approver_user_id': approverUserId,
      if (approverName != null) 'approver_name': approverName,
      if (rowid != null) 'rowid': rowid,
    });
  }

  ActivitiesCompanion copyWith({
    Value<String>? id,
    Value<String>? projectId,
    Value<String?>? parentId,
    Value<String>? code,
    Value<String>? title,
    Value<String>? method,
    Value<String?>? unit,
    Value<double?>? totalQuantity,
    Value<String?>? stepsJson,
    Value<String?>? plannedStart,
    Value<String?>? plannedFinish,
    Value<double>? approvedPercent,
    Value<double?>? approvedQuantity,
    Value<double?>? lastPendingPercent,
    Value<String>? planJson,
    Value<String?>? approverUserId,
    Value<String?>? approverName,
    Value<int>? rowid,
  }) {
    return ActivitiesCompanion(
      id: id ?? this.id,
      projectId: projectId ?? this.projectId,
      parentId: parentId ?? this.parentId,
      code: code ?? this.code,
      title: title ?? this.title,
      method: method ?? this.method,
      unit: unit ?? this.unit,
      totalQuantity: totalQuantity ?? this.totalQuantity,
      stepsJson: stepsJson ?? this.stepsJson,
      plannedStart: plannedStart ?? this.plannedStart,
      plannedFinish: plannedFinish ?? this.plannedFinish,
      approvedPercent: approvedPercent ?? this.approvedPercent,
      approvedQuantity: approvedQuantity ?? this.approvedQuantity,
      lastPendingPercent: lastPendingPercent ?? this.lastPendingPercent,
      planJson: planJson ?? this.planJson,
      approverUserId: approverUserId ?? this.approverUserId,
      approverName: approverName ?? this.approverName,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (projectId.present) {
      map['project_id'] = Variable<String>(projectId.value);
    }
    if (parentId.present) {
      map['parent_id'] = Variable<String>(parentId.value);
    }
    if (code.present) {
      map['code'] = Variable<String>(code.value);
    }
    if (title.present) {
      map['title'] = Variable<String>(title.value);
    }
    if (method.present) {
      map['method'] = Variable<String>(method.value);
    }
    if (unit.present) {
      map['unit'] = Variable<String>(unit.value);
    }
    if (totalQuantity.present) {
      map['total_quantity'] = Variable<double>(totalQuantity.value);
    }
    if (stepsJson.present) {
      map['steps_json'] = Variable<String>(stepsJson.value);
    }
    if (plannedStart.present) {
      map['planned_start'] = Variable<String>(plannedStart.value);
    }
    if (plannedFinish.present) {
      map['planned_finish'] = Variable<String>(plannedFinish.value);
    }
    if (approvedPercent.present) {
      map['approved_percent'] = Variable<double>(approvedPercent.value);
    }
    if (approvedQuantity.present) {
      map['approved_quantity'] = Variable<double>(approvedQuantity.value);
    }
    if (lastPendingPercent.present) {
      map['last_pending_percent'] = Variable<double>(lastPendingPercent.value);
    }
    if (planJson.present) {
      map['plan_json'] = Variable<String>(planJson.value);
    }
    if (approverUserId.present) {
      map['approver_user_id'] = Variable<String>(approverUserId.value);
    }
    if (approverName.present) {
      map['approver_name'] = Variable<String>(approverName.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('ActivitiesCompanion(')
          ..write('id: $id, ')
          ..write('projectId: $projectId, ')
          ..write('parentId: $parentId, ')
          ..write('code: $code, ')
          ..write('title: $title, ')
          ..write('method: $method, ')
          ..write('unit: $unit, ')
          ..write('totalQuantity: $totalQuantity, ')
          ..write('stepsJson: $stepsJson, ')
          ..write('plannedStart: $plannedStart, ')
          ..write('plannedFinish: $plannedFinish, ')
          ..write('approvedPercent: $approvedPercent, ')
          ..write('approvedQuantity: $approvedQuantity, ')
          ..write('lastPendingPercent: $lastPendingPercent, ')
          ..write('planJson: $planJson, ')
          ..write('approverUserId: $approverUserId, ')
          ..write('approverName: $approverName, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $ServerItemsTable extends ServerItems
    with TableInfo<$ServerItemsTable, ServerItemRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $ServerItemsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _reportIdMeta = const VerificationMeta(
    'reportId',
  );
  @override
  late final GeneratedColumn<String> reportId = GeneratedColumn<String>(
    'report_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _reportNoMeta = const VerificationMeta(
    'reportNo',
  );
  @override
  late final GeneratedColumn<String> reportNo = GeneratedColumn<String>(
    'report_no',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _projectIdMeta = const VerificationMeta(
    'projectId',
  );
  @override
  late final GeneratedColumn<String> projectId = GeneratedColumn<String>(
    'project_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _wbsItemIdMeta = const VerificationMeta(
    'wbsItemId',
  );
  @override
  late final GeneratedColumn<String> wbsItemId = GeneratedColumn<String>(
    'wbs_item_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _workDateMeta = const VerificationMeta(
    'workDate',
  );
  @override
  late final GeneratedColumn<String> workDate = GeneratedColumn<String>(
    'work_date',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
    'status',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _flagsJsonMeta = const VerificationMeta(
    'flagsJson',
  );
  @override
  late final GeneratedColumn<String> flagsJson = GeneratedColumn<String>(
    'flags_json',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('[]'),
  );
  static const VerificationMeta _computedPercentMeta = const VerificationMeta(
    'computedPercent',
  );
  @override
  late final GeneratedColumn<double> computedPercent = GeneratedColumn<double>(
    'computed_percent',
    aliasedName,
    true,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _revisionCountMeta = const VerificationMeta(
    'revisionCount',
  );
  @override
  late final GeneratedColumn<int> revisionCount = GeneratedColumn<int>(
    'revision_count',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _revisionJsonMeta = const VerificationMeta(
    'revisionJson',
  );
  @override
  late final GeneratedColumn<String> revisionJson = GeneratedColumn<String>(
    'revision_json',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _photosJsonMeta = const VerificationMeta(
    'photosJson',
  );
  @override
  late final GeneratedColumn<String> photosJson = GeneratedColumn<String>(
    'photos_json',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('[]'),
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    reportId,
    reportNo,
    projectId,
    wbsItemId,
    workDate,
    status,
    flagsJson,
    computedPercent,
    revisionCount,
    revisionJson,
    photosJson,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'server_items';
  @override
  VerificationContext validateIntegrity(
    Insertable<ServerItemRow> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('report_id')) {
      context.handle(
        _reportIdMeta,
        reportId.isAcceptableOrUnknown(data['report_id']!, _reportIdMeta),
      );
    } else if (isInserting) {
      context.missing(_reportIdMeta);
    }
    if (data.containsKey('report_no')) {
      context.handle(
        _reportNoMeta,
        reportNo.isAcceptableOrUnknown(data['report_no']!, _reportNoMeta),
      );
    }
    if (data.containsKey('project_id')) {
      context.handle(
        _projectIdMeta,
        projectId.isAcceptableOrUnknown(data['project_id']!, _projectIdMeta),
      );
    } else if (isInserting) {
      context.missing(_projectIdMeta);
    }
    if (data.containsKey('wbs_item_id')) {
      context.handle(
        _wbsItemIdMeta,
        wbsItemId.isAcceptableOrUnknown(data['wbs_item_id']!, _wbsItemIdMeta),
      );
    } else if (isInserting) {
      context.missing(_wbsItemIdMeta);
    }
    if (data.containsKey('work_date')) {
      context.handle(
        _workDateMeta,
        workDate.isAcceptableOrUnknown(data['work_date']!, _workDateMeta),
      );
    }
    if (data.containsKey('status')) {
      context.handle(
        _statusMeta,
        status.isAcceptableOrUnknown(data['status']!, _statusMeta),
      );
    } else if (isInserting) {
      context.missing(_statusMeta);
    }
    if (data.containsKey('flags_json')) {
      context.handle(
        _flagsJsonMeta,
        flagsJson.isAcceptableOrUnknown(data['flags_json']!, _flagsJsonMeta),
      );
    }
    if (data.containsKey('computed_percent')) {
      context.handle(
        _computedPercentMeta,
        computedPercent.isAcceptableOrUnknown(
          data['computed_percent']!,
          _computedPercentMeta,
        ),
      );
    }
    if (data.containsKey('revision_count')) {
      context.handle(
        _revisionCountMeta,
        revisionCount.isAcceptableOrUnknown(
          data['revision_count']!,
          _revisionCountMeta,
        ),
      );
    }
    if (data.containsKey('revision_json')) {
      context.handle(
        _revisionJsonMeta,
        revisionJson.isAcceptableOrUnknown(
          data['revision_json']!,
          _revisionJsonMeta,
        ),
      );
    }
    if (data.containsKey('photos_json')) {
      context.handle(
        _photosJsonMeta,
        photosJson.isAcceptableOrUnknown(data['photos_json']!, _photosJsonMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  ServerItemRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return ServerItemRow(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      reportId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}report_id'],
      )!,
      reportNo: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}report_no'],
      ),
      projectId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}project_id'],
      )!,
      wbsItemId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}wbs_item_id'],
      )!,
      workDate: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}work_date'],
      ),
      status: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}status'],
      )!,
      flagsJson: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}flags_json'],
      )!,
      computedPercent: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}computed_percent'],
      ),
      revisionCount: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}revision_count'],
      )!,
      revisionJson: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}revision_json'],
      ),
      photosJson: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}photos_json'],
      )!,
    );
  }

  @override
  $ServerItemsTable createAlias(String alias) {
    return $ServerItemsTable(attachedDatabase, alias);
  }
}

class ServerItemRow extends DataClass implements Insertable<ServerItemRow> {
  final String id;
  final String reportId;
  final String? reportNo;
  final String projectId;
  final String wbsItemId;
  final String? workDate;
  final String status;
  final String flagsJson;
  final double? computedPercent;
  final int revisionCount;
  final String? revisionJson;
  final String photosJson;
  const ServerItemRow({
    required this.id,
    required this.reportId,
    this.reportNo,
    required this.projectId,
    required this.wbsItemId,
    this.workDate,
    required this.status,
    required this.flagsJson,
    this.computedPercent,
    required this.revisionCount,
    this.revisionJson,
    required this.photosJson,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['report_id'] = Variable<String>(reportId);
    if (!nullToAbsent || reportNo != null) {
      map['report_no'] = Variable<String>(reportNo);
    }
    map['project_id'] = Variable<String>(projectId);
    map['wbs_item_id'] = Variable<String>(wbsItemId);
    if (!nullToAbsent || workDate != null) {
      map['work_date'] = Variable<String>(workDate);
    }
    map['status'] = Variable<String>(status);
    map['flags_json'] = Variable<String>(flagsJson);
    if (!nullToAbsent || computedPercent != null) {
      map['computed_percent'] = Variable<double>(computedPercent);
    }
    map['revision_count'] = Variable<int>(revisionCount);
    if (!nullToAbsent || revisionJson != null) {
      map['revision_json'] = Variable<String>(revisionJson);
    }
    map['photos_json'] = Variable<String>(photosJson);
    return map;
  }

  ServerItemsCompanion toCompanion(bool nullToAbsent) {
    return ServerItemsCompanion(
      id: Value(id),
      reportId: Value(reportId),
      reportNo: reportNo == null && nullToAbsent
          ? const Value.absent()
          : Value(reportNo),
      projectId: Value(projectId),
      wbsItemId: Value(wbsItemId),
      workDate: workDate == null && nullToAbsent
          ? const Value.absent()
          : Value(workDate),
      status: Value(status),
      flagsJson: Value(flagsJson),
      computedPercent: computedPercent == null && nullToAbsent
          ? const Value.absent()
          : Value(computedPercent),
      revisionCount: Value(revisionCount),
      revisionJson: revisionJson == null && nullToAbsent
          ? const Value.absent()
          : Value(revisionJson),
      photosJson: Value(photosJson),
    );
  }

  factory ServerItemRow.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return ServerItemRow(
      id: serializer.fromJson<String>(json['id']),
      reportId: serializer.fromJson<String>(json['reportId']),
      reportNo: serializer.fromJson<String?>(json['reportNo']),
      projectId: serializer.fromJson<String>(json['projectId']),
      wbsItemId: serializer.fromJson<String>(json['wbsItemId']),
      workDate: serializer.fromJson<String?>(json['workDate']),
      status: serializer.fromJson<String>(json['status']),
      flagsJson: serializer.fromJson<String>(json['flagsJson']),
      computedPercent: serializer.fromJson<double?>(json['computedPercent']),
      revisionCount: serializer.fromJson<int>(json['revisionCount']),
      revisionJson: serializer.fromJson<String?>(json['revisionJson']),
      photosJson: serializer.fromJson<String>(json['photosJson']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'reportId': serializer.toJson<String>(reportId),
      'reportNo': serializer.toJson<String?>(reportNo),
      'projectId': serializer.toJson<String>(projectId),
      'wbsItemId': serializer.toJson<String>(wbsItemId),
      'workDate': serializer.toJson<String?>(workDate),
      'status': serializer.toJson<String>(status),
      'flagsJson': serializer.toJson<String>(flagsJson),
      'computedPercent': serializer.toJson<double?>(computedPercent),
      'revisionCount': serializer.toJson<int>(revisionCount),
      'revisionJson': serializer.toJson<String?>(revisionJson),
      'photosJson': serializer.toJson<String>(photosJson),
    };
  }

  ServerItemRow copyWith({
    String? id,
    String? reportId,
    Value<String?> reportNo = const Value.absent(),
    String? projectId,
    String? wbsItemId,
    Value<String?> workDate = const Value.absent(),
    String? status,
    String? flagsJson,
    Value<double?> computedPercent = const Value.absent(),
    int? revisionCount,
    Value<String?> revisionJson = const Value.absent(),
    String? photosJson,
  }) => ServerItemRow(
    id: id ?? this.id,
    reportId: reportId ?? this.reportId,
    reportNo: reportNo.present ? reportNo.value : this.reportNo,
    projectId: projectId ?? this.projectId,
    wbsItemId: wbsItemId ?? this.wbsItemId,
    workDate: workDate.present ? workDate.value : this.workDate,
    status: status ?? this.status,
    flagsJson: flagsJson ?? this.flagsJson,
    computedPercent: computedPercent.present
        ? computedPercent.value
        : this.computedPercent,
    revisionCount: revisionCount ?? this.revisionCount,
    revisionJson: revisionJson.present ? revisionJson.value : this.revisionJson,
    photosJson: photosJson ?? this.photosJson,
  );
  ServerItemRow copyWithCompanion(ServerItemsCompanion data) {
    return ServerItemRow(
      id: data.id.present ? data.id.value : this.id,
      reportId: data.reportId.present ? data.reportId.value : this.reportId,
      reportNo: data.reportNo.present ? data.reportNo.value : this.reportNo,
      projectId: data.projectId.present ? data.projectId.value : this.projectId,
      wbsItemId: data.wbsItemId.present ? data.wbsItemId.value : this.wbsItemId,
      workDate: data.workDate.present ? data.workDate.value : this.workDate,
      status: data.status.present ? data.status.value : this.status,
      flagsJson: data.flagsJson.present ? data.flagsJson.value : this.flagsJson,
      computedPercent: data.computedPercent.present
          ? data.computedPercent.value
          : this.computedPercent,
      revisionCount: data.revisionCount.present
          ? data.revisionCount.value
          : this.revisionCount,
      revisionJson: data.revisionJson.present
          ? data.revisionJson.value
          : this.revisionJson,
      photosJson: data.photosJson.present
          ? data.photosJson.value
          : this.photosJson,
    );
  }

  @override
  String toString() {
    return (StringBuffer('ServerItemRow(')
          ..write('id: $id, ')
          ..write('reportId: $reportId, ')
          ..write('reportNo: $reportNo, ')
          ..write('projectId: $projectId, ')
          ..write('wbsItemId: $wbsItemId, ')
          ..write('workDate: $workDate, ')
          ..write('status: $status, ')
          ..write('flagsJson: $flagsJson, ')
          ..write('computedPercent: $computedPercent, ')
          ..write('revisionCount: $revisionCount, ')
          ..write('revisionJson: $revisionJson, ')
          ..write('photosJson: $photosJson')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    reportId,
    reportNo,
    projectId,
    wbsItemId,
    workDate,
    status,
    flagsJson,
    computedPercent,
    revisionCount,
    revisionJson,
    photosJson,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is ServerItemRow &&
          other.id == this.id &&
          other.reportId == this.reportId &&
          other.reportNo == this.reportNo &&
          other.projectId == this.projectId &&
          other.wbsItemId == this.wbsItemId &&
          other.workDate == this.workDate &&
          other.status == this.status &&
          other.flagsJson == this.flagsJson &&
          other.computedPercent == this.computedPercent &&
          other.revisionCount == this.revisionCount &&
          other.revisionJson == this.revisionJson &&
          other.photosJson == this.photosJson);
}

class ServerItemsCompanion extends UpdateCompanion<ServerItemRow> {
  final Value<String> id;
  final Value<String> reportId;
  final Value<String?> reportNo;
  final Value<String> projectId;
  final Value<String> wbsItemId;
  final Value<String?> workDate;
  final Value<String> status;
  final Value<String> flagsJson;
  final Value<double?> computedPercent;
  final Value<int> revisionCount;
  final Value<String?> revisionJson;
  final Value<String> photosJson;
  final Value<int> rowid;
  const ServerItemsCompanion({
    this.id = const Value.absent(),
    this.reportId = const Value.absent(),
    this.reportNo = const Value.absent(),
    this.projectId = const Value.absent(),
    this.wbsItemId = const Value.absent(),
    this.workDate = const Value.absent(),
    this.status = const Value.absent(),
    this.flagsJson = const Value.absent(),
    this.computedPercent = const Value.absent(),
    this.revisionCount = const Value.absent(),
    this.revisionJson = const Value.absent(),
    this.photosJson = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  ServerItemsCompanion.insert({
    required String id,
    required String reportId,
    this.reportNo = const Value.absent(),
    required String projectId,
    required String wbsItemId,
    this.workDate = const Value.absent(),
    required String status,
    this.flagsJson = const Value.absent(),
    this.computedPercent = const Value.absent(),
    this.revisionCount = const Value.absent(),
    this.revisionJson = const Value.absent(),
    this.photosJson = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       reportId = Value(reportId),
       projectId = Value(projectId),
       wbsItemId = Value(wbsItemId),
       status = Value(status);
  static Insertable<ServerItemRow> custom({
    Expression<String>? id,
    Expression<String>? reportId,
    Expression<String>? reportNo,
    Expression<String>? projectId,
    Expression<String>? wbsItemId,
    Expression<String>? workDate,
    Expression<String>? status,
    Expression<String>? flagsJson,
    Expression<double>? computedPercent,
    Expression<int>? revisionCount,
    Expression<String>? revisionJson,
    Expression<String>? photosJson,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (reportId != null) 'report_id': reportId,
      if (reportNo != null) 'report_no': reportNo,
      if (projectId != null) 'project_id': projectId,
      if (wbsItemId != null) 'wbs_item_id': wbsItemId,
      if (workDate != null) 'work_date': workDate,
      if (status != null) 'status': status,
      if (flagsJson != null) 'flags_json': flagsJson,
      if (computedPercent != null) 'computed_percent': computedPercent,
      if (revisionCount != null) 'revision_count': revisionCount,
      if (revisionJson != null) 'revision_json': revisionJson,
      if (photosJson != null) 'photos_json': photosJson,
      if (rowid != null) 'rowid': rowid,
    });
  }

  ServerItemsCompanion copyWith({
    Value<String>? id,
    Value<String>? reportId,
    Value<String?>? reportNo,
    Value<String>? projectId,
    Value<String>? wbsItemId,
    Value<String?>? workDate,
    Value<String>? status,
    Value<String>? flagsJson,
    Value<double?>? computedPercent,
    Value<int>? revisionCount,
    Value<String?>? revisionJson,
    Value<String>? photosJson,
    Value<int>? rowid,
  }) {
    return ServerItemsCompanion(
      id: id ?? this.id,
      reportId: reportId ?? this.reportId,
      reportNo: reportNo ?? this.reportNo,
      projectId: projectId ?? this.projectId,
      wbsItemId: wbsItemId ?? this.wbsItemId,
      workDate: workDate ?? this.workDate,
      status: status ?? this.status,
      flagsJson: flagsJson ?? this.flagsJson,
      computedPercent: computedPercent ?? this.computedPercent,
      revisionCount: revisionCount ?? this.revisionCount,
      revisionJson: revisionJson ?? this.revisionJson,
      photosJson: photosJson ?? this.photosJson,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (reportId.present) {
      map['report_id'] = Variable<String>(reportId.value);
    }
    if (reportNo.present) {
      map['report_no'] = Variable<String>(reportNo.value);
    }
    if (projectId.present) {
      map['project_id'] = Variable<String>(projectId.value);
    }
    if (wbsItemId.present) {
      map['wbs_item_id'] = Variable<String>(wbsItemId.value);
    }
    if (workDate.present) {
      map['work_date'] = Variable<String>(workDate.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (flagsJson.present) {
      map['flags_json'] = Variable<String>(flagsJson.value);
    }
    if (computedPercent.present) {
      map['computed_percent'] = Variable<double>(computedPercent.value);
    }
    if (revisionCount.present) {
      map['revision_count'] = Variable<int>(revisionCount.value);
    }
    if (revisionJson.present) {
      map['revision_json'] = Variable<String>(revisionJson.value);
    }
    if (photosJson.present) {
      map['photos_json'] = Variable<String>(photosJson.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('ServerItemsCompanion(')
          ..write('id: $id, ')
          ..write('reportId: $reportId, ')
          ..write('reportNo: $reportNo, ')
          ..write('projectId: $projectId, ')
          ..write('wbsItemId: $wbsItemId, ')
          ..write('workDate: $workDate, ')
          ..write('status: $status, ')
          ..write('flagsJson: $flagsJson, ')
          ..write('computedPercent: $computedPercent, ')
          ..write('revisionCount: $revisionCount, ')
          ..write('revisionJson: $revisionJson, ')
          ..write('photosJson: $photosJson, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $SiteIssuesTable extends SiteIssues
    with TableInfo<$SiteIssuesTable, SiteIssueRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $SiteIssuesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _projectIdMeta = const VerificationMeta(
    'projectId',
  );
  @override
  late final GeneratedColumn<String> projectId = GeneratedColumn<String>(
    'project_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _titleMeta = const VerificationMeta('title');
  @override
  late final GeneratedColumn<String> title = GeneratedColumn<String>(
    'title',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _typeMeta = const VerificationMeta('type');
  @override
  late final GeneratedColumn<String> type = GeneratedColumn<String>(
    'type',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _effectMeta = const VerificationMeta('effect');
  @override
  late final GeneratedColumn<String> effect = GeneratedColumn<String>(
    'effect',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _wbsItemIdMeta = const VerificationMeta(
    'wbsItemId',
  );
  @override
  late final GeneratedColumn<String> wbsItemId = GeneratedColumn<String>(
    'wbs_item_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _reportedAtMeta = const VerificationMeta(
    'reportedAt',
  );
  @override
  late final GeneratedColumn<String> reportedAt = GeneratedColumn<String>(
    'reported_at',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _riskCodeMeta = const VerificationMeta(
    'riskCode',
  );
  @override
  late final GeneratedColumn<String> riskCode = GeneratedColumn<String>(
    'risk_code',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
    'status',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _categoryMeta = const VerificationMeta(
    'category',
  );
  @override
  late final GeneratedColumn<String> category = GeneratedColumn<String>(
    'category',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    projectId,
    title,
    type,
    effect,
    wbsItemId,
    reportedAt,
    riskCode,
    status,
    category,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'site_issues';
  @override
  VerificationContext validateIntegrity(
    Insertable<SiteIssueRow> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('project_id')) {
      context.handle(
        _projectIdMeta,
        projectId.isAcceptableOrUnknown(data['project_id']!, _projectIdMeta),
      );
    } else if (isInserting) {
      context.missing(_projectIdMeta);
    }
    if (data.containsKey('title')) {
      context.handle(
        _titleMeta,
        title.isAcceptableOrUnknown(data['title']!, _titleMeta),
      );
    } else if (isInserting) {
      context.missing(_titleMeta);
    }
    if (data.containsKey('type')) {
      context.handle(
        _typeMeta,
        type.isAcceptableOrUnknown(data['type']!, _typeMeta),
      );
    } else if (isInserting) {
      context.missing(_typeMeta);
    }
    if (data.containsKey('effect')) {
      context.handle(
        _effectMeta,
        effect.isAcceptableOrUnknown(data['effect']!, _effectMeta),
      );
    } else if (isInserting) {
      context.missing(_effectMeta);
    }
    if (data.containsKey('wbs_item_id')) {
      context.handle(
        _wbsItemIdMeta,
        wbsItemId.isAcceptableOrUnknown(data['wbs_item_id']!, _wbsItemIdMeta),
      );
    }
    if (data.containsKey('reported_at')) {
      context.handle(
        _reportedAtMeta,
        reportedAt.isAcceptableOrUnknown(data['reported_at']!, _reportedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_reportedAtMeta);
    }
    if (data.containsKey('risk_code')) {
      context.handle(
        _riskCodeMeta,
        riskCode.isAcceptableOrUnknown(data['risk_code']!, _riskCodeMeta),
      );
    }
    if (data.containsKey('status')) {
      context.handle(
        _statusMeta,
        status.isAcceptableOrUnknown(data['status']!, _statusMeta),
      );
    } else if (isInserting) {
      context.missing(_statusMeta);
    }
    if (data.containsKey('category')) {
      context.handle(
        _categoryMeta,
        category.isAcceptableOrUnknown(data['category']!, _categoryMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  SiteIssueRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return SiteIssueRow(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      projectId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}project_id'],
      )!,
      title: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}title'],
      )!,
      type: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}type'],
      )!,
      effect: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}effect'],
      )!,
      wbsItemId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}wbs_item_id'],
      ),
      reportedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}reported_at'],
      )!,
      riskCode: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}risk_code'],
      ),
      status: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}status'],
      )!,
      category: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}category'],
      ),
    );
  }

  @override
  $SiteIssuesTable createAlias(String alias) {
    return $SiteIssuesTable(attachedDatabase, alias);
  }
}

class SiteIssueRow extends DataClass implements Insertable<SiteIssueRow> {
  final String id;
  final String projectId;
  final String title;
  final String type;
  final String effect;
  final String? wbsItemId;
  final String reportedAt;
  final String? riskCode;
  final String status;
  final String? category;
  const SiteIssueRow({
    required this.id,
    required this.projectId,
    required this.title,
    required this.type,
    required this.effect,
    this.wbsItemId,
    required this.reportedAt,
    this.riskCode,
    required this.status,
    this.category,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['project_id'] = Variable<String>(projectId);
    map['title'] = Variable<String>(title);
    map['type'] = Variable<String>(type);
    map['effect'] = Variable<String>(effect);
    if (!nullToAbsent || wbsItemId != null) {
      map['wbs_item_id'] = Variable<String>(wbsItemId);
    }
    map['reported_at'] = Variable<String>(reportedAt);
    if (!nullToAbsent || riskCode != null) {
      map['risk_code'] = Variable<String>(riskCode);
    }
    map['status'] = Variable<String>(status);
    if (!nullToAbsent || category != null) {
      map['category'] = Variable<String>(category);
    }
    return map;
  }

  SiteIssuesCompanion toCompanion(bool nullToAbsent) {
    return SiteIssuesCompanion(
      id: Value(id),
      projectId: Value(projectId),
      title: Value(title),
      type: Value(type),
      effect: Value(effect),
      wbsItemId: wbsItemId == null && nullToAbsent
          ? const Value.absent()
          : Value(wbsItemId),
      reportedAt: Value(reportedAt),
      riskCode: riskCode == null && nullToAbsent
          ? const Value.absent()
          : Value(riskCode),
      status: Value(status),
      category: category == null && nullToAbsent
          ? const Value.absent()
          : Value(category),
    );
  }

  factory SiteIssueRow.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return SiteIssueRow(
      id: serializer.fromJson<String>(json['id']),
      projectId: serializer.fromJson<String>(json['projectId']),
      title: serializer.fromJson<String>(json['title']),
      type: serializer.fromJson<String>(json['type']),
      effect: serializer.fromJson<String>(json['effect']),
      wbsItemId: serializer.fromJson<String?>(json['wbsItemId']),
      reportedAt: serializer.fromJson<String>(json['reportedAt']),
      riskCode: serializer.fromJson<String?>(json['riskCode']),
      status: serializer.fromJson<String>(json['status']),
      category: serializer.fromJson<String?>(json['category']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'projectId': serializer.toJson<String>(projectId),
      'title': serializer.toJson<String>(title),
      'type': serializer.toJson<String>(type),
      'effect': serializer.toJson<String>(effect),
      'wbsItemId': serializer.toJson<String?>(wbsItemId),
      'reportedAt': serializer.toJson<String>(reportedAt),
      'riskCode': serializer.toJson<String?>(riskCode),
      'status': serializer.toJson<String>(status),
      'category': serializer.toJson<String?>(category),
    };
  }

  SiteIssueRow copyWith({
    String? id,
    String? projectId,
    String? title,
    String? type,
    String? effect,
    Value<String?> wbsItemId = const Value.absent(),
    String? reportedAt,
    Value<String?> riskCode = const Value.absent(),
    String? status,
    Value<String?> category = const Value.absent(),
  }) => SiteIssueRow(
    id: id ?? this.id,
    projectId: projectId ?? this.projectId,
    title: title ?? this.title,
    type: type ?? this.type,
    effect: effect ?? this.effect,
    wbsItemId: wbsItemId.present ? wbsItemId.value : this.wbsItemId,
    reportedAt: reportedAt ?? this.reportedAt,
    riskCode: riskCode.present ? riskCode.value : this.riskCode,
    status: status ?? this.status,
    category: category.present ? category.value : this.category,
  );
  SiteIssueRow copyWithCompanion(SiteIssuesCompanion data) {
    return SiteIssueRow(
      id: data.id.present ? data.id.value : this.id,
      projectId: data.projectId.present ? data.projectId.value : this.projectId,
      title: data.title.present ? data.title.value : this.title,
      type: data.type.present ? data.type.value : this.type,
      effect: data.effect.present ? data.effect.value : this.effect,
      wbsItemId: data.wbsItemId.present ? data.wbsItemId.value : this.wbsItemId,
      reportedAt: data.reportedAt.present
          ? data.reportedAt.value
          : this.reportedAt,
      riskCode: data.riskCode.present ? data.riskCode.value : this.riskCode,
      status: data.status.present ? data.status.value : this.status,
      category: data.category.present ? data.category.value : this.category,
    );
  }

  @override
  String toString() {
    return (StringBuffer('SiteIssueRow(')
          ..write('id: $id, ')
          ..write('projectId: $projectId, ')
          ..write('title: $title, ')
          ..write('type: $type, ')
          ..write('effect: $effect, ')
          ..write('wbsItemId: $wbsItemId, ')
          ..write('reportedAt: $reportedAt, ')
          ..write('riskCode: $riskCode, ')
          ..write('status: $status, ')
          ..write('category: $category')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    projectId,
    title,
    type,
    effect,
    wbsItemId,
    reportedAt,
    riskCode,
    status,
    category,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is SiteIssueRow &&
          other.id == this.id &&
          other.projectId == this.projectId &&
          other.title == this.title &&
          other.type == this.type &&
          other.effect == this.effect &&
          other.wbsItemId == this.wbsItemId &&
          other.reportedAt == this.reportedAt &&
          other.riskCode == this.riskCode &&
          other.status == this.status &&
          other.category == this.category);
}

class SiteIssuesCompanion extends UpdateCompanion<SiteIssueRow> {
  final Value<String> id;
  final Value<String> projectId;
  final Value<String> title;
  final Value<String> type;
  final Value<String> effect;
  final Value<String?> wbsItemId;
  final Value<String> reportedAt;
  final Value<String?> riskCode;
  final Value<String> status;
  final Value<String?> category;
  final Value<int> rowid;
  const SiteIssuesCompanion({
    this.id = const Value.absent(),
    this.projectId = const Value.absent(),
    this.title = const Value.absent(),
    this.type = const Value.absent(),
    this.effect = const Value.absent(),
    this.wbsItemId = const Value.absent(),
    this.reportedAt = const Value.absent(),
    this.riskCode = const Value.absent(),
    this.status = const Value.absent(),
    this.category = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  SiteIssuesCompanion.insert({
    required String id,
    required String projectId,
    required String title,
    required String type,
    required String effect,
    this.wbsItemId = const Value.absent(),
    required String reportedAt,
    this.riskCode = const Value.absent(),
    required String status,
    this.category = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       projectId = Value(projectId),
       title = Value(title),
       type = Value(type),
       effect = Value(effect),
       reportedAt = Value(reportedAt),
       status = Value(status);
  static Insertable<SiteIssueRow> custom({
    Expression<String>? id,
    Expression<String>? projectId,
    Expression<String>? title,
    Expression<String>? type,
    Expression<String>? effect,
    Expression<String>? wbsItemId,
    Expression<String>? reportedAt,
    Expression<String>? riskCode,
    Expression<String>? status,
    Expression<String>? category,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (projectId != null) 'project_id': projectId,
      if (title != null) 'title': title,
      if (type != null) 'type': type,
      if (effect != null) 'effect': effect,
      if (wbsItemId != null) 'wbs_item_id': wbsItemId,
      if (reportedAt != null) 'reported_at': reportedAt,
      if (riskCode != null) 'risk_code': riskCode,
      if (status != null) 'status': status,
      if (category != null) 'category': category,
      if (rowid != null) 'rowid': rowid,
    });
  }

  SiteIssuesCompanion copyWith({
    Value<String>? id,
    Value<String>? projectId,
    Value<String>? title,
    Value<String>? type,
    Value<String>? effect,
    Value<String?>? wbsItemId,
    Value<String>? reportedAt,
    Value<String?>? riskCode,
    Value<String>? status,
    Value<String?>? category,
    Value<int>? rowid,
  }) {
    return SiteIssuesCompanion(
      id: id ?? this.id,
      projectId: projectId ?? this.projectId,
      title: title ?? this.title,
      type: type ?? this.type,
      effect: effect ?? this.effect,
      wbsItemId: wbsItemId ?? this.wbsItemId,
      reportedAt: reportedAt ?? this.reportedAt,
      riskCode: riskCode ?? this.riskCode,
      status: status ?? this.status,
      category: category ?? this.category,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (projectId.present) {
      map['project_id'] = Variable<String>(projectId.value);
    }
    if (title.present) {
      map['title'] = Variable<String>(title.value);
    }
    if (type.present) {
      map['type'] = Variable<String>(type.value);
    }
    if (effect.present) {
      map['effect'] = Variable<String>(effect.value);
    }
    if (wbsItemId.present) {
      map['wbs_item_id'] = Variable<String>(wbsItemId.value);
    }
    if (reportedAt.present) {
      map['reported_at'] = Variable<String>(reportedAt.value);
    }
    if (riskCode.present) {
      map['risk_code'] = Variable<String>(riskCode.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (category.present) {
      map['category'] = Variable<String>(category.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('SiteIssuesCompanion(')
          ..write('id: $id, ')
          ..write('projectId: $projectId, ')
          ..write('title: $title, ')
          ..write('type: $type, ')
          ..write('effect: $effect, ')
          ..write('wbsItemId: $wbsItemId, ')
          ..write('reportedAt: $reportedAt, ')
          ..write('riskCode: $riskCode, ')
          ..write('status: $status, ')
          ..write('category: $category, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $NotificationsTable extends Notifications
    with TableInfo<$NotificationsTable, NotificationRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $NotificationsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _codeMeta = const VerificationMeta('code');
  @override
  late final GeneratedColumn<String> code = GeneratedColumn<String>(
    'code',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _categoryMeta = const VerificationMeta(
    'category',
  );
  @override
  late final GeneratedColumn<String> category = GeneratedColumn<String>(
    'category',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _severityMeta = const VerificationMeta(
    'severity',
  );
  @override
  late final GeneratedColumn<String> severity = GeneratedColumn<String>(
    'severity',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _titleMeta = const VerificationMeta('title');
  @override
  late final GeneratedColumn<String> title = GeneratedColumn<String>(
    'title',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _bodyMeta = const VerificationMeta('body');
  @override
  late final GeneratedColumn<String> body = GeneratedColumn<String>(
    'body',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _projectIdMeta = const VerificationMeta(
    'projectId',
  );
  @override
  late final GeneratedColumn<String> projectId = GeneratedColumn<String>(
    'project_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _projectNameMeta = const VerificationMeta(
    'projectName',
  );
  @override
  late final GeneratedColumn<String> projectName = GeneratedColumn<String>(
    'project_name',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _linkMeta = const VerificationMeta('link');
  @override
  late final GeneratedColumn<String> link = GeneratedColumn<String>(
    'link',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<String> createdAt = GeneratedColumn<String>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _readAtMeta = const VerificationMeta('readAt');
  @override
  late final GeneratedColumn<String> readAt = GeneratedColumn<String>(
    'read_at',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _mergedCountMeta = const VerificationMeta(
    'mergedCount',
  );
  @override
  late final GeneratedColumn<int> mergedCount = GeneratedColumn<int>(
    'merged_count',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    code,
    category,
    severity,
    title,
    body,
    projectId,
    projectName,
    link,
    createdAt,
    readAt,
    mergedCount,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'notifications';
  @override
  VerificationContext validateIntegrity(
    Insertable<NotificationRow> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('code')) {
      context.handle(
        _codeMeta,
        code.isAcceptableOrUnknown(data['code']!, _codeMeta),
      );
    } else if (isInserting) {
      context.missing(_codeMeta);
    }
    if (data.containsKey('category')) {
      context.handle(
        _categoryMeta,
        category.isAcceptableOrUnknown(data['category']!, _categoryMeta),
      );
    }
    if (data.containsKey('severity')) {
      context.handle(
        _severityMeta,
        severity.isAcceptableOrUnknown(data['severity']!, _severityMeta),
      );
    }
    if (data.containsKey('title')) {
      context.handle(
        _titleMeta,
        title.isAcceptableOrUnknown(data['title']!, _titleMeta),
      );
    } else if (isInserting) {
      context.missing(_titleMeta);
    }
    if (data.containsKey('body')) {
      context.handle(
        _bodyMeta,
        body.isAcceptableOrUnknown(data['body']!, _bodyMeta),
      );
    }
    if (data.containsKey('project_id')) {
      context.handle(
        _projectIdMeta,
        projectId.isAcceptableOrUnknown(data['project_id']!, _projectIdMeta),
      );
    }
    if (data.containsKey('project_name')) {
      context.handle(
        _projectNameMeta,
        projectName.isAcceptableOrUnknown(
          data['project_name']!,
          _projectNameMeta,
        ),
      );
    }
    if (data.containsKey('link')) {
      context.handle(
        _linkMeta,
        link.isAcceptableOrUnknown(data['link']!, _linkMeta),
      );
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('read_at')) {
      context.handle(
        _readAtMeta,
        readAt.isAcceptableOrUnknown(data['read_at']!, _readAtMeta),
      );
    }
    if (data.containsKey('merged_count')) {
      context.handle(
        _mergedCountMeta,
        mergedCount.isAcceptableOrUnknown(
          data['merged_count']!,
          _mergedCountMeta,
        ),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  NotificationRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return NotificationRow(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      code: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}code'],
      )!,
      category: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}category'],
      ),
      severity: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}severity'],
      ),
      title: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}title'],
      )!,
      body: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}body'],
      ),
      projectId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}project_id'],
      ),
      projectName: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}project_name'],
      ),
      link: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}link'],
      ),
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}created_at'],
      )!,
      readAt: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}read_at'],
      ),
      mergedCount: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}merged_count'],
      )!,
    );
  }

  @override
  $NotificationsTable createAlias(String alias) {
    return $NotificationsTable(attachedDatabase, alias);
  }
}

class NotificationRow extends DataClass implements Insertable<NotificationRow> {
  final String id;
  final String code;
  final String? category;
  final String? severity;
  final String title;
  final String? body;
  final String? projectId;
  final String? projectName;
  final String? link;

  /// ISO UTC
  final String createdAt;
  final String? readAt;
  final int mergedCount;
  const NotificationRow({
    required this.id,
    required this.code,
    this.category,
    this.severity,
    required this.title,
    this.body,
    this.projectId,
    this.projectName,
    this.link,
    required this.createdAt,
    this.readAt,
    required this.mergedCount,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['code'] = Variable<String>(code);
    if (!nullToAbsent || category != null) {
      map['category'] = Variable<String>(category);
    }
    if (!nullToAbsent || severity != null) {
      map['severity'] = Variable<String>(severity);
    }
    map['title'] = Variable<String>(title);
    if (!nullToAbsent || body != null) {
      map['body'] = Variable<String>(body);
    }
    if (!nullToAbsent || projectId != null) {
      map['project_id'] = Variable<String>(projectId);
    }
    if (!nullToAbsent || projectName != null) {
      map['project_name'] = Variable<String>(projectName);
    }
    if (!nullToAbsent || link != null) {
      map['link'] = Variable<String>(link);
    }
    map['created_at'] = Variable<String>(createdAt);
    if (!nullToAbsent || readAt != null) {
      map['read_at'] = Variable<String>(readAt);
    }
    map['merged_count'] = Variable<int>(mergedCount);
    return map;
  }

  NotificationsCompanion toCompanion(bool nullToAbsent) {
    return NotificationsCompanion(
      id: Value(id),
      code: Value(code),
      category: category == null && nullToAbsent
          ? const Value.absent()
          : Value(category),
      severity: severity == null && nullToAbsent
          ? const Value.absent()
          : Value(severity),
      title: Value(title),
      body: body == null && nullToAbsent ? const Value.absent() : Value(body),
      projectId: projectId == null && nullToAbsent
          ? const Value.absent()
          : Value(projectId),
      projectName: projectName == null && nullToAbsent
          ? const Value.absent()
          : Value(projectName),
      link: link == null && nullToAbsent ? const Value.absent() : Value(link),
      createdAt: Value(createdAt),
      readAt: readAt == null && nullToAbsent
          ? const Value.absent()
          : Value(readAt),
      mergedCount: Value(mergedCount),
    );
  }

  factory NotificationRow.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return NotificationRow(
      id: serializer.fromJson<String>(json['id']),
      code: serializer.fromJson<String>(json['code']),
      category: serializer.fromJson<String?>(json['category']),
      severity: serializer.fromJson<String?>(json['severity']),
      title: serializer.fromJson<String>(json['title']),
      body: serializer.fromJson<String?>(json['body']),
      projectId: serializer.fromJson<String?>(json['projectId']),
      projectName: serializer.fromJson<String?>(json['projectName']),
      link: serializer.fromJson<String?>(json['link']),
      createdAt: serializer.fromJson<String>(json['createdAt']),
      readAt: serializer.fromJson<String?>(json['readAt']),
      mergedCount: serializer.fromJson<int>(json['mergedCount']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'code': serializer.toJson<String>(code),
      'category': serializer.toJson<String?>(category),
      'severity': serializer.toJson<String?>(severity),
      'title': serializer.toJson<String>(title),
      'body': serializer.toJson<String?>(body),
      'projectId': serializer.toJson<String?>(projectId),
      'projectName': serializer.toJson<String?>(projectName),
      'link': serializer.toJson<String?>(link),
      'createdAt': serializer.toJson<String>(createdAt),
      'readAt': serializer.toJson<String?>(readAt),
      'mergedCount': serializer.toJson<int>(mergedCount),
    };
  }

  NotificationRow copyWith({
    String? id,
    String? code,
    Value<String?> category = const Value.absent(),
    Value<String?> severity = const Value.absent(),
    String? title,
    Value<String?> body = const Value.absent(),
    Value<String?> projectId = const Value.absent(),
    Value<String?> projectName = const Value.absent(),
    Value<String?> link = const Value.absent(),
    String? createdAt,
    Value<String?> readAt = const Value.absent(),
    int? mergedCount,
  }) => NotificationRow(
    id: id ?? this.id,
    code: code ?? this.code,
    category: category.present ? category.value : this.category,
    severity: severity.present ? severity.value : this.severity,
    title: title ?? this.title,
    body: body.present ? body.value : this.body,
    projectId: projectId.present ? projectId.value : this.projectId,
    projectName: projectName.present ? projectName.value : this.projectName,
    link: link.present ? link.value : this.link,
    createdAt: createdAt ?? this.createdAt,
    readAt: readAt.present ? readAt.value : this.readAt,
    mergedCount: mergedCount ?? this.mergedCount,
  );
  NotificationRow copyWithCompanion(NotificationsCompanion data) {
    return NotificationRow(
      id: data.id.present ? data.id.value : this.id,
      code: data.code.present ? data.code.value : this.code,
      category: data.category.present ? data.category.value : this.category,
      severity: data.severity.present ? data.severity.value : this.severity,
      title: data.title.present ? data.title.value : this.title,
      body: data.body.present ? data.body.value : this.body,
      projectId: data.projectId.present ? data.projectId.value : this.projectId,
      projectName: data.projectName.present
          ? data.projectName.value
          : this.projectName,
      link: data.link.present ? data.link.value : this.link,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      readAt: data.readAt.present ? data.readAt.value : this.readAt,
      mergedCount: data.mergedCount.present
          ? data.mergedCount.value
          : this.mergedCount,
    );
  }

  @override
  String toString() {
    return (StringBuffer('NotificationRow(')
          ..write('id: $id, ')
          ..write('code: $code, ')
          ..write('category: $category, ')
          ..write('severity: $severity, ')
          ..write('title: $title, ')
          ..write('body: $body, ')
          ..write('projectId: $projectId, ')
          ..write('projectName: $projectName, ')
          ..write('link: $link, ')
          ..write('createdAt: $createdAt, ')
          ..write('readAt: $readAt, ')
          ..write('mergedCount: $mergedCount')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    code,
    category,
    severity,
    title,
    body,
    projectId,
    projectName,
    link,
    createdAt,
    readAt,
    mergedCount,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is NotificationRow &&
          other.id == this.id &&
          other.code == this.code &&
          other.category == this.category &&
          other.severity == this.severity &&
          other.title == this.title &&
          other.body == this.body &&
          other.projectId == this.projectId &&
          other.projectName == this.projectName &&
          other.link == this.link &&
          other.createdAt == this.createdAt &&
          other.readAt == this.readAt &&
          other.mergedCount == this.mergedCount);
}

class NotificationsCompanion extends UpdateCompanion<NotificationRow> {
  final Value<String> id;
  final Value<String> code;
  final Value<String?> category;
  final Value<String?> severity;
  final Value<String> title;
  final Value<String?> body;
  final Value<String?> projectId;
  final Value<String?> projectName;
  final Value<String?> link;
  final Value<String> createdAt;
  final Value<String?> readAt;
  final Value<int> mergedCount;
  final Value<int> rowid;
  const NotificationsCompanion({
    this.id = const Value.absent(),
    this.code = const Value.absent(),
    this.category = const Value.absent(),
    this.severity = const Value.absent(),
    this.title = const Value.absent(),
    this.body = const Value.absent(),
    this.projectId = const Value.absent(),
    this.projectName = const Value.absent(),
    this.link = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.readAt = const Value.absent(),
    this.mergedCount = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  NotificationsCompanion.insert({
    required String id,
    required String code,
    this.category = const Value.absent(),
    this.severity = const Value.absent(),
    required String title,
    this.body = const Value.absent(),
    this.projectId = const Value.absent(),
    this.projectName = const Value.absent(),
    this.link = const Value.absent(),
    required String createdAt,
    this.readAt = const Value.absent(),
    this.mergedCount = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       code = Value(code),
       title = Value(title),
       createdAt = Value(createdAt);
  static Insertable<NotificationRow> custom({
    Expression<String>? id,
    Expression<String>? code,
    Expression<String>? category,
    Expression<String>? severity,
    Expression<String>? title,
    Expression<String>? body,
    Expression<String>? projectId,
    Expression<String>? projectName,
    Expression<String>? link,
    Expression<String>? createdAt,
    Expression<String>? readAt,
    Expression<int>? mergedCount,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (code != null) 'code': code,
      if (category != null) 'category': category,
      if (severity != null) 'severity': severity,
      if (title != null) 'title': title,
      if (body != null) 'body': body,
      if (projectId != null) 'project_id': projectId,
      if (projectName != null) 'project_name': projectName,
      if (link != null) 'link': link,
      if (createdAt != null) 'created_at': createdAt,
      if (readAt != null) 'read_at': readAt,
      if (mergedCount != null) 'merged_count': mergedCount,
      if (rowid != null) 'rowid': rowid,
    });
  }

  NotificationsCompanion copyWith({
    Value<String>? id,
    Value<String>? code,
    Value<String?>? category,
    Value<String?>? severity,
    Value<String>? title,
    Value<String?>? body,
    Value<String?>? projectId,
    Value<String?>? projectName,
    Value<String?>? link,
    Value<String>? createdAt,
    Value<String?>? readAt,
    Value<int>? mergedCount,
    Value<int>? rowid,
  }) {
    return NotificationsCompanion(
      id: id ?? this.id,
      code: code ?? this.code,
      category: category ?? this.category,
      severity: severity ?? this.severity,
      title: title ?? this.title,
      body: body ?? this.body,
      projectId: projectId ?? this.projectId,
      projectName: projectName ?? this.projectName,
      link: link ?? this.link,
      createdAt: createdAt ?? this.createdAt,
      readAt: readAt ?? this.readAt,
      mergedCount: mergedCount ?? this.mergedCount,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (code.present) {
      map['code'] = Variable<String>(code.value);
    }
    if (category.present) {
      map['category'] = Variable<String>(category.value);
    }
    if (severity.present) {
      map['severity'] = Variable<String>(severity.value);
    }
    if (title.present) {
      map['title'] = Variable<String>(title.value);
    }
    if (body.present) {
      map['body'] = Variable<String>(body.value);
    }
    if (projectId.present) {
      map['project_id'] = Variable<String>(projectId.value);
    }
    if (projectName.present) {
      map['project_name'] = Variable<String>(projectName.value);
    }
    if (link.present) {
      map['link'] = Variable<String>(link.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<String>(createdAt.value);
    }
    if (readAt.present) {
      map['read_at'] = Variable<String>(readAt.value);
    }
    if (mergedCount.present) {
      map['merged_count'] = Variable<int>(mergedCount.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('NotificationsCompanion(')
          ..write('id: $id, ')
          ..write('code: $code, ')
          ..write('category: $category, ')
          ..write('severity: $severity, ')
          ..write('title: $title, ')
          ..write('body: $body, ')
          ..write('projectId: $projectId, ')
          ..write('projectName: $projectName, ')
          ..write('link: $link, ')
          ..write('createdAt: $createdAt, ')
          ..write('readAt: $readAt, ')
          ..write('mergedCount: $mergedCount, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $SyncMetaTable extends SyncMeta with TableInfo<$SyncMetaTable, MetaRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $SyncMetaTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _keyMeta = const VerificationMeta('key');
  @override
  late final GeneratedColumn<String> key = GeneratedColumn<String>(
    'key',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _valueMeta = const VerificationMeta('value');
  @override
  late final GeneratedColumn<String> value = GeneratedColumn<String>(
    'value',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [key, value];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'sync_meta';
  @override
  VerificationContext validateIntegrity(
    Insertable<MetaRow> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('key')) {
      context.handle(
        _keyMeta,
        key.isAcceptableOrUnknown(data['key']!, _keyMeta),
      );
    } else if (isInserting) {
      context.missing(_keyMeta);
    }
    if (data.containsKey('value')) {
      context.handle(
        _valueMeta,
        value.isAcceptableOrUnknown(data['value']!, _valueMeta),
      );
    } else if (isInserting) {
      context.missing(_valueMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {key};
  @override
  MetaRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return MetaRow(
      key: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}key'],
      )!,
      value: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}value'],
      )!,
    );
  }

  @override
  $SyncMetaTable createAlias(String alias) {
    return $SyncMetaTable(attachedDatabase, alias);
  }
}

class MetaRow extends DataClass implements Insertable<MetaRow> {
  final String key;
  final String value;
  const MetaRow({required this.key, required this.value});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['key'] = Variable<String>(key);
    map['value'] = Variable<String>(value);
    return map;
  }

  SyncMetaCompanion toCompanion(bool nullToAbsent) {
    return SyncMetaCompanion(key: Value(key), value: Value(value));
  }

  factory MetaRow.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return MetaRow(
      key: serializer.fromJson<String>(json['key']),
      value: serializer.fromJson<String>(json['value']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'key': serializer.toJson<String>(key),
      'value': serializer.toJson<String>(value),
    };
  }

  MetaRow copyWith({String? key, String? value}) =>
      MetaRow(key: key ?? this.key, value: value ?? this.value);
  MetaRow copyWithCompanion(SyncMetaCompanion data) {
    return MetaRow(
      key: data.key.present ? data.key.value : this.key,
      value: data.value.present ? data.value.value : this.value,
    );
  }

  @override
  String toString() {
    return (StringBuffer('MetaRow(')
          ..write('key: $key, ')
          ..write('value: $value')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(key, value);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is MetaRow && other.key == this.key && other.value == this.value);
}

class SyncMetaCompanion extends UpdateCompanion<MetaRow> {
  final Value<String> key;
  final Value<String> value;
  final Value<int> rowid;
  const SyncMetaCompanion({
    this.key = const Value.absent(),
    this.value = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  SyncMetaCompanion.insert({
    required String key,
    required String value,
    this.rowid = const Value.absent(),
  }) : key = Value(key),
       value = Value(value);
  static Insertable<MetaRow> custom({
    Expression<String>? key,
    Expression<String>? value,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (key != null) 'key': key,
      if (value != null) 'value': value,
      if (rowid != null) 'rowid': rowid,
    });
  }

  SyncMetaCompanion copyWith({
    Value<String>? key,
    Value<String>? value,
    Value<int>? rowid,
  }) {
    return SyncMetaCompanion(
      key: key ?? this.key,
      value: value ?? this.value,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (key.present) {
      map['key'] = Variable<String>(key.value);
    }
    if (value.present) {
      map['value'] = Variable<String>(value.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('SyncMetaCompanion(')
          ..write('key: $key, ')
          ..write('value: $value, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $LocalReportsTable extends LocalReports
    with TableInfo<$LocalReportsTable, LocalReportRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $LocalReportsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _projectIdMeta = const VerificationMeta(
    'projectId',
  );
  @override
  late final GeneratedColumn<String> projectId = GeneratedColumn<String>(
    'project_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _workDateMeta = const VerificationMeta(
    'workDate',
  );
  @override
  late final GeneratedColumn<String> workDate = GeneratedColumn<String>(
    'work_date',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _stateMeta = const VerificationMeta('state');
  @override
  late final GeneratedColumn<String> state = GeneratedColumn<String>(
    'state',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('draft'),
  );
  static const VerificationMeta _deviceRecordedAtMeta = const VerificationMeta(
    'deviceRecordedAt',
  );
  @override
  late final GeneratedColumn<DateTime> deviceRecordedAt =
      GeneratedColumn<DateTime>(
        'device_recorded_at',
        aliasedName,
        true,
        type: DriftSqlType.dateTime,
        requiredDuringInsert: false,
      );
  static const VerificationMeta _gpsLatMeta = const VerificationMeta('gpsLat');
  @override
  late final GeneratedColumn<double> gpsLat = GeneratedColumn<double>(
    'gps_lat',
    aliasedName,
    true,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _gpsLngMeta = const VerificationMeta('gpsLng');
  @override
  late final GeneratedColumn<double> gpsLng = GeneratedColumn<double>(
    'gps_lng',
    aliasedName,
    true,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _gpsAccuracyMMeta = const VerificationMeta(
    'gpsAccuracyM',
  );
  @override
  late final GeneratedColumn<double> gpsAccuracyM = GeneratedColumn<double>(
    'gps_accuracy_m',
    aliasedName,
    true,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _mockLocationMeta = const VerificationMeta(
    'mockLocation',
  );
  @override
  late final GeneratedColumn<bool> mockLocation = GeneratedColumn<bool>(
    'mock_location',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("mock_location" IN (0, 1))',
    ),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _weatherMeta = const VerificationMeta(
    'weather',
  );
  @override
  late final GeneratedColumn<String> weather = GeneratedColumn<String>(
    'weather',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _temperatureCMeta = const VerificationMeta(
    'temperatureC',
  );
  @override
  late final GeneratedColumn<int> temperatureC = GeneratedColumn<int>(
    'temperature_c',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _noteMeta = const VerificationMeta('note');
  @override
  late final GeneratedColumn<String> note = GeneratedColumn<String>(
    'note',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _attestedAtMeta = const VerificationMeta(
    'attestedAt',
  );
  @override
  late final GeneratedColumn<DateTime> attestedAt = GeneratedColumn<DateTime>(
    'attested_at',
    aliasedName,
    true,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _reportNoMeta = const VerificationMeta(
    'reportNo',
  );
  @override
  late final GeneratedColumn<String> reportNo = GeneratedColumn<String>(
    'report_no',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _rejectCodeMeta = const VerificationMeta(
    'rejectCode',
  );
  @override
  late final GeneratedColumn<String> rejectCode = GeneratedColumn<String>(
    'reject_code',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _rejectMessageMeta = const VerificationMeta(
    'rejectMessage',
  );
  @override
  late final GeneratedColumn<String> rejectMessage = GeneratedColumn<String>(
    'reject_message',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    projectId,
    workDate,
    state,
    deviceRecordedAt,
    gpsLat,
    gpsLng,
    gpsAccuracyM,
    mockLocation,
    weather,
    temperatureC,
    note,
    attestedAt,
    reportNo,
    rejectCode,
    rejectMessage,
    createdAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'local_reports';
  @override
  VerificationContext validateIntegrity(
    Insertable<LocalReportRow> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('project_id')) {
      context.handle(
        _projectIdMeta,
        projectId.isAcceptableOrUnknown(data['project_id']!, _projectIdMeta),
      );
    } else if (isInserting) {
      context.missing(_projectIdMeta);
    }
    if (data.containsKey('work_date')) {
      context.handle(
        _workDateMeta,
        workDate.isAcceptableOrUnknown(data['work_date']!, _workDateMeta),
      );
    } else if (isInserting) {
      context.missing(_workDateMeta);
    }
    if (data.containsKey('state')) {
      context.handle(
        _stateMeta,
        state.isAcceptableOrUnknown(data['state']!, _stateMeta),
      );
    }
    if (data.containsKey('device_recorded_at')) {
      context.handle(
        _deviceRecordedAtMeta,
        deviceRecordedAt.isAcceptableOrUnknown(
          data['device_recorded_at']!,
          _deviceRecordedAtMeta,
        ),
      );
    }
    if (data.containsKey('gps_lat')) {
      context.handle(
        _gpsLatMeta,
        gpsLat.isAcceptableOrUnknown(data['gps_lat']!, _gpsLatMeta),
      );
    }
    if (data.containsKey('gps_lng')) {
      context.handle(
        _gpsLngMeta,
        gpsLng.isAcceptableOrUnknown(data['gps_lng']!, _gpsLngMeta),
      );
    }
    if (data.containsKey('gps_accuracy_m')) {
      context.handle(
        _gpsAccuracyMMeta,
        gpsAccuracyM.isAcceptableOrUnknown(
          data['gps_accuracy_m']!,
          _gpsAccuracyMMeta,
        ),
      );
    }
    if (data.containsKey('mock_location')) {
      context.handle(
        _mockLocationMeta,
        mockLocation.isAcceptableOrUnknown(
          data['mock_location']!,
          _mockLocationMeta,
        ),
      );
    }
    if (data.containsKey('weather')) {
      context.handle(
        _weatherMeta,
        weather.isAcceptableOrUnknown(data['weather']!, _weatherMeta),
      );
    }
    if (data.containsKey('temperature_c')) {
      context.handle(
        _temperatureCMeta,
        temperatureC.isAcceptableOrUnknown(
          data['temperature_c']!,
          _temperatureCMeta,
        ),
      );
    }
    if (data.containsKey('note')) {
      context.handle(
        _noteMeta,
        note.isAcceptableOrUnknown(data['note']!, _noteMeta),
      );
    }
    if (data.containsKey('attested_at')) {
      context.handle(
        _attestedAtMeta,
        attestedAt.isAcceptableOrUnknown(data['attested_at']!, _attestedAtMeta),
      );
    }
    if (data.containsKey('report_no')) {
      context.handle(
        _reportNoMeta,
        reportNo.isAcceptableOrUnknown(data['report_no']!, _reportNoMeta),
      );
    }
    if (data.containsKey('reject_code')) {
      context.handle(
        _rejectCodeMeta,
        rejectCode.isAcceptableOrUnknown(data['reject_code']!, _rejectCodeMeta),
      );
    }
    if (data.containsKey('reject_message')) {
      context.handle(
        _rejectMessageMeta,
        rejectMessage.isAcceptableOrUnknown(
          data['reject_message']!,
          _rejectMessageMeta,
        ),
      );
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  LocalReportRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return LocalReportRow(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      projectId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}project_id'],
      )!,
      workDate: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}work_date'],
      )!,
      state: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}state'],
      )!,
      deviceRecordedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}device_recorded_at'],
      ),
      gpsLat: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}gps_lat'],
      ),
      gpsLng: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}gps_lng'],
      ),
      gpsAccuracyM: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}gps_accuracy_m'],
      ),
      mockLocation: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}mock_location'],
      )!,
      weather: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}weather'],
      ),
      temperatureC: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}temperature_c'],
      ),
      note: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}note'],
      ),
      attestedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}attested_at'],
      ),
      reportNo: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}report_no'],
      ),
      rejectCode: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}reject_code'],
      ),
      rejectMessage: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}reject_message'],
      ),
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}created_at'],
      )!,
    );
  }

  @override
  $LocalReportsTable createAlias(String alias) {
    return $LocalReportsTable(attachedDatabase, alias);
  }
}

class LocalReportRow extends DataClass implements Insertable<LocalReportRow> {
  final String id;
  final String projectId;
  final String workDate;

  /// draft | queued | sent | rejected
  final String state;
  final DateTime? deviceRecordedAt;
  final double? gpsLat;
  final double? gpsLng;
  final double? gpsAccuracyM;
  final bool mockLocation;
  final String? weather;
  final int? temperatureC;
  final String? note;
  final DateTime? attestedAt;
  final String? reportNo;
  final String? rejectCode;
  final String? rejectMessage;
  final DateTime createdAt;
  const LocalReportRow({
    required this.id,
    required this.projectId,
    required this.workDate,
    required this.state,
    this.deviceRecordedAt,
    this.gpsLat,
    this.gpsLng,
    this.gpsAccuracyM,
    required this.mockLocation,
    this.weather,
    this.temperatureC,
    this.note,
    this.attestedAt,
    this.reportNo,
    this.rejectCode,
    this.rejectMessage,
    required this.createdAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['project_id'] = Variable<String>(projectId);
    map['work_date'] = Variable<String>(workDate);
    map['state'] = Variable<String>(state);
    if (!nullToAbsent || deviceRecordedAt != null) {
      map['device_recorded_at'] = Variable<DateTime>(deviceRecordedAt);
    }
    if (!nullToAbsent || gpsLat != null) {
      map['gps_lat'] = Variable<double>(gpsLat);
    }
    if (!nullToAbsent || gpsLng != null) {
      map['gps_lng'] = Variable<double>(gpsLng);
    }
    if (!nullToAbsent || gpsAccuracyM != null) {
      map['gps_accuracy_m'] = Variable<double>(gpsAccuracyM);
    }
    map['mock_location'] = Variable<bool>(mockLocation);
    if (!nullToAbsent || weather != null) {
      map['weather'] = Variable<String>(weather);
    }
    if (!nullToAbsent || temperatureC != null) {
      map['temperature_c'] = Variable<int>(temperatureC);
    }
    if (!nullToAbsent || note != null) {
      map['note'] = Variable<String>(note);
    }
    if (!nullToAbsent || attestedAt != null) {
      map['attested_at'] = Variable<DateTime>(attestedAt);
    }
    if (!nullToAbsent || reportNo != null) {
      map['report_no'] = Variable<String>(reportNo);
    }
    if (!nullToAbsent || rejectCode != null) {
      map['reject_code'] = Variable<String>(rejectCode);
    }
    if (!nullToAbsent || rejectMessage != null) {
      map['reject_message'] = Variable<String>(rejectMessage);
    }
    map['created_at'] = Variable<DateTime>(createdAt);
    return map;
  }

  LocalReportsCompanion toCompanion(bool nullToAbsent) {
    return LocalReportsCompanion(
      id: Value(id),
      projectId: Value(projectId),
      workDate: Value(workDate),
      state: Value(state),
      deviceRecordedAt: deviceRecordedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(deviceRecordedAt),
      gpsLat: gpsLat == null && nullToAbsent
          ? const Value.absent()
          : Value(gpsLat),
      gpsLng: gpsLng == null && nullToAbsent
          ? const Value.absent()
          : Value(gpsLng),
      gpsAccuracyM: gpsAccuracyM == null && nullToAbsent
          ? const Value.absent()
          : Value(gpsAccuracyM),
      mockLocation: Value(mockLocation),
      weather: weather == null && nullToAbsent
          ? const Value.absent()
          : Value(weather),
      temperatureC: temperatureC == null && nullToAbsent
          ? const Value.absent()
          : Value(temperatureC),
      note: note == null && nullToAbsent ? const Value.absent() : Value(note),
      attestedAt: attestedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(attestedAt),
      reportNo: reportNo == null && nullToAbsent
          ? const Value.absent()
          : Value(reportNo),
      rejectCode: rejectCode == null && nullToAbsent
          ? const Value.absent()
          : Value(rejectCode),
      rejectMessage: rejectMessage == null && nullToAbsent
          ? const Value.absent()
          : Value(rejectMessage),
      createdAt: Value(createdAt),
    );
  }

  factory LocalReportRow.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return LocalReportRow(
      id: serializer.fromJson<String>(json['id']),
      projectId: serializer.fromJson<String>(json['projectId']),
      workDate: serializer.fromJson<String>(json['workDate']),
      state: serializer.fromJson<String>(json['state']),
      deviceRecordedAt: serializer.fromJson<DateTime?>(
        json['deviceRecordedAt'],
      ),
      gpsLat: serializer.fromJson<double?>(json['gpsLat']),
      gpsLng: serializer.fromJson<double?>(json['gpsLng']),
      gpsAccuracyM: serializer.fromJson<double?>(json['gpsAccuracyM']),
      mockLocation: serializer.fromJson<bool>(json['mockLocation']),
      weather: serializer.fromJson<String?>(json['weather']),
      temperatureC: serializer.fromJson<int?>(json['temperatureC']),
      note: serializer.fromJson<String?>(json['note']),
      attestedAt: serializer.fromJson<DateTime?>(json['attestedAt']),
      reportNo: serializer.fromJson<String?>(json['reportNo']),
      rejectCode: serializer.fromJson<String?>(json['rejectCode']),
      rejectMessage: serializer.fromJson<String?>(json['rejectMessage']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'projectId': serializer.toJson<String>(projectId),
      'workDate': serializer.toJson<String>(workDate),
      'state': serializer.toJson<String>(state),
      'deviceRecordedAt': serializer.toJson<DateTime?>(deviceRecordedAt),
      'gpsLat': serializer.toJson<double?>(gpsLat),
      'gpsLng': serializer.toJson<double?>(gpsLng),
      'gpsAccuracyM': serializer.toJson<double?>(gpsAccuracyM),
      'mockLocation': serializer.toJson<bool>(mockLocation),
      'weather': serializer.toJson<String?>(weather),
      'temperatureC': serializer.toJson<int?>(temperatureC),
      'note': serializer.toJson<String?>(note),
      'attestedAt': serializer.toJson<DateTime?>(attestedAt),
      'reportNo': serializer.toJson<String?>(reportNo),
      'rejectCode': serializer.toJson<String?>(rejectCode),
      'rejectMessage': serializer.toJson<String?>(rejectMessage),
      'createdAt': serializer.toJson<DateTime>(createdAt),
    };
  }

  LocalReportRow copyWith({
    String? id,
    String? projectId,
    String? workDate,
    String? state,
    Value<DateTime?> deviceRecordedAt = const Value.absent(),
    Value<double?> gpsLat = const Value.absent(),
    Value<double?> gpsLng = const Value.absent(),
    Value<double?> gpsAccuracyM = const Value.absent(),
    bool? mockLocation,
    Value<String?> weather = const Value.absent(),
    Value<int?> temperatureC = const Value.absent(),
    Value<String?> note = const Value.absent(),
    Value<DateTime?> attestedAt = const Value.absent(),
    Value<String?> reportNo = const Value.absent(),
    Value<String?> rejectCode = const Value.absent(),
    Value<String?> rejectMessage = const Value.absent(),
    DateTime? createdAt,
  }) => LocalReportRow(
    id: id ?? this.id,
    projectId: projectId ?? this.projectId,
    workDate: workDate ?? this.workDate,
    state: state ?? this.state,
    deviceRecordedAt: deviceRecordedAt.present
        ? deviceRecordedAt.value
        : this.deviceRecordedAt,
    gpsLat: gpsLat.present ? gpsLat.value : this.gpsLat,
    gpsLng: gpsLng.present ? gpsLng.value : this.gpsLng,
    gpsAccuracyM: gpsAccuracyM.present ? gpsAccuracyM.value : this.gpsAccuracyM,
    mockLocation: mockLocation ?? this.mockLocation,
    weather: weather.present ? weather.value : this.weather,
    temperatureC: temperatureC.present ? temperatureC.value : this.temperatureC,
    note: note.present ? note.value : this.note,
    attestedAt: attestedAt.present ? attestedAt.value : this.attestedAt,
    reportNo: reportNo.present ? reportNo.value : this.reportNo,
    rejectCode: rejectCode.present ? rejectCode.value : this.rejectCode,
    rejectMessage: rejectMessage.present
        ? rejectMessage.value
        : this.rejectMessage,
    createdAt: createdAt ?? this.createdAt,
  );
  LocalReportRow copyWithCompanion(LocalReportsCompanion data) {
    return LocalReportRow(
      id: data.id.present ? data.id.value : this.id,
      projectId: data.projectId.present ? data.projectId.value : this.projectId,
      workDate: data.workDate.present ? data.workDate.value : this.workDate,
      state: data.state.present ? data.state.value : this.state,
      deviceRecordedAt: data.deviceRecordedAt.present
          ? data.deviceRecordedAt.value
          : this.deviceRecordedAt,
      gpsLat: data.gpsLat.present ? data.gpsLat.value : this.gpsLat,
      gpsLng: data.gpsLng.present ? data.gpsLng.value : this.gpsLng,
      gpsAccuracyM: data.gpsAccuracyM.present
          ? data.gpsAccuracyM.value
          : this.gpsAccuracyM,
      mockLocation: data.mockLocation.present
          ? data.mockLocation.value
          : this.mockLocation,
      weather: data.weather.present ? data.weather.value : this.weather,
      temperatureC: data.temperatureC.present
          ? data.temperatureC.value
          : this.temperatureC,
      note: data.note.present ? data.note.value : this.note,
      attestedAt: data.attestedAt.present
          ? data.attestedAt.value
          : this.attestedAt,
      reportNo: data.reportNo.present ? data.reportNo.value : this.reportNo,
      rejectCode: data.rejectCode.present
          ? data.rejectCode.value
          : this.rejectCode,
      rejectMessage: data.rejectMessage.present
          ? data.rejectMessage.value
          : this.rejectMessage,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('LocalReportRow(')
          ..write('id: $id, ')
          ..write('projectId: $projectId, ')
          ..write('workDate: $workDate, ')
          ..write('state: $state, ')
          ..write('deviceRecordedAt: $deviceRecordedAt, ')
          ..write('gpsLat: $gpsLat, ')
          ..write('gpsLng: $gpsLng, ')
          ..write('gpsAccuracyM: $gpsAccuracyM, ')
          ..write('mockLocation: $mockLocation, ')
          ..write('weather: $weather, ')
          ..write('temperatureC: $temperatureC, ')
          ..write('note: $note, ')
          ..write('attestedAt: $attestedAt, ')
          ..write('reportNo: $reportNo, ')
          ..write('rejectCode: $rejectCode, ')
          ..write('rejectMessage: $rejectMessage, ')
          ..write('createdAt: $createdAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    projectId,
    workDate,
    state,
    deviceRecordedAt,
    gpsLat,
    gpsLng,
    gpsAccuracyM,
    mockLocation,
    weather,
    temperatureC,
    note,
    attestedAt,
    reportNo,
    rejectCode,
    rejectMessage,
    createdAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is LocalReportRow &&
          other.id == this.id &&
          other.projectId == this.projectId &&
          other.workDate == this.workDate &&
          other.state == this.state &&
          other.deviceRecordedAt == this.deviceRecordedAt &&
          other.gpsLat == this.gpsLat &&
          other.gpsLng == this.gpsLng &&
          other.gpsAccuracyM == this.gpsAccuracyM &&
          other.mockLocation == this.mockLocation &&
          other.weather == this.weather &&
          other.temperatureC == this.temperatureC &&
          other.note == this.note &&
          other.attestedAt == this.attestedAt &&
          other.reportNo == this.reportNo &&
          other.rejectCode == this.rejectCode &&
          other.rejectMessage == this.rejectMessage &&
          other.createdAt == this.createdAt);
}

class LocalReportsCompanion extends UpdateCompanion<LocalReportRow> {
  final Value<String> id;
  final Value<String> projectId;
  final Value<String> workDate;
  final Value<String> state;
  final Value<DateTime?> deviceRecordedAt;
  final Value<double?> gpsLat;
  final Value<double?> gpsLng;
  final Value<double?> gpsAccuracyM;
  final Value<bool> mockLocation;
  final Value<String?> weather;
  final Value<int?> temperatureC;
  final Value<String?> note;
  final Value<DateTime?> attestedAt;
  final Value<String?> reportNo;
  final Value<String?> rejectCode;
  final Value<String?> rejectMessage;
  final Value<DateTime> createdAt;
  final Value<int> rowid;
  const LocalReportsCompanion({
    this.id = const Value.absent(),
    this.projectId = const Value.absent(),
    this.workDate = const Value.absent(),
    this.state = const Value.absent(),
    this.deviceRecordedAt = const Value.absent(),
    this.gpsLat = const Value.absent(),
    this.gpsLng = const Value.absent(),
    this.gpsAccuracyM = const Value.absent(),
    this.mockLocation = const Value.absent(),
    this.weather = const Value.absent(),
    this.temperatureC = const Value.absent(),
    this.note = const Value.absent(),
    this.attestedAt = const Value.absent(),
    this.reportNo = const Value.absent(),
    this.rejectCode = const Value.absent(),
    this.rejectMessage = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  LocalReportsCompanion.insert({
    required String id,
    required String projectId,
    required String workDate,
    this.state = const Value.absent(),
    this.deviceRecordedAt = const Value.absent(),
    this.gpsLat = const Value.absent(),
    this.gpsLng = const Value.absent(),
    this.gpsAccuracyM = const Value.absent(),
    this.mockLocation = const Value.absent(),
    this.weather = const Value.absent(),
    this.temperatureC = const Value.absent(),
    this.note = const Value.absent(),
    this.attestedAt = const Value.absent(),
    this.reportNo = const Value.absent(),
    this.rejectCode = const Value.absent(),
    this.rejectMessage = const Value.absent(),
    required DateTime createdAt,
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       projectId = Value(projectId),
       workDate = Value(workDate),
       createdAt = Value(createdAt);
  static Insertable<LocalReportRow> custom({
    Expression<String>? id,
    Expression<String>? projectId,
    Expression<String>? workDate,
    Expression<String>? state,
    Expression<DateTime>? deviceRecordedAt,
    Expression<double>? gpsLat,
    Expression<double>? gpsLng,
    Expression<double>? gpsAccuracyM,
    Expression<bool>? mockLocation,
    Expression<String>? weather,
    Expression<int>? temperatureC,
    Expression<String>? note,
    Expression<DateTime>? attestedAt,
    Expression<String>? reportNo,
    Expression<String>? rejectCode,
    Expression<String>? rejectMessage,
    Expression<DateTime>? createdAt,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (projectId != null) 'project_id': projectId,
      if (workDate != null) 'work_date': workDate,
      if (state != null) 'state': state,
      if (deviceRecordedAt != null) 'device_recorded_at': deviceRecordedAt,
      if (gpsLat != null) 'gps_lat': gpsLat,
      if (gpsLng != null) 'gps_lng': gpsLng,
      if (gpsAccuracyM != null) 'gps_accuracy_m': gpsAccuracyM,
      if (mockLocation != null) 'mock_location': mockLocation,
      if (weather != null) 'weather': weather,
      if (temperatureC != null) 'temperature_c': temperatureC,
      if (note != null) 'note': note,
      if (attestedAt != null) 'attested_at': attestedAt,
      if (reportNo != null) 'report_no': reportNo,
      if (rejectCode != null) 'reject_code': rejectCode,
      if (rejectMessage != null) 'reject_message': rejectMessage,
      if (createdAt != null) 'created_at': createdAt,
      if (rowid != null) 'rowid': rowid,
    });
  }

  LocalReportsCompanion copyWith({
    Value<String>? id,
    Value<String>? projectId,
    Value<String>? workDate,
    Value<String>? state,
    Value<DateTime?>? deviceRecordedAt,
    Value<double?>? gpsLat,
    Value<double?>? gpsLng,
    Value<double?>? gpsAccuracyM,
    Value<bool>? mockLocation,
    Value<String?>? weather,
    Value<int?>? temperatureC,
    Value<String?>? note,
    Value<DateTime?>? attestedAt,
    Value<String?>? reportNo,
    Value<String?>? rejectCode,
    Value<String?>? rejectMessage,
    Value<DateTime>? createdAt,
    Value<int>? rowid,
  }) {
    return LocalReportsCompanion(
      id: id ?? this.id,
      projectId: projectId ?? this.projectId,
      workDate: workDate ?? this.workDate,
      state: state ?? this.state,
      deviceRecordedAt: deviceRecordedAt ?? this.deviceRecordedAt,
      gpsLat: gpsLat ?? this.gpsLat,
      gpsLng: gpsLng ?? this.gpsLng,
      gpsAccuracyM: gpsAccuracyM ?? this.gpsAccuracyM,
      mockLocation: mockLocation ?? this.mockLocation,
      weather: weather ?? this.weather,
      temperatureC: temperatureC ?? this.temperatureC,
      note: note ?? this.note,
      attestedAt: attestedAt ?? this.attestedAt,
      reportNo: reportNo ?? this.reportNo,
      rejectCode: rejectCode ?? this.rejectCode,
      rejectMessage: rejectMessage ?? this.rejectMessage,
      createdAt: createdAt ?? this.createdAt,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (projectId.present) {
      map['project_id'] = Variable<String>(projectId.value);
    }
    if (workDate.present) {
      map['work_date'] = Variable<String>(workDate.value);
    }
    if (state.present) {
      map['state'] = Variable<String>(state.value);
    }
    if (deviceRecordedAt.present) {
      map['device_recorded_at'] = Variable<DateTime>(deviceRecordedAt.value);
    }
    if (gpsLat.present) {
      map['gps_lat'] = Variable<double>(gpsLat.value);
    }
    if (gpsLng.present) {
      map['gps_lng'] = Variable<double>(gpsLng.value);
    }
    if (gpsAccuracyM.present) {
      map['gps_accuracy_m'] = Variable<double>(gpsAccuracyM.value);
    }
    if (mockLocation.present) {
      map['mock_location'] = Variable<bool>(mockLocation.value);
    }
    if (weather.present) {
      map['weather'] = Variable<String>(weather.value);
    }
    if (temperatureC.present) {
      map['temperature_c'] = Variable<int>(temperatureC.value);
    }
    if (note.present) {
      map['note'] = Variable<String>(note.value);
    }
    if (attestedAt.present) {
      map['attested_at'] = Variable<DateTime>(attestedAt.value);
    }
    if (reportNo.present) {
      map['report_no'] = Variable<String>(reportNo.value);
    }
    if (rejectCode.present) {
      map['reject_code'] = Variable<String>(rejectCode.value);
    }
    if (rejectMessage.present) {
      map['reject_message'] = Variable<String>(rejectMessage.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('LocalReportsCompanion(')
          ..write('id: $id, ')
          ..write('projectId: $projectId, ')
          ..write('workDate: $workDate, ')
          ..write('state: $state, ')
          ..write('deviceRecordedAt: $deviceRecordedAt, ')
          ..write('gpsLat: $gpsLat, ')
          ..write('gpsLng: $gpsLng, ')
          ..write('gpsAccuracyM: $gpsAccuracyM, ')
          ..write('mockLocation: $mockLocation, ')
          ..write('weather: $weather, ')
          ..write('temperatureC: $temperatureC, ')
          ..write('note: $note, ')
          ..write('attestedAt: $attestedAt, ')
          ..write('reportNo: $reportNo, ')
          ..write('rejectCode: $rejectCode, ')
          ..write('rejectMessage: $rejectMessage, ')
          ..write('createdAt: $createdAt, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $LocalReportItemsTable extends LocalReportItems
    with TableInfo<$LocalReportItemsTable, LocalReportItemRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $LocalReportItemsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _reportIdMeta = const VerificationMeta(
    'reportId',
  );
  @override
  late final GeneratedColumn<String> reportId = GeneratedColumn<String>(
    'report_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'REFERENCES local_reports (id) ON DELETE CASCADE',
    ),
  );
  static const VerificationMeta _wbsItemIdMeta = const VerificationMeta(
    'wbsItemId',
  );
  @override
  late final GeneratedColumn<String> wbsItemId = GeneratedColumn<String>(
    'wbs_item_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _reportedPercentMeta = const VerificationMeta(
    'reportedPercent',
  );
  @override
  late final GeneratedColumn<double> reportedPercent = GeneratedColumn<double>(
    'reported_percent',
    aliasedName,
    true,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _quantityTodayMeta = const VerificationMeta(
    'quantityToday',
  );
  @override
  late final GeneratedColumn<double> quantityToday = GeneratedColumn<double>(
    'quantity_today',
    aliasedName,
    true,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _stepsJsonMeta = const VerificationMeta(
    'stepsJson',
  );
  @override
  late final GeneratedColumn<String> stepsJson = GeneratedColumn<String>(
    'steps_json',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _crewCountMeta = const VerificationMeta(
    'crewCount',
  );
  @override
  late final GeneratedColumn<int> crewCount = GeneratedColumn<int>(
    'crew_count',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _noteMeta = const VerificationMeta('note');
  @override
  late final GeneratedColumn<String> note = GeneratedColumn<String>(
    'note',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _serverStatusMeta = const VerificationMeta(
    'serverStatus',
  );
  @override
  late final GeneratedColumn<String> serverStatus = GeneratedColumn<String>(
    'server_status',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _serverFlagsJsonMeta = const VerificationMeta(
    'serverFlagsJson',
  );
  @override
  late final GeneratedColumn<String> serverFlagsJson = GeneratedColumn<String>(
    'server_flags_json',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _serverPercentMeta = const VerificationMeta(
    'serverPercent',
  );
  @override
  late final GeneratedColumn<double> serverPercent = GeneratedColumn<double>(
    'server_percent',
    aliasedName,
    true,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    reportId,
    wbsItemId,
    reportedPercent,
    quantityToday,
    stepsJson,
    crewCount,
    note,
    serverStatus,
    serverFlagsJson,
    serverPercent,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'local_report_items';
  @override
  VerificationContext validateIntegrity(
    Insertable<LocalReportItemRow> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('report_id')) {
      context.handle(
        _reportIdMeta,
        reportId.isAcceptableOrUnknown(data['report_id']!, _reportIdMeta),
      );
    } else if (isInserting) {
      context.missing(_reportIdMeta);
    }
    if (data.containsKey('wbs_item_id')) {
      context.handle(
        _wbsItemIdMeta,
        wbsItemId.isAcceptableOrUnknown(data['wbs_item_id']!, _wbsItemIdMeta),
      );
    } else if (isInserting) {
      context.missing(_wbsItemIdMeta);
    }
    if (data.containsKey('reported_percent')) {
      context.handle(
        _reportedPercentMeta,
        reportedPercent.isAcceptableOrUnknown(
          data['reported_percent']!,
          _reportedPercentMeta,
        ),
      );
    }
    if (data.containsKey('quantity_today')) {
      context.handle(
        _quantityTodayMeta,
        quantityToday.isAcceptableOrUnknown(
          data['quantity_today']!,
          _quantityTodayMeta,
        ),
      );
    }
    if (data.containsKey('steps_json')) {
      context.handle(
        _stepsJsonMeta,
        stepsJson.isAcceptableOrUnknown(data['steps_json']!, _stepsJsonMeta),
      );
    }
    if (data.containsKey('crew_count')) {
      context.handle(
        _crewCountMeta,
        crewCount.isAcceptableOrUnknown(data['crew_count']!, _crewCountMeta),
      );
    }
    if (data.containsKey('note')) {
      context.handle(
        _noteMeta,
        note.isAcceptableOrUnknown(data['note']!, _noteMeta),
      );
    }
    if (data.containsKey('server_status')) {
      context.handle(
        _serverStatusMeta,
        serverStatus.isAcceptableOrUnknown(
          data['server_status']!,
          _serverStatusMeta,
        ),
      );
    }
    if (data.containsKey('server_flags_json')) {
      context.handle(
        _serverFlagsJsonMeta,
        serverFlagsJson.isAcceptableOrUnknown(
          data['server_flags_json']!,
          _serverFlagsJsonMeta,
        ),
      );
    }
    if (data.containsKey('server_percent')) {
      context.handle(
        _serverPercentMeta,
        serverPercent.isAcceptableOrUnknown(
          data['server_percent']!,
          _serverPercentMeta,
        ),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  List<Set<GeneratedColumn>> get uniqueKeys => [
    {reportId, wbsItemId},
  ];
  @override
  LocalReportItemRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return LocalReportItemRow(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      reportId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}report_id'],
      )!,
      wbsItemId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}wbs_item_id'],
      )!,
      reportedPercent: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}reported_percent'],
      ),
      quantityToday: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}quantity_today'],
      ),
      stepsJson: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}steps_json'],
      ),
      crewCount: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}crew_count'],
      ),
      note: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}note'],
      ),
      serverStatus: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}server_status'],
      ),
      serverFlagsJson: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}server_flags_json'],
      ),
      serverPercent: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}server_percent'],
      ),
    );
  }

  @override
  $LocalReportItemsTable createAlias(String alias) {
    return $LocalReportItemsTable(attachedDatabase, alias);
  }
}

class LocalReportItemRow extends DataClass
    implements Insertable<LocalReportItemRow> {
  final String id;
  final String reportId;
  final String wbsItemId;
  final double? reportedPercent;
  final double? quantityToday;
  final String? stepsJson;
  final int? crewCount;
  final String? note;

  /// وضعیت و پرچم‌های پاسخ سرور پس از ارسال
  final String? serverStatus;
  final String? serverFlagsJson;
  final double? serverPercent;
  const LocalReportItemRow({
    required this.id,
    required this.reportId,
    required this.wbsItemId,
    this.reportedPercent,
    this.quantityToday,
    this.stepsJson,
    this.crewCount,
    this.note,
    this.serverStatus,
    this.serverFlagsJson,
    this.serverPercent,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['report_id'] = Variable<String>(reportId);
    map['wbs_item_id'] = Variable<String>(wbsItemId);
    if (!nullToAbsent || reportedPercent != null) {
      map['reported_percent'] = Variable<double>(reportedPercent);
    }
    if (!nullToAbsent || quantityToday != null) {
      map['quantity_today'] = Variable<double>(quantityToday);
    }
    if (!nullToAbsent || stepsJson != null) {
      map['steps_json'] = Variable<String>(stepsJson);
    }
    if (!nullToAbsent || crewCount != null) {
      map['crew_count'] = Variable<int>(crewCount);
    }
    if (!nullToAbsent || note != null) {
      map['note'] = Variable<String>(note);
    }
    if (!nullToAbsent || serverStatus != null) {
      map['server_status'] = Variable<String>(serverStatus);
    }
    if (!nullToAbsent || serverFlagsJson != null) {
      map['server_flags_json'] = Variable<String>(serverFlagsJson);
    }
    if (!nullToAbsent || serverPercent != null) {
      map['server_percent'] = Variable<double>(serverPercent);
    }
    return map;
  }

  LocalReportItemsCompanion toCompanion(bool nullToAbsent) {
    return LocalReportItemsCompanion(
      id: Value(id),
      reportId: Value(reportId),
      wbsItemId: Value(wbsItemId),
      reportedPercent: reportedPercent == null && nullToAbsent
          ? const Value.absent()
          : Value(reportedPercent),
      quantityToday: quantityToday == null && nullToAbsent
          ? const Value.absent()
          : Value(quantityToday),
      stepsJson: stepsJson == null && nullToAbsent
          ? const Value.absent()
          : Value(stepsJson),
      crewCount: crewCount == null && nullToAbsent
          ? const Value.absent()
          : Value(crewCount),
      note: note == null && nullToAbsent ? const Value.absent() : Value(note),
      serverStatus: serverStatus == null && nullToAbsent
          ? const Value.absent()
          : Value(serverStatus),
      serverFlagsJson: serverFlagsJson == null && nullToAbsent
          ? const Value.absent()
          : Value(serverFlagsJson),
      serverPercent: serverPercent == null && nullToAbsent
          ? const Value.absent()
          : Value(serverPercent),
    );
  }

  factory LocalReportItemRow.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return LocalReportItemRow(
      id: serializer.fromJson<String>(json['id']),
      reportId: serializer.fromJson<String>(json['reportId']),
      wbsItemId: serializer.fromJson<String>(json['wbsItemId']),
      reportedPercent: serializer.fromJson<double?>(json['reportedPercent']),
      quantityToday: serializer.fromJson<double?>(json['quantityToday']),
      stepsJson: serializer.fromJson<String?>(json['stepsJson']),
      crewCount: serializer.fromJson<int?>(json['crewCount']),
      note: serializer.fromJson<String?>(json['note']),
      serverStatus: serializer.fromJson<String?>(json['serverStatus']),
      serverFlagsJson: serializer.fromJson<String?>(json['serverFlagsJson']),
      serverPercent: serializer.fromJson<double?>(json['serverPercent']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'reportId': serializer.toJson<String>(reportId),
      'wbsItemId': serializer.toJson<String>(wbsItemId),
      'reportedPercent': serializer.toJson<double?>(reportedPercent),
      'quantityToday': serializer.toJson<double?>(quantityToday),
      'stepsJson': serializer.toJson<String?>(stepsJson),
      'crewCount': serializer.toJson<int?>(crewCount),
      'note': serializer.toJson<String?>(note),
      'serverStatus': serializer.toJson<String?>(serverStatus),
      'serverFlagsJson': serializer.toJson<String?>(serverFlagsJson),
      'serverPercent': serializer.toJson<double?>(serverPercent),
    };
  }

  LocalReportItemRow copyWith({
    String? id,
    String? reportId,
    String? wbsItemId,
    Value<double?> reportedPercent = const Value.absent(),
    Value<double?> quantityToday = const Value.absent(),
    Value<String?> stepsJson = const Value.absent(),
    Value<int?> crewCount = const Value.absent(),
    Value<String?> note = const Value.absent(),
    Value<String?> serverStatus = const Value.absent(),
    Value<String?> serverFlagsJson = const Value.absent(),
    Value<double?> serverPercent = const Value.absent(),
  }) => LocalReportItemRow(
    id: id ?? this.id,
    reportId: reportId ?? this.reportId,
    wbsItemId: wbsItemId ?? this.wbsItemId,
    reportedPercent: reportedPercent.present
        ? reportedPercent.value
        : this.reportedPercent,
    quantityToday: quantityToday.present
        ? quantityToday.value
        : this.quantityToday,
    stepsJson: stepsJson.present ? stepsJson.value : this.stepsJson,
    crewCount: crewCount.present ? crewCount.value : this.crewCount,
    note: note.present ? note.value : this.note,
    serverStatus: serverStatus.present ? serverStatus.value : this.serverStatus,
    serverFlagsJson: serverFlagsJson.present
        ? serverFlagsJson.value
        : this.serverFlagsJson,
    serverPercent: serverPercent.present
        ? serverPercent.value
        : this.serverPercent,
  );
  LocalReportItemRow copyWithCompanion(LocalReportItemsCompanion data) {
    return LocalReportItemRow(
      id: data.id.present ? data.id.value : this.id,
      reportId: data.reportId.present ? data.reportId.value : this.reportId,
      wbsItemId: data.wbsItemId.present ? data.wbsItemId.value : this.wbsItemId,
      reportedPercent: data.reportedPercent.present
          ? data.reportedPercent.value
          : this.reportedPercent,
      quantityToday: data.quantityToday.present
          ? data.quantityToday.value
          : this.quantityToday,
      stepsJson: data.stepsJson.present ? data.stepsJson.value : this.stepsJson,
      crewCount: data.crewCount.present ? data.crewCount.value : this.crewCount,
      note: data.note.present ? data.note.value : this.note,
      serverStatus: data.serverStatus.present
          ? data.serverStatus.value
          : this.serverStatus,
      serverFlagsJson: data.serverFlagsJson.present
          ? data.serverFlagsJson.value
          : this.serverFlagsJson,
      serverPercent: data.serverPercent.present
          ? data.serverPercent.value
          : this.serverPercent,
    );
  }

  @override
  String toString() {
    return (StringBuffer('LocalReportItemRow(')
          ..write('id: $id, ')
          ..write('reportId: $reportId, ')
          ..write('wbsItemId: $wbsItemId, ')
          ..write('reportedPercent: $reportedPercent, ')
          ..write('quantityToday: $quantityToday, ')
          ..write('stepsJson: $stepsJson, ')
          ..write('crewCount: $crewCount, ')
          ..write('note: $note, ')
          ..write('serverStatus: $serverStatus, ')
          ..write('serverFlagsJson: $serverFlagsJson, ')
          ..write('serverPercent: $serverPercent')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    reportId,
    wbsItemId,
    reportedPercent,
    quantityToday,
    stepsJson,
    crewCount,
    note,
    serverStatus,
    serverFlagsJson,
    serverPercent,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is LocalReportItemRow &&
          other.id == this.id &&
          other.reportId == this.reportId &&
          other.wbsItemId == this.wbsItemId &&
          other.reportedPercent == this.reportedPercent &&
          other.quantityToday == this.quantityToday &&
          other.stepsJson == this.stepsJson &&
          other.crewCount == this.crewCount &&
          other.note == this.note &&
          other.serverStatus == this.serverStatus &&
          other.serverFlagsJson == this.serverFlagsJson &&
          other.serverPercent == this.serverPercent);
}

class LocalReportItemsCompanion extends UpdateCompanion<LocalReportItemRow> {
  final Value<String> id;
  final Value<String> reportId;
  final Value<String> wbsItemId;
  final Value<double?> reportedPercent;
  final Value<double?> quantityToday;
  final Value<String?> stepsJson;
  final Value<int?> crewCount;
  final Value<String?> note;
  final Value<String?> serverStatus;
  final Value<String?> serverFlagsJson;
  final Value<double?> serverPercent;
  final Value<int> rowid;
  const LocalReportItemsCompanion({
    this.id = const Value.absent(),
    this.reportId = const Value.absent(),
    this.wbsItemId = const Value.absent(),
    this.reportedPercent = const Value.absent(),
    this.quantityToday = const Value.absent(),
    this.stepsJson = const Value.absent(),
    this.crewCount = const Value.absent(),
    this.note = const Value.absent(),
    this.serverStatus = const Value.absent(),
    this.serverFlagsJson = const Value.absent(),
    this.serverPercent = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  LocalReportItemsCompanion.insert({
    required String id,
    required String reportId,
    required String wbsItemId,
    this.reportedPercent = const Value.absent(),
    this.quantityToday = const Value.absent(),
    this.stepsJson = const Value.absent(),
    this.crewCount = const Value.absent(),
    this.note = const Value.absent(),
    this.serverStatus = const Value.absent(),
    this.serverFlagsJson = const Value.absent(),
    this.serverPercent = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       reportId = Value(reportId),
       wbsItemId = Value(wbsItemId);
  static Insertable<LocalReportItemRow> custom({
    Expression<String>? id,
    Expression<String>? reportId,
    Expression<String>? wbsItemId,
    Expression<double>? reportedPercent,
    Expression<double>? quantityToday,
    Expression<String>? stepsJson,
    Expression<int>? crewCount,
    Expression<String>? note,
    Expression<String>? serverStatus,
    Expression<String>? serverFlagsJson,
    Expression<double>? serverPercent,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (reportId != null) 'report_id': reportId,
      if (wbsItemId != null) 'wbs_item_id': wbsItemId,
      if (reportedPercent != null) 'reported_percent': reportedPercent,
      if (quantityToday != null) 'quantity_today': quantityToday,
      if (stepsJson != null) 'steps_json': stepsJson,
      if (crewCount != null) 'crew_count': crewCount,
      if (note != null) 'note': note,
      if (serverStatus != null) 'server_status': serverStatus,
      if (serverFlagsJson != null) 'server_flags_json': serverFlagsJson,
      if (serverPercent != null) 'server_percent': serverPercent,
      if (rowid != null) 'rowid': rowid,
    });
  }

  LocalReportItemsCompanion copyWith({
    Value<String>? id,
    Value<String>? reportId,
    Value<String>? wbsItemId,
    Value<double?>? reportedPercent,
    Value<double?>? quantityToday,
    Value<String?>? stepsJson,
    Value<int?>? crewCount,
    Value<String?>? note,
    Value<String?>? serverStatus,
    Value<String?>? serverFlagsJson,
    Value<double?>? serverPercent,
    Value<int>? rowid,
  }) {
    return LocalReportItemsCompanion(
      id: id ?? this.id,
      reportId: reportId ?? this.reportId,
      wbsItemId: wbsItemId ?? this.wbsItemId,
      reportedPercent: reportedPercent ?? this.reportedPercent,
      quantityToday: quantityToday ?? this.quantityToday,
      stepsJson: stepsJson ?? this.stepsJson,
      crewCount: crewCount ?? this.crewCount,
      note: note ?? this.note,
      serverStatus: serverStatus ?? this.serverStatus,
      serverFlagsJson: serverFlagsJson ?? this.serverFlagsJson,
      serverPercent: serverPercent ?? this.serverPercent,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (reportId.present) {
      map['report_id'] = Variable<String>(reportId.value);
    }
    if (wbsItemId.present) {
      map['wbs_item_id'] = Variable<String>(wbsItemId.value);
    }
    if (reportedPercent.present) {
      map['reported_percent'] = Variable<double>(reportedPercent.value);
    }
    if (quantityToday.present) {
      map['quantity_today'] = Variable<double>(quantityToday.value);
    }
    if (stepsJson.present) {
      map['steps_json'] = Variable<String>(stepsJson.value);
    }
    if (crewCount.present) {
      map['crew_count'] = Variable<int>(crewCount.value);
    }
    if (note.present) {
      map['note'] = Variable<String>(note.value);
    }
    if (serverStatus.present) {
      map['server_status'] = Variable<String>(serverStatus.value);
    }
    if (serverFlagsJson.present) {
      map['server_flags_json'] = Variable<String>(serverFlagsJson.value);
    }
    if (serverPercent.present) {
      map['server_percent'] = Variable<double>(serverPercent.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('LocalReportItemsCompanion(')
          ..write('id: $id, ')
          ..write('reportId: $reportId, ')
          ..write('wbsItemId: $wbsItemId, ')
          ..write('reportedPercent: $reportedPercent, ')
          ..write('quantityToday: $quantityToday, ')
          ..write('stepsJson: $stepsJson, ')
          ..write('crewCount: $crewCount, ')
          ..write('note: $note, ')
          ..write('serverStatus: $serverStatus, ')
          ..write('serverFlagsJson: $serverFlagsJson, ')
          ..write('serverPercent: $serverPercent, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $LocalPhotosTable extends LocalPhotos
    with TableInfo<$LocalPhotosTable, LocalPhotoRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $LocalPhotosTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _projectIdMeta = const VerificationMeta(
    'projectId',
  );
  @override
  late final GeneratedColumn<String> projectId = GeneratedColumn<String>(
    'project_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _ownerKindMeta = const VerificationMeta(
    'ownerKind',
  );
  @override
  late final GeneratedColumn<String> ownerKind = GeneratedColumn<String>(
    'owner_kind',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _reportIdMeta = const VerificationMeta(
    'reportId',
  );
  @override
  late final GeneratedColumn<String> reportId = GeneratedColumn<String>(
    'report_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _itemIdMeta = const VerificationMeta('itemId');
  @override
  late final GeneratedColumn<String> itemId = GeneratedColumn<String>(
    'item_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _issueIdMeta = const VerificationMeta(
    'issueId',
  );
  @override
  late final GeneratedColumn<String> issueId = GeneratedColumn<String>(
    'issue_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _filePathMeta = const VerificationMeta(
    'filePath',
  );
  @override
  late final GeneratedColumn<String> filePath = GeneratedColumn<String>(
    'file_path',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _sha256Meta = const VerificationMeta('sha256');
  @override
  late final GeneratedColumn<String> sha256 = GeneratedColumn<String>(
    'sha256',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _sizeBytesMeta = const VerificationMeta(
    'sizeBytes',
  );
  @override
  late final GeneratedColumn<int> sizeBytes = GeneratedColumn<int>(
    'size_bytes',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _takenAtMeta = const VerificationMeta(
    'takenAt',
  );
  @override
  late final GeneratedColumn<DateTime> takenAt = GeneratedColumn<DateTime>(
    'taken_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _workDateMeta = const VerificationMeta(
    'workDate',
  );
  @override
  late final GeneratedColumn<String> workDate = GeneratedColumn<String>(
    'work_date',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _latMeta = const VerificationMeta('lat');
  @override
  late final GeneratedColumn<double> lat = GeneratedColumn<double>(
    'lat',
    aliasedName,
    true,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _lngMeta = const VerificationMeta('lng');
  @override
  late final GeneratedColumn<double> lng = GeneratedColumn<double>(
    'lng',
    aliasedName,
    true,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _accuracyMMeta = const VerificationMeta(
    'accuracyM',
  );
  @override
  late final GeneratedColumn<double> accuracyM = GeneratedColumn<double>(
    'accuracy_m',
    aliasedName,
    true,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _mockedMeta = const VerificationMeta('mocked');
  @override
  late final GeneratedColumn<bool> mocked = GeneratedColumn<bool>(
    'mocked',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("mocked" IN (0, 1))',
    ),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _captionMeta = const VerificationMeta(
    'caption',
  );
  @override
  late final GeneratedColumn<String> caption = GeneratedColumn<String>(
    'caption',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _uploadIdMeta = const VerificationMeta(
    'uploadId',
  );
  @override
  late final GeneratedColumn<String> uploadId = GeneratedColumn<String>(
    'upload_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _uploadStateMeta = const VerificationMeta(
    'uploadState',
  );
  @override
  late final GeneratedColumn<String> uploadState = GeneratedColumn<String>(
    'upload_state',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('local'),
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    projectId,
    ownerKind,
    reportId,
    itemId,
    issueId,
    filePath,
    sha256,
    sizeBytes,
    takenAt,
    workDate,
    lat,
    lng,
    accuracyM,
    mocked,
    caption,
    uploadId,
    uploadState,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'local_photos';
  @override
  VerificationContext validateIntegrity(
    Insertable<LocalPhotoRow> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('project_id')) {
      context.handle(
        _projectIdMeta,
        projectId.isAcceptableOrUnknown(data['project_id']!, _projectIdMeta),
      );
    }
    if (data.containsKey('owner_kind')) {
      context.handle(
        _ownerKindMeta,
        ownerKind.isAcceptableOrUnknown(data['owner_kind']!, _ownerKindMeta),
      );
    } else if (isInserting) {
      context.missing(_ownerKindMeta);
    }
    if (data.containsKey('report_id')) {
      context.handle(
        _reportIdMeta,
        reportId.isAcceptableOrUnknown(data['report_id']!, _reportIdMeta),
      );
    }
    if (data.containsKey('item_id')) {
      context.handle(
        _itemIdMeta,
        itemId.isAcceptableOrUnknown(data['item_id']!, _itemIdMeta),
      );
    }
    if (data.containsKey('issue_id')) {
      context.handle(
        _issueIdMeta,
        issueId.isAcceptableOrUnknown(data['issue_id']!, _issueIdMeta),
      );
    }
    if (data.containsKey('file_path')) {
      context.handle(
        _filePathMeta,
        filePath.isAcceptableOrUnknown(data['file_path']!, _filePathMeta),
      );
    } else if (isInserting) {
      context.missing(_filePathMeta);
    }
    if (data.containsKey('sha256')) {
      context.handle(
        _sha256Meta,
        sha256.isAcceptableOrUnknown(data['sha256']!, _sha256Meta),
      );
    } else if (isInserting) {
      context.missing(_sha256Meta);
    }
    if (data.containsKey('size_bytes')) {
      context.handle(
        _sizeBytesMeta,
        sizeBytes.isAcceptableOrUnknown(data['size_bytes']!, _sizeBytesMeta),
      );
    } else if (isInserting) {
      context.missing(_sizeBytesMeta);
    }
    if (data.containsKey('taken_at')) {
      context.handle(
        _takenAtMeta,
        takenAt.isAcceptableOrUnknown(data['taken_at']!, _takenAtMeta),
      );
    } else if (isInserting) {
      context.missing(_takenAtMeta);
    }
    if (data.containsKey('work_date')) {
      context.handle(
        _workDateMeta,
        workDate.isAcceptableOrUnknown(data['work_date']!, _workDateMeta),
      );
    } else if (isInserting) {
      context.missing(_workDateMeta);
    }
    if (data.containsKey('lat')) {
      context.handle(
        _latMeta,
        lat.isAcceptableOrUnknown(data['lat']!, _latMeta),
      );
    }
    if (data.containsKey('lng')) {
      context.handle(
        _lngMeta,
        lng.isAcceptableOrUnknown(data['lng']!, _lngMeta),
      );
    }
    if (data.containsKey('accuracy_m')) {
      context.handle(
        _accuracyMMeta,
        accuracyM.isAcceptableOrUnknown(data['accuracy_m']!, _accuracyMMeta),
      );
    }
    if (data.containsKey('mocked')) {
      context.handle(
        _mockedMeta,
        mocked.isAcceptableOrUnknown(data['mocked']!, _mockedMeta),
      );
    }
    if (data.containsKey('caption')) {
      context.handle(
        _captionMeta,
        caption.isAcceptableOrUnknown(data['caption']!, _captionMeta),
      );
    }
    if (data.containsKey('upload_id')) {
      context.handle(
        _uploadIdMeta,
        uploadId.isAcceptableOrUnknown(data['upload_id']!, _uploadIdMeta),
      );
    }
    if (data.containsKey('upload_state')) {
      context.handle(
        _uploadStateMeta,
        uploadState.isAcceptableOrUnknown(
          data['upload_state']!,
          _uploadStateMeta,
        ),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  LocalPhotoRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return LocalPhotoRow(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      projectId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}project_id'],
      ),
      ownerKind: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}owner_kind'],
      )!,
      reportId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}report_id'],
      ),
      itemId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}item_id'],
      ),
      issueId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}issue_id'],
      ),
      filePath: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}file_path'],
      )!,
      sha256: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}sha256'],
      )!,
      sizeBytes: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}size_bytes'],
      )!,
      takenAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}taken_at'],
      )!,
      workDate: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}work_date'],
      )!,
      lat: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}lat'],
      ),
      lng: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}lng'],
      ),
      accuracyM: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}accuracy_m'],
      ),
      mocked: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}mocked'],
      )!,
      caption: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}caption'],
      ),
      uploadId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}upload_id'],
      ),
      uploadState: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}upload_state'],
      )!,
    );
  }

  @override
  $LocalPhotosTable createAlias(String alias) {
    return $LocalPhotosTable(attachedDatabase, alias);
  }
}

class LocalPhotoRow extends DataClass implements Insertable<LocalPhotoRow> {
  final String id;
  final String? projectId;
  final String ownerKind;
  final String? reportId;
  final String? itemId;
  final String? issueId;
  final String filePath;
  final String sha256;
  final int sizeBytes;
  final DateTime takenAt;
  final String workDate;
  final double? lat;
  final double? lng;
  final double? accuracyM;
  final bool mocked;
  final String? caption;
  final String? uploadId;

  /// local | queued | uploaded
  final String uploadState;
  const LocalPhotoRow({
    required this.id,
    this.projectId,
    required this.ownerKind,
    this.reportId,
    this.itemId,
    this.issueId,
    required this.filePath,
    required this.sha256,
    required this.sizeBytes,
    required this.takenAt,
    required this.workDate,
    this.lat,
    this.lng,
    this.accuracyM,
    required this.mocked,
    this.caption,
    this.uploadId,
    required this.uploadState,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    if (!nullToAbsent || projectId != null) {
      map['project_id'] = Variable<String>(projectId);
    }
    map['owner_kind'] = Variable<String>(ownerKind);
    if (!nullToAbsent || reportId != null) {
      map['report_id'] = Variable<String>(reportId);
    }
    if (!nullToAbsent || itemId != null) {
      map['item_id'] = Variable<String>(itemId);
    }
    if (!nullToAbsent || issueId != null) {
      map['issue_id'] = Variable<String>(issueId);
    }
    map['file_path'] = Variable<String>(filePath);
    map['sha256'] = Variable<String>(sha256);
    map['size_bytes'] = Variable<int>(sizeBytes);
    map['taken_at'] = Variable<DateTime>(takenAt);
    map['work_date'] = Variable<String>(workDate);
    if (!nullToAbsent || lat != null) {
      map['lat'] = Variable<double>(lat);
    }
    if (!nullToAbsent || lng != null) {
      map['lng'] = Variable<double>(lng);
    }
    if (!nullToAbsent || accuracyM != null) {
      map['accuracy_m'] = Variable<double>(accuracyM);
    }
    map['mocked'] = Variable<bool>(mocked);
    if (!nullToAbsent || caption != null) {
      map['caption'] = Variable<String>(caption);
    }
    if (!nullToAbsent || uploadId != null) {
      map['upload_id'] = Variable<String>(uploadId);
    }
    map['upload_state'] = Variable<String>(uploadState);
    return map;
  }

  LocalPhotosCompanion toCompanion(bool nullToAbsent) {
    return LocalPhotosCompanion(
      id: Value(id),
      projectId: projectId == null && nullToAbsent
          ? const Value.absent()
          : Value(projectId),
      ownerKind: Value(ownerKind),
      reportId: reportId == null && nullToAbsent
          ? const Value.absent()
          : Value(reportId),
      itemId: itemId == null && nullToAbsent
          ? const Value.absent()
          : Value(itemId),
      issueId: issueId == null && nullToAbsent
          ? const Value.absent()
          : Value(issueId),
      filePath: Value(filePath),
      sha256: Value(sha256),
      sizeBytes: Value(sizeBytes),
      takenAt: Value(takenAt),
      workDate: Value(workDate),
      lat: lat == null && nullToAbsent ? const Value.absent() : Value(lat),
      lng: lng == null && nullToAbsent ? const Value.absent() : Value(lng),
      accuracyM: accuracyM == null && nullToAbsent
          ? const Value.absent()
          : Value(accuracyM),
      mocked: Value(mocked),
      caption: caption == null && nullToAbsent
          ? const Value.absent()
          : Value(caption),
      uploadId: uploadId == null && nullToAbsent
          ? const Value.absent()
          : Value(uploadId),
      uploadState: Value(uploadState),
    );
  }

  factory LocalPhotoRow.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return LocalPhotoRow(
      id: serializer.fromJson<String>(json['id']),
      projectId: serializer.fromJson<String?>(json['projectId']),
      ownerKind: serializer.fromJson<String>(json['ownerKind']),
      reportId: serializer.fromJson<String?>(json['reportId']),
      itemId: serializer.fromJson<String?>(json['itemId']),
      issueId: serializer.fromJson<String?>(json['issueId']),
      filePath: serializer.fromJson<String>(json['filePath']),
      sha256: serializer.fromJson<String>(json['sha256']),
      sizeBytes: serializer.fromJson<int>(json['sizeBytes']),
      takenAt: serializer.fromJson<DateTime>(json['takenAt']),
      workDate: serializer.fromJson<String>(json['workDate']),
      lat: serializer.fromJson<double?>(json['lat']),
      lng: serializer.fromJson<double?>(json['lng']),
      accuracyM: serializer.fromJson<double?>(json['accuracyM']),
      mocked: serializer.fromJson<bool>(json['mocked']),
      caption: serializer.fromJson<String?>(json['caption']),
      uploadId: serializer.fromJson<String?>(json['uploadId']),
      uploadState: serializer.fromJson<String>(json['uploadState']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'projectId': serializer.toJson<String?>(projectId),
      'ownerKind': serializer.toJson<String>(ownerKind),
      'reportId': serializer.toJson<String?>(reportId),
      'itemId': serializer.toJson<String?>(itemId),
      'issueId': serializer.toJson<String?>(issueId),
      'filePath': serializer.toJson<String>(filePath),
      'sha256': serializer.toJson<String>(sha256),
      'sizeBytes': serializer.toJson<int>(sizeBytes),
      'takenAt': serializer.toJson<DateTime>(takenAt),
      'workDate': serializer.toJson<String>(workDate),
      'lat': serializer.toJson<double?>(lat),
      'lng': serializer.toJson<double?>(lng),
      'accuracyM': serializer.toJson<double?>(accuracyM),
      'mocked': serializer.toJson<bool>(mocked),
      'caption': serializer.toJson<String?>(caption),
      'uploadId': serializer.toJson<String?>(uploadId),
      'uploadState': serializer.toJson<String>(uploadState),
    };
  }

  LocalPhotoRow copyWith({
    String? id,
    Value<String?> projectId = const Value.absent(),
    String? ownerKind,
    Value<String?> reportId = const Value.absent(),
    Value<String?> itemId = const Value.absent(),
    Value<String?> issueId = const Value.absent(),
    String? filePath,
    String? sha256,
    int? sizeBytes,
    DateTime? takenAt,
    String? workDate,
    Value<double?> lat = const Value.absent(),
    Value<double?> lng = const Value.absent(),
    Value<double?> accuracyM = const Value.absent(),
    bool? mocked,
    Value<String?> caption = const Value.absent(),
    Value<String?> uploadId = const Value.absent(),
    String? uploadState,
  }) => LocalPhotoRow(
    id: id ?? this.id,
    projectId: projectId.present ? projectId.value : this.projectId,
    ownerKind: ownerKind ?? this.ownerKind,
    reportId: reportId.present ? reportId.value : this.reportId,
    itemId: itemId.present ? itemId.value : this.itemId,
    issueId: issueId.present ? issueId.value : this.issueId,
    filePath: filePath ?? this.filePath,
    sha256: sha256 ?? this.sha256,
    sizeBytes: sizeBytes ?? this.sizeBytes,
    takenAt: takenAt ?? this.takenAt,
    workDate: workDate ?? this.workDate,
    lat: lat.present ? lat.value : this.lat,
    lng: lng.present ? lng.value : this.lng,
    accuracyM: accuracyM.present ? accuracyM.value : this.accuracyM,
    mocked: mocked ?? this.mocked,
    caption: caption.present ? caption.value : this.caption,
    uploadId: uploadId.present ? uploadId.value : this.uploadId,
    uploadState: uploadState ?? this.uploadState,
  );
  LocalPhotoRow copyWithCompanion(LocalPhotosCompanion data) {
    return LocalPhotoRow(
      id: data.id.present ? data.id.value : this.id,
      projectId: data.projectId.present ? data.projectId.value : this.projectId,
      ownerKind: data.ownerKind.present ? data.ownerKind.value : this.ownerKind,
      reportId: data.reportId.present ? data.reportId.value : this.reportId,
      itemId: data.itemId.present ? data.itemId.value : this.itemId,
      issueId: data.issueId.present ? data.issueId.value : this.issueId,
      filePath: data.filePath.present ? data.filePath.value : this.filePath,
      sha256: data.sha256.present ? data.sha256.value : this.sha256,
      sizeBytes: data.sizeBytes.present ? data.sizeBytes.value : this.sizeBytes,
      takenAt: data.takenAt.present ? data.takenAt.value : this.takenAt,
      workDate: data.workDate.present ? data.workDate.value : this.workDate,
      lat: data.lat.present ? data.lat.value : this.lat,
      lng: data.lng.present ? data.lng.value : this.lng,
      accuracyM: data.accuracyM.present ? data.accuracyM.value : this.accuracyM,
      mocked: data.mocked.present ? data.mocked.value : this.mocked,
      caption: data.caption.present ? data.caption.value : this.caption,
      uploadId: data.uploadId.present ? data.uploadId.value : this.uploadId,
      uploadState: data.uploadState.present
          ? data.uploadState.value
          : this.uploadState,
    );
  }

  @override
  String toString() {
    return (StringBuffer('LocalPhotoRow(')
          ..write('id: $id, ')
          ..write('projectId: $projectId, ')
          ..write('ownerKind: $ownerKind, ')
          ..write('reportId: $reportId, ')
          ..write('itemId: $itemId, ')
          ..write('issueId: $issueId, ')
          ..write('filePath: $filePath, ')
          ..write('sha256: $sha256, ')
          ..write('sizeBytes: $sizeBytes, ')
          ..write('takenAt: $takenAt, ')
          ..write('workDate: $workDate, ')
          ..write('lat: $lat, ')
          ..write('lng: $lng, ')
          ..write('accuracyM: $accuracyM, ')
          ..write('mocked: $mocked, ')
          ..write('caption: $caption, ')
          ..write('uploadId: $uploadId, ')
          ..write('uploadState: $uploadState')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    projectId,
    ownerKind,
    reportId,
    itemId,
    issueId,
    filePath,
    sha256,
    sizeBytes,
    takenAt,
    workDate,
    lat,
    lng,
    accuracyM,
    mocked,
    caption,
    uploadId,
    uploadState,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is LocalPhotoRow &&
          other.id == this.id &&
          other.projectId == this.projectId &&
          other.ownerKind == this.ownerKind &&
          other.reportId == this.reportId &&
          other.itemId == this.itemId &&
          other.issueId == this.issueId &&
          other.filePath == this.filePath &&
          other.sha256 == this.sha256 &&
          other.sizeBytes == this.sizeBytes &&
          other.takenAt == this.takenAt &&
          other.workDate == this.workDate &&
          other.lat == this.lat &&
          other.lng == this.lng &&
          other.accuracyM == this.accuracyM &&
          other.mocked == this.mocked &&
          other.caption == this.caption &&
          other.uploadId == this.uploadId &&
          other.uploadState == this.uploadState);
}

class LocalPhotosCompanion extends UpdateCompanion<LocalPhotoRow> {
  final Value<String> id;
  final Value<String?> projectId;
  final Value<String> ownerKind;
  final Value<String?> reportId;
  final Value<String?> itemId;
  final Value<String?> issueId;
  final Value<String> filePath;
  final Value<String> sha256;
  final Value<int> sizeBytes;
  final Value<DateTime> takenAt;
  final Value<String> workDate;
  final Value<double?> lat;
  final Value<double?> lng;
  final Value<double?> accuracyM;
  final Value<bool> mocked;
  final Value<String?> caption;
  final Value<String?> uploadId;
  final Value<String> uploadState;
  final Value<int> rowid;
  const LocalPhotosCompanion({
    this.id = const Value.absent(),
    this.projectId = const Value.absent(),
    this.ownerKind = const Value.absent(),
    this.reportId = const Value.absent(),
    this.itemId = const Value.absent(),
    this.issueId = const Value.absent(),
    this.filePath = const Value.absent(),
    this.sha256 = const Value.absent(),
    this.sizeBytes = const Value.absent(),
    this.takenAt = const Value.absent(),
    this.workDate = const Value.absent(),
    this.lat = const Value.absent(),
    this.lng = const Value.absent(),
    this.accuracyM = const Value.absent(),
    this.mocked = const Value.absent(),
    this.caption = const Value.absent(),
    this.uploadId = const Value.absent(),
    this.uploadState = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  LocalPhotosCompanion.insert({
    required String id,
    this.projectId = const Value.absent(),
    required String ownerKind,
    this.reportId = const Value.absent(),
    this.itemId = const Value.absent(),
    this.issueId = const Value.absent(),
    required String filePath,
    required String sha256,
    required int sizeBytes,
    required DateTime takenAt,
    required String workDate,
    this.lat = const Value.absent(),
    this.lng = const Value.absent(),
    this.accuracyM = const Value.absent(),
    this.mocked = const Value.absent(),
    this.caption = const Value.absent(),
    this.uploadId = const Value.absent(),
    this.uploadState = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       ownerKind = Value(ownerKind),
       filePath = Value(filePath),
       sha256 = Value(sha256),
       sizeBytes = Value(sizeBytes),
       takenAt = Value(takenAt),
       workDate = Value(workDate);
  static Insertable<LocalPhotoRow> custom({
    Expression<String>? id,
    Expression<String>? projectId,
    Expression<String>? ownerKind,
    Expression<String>? reportId,
    Expression<String>? itemId,
    Expression<String>? issueId,
    Expression<String>? filePath,
    Expression<String>? sha256,
    Expression<int>? sizeBytes,
    Expression<DateTime>? takenAt,
    Expression<String>? workDate,
    Expression<double>? lat,
    Expression<double>? lng,
    Expression<double>? accuracyM,
    Expression<bool>? mocked,
    Expression<String>? caption,
    Expression<String>? uploadId,
    Expression<String>? uploadState,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (projectId != null) 'project_id': projectId,
      if (ownerKind != null) 'owner_kind': ownerKind,
      if (reportId != null) 'report_id': reportId,
      if (itemId != null) 'item_id': itemId,
      if (issueId != null) 'issue_id': issueId,
      if (filePath != null) 'file_path': filePath,
      if (sha256 != null) 'sha256': sha256,
      if (sizeBytes != null) 'size_bytes': sizeBytes,
      if (takenAt != null) 'taken_at': takenAt,
      if (workDate != null) 'work_date': workDate,
      if (lat != null) 'lat': lat,
      if (lng != null) 'lng': lng,
      if (accuracyM != null) 'accuracy_m': accuracyM,
      if (mocked != null) 'mocked': mocked,
      if (caption != null) 'caption': caption,
      if (uploadId != null) 'upload_id': uploadId,
      if (uploadState != null) 'upload_state': uploadState,
      if (rowid != null) 'rowid': rowid,
    });
  }

  LocalPhotosCompanion copyWith({
    Value<String>? id,
    Value<String?>? projectId,
    Value<String>? ownerKind,
    Value<String?>? reportId,
    Value<String?>? itemId,
    Value<String?>? issueId,
    Value<String>? filePath,
    Value<String>? sha256,
    Value<int>? sizeBytes,
    Value<DateTime>? takenAt,
    Value<String>? workDate,
    Value<double?>? lat,
    Value<double?>? lng,
    Value<double?>? accuracyM,
    Value<bool>? mocked,
    Value<String?>? caption,
    Value<String?>? uploadId,
    Value<String>? uploadState,
    Value<int>? rowid,
  }) {
    return LocalPhotosCompanion(
      id: id ?? this.id,
      projectId: projectId ?? this.projectId,
      ownerKind: ownerKind ?? this.ownerKind,
      reportId: reportId ?? this.reportId,
      itemId: itemId ?? this.itemId,
      issueId: issueId ?? this.issueId,
      filePath: filePath ?? this.filePath,
      sha256: sha256 ?? this.sha256,
      sizeBytes: sizeBytes ?? this.sizeBytes,
      takenAt: takenAt ?? this.takenAt,
      workDate: workDate ?? this.workDate,
      lat: lat ?? this.lat,
      lng: lng ?? this.lng,
      accuracyM: accuracyM ?? this.accuracyM,
      mocked: mocked ?? this.mocked,
      caption: caption ?? this.caption,
      uploadId: uploadId ?? this.uploadId,
      uploadState: uploadState ?? this.uploadState,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (projectId.present) {
      map['project_id'] = Variable<String>(projectId.value);
    }
    if (ownerKind.present) {
      map['owner_kind'] = Variable<String>(ownerKind.value);
    }
    if (reportId.present) {
      map['report_id'] = Variable<String>(reportId.value);
    }
    if (itemId.present) {
      map['item_id'] = Variable<String>(itemId.value);
    }
    if (issueId.present) {
      map['issue_id'] = Variable<String>(issueId.value);
    }
    if (filePath.present) {
      map['file_path'] = Variable<String>(filePath.value);
    }
    if (sha256.present) {
      map['sha256'] = Variable<String>(sha256.value);
    }
    if (sizeBytes.present) {
      map['size_bytes'] = Variable<int>(sizeBytes.value);
    }
    if (takenAt.present) {
      map['taken_at'] = Variable<DateTime>(takenAt.value);
    }
    if (workDate.present) {
      map['work_date'] = Variable<String>(workDate.value);
    }
    if (lat.present) {
      map['lat'] = Variable<double>(lat.value);
    }
    if (lng.present) {
      map['lng'] = Variable<double>(lng.value);
    }
    if (accuracyM.present) {
      map['accuracy_m'] = Variable<double>(accuracyM.value);
    }
    if (mocked.present) {
      map['mocked'] = Variable<bool>(mocked.value);
    }
    if (caption.present) {
      map['caption'] = Variable<String>(caption.value);
    }
    if (uploadId.present) {
      map['upload_id'] = Variable<String>(uploadId.value);
    }
    if (uploadState.present) {
      map['upload_state'] = Variable<String>(uploadState.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('LocalPhotosCompanion(')
          ..write('id: $id, ')
          ..write('projectId: $projectId, ')
          ..write('ownerKind: $ownerKind, ')
          ..write('reportId: $reportId, ')
          ..write('itemId: $itemId, ')
          ..write('issueId: $issueId, ')
          ..write('filePath: $filePath, ')
          ..write('sha256: $sha256, ')
          ..write('sizeBytes: $sizeBytes, ')
          ..write('takenAt: $takenAt, ')
          ..write('workDate: $workDate, ')
          ..write('lat: $lat, ')
          ..write('lng: $lng, ')
          ..write('accuracyM: $accuracyM, ')
          ..write('mocked: $mocked, ')
          ..write('caption: $caption, ')
          ..write('uploadId: $uploadId, ')
          ..write('uploadState: $uploadState, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $LocalIssuesTable extends LocalIssues
    with TableInfo<$LocalIssuesTable, LocalIssueRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $LocalIssuesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _projectIdMeta = const VerificationMeta(
    'projectId',
  );
  @override
  late final GeneratedColumn<String> projectId = GeneratedColumn<String>(
    'project_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _typeMeta = const VerificationMeta('type');
  @override
  late final GeneratedColumn<String> type = GeneratedColumn<String>(
    'type',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _titleMeta = const VerificationMeta('title');
  @override
  late final GeneratedColumn<String> title = GeneratedColumn<String>(
    'title',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _descriptionMeta = const VerificationMeta(
    'description',
  );
  @override
  late final GeneratedColumn<String> description = GeneratedColumn<String>(
    'description',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _effectMeta = const VerificationMeta('effect');
  @override
  late final GeneratedColumn<String> effect = GeneratedColumn<String>(
    'effect',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _wbsItemIdMeta = const VerificationMeta(
    'wbsItemId',
  );
  @override
  late final GeneratedColumn<String> wbsItemId = GeneratedColumn<String>(
    'wbs_item_id',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _deviceRecordedAtMeta = const VerificationMeta(
    'deviceRecordedAt',
  );
  @override
  late final GeneratedColumn<DateTime> deviceRecordedAt =
      GeneratedColumn<DateTime>(
        'device_recorded_at',
        aliasedName,
        false,
        type: DriftSqlType.dateTime,
        requiredDuringInsert: true,
      );
  static const VerificationMeta _stateMeta = const VerificationMeta('state');
  @override
  late final GeneratedColumn<String> state = GeneratedColumn<String>(
    'state',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('queued'),
  );
  static const VerificationMeta _rejectMessageMeta = const VerificationMeta(
    'rejectMessage',
  );
  @override
  late final GeneratedColumn<String> rejectMessage = GeneratedColumn<String>(
    'reject_message',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    projectId,
    type,
    title,
    description,
    effect,
    wbsItemId,
    deviceRecordedAt,
    state,
    rejectMessage,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'local_issues';
  @override
  VerificationContext validateIntegrity(
    Insertable<LocalIssueRow> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('project_id')) {
      context.handle(
        _projectIdMeta,
        projectId.isAcceptableOrUnknown(data['project_id']!, _projectIdMeta),
      );
    } else if (isInserting) {
      context.missing(_projectIdMeta);
    }
    if (data.containsKey('type')) {
      context.handle(
        _typeMeta,
        type.isAcceptableOrUnknown(data['type']!, _typeMeta),
      );
    } else if (isInserting) {
      context.missing(_typeMeta);
    }
    if (data.containsKey('title')) {
      context.handle(
        _titleMeta,
        title.isAcceptableOrUnknown(data['title']!, _titleMeta),
      );
    } else if (isInserting) {
      context.missing(_titleMeta);
    }
    if (data.containsKey('description')) {
      context.handle(
        _descriptionMeta,
        description.isAcceptableOrUnknown(
          data['description']!,
          _descriptionMeta,
        ),
      );
    }
    if (data.containsKey('effect')) {
      context.handle(
        _effectMeta,
        effect.isAcceptableOrUnknown(data['effect']!, _effectMeta),
      );
    } else if (isInserting) {
      context.missing(_effectMeta);
    }
    if (data.containsKey('wbs_item_id')) {
      context.handle(
        _wbsItemIdMeta,
        wbsItemId.isAcceptableOrUnknown(data['wbs_item_id']!, _wbsItemIdMeta),
      );
    }
    if (data.containsKey('device_recorded_at')) {
      context.handle(
        _deviceRecordedAtMeta,
        deviceRecordedAt.isAcceptableOrUnknown(
          data['device_recorded_at']!,
          _deviceRecordedAtMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_deviceRecordedAtMeta);
    }
    if (data.containsKey('state')) {
      context.handle(
        _stateMeta,
        state.isAcceptableOrUnknown(data['state']!, _stateMeta),
      );
    }
    if (data.containsKey('reject_message')) {
      context.handle(
        _rejectMessageMeta,
        rejectMessage.isAcceptableOrUnknown(
          data['reject_message']!,
          _rejectMessageMeta,
        ),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  LocalIssueRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return LocalIssueRow(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      projectId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}project_id'],
      )!,
      type: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}type'],
      )!,
      title: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}title'],
      )!,
      description: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}description'],
      ),
      effect: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}effect'],
      )!,
      wbsItemId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}wbs_item_id'],
      ),
      deviceRecordedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}device_recorded_at'],
      )!,
      state: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}state'],
      )!,
      rejectMessage: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}reject_message'],
      ),
    );
  }

  @override
  $LocalIssuesTable createAlias(String alias) {
    return $LocalIssuesTable(attachedDatabase, alias);
  }
}

class LocalIssueRow extends DataClass implements Insertable<LocalIssueRow> {
  final String id;
  final String projectId;
  final String type;
  final String title;
  final String? description;
  final String effect;
  final String? wbsItemId;
  final DateTime deviceRecordedAt;

  /// queued | sent | rejected
  final String state;
  final String? rejectMessage;
  const LocalIssueRow({
    required this.id,
    required this.projectId,
    required this.type,
    required this.title,
    this.description,
    required this.effect,
    this.wbsItemId,
    required this.deviceRecordedAt,
    required this.state,
    this.rejectMessage,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['project_id'] = Variable<String>(projectId);
    map['type'] = Variable<String>(type);
    map['title'] = Variable<String>(title);
    if (!nullToAbsent || description != null) {
      map['description'] = Variable<String>(description);
    }
    map['effect'] = Variable<String>(effect);
    if (!nullToAbsent || wbsItemId != null) {
      map['wbs_item_id'] = Variable<String>(wbsItemId);
    }
    map['device_recorded_at'] = Variable<DateTime>(deviceRecordedAt);
    map['state'] = Variable<String>(state);
    if (!nullToAbsent || rejectMessage != null) {
      map['reject_message'] = Variable<String>(rejectMessage);
    }
    return map;
  }

  LocalIssuesCompanion toCompanion(bool nullToAbsent) {
    return LocalIssuesCompanion(
      id: Value(id),
      projectId: Value(projectId),
      type: Value(type),
      title: Value(title),
      description: description == null && nullToAbsent
          ? const Value.absent()
          : Value(description),
      effect: Value(effect),
      wbsItemId: wbsItemId == null && nullToAbsent
          ? const Value.absent()
          : Value(wbsItemId),
      deviceRecordedAt: Value(deviceRecordedAt),
      state: Value(state),
      rejectMessage: rejectMessage == null && nullToAbsent
          ? const Value.absent()
          : Value(rejectMessage),
    );
  }

  factory LocalIssueRow.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return LocalIssueRow(
      id: serializer.fromJson<String>(json['id']),
      projectId: serializer.fromJson<String>(json['projectId']),
      type: serializer.fromJson<String>(json['type']),
      title: serializer.fromJson<String>(json['title']),
      description: serializer.fromJson<String?>(json['description']),
      effect: serializer.fromJson<String>(json['effect']),
      wbsItemId: serializer.fromJson<String?>(json['wbsItemId']),
      deviceRecordedAt: serializer.fromJson<DateTime>(json['deviceRecordedAt']),
      state: serializer.fromJson<String>(json['state']),
      rejectMessage: serializer.fromJson<String?>(json['rejectMessage']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'projectId': serializer.toJson<String>(projectId),
      'type': serializer.toJson<String>(type),
      'title': serializer.toJson<String>(title),
      'description': serializer.toJson<String?>(description),
      'effect': serializer.toJson<String>(effect),
      'wbsItemId': serializer.toJson<String?>(wbsItemId),
      'deviceRecordedAt': serializer.toJson<DateTime>(deviceRecordedAt),
      'state': serializer.toJson<String>(state),
      'rejectMessage': serializer.toJson<String?>(rejectMessage),
    };
  }

  LocalIssueRow copyWith({
    String? id,
    String? projectId,
    String? type,
    String? title,
    Value<String?> description = const Value.absent(),
    String? effect,
    Value<String?> wbsItemId = const Value.absent(),
    DateTime? deviceRecordedAt,
    String? state,
    Value<String?> rejectMessage = const Value.absent(),
  }) => LocalIssueRow(
    id: id ?? this.id,
    projectId: projectId ?? this.projectId,
    type: type ?? this.type,
    title: title ?? this.title,
    description: description.present ? description.value : this.description,
    effect: effect ?? this.effect,
    wbsItemId: wbsItemId.present ? wbsItemId.value : this.wbsItemId,
    deviceRecordedAt: deviceRecordedAt ?? this.deviceRecordedAt,
    state: state ?? this.state,
    rejectMessage: rejectMessage.present
        ? rejectMessage.value
        : this.rejectMessage,
  );
  LocalIssueRow copyWithCompanion(LocalIssuesCompanion data) {
    return LocalIssueRow(
      id: data.id.present ? data.id.value : this.id,
      projectId: data.projectId.present ? data.projectId.value : this.projectId,
      type: data.type.present ? data.type.value : this.type,
      title: data.title.present ? data.title.value : this.title,
      description: data.description.present
          ? data.description.value
          : this.description,
      effect: data.effect.present ? data.effect.value : this.effect,
      wbsItemId: data.wbsItemId.present ? data.wbsItemId.value : this.wbsItemId,
      deviceRecordedAt: data.deviceRecordedAt.present
          ? data.deviceRecordedAt.value
          : this.deviceRecordedAt,
      state: data.state.present ? data.state.value : this.state,
      rejectMessage: data.rejectMessage.present
          ? data.rejectMessage.value
          : this.rejectMessage,
    );
  }

  @override
  String toString() {
    return (StringBuffer('LocalIssueRow(')
          ..write('id: $id, ')
          ..write('projectId: $projectId, ')
          ..write('type: $type, ')
          ..write('title: $title, ')
          ..write('description: $description, ')
          ..write('effect: $effect, ')
          ..write('wbsItemId: $wbsItemId, ')
          ..write('deviceRecordedAt: $deviceRecordedAt, ')
          ..write('state: $state, ')
          ..write('rejectMessage: $rejectMessage')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    projectId,
    type,
    title,
    description,
    effect,
    wbsItemId,
    deviceRecordedAt,
    state,
    rejectMessage,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is LocalIssueRow &&
          other.id == this.id &&
          other.projectId == this.projectId &&
          other.type == this.type &&
          other.title == this.title &&
          other.description == this.description &&
          other.effect == this.effect &&
          other.wbsItemId == this.wbsItemId &&
          other.deviceRecordedAt == this.deviceRecordedAt &&
          other.state == this.state &&
          other.rejectMessage == this.rejectMessage);
}

class LocalIssuesCompanion extends UpdateCompanion<LocalIssueRow> {
  final Value<String> id;
  final Value<String> projectId;
  final Value<String> type;
  final Value<String> title;
  final Value<String?> description;
  final Value<String> effect;
  final Value<String?> wbsItemId;
  final Value<DateTime> deviceRecordedAt;
  final Value<String> state;
  final Value<String?> rejectMessage;
  final Value<int> rowid;
  const LocalIssuesCompanion({
    this.id = const Value.absent(),
    this.projectId = const Value.absent(),
    this.type = const Value.absent(),
    this.title = const Value.absent(),
    this.description = const Value.absent(),
    this.effect = const Value.absent(),
    this.wbsItemId = const Value.absent(),
    this.deviceRecordedAt = const Value.absent(),
    this.state = const Value.absent(),
    this.rejectMessage = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  LocalIssuesCompanion.insert({
    required String id,
    required String projectId,
    required String type,
    required String title,
    this.description = const Value.absent(),
    required String effect,
    this.wbsItemId = const Value.absent(),
    required DateTime deviceRecordedAt,
    this.state = const Value.absent(),
    this.rejectMessage = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       projectId = Value(projectId),
       type = Value(type),
       title = Value(title),
       effect = Value(effect),
       deviceRecordedAt = Value(deviceRecordedAt);
  static Insertable<LocalIssueRow> custom({
    Expression<String>? id,
    Expression<String>? projectId,
    Expression<String>? type,
    Expression<String>? title,
    Expression<String>? description,
    Expression<String>? effect,
    Expression<String>? wbsItemId,
    Expression<DateTime>? deviceRecordedAt,
    Expression<String>? state,
    Expression<String>? rejectMessage,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (projectId != null) 'project_id': projectId,
      if (type != null) 'type': type,
      if (title != null) 'title': title,
      if (description != null) 'description': description,
      if (effect != null) 'effect': effect,
      if (wbsItemId != null) 'wbs_item_id': wbsItemId,
      if (deviceRecordedAt != null) 'device_recorded_at': deviceRecordedAt,
      if (state != null) 'state': state,
      if (rejectMessage != null) 'reject_message': rejectMessage,
      if (rowid != null) 'rowid': rowid,
    });
  }

  LocalIssuesCompanion copyWith({
    Value<String>? id,
    Value<String>? projectId,
    Value<String>? type,
    Value<String>? title,
    Value<String?>? description,
    Value<String>? effect,
    Value<String?>? wbsItemId,
    Value<DateTime>? deviceRecordedAt,
    Value<String>? state,
    Value<String?>? rejectMessage,
    Value<int>? rowid,
  }) {
    return LocalIssuesCompanion(
      id: id ?? this.id,
      projectId: projectId ?? this.projectId,
      type: type ?? this.type,
      title: title ?? this.title,
      description: description ?? this.description,
      effect: effect ?? this.effect,
      wbsItemId: wbsItemId ?? this.wbsItemId,
      deviceRecordedAt: deviceRecordedAt ?? this.deviceRecordedAt,
      state: state ?? this.state,
      rejectMessage: rejectMessage ?? this.rejectMessage,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (projectId.present) {
      map['project_id'] = Variable<String>(projectId.value);
    }
    if (type.present) {
      map['type'] = Variable<String>(type.value);
    }
    if (title.present) {
      map['title'] = Variable<String>(title.value);
    }
    if (description.present) {
      map['description'] = Variable<String>(description.value);
    }
    if (effect.present) {
      map['effect'] = Variable<String>(effect.value);
    }
    if (wbsItemId.present) {
      map['wbs_item_id'] = Variable<String>(wbsItemId.value);
    }
    if (deviceRecordedAt.present) {
      map['device_recorded_at'] = Variable<DateTime>(deviceRecordedAt.value);
    }
    if (state.present) {
      map['state'] = Variable<String>(state.value);
    }
    if (rejectMessage.present) {
      map['reject_message'] = Variable<String>(rejectMessage.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('LocalIssuesCompanion(')
          ..write('id: $id, ')
          ..write('projectId: $projectId, ')
          ..write('type: $type, ')
          ..write('title: $title, ')
          ..write('description: $description, ')
          ..write('effect: $effect, ')
          ..write('wbsItemId: $wbsItemId, ')
          ..write('deviceRecordedAt: $deviceRecordedAt, ')
          ..write('state: $state, ')
          ..write('rejectMessage: $rejectMessage, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $LocalResubmissionsTable extends LocalResubmissions
    with TableInfo<$LocalResubmissionsTable, LocalResubmissionRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $LocalResubmissionsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _itemIdMeta = const VerificationMeta('itemId');
  @override
  late final GeneratedColumn<String> itemId = GeneratedColumn<String>(
    'item_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _projectIdMeta = const VerificationMeta(
    'projectId',
  );
  @override
  late final GeneratedColumn<String> projectId = GeneratedColumn<String>(
    'project_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _reportedPercentMeta = const VerificationMeta(
    'reportedPercent',
  );
  @override
  late final GeneratedColumn<double> reportedPercent = GeneratedColumn<double>(
    'reported_percent',
    aliasedName,
    true,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _quantityTodayMeta = const VerificationMeta(
    'quantityToday',
  );
  @override
  late final GeneratedColumn<double> quantityToday = GeneratedColumn<double>(
    'quantity_today',
    aliasedName,
    true,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _stepsJsonMeta = const VerificationMeta(
    'stepsJson',
  );
  @override
  late final GeneratedColumn<String> stepsJson = GeneratedColumn<String>(
    'steps_json',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _noteMeta = const VerificationMeta('note');
  @override
  late final GeneratedColumn<String> note = GeneratedColumn<String>(
    'note',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _stateMeta = const VerificationMeta('state');
  @override
  late final GeneratedColumn<String> state = GeneratedColumn<String>(
    'state',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('queued'),
  );
  static const VerificationMeta _rejectMessageMeta = const VerificationMeta(
    'rejectMessage',
  );
  @override
  late final GeneratedColumn<String> rejectMessage = GeneratedColumn<String>(
    'reject_message',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    itemId,
    projectId,
    reportedPercent,
    quantityToday,
    stepsJson,
    note,
    createdAt,
    state,
    rejectMessage,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'local_resubmissions';
  @override
  VerificationContext validateIntegrity(
    Insertable<LocalResubmissionRow> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('item_id')) {
      context.handle(
        _itemIdMeta,
        itemId.isAcceptableOrUnknown(data['item_id']!, _itemIdMeta),
      );
    } else if (isInserting) {
      context.missing(_itemIdMeta);
    }
    if (data.containsKey('project_id')) {
      context.handle(
        _projectIdMeta,
        projectId.isAcceptableOrUnknown(data['project_id']!, _projectIdMeta),
      );
    } else if (isInserting) {
      context.missing(_projectIdMeta);
    }
    if (data.containsKey('reported_percent')) {
      context.handle(
        _reportedPercentMeta,
        reportedPercent.isAcceptableOrUnknown(
          data['reported_percent']!,
          _reportedPercentMeta,
        ),
      );
    }
    if (data.containsKey('quantity_today')) {
      context.handle(
        _quantityTodayMeta,
        quantityToday.isAcceptableOrUnknown(
          data['quantity_today']!,
          _quantityTodayMeta,
        ),
      );
    }
    if (data.containsKey('steps_json')) {
      context.handle(
        _stepsJsonMeta,
        stepsJson.isAcceptableOrUnknown(data['steps_json']!, _stepsJsonMeta),
      );
    }
    if (data.containsKey('note')) {
      context.handle(
        _noteMeta,
        note.isAcceptableOrUnknown(data['note']!, _noteMeta),
      );
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('state')) {
      context.handle(
        _stateMeta,
        state.isAcceptableOrUnknown(data['state']!, _stateMeta),
      );
    }
    if (data.containsKey('reject_message')) {
      context.handle(
        _rejectMessageMeta,
        rejectMessage.isAcceptableOrUnknown(
          data['reject_message']!,
          _rejectMessageMeta,
        ),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  LocalResubmissionRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return LocalResubmissionRow(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      itemId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}item_id'],
      )!,
      projectId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}project_id'],
      )!,
      reportedPercent: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}reported_percent'],
      ),
      quantityToday: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}quantity_today'],
      ),
      stepsJson: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}steps_json'],
      ),
      note: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}note'],
      ),
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}created_at'],
      )!,
      state: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}state'],
      )!,
      rejectMessage: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}reject_message'],
      ),
    );
  }

  @override
  $LocalResubmissionsTable createAlias(String alias) {
    return $LocalResubmissionsTable(attachedDatabase, alias);
  }
}

class LocalResubmissionRow extends DataClass
    implements Insertable<LocalResubmissionRow> {
  final String id;
  final String itemId;
  final String projectId;
  final double? reportedPercent;
  final double? quantityToday;
  final String? stepsJson;
  final String? note;
  final DateTime createdAt;

  /// queued | sent | rejected
  final String state;
  final String? rejectMessage;
  const LocalResubmissionRow({
    required this.id,
    required this.itemId,
    required this.projectId,
    this.reportedPercent,
    this.quantityToday,
    this.stepsJson,
    this.note,
    required this.createdAt,
    required this.state,
    this.rejectMessage,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['item_id'] = Variable<String>(itemId);
    map['project_id'] = Variable<String>(projectId);
    if (!nullToAbsent || reportedPercent != null) {
      map['reported_percent'] = Variable<double>(reportedPercent);
    }
    if (!nullToAbsent || quantityToday != null) {
      map['quantity_today'] = Variable<double>(quantityToday);
    }
    if (!nullToAbsent || stepsJson != null) {
      map['steps_json'] = Variable<String>(stepsJson);
    }
    if (!nullToAbsent || note != null) {
      map['note'] = Variable<String>(note);
    }
    map['created_at'] = Variable<DateTime>(createdAt);
    map['state'] = Variable<String>(state);
    if (!nullToAbsent || rejectMessage != null) {
      map['reject_message'] = Variable<String>(rejectMessage);
    }
    return map;
  }

  LocalResubmissionsCompanion toCompanion(bool nullToAbsent) {
    return LocalResubmissionsCompanion(
      id: Value(id),
      itemId: Value(itemId),
      projectId: Value(projectId),
      reportedPercent: reportedPercent == null && nullToAbsent
          ? const Value.absent()
          : Value(reportedPercent),
      quantityToday: quantityToday == null && nullToAbsent
          ? const Value.absent()
          : Value(quantityToday),
      stepsJson: stepsJson == null && nullToAbsent
          ? const Value.absent()
          : Value(stepsJson),
      note: note == null && nullToAbsent ? const Value.absent() : Value(note),
      createdAt: Value(createdAt),
      state: Value(state),
      rejectMessage: rejectMessage == null && nullToAbsent
          ? const Value.absent()
          : Value(rejectMessage),
    );
  }

  factory LocalResubmissionRow.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return LocalResubmissionRow(
      id: serializer.fromJson<String>(json['id']),
      itemId: serializer.fromJson<String>(json['itemId']),
      projectId: serializer.fromJson<String>(json['projectId']),
      reportedPercent: serializer.fromJson<double?>(json['reportedPercent']),
      quantityToday: serializer.fromJson<double?>(json['quantityToday']),
      stepsJson: serializer.fromJson<String?>(json['stepsJson']),
      note: serializer.fromJson<String?>(json['note']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      state: serializer.fromJson<String>(json['state']),
      rejectMessage: serializer.fromJson<String?>(json['rejectMessage']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'itemId': serializer.toJson<String>(itemId),
      'projectId': serializer.toJson<String>(projectId),
      'reportedPercent': serializer.toJson<double?>(reportedPercent),
      'quantityToday': serializer.toJson<double?>(quantityToday),
      'stepsJson': serializer.toJson<String?>(stepsJson),
      'note': serializer.toJson<String?>(note),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'state': serializer.toJson<String>(state),
      'rejectMessage': serializer.toJson<String?>(rejectMessage),
    };
  }

  LocalResubmissionRow copyWith({
    String? id,
    String? itemId,
    String? projectId,
    Value<double?> reportedPercent = const Value.absent(),
    Value<double?> quantityToday = const Value.absent(),
    Value<String?> stepsJson = const Value.absent(),
    Value<String?> note = const Value.absent(),
    DateTime? createdAt,
    String? state,
    Value<String?> rejectMessage = const Value.absent(),
  }) => LocalResubmissionRow(
    id: id ?? this.id,
    itemId: itemId ?? this.itemId,
    projectId: projectId ?? this.projectId,
    reportedPercent: reportedPercent.present
        ? reportedPercent.value
        : this.reportedPercent,
    quantityToday: quantityToday.present
        ? quantityToday.value
        : this.quantityToday,
    stepsJson: stepsJson.present ? stepsJson.value : this.stepsJson,
    note: note.present ? note.value : this.note,
    createdAt: createdAt ?? this.createdAt,
    state: state ?? this.state,
    rejectMessage: rejectMessage.present
        ? rejectMessage.value
        : this.rejectMessage,
  );
  LocalResubmissionRow copyWithCompanion(LocalResubmissionsCompanion data) {
    return LocalResubmissionRow(
      id: data.id.present ? data.id.value : this.id,
      itemId: data.itemId.present ? data.itemId.value : this.itemId,
      projectId: data.projectId.present ? data.projectId.value : this.projectId,
      reportedPercent: data.reportedPercent.present
          ? data.reportedPercent.value
          : this.reportedPercent,
      quantityToday: data.quantityToday.present
          ? data.quantityToday.value
          : this.quantityToday,
      stepsJson: data.stepsJson.present ? data.stepsJson.value : this.stepsJson,
      note: data.note.present ? data.note.value : this.note,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      state: data.state.present ? data.state.value : this.state,
      rejectMessage: data.rejectMessage.present
          ? data.rejectMessage.value
          : this.rejectMessage,
    );
  }

  @override
  String toString() {
    return (StringBuffer('LocalResubmissionRow(')
          ..write('id: $id, ')
          ..write('itemId: $itemId, ')
          ..write('projectId: $projectId, ')
          ..write('reportedPercent: $reportedPercent, ')
          ..write('quantityToday: $quantityToday, ')
          ..write('stepsJson: $stepsJson, ')
          ..write('note: $note, ')
          ..write('createdAt: $createdAt, ')
          ..write('state: $state, ')
          ..write('rejectMessage: $rejectMessage')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    itemId,
    projectId,
    reportedPercent,
    quantityToday,
    stepsJson,
    note,
    createdAt,
    state,
    rejectMessage,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is LocalResubmissionRow &&
          other.id == this.id &&
          other.itemId == this.itemId &&
          other.projectId == this.projectId &&
          other.reportedPercent == this.reportedPercent &&
          other.quantityToday == this.quantityToday &&
          other.stepsJson == this.stepsJson &&
          other.note == this.note &&
          other.createdAt == this.createdAt &&
          other.state == this.state &&
          other.rejectMessage == this.rejectMessage);
}

class LocalResubmissionsCompanion
    extends UpdateCompanion<LocalResubmissionRow> {
  final Value<String> id;
  final Value<String> itemId;
  final Value<String> projectId;
  final Value<double?> reportedPercent;
  final Value<double?> quantityToday;
  final Value<String?> stepsJson;
  final Value<String?> note;
  final Value<DateTime> createdAt;
  final Value<String> state;
  final Value<String?> rejectMessage;
  final Value<int> rowid;
  const LocalResubmissionsCompanion({
    this.id = const Value.absent(),
    this.itemId = const Value.absent(),
    this.projectId = const Value.absent(),
    this.reportedPercent = const Value.absent(),
    this.quantityToday = const Value.absent(),
    this.stepsJson = const Value.absent(),
    this.note = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.state = const Value.absent(),
    this.rejectMessage = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  LocalResubmissionsCompanion.insert({
    required String id,
    required String itemId,
    required String projectId,
    this.reportedPercent = const Value.absent(),
    this.quantityToday = const Value.absent(),
    this.stepsJson = const Value.absent(),
    this.note = const Value.absent(),
    required DateTime createdAt,
    this.state = const Value.absent(),
    this.rejectMessage = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       itemId = Value(itemId),
       projectId = Value(projectId),
       createdAt = Value(createdAt);
  static Insertable<LocalResubmissionRow> custom({
    Expression<String>? id,
    Expression<String>? itemId,
    Expression<String>? projectId,
    Expression<double>? reportedPercent,
    Expression<double>? quantityToday,
    Expression<String>? stepsJson,
    Expression<String>? note,
    Expression<DateTime>? createdAt,
    Expression<String>? state,
    Expression<String>? rejectMessage,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (itemId != null) 'item_id': itemId,
      if (projectId != null) 'project_id': projectId,
      if (reportedPercent != null) 'reported_percent': reportedPercent,
      if (quantityToday != null) 'quantity_today': quantityToday,
      if (stepsJson != null) 'steps_json': stepsJson,
      if (note != null) 'note': note,
      if (createdAt != null) 'created_at': createdAt,
      if (state != null) 'state': state,
      if (rejectMessage != null) 'reject_message': rejectMessage,
      if (rowid != null) 'rowid': rowid,
    });
  }

  LocalResubmissionsCompanion copyWith({
    Value<String>? id,
    Value<String>? itemId,
    Value<String>? projectId,
    Value<double?>? reportedPercent,
    Value<double?>? quantityToday,
    Value<String?>? stepsJson,
    Value<String?>? note,
    Value<DateTime>? createdAt,
    Value<String>? state,
    Value<String?>? rejectMessage,
    Value<int>? rowid,
  }) {
    return LocalResubmissionsCompanion(
      id: id ?? this.id,
      itemId: itemId ?? this.itemId,
      projectId: projectId ?? this.projectId,
      reportedPercent: reportedPercent ?? this.reportedPercent,
      quantityToday: quantityToday ?? this.quantityToday,
      stepsJson: stepsJson ?? this.stepsJson,
      note: note ?? this.note,
      createdAt: createdAt ?? this.createdAt,
      state: state ?? this.state,
      rejectMessage: rejectMessage ?? this.rejectMessage,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (itemId.present) {
      map['item_id'] = Variable<String>(itemId.value);
    }
    if (projectId.present) {
      map['project_id'] = Variable<String>(projectId.value);
    }
    if (reportedPercent.present) {
      map['reported_percent'] = Variable<double>(reportedPercent.value);
    }
    if (quantityToday.present) {
      map['quantity_today'] = Variable<double>(quantityToday.value);
    }
    if (stepsJson.present) {
      map['steps_json'] = Variable<String>(stepsJson.value);
    }
    if (note.present) {
      map['note'] = Variable<String>(note.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (state.present) {
      map['state'] = Variable<String>(state.value);
    }
    if (rejectMessage.present) {
      map['reject_message'] = Variable<String>(rejectMessage.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('LocalResubmissionsCompanion(')
          ..write('id: $id, ')
          ..write('itemId: $itemId, ')
          ..write('projectId: $projectId, ')
          ..write('reportedPercent: $reportedPercent, ')
          ..write('quantityToday: $quantityToday, ')
          ..write('stepsJson: $stepsJson, ')
          ..write('note: $note, ')
          ..write('createdAt: $createdAt, ')
          ..write('state: $state, ')
          ..write('rejectMessage: $rejectMessage, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $OutboxTable extends Outbox with TableInfo<$OutboxTable, OutboxRow> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $OutboxTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
    'id',
    aliasedName,
    false,
    hasAutoIncrement: true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'PRIMARY KEY AUTOINCREMENT',
    ),
  );
  static const VerificationMeta _kindMeta = const VerificationMeta('kind');
  @override
  late final GeneratedColumn<String> kind = GeneratedColumn<String>(
    'kind',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _entityIdMeta = const VerificationMeta(
    'entityId',
  );
  @override
  late final GeneratedColumn<String> entityId = GeneratedColumn<String>(
    'entity_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
    defaultConstraints: GeneratedColumn.constraintIsAlways('UNIQUE'),
  );
  static const VerificationMeta _projectIdMeta = const VerificationMeta(
    'projectId',
  );
  @override
  late final GeneratedColumn<String> projectId = GeneratedColumn<String>(
    'project_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _stateMeta = const VerificationMeta('state');
  @override
  late final GeneratedColumn<String> state = GeneratedColumn<String>(
    'state',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('pending'),
  );
  static const VerificationMeta _attemptsMeta = const VerificationMeta(
    'attempts',
  );
  @override
  late final GeneratedColumn<int> attempts = GeneratedColumn<int>(
    'attempts',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _nextAttemptAtMeta = const VerificationMeta(
    'nextAttemptAt',
  );
  @override
  late final GeneratedColumn<DateTime> nextAttemptAt =
      GeneratedColumn<DateTime>(
        'next_attempt_at',
        aliasedName,
        true,
        type: DriftSqlType.dateTime,
        requiredDuringInsert: false,
      );
  static const VerificationMeta _lastErrorCodeMeta = const VerificationMeta(
    'lastErrorCode',
  );
  @override
  late final GeneratedColumn<String> lastErrorCode = GeneratedColumn<String>(
    'last_error_code',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _lastErrorMessageMeta = const VerificationMeta(
    'lastErrorMessage',
  );
  @override
  late final GeneratedColumn<String> lastErrorMessage = GeneratedColumn<String>(
    'last_error_message',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _bytesMeta = const VerificationMeta('bytes');
  @override
  late final GeneratedColumn<int> bytes = GeneratedColumn<int>(
    'bytes',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _updatedAtMeta = const VerificationMeta(
    'updatedAt',
  );
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
    'updated_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    kind,
    entityId,
    projectId,
    state,
    attempts,
    nextAttemptAt,
    lastErrorCode,
    lastErrorMessage,
    bytes,
    createdAt,
    updatedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'outbox';
  @override
  VerificationContext validateIntegrity(
    Insertable<OutboxRow> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('kind')) {
      context.handle(
        _kindMeta,
        kind.isAcceptableOrUnknown(data['kind']!, _kindMeta),
      );
    } else if (isInserting) {
      context.missing(_kindMeta);
    }
    if (data.containsKey('entity_id')) {
      context.handle(
        _entityIdMeta,
        entityId.isAcceptableOrUnknown(data['entity_id']!, _entityIdMeta),
      );
    } else if (isInserting) {
      context.missing(_entityIdMeta);
    }
    if (data.containsKey('project_id')) {
      context.handle(
        _projectIdMeta,
        projectId.isAcceptableOrUnknown(data['project_id']!, _projectIdMeta),
      );
    } else if (isInserting) {
      context.missing(_projectIdMeta);
    }
    if (data.containsKey('state')) {
      context.handle(
        _stateMeta,
        state.isAcceptableOrUnknown(data['state']!, _stateMeta),
      );
    }
    if (data.containsKey('attempts')) {
      context.handle(
        _attemptsMeta,
        attempts.isAcceptableOrUnknown(data['attempts']!, _attemptsMeta),
      );
    }
    if (data.containsKey('next_attempt_at')) {
      context.handle(
        _nextAttemptAtMeta,
        nextAttemptAt.isAcceptableOrUnknown(
          data['next_attempt_at']!,
          _nextAttemptAtMeta,
        ),
      );
    }
    if (data.containsKey('last_error_code')) {
      context.handle(
        _lastErrorCodeMeta,
        lastErrorCode.isAcceptableOrUnknown(
          data['last_error_code']!,
          _lastErrorCodeMeta,
        ),
      );
    }
    if (data.containsKey('last_error_message')) {
      context.handle(
        _lastErrorMessageMeta,
        lastErrorMessage.isAcceptableOrUnknown(
          data['last_error_message']!,
          _lastErrorMessageMeta,
        ),
      );
    }
    if (data.containsKey('bytes')) {
      context.handle(
        _bytesMeta,
        bytes.isAcceptableOrUnknown(data['bytes']!, _bytesMeta),
      );
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('updated_at')) {
      context.handle(
        _updatedAtMeta,
        updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  OutboxRow map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return OutboxRow(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id'],
      )!,
      kind: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}kind'],
      )!,
      entityId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}entity_id'],
      )!,
      projectId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}project_id'],
      )!,
      state: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}state'],
      )!,
      attempts: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}attempts'],
      )!,
      nextAttemptAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}next_attempt_at'],
      ),
      lastErrorCode: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}last_error_code'],
      ),
      lastErrorMessage: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}last_error_message'],
      ),
      bytes: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}bytes'],
      )!,
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}created_at'],
      )!,
      updatedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}updated_at'],
      )!,
    );
  }

  @override
  $OutboxTable createAlias(String alias) {
    return $OutboxTable(attachedDatabase, alias);
  }
}

class OutboxRow extends DataClass implements Insertable<OutboxRow> {
  final int id;

  /// report | issue | resubmit | photo
  final String kind;
  final String entityId;
  final String projectId;

  /// pending | sending | retry | rejected | sent
  final String state;
  final int attempts;
  final DateTime? nextAttemptAt;
  final String? lastErrorCode;
  final String? lastErrorMessage;
  final int bytes;
  final DateTime createdAt;
  final DateTime updatedAt;
  const OutboxRow({
    required this.id,
    required this.kind,
    required this.entityId,
    required this.projectId,
    required this.state,
    required this.attempts,
    this.nextAttemptAt,
    this.lastErrorCode,
    this.lastErrorMessage,
    required this.bytes,
    required this.createdAt,
    required this.updatedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['kind'] = Variable<String>(kind);
    map['entity_id'] = Variable<String>(entityId);
    map['project_id'] = Variable<String>(projectId);
    map['state'] = Variable<String>(state);
    map['attempts'] = Variable<int>(attempts);
    if (!nullToAbsent || nextAttemptAt != null) {
      map['next_attempt_at'] = Variable<DateTime>(nextAttemptAt);
    }
    if (!nullToAbsent || lastErrorCode != null) {
      map['last_error_code'] = Variable<String>(lastErrorCode);
    }
    if (!nullToAbsent || lastErrorMessage != null) {
      map['last_error_message'] = Variable<String>(lastErrorMessage);
    }
    map['bytes'] = Variable<int>(bytes);
    map['created_at'] = Variable<DateTime>(createdAt);
    map['updated_at'] = Variable<DateTime>(updatedAt);
    return map;
  }

  OutboxCompanion toCompanion(bool nullToAbsent) {
    return OutboxCompanion(
      id: Value(id),
      kind: Value(kind),
      entityId: Value(entityId),
      projectId: Value(projectId),
      state: Value(state),
      attempts: Value(attempts),
      nextAttemptAt: nextAttemptAt == null && nullToAbsent
          ? const Value.absent()
          : Value(nextAttemptAt),
      lastErrorCode: lastErrorCode == null && nullToAbsent
          ? const Value.absent()
          : Value(lastErrorCode),
      lastErrorMessage: lastErrorMessage == null && nullToAbsent
          ? const Value.absent()
          : Value(lastErrorMessage),
      bytes: Value(bytes),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
    );
  }

  factory OutboxRow.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return OutboxRow(
      id: serializer.fromJson<int>(json['id']),
      kind: serializer.fromJson<String>(json['kind']),
      entityId: serializer.fromJson<String>(json['entityId']),
      projectId: serializer.fromJson<String>(json['projectId']),
      state: serializer.fromJson<String>(json['state']),
      attempts: serializer.fromJson<int>(json['attempts']),
      nextAttemptAt: serializer.fromJson<DateTime?>(json['nextAttemptAt']),
      lastErrorCode: serializer.fromJson<String?>(json['lastErrorCode']),
      lastErrorMessage: serializer.fromJson<String?>(json['lastErrorMessage']),
      bytes: serializer.fromJson<int>(json['bytes']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      updatedAt: serializer.fromJson<DateTime>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'kind': serializer.toJson<String>(kind),
      'entityId': serializer.toJson<String>(entityId),
      'projectId': serializer.toJson<String>(projectId),
      'state': serializer.toJson<String>(state),
      'attempts': serializer.toJson<int>(attempts),
      'nextAttemptAt': serializer.toJson<DateTime?>(nextAttemptAt),
      'lastErrorCode': serializer.toJson<String?>(lastErrorCode),
      'lastErrorMessage': serializer.toJson<String?>(lastErrorMessage),
      'bytes': serializer.toJson<int>(bytes),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'updatedAt': serializer.toJson<DateTime>(updatedAt),
    };
  }

  OutboxRow copyWith({
    int? id,
    String? kind,
    String? entityId,
    String? projectId,
    String? state,
    int? attempts,
    Value<DateTime?> nextAttemptAt = const Value.absent(),
    Value<String?> lastErrorCode = const Value.absent(),
    Value<String?> lastErrorMessage = const Value.absent(),
    int? bytes,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) => OutboxRow(
    id: id ?? this.id,
    kind: kind ?? this.kind,
    entityId: entityId ?? this.entityId,
    projectId: projectId ?? this.projectId,
    state: state ?? this.state,
    attempts: attempts ?? this.attempts,
    nextAttemptAt: nextAttemptAt.present
        ? nextAttemptAt.value
        : this.nextAttemptAt,
    lastErrorCode: lastErrorCode.present
        ? lastErrorCode.value
        : this.lastErrorCode,
    lastErrorMessage: lastErrorMessage.present
        ? lastErrorMessage.value
        : this.lastErrorMessage,
    bytes: bytes ?? this.bytes,
    createdAt: createdAt ?? this.createdAt,
    updatedAt: updatedAt ?? this.updatedAt,
  );
  OutboxRow copyWithCompanion(OutboxCompanion data) {
    return OutboxRow(
      id: data.id.present ? data.id.value : this.id,
      kind: data.kind.present ? data.kind.value : this.kind,
      entityId: data.entityId.present ? data.entityId.value : this.entityId,
      projectId: data.projectId.present ? data.projectId.value : this.projectId,
      state: data.state.present ? data.state.value : this.state,
      attempts: data.attempts.present ? data.attempts.value : this.attempts,
      nextAttemptAt: data.nextAttemptAt.present
          ? data.nextAttemptAt.value
          : this.nextAttemptAt,
      lastErrorCode: data.lastErrorCode.present
          ? data.lastErrorCode.value
          : this.lastErrorCode,
      lastErrorMessage: data.lastErrorMessage.present
          ? data.lastErrorMessage.value
          : this.lastErrorMessage,
      bytes: data.bytes.present ? data.bytes.value : this.bytes,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('OutboxRow(')
          ..write('id: $id, ')
          ..write('kind: $kind, ')
          ..write('entityId: $entityId, ')
          ..write('projectId: $projectId, ')
          ..write('state: $state, ')
          ..write('attempts: $attempts, ')
          ..write('nextAttemptAt: $nextAttemptAt, ')
          ..write('lastErrorCode: $lastErrorCode, ')
          ..write('lastErrorMessage: $lastErrorMessage, ')
          ..write('bytes: $bytes, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    kind,
    entityId,
    projectId,
    state,
    attempts,
    nextAttemptAt,
    lastErrorCode,
    lastErrorMessage,
    bytes,
    createdAt,
    updatedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is OutboxRow &&
          other.id == this.id &&
          other.kind == this.kind &&
          other.entityId == this.entityId &&
          other.projectId == this.projectId &&
          other.state == this.state &&
          other.attempts == this.attempts &&
          other.nextAttemptAt == this.nextAttemptAt &&
          other.lastErrorCode == this.lastErrorCode &&
          other.lastErrorMessage == this.lastErrorMessage &&
          other.bytes == this.bytes &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt);
}

class OutboxCompanion extends UpdateCompanion<OutboxRow> {
  final Value<int> id;
  final Value<String> kind;
  final Value<String> entityId;
  final Value<String> projectId;
  final Value<String> state;
  final Value<int> attempts;
  final Value<DateTime?> nextAttemptAt;
  final Value<String?> lastErrorCode;
  final Value<String?> lastErrorMessage;
  final Value<int> bytes;
  final Value<DateTime> createdAt;
  final Value<DateTime> updatedAt;
  const OutboxCompanion({
    this.id = const Value.absent(),
    this.kind = const Value.absent(),
    this.entityId = const Value.absent(),
    this.projectId = const Value.absent(),
    this.state = const Value.absent(),
    this.attempts = const Value.absent(),
    this.nextAttemptAt = const Value.absent(),
    this.lastErrorCode = const Value.absent(),
    this.lastErrorMessage = const Value.absent(),
    this.bytes = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
  });
  OutboxCompanion.insert({
    this.id = const Value.absent(),
    required String kind,
    required String entityId,
    required String projectId,
    this.state = const Value.absent(),
    this.attempts = const Value.absent(),
    this.nextAttemptAt = const Value.absent(),
    this.lastErrorCode = const Value.absent(),
    this.lastErrorMessage = const Value.absent(),
    this.bytes = const Value.absent(),
    required DateTime createdAt,
    required DateTime updatedAt,
  }) : kind = Value(kind),
       entityId = Value(entityId),
       projectId = Value(projectId),
       createdAt = Value(createdAt),
       updatedAt = Value(updatedAt);
  static Insertable<OutboxRow> custom({
    Expression<int>? id,
    Expression<String>? kind,
    Expression<String>? entityId,
    Expression<String>? projectId,
    Expression<String>? state,
    Expression<int>? attempts,
    Expression<DateTime>? nextAttemptAt,
    Expression<String>? lastErrorCode,
    Expression<String>? lastErrorMessage,
    Expression<int>? bytes,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? updatedAt,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (kind != null) 'kind': kind,
      if (entityId != null) 'entity_id': entityId,
      if (projectId != null) 'project_id': projectId,
      if (state != null) 'state': state,
      if (attempts != null) 'attempts': attempts,
      if (nextAttemptAt != null) 'next_attempt_at': nextAttemptAt,
      if (lastErrorCode != null) 'last_error_code': lastErrorCode,
      if (lastErrorMessage != null) 'last_error_message': lastErrorMessage,
      if (bytes != null) 'bytes': bytes,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
    });
  }

  OutboxCompanion copyWith({
    Value<int>? id,
    Value<String>? kind,
    Value<String>? entityId,
    Value<String>? projectId,
    Value<String>? state,
    Value<int>? attempts,
    Value<DateTime?>? nextAttemptAt,
    Value<String?>? lastErrorCode,
    Value<String?>? lastErrorMessage,
    Value<int>? bytes,
    Value<DateTime>? createdAt,
    Value<DateTime>? updatedAt,
  }) {
    return OutboxCompanion(
      id: id ?? this.id,
      kind: kind ?? this.kind,
      entityId: entityId ?? this.entityId,
      projectId: projectId ?? this.projectId,
      state: state ?? this.state,
      attempts: attempts ?? this.attempts,
      nextAttemptAt: nextAttemptAt ?? this.nextAttemptAt,
      lastErrorCode: lastErrorCode ?? this.lastErrorCode,
      lastErrorMessage: lastErrorMessage ?? this.lastErrorMessage,
      bytes: bytes ?? this.bytes,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (kind.present) {
      map['kind'] = Variable<String>(kind.value);
    }
    if (entityId.present) {
      map['entity_id'] = Variable<String>(entityId.value);
    }
    if (projectId.present) {
      map['project_id'] = Variable<String>(projectId.value);
    }
    if (state.present) {
      map['state'] = Variable<String>(state.value);
    }
    if (attempts.present) {
      map['attempts'] = Variable<int>(attempts.value);
    }
    if (nextAttemptAt.present) {
      map['next_attempt_at'] = Variable<DateTime>(nextAttemptAt.value);
    }
    if (lastErrorCode.present) {
      map['last_error_code'] = Variable<String>(lastErrorCode.value);
    }
    if (lastErrorMessage.present) {
      map['last_error_message'] = Variable<String>(lastErrorMessage.value);
    }
    if (bytes.present) {
      map['bytes'] = Variable<int>(bytes.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('OutboxCompanion(')
          ..write('id: $id, ')
          ..write('kind: $kind, ')
          ..write('entityId: $entityId, ')
          ..write('projectId: $projectId, ')
          ..write('state: $state, ')
          ..write('attempts: $attempts, ')
          ..write('nextAttemptAt: $nextAttemptAt, ')
          ..write('lastErrorCode: $lastErrorCode, ')
          ..write('lastErrorMessage: $lastErrorMessage, ')
          ..write('bytes: $bytes, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $ProjectsTable projects = $ProjectsTable(this);
  late final $ActivitiesTable activities = $ActivitiesTable(this);
  late final $ServerItemsTable serverItems = $ServerItemsTable(this);
  late final $SiteIssuesTable siteIssues = $SiteIssuesTable(this);
  late final $NotificationsTable notifications = $NotificationsTable(this);
  late final $SyncMetaTable syncMeta = $SyncMetaTable(this);
  late final $LocalReportsTable localReports = $LocalReportsTable(this);
  late final $LocalReportItemsTable localReportItems = $LocalReportItemsTable(
    this,
  );
  late final $LocalPhotosTable localPhotos = $LocalPhotosTable(this);
  late final $LocalIssuesTable localIssues = $LocalIssuesTable(this);
  late final $LocalResubmissionsTable localResubmissions =
      $LocalResubmissionsTable(this);
  late final $OutboxTable outbox = $OutboxTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
    projects,
    activities,
    serverItems,
    siteIssues,
    notifications,
    syncMeta,
    localReports,
    localReportItems,
    localPhotos,
    localIssues,
    localResubmissions,
    outbox,
  ];
  @override
  StreamQueryUpdateRules get streamUpdateRules => const StreamQueryUpdateRules([
    WritePropagation(
      on: TableUpdateQuery.onTableName(
        'local_reports',
        limitUpdateKind: UpdateKind.delete,
      ),
      result: [TableUpdate('local_report_items', kind: UpdateKind.delete)],
    ),
  ]);
}

typedef $$ProjectsTableCreateCompanionBuilder =
    ProjectsCompanion Function({
      required String id,
      required String name,
      Value<double?> siteLat,
      Value<double?> siteLng,
      Value<double?> radiusM,
      Value<int> minPhotos,
      Value<double?> maxJumpPct,
      Value<bool> allowDecrease,
      Value<int?> lateAfterHours,
      Value<String?> gpsMode,
      Value<String?> approvalMode,
      Value<String> calendarJson,
      Value<bool> reminderEnabled,
      Value<String> reminderTime,
      Value<int> rowid,
    });
typedef $$ProjectsTableUpdateCompanionBuilder =
    ProjectsCompanion Function({
      Value<String> id,
      Value<String> name,
      Value<double?> siteLat,
      Value<double?> siteLng,
      Value<double?> radiusM,
      Value<int> minPhotos,
      Value<double?> maxJumpPct,
      Value<bool> allowDecrease,
      Value<int?> lateAfterHours,
      Value<String?> gpsMode,
      Value<String?> approvalMode,
      Value<String> calendarJson,
      Value<bool> reminderEnabled,
      Value<String> reminderTime,
      Value<int> rowid,
    });

class $$ProjectsTableFilterComposer
    extends Composer<_$AppDatabase, $ProjectsTable> {
  $$ProjectsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get siteLat => $composableBuilder(
    column: $table.siteLat,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get siteLng => $composableBuilder(
    column: $table.siteLng,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get radiusM => $composableBuilder(
    column: $table.radiusM,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get minPhotos => $composableBuilder(
    column: $table.minPhotos,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get maxJumpPct => $composableBuilder(
    column: $table.maxJumpPct,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get allowDecrease => $composableBuilder(
    column: $table.allowDecrease,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get lateAfterHours => $composableBuilder(
    column: $table.lateAfterHours,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get gpsMode => $composableBuilder(
    column: $table.gpsMode,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get approvalMode => $composableBuilder(
    column: $table.approvalMode,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get calendarJson => $composableBuilder(
    column: $table.calendarJson,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get reminderEnabled => $composableBuilder(
    column: $table.reminderEnabled,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get reminderTime => $composableBuilder(
    column: $table.reminderTime,
    builder: (column) => ColumnFilters(column),
  );
}

class $$ProjectsTableOrderingComposer
    extends Composer<_$AppDatabase, $ProjectsTable> {
  $$ProjectsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get siteLat => $composableBuilder(
    column: $table.siteLat,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get siteLng => $composableBuilder(
    column: $table.siteLng,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get radiusM => $composableBuilder(
    column: $table.radiusM,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get minPhotos => $composableBuilder(
    column: $table.minPhotos,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get maxJumpPct => $composableBuilder(
    column: $table.maxJumpPct,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get allowDecrease => $composableBuilder(
    column: $table.allowDecrease,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get lateAfterHours => $composableBuilder(
    column: $table.lateAfterHours,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get gpsMode => $composableBuilder(
    column: $table.gpsMode,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get approvalMode => $composableBuilder(
    column: $table.approvalMode,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get calendarJson => $composableBuilder(
    column: $table.calendarJson,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get reminderEnabled => $composableBuilder(
    column: $table.reminderEnabled,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get reminderTime => $composableBuilder(
    column: $table.reminderTime,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$ProjectsTableAnnotationComposer
    extends Composer<_$AppDatabase, $ProjectsTable> {
  $$ProjectsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<double> get siteLat =>
      $composableBuilder(column: $table.siteLat, builder: (column) => column);

  GeneratedColumn<double> get siteLng =>
      $composableBuilder(column: $table.siteLng, builder: (column) => column);

  GeneratedColumn<double> get radiusM =>
      $composableBuilder(column: $table.radiusM, builder: (column) => column);

  GeneratedColumn<int> get minPhotos =>
      $composableBuilder(column: $table.minPhotos, builder: (column) => column);

  GeneratedColumn<double> get maxJumpPct => $composableBuilder(
    column: $table.maxJumpPct,
    builder: (column) => column,
  );

  GeneratedColumn<bool> get allowDecrease => $composableBuilder(
    column: $table.allowDecrease,
    builder: (column) => column,
  );

  GeneratedColumn<int> get lateAfterHours => $composableBuilder(
    column: $table.lateAfterHours,
    builder: (column) => column,
  );

  GeneratedColumn<String> get gpsMode =>
      $composableBuilder(column: $table.gpsMode, builder: (column) => column);

  GeneratedColumn<String> get approvalMode => $composableBuilder(
    column: $table.approvalMode,
    builder: (column) => column,
  );

  GeneratedColumn<String> get calendarJson => $composableBuilder(
    column: $table.calendarJson,
    builder: (column) => column,
  );

  GeneratedColumn<bool> get reminderEnabled => $composableBuilder(
    column: $table.reminderEnabled,
    builder: (column) => column,
  );

  GeneratedColumn<String> get reminderTime => $composableBuilder(
    column: $table.reminderTime,
    builder: (column) => column,
  );
}

class $$ProjectsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $ProjectsTable,
          ProjectRow,
          $$ProjectsTableFilterComposer,
          $$ProjectsTableOrderingComposer,
          $$ProjectsTableAnnotationComposer,
          $$ProjectsTableCreateCompanionBuilder,
          $$ProjectsTableUpdateCompanionBuilder,
          (
            ProjectRow,
            BaseReferences<_$AppDatabase, $ProjectsTable, ProjectRow>,
          ),
          ProjectRow,
          PrefetchHooks Function()
        > {
  $$ProjectsTableTableManager(_$AppDatabase db, $ProjectsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$ProjectsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$ProjectsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$ProjectsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> name = const Value.absent(),
                Value<double?> siteLat = const Value.absent(),
                Value<double?> siteLng = const Value.absent(),
                Value<double?> radiusM = const Value.absent(),
                Value<int> minPhotos = const Value.absent(),
                Value<double?> maxJumpPct = const Value.absent(),
                Value<bool> allowDecrease = const Value.absent(),
                Value<int?> lateAfterHours = const Value.absent(),
                Value<String?> gpsMode = const Value.absent(),
                Value<String?> approvalMode = const Value.absent(),
                Value<String> calendarJson = const Value.absent(),
                Value<bool> reminderEnabled = const Value.absent(),
                Value<String> reminderTime = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => ProjectsCompanion(
                id: id,
                name: name,
                siteLat: siteLat,
                siteLng: siteLng,
                radiusM: radiusM,
                minPhotos: minPhotos,
                maxJumpPct: maxJumpPct,
                allowDecrease: allowDecrease,
                lateAfterHours: lateAfterHours,
                gpsMode: gpsMode,
                approvalMode: approvalMode,
                calendarJson: calendarJson,
                reminderEnabled: reminderEnabled,
                reminderTime: reminderTime,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String name,
                Value<double?> siteLat = const Value.absent(),
                Value<double?> siteLng = const Value.absent(),
                Value<double?> radiusM = const Value.absent(),
                Value<int> minPhotos = const Value.absent(),
                Value<double?> maxJumpPct = const Value.absent(),
                Value<bool> allowDecrease = const Value.absent(),
                Value<int?> lateAfterHours = const Value.absent(),
                Value<String?> gpsMode = const Value.absent(),
                Value<String?> approvalMode = const Value.absent(),
                Value<String> calendarJson = const Value.absent(),
                Value<bool> reminderEnabled = const Value.absent(),
                Value<String> reminderTime = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => ProjectsCompanion.insert(
                id: id,
                name: name,
                siteLat: siteLat,
                siteLng: siteLng,
                radiusM: radiusM,
                minPhotos: minPhotos,
                maxJumpPct: maxJumpPct,
                allowDecrease: allowDecrease,
                lateAfterHours: lateAfterHours,
                gpsMode: gpsMode,
                approvalMode: approvalMode,
                calendarJson: calendarJson,
                reminderEnabled: reminderEnabled,
                reminderTime: reminderTime,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$ProjectsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $ProjectsTable,
      ProjectRow,
      $$ProjectsTableFilterComposer,
      $$ProjectsTableOrderingComposer,
      $$ProjectsTableAnnotationComposer,
      $$ProjectsTableCreateCompanionBuilder,
      $$ProjectsTableUpdateCompanionBuilder,
      (ProjectRow, BaseReferences<_$AppDatabase, $ProjectsTable, ProjectRow>),
      ProjectRow,
      PrefetchHooks Function()
    >;
typedef $$ActivitiesTableCreateCompanionBuilder =
    ActivitiesCompanion Function({
      required String id,
      required String projectId,
      Value<String?> parentId,
      required String code,
      required String title,
      required String method,
      Value<String?> unit,
      Value<double?> totalQuantity,
      Value<String?> stepsJson,
      Value<String?> plannedStart,
      Value<String?> plannedFinish,
      Value<double> approvedPercent,
      Value<double?> approvedQuantity,
      Value<double?> lastPendingPercent,
      Value<String> planJson,
      Value<String?> approverUserId,
      Value<String?> approverName,
      Value<int> rowid,
    });
typedef $$ActivitiesTableUpdateCompanionBuilder =
    ActivitiesCompanion Function({
      Value<String> id,
      Value<String> projectId,
      Value<String?> parentId,
      Value<String> code,
      Value<String> title,
      Value<String> method,
      Value<String?> unit,
      Value<double?> totalQuantity,
      Value<String?> stepsJson,
      Value<String?> plannedStart,
      Value<String?> plannedFinish,
      Value<double> approvedPercent,
      Value<double?> approvedQuantity,
      Value<double?> lastPendingPercent,
      Value<String> planJson,
      Value<String?> approverUserId,
      Value<String?> approverName,
      Value<int> rowid,
    });

class $$ActivitiesTableFilterComposer
    extends Composer<_$AppDatabase, $ActivitiesTable> {
  $$ActivitiesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get projectId => $composableBuilder(
    column: $table.projectId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get parentId => $composableBuilder(
    column: $table.parentId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get code => $composableBuilder(
    column: $table.code,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get title => $composableBuilder(
    column: $table.title,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get method => $composableBuilder(
    column: $table.method,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get unit => $composableBuilder(
    column: $table.unit,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get totalQuantity => $composableBuilder(
    column: $table.totalQuantity,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get stepsJson => $composableBuilder(
    column: $table.stepsJson,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get plannedStart => $composableBuilder(
    column: $table.plannedStart,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get plannedFinish => $composableBuilder(
    column: $table.plannedFinish,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get approvedPercent => $composableBuilder(
    column: $table.approvedPercent,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get approvedQuantity => $composableBuilder(
    column: $table.approvedQuantity,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get lastPendingPercent => $composableBuilder(
    column: $table.lastPendingPercent,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get planJson => $composableBuilder(
    column: $table.planJson,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get approverUserId => $composableBuilder(
    column: $table.approverUserId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get approverName => $composableBuilder(
    column: $table.approverName,
    builder: (column) => ColumnFilters(column),
  );
}

class $$ActivitiesTableOrderingComposer
    extends Composer<_$AppDatabase, $ActivitiesTable> {
  $$ActivitiesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get projectId => $composableBuilder(
    column: $table.projectId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get parentId => $composableBuilder(
    column: $table.parentId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get code => $composableBuilder(
    column: $table.code,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get title => $composableBuilder(
    column: $table.title,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get method => $composableBuilder(
    column: $table.method,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get unit => $composableBuilder(
    column: $table.unit,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get totalQuantity => $composableBuilder(
    column: $table.totalQuantity,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get stepsJson => $composableBuilder(
    column: $table.stepsJson,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get plannedStart => $composableBuilder(
    column: $table.plannedStart,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get plannedFinish => $composableBuilder(
    column: $table.plannedFinish,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get approvedPercent => $composableBuilder(
    column: $table.approvedPercent,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get approvedQuantity => $composableBuilder(
    column: $table.approvedQuantity,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get lastPendingPercent => $composableBuilder(
    column: $table.lastPendingPercent,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get planJson => $composableBuilder(
    column: $table.planJson,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get approverUserId => $composableBuilder(
    column: $table.approverUserId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get approverName => $composableBuilder(
    column: $table.approverName,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$ActivitiesTableAnnotationComposer
    extends Composer<_$AppDatabase, $ActivitiesTable> {
  $$ActivitiesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get projectId =>
      $composableBuilder(column: $table.projectId, builder: (column) => column);

  GeneratedColumn<String> get parentId =>
      $composableBuilder(column: $table.parentId, builder: (column) => column);

  GeneratedColumn<String> get code =>
      $composableBuilder(column: $table.code, builder: (column) => column);

  GeneratedColumn<String> get title =>
      $composableBuilder(column: $table.title, builder: (column) => column);

  GeneratedColumn<String> get method =>
      $composableBuilder(column: $table.method, builder: (column) => column);

  GeneratedColumn<String> get unit =>
      $composableBuilder(column: $table.unit, builder: (column) => column);

  GeneratedColumn<double> get totalQuantity => $composableBuilder(
    column: $table.totalQuantity,
    builder: (column) => column,
  );

  GeneratedColumn<String> get stepsJson =>
      $composableBuilder(column: $table.stepsJson, builder: (column) => column);

  GeneratedColumn<String> get plannedStart => $composableBuilder(
    column: $table.plannedStart,
    builder: (column) => column,
  );

  GeneratedColumn<String> get plannedFinish => $composableBuilder(
    column: $table.plannedFinish,
    builder: (column) => column,
  );

  GeneratedColumn<double> get approvedPercent => $composableBuilder(
    column: $table.approvedPercent,
    builder: (column) => column,
  );

  GeneratedColumn<double> get approvedQuantity => $composableBuilder(
    column: $table.approvedQuantity,
    builder: (column) => column,
  );

  GeneratedColumn<double> get lastPendingPercent => $composableBuilder(
    column: $table.lastPendingPercent,
    builder: (column) => column,
  );

  GeneratedColumn<String> get planJson =>
      $composableBuilder(column: $table.planJson, builder: (column) => column);

  GeneratedColumn<String> get approverUserId => $composableBuilder(
    column: $table.approverUserId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get approverName => $composableBuilder(
    column: $table.approverName,
    builder: (column) => column,
  );
}

class $$ActivitiesTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $ActivitiesTable,
          ActivityRow,
          $$ActivitiesTableFilterComposer,
          $$ActivitiesTableOrderingComposer,
          $$ActivitiesTableAnnotationComposer,
          $$ActivitiesTableCreateCompanionBuilder,
          $$ActivitiesTableUpdateCompanionBuilder,
          (
            ActivityRow,
            BaseReferences<_$AppDatabase, $ActivitiesTable, ActivityRow>,
          ),
          ActivityRow,
          PrefetchHooks Function()
        > {
  $$ActivitiesTableTableManager(_$AppDatabase db, $ActivitiesTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$ActivitiesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$ActivitiesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$ActivitiesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> projectId = const Value.absent(),
                Value<String?> parentId = const Value.absent(),
                Value<String> code = const Value.absent(),
                Value<String> title = const Value.absent(),
                Value<String> method = const Value.absent(),
                Value<String?> unit = const Value.absent(),
                Value<double?> totalQuantity = const Value.absent(),
                Value<String?> stepsJson = const Value.absent(),
                Value<String?> plannedStart = const Value.absent(),
                Value<String?> plannedFinish = const Value.absent(),
                Value<double> approvedPercent = const Value.absent(),
                Value<double?> approvedQuantity = const Value.absent(),
                Value<double?> lastPendingPercent = const Value.absent(),
                Value<String> planJson = const Value.absent(),
                Value<String?> approverUserId = const Value.absent(),
                Value<String?> approverName = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => ActivitiesCompanion(
                id: id,
                projectId: projectId,
                parentId: parentId,
                code: code,
                title: title,
                method: method,
                unit: unit,
                totalQuantity: totalQuantity,
                stepsJson: stepsJson,
                plannedStart: plannedStart,
                plannedFinish: plannedFinish,
                approvedPercent: approvedPercent,
                approvedQuantity: approvedQuantity,
                lastPendingPercent: lastPendingPercent,
                planJson: planJson,
                approverUserId: approverUserId,
                approverName: approverName,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String projectId,
                Value<String?> parentId = const Value.absent(),
                required String code,
                required String title,
                required String method,
                Value<String?> unit = const Value.absent(),
                Value<double?> totalQuantity = const Value.absent(),
                Value<String?> stepsJson = const Value.absent(),
                Value<String?> plannedStart = const Value.absent(),
                Value<String?> plannedFinish = const Value.absent(),
                Value<double> approvedPercent = const Value.absent(),
                Value<double?> approvedQuantity = const Value.absent(),
                Value<double?> lastPendingPercent = const Value.absent(),
                Value<String> planJson = const Value.absent(),
                Value<String?> approverUserId = const Value.absent(),
                Value<String?> approverName = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => ActivitiesCompanion.insert(
                id: id,
                projectId: projectId,
                parentId: parentId,
                code: code,
                title: title,
                method: method,
                unit: unit,
                totalQuantity: totalQuantity,
                stepsJson: stepsJson,
                plannedStart: plannedStart,
                plannedFinish: plannedFinish,
                approvedPercent: approvedPercent,
                approvedQuantity: approvedQuantity,
                lastPendingPercent: lastPendingPercent,
                planJson: planJson,
                approverUserId: approverUserId,
                approverName: approverName,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$ActivitiesTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $ActivitiesTable,
      ActivityRow,
      $$ActivitiesTableFilterComposer,
      $$ActivitiesTableOrderingComposer,
      $$ActivitiesTableAnnotationComposer,
      $$ActivitiesTableCreateCompanionBuilder,
      $$ActivitiesTableUpdateCompanionBuilder,
      (
        ActivityRow,
        BaseReferences<_$AppDatabase, $ActivitiesTable, ActivityRow>,
      ),
      ActivityRow,
      PrefetchHooks Function()
    >;
typedef $$ServerItemsTableCreateCompanionBuilder =
    ServerItemsCompanion Function({
      required String id,
      required String reportId,
      Value<String?> reportNo,
      required String projectId,
      required String wbsItemId,
      Value<String?> workDate,
      required String status,
      Value<String> flagsJson,
      Value<double?> computedPercent,
      Value<int> revisionCount,
      Value<String?> revisionJson,
      Value<String> photosJson,
      Value<int> rowid,
    });
typedef $$ServerItemsTableUpdateCompanionBuilder =
    ServerItemsCompanion Function({
      Value<String> id,
      Value<String> reportId,
      Value<String?> reportNo,
      Value<String> projectId,
      Value<String> wbsItemId,
      Value<String?> workDate,
      Value<String> status,
      Value<String> flagsJson,
      Value<double?> computedPercent,
      Value<int> revisionCount,
      Value<String?> revisionJson,
      Value<String> photosJson,
      Value<int> rowid,
    });

class $$ServerItemsTableFilterComposer
    extends Composer<_$AppDatabase, $ServerItemsTable> {
  $$ServerItemsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get reportId => $composableBuilder(
    column: $table.reportId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get reportNo => $composableBuilder(
    column: $table.reportNo,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get projectId => $composableBuilder(
    column: $table.projectId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get wbsItemId => $composableBuilder(
    column: $table.wbsItemId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get workDate => $composableBuilder(
    column: $table.workDate,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get flagsJson => $composableBuilder(
    column: $table.flagsJson,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get computedPercent => $composableBuilder(
    column: $table.computedPercent,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get revisionCount => $composableBuilder(
    column: $table.revisionCount,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get revisionJson => $composableBuilder(
    column: $table.revisionJson,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get photosJson => $composableBuilder(
    column: $table.photosJson,
    builder: (column) => ColumnFilters(column),
  );
}

class $$ServerItemsTableOrderingComposer
    extends Composer<_$AppDatabase, $ServerItemsTable> {
  $$ServerItemsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get reportId => $composableBuilder(
    column: $table.reportId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get reportNo => $composableBuilder(
    column: $table.reportNo,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get projectId => $composableBuilder(
    column: $table.projectId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get wbsItemId => $composableBuilder(
    column: $table.wbsItemId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get workDate => $composableBuilder(
    column: $table.workDate,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get flagsJson => $composableBuilder(
    column: $table.flagsJson,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get computedPercent => $composableBuilder(
    column: $table.computedPercent,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get revisionCount => $composableBuilder(
    column: $table.revisionCount,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get revisionJson => $composableBuilder(
    column: $table.revisionJson,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get photosJson => $composableBuilder(
    column: $table.photosJson,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$ServerItemsTableAnnotationComposer
    extends Composer<_$AppDatabase, $ServerItemsTable> {
  $$ServerItemsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get reportId =>
      $composableBuilder(column: $table.reportId, builder: (column) => column);

  GeneratedColumn<String> get reportNo =>
      $composableBuilder(column: $table.reportNo, builder: (column) => column);

  GeneratedColumn<String> get projectId =>
      $composableBuilder(column: $table.projectId, builder: (column) => column);

  GeneratedColumn<String> get wbsItemId =>
      $composableBuilder(column: $table.wbsItemId, builder: (column) => column);

  GeneratedColumn<String> get workDate =>
      $composableBuilder(column: $table.workDate, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<String> get flagsJson =>
      $composableBuilder(column: $table.flagsJson, builder: (column) => column);

  GeneratedColumn<double> get computedPercent => $composableBuilder(
    column: $table.computedPercent,
    builder: (column) => column,
  );

  GeneratedColumn<int> get revisionCount => $composableBuilder(
    column: $table.revisionCount,
    builder: (column) => column,
  );

  GeneratedColumn<String> get revisionJson => $composableBuilder(
    column: $table.revisionJson,
    builder: (column) => column,
  );

  GeneratedColumn<String> get photosJson => $composableBuilder(
    column: $table.photosJson,
    builder: (column) => column,
  );
}

class $$ServerItemsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $ServerItemsTable,
          ServerItemRow,
          $$ServerItemsTableFilterComposer,
          $$ServerItemsTableOrderingComposer,
          $$ServerItemsTableAnnotationComposer,
          $$ServerItemsTableCreateCompanionBuilder,
          $$ServerItemsTableUpdateCompanionBuilder,
          (
            ServerItemRow,
            BaseReferences<_$AppDatabase, $ServerItemsTable, ServerItemRow>,
          ),
          ServerItemRow,
          PrefetchHooks Function()
        > {
  $$ServerItemsTableTableManager(_$AppDatabase db, $ServerItemsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$ServerItemsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$ServerItemsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$ServerItemsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> reportId = const Value.absent(),
                Value<String?> reportNo = const Value.absent(),
                Value<String> projectId = const Value.absent(),
                Value<String> wbsItemId = const Value.absent(),
                Value<String?> workDate = const Value.absent(),
                Value<String> status = const Value.absent(),
                Value<String> flagsJson = const Value.absent(),
                Value<double?> computedPercent = const Value.absent(),
                Value<int> revisionCount = const Value.absent(),
                Value<String?> revisionJson = const Value.absent(),
                Value<String> photosJson = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => ServerItemsCompanion(
                id: id,
                reportId: reportId,
                reportNo: reportNo,
                projectId: projectId,
                wbsItemId: wbsItemId,
                workDate: workDate,
                status: status,
                flagsJson: flagsJson,
                computedPercent: computedPercent,
                revisionCount: revisionCount,
                revisionJson: revisionJson,
                photosJson: photosJson,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String reportId,
                Value<String?> reportNo = const Value.absent(),
                required String projectId,
                required String wbsItemId,
                Value<String?> workDate = const Value.absent(),
                required String status,
                Value<String> flagsJson = const Value.absent(),
                Value<double?> computedPercent = const Value.absent(),
                Value<int> revisionCount = const Value.absent(),
                Value<String?> revisionJson = const Value.absent(),
                Value<String> photosJson = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => ServerItemsCompanion.insert(
                id: id,
                reportId: reportId,
                reportNo: reportNo,
                projectId: projectId,
                wbsItemId: wbsItemId,
                workDate: workDate,
                status: status,
                flagsJson: flagsJson,
                computedPercent: computedPercent,
                revisionCount: revisionCount,
                revisionJson: revisionJson,
                photosJson: photosJson,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$ServerItemsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $ServerItemsTable,
      ServerItemRow,
      $$ServerItemsTableFilterComposer,
      $$ServerItemsTableOrderingComposer,
      $$ServerItemsTableAnnotationComposer,
      $$ServerItemsTableCreateCompanionBuilder,
      $$ServerItemsTableUpdateCompanionBuilder,
      (
        ServerItemRow,
        BaseReferences<_$AppDatabase, $ServerItemsTable, ServerItemRow>,
      ),
      ServerItemRow,
      PrefetchHooks Function()
    >;
typedef $$SiteIssuesTableCreateCompanionBuilder =
    SiteIssuesCompanion Function({
      required String id,
      required String projectId,
      required String title,
      required String type,
      required String effect,
      Value<String?> wbsItemId,
      required String reportedAt,
      Value<String?> riskCode,
      required String status,
      Value<String?> category,
      Value<int> rowid,
    });
typedef $$SiteIssuesTableUpdateCompanionBuilder =
    SiteIssuesCompanion Function({
      Value<String> id,
      Value<String> projectId,
      Value<String> title,
      Value<String> type,
      Value<String> effect,
      Value<String?> wbsItemId,
      Value<String> reportedAt,
      Value<String?> riskCode,
      Value<String> status,
      Value<String?> category,
      Value<int> rowid,
    });

class $$SiteIssuesTableFilterComposer
    extends Composer<_$AppDatabase, $SiteIssuesTable> {
  $$SiteIssuesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get projectId => $composableBuilder(
    column: $table.projectId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get title => $composableBuilder(
    column: $table.title,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get type => $composableBuilder(
    column: $table.type,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get effect => $composableBuilder(
    column: $table.effect,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get wbsItemId => $composableBuilder(
    column: $table.wbsItemId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get reportedAt => $composableBuilder(
    column: $table.reportedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get riskCode => $composableBuilder(
    column: $table.riskCode,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get category => $composableBuilder(
    column: $table.category,
    builder: (column) => ColumnFilters(column),
  );
}

class $$SiteIssuesTableOrderingComposer
    extends Composer<_$AppDatabase, $SiteIssuesTable> {
  $$SiteIssuesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get projectId => $composableBuilder(
    column: $table.projectId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get title => $composableBuilder(
    column: $table.title,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get type => $composableBuilder(
    column: $table.type,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get effect => $composableBuilder(
    column: $table.effect,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get wbsItemId => $composableBuilder(
    column: $table.wbsItemId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get reportedAt => $composableBuilder(
    column: $table.reportedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get riskCode => $composableBuilder(
    column: $table.riskCode,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get category => $composableBuilder(
    column: $table.category,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$SiteIssuesTableAnnotationComposer
    extends Composer<_$AppDatabase, $SiteIssuesTable> {
  $$SiteIssuesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get projectId =>
      $composableBuilder(column: $table.projectId, builder: (column) => column);

  GeneratedColumn<String> get title =>
      $composableBuilder(column: $table.title, builder: (column) => column);

  GeneratedColumn<String> get type =>
      $composableBuilder(column: $table.type, builder: (column) => column);

  GeneratedColumn<String> get effect =>
      $composableBuilder(column: $table.effect, builder: (column) => column);

  GeneratedColumn<String> get wbsItemId =>
      $composableBuilder(column: $table.wbsItemId, builder: (column) => column);

  GeneratedColumn<String> get reportedAt => $composableBuilder(
    column: $table.reportedAt,
    builder: (column) => column,
  );

  GeneratedColumn<String> get riskCode =>
      $composableBuilder(column: $table.riskCode, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<String> get category =>
      $composableBuilder(column: $table.category, builder: (column) => column);
}

class $$SiteIssuesTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $SiteIssuesTable,
          SiteIssueRow,
          $$SiteIssuesTableFilterComposer,
          $$SiteIssuesTableOrderingComposer,
          $$SiteIssuesTableAnnotationComposer,
          $$SiteIssuesTableCreateCompanionBuilder,
          $$SiteIssuesTableUpdateCompanionBuilder,
          (
            SiteIssueRow,
            BaseReferences<_$AppDatabase, $SiteIssuesTable, SiteIssueRow>,
          ),
          SiteIssueRow,
          PrefetchHooks Function()
        > {
  $$SiteIssuesTableTableManager(_$AppDatabase db, $SiteIssuesTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$SiteIssuesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$SiteIssuesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$SiteIssuesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> projectId = const Value.absent(),
                Value<String> title = const Value.absent(),
                Value<String> type = const Value.absent(),
                Value<String> effect = const Value.absent(),
                Value<String?> wbsItemId = const Value.absent(),
                Value<String> reportedAt = const Value.absent(),
                Value<String?> riskCode = const Value.absent(),
                Value<String> status = const Value.absent(),
                Value<String?> category = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => SiteIssuesCompanion(
                id: id,
                projectId: projectId,
                title: title,
                type: type,
                effect: effect,
                wbsItemId: wbsItemId,
                reportedAt: reportedAt,
                riskCode: riskCode,
                status: status,
                category: category,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String projectId,
                required String title,
                required String type,
                required String effect,
                Value<String?> wbsItemId = const Value.absent(),
                required String reportedAt,
                Value<String?> riskCode = const Value.absent(),
                required String status,
                Value<String?> category = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => SiteIssuesCompanion.insert(
                id: id,
                projectId: projectId,
                title: title,
                type: type,
                effect: effect,
                wbsItemId: wbsItemId,
                reportedAt: reportedAt,
                riskCode: riskCode,
                status: status,
                category: category,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$SiteIssuesTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $SiteIssuesTable,
      SiteIssueRow,
      $$SiteIssuesTableFilterComposer,
      $$SiteIssuesTableOrderingComposer,
      $$SiteIssuesTableAnnotationComposer,
      $$SiteIssuesTableCreateCompanionBuilder,
      $$SiteIssuesTableUpdateCompanionBuilder,
      (
        SiteIssueRow,
        BaseReferences<_$AppDatabase, $SiteIssuesTable, SiteIssueRow>,
      ),
      SiteIssueRow,
      PrefetchHooks Function()
    >;
typedef $$NotificationsTableCreateCompanionBuilder =
    NotificationsCompanion Function({
      required String id,
      required String code,
      Value<String?> category,
      Value<String?> severity,
      required String title,
      Value<String?> body,
      Value<String?> projectId,
      Value<String?> projectName,
      Value<String?> link,
      required String createdAt,
      Value<String?> readAt,
      Value<int> mergedCount,
      Value<int> rowid,
    });
typedef $$NotificationsTableUpdateCompanionBuilder =
    NotificationsCompanion Function({
      Value<String> id,
      Value<String> code,
      Value<String?> category,
      Value<String?> severity,
      Value<String> title,
      Value<String?> body,
      Value<String?> projectId,
      Value<String?> projectName,
      Value<String?> link,
      Value<String> createdAt,
      Value<String?> readAt,
      Value<int> mergedCount,
      Value<int> rowid,
    });

class $$NotificationsTableFilterComposer
    extends Composer<_$AppDatabase, $NotificationsTable> {
  $$NotificationsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get code => $composableBuilder(
    column: $table.code,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get category => $composableBuilder(
    column: $table.category,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get severity => $composableBuilder(
    column: $table.severity,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get title => $composableBuilder(
    column: $table.title,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get body => $composableBuilder(
    column: $table.body,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get projectId => $composableBuilder(
    column: $table.projectId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get projectName => $composableBuilder(
    column: $table.projectName,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get link => $composableBuilder(
    column: $table.link,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get readAt => $composableBuilder(
    column: $table.readAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get mergedCount => $composableBuilder(
    column: $table.mergedCount,
    builder: (column) => ColumnFilters(column),
  );
}

class $$NotificationsTableOrderingComposer
    extends Composer<_$AppDatabase, $NotificationsTable> {
  $$NotificationsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get code => $composableBuilder(
    column: $table.code,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get category => $composableBuilder(
    column: $table.category,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get severity => $composableBuilder(
    column: $table.severity,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get title => $composableBuilder(
    column: $table.title,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get body => $composableBuilder(
    column: $table.body,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get projectId => $composableBuilder(
    column: $table.projectId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get projectName => $composableBuilder(
    column: $table.projectName,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get link => $composableBuilder(
    column: $table.link,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get readAt => $composableBuilder(
    column: $table.readAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get mergedCount => $composableBuilder(
    column: $table.mergedCount,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$NotificationsTableAnnotationComposer
    extends Composer<_$AppDatabase, $NotificationsTable> {
  $$NotificationsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get code =>
      $composableBuilder(column: $table.code, builder: (column) => column);

  GeneratedColumn<String> get category =>
      $composableBuilder(column: $table.category, builder: (column) => column);

  GeneratedColumn<String> get severity =>
      $composableBuilder(column: $table.severity, builder: (column) => column);

  GeneratedColumn<String> get title =>
      $composableBuilder(column: $table.title, builder: (column) => column);

  GeneratedColumn<String> get body =>
      $composableBuilder(column: $table.body, builder: (column) => column);

  GeneratedColumn<String> get projectId =>
      $composableBuilder(column: $table.projectId, builder: (column) => column);

  GeneratedColumn<String> get projectName => $composableBuilder(
    column: $table.projectName,
    builder: (column) => column,
  );

  GeneratedColumn<String> get link =>
      $composableBuilder(column: $table.link, builder: (column) => column);

  GeneratedColumn<String> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<String> get readAt =>
      $composableBuilder(column: $table.readAt, builder: (column) => column);

  GeneratedColumn<int> get mergedCount => $composableBuilder(
    column: $table.mergedCount,
    builder: (column) => column,
  );
}

class $$NotificationsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $NotificationsTable,
          NotificationRow,
          $$NotificationsTableFilterComposer,
          $$NotificationsTableOrderingComposer,
          $$NotificationsTableAnnotationComposer,
          $$NotificationsTableCreateCompanionBuilder,
          $$NotificationsTableUpdateCompanionBuilder,
          (
            NotificationRow,
            BaseReferences<_$AppDatabase, $NotificationsTable, NotificationRow>,
          ),
          NotificationRow,
          PrefetchHooks Function()
        > {
  $$NotificationsTableTableManager(_$AppDatabase db, $NotificationsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$NotificationsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$NotificationsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$NotificationsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> code = const Value.absent(),
                Value<String?> category = const Value.absent(),
                Value<String?> severity = const Value.absent(),
                Value<String> title = const Value.absent(),
                Value<String?> body = const Value.absent(),
                Value<String?> projectId = const Value.absent(),
                Value<String?> projectName = const Value.absent(),
                Value<String?> link = const Value.absent(),
                Value<String> createdAt = const Value.absent(),
                Value<String?> readAt = const Value.absent(),
                Value<int> mergedCount = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => NotificationsCompanion(
                id: id,
                code: code,
                category: category,
                severity: severity,
                title: title,
                body: body,
                projectId: projectId,
                projectName: projectName,
                link: link,
                createdAt: createdAt,
                readAt: readAt,
                mergedCount: mergedCount,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String code,
                Value<String?> category = const Value.absent(),
                Value<String?> severity = const Value.absent(),
                required String title,
                Value<String?> body = const Value.absent(),
                Value<String?> projectId = const Value.absent(),
                Value<String?> projectName = const Value.absent(),
                Value<String?> link = const Value.absent(),
                required String createdAt,
                Value<String?> readAt = const Value.absent(),
                Value<int> mergedCount = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => NotificationsCompanion.insert(
                id: id,
                code: code,
                category: category,
                severity: severity,
                title: title,
                body: body,
                projectId: projectId,
                projectName: projectName,
                link: link,
                createdAt: createdAt,
                readAt: readAt,
                mergedCount: mergedCount,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$NotificationsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $NotificationsTable,
      NotificationRow,
      $$NotificationsTableFilterComposer,
      $$NotificationsTableOrderingComposer,
      $$NotificationsTableAnnotationComposer,
      $$NotificationsTableCreateCompanionBuilder,
      $$NotificationsTableUpdateCompanionBuilder,
      (
        NotificationRow,
        BaseReferences<_$AppDatabase, $NotificationsTable, NotificationRow>,
      ),
      NotificationRow,
      PrefetchHooks Function()
    >;
typedef $$SyncMetaTableCreateCompanionBuilder =
    SyncMetaCompanion Function({
      required String key,
      required String value,
      Value<int> rowid,
    });
typedef $$SyncMetaTableUpdateCompanionBuilder =
    SyncMetaCompanion Function({
      Value<String> key,
      Value<String> value,
      Value<int> rowid,
    });

class $$SyncMetaTableFilterComposer
    extends Composer<_$AppDatabase, $SyncMetaTable> {
  $$SyncMetaTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get key => $composableBuilder(
    column: $table.key,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get value => $composableBuilder(
    column: $table.value,
    builder: (column) => ColumnFilters(column),
  );
}

class $$SyncMetaTableOrderingComposer
    extends Composer<_$AppDatabase, $SyncMetaTable> {
  $$SyncMetaTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get key => $composableBuilder(
    column: $table.key,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get value => $composableBuilder(
    column: $table.value,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$SyncMetaTableAnnotationComposer
    extends Composer<_$AppDatabase, $SyncMetaTable> {
  $$SyncMetaTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get key =>
      $composableBuilder(column: $table.key, builder: (column) => column);

  GeneratedColumn<String> get value =>
      $composableBuilder(column: $table.value, builder: (column) => column);
}

class $$SyncMetaTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $SyncMetaTable,
          MetaRow,
          $$SyncMetaTableFilterComposer,
          $$SyncMetaTableOrderingComposer,
          $$SyncMetaTableAnnotationComposer,
          $$SyncMetaTableCreateCompanionBuilder,
          $$SyncMetaTableUpdateCompanionBuilder,
          (MetaRow, BaseReferences<_$AppDatabase, $SyncMetaTable, MetaRow>),
          MetaRow,
          PrefetchHooks Function()
        > {
  $$SyncMetaTableTableManager(_$AppDatabase db, $SyncMetaTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$SyncMetaTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$SyncMetaTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$SyncMetaTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> key = const Value.absent(),
                Value<String> value = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => SyncMetaCompanion(key: key, value: value, rowid: rowid),
          createCompanionCallback:
              ({
                required String key,
                required String value,
                Value<int> rowid = const Value.absent(),
              }) => SyncMetaCompanion.insert(
                key: key,
                value: value,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$SyncMetaTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $SyncMetaTable,
      MetaRow,
      $$SyncMetaTableFilterComposer,
      $$SyncMetaTableOrderingComposer,
      $$SyncMetaTableAnnotationComposer,
      $$SyncMetaTableCreateCompanionBuilder,
      $$SyncMetaTableUpdateCompanionBuilder,
      (MetaRow, BaseReferences<_$AppDatabase, $SyncMetaTable, MetaRow>),
      MetaRow,
      PrefetchHooks Function()
    >;
typedef $$LocalReportsTableCreateCompanionBuilder =
    LocalReportsCompanion Function({
      required String id,
      required String projectId,
      required String workDate,
      Value<String> state,
      Value<DateTime?> deviceRecordedAt,
      Value<double?> gpsLat,
      Value<double?> gpsLng,
      Value<double?> gpsAccuracyM,
      Value<bool> mockLocation,
      Value<String?> weather,
      Value<int?> temperatureC,
      Value<String?> note,
      Value<DateTime?> attestedAt,
      Value<String?> reportNo,
      Value<String?> rejectCode,
      Value<String?> rejectMessage,
      required DateTime createdAt,
      Value<int> rowid,
    });
typedef $$LocalReportsTableUpdateCompanionBuilder =
    LocalReportsCompanion Function({
      Value<String> id,
      Value<String> projectId,
      Value<String> workDate,
      Value<String> state,
      Value<DateTime?> deviceRecordedAt,
      Value<double?> gpsLat,
      Value<double?> gpsLng,
      Value<double?> gpsAccuracyM,
      Value<bool> mockLocation,
      Value<String?> weather,
      Value<int?> temperatureC,
      Value<String?> note,
      Value<DateTime?> attestedAt,
      Value<String?> reportNo,
      Value<String?> rejectCode,
      Value<String?> rejectMessage,
      Value<DateTime> createdAt,
      Value<int> rowid,
    });

final class $$LocalReportsTableReferences
    extends BaseReferences<_$AppDatabase, $LocalReportsTable, LocalReportRow> {
  $$LocalReportsTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static MultiTypedResultKey<$LocalReportItemsTable, List<LocalReportItemRow>>
  _localReportItemsRefsTable(_$AppDatabase db) => MultiTypedResultKey.fromTable(
    db.localReportItems,
    aliasName: $_aliasNameGenerator(
      db.localReports.id,
      db.localReportItems.reportId,
    ),
  );

  $$LocalReportItemsTableProcessedTableManager get localReportItemsRefs {
    final manager = $$LocalReportItemsTableTableManager(
      $_db,
      $_db.localReportItems,
    ).filter((f) => f.reportId.id.sqlEquals($_itemColumn<String>('id')!));

    final cache = $_typedResult.readTableOrNull(
      _localReportItemsRefsTable($_db),
    );
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }
}

class $$LocalReportsTableFilterComposer
    extends Composer<_$AppDatabase, $LocalReportsTable> {
  $$LocalReportsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get projectId => $composableBuilder(
    column: $table.projectId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get workDate => $composableBuilder(
    column: $table.workDate,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get state => $composableBuilder(
    column: $table.state,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get deviceRecordedAt => $composableBuilder(
    column: $table.deviceRecordedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get gpsLat => $composableBuilder(
    column: $table.gpsLat,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get gpsLng => $composableBuilder(
    column: $table.gpsLng,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get gpsAccuracyM => $composableBuilder(
    column: $table.gpsAccuracyM,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get mockLocation => $composableBuilder(
    column: $table.mockLocation,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get weather => $composableBuilder(
    column: $table.weather,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get temperatureC => $composableBuilder(
    column: $table.temperatureC,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get note => $composableBuilder(
    column: $table.note,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get attestedAt => $composableBuilder(
    column: $table.attestedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get reportNo => $composableBuilder(
    column: $table.reportNo,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get rejectCode => $composableBuilder(
    column: $table.rejectCode,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get rejectMessage => $composableBuilder(
    column: $table.rejectMessage,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );

  Expression<bool> localReportItemsRefs(
    Expression<bool> Function($$LocalReportItemsTableFilterComposer f) f,
  ) {
    final $$LocalReportItemsTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.localReportItems,
      getReferencedColumn: (t) => t.reportId,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$LocalReportItemsTableFilterComposer(
            $db: $db,
            $table: $db.localReportItems,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }
}

class $$LocalReportsTableOrderingComposer
    extends Composer<_$AppDatabase, $LocalReportsTable> {
  $$LocalReportsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get projectId => $composableBuilder(
    column: $table.projectId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get workDate => $composableBuilder(
    column: $table.workDate,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get state => $composableBuilder(
    column: $table.state,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get deviceRecordedAt => $composableBuilder(
    column: $table.deviceRecordedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get gpsLat => $composableBuilder(
    column: $table.gpsLat,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get gpsLng => $composableBuilder(
    column: $table.gpsLng,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get gpsAccuracyM => $composableBuilder(
    column: $table.gpsAccuracyM,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get mockLocation => $composableBuilder(
    column: $table.mockLocation,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get weather => $composableBuilder(
    column: $table.weather,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get temperatureC => $composableBuilder(
    column: $table.temperatureC,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get note => $composableBuilder(
    column: $table.note,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get attestedAt => $composableBuilder(
    column: $table.attestedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get reportNo => $composableBuilder(
    column: $table.reportNo,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get rejectCode => $composableBuilder(
    column: $table.rejectCode,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get rejectMessage => $composableBuilder(
    column: $table.rejectMessage,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$LocalReportsTableAnnotationComposer
    extends Composer<_$AppDatabase, $LocalReportsTable> {
  $$LocalReportsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get projectId =>
      $composableBuilder(column: $table.projectId, builder: (column) => column);

  GeneratedColumn<String> get workDate =>
      $composableBuilder(column: $table.workDate, builder: (column) => column);

  GeneratedColumn<String> get state =>
      $composableBuilder(column: $table.state, builder: (column) => column);

  GeneratedColumn<DateTime> get deviceRecordedAt => $composableBuilder(
    column: $table.deviceRecordedAt,
    builder: (column) => column,
  );

  GeneratedColumn<double> get gpsLat =>
      $composableBuilder(column: $table.gpsLat, builder: (column) => column);

  GeneratedColumn<double> get gpsLng =>
      $composableBuilder(column: $table.gpsLng, builder: (column) => column);

  GeneratedColumn<double> get gpsAccuracyM => $composableBuilder(
    column: $table.gpsAccuracyM,
    builder: (column) => column,
  );

  GeneratedColumn<bool> get mockLocation => $composableBuilder(
    column: $table.mockLocation,
    builder: (column) => column,
  );

  GeneratedColumn<String> get weather =>
      $composableBuilder(column: $table.weather, builder: (column) => column);

  GeneratedColumn<int> get temperatureC => $composableBuilder(
    column: $table.temperatureC,
    builder: (column) => column,
  );

  GeneratedColumn<String> get note =>
      $composableBuilder(column: $table.note, builder: (column) => column);

  GeneratedColumn<DateTime> get attestedAt => $composableBuilder(
    column: $table.attestedAt,
    builder: (column) => column,
  );

  GeneratedColumn<String> get reportNo =>
      $composableBuilder(column: $table.reportNo, builder: (column) => column);

  GeneratedColumn<String> get rejectCode => $composableBuilder(
    column: $table.rejectCode,
    builder: (column) => column,
  );

  GeneratedColumn<String> get rejectMessage => $composableBuilder(
    column: $table.rejectMessage,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  Expression<T> localReportItemsRefs<T extends Object>(
    Expression<T> Function($$LocalReportItemsTableAnnotationComposer a) f,
  ) {
    final $$LocalReportItemsTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.localReportItems,
      getReferencedColumn: (t) => t.reportId,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$LocalReportItemsTableAnnotationComposer(
            $db: $db,
            $table: $db.localReportItems,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }
}

class $$LocalReportsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $LocalReportsTable,
          LocalReportRow,
          $$LocalReportsTableFilterComposer,
          $$LocalReportsTableOrderingComposer,
          $$LocalReportsTableAnnotationComposer,
          $$LocalReportsTableCreateCompanionBuilder,
          $$LocalReportsTableUpdateCompanionBuilder,
          (LocalReportRow, $$LocalReportsTableReferences),
          LocalReportRow,
          PrefetchHooks Function({bool localReportItemsRefs})
        > {
  $$LocalReportsTableTableManager(_$AppDatabase db, $LocalReportsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$LocalReportsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$LocalReportsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$LocalReportsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> projectId = const Value.absent(),
                Value<String> workDate = const Value.absent(),
                Value<String> state = const Value.absent(),
                Value<DateTime?> deviceRecordedAt = const Value.absent(),
                Value<double?> gpsLat = const Value.absent(),
                Value<double?> gpsLng = const Value.absent(),
                Value<double?> gpsAccuracyM = const Value.absent(),
                Value<bool> mockLocation = const Value.absent(),
                Value<String?> weather = const Value.absent(),
                Value<int?> temperatureC = const Value.absent(),
                Value<String?> note = const Value.absent(),
                Value<DateTime?> attestedAt = const Value.absent(),
                Value<String?> reportNo = const Value.absent(),
                Value<String?> rejectCode = const Value.absent(),
                Value<String?> rejectMessage = const Value.absent(),
                Value<DateTime> createdAt = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => LocalReportsCompanion(
                id: id,
                projectId: projectId,
                workDate: workDate,
                state: state,
                deviceRecordedAt: deviceRecordedAt,
                gpsLat: gpsLat,
                gpsLng: gpsLng,
                gpsAccuracyM: gpsAccuracyM,
                mockLocation: mockLocation,
                weather: weather,
                temperatureC: temperatureC,
                note: note,
                attestedAt: attestedAt,
                reportNo: reportNo,
                rejectCode: rejectCode,
                rejectMessage: rejectMessage,
                createdAt: createdAt,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String projectId,
                required String workDate,
                Value<String> state = const Value.absent(),
                Value<DateTime?> deviceRecordedAt = const Value.absent(),
                Value<double?> gpsLat = const Value.absent(),
                Value<double?> gpsLng = const Value.absent(),
                Value<double?> gpsAccuracyM = const Value.absent(),
                Value<bool> mockLocation = const Value.absent(),
                Value<String?> weather = const Value.absent(),
                Value<int?> temperatureC = const Value.absent(),
                Value<String?> note = const Value.absent(),
                Value<DateTime?> attestedAt = const Value.absent(),
                Value<String?> reportNo = const Value.absent(),
                Value<String?> rejectCode = const Value.absent(),
                Value<String?> rejectMessage = const Value.absent(),
                required DateTime createdAt,
                Value<int> rowid = const Value.absent(),
              }) => LocalReportsCompanion.insert(
                id: id,
                projectId: projectId,
                workDate: workDate,
                state: state,
                deviceRecordedAt: deviceRecordedAt,
                gpsLat: gpsLat,
                gpsLng: gpsLng,
                gpsAccuracyM: gpsAccuracyM,
                mockLocation: mockLocation,
                weather: weather,
                temperatureC: temperatureC,
                note: note,
                attestedAt: attestedAt,
                reportNo: reportNo,
                rejectCode: rejectCode,
                rejectMessage: rejectMessage,
                createdAt: createdAt,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$LocalReportsTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: ({localReportItemsRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [
                if (localReportItemsRefs) db.localReportItems,
              ],
              addJoins: null,
              getPrefetchedDataCallback: (items) async {
                return [
                  if (localReportItemsRefs)
                    await $_getPrefetchedData<
                      LocalReportRow,
                      $LocalReportsTable,
                      LocalReportItemRow
                    >(
                      currentTable: table,
                      referencedTable: $$LocalReportsTableReferences
                          ._localReportItemsRefsTable(db),
                      managerFromTypedResult: (p0) =>
                          $$LocalReportsTableReferences(
                            db,
                            table,
                            p0,
                          ).localReportItemsRefs,
                      referencedItemsForCurrentItem: (item, referencedItems) =>
                          referencedItems.where((e) => e.reportId == item.id),
                      typedResults: items,
                    ),
                ];
              },
            );
          },
        ),
      );
}

typedef $$LocalReportsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $LocalReportsTable,
      LocalReportRow,
      $$LocalReportsTableFilterComposer,
      $$LocalReportsTableOrderingComposer,
      $$LocalReportsTableAnnotationComposer,
      $$LocalReportsTableCreateCompanionBuilder,
      $$LocalReportsTableUpdateCompanionBuilder,
      (LocalReportRow, $$LocalReportsTableReferences),
      LocalReportRow,
      PrefetchHooks Function({bool localReportItemsRefs})
    >;
typedef $$LocalReportItemsTableCreateCompanionBuilder =
    LocalReportItemsCompanion Function({
      required String id,
      required String reportId,
      required String wbsItemId,
      Value<double?> reportedPercent,
      Value<double?> quantityToday,
      Value<String?> stepsJson,
      Value<int?> crewCount,
      Value<String?> note,
      Value<String?> serverStatus,
      Value<String?> serverFlagsJson,
      Value<double?> serverPercent,
      Value<int> rowid,
    });
typedef $$LocalReportItemsTableUpdateCompanionBuilder =
    LocalReportItemsCompanion Function({
      Value<String> id,
      Value<String> reportId,
      Value<String> wbsItemId,
      Value<double?> reportedPercent,
      Value<double?> quantityToday,
      Value<String?> stepsJson,
      Value<int?> crewCount,
      Value<String?> note,
      Value<String?> serverStatus,
      Value<String?> serverFlagsJson,
      Value<double?> serverPercent,
      Value<int> rowid,
    });

final class $$LocalReportItemsTableReferences
    extends
        BaseReferences<
          _$AppDatabase,
          $LocalReportItemsTable,
          LocalReportItemRow
        > {
  $$LocalReportItemsTableReferences(
    super.$_db,
    super.$_table,
    super.$_typedResult,
  );

  static $LocalReportsTable _reportIdTable(_$AppDatabase db) =>
      db.localReports.createAlias(
        $_aliasNameGenerator(db.localReportItems.reportId, db.localReports.id),
      );

  $$LocalReportsTableProcessedTableManager get reportId {
    final $_column = $_itemColumn<String>('report_id')!;

    final manager = $$LocalReportsTableTableManager(
      $_db,
      $_db.localReports,
    ).filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_reportIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }
}

class $$LocalReportItemsTableFilterComposer
    extends Composer<_$AppDatabase, $LocalReportItemsTable> {
  $$LocalReportItemsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get wbsItemId => $composableBuilder(
    column: $table.wbsItemId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get reportedPercent => $composableBuilder(
    column: $table.reportedPercent,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get quantityToday => $composableBuilder(
    column: $table.quantityToday,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get stepsJson => $composableBuilder(
    column: $table.stepsJson,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get crewCount => $composableBuilder(
    column: $table.crewCount,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get note => $composableBuilder(
    column: $table.note,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get serverStatus => $composableBuilder(
    column: $table.serverStatus,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get serverFlagsJson => $composableBuilder(
    column: $table.serverFlagsJson,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get serverPercent => $composableBuilder(
    column: $table.serverPercent,
    builder: (column) => ColumnFilters(column),
  );

  $$LocalReportsTableFilterComposer get reportId {
    final $$LocalReportsTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.reportId,
      referencedTable: $db.localReports,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$LocalReportsTableFilterComposer(
            $db: $db,
            $table: $db.localReports,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$LocalReportItemsTableOrderingComposer
    extends Composer<_$AppDatabase, $LocalReportItemsTable> {
  $$LocalReportItemsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get wbsItemId => $composableBuilder(
    column: $table.wbsItemId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get reportedPercent => $composableBuilder(
    column: $table.reportedPercent,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get quantityToday => $composableBuilder(
    column: $table.quantityToday,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get stepsJson => $composableBuilder(
    column: $table.stepsJson,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get crewCount => $composableBuilder(
    column: $table.crewCount,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get note => $composableBuilder(
    column: $table.note,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get serverStatus => $composableBuilder(
    column: $table.serverStatus,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get serverFlagsJson => $composableBuilder(
    column: $table.serverFlagsJson,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get serverPercent => $composableBuilder(
    column: $table.serverPercent,
    builder: (column) => ColumnOrderings(column),
  );

  $$LocalReportsTableOrderingComposer get reportId {
    final $$LocalReportsTableOrderingComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.reportId,
      referencedTable: $db.localReports,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$LocalReportsTableOrderingComposer(
            $db: $db,
            $table: $db.localReports,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$LocalReportItemsTableAnnotationComposer
    extends Composer<_$AppDatabase, $LocalReportItemsTable> {
  $$LocalReportItemsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get wbsItemId =>
      $composableBuilder(column: $table.wbsItemId, builder: (column) => column);

  GeneratedColumn<double> get reportedPercent => $composableBuilder(
    column: $table.reportedPercent,
    builder: (column) => column,
  );

  GeneratedColumn<double> get quantityToday => $composableBuilder(
    column: $table.quantityToday,
    builder: (column) => column,
  );

  GeneratedColumn<String> get stepsJson =>
      $composableBuilder(column: $table.stepsJson, builder: (column) => column);

  GeneratedColumn<int> get crewCount =>
      $composableBuilder(column: $table.crewCount, builder: (column) => column);

  GeneratedColumn<String> get note =>
      $composableBuilder(column: $table.note, builder: (column) => column);

  GeneratedColumn<String> get serverStatus => $composableBuilder(
    column: $table.serverStatus,
    builder: (column) => column,
  );

  GeneratedColumn<String> get serverFlagsJson => $composableBuilder(
    column: $table.serverFlagsJson,
    builder: (column) => column,
  );

  GeneratedColumn<double> get serverPercent => $composableBuilder(
    column: $table.serverPercent,
    builder: (column) => column,
  );

  $$LocalReportsTableAnnotationComposer get reportId {
    final $$LocalReportsTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.reportId,
      referencedTable: $db.localReports,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$LocalReportsTableAnnotationComposer(
            $db: $db,
            $table: $db.localReports,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$LocalReportItemsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $LocalReportItemsTable,
          LocalReportItemRow,
          $$LocalReportItemsTableFilterComposer,
          $$LocalReportItemsTableOrderingComposer,
          $$LocalReportItemsTableAnnotationComposer,
          $$LocalReportItemsTableCreateCompanionBuilder,
          $$LocalReportItemsTableUpdateCompanionBuilder,
          (LocalReportItemRow, $$LocalReportItemsTableReferences),
          LocalReportItemRow,
          PrefetchHooks Function({bool reportId})
        > {
  $$LocalReportItemsTableTableManager(
    _$AppDatabase db,
    $LocalReportItemsTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$LocalReportItemsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$LocalReportItemsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$LocalReportItemsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> reportId = const Value.absent(),
                Value<String> wbsItemId = const Value.absent(),
                Value<double?> reportedPercent = const Value.absent(),
                Value<double?> quantityToday = const Value.absent(),
                Value<String?> stepsJson = const Value.absent(),
                Value<int?> crewCount = const Value.absent(),
                Value<String?> note = const Value.absent(),
                Value<String?> serverStatus = const Value.absent(),
                Value<String?> serverFlagsJson = const Value.absent(),
                Value<double?> serverPercent = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => LocalReportItemsCompanion(
                id: id,
                reportId: reportId,
                wbsItemId: wbsItemId,
                reportedPercent: reportedPercent,
                quantityToday: quantityToday,
                stepsJson: stepsJson,
                crewCount: crewCount,
                note: note,
                serverStatus: serverStatus,
                serverFlagsJson: serverFlagsJson,
                serverPercent: serverPercent,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String reportId,
                required String wbsItemId,
                Value<double?> reportedPercent = const Value.absent(),
                Value<double?> quantityToday = const Value.absent(),
                Value<String?> stepsJson = const Value.absent(),
                Value<int?> crewCount = const Value.absent(),
                Value<String?> note = const Value.absent(),
                Value<String?> serverStatus = const Value.absent(),
                Value<String?> serverFlagsJson = const Value.absent(),
                Value<double?> serverPercent = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => LocalReportItemsCompanion.insert(
                id: id,
                reportId: reportId,
                wbsItemId: wbsItemId,
                reportedPercent: reportedPercent,
                quantityToday: quantityToday,
                stepsJson: stepsJson,
                crewCount: crewCount,
                note: note,
                serverStatus: serverStatus,
                serverFlagsJson: serverFlagsJson,
                serverPercent: serverPercent,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$LocalReportItemsTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: ({reportId = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [],
              addJoins:
                  <
                    T extends TableManagerState<
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic
                    >
                  >(state) {
                    if (reportId) {
                      state =
                          state.withJoin(
                                currentTable: table,
                                currentColumn: table.reportId,
                                referencedTable:
                                    $$LocalReportItemsTableReferences
                                        ._reportIdTable(db),
                                referencedColumn:
                                    $$LocalReportItemsTableReferences
                                        ._reportIdTable(db)
                                        .id,
                              )
                              as T;
                    }

                    return state;
                  },
              getPrefetchedDataCallback: (items) async {
                return [];
              },
            );
          },
        ),
      );
}

typedef $$LocalReportItemsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $LocalReportItemsTable,
      LocalReportItemRow,
      $$LocalReportItemsTableFilterComposer,
      $$LocalReportItemsTableOrderingComposer,
      $$LocalReportItemsTableAnnotationComposer,
      $$LocalReportItemsTableCreateCompanionBuilder,
      $$LocalReportItemsTableUpdateCompanionBuilder,
      (LocalReportItemRow, $$LocalReportItemsTableReferences),
      LocalReportItemRow,
      PrefetchHooks Function({bool reportId})
    >;
typedef $$LocalPhotosTableCreateCompanionBuilder =
    LocalPhotosCompanion Function({
      required String id,
      Value<String?> projectId,
      required String ownerKind,
      Value<String?> reportId,
      Value<String?> itemId,
      Value<String?> issueId,
      required String filePath,
      required String sha256,
      required int sizeBytes,
      required DateTime takenAt,
      required String workDate,
      Value<double?> lat,
      Value<double?> lng,
      Value<double?> accuracyM,
      Value<bool> mocked,
      Value<String?> caption,
      Value<String?> uploadId,
      Value<String> uploadState,
      Value<int> rowid,
    });
typedef $$LocalPhotosTableUpdateCompanionBuilder =
    LocalPhotosCompanion Function({
      Value<String> id,
      Value<String?> projectId,
      Value<String> ownerKind,
      Value<String?> reportId,
      Value<String?> itemId,
      Value<String?> issueId,
      Value<String> filePath,
      Value<String> sha256,
      Value<int> sizeBytes,
      Value<DateTime> takenAt,
      Value<String> workDate,
      Value<double?> lat,
      Value<double?> lng,
      Value<double?> accuracyM,
      Value<bool> mocked,
      Value<String?> caption,
      Value<String?> uploadId,
      Value<String> uploadState,
      Value<int> rowid,
    });

class $$LocalPhotosTableFilterComposer
    extends Composer<_$AppDatabase, $LocalPhotosTable> {
  $$LocalPhotosTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get projectId => $composableBuilder(
    column: $table.projectId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get ownerKind => $composableBuilder(
    column: $table.ownerKind,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get reportId => $composableBuilder(
    column: $table.reportId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get itemId => $composableBuilder(
    column: $table.itemId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get issueId => $composableBuilder(
    column: $table.issueId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get filePath => $composableBuilder(
    column: $table.filePath,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get sha256 => $composableBuilder(
    column: $table.sha256,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get sizeBytes => $composableBuilder(
    column: $table.sizeBytes,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get takenAt => $composableBuilder(
    column: $table.takenAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get workDate => $composableBuilder(
    column: $table.workDate,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get lat => $composableBuilder(
    column: $table.lat,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get lng => $composableBuilder(
    column: $table.lng,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get accuracyM => $composableBuilder(
    column: $table.accuracyM,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get mocked => $composableBuilder(
    column: $table.mocked,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get caption => $composableBuilder(
    column: $table.caption,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get uploadId => $composableBuilder(
    column: $table.uploadId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get uploadState => $composableBuilder(
    column: $table.uploadState,
    builder: (column) => ColumnFilters(column),
  );
}

class $$LocalPhotosTableOrderingComposer
    extends Composer<_$AppDatabase, $LocalPhotosTable> {
  $$LocalPhotosTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get projectId => $composableBuilder(
    column: $table.projectId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get ownerKind => $composableBuilder(
    column: $table.ownerKind,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get reportId => $composableBuilder(
    column: $table.reportId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get itemId => $composableBuilder(
    column: $table.itemId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get issueId => $composableBuilder(
    column: $table.issueId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get filePath => $composableBuilder(
    column: $table.filePath,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get sha256 => $composableBuilder(
    column: $table.sha256,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get sizeBytes => $composableBuilder(
    column: $table.sizeBytes,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get takenAt => $composableBuilder(
    column: $table.takenAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get workDate => $composableBuilder(
    column: $table.workDate,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get lat => $composableBuilder(
    column: $table.lat,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get lng => $composableBuilder(
    column: $table.lng,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get accuracyM => $composableBuilder(
    column: $table.accuracyM,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get mocked => $composableBuilder(
    column: $table.mocked,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get caption => $composableBuilder(
    column: $table.caption,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get uploadId => $composableBuilder(
    column: $table.uploadId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get uploadState => $composableBuilder(
    column: $table.uploadState,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$LocalPhotosTableAnnotationComposer
    extends Composer<_$AppDatabase, $LocalPhotosTable> {
  $$LocalPhotosTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get projectId =>
      $composableBuilder(column: $table.projectId, builder: (column) => column);

  GeneratedColumn<String> get ownerKind =>
      $composableBuilder(column: $table.ownerKind, builder: (column) => column);

  GeneratedColumn<String> get reportId =>
      $composableBuilder(column: $table.reportId, builder: (column) => column);

  GeneratedColumn<String> get itemId =>
      $composableBuilder(column: $table.itemId, builder: (column) => column);

  GeneratedColumn<String> get issueId =>
      $composableBuilder(column: $table.issueId, builder: (column) => column);

  GeneratedColumn<String> get filePath =>
      $composableBuilder(column: $table.filePath, builder: (column) => column);

  GeneratedColumn<String> get sha256 =>
      $composableBuilder(column: $table.sha256, builder: (column) => column);

  GeneratedColumn<int> get sizeBytes =>
      $composableBuilder(column: $table.sizeBytes, builder: (column) => column);

  GeneratedColumn<DateTime> get takenAt =>
      $composableBuilder(column: $table.takenAt, builder: (column) => column);

  GeneratedColumn<String> get workDate =>
      $composableBuilder(column: $table.workDate, builder: (column) => column);

  GeneratedColumn<double> get lat =>
      $composableBuilder(column: $table.lat, builder: (column) => column);

  GeneratedColumn<double> get lng =>
      $composableBuilder(column: $table.lng, builder: (column) => column);

  GeneratedColumn<double> get accuracyM =>
      $composableBuilder(column: $table.accuracyM, builder: (column) => column);

  GeneratedColumn<bool> get mocked =>
      $composableBuilder(column: $table.mocked, builder: (column) => column);

  GeneratedColumn<String> get caption =>
      $composableBuilder(column: $table.caption, builder: (column) => column);

  GeneratedColumn<String> get uploadId =>
      $composableBuilder(column: $table.uploadId, builder: (column) => column);

  GeneratedColumn<String> get uploadState => $composableBuilder(
    column: $table.uploadState,
    builder: (column) => column,
  );
}

class $$LocalPhotosTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $LocalPhotosTable,
          LocalPhotoRow,
          $$LocalPhotosTableFilterComposer,
          $$LocalPhotosTableOrderingComposer,
          $$LocalPhotosTableAnnotationComposer,
          $$LocalPhotosTableCreateCompanionBuilder,
          $$LocalPhotosTableUpdateCompanionBuilder,
          (
            LocalPhotoRow,
            BaseReferences<_$AppDatabase, $LocalPhotosTable, LocalPhotoRow>,
          ),
          LocalPhotoRow,
          PrefetchHooks Function()
        > {
  $$LocalPhotosTableTableManager(_$AppDatabase db, $LocalPhotosTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$LocalPhotosTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$LocalPhotosTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$LocalPhotosTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String?> projectId = const Value.absent(),
                Value<String> ownerKind = const Value.absent(),
                Value<String?> reportId = const Value.absent(),
                Value<String?> itemId = const Value.absent(),
                Value<String?> issueId = const Value.absent(),
                Value<String> filePath = const Value.absent(),
                Value<String> sha256 = const Value.absent(),
                Value<int> sizeBytes = const Value.absent(),
                Value<DateTime> takenAt = const Value.absent(),
                Value<String> workDate = const Value.absent(),
                Value<double?> lat = const Value.absent(),
                Value<double?> lng = const Value.absent(),
                Value<double?> accuracyM = const Value.absent(),
                Value<bool> mocked = const Value.absent(),
                Value<String?> caption = const Value.absent(),
                Value<String?> uploadId = const Value.absent(),
                Value<String> uploadState = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => LocalPhotosCompanion(
                id: id,
                projectId: projectId,
                ownerKind: ownerKind,
                reportId: reportId,
                itemId: itemId,
                issueId: issueId,
                filePath: filePath,
                sha256: sha256,
                sizeBytes: sizeBytes,
                takenAt: takenAt,
                workDate: workDate,
                lat: lat,
                lng: lng,
                accuracyM: accuracyM,
                mocked: mocked,
                caption: caption,
                uploadId: uploadId,
                uploadState: uploadState,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                Value<String?> projectId = const Value.absent(),
                required String ownerKind,
                Value<String?> reportId = const Value.absent(),
                Value<String?> itemId = const Value.absent(),
                Value<String?> issueId = const Value.absent(),
                required String filePath,
                required String sha256,
                required int sizeBytes,
                required DateTime takenAt,
                required String workDate,
                Value<double?> lat = const Value.absent(),
                Value<double?> lng = const Value.absent(),
                Value<double?> accuracyM = const Value.absent(),
                Value<bool> mocked = const Value.absent(),
                Value<String?> caption = const Value.absent(),
                Value<String?> uploadId = const Value.absent(),
                Value<String> uploadState = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => LocalPhotosCompanion.insert(
                id: id,
                projectId: projectId,
                ownerKind: ownerKind,
                reportId: reportId,
                itemId: itemId,
                issueId: issueId,
                filePath: filePath,
                sha256: sha256,
                sizeBytes: sizeBytes,
                takenAt: takenAt,
                workDate: workDate,
                lat: lat,
                lng: lng,
                accuracyM: accuracyM,
                mocked: mocked,
                caption: caption,
                uploadId: uploadId,
                uploadState: uploadState,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$LocalPhotosTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $LocalPhotosTable,
      LocalPhotoRow,
      $$LocalPhotosTableFilterComposer,
      $$LocalPhotosTableOrderingComposer,
      $$LocalPhotosTableAnnotationComposer,
      $$LocalPhotosTableCreateCompanionBuilder,
      $$LocalPhotosTableUpdateCompanionBuilder,
      (
        LocalPhotoRow,
        BaseReferences<_$AppDatabase, $LocalPhotosTable, LocalPhotoRow>,
      ),
      LocalPhotoRow,
      PrefetchHooks Function()
    >;
typedef $$LocalIssuesTableCreateCompanionBuilder =
    LocalIssuesCompanion Function({
      required String id,
      required String projectId,
      required String type,
      required String title,
      Value<String?> description,
      required String effect,
      Value<String?> wbsItemId,
      required DateTime deviceRecordedAt,
      Value<String> state,
      Value<String?> rejectMessage,
      Value<int> rowid,
    });
typedef $$LocalIssuesTableUpdateCompanionBuilder =
    LocalIssuesCompanion Function({
      Value<String> id,
      Value<String> projectId,
      Value<String> type,
      Value<String> title,
      Value<String?> description,
      Value<String> effect,
      Value<String?> wbsItemId,
      Value<DateTime> deviceRecordedAt,
      Value<String> state,
      Value<String?> rejectMessage,
      Value<int> rowid,
    });

class $$LocalIssuesTableFilterComposer
    extends Composer<_$AppDatabase, $LocalIssuesTable> {
  $$LocalIssuesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get projectId => $composableBuilder(
    column: $table.projectId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get type => $composableBuilder(
    column: $table.type,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get title => $composableBuilder(
    column: $table.title,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get description => $composableBuilder(
    column: $table.description,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get effect => $composableBuilder(
    column: $table.effect,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get wbsItemId => $composableBuilder(
    column: $table.wbsItemId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get deviceRecordedAt => $composableBuilder(
    column: $table.deviceRecordedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get state => $composableBuilder(
    column: $table.state,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get rejectMessage => $composableBuilder(
    column: $table.rejectMessage,
    builder: (column) => ColumnFilters(column),
  );
}

class $$LocalIssuesTableOrderingComposer
    extends Composer<_$AppDatabase, $LocalIssuesTable> {
  $$LocalIssuesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get projectId => $composableBuilder(
    column: $table.projectId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get type => $composableBuilder(
    column: $table.type,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get title => $composableBuilder(
    column: $table.title,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get description => $composableBuilder(
    column: $table.description,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get effect => $composableBuilder(
    column: $table.effect,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get wbsItemId => $composableBuilder(
    column: $table.wbsItemId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get deviceRecordedAt => $composableBuilder(
    column: $table.deviceRecordedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get state => $composableBuilder(
    column: $table.state,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get rejectMessage => $composableBuilder(
    column: $table.rejectMessage,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$LocalIssuesTableAnnotationComposer
    extends Composer<_$AppDatabase, $LocalIssuesTable> {
  $$LocalIssuesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get projectId =>
      $composableBuilder(column: $table.projectId, builder: (column) => column);

  GeneratedColumn<String> get type =>
      $composableBuilder(column: $table.type, builder: (column) => column);

  GeneratedColumn<String> get title =>
      $composableBuilder(column: $table.title, builder: (column) => column);

  GeneratedColumn<String> get description => $composableBuilder(
    column: $table.description,
    builder: (column) => column,
  );

  GeneratedColumn<String> get effect =>
      $composableBuilder(column: $table.effect, builder: (column) => column);

  GeneratedColumn<String> get wbsItemId =>
      $composableBuilder(column: $table.wbsItemId, builder: (column) => column);

  GeneratedColumn<DateTime> get deviceRecordedAt => $composableBuilder(
    column: $table.deviceRecordedAt,
    builder: (column) => column,
  );

  GeneratedColumn<String> get state =>
      $composableBuilder(column: $table.state, builder: (column) => column);

  GeneratedColumn<String> get rejectMessage => $composableBuilder(
    column: $table.rejectMessage,
    builder: (column) => column,
  );
}

class $$LocalIssuesTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $LocalIssuesTable,
          LocalIssueRow,
          $$LocalIssuesTableFilterComposer,
          $$LocalIssuesTableOrderingComposer,
          $$LocalIssuesTableAnnotationComposer,
          $$LocalIssuesTableCreateCompanionBuilder,
          $$LocalIssuesTableUpdateCompanionBuilder,
          (
            LocalIssueRow,
            BaseReferences<_$AppDatabase, $LocalIssuesTable, LocalIssueRow>,
          ),
          LocalIssueRow,
          PrefetchHooks Function()
        > {
  $$LocalIssuesTableTableManager(_$AppDatabase db, $LocalIssuesTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$LocalIssuesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$LocalIssuesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$LocalIssuesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> projectId = const Value.absent(),
                Value<String> type = const Value.absent(),
                Value<String> title = const Value.absent(),
                Value<String?> description = const Value.absent(),
                Value<String> effect = const Value.absent(),
                Value<String?> wbsItemId = const Value.absent(),
                Value<DateTime> deviceRecordedAt = const Value.absent(),
                Value<String> state = const Value.absent(),
                Value<String?> rejectMessage = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => LocalIssuesCompanion(
                id: id,
                projectId: projectId,
                type: type,
                title: title,
                description: description,
                effect: effect,
                wbsItemId: wbsItemId,
                deviceRecordedAt: deviceRecordedAt,
                state: state,
                rejectMessage: rejectMessage,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String projectId,
                required String type,
                required String title,
                Value<String?> description = const Value.absent(),
                required String effect,
                Value<String?> wbsItemId = const Value.absent(),
                required DateTime deviceRecordedAt,
                Value<String> state = const Value.absent(),
                Value<String?> rejectMessage = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => LocalIssuesCompanion.insert(
                id: id,
                projectId: projectId,
                type: type,
                title: title,
                description: description,
                effect: effect,
                wbsItemId: wbsItemId,
                deviceRecordedAt: deviceRecordedAt,
                state: state,
                rejectMessage: rejectMessage,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$LocalIssuesTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $LocalIssuesTable,
      LocalIssueRow,
      $$LocalIssuesTableFilterComposer,
      $$LocalIssuesTableOrderingComposer,
      $$LocalIssuesTableAnnotationComposer,
      $$LocalIssuesTableCreateCompanionBuilder,
      $$LocalIssuesTableUpdateCompanionBuilder,
      (
        LocalIssueRow,
        BaseReferences<_$AppDatabase, $LocalIssuesTable, LocalIssueRow>,
      ),
      LocalIssueRow,
      PrefetchHooks Function()
    >;
typedef $$LocalResubmissionsTableCreateCompanionBuilder =
    LocalResubmissionsCompanion Function({
      required String id,
      required String itemId,
      required String projectId,
      Value<double?> reportedPercent,
      Value<double?> quantityToday,
      Value<String?> stepsJson,
      Value<String?> note,
      required DateTime createdAt,
      Value<String> state,
      Value<String?> rejectMessage,
      Value<int> rowid,
    });
typedef $$LocalResubmissionsTableUpdateCompanionBuilder =
    LocalResubmissionsCompanion Function({
      Value<String> id,
      Value<String> itemId,
      Value<String> projectId,
      Value<double?> reportedPercent,
      Value<double?> quantityToday,
      Value<String?> stepsJson,
      Value<String?> note,
      Value<DateTime> createdAt,
      Value<String> state,
      Value<String?> rejectMessage,
      Value<int> rowid,
    });

class $$LocalResubmissionsTableFilterComposer
    extends Composer<_$AppDatabase, $LocalResubmissionsTable> {
  $$LocalResubmissionsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get itemId => $composableBuilder(
    column: $table.itemId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get projectId => $composableBuilder(
    column: $table.projectId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get reportedPercent => $composableBuilder(
    column: $table.reportedPercent,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get quantityToday => $composableBuilder(
    column: $table.quantityToday,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get stepsJson => $composableBuilder(
    column: $table.stepsJson,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get note => $composableBuilder(
    column: $table.note,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get state => $composableBuilder(
    column: $table.state,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get rejectMessage => $composableBuilder(
    column: $table.rejectMessage,
    builder: (column) => ColumnFilters(column),
  );
}

class $$LocalResubmissionsTableOrderingComposer
    extends Composer<_$AppDatabase, $LocalResubmissionsTable> {
  $$LocalResubmissionsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get itemId => $composableBuilder(
    column: $table.itemId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get projectId => $composableBuilder(
    column: $table.projectId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get reportedPercent => $composableBuilder(
    column: $table.reportedPercent,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get quantityToday => $composableBuilder(
    column: $table.quantityToday,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get stepsJson => $composableBuilder(
    column: $table.stepsJson,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get note => $composableBuilder(
    column: $table.note,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get state => $composableBuilder(
    column: $table.state,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get rejectMessage => $composableBuilder(
    column: $table.rejectMessage,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$LocalResubmissionsTableAnnotationComposer
    extends Composer<_$AppDatabase, $LocalResubmissionsTable> {
  $$LocalResubmissionsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get itemId =>
      $composableBuilder(column: $table.itemId, builder: (column) => column);

  GeneratedColumn<String> get projectId =>
      $composableBuilder(column: $table.projectId, builder: (column) => column);

  GeneratedColumn<double> get reportedPercent => $composableBuilder(
    column: $table.reportedPercent,
    builder: (column) => column,
  );

  GeneratedColumn<double> get quantityToday => $composableBuilder(
    column: $table.quantityToday,
    builder: (column) => column,
  );

  GeneratedColumn<String> get stepsJson =>
      $composableBuilder(column: $table.stepsJson, builder: (column) => column);

  GeneratedColumn<String> get note =>
      $composableBuilder(column: $table.note, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<String> get state =>
      $composableBuilder(column: $table.state, builder: (column) => column);

  GeneratedColumn<String> get rejectMessage => $composableBuilder(
    column: $table.rejectMessage,
    builder: (column) => column,
  );
}

class $$LocalResubmissionsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $LocalResubmissionsTable,
          LocalResubmissionRow,
          $$LocalResubmissionsTableFilterComposer,
          $$LocalResubmissionsTableOrderingComposer,
          $$LocalResubmissionsTableAnnotationComposer,
          $$LocalResubmissionsTableCreateCompanionBuilder,
          $$LocalResubmissionsTableUpdateCompanionBuilder,
          (
            LocalResubmissionRow,
            BaseReferences<
              _$AppDatabase,
              $LocalResubmissionsTable,
              LocalResubmissionRow
            >,
          ),
          LocalResubmissionRow,
          PrefetchHooks Function()
        > {
  $$LocalResubmissionsTableTableManager(
    _$AppDatabase db,
    $LocalResubmissionsTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$LocalResubmissionsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$LocalResubmissionsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$LocalResubmissionsTableAnnotationComposer(
                $db: db,
                $table: table,
              ),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> itemId = const Value.absent(),
                Value<String> projectId = const Value.absent(),
                Value<double?> reportedPercent = const Value.absent(),
                Value<double?> quantityToday = const Value.absent(),
                Value<String?> stepsJson = const Value.absent(),
                Value<String?> note = const Value.absent(),
                Value<DateTime> createdAt = const Value.absent(),
                Value<String> state = const Value.absent(),
                Value<String?> rejectMessage = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => LocalResubmissionsCompanion(
                id: id,
                itemId: itemId,
                projectId: projectId,
                reportedPercent: reportedPercent,
                quantityToday: quantityToday,
                stepsJson: stepsJson,
                note: note,
                createdAt: createdAt,
                state: state,
                rejectMessage: rejectMessage,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String itemId,
                required String projectId,
                Value<double?> reportedPercent = const Value.absent(),
                Value<double?> quantityToday = const Value.absent(),
                Value<String?> stepsJson = const Value.absent(),
                Value<String?> note = const Value.absent(),
                required DateTime createdAt,
                Value<String> state = const Value.absent(),
                Value<String?> rejectMessage = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => LocalResubmissionsCompanion.insert(
                id: id,
                itemId: itemId,
                projectId: projectId,
                reportedPercent: reportedPercent,
                quantityToday: quantityToday,
                stepsJson: stepsJson,
                note: note,
                createdAt: createdAt,
                state: state,
                rejectMessage: rejectMessage,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$LocalResubmissionsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $LocalResubmissionsTable,
      LocalResubmissionRow,
      $$LocalResubmissionsTableFilterComposer,
      $$LocalResubmissionsTableOrderingComposer,
      $$LocalResubmissionsTableAnnotationComposer,
      $$LocalResubmissionsTableCreateCompanionBuilder,
      $$LocalResubmissionsTableUpdateCompanionBuilder,
      (
        LocalResubmissionRow,
        BaseReferences<
          _$AppDatabase,
          $LocalResubmissionsTable,
          LocalResubmissionRow
        >,
      ),
      LocalResubmissionRow,
      PrefetchHooks Function()
    >;
typedef $$OutboxTableCreateCompanionBuilder =
    OutboxCompanion Function({
      Value<int> id,
      required String kind,
      required String entityId,
      required String projectId,
      Value<String> state,
      Value<int> attempts,
      Value<DateTime?> nextAttemptAt,
      Value<String?> lastErrorCode,
      Value<String?> lastErrorMessage,
      Value<int> bytes,
      required DateTime createdAt,
      required DateTime updatedAt,
    });
typedef $$OutboxTableUpdateCompanionBuilder =
    OutboxCompanion Function({
      Value<int> id,
      Value<String> kind,
      Value<String> entityId,
      Value<String> projectId,
      Value<String> state,
      Value<int> attempts,
      Value<DateTime?> nextAttemptAt,
      Value<String?> lastErrorCode,
      Value<String?> lastErrorMessage,
      Value<int> bytes,
      Value<DateTime> createdAt,
      Value<DateTime> updatedAt,
    });

class $$OutboxTableFilterComposer
    extends Composer<_$AppDatabase, $OutboxTable> {
  $$OutboxTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get kind => $composableBuilder(
    column: $table.kind,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get entityId => $composableBuilder(
    column: $table.entityId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get projectId => $composableBuilder(
    column: $table.projectId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get state => $composableBuilder(
    column: $table.state,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get attempts => $composableBuilder(
    column: $table.attempts,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get nextAttemptAt => $composableBuilder(
    column: $table.nextAttemptAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get lastErrorCode => $composableBuilder(
    column: $table.lastErrorCode,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get lastErrorMessage => $composableBuilder(
    column: $table.lastErrorMessage,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get bytes => $composableBuilder(
    column: $table.bytes,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$OutboxTableOrderingComposer
    extends Composer<_$AppDatabase, $OutboxTable> {
  $$OutboxTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get kind => $composableBuilder(
    column: $table.kind,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get entityId => $composableBuilder(
    column: $table.entityId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get projectId => $composableBuilder(
    column: $table.projectId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get state => $composableBuilder(
    column: $table.state,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get attempts => $composableBuilder(
    column: $table.attempts,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get nextAttemptAt => $composableBuilder(
    column: $table.nextAttemptAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get lastErrorCode => $composableBuilder(
    column: $table.lastErrorCode,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get lastErrorMessage => $composableBuilder(
    column: $table.lastErrorMessage,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get bytes => $composableBuilder(
    column: $table.bytes,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$OutboxTableAnnotationComposer
    extends Composer<_$AppDatabase, $OutboxTable> {
  $$OutboxTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get kind =>
      $composableBuilder(column: $table.kind, builder: (column) => column);

  GeneratedColumn<String> get entityId =>
      $composableBuilder(column: $table.entityId, builder: (column) => column);

  GeneratedColumn<String> get projectId =>
      $composableBuilder(column: $table.projectId, builder: (column) => column);

  GeneratedColumn<String> get state =>
      $composableBuilder(column: $table.state, builder: (column) => column);

  GeneratedColumn<int> get attempts =>
      $composableBuilder(column: $table.attempts, builder: (column) => column);

  GeneratedColumn<DateTime> get nextAttemptAt => $composableBuilder(
    column: $table.nextAttemptAt,
    builder: (column) => column,
  );

  GeneratedColumn<String> get lastErrorCode => $composableBuilder(
    column: $table.lastErrorCode,
    builder: (column) => column,
  );

  GeneratedColumn<String> get lastErrorMessage => $composableBuilder(
    column: $table.lastErrorMessage,
    builder: (column) => column,
  );

  GeneratedColumn<int> get bytes =>
      $composableBuilder(column: $table.bytes, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);
}

class $$OutboxTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $OutboxTable,
          OutboxRow,
          $$OutboxTableFilterComposer,
          $$OutboxTableOrderingComposer,
          $$OutboxTableAnnotationComposer,
          $$OutboxTableCreateCompanionBuilder,
          $$OutboxTableUpdateCompanionBuilder,
          (OutboxRow, BaseReferences<_$AppDatabase, $OutboxTable, OutboxRow>),
          OutboxRow,
          PrefetchHooks Function()
        > {
  $$OutboxTableTableManager(_$AppDatabase db, $OutboxTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$OutboxTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$OutboxTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$OutboxTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<String> kind = const Value.absent(),
                Value<String> entityId = const Value.absent(),
                Value<String> projectId = const Value.absent(),
                Value<String> state = const Value.absent(),
                Value<int> attempts = const Value.absent(),
                Value<DateTime?> nextAttemptAt = const Value.absent(),
                Value<String?> lastErrorCode = const Value.absent(),
                Value<String?> lastErrorMessage = const Value.absent(),
                Value<int> bytes = const Value.absent(),
                Value<DateTime> createdAt = const Value.absent(),
                Value<DateTime> updatedAt = const Value.absent(),
              }) => OutboxCompanion(
                id: id,
                kind: kind,
                entityId: entityId,
                projectId: projectId,
                state: state,
                attempts: attempts,
                nextAttemptAt: nextAttemptAt,
                lastErrorCode: lastErrorCode,
                lastErrorMessage: lastErrorMessage,
                bytes: bytes,
                createdAt: createdAt,
                updatedAt: updatedAt,
              ),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                required String kind,
                required String entityId,
                required String projectId,
                Value<String> state = const Value.absent(),
                Value<int> attempts = const Value.absent(),
                Value<DateTime?> nextAttemptAt = const Value.absent(),
                Value<String?> lastErrorCode = const Value.absent(),
                Value<String?> lastErrorMessage = const Value.absent(),
                Value<int> bytes = const Value.absent(),
                required DateTime createdAt,
                required DateTime updatedAt,
              }) => OutboxCompanion.insert(
                id: id,
                kind: kind,
                entityId: entityId,
                projectId: projectId,
                state: state,
                attempts: attempts,
                nextAttemptAt: nextAttemptAt,
                lastErrorCode: lastErrorCode,
                lastErrorMessage: lastErrorMessage,
                bytes: bytes,
                createdAt: createdAt,
                updatedAt: updatedAt,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$OutboxTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $OutboxTable,
      OutboxRow,
      $$OutboxTableFilterComposer,
      $$OutboxTableOrderingComposer,
      $$OutboxTableAnnotationComposer,
      $$OutboxTableCreateCompanionBuilder,
      $$OutboxTableUpdateCompanionBuilder,
      (OutboxRow, BaseReferences<_$AppDatabase, $OutboxTable, OutboxRow>),
      OutboxRow,
      PrefetchHooks Function()
    >;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$ProjectsTableTableManager get projects =>
      $$ProjectsTableTableManager(_db, _db.projects);
  $$ActivitiesTableTableManager get activities =>
      $$ActivitiesTableTableManager(_db, _db.activities);
  $$ServerItemsTableTableManager get serverItems =>
      $$ServerItemsTableTableManager(_db, _db.serverItems);
  $$SiteIssuesTableTableManager get siteIssues =>
      $$SiteIssuesTableTableManager(_db, _db.siteIssues);
  $$NotificationsTableTableManager get notifications =>
      $$NotificationsTableTableManager(_db, _db.notifications);
  $$SyncMetaTableTableManager get syncMeta =>
      $$SyncMetaTableTableManager(_db, _db.syncMeta);
  $$LocalReportsTableTableManager get localReports =>
      $$LocalReportsTableTableManager(_db, _db.localReports);
  $$LocalReportItemsTableTableManager get localReportItems =>
      $$LocalReportItemsTableTableManager(_db, _db.localReportItems);
  $$LocalPhotosTableTableManager get localPhotos =>
      $$LocalPhotosTableTableManager(_db, _db.localPhotos);
  $$LocalIssuesTableTableManager get localIssues =>
      $$LocalIssuesTableTableManager(_db, _db.localIssues);
  $$LocalResubmissionsTableTableManager get localResubmissions =>
      $$LocalResubmissionsTableTableManager(_db, _db.localResubmissions);
  $$OutboxTableTableManager get outbox =>
      $$OutboxTableTableManager(_db, _db.outbox);
}
