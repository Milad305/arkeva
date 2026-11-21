import 'dart:math' as math;

import 'package:projeyar_field/core/network/network_info.dart';
import 'package:projeyar_field/features/queue/domain/entities/queue_entities.dart';

/// ترتیب و زمان ارسال صف (F08 ۵.۲؛ rules ۹).
abstract final class OutboxPlanner {
  /// ردیف‌های آمادهٔ ارسال به ترتیب: همهٔ متن‌ها پیش از همهٔ عکس‌ها، و در هر دسته قدیمی‌ترین اول.
  /// «فقط Wi‑Fi» فقط عکس‌ها را روی دادهٔ همراه نگه می‌دارد. عکسی که صاحبش هنوز نرسیده منتظر می‌ماند.
  static List<QueueEntry> plan(List<QueueEntry> entries, {required DateTime now, required NetworkKind network, required bool wifiOnly}) {
    if (!network.isOnline) return const [];
    final photosAllowed = !wifiOnly || network == NetworkKind.wifi;
    final ready = entries.where((e) {
      if (!(e.state == OutboxState.pending || e.state == OutboxState.retry || e.state == OutboxState.sending)) return false;
      final next = e.nextAttemptAt;
      if (next != null && next.isAfter(now)) return false;
      if (e.kind == OutboxKind.photo) return photosAllowed && e.parentSent;
      return true;
    }).toList();
    int byAge(QueueEntry a, QueueEntry b) {
      final c = a.createdAt.compareTo(b.createdAt);
      return c != 0 ? c : a.id.compareTo(b.id);
    }

    final texts = ready.where((e) => e.kind.isText).toList()..sort(byAge);
    final photos = ready.where((e) => !e.kind.isText).toList()..sort(byAge);
    return [...texts, ...photos];
  }

  /// پس‌روی نمایی ۲، ۴، ۸ ثانیه … تا حداکثر ۵ دقیقه (rules ۷).
  static Duration backoff(int attempts, {Duration? retryAfter}) {
    if (retryAfter != null) return retryAfter;
    final seconds = math.min(300, math.pow(2, math.max(1, attempts)).toInt());
    return Duration(seconds: seconds);
  }
}
