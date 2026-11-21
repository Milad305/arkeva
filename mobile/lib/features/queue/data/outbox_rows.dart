import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:projeyar_field/core/database/app_database.dart';
import 'package:projeyar_field/core/network/json_read.dart';
import 'package:projeyar_field/features/queue/domain/entities/queue_entities.dart';

/// خواندن ردیف‌های صف با وضعیت صاحب هر عکس.
abstract final class OutboxRows {
  static Future<List<QueueEntry>> entries(AppDatabase db) async {
    final rows = await (db.select(db.outbox)..where((t) => t.state.isNotIn([OutboxState.sent.name]))).get();
    return map(db, rows);
  }

  static Future<List<QueueEntry>> map(AppDatabase db, List<OutboxRow> rows) async {
    final photoIds = rows.where((r) => r.kind == OutboxKind.photo.name).map((r) => r.entityId).toList();
    final owners = <String, String?>{};
    if (photoIds.isNotEmpty) {
      final photos = await (db.select(db.localPhotos)..where((t) => t.id.isIn(photoIds))).get();
      for (final p in photos) {
        owners[p.id] = p.ownerKind == 'issue' ? p.issueId : p.reportId;
      }
    }
    final ownerIds = owners.values.whereType<String>().toSet();
    final sentOwners = ownerIds.isEmpty
        ? <String>{}
        : (await (db.select(db.outbox)..where((t) => t.entityId.isIn(ownerIds) & t.state.equals(OutboxState.sent.name))).get())
              .map((r) => r.entityId)
              .toSet();
    return [
      for (final r in rows)
        QueueEntry(
          id: r.id,
          kind: OutboxKind.parse(r.kind),
          entityId: r.entityId,
          projectId: r.projectId,
          state: OutboxState.parse(r.state),
          attempts: r.attempts,
          createdAt: r.createdAt,
          nextAttemptAt: r.nextAttemptAt,
          lastErrorCode: r.lastErrorCode,
          lastErrorMessage: r.lastErrorMessage,
          bytes: r.bytes,
          parentSent: r.kind != OutboxKind.photo.name || sentOwners.contains(owners[r.entityId]),
        ),
    ];
  }

  static Map<String, double> decodeSteps(String json) {
    final decoded = jsonDecode(json);
    if (decoded is! Map) return const {};
    return {for (final e in decoded.entries) '${e.key}': readNumOr0(e.value)};
  }
}
