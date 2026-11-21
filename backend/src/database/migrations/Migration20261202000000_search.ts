import { Migration } from '@mikro-orm/migrations';
import { APP_DB_ROLE } from '../system-ids.js';

// برش ۱۵ — جستجوی سراسری (F20 ۹؛ W43). `search_norm` همتای `platform/search/normalize.ts`: ی/ک عربی، ارقام فارسی و عربی،
// نیم‌فاصله و اعراب، فاصله و حروف کوچک. immutable تا بعداً نمایهٔ عبارتی (pg_trgm) روی آن ساخته شود `[پیش‌فرض فنی]`.

export class Migration20261202000000_search extends Migration {
  override name = 'Migration20261202000000_search';

  override up(): void {
    this.addSql(`
create function search_norm(value text) returns text
  language sql immutable parallel safe as $$
  select lower(btrim(regexp_replace(
    regexp_replace(
      translate(coalesce(value, ''), 'يىك۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩' || chr(8204) || chr(8205) || chr(8206) || chr(8207), 'ییک01234567890123456789'),
      '[' || chr(1611) || '-' || chr(1631) || chr(1648) || ']', '', 'g'),
    '\\s+', ' ', 'g')))
$$;
grant execute on function search_norm(text) to ${APP_DB_ROLE};`);
  }

  override down(): void {
    this.addSql(`drop function if exists search_norm(text);`);
  }
}
