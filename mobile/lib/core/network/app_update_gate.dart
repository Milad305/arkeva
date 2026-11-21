import 'dart:async';

/// وضعیت «به‌روزرسانی اجباری» (F08 ۵.۳): `AppVersionInterceptor` با پاسخ ۴۲۶ آن را بالا می‌برد و مسیریاب به صفحهٔ
/// به‌روزرسانی می‌رود. صف و دادهٔ محلی دست نمی‌خورند. «بررسی دوباره» آن را پایین می‌آورد؛ اگر نسخه هنوز کم باشد، درخواست بعدی دوباره بالا می‌برد.
class AppUpdateGate {
  final _changes = StreamController<void>.broadcast();

  bool _required = false;
  String? _minVersion;
  String? _message;

  bool get required => _required;
  String? get minVersion => _minVersion;
  String? get message => _message;
  Stream<void> get changes => _changes.stream;

  void require({String? minVersion, String? message}) {
    final changed = !_required || minVersion != _minVersion;
    _required = true;
    _minVersion = minVersion ?? _minVersion;
    _message = message ?? _message;
    if (changed) _changes.add(null);
  }

  void clear() {
    if (!_required) return;
    _required = false;
    _changes.add(null);
  }
}
