import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { AlertReads } from '../../alerts/reads.js';
import { cbsLeafBudget } from '../../computation/index.js';
import { OverviewFigures, type OverviewFiguresView } from '../../computation/figures.js';
import { PeriodReads, ProgressReads, type WbsItemProgressView } from '../../computation/reads.js';
import { CostEntries } from '../../cost-ledger/index.js';
import { FieldRecords } from '../../field/index.js';
import { IdentityService } from '../../identity/index.js';
import { ProgressExport } from '../../msp/index.js';
import { type CurrentContent, PlanningService } from '../../planning/index.js';
import { ProjectRules, type ProjectRulesView } from '../../projects/index.js';
import { RiskReads } from '../../risks/index.js';
import { type SectionKey, SECTIONS } from '../domain/catalog.js';
import { fa, jalali, pct, ratio } from '../domain/format.js';
import type { RangeOption } from './report-ranges.js';
import { blankSection, costSection, milestonesSection } from './section-shapes.js';

// بخش‌های گزارش یک پروژه (management-reports.md ۴): فقط مقادیر ذخیره‌شده و بی فرمول؛ متن از قالب ثابت. بازهٔ دورهٔ بسته از
// PeriodSnapshot (AC-MR-01). مستقل از درخواست (بی AppContext) تا کار صف هم بسازد؛ مبلغ با `amounts` ورودی (D11).

type Tone = 'ok' | 'wrn' | 'err' | 'neu' | 'inf';
const toneOf = (deviation: number): Tone => (deviation <= -15 ? 'err' : deviation < 0 ? 'wrn' : 'ok');
const num = (value: unknown) => (value === null || value === undefined ? null : Number(value));
const amount = (value: unknown) => (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint' ? String(value) : '0');

export interface ProjectFacts {
  readonly rules: ProjectRulesView;
  readonly figures: OverviewFiguresView | null;
  readonly items: Map<string, WbsItemProgressView>;
  readonly content: CurrentContent;
  /** عکس دورهٔ بسته؛ null ← live. */
  readonly snapshot: { readonly date: string; readonly project: Record<string, unknown>; readonly items: Record<string, unknown>[] } | null;
}

@Injectable()
export class ReportSections {
  constructor(
    private readonly em: EntityManager,
    private readonly rules: ProjectRules,
    private readonly figures: OverviewFigures,
    private readonly progress: ProgressReads,
    private readonly periods: PeriodReads,
    private readonly planning: PlanningService,
    private readonly risks: RiskReads,
    private readonly alerts: AlertReads,
    private readonly field: FieldRecords,
    private readonly costs: CostEntries,
    private readonly msp: ProgressExport,
    private readonly identity: IdentityService,
  ) {}

  async facts(projectId: string, range: RangeOption): Promise<ProjectFacts> {
    const rules = await this.rules.of(projectId);
    const [figures, items, content, snapshot] = await Promise.all([
      rules.status === 'draft' ? Promise.resolve(null) : this.figures.of(projectId),
      this.progress.items(projectId),
      this.planning.currentContent(projectId),
      range.closed && range.periodId ? this.periods.snapshot(projectId, range.periodId) : Promise.resolve(null),
    ]);
    return { rules, figures, items, content, snapshot };
  }

  /** عددهای پروژه از عکس دوره یا جاری. */
  private numbers(facts: ProjectFacts) {
    if (facts.snapshot) {
      const p = facts.snapshot.project;
      return {
        planned: num(p['plannedPercent']) ?? 0,
        actual: num(p['actualPercent']) ?? 0,
        bac: amount(p['bac']),
        ac: amount(p['ac']),
        ev: amount(p['ev']),
        eac: amount(p['eac']),
        cpi: num(p['cpi']),
        spi: num(p['spi']),
        tcpi: null as number | null,
      };
    }
    const view = facts.figures?.progress;
    return {
      planned: view?.plannedPercent ?? 0,
      actual: view?.actualPercent ?? 0,
      bac: view?.bac ?? '0',
      ac: view?.ac ?? '0',
      ev: view?.ev ?? '0',
      eac: view?.eac ?? '0',
      cpi: view?.cpi ?? null,
      spi: view?.spi ?? null,
      tcpi: view?.tcpi ?? null,
    };
  }

  /** انحراف برگ‌ها از عکس دوره یا جاری؛ بدترین اول. */
  private deviations(facts: ProjectFacts) {
    const byId = new Map(facts.content.wbs.map((node) => [node.id, node]));
    const rows = facts.snapshot
      ? facts.snapshot.items.map((item) => ({ id: String(item['wbsItemId']), deviation: num(item['deviation']) ?? 0 }))
      : [...facts.items].map(([id, view]) => ({ id, deviation: view.deviation }));
    return rows
      .flatMap((row) => {
        const node = byId.get(row.id);
        return node?.isLeaf && row.deviation < 0 ? [{ code: node.code, title: node.title, deviation: row.deviation }] : [];
      })
      .sort((a, b) => a.deviation - b.deviation);
  }

  async section(key: SectionKey, projectId: string, facts: ProjectFacts, range: RangeOption, amounts: boolean): Promise<Record<string, unknown>> {
    const base = { key, title: SECTIONS[key].label, empty: null as string | null };
    if (!facts.figures && !facts.snapshot && ['summary', 'progress', 'cost', 'cost_ledger', 'milestones'].includes(key)) {
      return { ...base, ...blankSection(key), empty: 'پروژهٔ پیش‌نویس هنوز عددی ندارد؛ پس از فعال‌سازی محاسبه می‌شود.' };
    }
    if ((key === 'cost' || key === 'cost_ledger') && !amounts) {
      return { ...base, ...blankSection(key), empty: 'این نسخه بدون مبلغ است (قالب کارفرما یا نبود دسترسی مشاهدهٔ مبالغ).' };
    }
    const values = this.numbers(facts);
    switch (key) {
      case 'summary': {
        const [alerts, risks] = await Promise.all([this.alerts.open([projectId]), this.risks.openSummaries([projectId])]);
        const deviation = values.actual - values.planned;
        const delay = facts.snapshot ? null : (facts.figures?.cards.time.delayWorkingDays ?? null);
        const worst = this.deviations(facts)[0];
        const critical = risks.filter((risk) => risk.level === 'critical').length;
        const text =
          `پیشرفت واقعی ${pct(values.actual)} در برابر برنامهٔ ${pct(values.planned)} است؛ انحراف ${pct(deviation)}. ` +
          (facts.snapshot
            ? `اعداد از عکس ثابت پایان دوره (${jalali(facts.snapshot.date)}) است. `
            : delay === null
              ? 'پیش‌بینی پایان هنوز محاسبه نشده است. '
              : delay > 0
                ? `پیش‌بینی پایان ${fa(delay)} روز کاری دیرتر از برنامه است. `
                : 'پیش‌بینی پایان در برنامه یا جلوتر است. ') +
          (worst ? `بیشترین انحراف در «${worst.title}» است. ` : 'آیتم دارای انحراف ثبت نشده است. ') +
          `${fa(alerts.length)} هشدار باز است.`;
        return {
          ...base,
          kpis: [
            { label: 'پیشرفت واقعی', value: pct(values.actual), sub: `برنامه ${pct(values.planned)}`, tone: toneOf(deviation) },
            { label: 'CPI', value: ratio(values.cpi), sub: 'هزینه', tone: (values.cpi ?? 1) < 0.95 ? 'wrn' : 'ok' },
            { label: 'SPI', value: ratio(values.spi), sub: 'زمان', tone: (values.spi ?? 1) < 0.95 ? 'wrn' : 'ok' },
            { label: 'ریسک باز', value: fa(risks.length), sub: `${fa(critical)} بحرانی`, tone: critical > 0 ? 'err' : 'neu' },
          ],
          text,
        };
      }
      case 'progress': {
        const end = facts.snapshot?.date ?? range.to;
        const curve = (facts.figures?.sCurve ?? []).map((point) => ({ planned: point.planned, actual: point.date <= end ? point.actual : null }));
        const todayIndex = Math.max(0, curve.map((point) => point.actual !== null).lastIndexOf(true));
        return {
          ...base,
          curve,
          todayIndex,
          plannedPercent: values.planned,
          actualPercent: values.actual,
          deviations: this.deviations(facts).slice(0, 10),
          empty: curve.length === 0 ? 'داده‌ای در این بازه نیست.' : null,
        };
      }
      case 'cost':
        return { ...base, ...costSection(facts.content.cbs, values) };
      case 'cost_ledger':
        return { ...base, ...(await this.ledger(projectId, facts, range)) };
      case 'risks': {
        const risks = await this.risks.openSummaries([projectId]);
        const items = [...risks]
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.code.localeCompare(b.code))
          .slice(0, 8)
          .map((risk) => ({
            code: risk.code,
            title: risk.title,
            score: risk.score,
            tone: risk.level === 'critical' ? 'err' : risk.level === 'high' ? 'wrn' : 'neu',
          }));
        return {
          ...base,
          items,
          openCount: risks.length,
          criticalCount: risks.filter((risk) => risk.level === 'critical').length,
          empty: items.length === 0 ? 'این پروژه ریسک بازی ندارد.' : null,
        };
      }
      case 'resources':
      case 'field':
      case 'photos':
        return { ...base, ...(await this.fieldSection(key, projectId, facts, range)) };
      case 'milestones':
        return { ...base, ...milestonesSection(facts) };
      case 'integration': {
        const status = await this.msp.status(projectId);
        const pending = status.pending ? status.pending.progress + status.pending.proposals : 0;
        return {
          ...base,
          rows: [
            { label: 'اتصال Microsoft Project', value: status.linked ? 'متصل' : 'متصل نیست', tone: status.linked ? 'ok' : 'neu' },
            { label: 'آخرین همگام‌سازی', value: status.lastSyncAt ? jalali(status.lastSyncAt.slice(0, 10)) : '—', tone: 'neu' },
            { label: 'منتظر ارسال به MSP', value: status.linked ? fa(pending) : '—', tone: pending > 0 ? 'wrn' : 'neu' },
            { label: 'اتصال حسابداری', value: 'در فاز بعد', tone: 'neu' },
          ],
        };
      }
      case 'portfolio':
        return { ...base, rows: [], empty: 'این بخش فقط در گزارش سطح سازمان می‌آید.' };
    }
  }

  /** هزینهٔ قطعی بازه به تفکیک قلم CBS (۴: «ردیف‌های هزینهٔ بازه»). */
  private async ledger(projectId: string, facts: ProjectFacts, range: RangeOption) {
    const [posted, cbs] = await Promise.all([this.costs.postedFacts(projectId), this.progress.cbsItems(projectId)]);
    const inRange = new Map<string, bigint>();
    for (const row of posted)
      if (row.costDate >= range.from && row.costDate <= range.to) inRange.set(row.cbsItemId, (inRange.get(row.cbsItemId) ?? 0n) + row.amount);
    const rows = facts.content.cbs
      .filter((node) => node.isLeaf && inRange.has(node.id))
      .map((node) => ({
        code: node.code,
        title: node.title,
        type: node.costType,
        budget: cbsLeafBudget(node).toString(),
        ac: (inRange.get(node.id) ?? 0n).toString(),
        consumedPercent: cbs.items.get(node.id)?.consumedPercent ?? 0,
      }))
      .sort((a, b) => (BigInt(b.ac) > BigInt(a.ac) ? 1 : -1));
    const total = [...inRange.values()].reduce((sum, value) => sum + value, 0n);
    return { rows, total: total.toString(), empty: rows.length === 0 ? 'در این بازه ردیف هزینه‌ای ثبت نشده است.' : null };
  }

  /** گزارش‌های کارگاه بازه (تاریخ کار)؛ عکس فقط از آیتم تأییدشده و حداکثر ۱۲ (AC-MR-09). */
  private async fieldSection(key: 'resources' | 'field' | 'photos', projectId: string, facts: ProjectFacts, range: RangeOption) {
    const reports = (await this.field.reports(this.em, { projectIds: [projectId] })).filter(
      (report) => report.workDate >= range.from && report.workDate <= range.to,
    );
    const items = await this.field.items(this.em, { projectId, reportIds: reports.map((report) => report.id) });
    if (key === 'field') {
      const approved = items.filter((item) => item.status === 'approved').length;
      const returned = items.filter((item) => item.status === 'needs_revision' || item.status === 'rejected').length;
      const pending = items.filter((item) => ['submitted', 'stage1', 'stage2', 'needs_resolution'].includes(item.status)).length;
      return {
        submitted: reports.length,
        approved,
        returned,
        pending,
        text: `${fa(reports.length)} گزارش ثبت شد؛ ${fa(approved)} تأیید، ${fa(returned)} برگشت برای اصلاح و ${fa(pending)} در انتظار.`,
        empty: reports.length === 0 ? 'در این بازه گزارشی ثبت نشده است.' : null,
      };
    }
    if (key === 'photos') {
      const approved = new Map(items.filter((item) => item.status === 'approved').map((item) => [item.id, item]));
      const byLeaf = new Map(facts.content.wbs.map((node) => [node.id, node]));
      const workDate = new Map(reports.map((report) => [report.id, report.workDate]));
      const photos = (
        await this.field.photos(
          this.em,
          reports.map((report) => report.id),
        )
      )
        .filter((photo) => photo.uploadStatus === 'complete' && photo.itemId && approved.has(photo.itemId))
        .slice(0, 12)
        .map((photo) => {
          const item = approved.get(photo.itemId as string);
          const leaf = item ? byLeaf.get(item.wbsItemId) : undefined;
          return {
            code: leaf?.code ?? '',
            title: leaf?.title ?? '',
            takenAt: workDate.get(photo.reportId) ?? photo.takenAt.toISOString().slice(0, 10),
            storageKey: photo.thumbLargeKey ?? photo.storageKey,
          };
        });
      return { items: photos, empty: photos.length === 0 ? 'آیتم تأییدشده‌ای با عکس در این بازه نیست.' : null };
    }
    const supervisors = new Map<string, Set<string>>();
    for (const report of reports) supervisors.set(report.authorUserId, (supervisors.get(report.authorUserId) ?? new Set()).add(report.workDate));
    const people = await this.identity.personRefs([...supervisors.keys()]);
    const days = Math.max(1, (Date.parse(range.to) - Date.parse(range.from)) / 86_400_000 + 1);
    const approvedItems = items.filter((item) => item.approvedAt);
    const received = new Map(reports.map((report) => [report.id, report.serverReceivedAt.getTime()]));
    const hours = approvedItems.map((item) => ((item.approvedAt as Date).getTime() - (received.get(item.reportId) ?? 0)) / 3_600_000);
    const coverage = (dates: Set<string>) => Math.round((dates.size / days) * 1000) / 10;
    return {
      reportCount: reports.length,
      coveragePercent:
        supervisors.size === 0 ? 0 : Math.round(([...supervisors.values()].reduce((sum, dates) => sum + coverage(dates), 0) / supervisors.size) * 10) / 10,
      avgApprovalHours: hours.length === 0 ? 0 : Math.round((hours.reduce((sum, value) => sum + value, 0) / hours.length) * 10) / 10,
      supervisors: [...supervisors].map(([userId, dates]) => ({
        name: people.get(userId)?.fullName ?? '',
        reports: dates.size,
        coveragePercent: coverage(dates),
      })),
      empty: reports.length === 0 ? 'در این بازه گزارشی ثبت نشده است.' : null,
    };
  }
}
