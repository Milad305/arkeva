import 'package:projeyar_field/core/device/location.dart';
import 'package:projeyar_field/core/result/result.dart';
import 'package:projeyar_field/features/reports/domain/entities/report_entities.dart';

/// گزارش‌های گوشی (پیش‌نویس و صف) و آیتم‌های سرور. نوشتن اول در پایگاه دادهٔ محلی و صف، بعد بیدار کردن ارسال (rules ۵).
abstract interface class ReportsRepository {
  /// پیش‌نویس باز همین پروژه، یا پیش‌نویس تازه با تاریخ کار `workDate`.
  Future<Result<ReportDraft>> openDraft({required String projectId, required String workDate});

  Stream<ReportDraft?> watchReport(String reportId);

  Future<ReportDraft?> report(String reportId);

  Future<Result<Unit>> updateHeader(String reportId, {required String workDate, Weather? weather, int? temperatureC, String? note});

  /// آیتم همین فعالیت در پیش‌نویس؛ اگر نیست، آیتم خالی با UUID تازه می‌سازد تا عکس‌ها به آن بچسبند.
  Future<Result<DraftItem>> ensureItem(String reportId, String activityId);

  Future<Result<Unit>> saveItem(String reportId, DraftItem item);

  /// حذف آیتم و عکس‌هایش از پیش‌نویس.
  Future<Result<Unit>> removeItem(String reportId, String itemId);

  /// ذخیره در صف ارسال (M08). `attestedAt` تعهد سرپرست است.
  Future<Result<Unit>> submit(String reportId, {required DateTime attestedAt, GeoFix? gps});

  Future<Result<Unit>> discardDraft(String reportId);

  /// گزارش‌های گوشی که هنوز به سرور نرسیده‌اند یا رد شده‌اند (M10 «در گوشی»).
  Stream<List<ReportDraft>> watchLocalReports();

  Stream<List<ServerItem>> watchServerItems();

  Stream<ServerItem?> watchServerItem(String itemId);

  /// «گزارش امروز ثبت شد» (M03؛ F08 ۴.۴): دست‌کم یک گزارش با این تاریخ کار، در گوشی یا سرور.
  Stream<bool> watchHasReportOn(String workDate);

  /// ارسال دوباره پس از اصلاح (M11) به صف.
  Future<Result<Unit>> resubmit(ResubmissionInput input);

  /// شناسهٔ آیتم‌هایی که اصلاحشان در صف است.
  Stream<Set<String>> watchQueuedResubmissions();
}
