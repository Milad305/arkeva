import { Injectable } from '@nestjs/common';
import { Clock } from '../../../platform/clock/clock.js';
import { addDays, tehranClock } from '../../../platform/scheduler/ticks.js';
import { weekdayIndex } from '../../../platform/time/jalali.js';
import { PeriodReads, periodViews } from '../../computation/reads.js';
import { DomainError } from '../../../platform/http/errors.js';
import { fa, jalali } from '../domain/format.js';
import { jalaliMonthSpan, previousJalaliMonth } from '../domain/schedule-time.js';

// بازه‌های آماده (management-reports.md ۷.۱؛ `[پیش‌فرض فنی]` 1405/08/20): «هفتهٔ گذشته» شنبه تا جمعه و شش دورهٔ گزارش اخیر
// پروژه. دورهٔ بسته ← منبع `period_snapshot`؛ بقیه `live` با واترمارک دورهٔ باز.

export interface RangeOption {
  readonly id: string;
  readonly kind: 'last_week' | 'period' | 'day' | 'month';
  readonly label: string;
  readonly from: string;
  readonly to: string;
  readonly closed: boolean;
  readonly periodId: string | null;
}

@Injectable()
export class ReportRanges {
  constructor(
    private readonly clock: Clock,
    private readonly periods: PeriodReads,
  ) {}

  async list(projectId: string | null): Promise<RangeOption[]> {
    const today = tehranClock(this.clock.now()).date;
    // weekdayIndex: شنبه = ۰
    const thisSaturday = addDays(today, -weekdayIndex(today));
    const from = addDays(thisSaturday, -7);
    const to = addDays(from, 6);
    const options: RangeOption[] = [
      { id: 'last_week', kind: 'last_week', label: `هفتهٔ ${jalali(from)} تا ${jalali(to)}`, from, to, closed: false, periodId: null },
    ];
    if (!projectId) return options;
    const views = periodViews(await this.periods.list(projectId), today, new Map()).slice(0, 6);
    for (const period of views) {
      options.push({
        id: `period:${period.id}`,
        kind: 'period',
        label: `${period.label}${period.status === 'closed' ? '' : ' (دورهٔ باز)'}`,
        from: period.startDate,
        to: period.endDate,
        closed: period.status === 'closed',
        periodId: period.id,
      });
    }
    return options;
  }

  async resolve(projectId: string | null, rangeId: string): Promise<RangeOption> {
    // بازه‌های اجرای زمان‌بندی: روز (روزانه) و ماه شمسی (ماهانهٔ سطح سازمان)
    const day = /^day:(\d{4}-\d{2}-\d{2})$/.exec(rangeId)?.[1];
    if (day) return { id: rangeId, kind: 'day', label: `روز ${jalali(day)}`, from: day, to: day, closed: false, periodId: null };
    const month = jalaliMonthSpan(rangeId);
    if (month) return { id: rangeId, kind: 'month', label: `ماه ${fa(rangeId.slice(6).replace('-', '/'))}`, ...month, closed: false, periodId: null };
    const found = (await this.list(projectId)).find((option) => option.id === rangeId);
    if (!found) throw new DomainError('REPORT_INVALID', 422, { reason: 'این بازه برای این پروژه نیست. فهرست بازه‌ها را تازه کنید.' });
    return found;
  }

  /**
   * بازهٔ یک اجرای زمان‌بندی (۷.۱): روزانه روز قبل (تصمیم کاربر 1405/08/26)، هفتگی هفتهٔ قبل، ماهانه آخرین دورهٔ تمام‌شدهٔ پروژه
   * (سطح سازمان: ماه شمسی قبل)، با بستن دوره همان دوره.
   */
  async forRun(frequency: 'daily' | 'weekly' | 'monthly' | 'on_period_close', projectId: string | null, periodId: string | null = null): Promise<RangeOption> {
    const today = tehranClock(this.clock.now()).date;
    if (periodId) return this.resolve(projectId, `period:${periodId}`);
    if (frequency === 'daily') return this.resolve(projectId, `day:${addDays(today, -1)}`);
    if (frequency === 'weekly') return this.resolve(projectId, 'last_week');
    const ended = (await this.list(projectId)).find((option) => option.kind === 'period' && option.to < today);
    if (ended) return ended;
    return this.resolve(projectId, previousJalaliMonth(today));
  }
}
