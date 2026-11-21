/// کد دعوت اپ (OD-20؛ همان قاعدهٔ بک‌اند `normalizeInviteCode`): ۸ نویسه از الفبای Crockford Base32. QR `projeyar:invite:<کد>`؛
/// فاصله و خط تیره نادیده؛ بزرگ‌حرف؛ I و L ← 1، O ← 0.
abstract final class InviteCode {
  static const length = 8;
  static const _alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  static final _prefix = RegExp('^projeyar:invite:', caseSensitive: false);

  static String? normalize(String raw) {
    final code = raw
        .trim()
        .replaceFirst(_prefix, '')
        .replaceAll(RegExp(r'[\s-]'), '')
        .toUpperCase()
        .replaceAll(RegExp('[IL]'), '1')
        .replaceAll('O', '0');
    if (code.length != length) return null;
    return code.split('').every(_alphabet.contains) ? code : null;
  }
}
