import 'package:projeyar_field/core/result/result.dart';
import 'package:projeyar_field/features/notifications/domain/entities/notification_entities.dart';

/// اعلان‌ها (M12): آنلاین با cursor؛ بی‌شبکه از پایگاه دادهٔ محلی که `/field/sync` پر می‌کند (F08 ۵.۱). خواندن فقط آنلاین.
abstract interface class NotificationsRepository {
  Future<Result<NotificationPage>> fetch({String? cursor, bool unreadOnly = false});

  /// اعلان‌های همگام‌شده در گوشی (۳۰ روز اخیر، حداکثر ۱۰۰)؛ برای نمایش بی‌شبکه.
  Future<NotificationPage> local({bool unreadOnly = false});

  Future<Result<Unit>> markRead(String id);

  Future<Result<Unit>> markAllRead();
}
