import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { toFaDigits } from '../../../platform/http/fa.js';
import { addDays } from '../../../platform/scheduler/ticks.js';
import { monthOf, periodLabel } from '../domain/formulas/periods.js';
import { PeriodSnapshot, ReportingPeriod } from '../domain/period.entities.js';

// خواندن دوره‌های گزارش برای بقیه (تنظیمات W29، approvals و cost-ledger برای «اثر منتقل‌شده»). بی وابستگی به ماژول دامنه‌ای
// دیگر تا projects، approvals و cost-ledger بی چرخه واردش کنند.

/** همان PeriodDto فرانت (W29). */
export interface PeriodView {
  readonly id: string;
  readonly label: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly status: 'open' | 'closed';
  readonly closedAt: string | null;
  readonly closedBy: string | null;
  /** AL-PER-01: بیش از ۳ روز از پایان گذشته و باز. */
  readonly overdue: boolean;
  /** فقط اولین دورهٔ باز گذشته (دوره‌ها به ترتیب بسته می‌شوند). */
  readonly closable: boolean;
}

/** فهرست تازه‌ترین بالا؛ دوره‌های آینده پس از امروز نمایش داده نمی‌شوند (همان ماک W29). */
export function periodViews(periods: readonly ReportingPeriod[], today: string, names: ReadonlyMap<string, string>): PeriodView[] {
  const ordered = [...periods].sort((a, b) => a.startDate.localeCompare(b.startDate)).filter((period) => period.startDate <= today);
  const closable = ordered.find((period) => period.status === 'open' && period.endDate < today)?.id;
  return ordered
    .map((period) => ({
      id: period.id,
      label: toFaDigits(periodLabel(monthOf(period.startDate))),
      startDate: period.startDate,
      endDate: period.endDate,
      status: period.status,
      closedAt: period.closedAt?.toISOString() ?? null,
      closedBy: period.closedByUserId ? (names.get(period.closedByUserId) ?? null) : null,
      overdue: period.status === 'open' && addDays(period.endDate, 3) < today,
      closable: period.id === closable,
    }))
    .reverse();
}

@Injectable()
export class PeriodReads {
  constructor(private readonly em: EntityManager) {}

  list(projectId: string, em: EntityManager = this.em): Promise<ReportingPeriod[]> {
    return em.find(ReportingPeriod, { projectId }, { orderBy: { startDate: 'asc' } });
  }

  /** عکس ثابت پایان دوره (F10 ۵.۸؛ گزارش دورهٔ بسته F18 ۷.۱، AC-MR-01). */
  async snapshot(projectId: string, periodId: string, em: EntityManager = this.em) {
    const row = await em.findOne(PeriodSnapshot, { projectId, periodId });
    return row ? { date: row.date, project: row.project, items: row.items } : null;
  }

  /** پایان آخرین دورهٔ بسته؛ ردیف‌های تا این تاریخ دیگر بازنویسی نمی‌شوند (۵.۷). */
  async lastClosedEnd(projectId: string, em: EntityManager = this.em): Promise<string | null> {
    const [last] = await em.find(ReportingPeriod, { projectId, status: 'closed' }, { orderBy: { endDate: 'desc' }, limit: 1, fields: ['endDate'] });
    return last?.endDate ?? null;
  }

  /** تاریخ در دورهٔ بسته است؟ — برچسب «اثر منتقل‌شده» برای تأیید و هزینهٔ دیرهنگام (AC-PC-05). */
  async inClosedPeriod(projectId: string, date: string, em: EntityManager = this.em): Promise<boolean> {
    const end = await this.lastClosedEnd(projectId, em);
    return end !== null && date <= end;
  }
}
