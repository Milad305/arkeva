import 'package:projeyar_field/core/result/result.dart';
import 'package:projeyar_field/features/queue/domain/entities/queue_entities.dart';

/// صف ارسال (M09). ذخیرهٔ ردیف‌ها کار لایهٔ دادهٔ هر ویژگی است؛ این رابط خواندن، تنظیم و اجرا را می‌دهد.
abstract interface class QueueRepository {
  Stream<QueueSummary> watchSummary();

  Future<QueueSummary> summary();

  Stream<List<QueueEntry>> watchEntries();

  Stream<bool> watchWifiOnly();

  Future<bool> wifiOnly();

  Future<Result<Unit>> setWifiOnly({required bool value});

  /// یک اجرای پردازشگر با قفل یک‌اجرایی.
  Future<Result<QueueRunReport>> process();

  /// درخواست اجرای زودهنگام (ذخیرهٔ تازه در صف)؛ QueueStatusCubit گوش می‌دهد.
  void kick();

  Stream<void> get kicks;

  /// صفر کردن زمان انتظار ردیف‌های در حال تکرار («ارسال الان» در M09).
  Future<Result<Unit>> retryNow();

  /// حذف ردیف «پذیرفته نشد» با دادهٔ محلی‌اش، فقط به خواست سرپرست (F08 ۵.۳).
  Future<Result<Unit>> discardRejected(int entryId);
}
