import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Clock } from '../../../platform/clock/clock.js';
import { tehranClock } from '../../../platform/scheduler/ticks.js';
import { evm } from '../domain/formulas/evm.js';
import { sameDayPreviousMonth } from '../domain/formulas/periods.js';
import { CbsItemProgress, type ComputeState, ProjectDailySnapshot, ProjectProgress, WbsItemProgress } from '../domain/progress.entities.js';

// خواندن جدول‌های مشتق برای بقیهٔ ماژول‌ها (01 ۶ لایهٔ ۳؛ D07 «صفحه‌ها فقط مقادیر ذخیره‌شده را می‌خوانند»). شکل‌ها همان DTO
// فرانت (ProjectProgressDto، WbsItemProgressDto، CbsItemProgressDto)؛ مبالغ رشتهٔ ریال و حذفشان با @Amounts کنترلر (D11).
// این فایل از هیچ ماژول دامنه‌ای وارد نمی‌کند تا projects، wbs و cbs بی چرخه بخوانندش.

/** کلیدهای مبلغ پیشرفت برای @Amounts. */
export const PROGRESS_AMOUNT_KEYS = ['bac', 'pv', 'ev', 'ac', 'eac', 'cv', 'sv', 'vac', 'currentBac', 'earnedValue', 'unallocatedBudget'] as const;

const pct = (value: number): number => Math.round(value * 10_000) / 10_000;
/** double precision از pg عدد می‌آید ولی نوع MikroORM رشته هم می‌پذیرد. */
const num = (value: string | number | null | undefined): number | null => (value === null || value === undefined ? null : Number(value));

export interface ProjectProgressView {
  readonly dataDate: string;
  readonly plannedPercent: number;
  readonly actualPercent: number;
  readonly financialPercent: number;
  readonly deviation: number;
  readonly bac: string;
  readonly pv: string;
  readonly ev: string;
  readonly ac: string;
  readonly eac: string;
  readonly cv: string;
  readonly sv: string;
  readonly vac: string;
  readonly cpi: number | null;
  readonly spi: number | null;
  readonly tcpi: number | null;
  readonly eacLowConfidence: boolean;
  readonly forecastFinish: string | null;
  readonly delayDays: number | null;
  readonly costIndicesDate: string | null;
  readonly computeState: ComputeState;
  readonly pendingCount: number;
  /** بودجهٔ CBS تخصیص‌نیافته به WBS (`02` ۷). */
  readonly unallocatedBudget: string;
  readonly outOfReference: { readonly count: number; readonly currentBac: string; readonly earnedValue: string } | null;
  readonly computedAt: string | null;
}

export interface WbsItemProgressView {
  readonly dataDate: string;
  readonly plannedPercent: number;
  readonly actualPercent: number;
  readonly actualQuantity: number | null;
  readonly pendingPercent: number | null;
  readonly deviation: number;
  readonly status: string;
  readonly forecastFinish: string | null;
  readonly lastApprovedAt: string | null;
  readonly bac: string;
  readonly inReference: boolean;
  /** وزن در پروژه از وزن‌های مرجع (درصد). */
  readonly weightInProject: number;
}

export interface CbsItemProgressView {
  readonly ac: string;
  readonly consumedPercent: number | null;
  readonly ev: string;
  readonly cpi: number | null;
  readonly eac: string;
  readonly eacVariancePercent: number | null;
  readonly eacLowConfidence: boolean;
  readonly consumedQuantity: number | null;
  readonly earnedQuantity: number | null;
  readonly excessQuantity: number | null;
  /** هشدارهای AL-CST-01/02 با برش هشدارها (F12). */
  readonly alertSeverity: null;
  readonly alertCodes: string[];
}

export function projectProgressView(row: ProjectProgress): ProjectProgressView | null {
  if (!row.dataDate) return null;
  return {
    dataDate: row.dataDate,
    plannedPercent: pct(row.plannedPercent),
    actualPercent: pct(row.actualPercent),
    financialPercent: pct(row.financialPercent),
    deviation: pct(row.actualPercent - row.plannedPercent),
    bac: row.bac,
    pv: row.pv,
    ev: row.ev,
    ac: row.ac,
    eac: row.eac,
    cv: row.cv,
    sv: row.sv,
    vac: row.vac,
    cpi: num(row.cpi),
    spi: num(row.spi),
    tcpi: num(row.tcpi),
    eacLowConfidence: row.eacLowConfidence,
    forecastFinish: row.forecastFinish ?? null,
    delayDays: row.delayDays ?? null,
    costIndicesDate: row.costIndicesDate ?? null,
    computeState: row.computeState,
    pendingCount: row.pendingCount,
    unallocatedBudget: row.unallocatedBudget,
    outOfReference: row.outOfReference ?? null,
    computedAt: row.computedAt?.toISOString() ?? null,
  };
}

@Injectable()
export class ProgressReads {
  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
  ) {}

  /** همان روز ماه شمسی قبل نسبت به امروز تهران (W07؛ تصمیم 1405/08/23). */
  lastMonth(): string {
    return sameDayPreviousMonth(tehranClock(this.clock.now()).date);
  }

  async projects(projectIds: readonly string[]): Promise<Map<string, ProjectProgressView>> {
    if (projectIds.length === 0) return new Map();
    const rows = await this.em.find(ProjectProgress, { projectId: { $in: [...projectIds] } });
    const result = new Map<string, ProjectProgressView>();
    for (const row of rows) {
      const view = projectProgressView(row);
      if (view) result.set(row.projectId, view);
    }
    return result;
  }

  async project(projectId: string): Promise<ProjectProgressView | null> {
    return (await this.projects([projectId])).get(projectId) ?? null;
  }

  /** وضعیت پروژه‌ها در یک روز گذشته از snapshot روزانه — مقایسه با «ماه گذشته» W07 (تصمیم 1405/08/23). */
  async snapshotsAt(projectIds: readonly string[], date: string): Promise<Map<string, { actual: number; planned: number; cpi: number | null }>> {
    if (projectIds.length === 0) return new Map();
    const rows = await this.em.find(ProjectDailySnapshot, { projectId: { $in: [...projectIds] }, date });
    return new Map(rows.map((row) => [row.projectId, { actual: Number(row.actualPercent), planned: Number(row.plannedPercent), cpi: num(row.cpi) }]));
  }

  /** EAC هر سه روش با عددهای همین پروژه برای مقایسه در W29 (evm.md ۵)؛ بی محاسبه تهی. */
  async eacByMethod(projectId: string): Promise<Record<'cpi' | 'remaining' | 'composite', string | null>> {
    const row = await this.em.findOne(ProjectProgress, { projectId });
    if (!row?.dataDate) return { cpi: null, remaining: null, composite: null };
    const atCost = row.costIndicesDate ? await this.em.findOne(ProjectDailySnapshot, { projectId, date: row.costIndicesDate }) : null;
    const input = {
      bac: BigInt(row.bac),
      pv: BigInt(row.pv),
      ev: BigInt(row.ev),
      evAtCost: BigInt(atCost?.ev ?? row.ev),
      ac: BigInt(row.ac),
      method: 'cpi' as const,
    };
    const result = evm(input);
    return { cpi: result.eac.toString(), remaining: result.eacRemaining.toString(), composite: (result.eacComposite ?? result.eac).toString() };
  }

  async items(projectId: string): Promise<Map<string, WbsItemProgressView>> {
    const rows = await this.em.find(WbsItemProgress, { projectId });
    return new Map(
      rows.map((row) => [
        row.wbsItemId,
        {
          dataDate: row.dataDate,
          plannedPercent: pct(row.plannedPercent),
          actualPercent: pct(row.actualPercent),
          actualQuantity: row.actualQuantity ?? null,
          pendingPercent: row.pendingPercent ?? null,
          deviation: pct(row.deviation),
          status: row.status,
          forecastFinish: row.forecastFinish ?? null,
          lastApprovedAt: row.lastApprovedAt?.toISOString() ?? null,
          bac: row.bac,
          inReference: row.inReference,
          weightInProject: Number(row.weightInProject),
        },
      ]),
    );
  }

  async cbsItems(
    projectId: string,
  ): Promise<{ readonly costIndicesDate: string | null; readonly computedAt: string | null; readonly items: Map<string, CbsItemProgressView> }> {
    const rows = await this.em.find(CbsItemProgress, { projectId });
    return {
      costIndicesDate: rows[0]?.costIndicesDate ?? null,
      computedAt: rows[0]?.computedAt.toISOString() ?? null,
      items: new Map(
        rows.map((row) => [
          row.cbsItemId,
          {
            ac: row.ac,
            consumedPercent: row.consumedPercent === null || row.consumedPercent === undefined ? null : pct(Number(row.consumedPercent)),
            ev: row.ev,
            cpi: num(row.cpi),
            eac: row.eac,
            eacVariancePercent: row.eacVariancePercent === null || row.eacVariancePercent === undefined ? null : pct(Number(row.eacVariancePercent)),
            eacLowConfidence: row.eacLowConfidence,
            consumedQuantity: row.consumedQuantity ?? null,
            earnedQuantity: row.earnedQuantity ?? null,
            excessQuantity: row.excessQuantity ?? null,
            alertSeverity: null,
            alertCodes: [],
          },
        ]),
      ),
    };
  }
}

/** حذف مبلغ‌های پیشرفت پروژه بی `cbs.view_amounts` (D11؛ ProjectProgressDto مبالغ اختیاری) — نسبت‌ها و درصدها می‌مانند. */
export function withoutAmounts(view: ProjectProgressView) {
  return {
    dataDate: view.dataDate,
    plannedPercent: view.plannedPercent,
    actualPercent: view.actualPercent,
    financialPercent: view.financialPercent,
    deviation: view.deviation,
    cpi: view.cpi,
    spi: view.spi,
    tcpi: view.tcpi,
    eacLowConfidence: view.eacLowConfidence,
    forecastFinish: view.forecastFinish,
    delayDays: view.delayDays,
    costIndicesDate: view.costIndicesDate,
    computeState: view.computeState,
    pendingCount: view.pendingCount,
    outOfReference: view.outOfReference ? { count: view.outOfReference.count } : null,
    computedAt: view.computedAt,
  };
}
