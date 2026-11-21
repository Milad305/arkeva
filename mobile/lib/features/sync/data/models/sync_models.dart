import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:projeyar_field/core/network/json_read.dart';

part 'sync_models.freezed.dart';
part 'sync_models.g.dart';

// پاسخ `GET /field/sync` (backend field-app/application/app-sync.ts). عددهای numeric ممکن است رشته باشند.

@freezed
abstract class SyncResponseDto with _$SyncResponseDto {
  const factory SyncResponseDto({
    required String cursor,
    required String serverTime,
    required String today,
    @Default([]) List<SyncProjectDto> projects,
    @Default([]) List<SyncActivityDto> activities,
    @Default([]) List<SyncItemDto> items,
    @Default([]) List<SyncIssueDto> issues,
    @Default([]) List<SyncNotificationDto> notifications,
  }) = _SyncResponseDto;

  factory SyncResponseDto.fromJson(Map<String, dynamic> json) => _$SyncResponseDtoFromJson(json);
}

@freezed
abstract class SyncSiteDto with _$SyncSiteDto {
  const factory SyncSiteDto({
    @JsonKey(fromJson: readNumOr0) required double lat,
    @JsonKey(fromJson: readNumOr0) required double lng,
    @JsonKey(fromJson: readNum) double? radiusM,
  }) = _SyncSiteDto;

  factory SyncSiteDto.fromJson(Map<String, dynamic> json) => _$SyncSiteDtoFromJson(json);
}

@freezed
abstract class SyncRulesDto with _$SyncRulesDto {
  const factory SyncRulesDto({
    @JsonKey(fromJson: readInt) int? minPhotos,
    @JsonKey(fromJson: readNum) double? maxJumpPct,
    @Default(false) bool allowDecrease,
    @JsonKey(fromJson: readInt) int? lateAfterHours,
    String? gpsMode,
    String? approvalMode,
    SyncDailyReminderDto? dailyReminder,
  }) = _SyncRulesDto;

  factory SyncRulesDto.fromJson(Map<String, dynamic> json) => _$SyncRulesDtoFromJson(json);
}

@freezed
abstract class SyncProjectDto with _$SyncProjectDto {
  const factory SyncProjectDto({
    required String id,
    required String name,
    SyncSiteDto? site,
    @Default(SyncRulesDto()) SyncRulesDto rules,
    @Default(<String, Object?>{}) Map<String, Object?> calendar,
  }) = _SyncProjectDto;

  factory SyncProjectDto.fromJson(Map<String, dynamic> json) => _$SyncProjectDtoFromJson(json);
}

@freezed
abstract class SyncStepDto with _$SyncStepDto {
  const factory SyncStepDto({
    required String key,
    required String title,
    @JsonKey(fromJson: readNumOr0) required double weight,
    @JsonKey(fromJson: readNumOr0) @Default(0) double approvedPercent,
  }) = _SyncStepDto;

  factory SyncStepDto.fromJson(Map<String, dynamic> json) => _$SyncStepDtoFromJson(json);
}

@freezed
abstract class SyncPlanPointDto with _$SyncPlanPointDto {
  const factory SyncPlanPointDto({
    required String date,
    @JsonKey(fromJson: readNumOr0) required double plannedPercent,
  }) = _SyncPlanPointDto;

  factory SyncPlanPointDto.fromJson(Map<String, dynamic> json) => _$SyncPlanPointDtoFromJson(json);
}

@freezed
abstract class SyncActivityDto with _$SyncActivityDto {
  const factory SyncActivityDto({
    required String id,
    required String projectId,
    required String code,
    required String title,
    required String method,
    String? parentId,
    String? unit,
    @JsonKey(fromJson: readNum) double? totalQuantity,
    List<SyncStepDto>? steps,
    String? plannedStart,
    String? plannedFinish,
    @JsonKey(fromJson: readNumOr0) @Default(0) double approvedPercent,
    @JsonKey(fromJson: readNum) double? approvedQuantity,
    @JsonKey(fromJson: readNum) double? lastPendingPercent,
    @Default([]) List<SyncPlanPointDto> plan,
    String? approverUserId,
    String? approverName,
  }) = _SyncActivityDto;

  factory SyncActivityDto.fromJson(Map<String, dynamic> json) => _$SyncActivityDtoFromJson(json);
}

@freezed
abstract class SyncItemDto with _$SyncItemDto {
  const factory SyncItemDto({
    required String id,
    required String reportId,
    required String projectId,
    required String wbsItemId,
    required String status,
    String? reportNo,
    String? workDate,
    @Default([]) List<String> flags,
    @JsonKey(fromJson: readNum) double? computedPercent,
    @JsonKey(fromJson: readInt) int? revisionCount,
    Map<String, Object?>? revision,
    @Default([]) List<Map<String, Object?>> photos,
  }) = _SyncItemDto;

  factory SyncItemDto.fromJson(Map<String, dynamic> json) => _$SyncItemDtoFromJson(json);
}

@freezed
abstract class SyncIssueDto with _$SyncIssueDto {
  const factory SyncIssueDto({
    required String id,
    required String projectId,
    required String title,
    required String type,
    required String effect,
    required String reportedAt,
    required String status,
    String? wbsItemId,
    String? riskCode,
    String? category,
  }) = _SyncIssueDto;

  factory SyncIssueDto.fromJson(Map<String, dynamic> json) => _$SyncIssueDtoFromJson(json);
}

@freezed
abstract class SyncDailyReminderDto with _$SyncDailyReminderDto {
  const factory SyncDailyReminderDto({@Default(true) bool enabled, @Default('17:00') String time}) = _SyncDailyReminderDto;

  factory SyncDailyReminderDto.fromJson(Map<String, dynamic> json) => _$SyncDailyReminderDtoFromJson(json);
}

/// همان شکل `GET /notifications` (backend notifications/my-notifications.ts).
@freezed
abstract class SyncNotificationDto with _$SyncNotificationDto {
  const factory SyncNotificationDto({
    required String id,
    required String title,
    required String createdAt,
    @Default('') String code,
    String? category,
    String? severity,
    String? body,
    String? projectId,
    String? projectName,
    String? link,
    String? readAt,
    @JsonKey(fromJson: readInt) int? mergedCount,
  }) = _SyncNotificationDto;

  factory SyncNotificationDto.fromJson(Map<String, dynamic> json) => _$SyncNotificationDtoFromJson(json);
}
