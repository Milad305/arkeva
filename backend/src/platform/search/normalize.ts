// نرمال‌سازی جستجو (platform.md ۹): یکسان‌سازی «ی/ي/ى» و «ک/ك»، ارقام فارسی و عربی به لاتین، برداشتن نیم‌فاصله و اعراب،
// یک فاصله و حروف کوچک. همتای SQL آن تابع `search_norm` در Migration20261202000000_search است و هر دو یک خروجی دارند.

const ARABIC_YE = /[يى]/g;
const ARABIC_KAF = /ك/g;
const INVISIBLE = /‌|‍|‎|‏/g;
const DIACRITICS = /[ً-ٰٟ]/g;

export function normalizeSearch(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(ARABIC_YE, 'ی')
    .replace(ARABIC_KAF, 'ک')
    .replace(INVISIBLE, '')
    .replace(DIACRITICS, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** الگوی LIKE امن برای متن نرمال‌شده. */
export const likePattern = (normalized: string): string => `%${normalized.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
