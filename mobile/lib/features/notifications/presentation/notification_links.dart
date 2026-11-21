/// نگاشت `link` اعلان فقط به مسیرهای داخلی شناخته‌شده (rules ۸.۱۱). هر چیز دیگر ← null (باز نمی‌شود).
abstract final class NotificationLinks {
  static final _uuid = RegExp('[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}');

  static String? route(String? link, {required String Function(String itemId) revision, required String reports}) {
    if (link == null || link.isEmpty) return null;
    final uri = Uri.tryParse(link);
    // فقط مسیر نسبی؛ هیچ نشانی بیرونی
    if (uri == null || uri.hasScheme || uri.hasAuthority) return null;
    final path = uri.path;
    final id = _uuid.firstMatch(path)?.group(0);
    if (path.contains('revision') && id != null) return revision(id);
    if (path.contains('report') || path.contains('field')) return reports;
    return null;
  }
}
