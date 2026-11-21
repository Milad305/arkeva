import 'package:drift/drift.dart';
import 'package:injectable/injectable.dart';
import 'package:projeyar_field/core/database/app_database.dart';
import 'package:projeyar_field/core/error/error_mapper.dart';
import 'package:projeyar_field/core/network/api_client.dart';
import 'package:projeyar_field/core/network/json_read.dart';
import 'package:projeyar_field/core/result/result.dart';
import 'package:projeyar_field/features/notifications/domain/entities/notification_entities.dart';
import 'package:projeyar_field/features/notifications/domain/repositories/notifications_repository.dart';

/// `GET /notifications` و علامت خواندن (backend notifications)؛ بی‌شبکه جدول `Notifications` (آینهٔ sync).
@LazySingleton(as: NotificationsRepository)
class NotificationsRepositoryImpl implements NotificationsRepository {
  NotificationsRepositoryImpl(this._api, this._db);

  final ApiClient _api;
  final AppDatabase _db;

  @override
  Future<NotificationPage> local({bool unreadOnly = false}) async {
    final query = _db.select(_db.notifications)
      ..orderBy([(t) => OrderingTerm.desc(t.createdAt), (t) => OrderingTerm.desc(t.id)]);
    final rows = await query.get();
    final items = [for (final r in rows) _row(r)];
    return NotificationPage(
      items: unreadOnly ? items.where((n) => !n.isRead).toList() : items,
      unreadCount: items.where((n) => !n.isRead).length,
    );
  }

  static AppNotification _row(NotificationRow r) => AppNotification(
    id: r.id,
    code: r.code,
    title: r.title,
    body: r.body,
    category: r.category,
    severity: r.severity,
    projectName: r.projectName,
    link: r.link,
    createdAt: DateTime.tryParse(r.createdAt) ?? DateTime.fromMillisecondsSinceEpoch(0),
    readAt: r.readAt == null ? null : DateTime.tryParse(r.readAt!),
    mergedCount: r.mergedCount,
  );

  /// «خوانده شد» پس از موفقیت سرور در آینهٔ محلی هم ثبت می‌شود تا نمای بی‌شبکه درست بماند.
  Future<void> _markLocal({String? id}) {
    final update = _db.update(_db.notifications)..where((t) => t.readAt.isNull());
    if (id != null) update.where((t) => t.id.equals(id));
    return update.write(NotificationsCompanion(readAt: Value(DateTime.now().toUtc().toIso8601String())));
  }

  @override
  Future<Result<NotificationPage>> fetch({String? cursor, bool unreadOnly = false}) async {
    try {
      final json = ApiClient.asJson(
        await _api.get('/notifications', query: {'limit': 30, 'cursor': ?cursor, if (unreadOnly) 'status': 'unread'}),
      );
      final page = NotificationPage(
        items: [for (final i in (json['items'] as List?) ?? const []) if (i is Map) _item(ApiClient.asJson(i))],
        nextCursor: json['nextCursor'] as String?,
        unreadCount: readInt(json['unreadCount']) ?? 0,
      );
      return Ok(page);
    } on Object catch (e) {
      return Err(ErrorMapper.map(e));
    }
  }

  static AppNotification _item(Json j) => AppNotification(
    id: '${j['id']}',
    code: '${j['code'] ?? ''}',
    title: '${j['title'] ?? ''}',
    body: j['body'] as String?,
    category: j['category'] as String?,
    severity: j['severity'] as String?,
    projectName: j['projectName'] as String?,
    link: j['link'] as String?,
    createdAt: DateTime.tryParse('${j['createdAt']}') ?? DateTime.fromMillisecondsSinceEpoch(0),
    readAt: j['readAt'] is String ? DateTime.tryParse(j['readAt']! as String) : null,
    mergedCount: readInt(j['mergedCount']) ?? 1,
  );

  @override
  Future<Result<Unit>> markRead(String id) async {
    try {
      await _api.post('/notifications/$id/read');
      await _markLocal(id: id);
      return const Ok(unit);
    } on Object catch (e) {
      return Err(ErrorMapper.map(e));
    }
  }

  @override
  Future<Result<Unit>> markAllRead() async {
    try {
      await _api.post('/notifications/read-all', body: const <String, Object?>{});
      await _markLocal();
      return const Ok(unit);
    } on Object catch (e) {
      return Err(ErrorMapper.map(e));
    }
  }
}
