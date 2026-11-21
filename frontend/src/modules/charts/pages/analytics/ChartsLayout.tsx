import { Navigate, Outlet, useLocation, useOutletContext, useSearchParams } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { PageHead } from '@/shared/components/ui/PageHead';
import { Select } from '@/shared/components/ui/Select';
import { SegmentedControl, type SegmentedItem } from '@/shared/components/ui/Tabs';
import { useHasPermission } from '@/shared/hooks/useHasAccess';
import { formatJalaliDate, formatJalaliDateTime } from '@/shared/utils/date';
import { useProjectContext } from '@/modules/projects/layout/ProjectShell';
import type { ProjectDetailDto } from '@/modules/projects/types';
import type { ChartMeta } from '../../types';
import type { ChartRangePreset } from '../../types/analytics';

export interface ChartsContext {
  project: ProjectDetailDto;
  preset: ChartRangePreset;
  canViewAmounts: boolean;
  /** ناظر کارفرما: حالت خلاصه (charts.md ۸). */
  summaryOnly: boolean;
}

export const useChartsContext = () => useOutletContext<ChartsContext>();

const PRESETS: Array<{ value: ChartRangePreset; label: string }> = [
  { value: 'all', label: 'کل پروژه' },
  { value: 'quarter', label: '۳ ماه اخیر' },
  { value: 'month', label: 'این ماه' },
  { value: 'closed_period', label: 'دورهٔ بستهٔ اخیر' },
];

/**
 * پوستهٔ W21–W24: زبانه‌ها، بازهٔ زمانی (فقط سری‌های زمانی را محدود می‌کند — تصمیم
 * 1405/08/15)، «خروجی PDF کامل» با چاپ مرورگر تا F18 (تصمیم 1405/08/15).
 */
export default function ChartsLayout() {
  const { project } = useProjectContext();
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const canFull = useHasPermission('charts.view');
  const canSummary = useHasPermission('charts.view_summary');
  const canViewAmounts = useHasPermission('cbs.view_amounts');
  const summaryOnly = !canFull && canSummary;
  const preset = (PRESETS.find((entry) => entry.value === params.get('range'))?.value ?? 'all') as ChartRangePreset;
  const query = params.toString() ? `?${params.toString()}` : '';
  const tab = pathname.split('/').pop() ?? 'progress';

  if (project.status === 'draft' || (!canFull && !canSummary)) return <Navigate to={ROUTES.project(project.id)} replace />;
  if (summaryOnly && (tab === 'cost' || tab === 'resources')) return <Navigate to={`${ROUTES.chartsProgress(project.id)}${query}`} replace />;
  if (!canViewAmounts && tab === 'cost') return <Navigate to={`${ROUTES.chartsProgress(project.id)}${query}`} replace />;

  const items: SegmentedItem[] = [
    { key: 'progress', label: 'پیشرفت و زمان', icon: 'trending-up', to: `${ROUTES.chartsProgress(project.id)}${query}` },
    ...(canViewAmounts && !summaryOnly ? [{ key: 'cost', label: 'هزینه و بودجه', icon: 'receipt' as const, to: `${ROUTES.chartsCost(project.id)}${query}` }] : []),
    ...(!summaryOnly ? [{ key: 'resources', label: 'منابع و سرپرستان', icon: 'users' as const, to: `${ROUTES.chartsResources(project.id)}${query}` }] : []),
    { key: 'risk', label: 'ریسک و انحراف', icon: 'alert-triangle', to: `${ROUTES.chartsRisk(project.id)}${query}` },
  ];

  return (
    <>
      <PageHead
        title="نمودارها و تحلیل پروژه"
        subtitle={summaryOnly ? 'حالت خلاصه: درصدها، انحراف و ریسک‌ها، بدون مبالغ' : 'تحلیل گرافیکی پیشرفت، هزینه، منابع و ریسک'}
        actions={
          <span className="row wrap g8 no-print">
            {tab !== 'risk' && (
              <Select
                size="sm"
                label="بازهٔ نمایش"
                options={PRESETS}
                value={preset}
                onChange={(value) =>
                  setParams(
                    (current) => {
                      const next = new URLSearchParams(current);
                      if (value === 'all') next.delete('range');
                      else next.set('range', value);
                      return next;
                    },
                    { replace: true },
                  )
                }
                width={170}
              />
            )}
            <AppButton variant="primary" size="sm" icon="printer" onClick={() => window.print()}>
              خروجی PDF کامل
            </AppButton>
          </span>
        }
      />
      <SegmentedControl emphasis activeKey={tab} items={items} className="no-print" style={{ marginBottom: 16, maxWidth: '100%', overflowX: 'auto' }} />
      <Outlet context={{ project, preset, canViewAmounts: canViewAmounts && !summaryOnly, summaryOnly } satisfies ChartsContext} />
    </>
  );
}

/** بنرهای مشترک (charts.md ۷؛ AC-CH-08). */
export function ChartMetaBanner({ meta, rangeLabel, closedPeriod }: { meta: ChartMeta; rangeLabel?: string; closedPeriod?: boolean }) {
  return (
    <>
      {meta.computeState === 'updating' && (
        <div style={{ marginBottom: 12 }}>
          <Alert tone="inf" icon="refresh-cw">
            در حال به‌روزرسانی اعداد؛ مقدارهای قبلی نشان داده می‌شود.
          </Alert>
        </div>
      )}
      {meta.stale && (
        <div style={{ marginBottom: 12 }}>
          <Alert tone="wrn" icon="clock">
            {`اعداد ممکن است قدیمی باشند؛ آخرین محاسبه ${formatJalaliDateTime(meta.computedAt)}.`}
          </Alert>
        </div>
      )}
      <p className="t-12 tx5" style={{ margin: '0 0 12px' }}>
        {`تاریخ داده ${formatJalaliDate(meta.dataDate)}`}
        {meta.costIndicesDate ? ` · شاخص‌های هزینه تا ${formatJalaliDate(meta.costIndicesDate)}` : ''}
        {meta.pvReference ? ` · مرجع PV: ${meta.pvReference.kind === 'baseline' ? 'مبنا' : `R${meta.pvReference.number}`}` : ''}
        {rangeLabel ? ` · بازه: ${rangeLabel}${closedPeriod ? ' (دورهٔ بسته)' : ''}` : ''}
      </p>
    </>
  );
}
