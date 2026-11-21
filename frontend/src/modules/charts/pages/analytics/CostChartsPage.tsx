import { Link } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { Content } from '@/shared/components/layout/AppShell';
import { TimeSeriesChart } from '@/shared/components/charts/TimeSeriesChart';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { AppButton } from '@/shared/components/ui/AppButton';
import { formatJalaliDate, formatJalaliMonthShort } from '@/shared/utils/date';
import { formatPercentAuto } from '@/shared/utils/num';
import { moneyScale } from '../../components/analytics/money';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import type { CostType } from '@/shared/types/tone';
import { ExplainButton } from '@/modules/progress/components/ExplainButton';
import { useGetCostChartsQuery } from '../../api/analyticsApi';
import { ChartCard, LegendItem } from '../../components/analytics/ChartCard';
import { useHiddenSeries } from '../../components/analytics/useHiddenSeries';
import { Donut } from '../../components/analytics/Visuals';
import { ChartMetaBanner, useChartsContext } from './ChartsLayout';

const TYPE_COLOR: Record<CostType, string> = { materials: '#2563EB', labor: '#E07A2C', equipment: '#16A34A', subcontract: '#7C3AED', overhead: '#71717A', transport: '#0E7490', other: '#A1A1AA' };
const ratio = (value: number | null) => (value == null ? '—' : value.toFixed(2));
const consumedColor = (percent: number) => (percent >= 90 ? '#DC2626' : percent >= 75 ? '#D97706' : '#1A3354');
/** راهنمای «نرخ مصرف» — «واقعی» هم ستون است و هم خط، پس با یک کلید خاموش می‌شود. */
const BURN_LEGEND = [
  { key: 'planned', label: 'برنامه‌ای', color: '#8AA2C2', dashed: true },
  { key: 'actual', label: 'واقعی', color: '#1A3354' },
  { key: 'forecast', label: 'پیش‌بینی', color: '#A1A1AA', dashed: true },
];

/** W22 — هزینه و بودجه (charts.md ۶.۴)؛ فقط با `cbs.view_amounts` (AC-CH-04). */
export default function CostChartsPage() {
  const { project, preset } = useChartsContext();
  const query = useGetCostChartsQuery({ projectId: project.id, preset, canViewAmounts: true });
  const burn = useHiddenSeries();
  const data = query.data;

  if (query.isLoading) return <Content><SkeletonTable rows={10} /></Content>;
  if (query.isError || !data)
    return (
      <Content>
        <EmptyState inCard icon="server" title="نمودار هزینه بارگذاری نشد" description={getApiErrorMessage(query.error, 'چند لحظهٔ دیگر دوباره امتحان کنید.')} actions={<AppButton size="sm" variant="primary" icon="refresh-cw" onClick={() => void query.refetch()}>تلاش دوباره</AppButton>} />
      </Content>
    );

  const k = data.kpis;
  const money = moneyScale([k.bac, k.eac]);
  const toBillions = (value: number | string, digits = 1) => money.format(value, digits);
  const maxGroup = Math.max(...data.byGroup.flatMap((group) => [Number(group.budget), Number(group.eac), Number(group.ac)]), 1);
  const maxTop = Math.max(...data.top.map((item) => Number(item.budget)), 1);

  return (
    <Content>
      <ChartMetaBanner meta={data} rangeLabel={data.range.label} closedPeriod={data.range.closedPeriod} />
      <div className="strip c6">
        <div>
          <span className="t-sm tx5 row g4">بودجهٔ مصوب (BAC)</span>
          <span className="stat-v">{toBillions(k.bac, 0)}</span>
          <span className="t-sm tx5">{money.unit}</span>
        </div>
        <div>
          <span className="t-sm tx5 row g4">
            هزینهٔ واقعی از دفتر هزینه (AC)
            <ExplainButton projectId={project.id} metric="ac" label="AC" />
          </span>
          <span className="stat-v">{toBillions(k.ac, 0)}</span>
          <span className="t-sm tx5">{`${formatPercentAuto(k.acPercent)} از بودجه`}</span>
        </div>
        <div>
          <span className="t-sm tx5 row g4">
            ارزش کسب‌شده (EV)
            <ExplainButton projectId={project.id} metric="ev" label="EV" />
          </span>
          <span className="stat-v">{toBillions(k.ev, 0)}</span>
        </div>
        <div>
          <span className="t-sm tx5 row g4">
            برآورد پایان (EAC)
            <ExplainButton projectId={project.id} metric="eac" label="EAC" />
          </span>
          <span className={`stat-v ${k.eacVariancePercent > 0 ? 'tx-err' : 'tx-ok'}`}>{toBillions(k.eac, 0)}</span>
          <span className={`t-sm ${k.eacVariancePercent > 0 ? 'tx-err' : 'tx-ok'}`}>{`${k.eacVariancePercent > 0 ? '+' : ''}${formatPercentAuto(k.eacVariancePercent)}`}</span>
        </div>
        <div>
          <span className="t-sm tx5 row g4">
            CPI
            <ExplainButton projectId={project.id} metric="cpi" label="CPI" />
          </span>
          <span className={`stat-v mono ${(k.cpi ?? 1) < 0.95 ? 'tx-wrn' : ''}`}>{ratio(k.cpi)}</span>
        </div>
        <div>
          <span className="t-sm tx5">TCPI لازم</span>
          <span className="stat-v mono">{k.tcpi == null ? '—' : k.tcpi.toFixed(2)}</span>
          <span className="t-sm tx5">{k.tcpi == null ? 'فراتر از بودجه' : 'برای ماندن در بودجه'}</span>
        </div>
      </div>

      <div className="charts-split" style={{ marginBottom: 16 }}>
        <ChartCard
          icon="layers"
          title="توزیع بودجه بر اساس نوع هزینه"
          subtitle="از اقلام CBS پروژه"
          csv={{ fileName: `cost-types-${project.code}`, rows: data.byType, columns: [{ header: 'نوع', value: (row) => row.label }, { header: 'بودجه (ریال)', value: (row) => row.budget }, { header: 'درصد', value: (row) => row.percent }] }}
        >
          <div className="row wrap g20" style={{ padding: 18 }}>
            <Donut
              slices={data.byType.map((row) => ({ color: TYPE_COLOR[row.type], value: Number(row.budget), label: row.label }))}
              centerTop="بودجهٔ اقلام"
              centerValue={toBillions(data.byType.reduce((sum, row) => sum + Number(row.budget), 0), 0)}
              centerBottom={money.unit}
              label={data.byType.map((row) => `${row.label} ${formatPercentAuto(row.percent)}`).join('، ')}
            />
            <div className="col g8 grow" style={{ minWidth: 200 }}>
              {data.byType.map((row) => (
                <div key={row.type} className="row g8">
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: TYPE_COLOR[row.type], flexShrink: 0 }} />
                  <span className="t-12 tx8 grow">{row.label}</span>
                  <span className="t-12 fw6">{formatPercentAuto(row.percent)}</span>
                  <span className="t-sm tx5" style={{ width: 60, textAlign: 'left' }}>
                    {toBillions(row.budget)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        <ChartCard
          icon="scale"
          title="بودجه، هزینهٔ واقعی و برآورد پایان"
          subtitle="به تفکیک گروه CBS؛ برآورد فراتر از بودجه قرمز"
          legend={
            <>
              <LegendItem color="#E5EBF3" label="بودجه" />
              <LegendItem color="#1A3354" label="واقعی" />
              <LegendItem color="#DC2626" label="برآورد پایان" />
            </>
          }
          csv={{
            fileName: `cost-groups-${project.code}`,
            rows: data.byGroup,
            columns: [
              { header: 'کد', value: (row) => row.code },
              { header: 'گروه', value: (row) => row.title },
              { header: 'بودجه', value: (row) => row.budget },
              { header: 'واقعی', value: (row) => row.ac },
              { header: 'برآورد پایان', value: (row) => row.eac },
            ],
          }}
        >
          <div className="col g14" style={{ padding: 18 }}>
            {data.byGroup.map((group) => (
              <div key={group.id} className="col g4">
                <div className="row between wrap g8 t-12">
                  <span className="fw5 tx8">
                    <span className="mono tx5">{group.code}</span> {group.title}
                  </span>
                  <span className="tx6">
                    واقعی <strong className="tx9">{toBillions(group.ac)}</strong> از {toBillions(group.budget)} · برآورد{' '}
                    <strong className={group.eacVariancePercent > 5 ? 'tx-err' : group.eacVariancePercent > 0 ? 'tx-wrn' : 'tx-ok'}>{toBillions(group.eac)}</strong>
                  </span>
                </div>
                <div style={{ position: 'relative', height: 18, borderRadius: 6, background: '#F4F4F5' }}>
                  <span style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: `${(Number(group.budget) / maxGroup) * 100}%`, background: '#E5EBF3', borderRadius: 6 }} />
                  <span style={{ position: 'absolute', top: 4, bottom: 4, right: 0, width: `${(Number(group.ac) / maxGroup) * 100}%`, background: consumedColor(group.consumedPercent), borderRadius: 4 }} />
                  <span style={{ position: 'absolute', top: -3, bottom: -3, width: 2, background: '#DC2626', right: `${(Number(group.eac) / maxGroup) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <ChartCard
        icon="trending-up"
        iconClassName="tx-acc"
        title="نرخ مصرف ماهانه"
        subtitle="برنامه‌ای = تغییر PV هر ماه · واقعی = هزینهٔ ثبت‌شدهٔ ماه · پیش‌بینی ۴ ماه = تغییر EV پیش‌بینی ÷ CPI"
        legend={
          <>
            {BURN_LEGEND.map((item) => (
              <LegendItem
                key={item.key}
                color={item.color}
                label={item.label}
                dashed={item.dashed}
                off={burn.hidden.has(item.key)}
                onToggle={() => burn.toggle(item.key)}
              />
            ))}
          </>
        }
        csv={{
          fileName: `burn-${project.code}`,
          rows: data.burn,
          columns: [
            { header: 'ماه', value: (row) => formatJalaliMonthShort(row.date) },
            { header: 'برنامه‌ای (ریال)', value: (row) => row.planned },
            { header: 'واقعی (ریال)', value: (row) => row.actual },
            { header: 'پیش‌بینی (ریال)', value: (row) => row.forecast },
          ],
        }}
      >
        <div style={{ padding: '10px 14px 6px' }}>
          <TimeSeriesChart
            dates={data.burn.map((row) => row.date)}
            series={[
              { key: 'bars', label: 'واقعی', color: 'rgba(26,51,84,0.10)', kind: 'bar' as const, values: data.burn.map((row) => (row.actual ? Number(row.actual) : null)) },
              { key: 'planned', label: 'برنامه‌ای', color: '#8AA2C2', dashed: true, values: data.burn.map((row) => (row.planned ? Number(row.planned) : null)) },
              { key: 'forecast', label: 'پیش‌بینی', color: '#A1A1AA', dashed: true, values: data.burn.map((row) => (row.forecast ? Number(row.forecast) : null)) },
              { key: 'actual', label: 'واقعی', color: '#1A3354', width: 3, dots: true, values: data.burn.map((row) => (row.actual ? Number(row.actual) : null)) },
            ].filter((item) => !burn.hidden.has(item.key === 'bars' ? 'actual' : item.key))}
            formatY={(value) => toBillions(value, 0)}
            todayDate={data.dataDate}
            height={250}
            ariaLabel={`هزینهٔ ماهانهٔ برنامه‌ای در برابر واقعی با پیش‌بینی چهار ماه آینده، ${money.unit}`}
          />
        </div>
      </ChartCard>

      <div style={{ height: 16 }} />
      <ChartCard
        icon="list-checks"
        title="۱۰ قلم پرهزینهٔ CBS"
        subtitle="بیشترین بودجه، با درصد مصرف"
        action={
          <Link className="link t-12" to={ROUTES.cbs(project.id)}>
            مشاهده در CBS
          </Link>
        }
        csv={{
          fileName: `top-cbs-${project.code}`,
          rows: data.top,
          columns: [
            { header: 'کد', value: (row) => row.code },
            { header: 'قلم', value: (row) => row.title },
            { header: 'بودجه', value: (row) => row.budget },
            { header: 'واقعی', value: (row) => row.ac },
            { header: 'درصد مصرف', value: (row) => row.consumedPercent },
          ],
        }}
      >
        <div className="grid c2 rsp" style={{ padding: '16px 18px', gap: '12px 32px' }}>
          {data.top.map((item) => (
            <Link key={item.id} to={ROUTES.cbsItem(project.id, item.id)} className="row g10" title={`${item.code} ${item.title}: ${formatPercentAuto(item.consumedPercent)} مصرف`}>
              <span className="mono t-xs tx5" style={{ width: 52 }}>
                {item.code}
              </span>
              <span className="t-12 tx8 trunc" style={{ width: 150 }}>
                {item.title}
              </span>
              <span style={{ flex: '1 1 auto', height: 14, borderRadius: 4, background: '#F4F4F5', position: 'relative' }}>
                <span style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: `${(Number(item.budget) / maxTop) * 100}%`, background: '#E5EBF3', borderRadius: 4 }} />
                <span style={{ position: 'absolute', top: 3, bottom: 3, right: 0, width: `${(Math.min(Number(item.ac), Number(item.budget)) / maxTop) * 100}%`, background: consumedColor(item.consumedPercent), borderRadius: 3 }} />
              </span>
              <span className="t-12 fw6" style={{ width: 42, color: consumedColor(item.consumedPercent) }}>
                {formatPercentAuto(item.consumedPercent)}
              </span>
              <span className="t-sm tx5" style={{ width: 44 }}>
                {toBillions(item.budget)}
              </span>
            </Link>
          ))}
        </div>
      </ChartCard>
      <p className="t-xs tx5" style={{ marginTop: 10 }}>{`ارقام به ${money.unit} · شاخص‌های هزینه تا ${formatJalaliDate(data.costIndicesDate ?? data.dataDate)}`}</p>
    </Content>
  );
}
