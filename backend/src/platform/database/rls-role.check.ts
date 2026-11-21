import { Injectable, type OnModuleInit } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/postgresql';
import { AppConfig } from '../../config/config.js';

/**
 * RLS فقط وقتی اثر دارد که اپ با نقشی وصل شود که سوپریوزر نیست، RLS را دور نمی‌زند و مالک
 * جدول‌ها نیست (docs/backend/05 ۴.۳). اگر DB_URL به چنین نقشی اشاره کند، جداسازی سازمان‌ها
 * بی‌صدا خاموش می‌شود؛ پس برنامه بالا نمی‌آید.
 */
@Injectable()
export class RlsRoleCheck implements OnModuleInit {
  constructor(
    private readonly orm: MikroORM,
    private readonly config: AppConfig,
  ) {}

  // onModuleInit، نه onApplicationBootstrap: پیش از راه‌اندازی صف و جبران تیک‌ها که خودشان پرس‌وجو می‌زنند
  async onModuleInit(): Promise<void> {
    if (this.config.env === 'test') return;
    const [role] = await this.orm.em
      .fork()
      .getConnection()
      .execute<{ name: string; rolsuper: boolean; rolbypassrls: boolean; owns_tables: boolean }[]>(
        `select r.rolname as name, r.rolsuper, r.rolbypassrls,
                exists (select 1 from pg_tables t where t.schemaname = 'public' and t.tableowner = r.rolname) as owns_tables
           from pg_roles r where r.rolname = current_user`,
      );
    if (!role) return;
    if (role.rolsuper || role.rolbypassrls || role.owns_tables) {
      throw new Error(
        `DB_URL با نقش ${role.name} وصل شده که ${role.rolsuper ? 'سوپریوزر است' : role.rolbypassrls ? 'RLS را دور می‌زند' : 'مالک جدول‌هاست'}؛ ` +
          'جداسازی سازمان‌ها (RLS) اثر نمی‌کرد. DB_URL را به نقش اپ (مثلاً projeyar_app) بدهید و db:bootstrap را اجرا کنید.',
      );
    }
  }
}
