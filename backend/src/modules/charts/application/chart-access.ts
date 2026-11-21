import { Injectable } from '@nestjs/common';
import { ConflictError, ForbiddenError, UnauthorizedError } from '../../../platform/http/errors.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { OverviewFigures, type OverviewFiguresView } from '../../computation/figures.js';
import { ProjectPlanState } from '../../projects/index.js';
import { CHART_RANGES, type ChartRangePreset } from '../../computation/figures.js';

// مشترک W21 تا W24 (charts.md ۸، ۹): دسترسی، فرادادهٔ پاسخ (ChartMeta) و بازه.

export const parseRange = (raw: string | undefined): ChartRangePreset =>
  (CHART_RANGES as readonly string[]).includes(raw ?? '') ? (raw as ChartRangePreset) : 'all';

@Injectable()
export class ChartContext {
  constructor(
    private readonly context: AppContext,
    private readonly figures: OverviewFigures,
    private readonly plans: ProjectPlanState,
  ) {}

  amounts(projectId: string): boolean {
    const access = this.context.access;
    if (!access) throw new UnauthorizedError();
    return access.isOrgAdmin || (access.projects.get(projectId)?.has('cbs.view_amounts') ?? false);
  }

  /** W22 = `charts.view` + `cbs.view_amounts` (نام مستعار `charts.view_cost`؛ AC-CH-04). */
  requireAmounts(projectId: string): void {
    if (!this.amounts(projectId)) throw new ForbiddenError('PERMISSION_DENIED', { requiredPermission: 'cbs.view_amounts' });
  }

  /** کارت‌ها و فرادادهٔ همان نمای کلی تا دو صفحه یک عدد بگویند؛ پیش‌نویس ۴۰۹. */
  async load(projectId: string): Promise<{ figures: OverviewFiguresView; meta: Record<string, unknown> }> {
    const figures = await this.figures.of(projectId, 2);
    if (figures.rules.status === 'draft')
      throw new ConflictError('CHARTS_NOT_AVAILABLE', { reason: 'پروژهٔ پیش‌نویس هنوز نموداری ندارد؛ پس از فعال‌سازی محاسبه می‌شود.' });
    const plan = await this.plans.state(projectId);
    return { figures, meta: { ...figures.meta, pvReference: plan.pvReference } };
  }
}
