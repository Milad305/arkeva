import { Link } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { Content } from '@/shared/components/layout/AppShell';
import { TimeSeriesChart } from '@/shared/components/charts/TimeSeriesChart';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton, LinkButton } from '@/shared/components/ui/AppButton';
import { Avatar } from '@/shared/components/ui/Avatar';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { Icon } from '@/shared/components/ui/Icon';
import { useHasPermission } from '@/shared/hooks/useHasAccess';
import { formatJalaliDate } from '@/shared/utils/date';
import { formatPercentAuto, toFaDigits } from '@/shared/utils/num';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { useGetResourceChartsQuery, useReassignApproverMutation, useRemindApproverMutation } from '../../api/analyticsApi';
import { ChartCard, LegendItem } from '../../components/analytics/ChartCard';
import { ReportHeatmap } from '../../components/analytics/Visuals';
import type { WorkloadRowDto } from '../../types/analytics';
import { ChartMetaBanner, useChartsContext } from './ChartsLayout';

const fa1 = (value: number) => toFaDigits(String(Math.round(value * 10) / 10)).replace('.', '٫');
const signed = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatPercentAuto(Math.abs(value))}`;

/** W23 — منابع و سرپرستان (charts.md ۶.۵). بخش «کمبود نیرو به تفکیک تخصص» نیست (OD-05، AC-CH-06). */
export default function ResourcesChartsPage() {
  const { project, preset } = useChartsContext();
  const canReassign = useHasPermission('report.approve.stage2');
  const query = useGetResourceChartsQuery({ projectId: project.id, preset, canViewAmounts: false });
  const [remind, remindState] = useRemindApproverMutation();
  const [reassign, reassignState] = useReassignApproverMutation();
  const data = query.data;

  if (query.isLoading) return <Content><SkeletonTable rows={10} /></Content>;
  if (query.isError || !data)
    return (
      <Content>
        <EmptyState inCard icon="server" title="نمودار منابع بارگذاری نشد" description={getApiErrorMessage(query.error, 'چند لحظهٔ دیگر دوباره امتحان کنید.')} actions={<AppButton size="sm" variant="primary" icon="refresh-cw" onClick={() => void query.refetch()}>تلاش دوباره</AppButton>} />
      </Content>
    );

  const k = data.kpis;
  const maxHours = Math.max(k.targetHours * 1.5, ...data.approvers.map((entry) => entry.p90Hours));
  const pendingTotal = data.pendingByAge.under24 + data.pendingByAge.between24and48 + data.pendingByAge.over48 || 1;

  const columns: Array<Column<WorkloadRowDto>> = [
    {
      key: 'user',
      header: 'سرپرست',
      minWidth: 180,
      render: (row) => (
        <span className="row g8">
          <Avatar name={row.user.fullName} tone={row.user.avatarTone ?? 'a1'} size="m" />
          <span className="col">
            <span className="t-13 fw6 tx9">{row.user.fullName}</span>
            <span className="t-xs tx5">{row.area ?? 'بدون تخصیص'}</span>
          </span>
        </span>
      ),
    },
    { key: 'acts', header: 'فعالیت باز / تمام‌شده', minWidth: 120, render: (row) => <span className="t-12">{`${toFaDigits(row.openLeaves)} باز · ${toFaDigits(row.doneLeaves)} تمام‌شده`}</span> },
    { key: 'reports', header: 'گزارش‌ها', minWidth: 70, render: (row) => <span className="t-12 fw6">{toFaDigits(row.reports)}</span> },
    {
      key: 'progress',
      header: 'واقعی / برنامه',
      minWidth: 110,
      render: (row) => <span className="t-12">{row.actualPercent == null ? '—' : `${formatPercentAuto(row.actualPercent)} از ${formatPercentAuto(row.plannedPercent ?? 0)}`}</span>,
    },
    {
      key: 'dev',
      header: 'انحراف',
      minWidth: 70,
      render: (row) => (row.deviation == null ? <span className="tx5">—</span> : <span className={`t-12 fw6 ${row.deviation <= -15 ? 'tx-err' : row.deviation < -5 ? 'tx-wrn' : row.deviation > 0 ? 'tx-ok' : 'tx-pri'}`}>{signed(row.deviation)}</span>),
    },
    {
      key: 'flag',
      header: 'نکته',
      minWidth: 200,
      render: (row) =>
        row.flag ? (
          <span className="row g4 t-12 tx-wrn">
            <Icon name={row.flag.icon} size={12} />
            {row.flag.text}
          </span>
        ) : (
          <span className="tx5">—</span>
        ),
    },
  ];

  return (
    <Content>
      <ChartMetaBanner meta={data} rangeLabel={data.range.label} closedPeriod={data.range.closedPeriod} />
      <div className="strip c5">
        <div>
          <span className="t-sm tx5">گزارش‌های ثبت‌شده</span>
          <span className="stat-v">{toFaDigits(k.reportCount)}</span>
          <span className="t-sm tx5">{`میانگین ${fa1(k.perWorkingDay)} در هر روز کاری`}</span>
        </div>
        <div>
          <span className="t-sm tx5">پوشش گزارش روزانه</span>
          <span className={`stat-v ${k.coveragePercent < 75 ? 'tx-err' : k.coveragePercent < 90 ? 'tx-wrn' : ''}`}>{formatPercentAuto(k.coveragePercent)}</span>
          <span className="t-sm tx5">{`${toFaDigits(k.supervisorsWithWork)} سرپرست با کار باز · ${toFaDigits(k.workingDays)} روز کاری`}</span>
        </div>
        <div>
          <span className="t-sm tx5">در انتظار تأیید</span>
          <span className="stat-v">{toFaDigits(k.pending)}</span>
          <span className={`t-sm ${k.pendingOverdue ? 'tx-wrn' : 'tx5'}`}>{`${toFaDigits(k.pendingOverdue)} آیتم بیش از ۲۴ ساعت`}</span>
        </div>
        <div>
          <span className="t-sm tx5">میانگین زمان تأیید</span>
          <span className={`stat-v ${k.avgApprovalHours > k.targetHours ? 'tx-wrn' : ''}`}>{`${fa1(k.avgApprovalHours)} ساعت`}</span>
          <span className="t-sm tx5">{`هدف: کمتر از ${toFaDigits(k.targetHours)} ساعت`}</span>
        </div>
        <div>
          <span className="t-sm tx5">میانگین نفرات روزانه</span>
          <span className="stat-v">{`${toFaDigits(k.avgCrew)} نفر`}</span>
          <span className="t-sm tx5">{`برگشت برای اصلاح ${formatPercentAuto(k.returnRatePercent)} · ${toFaDigits(k.returnCount)} مورد`}</span>
        </div>
      </div>

      <ChartCard
        icon="users"
        title="توزیع کار بین سرپرست‌ها"
        subtitle="فعالیت‌های تخصیص‌یافته، گزارش‌های بازه و پیشرفت واقعی در برابر برنامه"
        csv={{
          fileName: `workload-${project.code}`,
          rows: data.workload,
          columns: [
            { header: 'سرپرست', value: (row) => row.user.fullName },
            { header: 'فعالیت باز', value: (row) => row.openLeaves },
            { header: 'تمام‌شده', value: (row) => row.doneLeaves },
            { header: 'گزارش', value: (row) => row.reports },
            { header: 'واقعی', value: (row) => row.actualPercent },
            { header: 'برنامه', value: (row) => row.plannedPercent },
          ],
        }}
      >
        <DataTable rows={data.workload} columns={columns} getRowId={(row) => row.user.id} minWidth={820} caption="توزیع کار سرپرستان" />
        {data.redistribution && (
          <div style={{ padding: '10px 16px' }}>
            <Alert tone="inf" icon="lightbulb" action={<LinkButton size="xs" variant="outline" to={ROUTES.assignment(project.id)}>بازکردن تخصیص</LinkButton>}>
              <strong>پیشنهاد توزیع مجدد: </strong>
              {data.redistribution}
            </Alert>
          </div>
        )}
      </ChartCard>

      <div className="charts-two" style={{ marginTop: 16 }}>
        <ChartCard
          icon="clock"
          title="زمان متوسط تأیید گزارش"
          subtitle="از ارسال سرپرست تا تأیید · شناسایی گلوگاه"
          legend={
            <>
              <LegendItem color="#2C4A73" label="میانگین" />
              <LegendItem color="#C7D3E3" label="صدک ۹۰" />
              <LegendItem color="#DC2626" label="هدف" dashed />
            </>
          }
          csv={{
            fileName: `approvers-${project.code}`,
            rows: data.approvers,
            columns: [
              { header: 'تأییدکننده', value: (row) => row.user.fullName },
              { header: 'میانگین ساعت', value: (row) => row.avgHours },
              { header: 'صدک ۹۰', value: (row) => row.p90Hours },
              { header: 'تصمیم‌ها', value: (row) => row.decisions },
              { header: 'در انتظار', value: (row) => row.pending },
            ],
          }}
        >
          <div className="col g12" style={{ padding: 18 }}>
            {data.approvers.map((entry) => (
              <div key={entry.user.id} className="col g4">
                <div className="row between t-12">
                  <span className="row g6">
                    <span className={entry.bottleneck ? 'fw6 tx-err' : 'fw5 tx8'}>{entry.user.fullName}</span>
                    <span className="tx5">{entry.area ?? ''}</span>
                  </span>
                  <span className="tx6">{`${fa1(entry.avgHours)} ساعت · ${toFaDigits(entry.decisions)} تصمیم · ${toFaDigits(entry.pending)} در انتظار`}</span>
                </div>
                <div style={{ position: 'relative', height: 14, borderRadius: 4, background: '#F4F4F5' }} aria-label={`میانگین ${fa1(entry.avgHours)} ساعت، صدک ۹۰ ${fa1(entry.p90Hours)} ساعت`}>
                  <span style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: `${(entry.p90Hours / maxHours) * 100}%`, background: '#C7D3E3', borderRadius: 4 }} />
                  <span style={{ position: 'absolute', top: 3, bottom: 3, right: 0, width: `${(entry.avgHours / maxHours) * 100}%`, background: entry.bottleneck ? '#DC2626' : '#2C4A73', borderRadius: 3 }} />
                  <span style={{ position: 'absolute', top: -3, bottom: -3, width: 0, borderInlineStart: '2px dashed #DC2626', right: `${(k.targetHours / maxHours) * 100}%` }} />
                </div>
              </div>
            ))}
            <div className="col g6" style={{ borderTop: '1px solid #F4F4F5', paddingTop: 12 }}>
              <span className="t-12 fw6 tx8">{`${toFaDigits(k.pending)} آیتم در انتظار تأیید بر اساس مدت انتظار`}</span>
              <div className="row" style={{ height: 12, borderRadius: 6, overflow: 'hidden', background: '#F4F4F5' }}>
                <span style={{ width: `${(data.pendingByAge.under24 / pendingTotal) * 100}%`, background: '#8AA2C2' }} />
                <span style={{ width: `${(data.pendingByAge.between24and48 / pendingTotal) * 100}%`, background: '#D97706' }} />
                <span style={{ width: `${(data.pendingByAge.over48 / pendingTotal) * 100}%`, background: '#DC2626' }} />
              </div>
              <span className="row wrap g12 t-12 tx6">
                <LegendItem color="#8AA2C2" label={`کمتر از ۲۴ ساعت · ${toFaDigits(data.pendingByAge.under24)}`} />
                <LegendItem color="#D97706" label={`۲۴ تا ۴۸ ساعت · ${toFaDigits(data.pendingByAge.between24and48)}`} />
                <LegendItem color="#DC2626" label={`بیش از ۴۸ ساعت · ${toFaDigits(data.pendingByAge.over48)}`} />
              </span>
            </div>
            {data.bottleneck && (
              <Alert tone="wrn" icon="alert-triangle">
                <span className="col g8">
                  <span>
                    <strong>گلوگاه تأیید: {data.bottleneck.fullName}. </strong>
                    {data.bottleneck.text}
                  </span>
                  <span className="row wrap g6 no-print">
                    <AppButton size="xs" variant="outline" icon="bell" loading={remindState.isLoading} onClick={() => void remind({ projectId: project.id, userId: data.bottleneck!.userId })}>
                      ارسال یادآوری
                    </AppButton>
                    {canReassign && (
                      <AppButton
                        size="xs"
                        variant="outline"
                        icon="user-check"
                        loading={reassignState.isLoading}
                        onClick={() => void reassign({ projectId: project.id, userId: data.bottleneck!.userId, substitute: data.bottleneck!.substitute })}
                      >
                        {`واگذاری به ${data.bottleneck.substitute.fullName}`}
                      </AppButton>
                    )}
                    <Link className="link t-12" to={ROUTES.projectReports(project.id)}>
                      مشاهدهٔ صف تأیید
                    </Link>
                  </span>
                </span>
              </Alert>
            )}
          </div>
        </ChartCard>

        <ChartCard icon="alert-triangle" iconClassName="tx-wrn" title="نیاز به توجه" subtitle="از هشدارهای گزارش کارگاه (AL-FLD)">
          <div className="col">
            {data.attention.length === 0 ? (
              <p className="t-13 tx6" style={{ padding: 18, margin: 0 }}>
                مورد نیازمند توجهی در این بازه نیست.
              </p>
            ) : (
              data.attention.map((entry) => (
                <Link key={entry.text} to={entry.link} className="row g8 t-13" style={{ padding: '10px 18px', borderBottom: '1px solid #F4F4F5' }}>
                  <span className={entry.tone === 'err' ? 'tx-err' : 'tx-wrn'} style={{ display: 'inline-flex' }}>
                    <Icon name="alert-triangle" size={14} />
                  </span>
                  <span className="tx8 grow">{entry.text}</span>
                  <Icon name="chevron-left" size={13} className="tx5" />
                </Link>
              ))
            )}
          </div>
        </ChartCard>
      </div>

      <div style={{ marginTop: 16 }}>
        <ChartCard
          icon="calendar"
          title="عملکرد سرپرست‌ها — گزارش روزانه"
          subtitle={`هر خانه = تعداد گزارش ثبت‌شده در آن روز · ${data.range.label} تا ${formatJalaliDate(data.range.to)}`}
          csv={{
            fileName: `heatmap-${project.code}`,
            rows: data.heatmap.rows.flatMap((row) => row.cells.map((cell) => ({ name: row.user.fullName, ...cell }))),
            columns: [
              { header: 'سرپرست', value: (row) => row.name },
              { header: 'تاریخ', value: (row) => formatJalaliDate(row.date) },
              { header: 'گزارش', value: (row) => row.count },
              { header: 'تعطیل', value: (row) => (row.holiday ? 'بله' : '') },
              { header: 'در صف', value: (row) => (row.queued ? 'بله' : '') },
            ],
          }}
        >
          <div style={{ padding: '12px 16px' }}>
            <ReportHeatmap days={data.heatmap.days} rows={data.heatmap.rows} />
          </div>
        </ChartCard>
      </div>

      <div style={{ marginTop: 16 }}>
        <ChartCard
          icon="users"
          title="نفرات حاضر در کارگاه"
          subtitle="جمع نفرات اعلام‌شده در گزارش‌های روزانه (crewCount)"
          csv={{ fileName: `crew-${project.code}`, rows: data.crew, columns: [{ header: 'تاریخ', value: (row) => formatJalaliDate(row.date) }, { header: 'نفرات', value: (row) => row.total }] }}
        >
          <div style={{ padding: '10px 14px 6px' }}>
            <TimeSeriesChart
              dates={data.crew.map((row) => row.date)}
              series={[{ key: 'crew', label: 'نفرات', color: '#8AA2C2', kind: 'bar', values: data.crew.map((row) => row.total) }]}
              formatY={(value) => toFaDigits(Math.round(value))}
              height={200}
              maxTicks={4}
              ariaLabel={`میانگین ${toFaDigits(k.avgCrew)} نفر در روز`}
            />
          </div>
        </ChartCard>
      </div>
    </Content>
  );
}
