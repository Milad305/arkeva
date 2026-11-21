/// نوع اتصال فعلی؛ «فقط Wi‑Fi» عکس‌ها را روی `mobile` نگه می‌دارد (F08 ۵.۲).
enum NetworkKind {
  none,
  wifi,
  mobile;

  bool get isOnline => this != none;
}

/// وضعیت شبکهٔ گوشی. پیاده‌سازی در `connectivity_network_info.dart`؛ این رابط خالص است تا domain و تست به پلاگین وابسته نباشند.
abstract interface class NetworkInfo {
  Future<NetworkKind> current();

  Stream<NetworkKind> get changes;
}
