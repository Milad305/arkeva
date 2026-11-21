import 'package:equatable/equatable.dart';

final class AppNotification extends Equatable {
  const AppNotification({
    required this.id,
    required this.code,
    required this.title,
    required this.createdAt,
    this.body,
    this.category,
    this.severity,
    this.projectName,
    this.link,
    this.readAt,
    this.mergedCount = 1,
  });

  final String id;
  final String code;
  final String title;
  final String? body;
  final String? category;
  final String? severity;
  final String? projectName;
  final String? link;
  final DateTime createdAt;
  final DateTime? readAt;
  final int mergedCount;

  bool get isRead => readAt != null;

  AppNotification markRead(DateTime at) => AppNotification(
    id: id,
    code: code,
    title: title,
    createdAt: createdAt,
    body: body,
    category: category,
    severity: severity,
    projectName: projectName,
    link: link,
    readAt: readAt ?? at,
    mergedCount: mergedCount,
  );

  @override
  List<Object?> get props => [id, code, title, body, category, severity, projectName, link, createdAt, readAt, mergedCount];
}

final class NotificationPage extends Equatable {
  const NotificationPage({required this.items, required this.unreadCount, this.nextCursor});

  final List<AppNotification> items;
  final String? nextCursor;
  final int unreadCount;

  @override
  List<Object?> get props => [items, nextCursor, unreadCount];
}
