// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'sync_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_SyncResponseDto _$SyncResponseDtoFromJson(Map<String, dynamic> json) =>
    _SyncResponseDto(
      cursor: json['cursor'] as String,
      serverTime: json['serverTime'] as String,
      today: json['today'] as String,
      projects:
          (json['projects'] as List<dynamic>?)
              ?.map((e) => SyncProjectDto.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      activities:
          (json['activities'] as List<dynamic>?)
              ?.map((e) => SyncActivityDto.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      items:
          (json['items'] as List<dynamic>?)
              ?.map((e) => SyncItemDto.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      issues:
          (json['issues'] as List<dynamic>?)
              ?.map((e) => SyncIssueDto.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      notifications:
          (json['notifications'] as List<dynamic>?)
              ?.map(
                (e) => SyncNotificationDto.fromJson(e as Map<String, dynamic>),
              )
              .toList() ??
          const [],
    );

Map<String, dynamic> _$SyncResponseDtoToJson(_SyncResponseDto instance) =>
    <String, dynamic>{
      'cursor': instance.cursor,
      'serverTime': instance.serverTime,
      'today': instance.today,
      'projects': instance.projects,
      'activities': instance.activities,
      'items': instance.items,
      'issues': instance.issues,
      'notifications': instance.notifications,
    };

_SyncSiteDto _$SyncSiteDtoFromJson(Map<String, dynamic> json) => _SyncSiteDto(
  lat: readNumOr0(json['lat']),
  lng: readNumOr0(json['lng']),
  radiusM: readNum(json['radiusM']),
);

Map<String, dynamic> _$SyncSiteDtoToJson(_SyncSiteDto instance) =>
    <String, dynamic>{
      'lat': instance.lat,
      'lng': instance.lng,
      'radiusM': instance.radiusM,
    };

_SyncRulesDto _$SyncRulesDtoFromJson(Map<String, dynamic> json) =>
    _SyncRulesDto(
      minPhotos: readInt(json['minPhotos']),
      maxJumpPct: readNum(json['maxJumpPct']),
      allowDecrease: json['allowDecrease'] as bool? ?? false,
      lateAfterHours: readInt(json['lateAfterHours']),
      gpsMode: json['gpsMode'] as String?,
      approvalMode: json['approvalMode'] as String?,
      dailyReminder: json['dailyReminder'] == null
          ? null
          : SyncDailyReminderDto.fromJson(
              json['dailyReminder'] as Map<String, dynamic>,
            ),
    );

Map<String, dynamic> _$SyncRulesDtoToJson(_SyncRulesDto instance) =>
    <String, dynamic>{
      'minPhotos': instance.minPhotos,
      'maxJumpPct': instance.maxJumpPct,
      'allowDecrease': instance.allowDecrease,
      'lateAfterHours': instance.lateAfterHours,
      'gpsMode': instance.gpsMode,
      'approvalMode': instance.approvalMode,
      'dailyReminder': instance.dailyReminder,
    };

_SyncProjectDto _$SyncProjectDtoFromJson(Map<String, dynamic> json) =>
    _SyncProjectDto(
      id: json['id'] as String,
      name: json['name'] as String,
      site: json['site'] == null
          ? null
          : SyncSiteDto.fromJson(json['site'] as Map<String, dynamic>),
      rules: json['rules'] == null
          ? const SyncRulesDto()
          : SyncRulesDto.fromJson(json['rules'] as Map<String, dynamic>),
      calendar:
          json['calendar'] as Map<String, dynamic>? ??
          const <String, Object?>{},
    );

Map<String, dynamic> _$SyncProjectDtoToJson(_SyncProjectDto instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'site': instance.site,
      'rules': instance.rules,
      'calendar': instance.calendar,
    };

_SyncStepDto _$SyncStepDtoFromJson(Map<String, dynamic> json) => _SyncStepDto(
  key: json['key'] as String,
  title: json['title'] as String,
  weight: readNumOr0(json['weight']),
  approvedPercent: json['approvedPercent'] == null
      ? 0
      : readNumOr0(json['approvedPercent']),
);

Map<String, dynamic> _$SyncStepDtoToJson(_SyncStepDto instance) =>
    <String, dynamic>{
      'key': instance.key,
      'title': instance.title,
      'weight': instance.weight,
      'approvedPercent': instance.approvedPercent,
    };

_SyncPlanPointDto _$SyncPlanPointDtoFromJson(Map<String, dynamic> json) =>
    _SyncPlanPointDto(
      date: json['date'] as String,
      plannedPercent: readNumOr0(json['plannedPercent']),
    );

Map<String, dynamic> _$SyncPlanPointDtoToJson(_SyncPlanPointDto instance) =>
    <String, dynamic>{
      'date': instance.date,
      'plannedPercent': instance.plannedPercent,
    };

_SyncActivityDto _$SyncActivityDtoFromJson(Map<String, dynamic> json) =>
    _SyncActivityDto(
      id: json['id'] as String,
      projectId: json['projectId'] as String,
      code: json['code'] as String,
      title: json['title'] as String,
      method: json['method'] as String,
      parentId: json['parentId'] as String?,
      unit: json['unit'] as String?,
      totalQuantity: readNum(json['totalQuantity']),
      steps: (json['steps'] as List<dynamic>?)
          ?.map((e) => SyncStepDto.fromJson(e as Map<String, dynamic>))
          .toList(),
      plannedStart: json['plannedStart'] as String?,
      plannedFinish: json['plannedFinish'] as String?,
      approvedPercent: json['approvedPercent'] == null
          ? 0
          : readNumOr0(json['approvedPercent']),
      approvedQuantity: readNum(json['approvedQuantity']),
      lastPendingPercent: readNum(json['lastPendingPercent']),
      plan:
          (json['plan'] as List<dynamic>?)
              ?.map((e) => SyncPlanPointDto.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      approverUserId: json['approverUserId'] as String?,
      approverName: json['approverName'] as String?,
    );

Map<String, dynamic> _$SyncActivityDtoToJson(_SyncActivityDto instance) =>
    <String, dynamic>{
      'id': instance.id,
      'projectId': instance.projectId,
      'code': instance.code,
      'title': instance.title,
      'method': instance.method,
      'parentId': instance.parentId,
      'unit': instance.unit,
      'totalQuantity': instance.totalQuantity,
      'steps': instance.steps,
      'plannedStart': instance.plannedStart,
      'plannedFinish': instance.plannedFinish,
      'approvedPercent': instance.approvedPercent,
      'approvedQuantity': instance.approvedQuantity,
      'lastPendingPercent': instance.lastPendingPercent,
      'plan': instance.plan,
      'approverUserId': instance.approverUserId,
      'approverName': instance.approverName,
    };

_SyncItemDto _$SyncItemDtoFromJson(Map<String, dynamic> json) => _SyncItemDto(
  id: json['id'] as String,
  reportId: json['reportId'] as String,
  projectId: json['projectId'] as String,
  wbsItemId: json['wbsItemId'] as String,
  status: json['status'] as String,
  reportNo: json['reportNo'] as String?,
  workDate: json['workDate'] as String?,
  flags:
      (json['flags'] as List<dynamic>?)?.map((e) => e as String).toList() ??
      const [],
  computedPercent: readNum(json['computedPercent']),
  revisionCount: readInt(json['revisionCount']),
  revision: json['revision'] as Map<String, dynamic>?,
  photos:
      (json['photos'] as List<dynamic>?)
          ?.map((e) => e as Map<String, dynamic>)
          .toList() ??
      const [],
);

Map<String, dynamic> _$SyncItemDtoToJson(_SyncItemDto instance) =>
    <String, dynamic>{
      'id': instance.id,
      'reportId': instance.reportId,
      'projectId': instance.projectId,
      'wbsItemId': instance.wbsItemId,
      'status': instance.status,
      'reportNo': instance.reportNo,
      'workDate': instance.workDate,
      'flags': instance.flags,
      'computedPercent': instance.computedPercent,
      'revisionCount': instance.revisionCount,
      'revision': instance.revision,
      'photos': instance.photos,
    };

_SyncIssueDto _$SyncIssueDtoFromJson(Map<String, dynamic> json) =>
    _SyncIssueDto(
      id: json['id'] as String,
      projectId: json['projectId'] as String,
      title: json['title'] as String,
      type: json['type'] as String,
      effect: json['effect'] as String,
      reportedAt: json['reportedAt'] as String,
      status: json['status'] as String,
      wbsItemId: json['wbsItemId'] as String?,
      riskCode: json['riskCode'] as String?,
      category: json['category'] as String?,
    );

Map<String, dynamic> _$SyncIssueDtoToJson(_SyncIssueDto instance) =>
    <String, dynamic>{
      'id': instance.id,
      'projectId': instance.projectId,
      'title': instance.title,
      'type': instance.type,
      'effect': instance.effect,
      'reportedAt': instance.reportedAt,
      'status': instance.status,
      'wbsItemId': instance.wbsItemId,
      'riskCode': instance.riskCode,
      'category': instance.category,
    };

_SyncDailyReminderDto _$SyncDailyReminderDtoFromJson(
  Map<String, dynamic> json,
) => _SyncDailyReminderDto(
  enabled: json['enabled'] as bool? ?? true,
  time: json['time'] as String? ?? '17:00',
);

Map<String, dynamic> _$SyncDailyReminderDtoToJson(
  _SyncDailyReminderDto instance,
) => <String, dynamic>{'enabled': instance.enabled, 'time': instance.time};

_SyncNotificationDto _$SyncNotificationDtoFromJson(Map<String, dynamic> json) =>
    _SyncNotificationDto(
      id: json['id'] as String,
      title: json['title'] as String,
      createdAt: json['createdAt'] as String,
      code: json['code'] as String? ?? '',
      category: json['category'] as String?,
      severity: json['severity'] as String?,
      body: json['body'] as String?,
      projectId: json['projectId'] as String?,
      projectName: json['projectName'] as String?,
      link: json['link'] as String?,
      readAt: json['readAt'] as String?,
      mergedCount: readInt(json['mergedCount']),
    );

Map<String, dynamic> _$SyncNotificationDtoToJson(
  _SyncNotificationDto instance,
) => <String, dynamic>{
  'id': instance.id,
  'title': instance.title,
  'createdAt': instance.createdAt,
  'code': instance.code,
  'category': instance.category,
  'severity': instance.severity,
  'body': instance.body,
  'projectId': instance.projectId,
  'projectName': instance.projectName,
  'link': instance.link,
  'readAt': instance.readAt,
  'mergedCount': instance.mergedCount,
};
