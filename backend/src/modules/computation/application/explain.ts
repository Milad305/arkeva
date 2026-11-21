import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { AppContext } from '../../../platform/context/app-context.js';
import { DomainError, NotFoundError, UnauthorizedError } from '../../../platform/http/errors.js';
import { type CbsNode, PlanningService } from '../../planning/index.js';
import { ProjectRules } from '../../projects/index.js';
import { CbsItemProgress, ProjectDailySnapshot, ProjectProgress, WbsItemDailySnapshot, WbsItemProgress } from '../domain/progress.entities.js';
import { budgetOf, type Body, cbsItemBody, share, type Source, top } from './explain-cbs.js';
import { AMOUNT_METRICS, amountText, costNote, DEFINITIONS, type ExplainMetric, jalali, million, num, pct, ratio, sumFormula } from './explain-format.js';

// «این عدد از کجا آمد؟» (G9؛ charts.md ۴؛ F10 ۹): `GET /projects/:pid/progress/explain?metric=&itemId=&date=`. فقط از جدول‌های
// مشتق و snapshot می‌خواند (D07) و فرمول را با عدد جای‌گذاری می‌کند؛ بی `cbs.view_amounts` بی مبلغ (D11). تاریخ گذشته فقط برای
// عددهای پیشرفت و ارزش از snapshot روزانه.

const HISTORICAL: ReadonlySet<ExplainMetric> = new Set(['actual_percent', 'planned_percent', 'deviation', 'pv', 'ev', 'spi']);
const unavailable = (reason: string) => new DomainError('METRIC_NOT_AVAILABLE', 422, { reason });

interface Row {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly parentId: string | null;
  readonly isLeaf: boolean;
  readonly weight: number;
  readonly planned: number;
  readonly actual: number;
  readonly bac: string;
  readonly pv: string;
  readonly ev: string;
  readonly forecastFinish: string | null;
}

@Injectable()
export class ExplainMetrics {
  constructor(
    private readonly em: EntityManager,
    private readonly context: AppContext,
    private readonly planning: PlanningService,
    private readonly rules: ProjectRules,
  ) {}

  async explain(projectId: string, query: { readonly metric: ExplainMetric; readonly itemId?: string; readonly date?: string }) {
    const access = this.context.access;
    if (!access) throw new UnauthorizedError();
    const amounts = access.isOrgAdmin || (access.projects.get(projectId)?.has('cbs.view_amounts') ?? false);
    const rules = await this.rules.of(projectId);
    const project = await this.em.findOne(ProjectProgress, { projectId });
    if (!project?.dataDate) throw unavailable('این پروژه هنوز عددی ندارد؛ پس از فعال‌سازی و اولین محاسبه دوباره امتحان کنید.');
    const date = query.date && query.date !== project.dataDate ? query.date : project.dataDate;
    if (date !== project.dataDate && !HISTORICAL.has(query.metric)) throw unavailable('برای این عدد فقط تاریخ داده‌ی جاری در دسترس است.');

    const [content, versions] = await Promise.all([this.planning.currentContent(projectId), this.planning.appliedVersions(projectId)]);
    const rows = await this.rows(projectId, date, date !== project.dataDate, content.wbs);
    const base = { metric: query.metric, ...DEFINITIONS[query.metric], dataDate: date, computedAt: project.computedAt?.toISOString() ?? null };
    const reference = versions.find((version) => version.id === rules.progress.pvReferenceVersionId);
    const referenceVersion = reference
      ? {
          id: reference.id,
          kind: reference.kind,
          number: reference.number ?? 0,
          source: reference.source,
          appliedAt: reference.appliedAt?.toISOString() ?? null,
        }
      : null;

    const cbsItem = query.itemId && !rows.has(query.itemId) ? await this.em.findOne(CbsItemProgress, { projectId, cbsItemId: query.itemId }) : null;
    if (query.itemId && !rows.has(query.itemId) && !cbsItem) throw new NotFoundError('NOT_FOUND');
    let body: Body;
    if (cbsItem) {
      const node = content.cbs.find((entry) => entry.id === cbsItem.cbsItemId);
      body = cbsItemBody(query.metric, cbsItem, node ? `${node.code} ${node.title}` : '', amounts, budgetOf(content.cbs, cbsItem.cbsItemId));
    } else {
      body = await this.wbs(query.metric, query.itemId ?? null, rows, project, {
        amounts,
        date,
        eacMethod: rules.progress.eacMethod,
        projectId,
        cbs: content.cbs,
      });
    }
    if (!amounts && AMOUNT_METRICS.has(query.metric)) body = { ...body, valueText: '—', sources: [] };
    return { ...base, ...body, referenceVersion };
  }

  /** ردیف هر آیتم (جاری یا snapshot روز) با کد، عنوان و وزن در والد از WBS جاری. */
  private async rows(
    projectId: string,
    date: string,
    historical: boolean,
    wbs: readonly { id: string; code: string; title: string; parentId: string | null; isLeaf: boolean; weightInParent: string }[],
  ) {
    const byId = new Map(wbs.map((node) => [node.id, node]));
    const values = historical
      ? (await this.em.find(WbsItemDailySnapshot, { projectId, date })).map((row) => ({ ...row, forecastFinish: null }))
      : await this.em.find(WbsItemProgress, { projectId });
    const result = new Map<string, Row>();
    for (const value of values) {
      const node = byId.get(value.wbsItemId);
      if (!node || !value.inReference) continue;
      result.set(node.id, {
        id: node.id,
        code: node.code,
        title: node.title,
        parentId: node.parentId,
        isLeaf: node.isLeaf,
        weight: Number(node.weightInParent),
        planned: Number(value.plannedPercent),
        actual: Number(value.actualPercent),
        bac: value.bac,
        pv: value.pv,
        ev: value.ev,
        forecastFinish: value.forecastFinish ?? null,
      });
    }
    return result;
  }

  private async wbs(
    metric: ExplainMetric,
    itemId: string | null,
    rows: ReadonlyMap<string, Row>,
    project: ProjectProgress,
    ctx: { amounts: boolean; date: string; eacMethod: string; projectId: string; cbs: readonly CbsNode[] },
  ): Promise<Body> {
    const item = itemId ? rows.get(itemId) : undefined;
    const historical = ctx.date !== project.dataDate;
    const snapshot = historical ? await this.em.findOne(ProjectDailySnapshot, { projectId: ctx.projectId, date: ctx.date }) : null;
    const whole = item
      ? { planned: item.planned, actual: item.actual, bac: item.bac, pv: item.pv, ev: item.ev }
      : {
          planned: Number(snapshot?.plannedPercent ?? project.plannedPercent),
          actual: Number(snapshot?.actualPercent ?? project.actualPercent),
          bac: snapshot?.bac ?? project.bac,
          pv: snapshot?.pv ?? project.pv,
          ev: snapshot?.ev ?? project.ev,
        };
    const children = [...rows.values()].filter((row) => row.parentId === (item?.id ?? null));
    const leaves = [...rows.values()].filter((row) => row.isLeaf && (!item || this.under(rows, row, item.id)));
    const wbsSource = (row: Row, detail: string, part: number, total: number): Source => ({
      kind: 'wbs_item',
      id: row.id,
      code: row.code,
      label: row.title,
      detail,
      sharePercent: share(part, total),
    });

    if (metric === 'actual_percent' || metric === 'planned_percent') {
      const key = metric === 'actual_percent' ? 'actual' : 'planned';
      const value = whole[key];
      if (item?.isLeaf)
        return {
          valueText: pct(value),
          formula: `پیشرفت ${key === 'actual' ? 'تأییدشدهٔ' : 'برنامه‌ای'} برگ = ${pct(value)}`,
          sources: [],
          costIndicesNote: null,
        };
      const terms = children.map((row) => `${num(row.weight / 100, 4)} × ${num(row[key], 2)}`);
      const sources = children.map((row) => wbsSource(row, `وزن ${num(row.weight, 2)} · ${pct(row[key])}`, (row.weight * row[key]) / 100, value));
      return { valueText: pct(value), formula: sumFormula(terms, pct(value), 'Σ (وزن × پیشرفت فرزند)'), sources: top(sources), costIndicesNote: null };
    }
    if (metric === 'deviation') {
      const deviation = whole.actual - whole.planned;
      const sources = leaves
        .filter((row) => row.actual - row.planned < 0)
        .map((row) =>
          wbsSource(row, `برنامه‌ای ${pct(row.planned)} · واقعی ${pct(row.actual)} · ${num(row.actual - row.planned, 2)}`, row.planned - row.actual, 100),
        );
      return {
        valueText: `${num(deviation, 2)} واحد درصد`,
        formula: `${num(whole.actual, 2)} − ${num(whole.planned, 2)} = ${num(deviation, 2)}`,
        sources: top(sources).map((source) => ({ ...source, sharePercent: null })),
        costIndicesNote: null,
      };
    }
    if (metric === 'pv' || metric === 'ev') {
      const key = metric === 'pv' ? 'planned' : 'actual';
      const total = Number(whole[metric]);
      const terms = leaves.map((row) => `${million(row.bac)} × ${num(row[key] / 100, 4)}`);
      const sources = leaves.map((row) => wbsSource(row, `BAC ${million(row.bac)} · ${pct(row[key])} = ${million(row[metric])}`, Number(row[metric]), total));
      return {
        valueText: amountText(whole[metric]),
        formula: ctx.amounts
          ? sumFormula(terms, million(whole[metric]), `Σ (BAC برگ × پیشرفت ${key === 'actual' ? 'واقعی' : 'برنامه‌ای'})`)
          : `Σ (BAC برگ × پیشرفت ${key === 'actual' ? 'واقعی' : 'برنامه‌ای'})`,
        sources: top(sources),
        costIndicesNote: null,
      };
    }
    if (metric === 'spi') {
      const spi = Number(whole.pv) > 0 ? Number(whole.ev) / Number(whole.pv) : null;
      const sources = leaves.map((row) =>
        wbsSource(
          row,
          ctx.amounts ? `BAC ${million(row.bac)} · EV ${million(row.ev)} · PV ${million(row.pv)}` : `واقعی ${pct(row.actual)} · برنامه‌ای ${pct(row.planned)}`,
          Number(row.ev),
          Number(whole.ev),
        ),
      );
      return {
        valueText: ratio(spi),
        formula: ctx.amounts ? `SPI = EV ÷ PV = ${million(whole.ev)} ÷ ${million(whole.pv)} = ${ratio(spi)}` : `SPI = EV ÷ PV = ${ratio(spi)}`,
        sources: top(sources),
        costIndicesNote: null,
      };
    }
    if (metric === 'forecast_finish') {
      if (item) {
        const leafSources = item.isLeaf ? [] : children.map((row) => wbsSource(row, `پیش‌بینی ${jalali(row.forecastFinish)}`, row.actual < 100 ? 1 : 0, 1));
        return {
          valueText: jalali(item.forecastFinish),
          formula: item.isLeaf ? 'پایان = تاریخ داده + (۱۰۰ − واقعی) ÷ نرخ ۱۴ روز اخیر (روز کاری)' : 'بزرگ‌ترین پیش‌بینی میان فرزندان تمام‌نشده',
          sources: leafSources.map((source) => ({ ...source, sharePercent: null })),
          costIndicesNote: null,
        };
      }
      return {
        valueText: jalali(project.forecastFinish ?? null),
        formula:
          project.delayDays === null || project.delayDays === undefined
            ? 'پیش از اولین ارزش کسب‌شده پیش‌بینی نمی‌شود.'
            : `مدت پیش‌بینی = مدت برنامه‌ای ÷ SPI(t) · تأخیر ${num(project.delayDays, 0)} روز کاری`,
        sources: [],
        costIndicesNote: null,
      };
    }
    return this.cost(metric, project, ctx);
  }

  /** AC، CPI، EAC و مصرف پروژه در t_c (OD-19) با قلم‌های CBS به‌عنوان منبع. */
  private async cost(
    metric: ExplainMetric,
    project: ProjectProgress,
    ctx: { amounts: boolean; eacMethod: string; projectId: string; cbs: readonly CbsNode[] },
  ): Promise<Body> {
    const tc = project.costIndicesDate ?? project.dataDate ?? null;
    const [cbsRows, atTc] = await Promise.all([
      this.em.find(CbsItemProgress, { projectId: ctx.projectId }),
      tc ? this.em.findOne(ProjectDailySnapshot, { projectId: ctx.projectId, date: tc }) : null,
    ]);
    const nodes = new Map(ctx.cbs.map((node) => [node.id, node]));
    // منبع‌ها برگ‌های CBS‌اند تا جمع دوبار شمرده نشود
    const leaves = cbsRows.filter((row) => nodes.get(row.cbsItemId)?.isLeaf);
    const ac = Number(project.ac);
    const evTc = atTc ? atTc.ev : project.ev;
    const cbsSource = (row: CbsItemProgress, detail: string, part: number, total: number): Source => {
      const node = nodes.get(row.cbsItemId);
      return { kind: 'cbs_item', id: row.cbsItemId, code: node?.code ?? null, label: node?.title ?? '', detail, sharePercent: share(part, total) };
    };
    const note = costNote(tc);
    const cpi = project.cpi === null || project.cpi === undefined ? null : Number(project.cpi);
    const withAc = leaves.filter((row) => Number(row.ac) !== 0);
    if (metric === 'ac') {
      return {
        valueText: amountText(project.ac),
        formula: sumFormula(
          withAc.map((row) => million(row.ac)),
          million(project.ac),
          'Σ ردیف‌های قطعی دفتر هزینه',
        ),
        sources: top(withAc.map((row) => cbsSource(row, `AC ${million(row.ac)}`, Number(row.ac), ac))),
        costIndicesNote: note,
      };
    }
    if (metric === 'cpi') {
      const detail = (row: CbsItemProgress) =>
        ctx.amounts
          ? `EV ${million(row.ev)} · AC ${million(row.ac)} · CPI ${ratio(row.cpi === null ? null : Number(row.cpi))}`
          : `CPI ${ratio(row.cpi === null ? null : Number(row.cpi))}`;
      return {
        valueText: cpi === null ? '—' : cpi.toFixed(2),
        formula: ctx.amounts ? `CPI = EV ÷ AC = ${million(evTc)} ÷ ${million(project.ac)} = ${ratio(cpi)}` : `CPI = EV ÷ AC = ${ratio(cpi)}`,
        sources: top(withAc.map((row) => cbsSource(row, detail(row), Number(row.ac), ac))),
        costIndicesNote: note,
      };
    }
    if (metric === 'eac') {
      const formula =
        ctx.eacMethod === 'remaining'
          ? `EAC = AC + (BAC − EV) = ${million(project.ac)} + (${million(project.bac)} − ${million(evTc)}) = ${million(project.eac)}`
          : ctx.eacMethod === 'composite'
            ? `EAC = AC + (BAC − EV) ÷ (CPI × SPI) = ${million(project.eac)}`
            : `EAC = BAC × AC ÷ EV = ${million(project.bac)} × ${million(project.ac)} ÷ ${million(evTc)} = ${million(project.eac)}`;
      return { valueText: amountText(project.eac), formula, sources: [], costIndicesNote: note };
    }
    // cbs_consumption پروژه: AC ÷ BAC
    const bac = Number(project.bac);
    const consumed = bac > 0 ? (ac / bac) * 100 : 0;
    return {
      valueText: pct(consumed),
      formula: ctx.amounts ? `AC ÷ BAC = ${million(project.ac)} ÷ ${million(project.bac)} = ${pct(consumed)}` : `AC ÷ BAC = ${pct(consumed)}`,
      sources: top(withAc.map((row) => cbsSource(row, `مصرف ${pct(Number(row.consumedPercent ?? 0))} از بودجهٔ قلم`, Number(row.ac), ac))),
      costIndicesNote: note,
    };
  }

  private under(rows: ReadonlyMap<string, Row>, row: Row, ancestorId: string): boolean {
    for (let parent = row.parentId; parent; parent = rows.get(parent)?.parentId ?? null) if (parent === ancestorId) return true;
    return row.id === ancestorId;
  }
}
