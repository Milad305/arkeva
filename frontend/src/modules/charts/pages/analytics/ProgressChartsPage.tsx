import { useState } from 'react';

import { Content } from '@/shared/components/layout/AppShell';
import { SCurveChart, type SCurveSeries } from '@/shared/components/charts/SCurveChart';
import { TimeSeriesChart } from '@/shared/components/charts/TimeSeriesChart';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Chip } from '@/shared/components/ui/Chip';
import { formatJalaliDate } from '@/shared/utils/date';
import { formatPercentAuto, formatRial, toFaDigits } from '@/shared/utils/num';
import { moneyScale } from '../../components/analytics/money';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { ExplainButton } from '@/modules/progress/components/ExplainButton';
import { useGetProgressChartsQuery } from '../../api/analyticsApi';
import { ChartCard, ChartStat, LegendItem } from '../../components/analytics/ChartCard';
import { useHiddenSeries } from '../../components/analytics/useHiddenSeries';
import { CompactGantt, STATUS_COLOR } from '../../components/analytics/Visuals';
import { ChartMetaBanner, useChartsContext } from './ChartsLayout';

const signed = (value: number, unit = '٪') => `${value > 0 ? '+' : value < 0 ? '−' : ''}${toFaDigits(String(Math.abs(Math.round(value * 10) / 10))).replace('.', '٫')}${unit}`;
const ratio = (value: number | null) => (value == null ? '—' : value.toFixed(2));

/** W21 — پیشرفت و زمان (charts.md ۶.۳): منحنی S چهارخطی، EVM ماهانه، گانت فشرده. */
export default function ProgressChartsPage() {
  const { project, preset, canViewAmounts } = useChartsContext();
  const query = useGetProgressChartsQuery({ projectId: project.id, preset, canViewAmounts });
  const evmHidden = useHiddenSeries();
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const data = query.data;

  if (query.isLoading) return <Content><SkeletonTable rows={10} /></Content>;
  if (query.isError || !data)
    return (
      <Content>
        <EmptyState inCard icon="server" title="نمودارها بارگذاری نشد" description={getApiErrorMessage(query.error, 'چند لحظهٔ دیگر دوباره امتحان کنید.')} actions={<AppButton size="sm" variant="primary" icon="refresh-cw" onClick={() => void query.refetch()}>تلاش دوباره</AppButton>} />
      </Content>
    );

  const dates = data.curve.map((point) => point.date);
  const allSeries: SCurveSeries[] = [
    { key: 'baseline', label: 'برنامهٔ اولیه', color: '#8AA2C2', dashed: true, values: data.curve.map((point) => point.baseline) },
    ...(data.hasRevision ? [{ key: 'revised', label: `برنامهٔ بازنگری‌شده (${data.revisionLabel})`, color: '#2C4A73', values: data.curve.map((point) => point.revised) }] : []),
    { key: 'forecast', label: 'پیش‌بینی', color: '#A1A1AA', dashed: true, values: data.curve.map((point) => point.forecast) },
    { key: 'actual', label: 'واقعی', color: '#1A3354', width: 3.5, values: data.curve.map((point) => point.actual) },
  ];
  const series = allSeries.filter((item) => !hidden.has(item.key));
  const planKey = data.hasRevision ? 'revised' : 'baseline';
  const k = data.kpis;
  const evm = data.evm;
  const money = moneyScale(evm.months.flatMap((month) => [month.pv, month.ev, month.ac]));
  const amount = (value: string | null) => (value == null ? '—' : formatRial(value));
  const evmSeries = [
    { key: 'pv', label: 'PV', color: '#2563EB', values: evm.months.map((month) => (month.pv ? Number(month.pv) : null)) },
    { key: 'ac', label: 'AC', color: '#DC2626', values: evm.months.map((month) => (month.ac ? Number(month.ac) : null)) },
    { key: 'ev', label: 'EV', color: '#16A34A', values: evm.months.map((month) => (month.ev ? Number(month.ev) : null)) },
  ];

  return (
    <Content>
      <ChartMetaBanner meta={data} rangeLabel={data.range.label} closedPeriod={data.range.closedPeriod} />

      <ChartCard
        icon="trending-up"
        title="منحنی پیشرفت پروژه (S-Curve)"
        subtitle="برنامهٔ اولیه، بازنگری‌شده، واقعی و پیش‌بینی — ناحیهٔ سایه‌دار، عقب‌ماندگی از برنامه است"
        csv={{
          fileName: `s-curve-${project.code}`,
          rows: data.curve,
          columns: [
            { header: 'تاریخ', value: (point) => formatJalaliDate(point.date) },
            { header: 'برنامهٔ اولیه', value: (point) => point.baseline },
            { header: 'بازنگری‌شده', value: (point) => point.revised },
            { header: 'واقعی', value: (point) => point.actual },
            { header: 'پیش‌بینی', value: (point) => point.forecast },
          ],
        }}
        footer={
          <>
            <ChartStat label="پیشرفت واقعی" value={formatPercentAuto(k.actualPercent)} explain={<ExplainButton projectId={project.id} metric="actual_percent" label="پیشرفت واقعی" />} />
            <ChartStat label="برنامه‌ای امروز" value={formatPercentAuto(k.plannedPercent)} explain={<ExplainButton projectId={project.id} metric="planned_percent" label="پیشرفت برنامه‌ای" />} />
            <ChartStat label="انحراف" value={signed(k.deviation)} className={k.deviation < -5 ? 'tx-err' : k.deviation < 0 ? 'tx-wrn' : 'tx-ok'} explain={<ExplainButton projectId={project.id} metric="deviation" label="انحراف" />} />
            <ChartStat label="پیش‌بینی اتمام" value={k.forecastFinish ? formatJalaliDate(k.forecastFinish) : '—'} explain={<ExplainButton projectId={project.id} metric="forecast_finish" label="پیش‌بینی اتمام" />} />
            <ChartStat label="تأخیر تخمینی" value={k.delayWorkingDays == null ? '—' : `${toFaDigits(Math.max(0, k.delayWorkingDays))} روز کاری`} className={(k.delayWorkingDays ?? 0) > 0 ? 'tx-wrn' : undefined} />
          </>
        }
      >
        <div className="row wrap g6 no-print" style={{ padding: '12px 18px 0' }}>
          {allSeries.map((item) => (
            <Chip
              key={item.key}
              selected={!hidden.has(item.key)}
              onClick={() =>
                setHidden((current) => {
                  const next = new Set(current);
                  if (next.has(item.key)) next.delete(item.key);
                  else next.add(item.key);
                  return next;
                })
              }
            >
              <span style={{ width: 14, ...(item.dashed ? { borderTop: `2px dashed ${item.color}` } : { height: item.width ? 4 : 3, borderRadius: 2, background: item.color }) }} />
              {item.label}
            </Chip>
          ))}
        </div>
        {data.curve.some((point) => point.actual != null) ? null : (
          <p className="t-12 tx5" style={{ padding: '8px 18px 0', margin: 0 }}>
            هنوز گزارشی تأیید نشده؛ منحنی برنامه نشان داده می‌شود.
          </p>
        )}
        <div style={{ padding: '10px 14px 6px' }}>
          <SCurveChart
            dates={dates}
            series={series}
            todayDate={data.dataDate >= dates[0]! && data.dataDate <= dates[dates.length - 1]! ? data.dataDate : undefined}
            shadeBetween={!hidden.has(planKey) && !hidden.has('actual') ? [planKey, 'actual'] : undefined}
            height={280}
            ariaLabel={`منحنی S؛ امروز ${formatPercentAuto(k.actualPercent)} واقعی در برابر ${formatPercentAuto(k.plannedPercent)} برنامه`}
          />
        </div>
      </ChartCard>

      <div className="charts-two" style={{ marginTop: 16 }}>
        <ChartCard
          icon="activity"
          title="تحلیل ارزش کسب‌شده (EVM)"
          subtitle={canViewAmounts ? `PV، EV و AC تجمعی ماهانه به ${money.unit}؛ AC تا تاریخ شاخص‌های هزینه` : 'بدون مجوز مبالغ فقط نسبت‌ها دیده می‌شود'}
          legend={
            canViewAmounts ? (
              <>
                {evmSeries.map((item) => (
                  <LegendItem key={item.key} color={item.color} label={item.label} off={evmHidden.hidden.has(item.key)} onToggle={() => evmHidden.toggle(item.key)} />
                ))}
              </>
            ) : undefined
          }
          csv={
            canViewAmounts
              ? {
                  fileName: `evm-${project.code}`,
                  rows: evm.months,
                  columns: [
                    { header: 'پایان ماه', value: (month) => formatJalaliDate(month.date) },
                    { header: 'PV (ریال)', value: (month) => month.pv },
                    { header: 'EV (ریال)', value: (month) => month.ev },
                    { header: 'AC (ریال)', value: (month) => month.ac },
                  ],
                }
              : undefined
          }
          footer={
            <>
              {canViewAmounts && <ChartStat label="CV (انحراف هزینه)" value={amount(evm.cv)} className={Number(evm.cv) < 0 ? 'tx-wrn' : 'tx-ok'} />}
              {canViewAmounts && <ChartStat label="SV (انحراف زمان)" value={amount(evm.sv)} className={Number(evm.sv) < 0 ? 'tx-err' : 'tx-ok'} />}
              <ChartStat label="CPI" value={<span className="mono">{ratio(evm.cpi)}</span>} className={(evm.cpi ?? 1) < 0.95 ? 'tx-wrn' : undefined} explain={<ExplainButton projectId={project.id} metric="cpi" label="CPI" />} />
              <ChartStat label="SPI" value={<span className="mono">{ratio(evm.spi)}</span>} className={(evm.spi ?? 1) < 0.95 ? 'tx-err' : undefined} explain={<ExplainButton projectId={project.id} metric="spi" label="SPI" />} />
              {canViewAmounts && <ChartStat label="EAC" value={amount(evm.eac)} explain={<ExplainButton projectId={project.id} metric="eac" label="EAC" />} />}
            </>
          }
        >
          {canViewAmounts && evm.months.length > 0 ? (
            <div style={{ padding: '10px 14px 4px' }}>
              <TimeSeriesChart
                dates={evm.months.map((month) => month.date)}
                series={evmSeries.filter((item) => !evmHidden.hidden.has(item.key))}
                endLabels={{ pv: `PV ${money.format(evm.pv ?? 0)}`, ev: `EV ${money.format(evm.ev ?? 0)}`, ac: `AC ${money.format(evm.ac ?? 0)}` }}
                formatY={(value) => money.format(value)}
                todayDate={data.dataDate}
                height={280}
                ariaLabel={`PV ${money.format(evm.pv ?? 0)}، EV ${money.format(evm.ev ?? 0)} و AC ${money.format(evm.ac ?? 0)} ${money.unit}`}
              />
            </div>
          ) : (
            <p className="t-13 tx6" style={{ padding: 18, margin: 0 }}>
              {canViewAmounts ? 'در این بازه ماهی برای نمایش نیست.' : 'مبالغ PV، EV و AC فقط با مجوز مبالغ دیده می‌شود؛ CPI و SPI نسبت‌اند و زیر نمودار آمده‌اند.'}
            </p>
          )}
        </ChartCard>

        <ChartCard
          icon="list-tree"
          title="گانت فشرده"
          subtitle="دو سطح اول WBS — برنامه‌ای (خاکستری) در برابر واقعی"
          csv={{
            fileName: `gantt-${project.code}`,
            rows: data.gantt.rows,
            columns: [
              { header: 'کد', value: (row) => row.code },
              { header: 'عنوان', value: (row) => row.title },
              { header: 'شروع برنامه', value: (row) => formatJalaliDate(row.plannedStart) },
              { header: 'پایان برنامه', value: (row) => formatJalaliDate(row.plannedFinish) },
              { header: 'شروع واقعی', value: (row) => (row.actualStart ? formatJalaliDate(row.actualStart) : '') },
              { header: 'پیشرفت واقعی', value: (row) => row.actualPercent },
            ],
          }}
          footer={
            <>
              <LegendItem color="#D4D4D8" label="برنامه‌ای" />
              <LegendItem color={STATUS_COLOR.completed.bar} label="تمام‌شده" />
              <LegendItem color={STATUS_COLOR.on_track.bar} label="طبق برنامه" />
              <LegendItem color={STATUS_COLOR.warning.bar} label="هشدار" />
              <LegendItem color={STATUS_COLOR.critical.bar} label="بحرانی" />
              <span className="row g4 t-12 tx6">
                <span style={{ width: 8, height: 8, background: '#E07A2C', transform: 'rotate(45deg)' }} />
                نقطهٔ عطف
              </span>
            </>
          }
        >
          <CompactGantt start={data.gantt.start} finish={data.gantt.finish} rows={data.gantt.rows} today={data.dataDate} />
        </ChartCard>
      </div>
    </Content>
  );
}
