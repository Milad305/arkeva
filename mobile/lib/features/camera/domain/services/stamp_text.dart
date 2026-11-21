import 'package:projeyar_field/core/l10n/fa_num.dart';
import 'package:projeyar_field/core/time/clock.dart';
import 'package:projeyar_field/features/camera/domain/entities/photo_entities.dart';
import 'package:shamsi_date/shamsi_date.dart';

/// سطرهای مهر عکس (AC-FA-04). خالص و تست‌پذیر؛ رسم روی پیکسل در لایهٔ داده.
abstract final class StampText {
  static List<String> lines(StampInfo info) {
    final local = TehranTime.toTehran(info.takenAt);
    final f = Jalali.fromDateTime(local).formatter;
    final hms = '${_two(local.hour)}:${_two(local.minute)}:${_two(local.second)}';
    final lines = <String>[toFaDigits('${f.yyyy}/${f.mm}/${f.dd}  $hms')];
    final lat = info.lat;
    final lng = info.lng;
    if (lat != null && lng != null) {
      final acc = info.accuracyM == null ? '' : '  ±${faNum(info.accuracyM!, maxFractionDigits: 0)} متر';
      lines.add('${toFaDigits(lat.toStringAsFixed(6))}، ${toFaDigits(lng.toStringAsFixed(6))}$acc');
    } else {
      lines.add('موقعیت در دسترس نبود');
    }
    final site = info.siteName;
    final inside = switch (info.insideSite) {
      true => 'داخل کارگاه',
      false => 'خارج کارگاه',
      null => null,
    };
    final siteLine = [?site, ?inside].join(' · ');
    if (siteLine.isNotEmpty) lines.add(siteLine);
    final code = info.activityCode;
    lines.add(code == null ? info.supervisorName : '$code · ${info.supervisorName}');
    return lines;
  }

  static String _two(int v) => v.toString().padLeft(2, '0');
}
