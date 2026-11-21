import { useState } from 'react';
import { Link } from 'react-router-dom';

import { WBS_PROGRESS_STATUS } from '@/config/constants';
import { ROUTES, WBS_DEEP_LINKS } from '@/config/routes';
import { Content } from '@/shared/components/layout/AppShell';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { AppButton, LinkButton } from '@/shared/components/ui/AppButton';
import { Avatar } from '@/shared/components/ui/Avatar';
import { Badge } from '@/shared/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/shared/components/ui/Card';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { KeyValue } from '@/shared/components/ui/KeyValue';
import { useHasPermission } from '@/shared/hooks/useHasAccess';
import { formatJalaliDate, formatRelativeTime } from '@/shared/utils/date';
import { formatPercentAuto, toFaDigits } from '@/shared/utils/num';
import { moneyScale } from '../../components/analytics/money';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { ExplainButton } from '@/modules/progress/components/ExplainButton';
import { useGetWbsItemQuery } from '@/modules/wbs/api/wbsApi';
import { useGetRiskChartsQuery } from '../../api/analyticsApi';
import { ChartCard } from '../../components/analytics/ChartCard';
import { deviationLook, DeviationTreemap, STATUS_COLOR } from '../../components/analytics/Visuals';
import type { TreemapLeafDto } from '../../types/analytics';
import { ChartMetaBanner, useChartsContext } from './ChartsLayout';

const signed = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatPercentAuto(Math.abs(value))}`;
const LEGEND: Array<{ bg: string; label: string }> = [
  { bg: '#DC2626', label: 'بحرانی ≤ −۲۵٪' },
  { bg: STATUS_COLOR.critical.bg, label: 'بحرانی' },
  { bg: STATUS_COLOR.warning.bg, label: 'هشدار' },
  { bg: STATUS_COLOR.on_track.bg, label: 'طبق برنامه' },
  { bg: STATUS_COLOR.completed.bg, label: 'تمام‌شده یا جلوتر' },
  { bg: STATUS_COLOR.not_started.bg, label: 'شروع‌نشده' },
  { bg: '#E4E4E7', label: 'خارج از مبنا' },
];

/** W24 — ریسک و انحراف (charts.md ۶.۶): treemap، پنل آیتم، ۱۰ آیتم پرتأخیر، توزیع وضعیت. */
export default function RiskChartsPage() {
  const { project, canViewAmounts } = useChartsContext();
  const query = useGetRiskChartsQuery({ projectId: project.id, preset: 'all', canViewAmounts });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const data = query.data;

  if (query.isLoading) return <Content><SkeletonTable rows={10} /></Content>;
  if (query.isError || !data)
    return (
      <Content>
        <EmptyState inCard icon="server" title="نمودار ریسک بارگذاری نشد" description={getApiErrorMessage(query.error, 'چند لحظهٔ دیگر دوباره امتحان کنید.')} actions={<AppButton size="sm" variant="primary" icon="refresh-cw" onClick={() => void query.refetch()}>تلاش دوباره</AppButton>} />
      </Content>
    );

  const k = data.kpis;
  const worst = [...data.leaves].filter((leaf) => leaf.status !== 'completed').sort((a, b) => a.deviation - b.deviation).slice(0, 10);
  const selected = data.leaves.find((leaf) => leaf.id === selectedId) ?? worst[0] ?? null;

  const columns: Array<Column<TreemapLeafDto>> = [
    { key: 'rank', header: '#', width: 36, render: (_row, index) => <span className="t-12 tx5">{toFaDigits(index + 1)}</span> },
    {
      key: 'item',
      header: 'آیتم',
      minWidth: 220,
      render: (row) => (
        <button type="button" className="col" style={{ textAlign: 'start' }} onClick={() => setSelectedId(row.id)}>
          <span className="t-13 fw5 tx9">{row.title}</span>
          <span className="t-xs tx5 row g4">
            <span className="mono">{row.code}</span>
            {row.riskCodes.length > 0 && <span className="tx-err">{row.riskCodes.join('، ')}</span>}
          </span>
        </button>
      ),
    },
    {
      key: 'sup',
      header: 'سرپرست',
      minWidth: 130,
      render: (row) =>
        row.supervisor ? (
          <span className="row g6 t-12">
            <Avatar name={row.supervisor.fullName} tone={row.supervisor.avatarTone ?? 'a1'} size="s" />
            {row.supervisor.fullName}
          </span>
        ) : (
          <span className="tx5">—</span>
        ),
    },
    { key: 'pct', header: 'واقعی / برنامه', minWidth: 100, render: (row) => <span className="t-12">{`${formatPercentAuto(row.actualPercent)} از ${formatPercentAuto(row.plannedPercent)}`}</span> },
    { key: 'dev', header: 'انحراف', minWidth: 70, render: (row) => <span className="t-12 fw6" style={{ color: deviationLook(row).fg === '#FFFFFF' ? '#B91C1C' : deviationLook(row).fg }}>{signed(row.deviation)}</span> },
    { key: 'delay', header: 'تأخیر', minWidth: 70, render: (row) => <span className="t-12">{row.delayDays ? `${toFaDigits(row.delayDays)} روز` : '—'}</span> },
    {
      key: 'act',
      header: 'اقدام',
      minWidth: 120,
      render: (row) => (
        <Link className="link t-12" to={WBS_DEEP_LINKS.newRisk(project.id, row.id)}>
          ثبت اقدام اصلاحی
        </Link>
      ),
    },
  ];

  return (
    <Content>
      <ChartMetaBanner meta={data} />
      <div className="strip c6">
        <div>
          <span className="t-sm tx5">آیتم‌های برگ WBS</span>
          <span className="stat-v">{toFaDigits(k.leafCount)}</span>
          <span className="t-sm tx5">{`در ${toFaDigits(k.groupCount)} بخش اصلی`}</span>
        </div>
        <div>
          <span className="t-sm tx5">تأخیر بحرانی</span>
          <span className="stat-v tx-err">{toFaDigits(k.critical)}</span>
          <span className="t-sm tx5">انحراف از آستانهٔ بحرانی</span>
        </div>
        <div>
          <span className="t-sm tx5">با تأخیر</span>
          <span className="stat-v tx-wrn">{toFaDigits(k.late)}</span>
          <span className="t-sm tx5">بین آستانهٔ هشدار و بحرانی</span>
        </div>
        <div>
          <span className="t-sm tx5">تمام‌شده</span>
          <span className="stat-v tx-ok">{toFaDigits(k.done)}</span>
          <span className="t-sm tx5">{`${formatPercentAuto(k.doneWeightPercent)} از وزن پروژه`}</span>
        </div>
        <div>
          <span className="t-sm tx5 row g4">
            شاخص عملکرد زمانی (SPI)
            <ExplainButton projectId={project.id} metric="spi" label="SPI" />
          </span>
          <span className={`stat-v mono ${(k.spi ?? 1) < 0.95 ? 'tx-err' : ''}`}>{k.spi == null ? '—' : k.spi.toFixed(2)}</span>
          {k.pv && k.ev && <span className="t-sm tx5">{`PV ${moneyScale([k.pv]).format(k.pv)} · EV ${moneyScale([k.pv]).format(k.ev)} ${moneyScale([k.pv]).unit}`}</span>}
        </div>
        <div>
          <span className="t-sm tx5">تأخیر پیش‌بینی‌شدهٔ پایان</span>
          <span className={`stat-v ${(k.delayWorkingDays ?? 0) > 0 ? 'tx-wrn' : ''}`}>{k.delayWorkingDays == null ? '—' : `${toFaDigits(Math.max(0, k.delayWorkingDays))} روز`}</span>
          <span className="t-sm tx5">{k.forecastFinish ? `پایان: ${formatJalaliDate(k.forecastFinish)}` : ''}</span>
        </div>
      </div>

      <div className="charts-risk">
        <ChartCard
          icon="layout-grid"
          title="نقشهٔ حرارتی انحراف (Treemap WBS)"
          subtitle="اندازهٔ هر خانه = وزن آیتم در پروژه · رنگ = انحراف از برنامه · روی هر خانه بزنید تا جزئیات باز شود"
          csv={{
            fileName: `deviation-${project.code}`,
            rows: data.leaves,
            columns: [
              { header: 'کد', value: (row) => row.code },
              { header: 'عنوان', value: (row) => row.title },
              { header: 'وزن', value: (row) => row.weight },
              { header: 'برنامه', value: (row) => row.plannedPercent },
              { header: 'واقعی', value: (row) => row.actualPercent },
              { header: 'انحراف', value: (row) => row.deviation },
              { header: 'وضعیت', value: (row) => WBS_PROGRESS_STATUS[row.status] },
              { header: 'خارج از مبنا', value: (row) => (row.outOfBaseline ? 'بله' : '') },
            ],
          }}
          footer={
            <span className="row wrap g12">
              {LEGEND.map((entry) => (
                <span key={entry.label} className="row g4 t-12 tx6">
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: entry.bg, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)' }} />
                  {entry.label}
                </span>
              ))}
            </span>
          }
        >
          <div style={{ padding: 12 }}>
            <DeviationTreemap leaves={data.leaves} selectedId={selected?.id ?? null} onSelect={(leaf) => setSelectedId(leaf.id)} />
          </div>
        </ChartCard>
        {selected && <ItemPanel projectId={project.id} leaf={selected} />}
      </div>

      <div className="charts-two" style={{ marginTop: 16 }}>
        <ChartCard
          icon="alert-triangle"
          iconClassName="tx-err"
          title="۱۰ آیتم با بیشترین تأخیر"
          subtitle="مرتب‌شده بر اساس انحراف، با اقدام سریع برای هر آیتم"
          action={
            <Link className="link t-12" to={ROUTES.wbs(project.id)}>
              مشاهدهٔ همه در WBS
            </Link>
          }
        >
          <DataTable rows={worst} columns={columns} getRowId={(row) => row.id} minWidth={760} caption="آیتم‌های پرتأخیر" />
        </ChartCard>

        <ChartCard
          icon="layers"
          title="توزیع وضعیت آیتم‌ها"
          subtitle="همهٔ برگ‌های WBS، و به تفکیک بخش اصلی"
          csv={{ fileName: `status-${project.code}`, rows: data.distribution, columns: [{ header: 'وضعیت', value: (row) => WBS_PROGRESS_STATUS[row.status] }, { header: 'تعداد', value: (row) => row.count }, { header: 'درصد', value: (row) => row.percent }] }}
        >
          <CardBody className="col g14">
            <div className="row" style={{ height: 16, borderRadius: 6, overflow: 'hidden', background: '#F4F4F5' }} aria-label={data.distribution.map((entry) => `${WBS_PROGRESS_STATUS[entry.status]} ${toFaDigits(entry.count)}`).join('، ')}>
              {data.distribution.map((entry) => (
                <span key={entry.status} title={`${WBS_PROGRESS_STATUS[entry.status]}: ${toFaDigits(entry.count)}`} style={{ width: `${entry.percent}%`, background: STATUS_COLOR[entry.status].bar }} />
              ))}
            </div>
            <div className="row wrap g12">
              {data.distribution
                .filter((entry) => entry.count > 0)
                .map((entry) => (
                  <span key={entry.status} className="row g4 t-12">
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_COLOR[entry.status].bar }} />
                    {WBS_PROGRESS_STATUS[entry.status]} <strong>{toFaDigits(entry.count)}</strong>
                    <span className="tx5">{`(${formatPercentAuto(entry.percent)})`}</span>
                  </span>
                ))}
            </div>
            <div className="col g10" style={{ borderTop: '1px solid #F4F4F5', paddingTop: 12 }}>
              {data.groups.map((group) => {
                const total = Object.values(group.counts).reduce((sum, value) => sum + value, 0) || 1;
                return (
                  <div key={group.code} className="col g4">
                    <span className="row between t-12">
                      <span>
                        <span className="mono tx5">{group.code}</span> <span className="fw5 tx8">{group.title}</span>
                      </span>
                      <span className="tx6">{`${toFaDigits(total)} آیتم · انحراف ${signed(group.deviation)}`}</span>
                    </span>
                    <div className="row" style={{ height: 10, borderRadius: 5, overflow: 'hidden', background: '#F4F4F5' }}>
                      {(Object.keys(group.counts) as Array<keyof typeof group.counts>).map((status) => (
                        <span key={status} style={{ width: `${(group.counts[status] / total) * 100}%`, background: STATUS_COLOR[status].bar }} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </ChartCard>
      </div>
    </Content>
  );
}

/** پنل آیتم انتخاب‌شده — «ثبت اقدام اصلاحی» = ریسک تازه با پیوند به برگ (تصمیم 1405/08/15). */
function ItemPanel({ projectId, leaf }: { projectId: string; leaf: TreemapLeafDto }) {
  const canCreateRisk = useHasPermission('risk.create');
  const detail = useGetWbsItemQuery({ projectId, itemId: leaf.id });
  const last = detail.data?.reports.recent[0];
  const look = deviationLook(leaf);
  return (
    <Card>
      <CardHeader title="آیتم انتخاب‌شده" />
      <CardBody className="col g12">
        <span className="row wrap g6">
          <span className="mono t-12 tx5">{leaf.code}</span>
          <Badge tone={leaf.status === 'critical' ? 'err' : leaf.status === 'warning' ? 'wrn' : leaf.status === 'completed' || leaf.status === 'ahead' ? 'ok' : 'neu'}>{leaf.outOfBaseline ? 'خارج از مبنا' : WBS_PROGRESS_STATUS[leaf.status]}</Badge>
        </span>
        <span className="t-16 fw6 tx9">{leaf.title}</span>
        <span className="t-12 tx6">{`${leaf.groupTitle} · وزن در پروژه ${formatPercentAuto(leaf.weight)}`}</span>
        <div className="row g8" style={{ padding: '10px 12px', borderRadius: 10, background: look.bg }}>
          <span className="t-13" style={{ color: look.fg }}>
            واقعی <strong style={{ fontSize: 18 }}>{formatPercentAuto(leaf.actualPercent)}</strong> از برنامهٔ {formatPercentAuto(leaf.plannedPercent)}
          </span>
          <span className="fw7" style={{ color: look.fg, marginInlineStart: 'auto' }}>
            {signed(leaf.deviation)}
          </span>
        </div>
        <KeyValue label="پایان برنامه" value={formatJalaliDate(leaf.plannedFinish)} />
        <KeyValue label="پیش‌بینی پایان" value={leaf.forecastFinish ? formatJalaliDate(leaf.forecastFinish) : '—'} />
        <KeyValue label="تأخیر" value={leaf.delayDays ? `${toFaDigits(leaf.delayDays)} روز` : '—'} />
        <KeyValue
          label="سرپرست"
          value={
            leaf.supervisor ? (
              <span className="row g6">
                <Avatar name={leaf.supervisor.fullName} tone={leaf.supervisor.avatarTone ?? 'a1'} size="s" />
                {leaf.supervisor.fullName}
              </span>
            ) : (
              'تخصیص‌نیافته'
            )
          }
        />
        <KeyValue
          label="ریسک مرتبط"
          value={
            leaf.riskCodes.length ? (
              <Link className="link" to={WBS_DEEP_LINKS.risks(projectId, leaf.id)}>
                {leaf.riskCodes.join('، ')}
              </Link>
            ) : (
              '—'
            )
          }
        />
        <KeyValue label="آخرین گزارش کارگاه" value={last ? `${formatPercentAuto(last.fromPercent)} ← ${formatPercentAuto(last.toPercent)} · ${formatRelativeTime(last.submittedAt)}` : '—'} />
        <span className="row wrap g8 no-print">
          {canCreateRisk && (
            <LinkButton to={WBS_DEEP_LINKS.newRisk(projectId, leaf.id)} variant="primary" size="sm" icon="shield-alert" className="grow">
              ثبت اقدام اصلاحی
            </LinkButton>
          )}
          <LinkButton to={ROUTES.wbsItem(projectId, leaf.id)} variant="outline" size="sm" className="grow">
            مشاهده در WBS
          </LinkButton>
        </span>
      </CardBody>
    </Card>
  );
}
