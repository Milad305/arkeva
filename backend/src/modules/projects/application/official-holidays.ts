import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Audit } from '../../../platform/audit/audit.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { newId } from '../../../platform/database/ids.js';
import { UnauthorizedError, ValidationFailedError } from '../../../platform/http/errors.js';
import { fromJalali, jalaliYear, toJalali } from '../../../platform/time/jalali.js';
import { OrgOfficialHoliday } from '../domain/project-settings.entity.js';
import { FIXED_OFFICIAL_HOLIDAYS, type OfficialHoliday, officialHolidaysOf } from '../domain/rules/calendar.js';

// تعطیلات رسمی (F02 ۶؛ تصمیم کاربر 1405/08/22): ثابت‌های خورشیدی همراه نرم‌افزار + افزوده‌های مدیر سازمان.

export interface OfficialHolidayView extends OfficialHoliday {
  readonly source: 'system' | 'org';
}

@Injectable()
export class OfficialHolidays {
  constructor(
    private readonly em: EntityManager,
    private readonly context: AppContext,
    private readonly audit: Audit,
  ) {}

  /** فهرست یک سال شمسی برای W28 و تقویم پروژه. */
  async forYear(year: number): Promise<OfficialHolidayView[]> {
    const orgAdded = await this.orgAdded([year]);
    const systemDates = new Set(FIXED_OFFICIAL_HOLIDAYS.map(([month, day]) => fromJalali(year, month, day)).filter((date): date is string => date !== null));
    return officialHolidaysOf(year, orgAdded).map((holiday) => ({ ...holiday, source: systemDates.has(holiday.date) ? 'system' : 'org' }));
  }

  /** همهٔ تعطیلات رسمی چند سال (پیش‌نمایش ویزارد و ساخت تقویم). */
  async forYears(years: readonly number[]): Promise<OfficialHoliday[]> {
    const orgAdded = await this.orgAdded(years);
    return years.flatMap((year) => officialHolidaysOf(year, orgAdded));
  }

  /** `POST /org/official-holidays` — مدیر سازمان تعطیلی قمری یا ناگهانی را می‌افزاید (org.settings). */
  async add(input: { readonly date: string; readonly title: string }): Promise<OfficialHolidayView> {
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError();
    const title = input.title.trim();
    if (!title) throw new ValidationFailedError([{ field: 'title', message: 'عنوان تعطیلی را بنویسید.' }]);
    const year = jalaliYear(input.date);
    if ((await this.forYear(year)).some((holiday) => holiday.date === input.date)) {
      throw new ValidationFailedError([{ field: 'date', message: 'این روز از پیش در فهرست تعطیلات رسمی هست.' }]);
    }
    await this.em.transactional((tx) => {
      const holiday = tx.create(OrgOfficialHoliday, { id: newId(), orgId: actor.orgId, date: input.date, title, createdByUserId: actor.userId });
      this.audit.record(tx, {
        action: 'org.official_holiday_added',
        entityType: 'OrgOfficialHoliday',
        entityId: holiday.id,
        after: { date: input.date, title },
      });
      return Promise.resolve();
    });
    return { date: input.date, title, source: 'org' };
  }

  private async orgAdded(years: readonly number[]): Promise<OfficialHoliday[]> {
    if (years.length === 0) return [];
    // بازهٔ میلادی سال‌ها: از ۱ فروردین اولی تا پیش از ۱ فروردین سال بعد از آخری
    const from = fromJalali(Math.min(...years), 1, 1);
    const to = fromJalali(Math.max(...years) + 1, 1, 1);
    if (!from || !to) return [];
    const rows = await this.em.find(OrgOfficialHoliday, { date: { $gte: from, $lt: to } }, { orderBy: { date: 'asc' } });
    return rows.filter((row) => years.includes(toJalali(row.date).year)).map((row) => ({ date: row.date, title: row.title }));
  }
}
