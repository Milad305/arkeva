import { Injectable } from '@nestjs/common';
import { atRisk, ProgressReads } from '../../computation/reads.js';
import { IdentityService } from '../../identity/index.js';
import { ProjectBasicsCatalog } from '../../projects/index.js';
import { RiskReads } from '../../risks/index.js';
import { hasAmounts, type SectionKey, SECTIONS, type TemplateDef } from '../domain/catalog.js';
import { fa, jalaliDateTime } from '../domain/format.js';
import type { RangeOption } from './report-ranges.js';
import { ReportSections } from './report-sections.js';

// محتوای کامل یک گزارش (ReportPreviewDto فرانت؛ management-reports.md ۴، ۷.۱، ۷.۳) — همان برای پیش‌نمایش، PDF و Excel.

export interface ReportInput {
  readonly orgId: string;
  /** null ← سطح سازمان (پرتفوی). */
  readonly projectId: string | null;
  readonly template: TemplateDef;
  readonly range: RangeOption;
  readonly disabled: readonly SectionKey[];
  /** نسخهٔ با مبلغ؟ (D11؛ قالب کارفرما هرگز). */
  readonly amounts: boolean;
  /** پروژه‌های دیدنی برای پرتفوی. */
  readonly projectIds: readonly string[];
  readonly now: Date;
}

export type ReportContent = Awaited<ReturnType<ReportData['build']>>;

@Injectable()
export class ReportData {
  constructor(
    private readonly sections: ReportSections,
    private readonly progress: ProgressReads,
    private readonly catalog: ProjectBasicsCatalog,
    private readonly risks: RiskReads,
    private readonly identity: IdentityService,
  ) {}

  async build(input: ReportInput) {
    const { template, range } = input;
    const keys = template.sections.filter((key) => !input.disabled.includes(key));
    const amounts = template.audience !== 'client' && input.amounts;
    const sections: Record<string, unknown>[] = [];
    let header: { projectName: string; projectCode: string; clientName: string; managerName: string };
    if (input.projectId) {
      const facts = await this.sections.facts(input.projectId, range);
      for (const key of keys) sections.push(await this.sections.section(key, input.projectId, facts, range, amounts));
      const [[card], people] = await Promise.all([this.catalog.cards([input.projectId]), this.identity.personRefs([facts.rules.managerUserId])]);
      header = {
        projectName: card?.name ?? facts.rules.name,
        projectCode: card?.code ?? '',
        clientName: card?.clientName ?? '',
        managerName: people.get(facts.rules.managerUserId)?.fullName ?? '',
      };
    } else {
      const cards = (await this.catalog.cards(input.projectIds)).filter((card) => card.status === 'active');
      for (const key of keys) sections.push(await this.portfolioSection(key, cards));
      header = { projectName: 'همهٔ پروژه‌های فعال', projectCode: `${fa(cards.length)} پروژه`, clientName: '', managerName: '' };
    }
    const orgName = await this.identity.orgName(input.orgId);
    return {
      templateId: template.id,
      templateName: template.name,
      audience: template.audience,
      scope: template.scope,
      includesAmounts: hasAmounts(keys, template.audience) && amounts,
      amountsHiddenByPermission: template.audience !== 'client' && !input.amounts && hasAmounts(keys, template.audience),
      header: { orgName, ...header, rangeLabel: range.label, generatedAtLabel: jalaliDateTime(input.now) },
      sourceKind: range.closed ? ('period_snapshot' as const) : ('live' as const),
      watermark: range.closed ? ('none' as const) : ('open_period' as const),
      // AC-MR-07
      openPeriodNote: range.closed ? null : 'دورهٔ باز؛ اعداد ممکن است تغییر کنند.',
      pageCount: Math.max(1, keys.length),
      sections,
    };
  }

  private async portfolioSection(key: SectionKey, cards: readonly { id: string; code: string; name: string }[]): Promise<Record<string, unknown>> {
    const base = { key, title: SECTIONS[key].label, empty: null as string | null };
    if (key === 'portfolio') {
      const progress = await this.progress.projects(cards.map((card) => card.id));
      const rows = cards.flatMap((card) => {
        const view = progress.get(card.id);
        return view
          ? [
              {
                id: card.id,
                code: card.code,
                name: card.name,
                plannedPercent: view.plannedPercent,
                actualPercent: view.actualPercent,
                deviation: view.deviation,
                cpi: view.cpi,
                spi: view.spi,
                atRisk: atRisk(view.deviation, view.cpi),
              },
            ]
          : [];
      });
      return { ...base, rows, empty: rows.length === 0 ? 'پروژهٔ فعالی با عدد محاسبه‌شده نیست.' : null };
    }
    if (key === 'risks') {
      const risks = await this.risks.openSummaries(cards.map((card) => card.id));
      const items = [...risks]
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
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
        empty: items.length === 0 ? 'ریسک بازی نیست.' : null,
      };
    }
    return { ...base, items: [], rows: [], empty: 'این بخش در گزارش سطح سازمان نمی‌آید.' };
  }
}
