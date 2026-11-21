import 'package:projeyar_field/core/l10n/fa_num.dart';
import 'package:shamsi_date/shamsi_date.dart';
import 'package:timezone/timezone.dart' as tz;

/// منبع زمان قابل تعویض در تست.
class Clock {
  const Clock();
  DateTime now() => DateTime.now();
}

/// روز کاری به وقت تهران (C03). تاریخ کار `YYYY-MM-DD` میلادی.
abstract final class TehranTime {
  static tz.Location? _location;

  /// پس از `tz.initializeTimeZones()` در bootstrap صدا زده می‌شود.
  static void init() => _location = tz.getLocation('Asia/Tehran');

  static DateTime toTehran(DateTime instant) {
    final location = _location;
    if (location == null) return instant.toUtc().add(const Duration(hours: 3, minutes: 30));
    final t = tz.TZDateTime.from(instant, location);
    return DateTime(t.year, t.month, t.day, t.hour, t.minute, t.second);
  }

  /// تاریخ کار امروز تهران.
  static String today(DateTime instant) => isoDate(toTehran(instant));

  static String isoDate(DateTime date) =>
      '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

  static DateTime parseDate(String iso) {
    final parts = iso.split('-').map(int.parse).toList();
    return DateTime(parts[0], parts[1], parts[2]);
  }

  static String addDays(String iso, int days) => isoDate(parseDate(iso).add(Duration(days: days)));
}

const _weekdays = ['دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه', 'یکشنبه'];

/// نمایش شمسی (CLAUDE.md ۴: نمایش پیش‌فرض شمسی).
abstract final class JalaliFormat {
  static Jalali fromIso(String iso) => Jalali.fromDateTime(TehranTime.parseDate(iso));

  /// «۲۷ آبان ۱۴۰۵»
  static String date(String iso) {
    final f = fromIso(iso).formatter;
    return _fa('${f.d} ${f.mN} ${f.yyyy}');
  }

  /// «سه‌شنبه ۲۷ آبان ۱۴۰۵»
  static String longDate(String iso) {
    final weekday = TehranTime.parseDate(iso).weekday;
    return '${_weekdays[weekday - 1]} ${date(iso)}';
  }

  /// «۱۴۰۵/۰۸/۲۷»
  static String numeric(String iso) {
    final f = fromIso(iso).formatter;
    return _fa('${f.yyyy}/${f.mm}/${f.dd}');
  }

  /// لحظهٔ UTC به «۲۷ آبان، ۱۴:۰۵» تهران.
  static String moment(DateTime instant) {
    final local = TehranTime.toTehran(instant);
    final f = Jalali.fromDateTime(local).formatter;
    final hm = '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
    return _fa('${f.d} ${f.mN}، $hm');
  }

  static String _fa(String s) => toFaDigits(s);
}
