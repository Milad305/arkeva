import 'dart:convert';

import 'package:projeyar_field/core/database/app_database.dart';
import 'package:projeyar_field/core/network/json_read.dart';
import 'package:projeyar_field/features/reports/domain/entities/report_entities.dart';

/// نگاشت ردیف‌های drift به موجودیت‌های گزارش.
abstract final class ReportMappers {
  static ReportDraft report(LocalReportRow r, List<LocalReportItemRow> items) => ReportDraft(
    id: r.id,
    projectId: r.projectId,
    workDate: r.workDate,
    createdAt: r.createdAt,
    state: LocalReportState.parse(r.state),
    weather: r.weather == null ? null : Weather.values.where((w) => w.name == r.weather).firstOrNull,
    temperatureC: r.temperatureC,
    note: r.note,
    items: items.map(item).toList(),
    reportNo: r.reportNo,
    rejectMessage: r.rejectMessage,
  );

  static DraftItem item(LocalReportItemRow r) => DraftItem(
    id: r.id,
    activityId: r.wbsItemId,
    values: ProgressValues(reportedPercent: r.reportedPercent, quantityToday: r.quantityToday, steps: steps(r.stepsJson)),
    crewCount: r.crewCount,
    note: r.note,
  );

  static Map<String, double> steps(String? json) {
    if (json == null) return const {};
    final decoded = jsonDecode(json);
    if (decoded is! Map) return const {};
    return {for (final e in decoded.entries) '${e.key}': readNumOr0(e.value)};
  }

  static String? stepsJson(Map<String, double> steps) => steps.isEmpty ? null : jsonEncode(steps);

  static ServerItem serverItem(ServerItemRow r) => ServerItem(
    id: r.id,
    reportId: r.reportId,
    projectId: r.projectId,
    activityId: r.wbsItemId,
    status: ItemStatus.parse(r.status),
    reportNo: r.reportNo,
    workDate: r.workDate,
    flags: [for (final f in _list(r.flagsJson)) '$f'],
    computedPercent: r.computedPercent,
    revisionCount: r.revisionCount,
    revision: r.revisionJson == null ? null : revision(jsonDecode(r.revisionJson!)),
    photos: [
      for (final p in _list(r.photosJson).whereType<Map<String, Object?>>())
        ServerPhotoRef(id: '${p['id']}', uploadStatus: '${p['uploadStatus']}', markedUnsuitable: p['markedUnsuitable'] == true),
    ],
  );

  static RevisionRequest? revision(Object? json) {
    if (json is! Map) return null;
    final actions = json['requiredActions'];
    final at = json['requestedAt'];
    return RevisionRequest(
      note: json['note'] is String ? json['note'] as String : null,
      requestedAt: at is String ? DateTime.tryParse(at) : null,
      actions: [
        if (actions is List)
          for (final a in actions.whereType<Map<String, Object?>>())
            RequiredAction(key: '${a['key']}', text: '${a['text']}', isPhoto: a['type'] == 'photo', minPhotos: readInt(a['minPhotos'])),
      ],
    );
  }

  static List<Object?> _list(String json) {
    final decoded = jsonDecode(json);
    return decoded is List ? decoded : const [];
  }
}
