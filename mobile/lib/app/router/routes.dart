/// مسیرها با کد صفحهٔ بوم (CLAUDE.md ۵؛ design/code-mapping.md).
abstract final class Routes {
  static const splash = '/';
  static const login = '/login'; // M01
  static const otp = '/login/otp'; // M02
  static const invite = '/login/invite'; // M01 ورود با کد دعوت (OD-20)
  static const inviteScan = '/login/invite/scan'; // M01 اسکن QR دعوت
  static const today = '/today'; // M03
  static const activities = '/activities'; // M04
  static const activity = '/activities/:id'; // M05
  static const reportForm = '/report/item'; // M06 با ?project=&activity=
  static const camera = '/camera'; // M07
  static const reportReview = '/report/:reportId/review'; // M08
  static const queue = '/queue'; // M09
  static const reports = '/reports'; // M10
  static const revision = '/revision/:itemId'; // M11
  static const notifications = '/notifications'; // M12
  static const issueNew = '/issue/new'; // M13
  static const issues = '/issues'; // M13 فهرست
  static const profile = '/profile'; // M14
  static const updateRequired = '/update-required'; // به‌روزرسانی اجباری (F08 ۵.۳)

  static String activityOf(String id) => '/activities/$id';
  static String revisionOf(String itemId) => '/revision/$itemId';

  /// M06 برای یک فعالیت: پیش‌نویس باز همان پروژه یا پیش‌نویس تازه.
  static String reportFormFor({required String projectId, required String activityId}) =>
      '$reportForm?project=$projectId&activity=$activityId';

  static String reviewOf(String reportId) => '/report/$reportId/review';
  static String issueNewFor({String? activityId}) => activityId == null ? issueNew : '$issueNew?activity=$activityId';
}
