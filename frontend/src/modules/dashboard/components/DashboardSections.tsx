import { useState } from 'react';
import { Link } from 'react-router-dom';

import { RISK_LEVEL, RISK_LEVEL_TONES, WBS_PROGRESS_STATUS, WBS_PROGRESS_STATUS_TONES } from '@/config/constants';
import { ROUTES } from '@/config/routes';
import { RingProgress } from '@/shared/components/charts/RingProgress';
import { SCurveChart } from '@/shared/components/charts/SCurveChart';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Avatar } from '@/shared/components/ui/Avatar';
import { Badge, Delta } from '@/shared/components/ui/Badge';
import { Card, CardFooter, CardHeader } from '@/shared/components/ui/Card';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { Icon } from '@/shared/components/ui/Icon';
import { KpiCard } from '@/shared/components/ui/KpiCard';
import { Legend } from '@/shared/components/ui/Legend';
import { ProgressBar } from '@/shared/components/ui/ProgressBar';
import { downloadCsv, toCsv } from '@/shared/utils/csv';
import { formatJalaliDate, formatRelativeTime } from '@/shared/utils/date';
import { formatPercentAuto, toEnDigits, toFaDigits } from '@/shared/utils/num';
import type { Tone } from '@/shared/types/tone';
import { projectVisual } from '@/modules/projects/services/visuals';
import { formatDeviation, STATUS_COLOR } from '@/modules/wbs/services/progressView';
import { QuickApproveDialog } from '@/modules/reports/components/QuickApproveDialog';
import type { PendingApprovalDto } from '@/modules/reports/types';
import type { DashboardDto, DashboardProjectRow, DashboardRiskDto, RiskMatrixCell } from '../types';

// کارت‌های W05 (`features/charts.md` ۶.۱). همه فقط نمایش‌اند؛ اعداد، دسته‌بندی‌ها و
// میانگین‌ها از `GET /dashboard` می‌آیند (D07، AC-CH-09).

function SeeAll({ to, label = 'مشاهدهٔ همه' }: { to: string; label?: string }) {
  return (
    <Link className="link" to={to}>
      {label}
      <Icon name="chevron-left" size={12} />
    </Link>
  );
}

/** فلش تغییر نسبت به ماه گذشته (تصمیم 1405/08/15، مثل W07). */
function MonthDelta({ value, goodWhenUp }: { value: number | null; goodWhenUp: boolean }) {
  if (value === null || value === 0) return null;
  const up = value > 0;
  const tone: Tone = up === goodWhenUp ? 'ok' : 'err';
  return (
    <Delta tone={tone} direction={up ? 'up' : 'down'}>
      {toFaDigits(Math.abs(value))}
    </Delta>
  );
}

// ── کارت‌های شاخص ──

export function DashboardKpis({
  kpis,
  pending,
  showPending,
}: {
  kpis: DashboardDto['kpis'];
  pending: DashboardDto['pendingApprovals'];
  showPending: boolean;
}) {
  const cards = 3 + (showPending && pending ? 1 : 0);
  const avgColor = kpis.avgStatus ? STATUS_COLOR[kpis.avgStatus] : '#A1A1AA';

  return (
    <div className={`grid rsp c${cards}`} style={{ marginBottom: 18 }}>
      <KpiCard
        label="پروژه‌های فعال"
        icon="folder-kanban"
        tone="pri"
        value={toFaDigits(kpis.activeCount)}
        delta={<MonthDelta value={kpis.activeDelta} goodWhenUp />}
        hint={
          <span className="row between">
            <span>نسبت به ماه گذشته</span>
            <span className="tx7">از {toFaDigits(kpis.totalCount)} پروژه</span>
          </span>
        }
      />

      {showPending && pending && (
        <KpiCard
          label="گزارش‌های در انتظار تأیید من"
          icon="clock"
          tone="inf"
          value={toFaDigits(pending.total)}
          hint={
            <span className="row between">
              <span className={pending.overdue > 0 ? 'tx-wrn' : undefined}>
                {pending.overdue > 0
                  ? `${toFaDigits(pending.overdue)} مورد از مهلت گذشته`
                  : 'هیچ موردی معوق نیست'}
              </span>
              <SeeAll to={`${ROUTES.reports}?stage=mine`} label="بررسی همه" />
            </span>
          }
        />
      )}

      <KpiCard
        label="پروژه‌های در خطر"
        icon="alert-triangle"
        tone="err"
        value={toFaDigits(kpis.atRiskCount)}
        valueClassName={kpis.atRiskCount > 0 ? 'tx-err' : undefined}
        delta={<MonthDelta value={kpis.atRiskDelta} goodWhenUp={false} />}
        hint={
          <Link className="link" to={`${ROUTES.projects}?status=at_risk`} style={{ color: 'inherit' }}>
            بیش از ۱۵٪ عقب از برنامه یا CPI کمتر از ۰٫۹
          </Link>
        }
      />

      <KpiCard
        label="میانگین پیشرفت"
        icon="trending-up"
        tone="ok"
        value={kpis.avgActualPercent === null ? '—' : formatPercentAuto(kpis.avgActualPercent)}
        delta={<MonthDelta value={kpis.avgActualDelta} goodWhenUp />}
        visual={
          kpis.avgActualPercent !== null ? (
            <RingProgress value={kpis.avgActualPercent} color={avgColor} label={formatPercentAuto(kpis.avgActualPercent, 0)} />
          ) : undefined
        }
        hint={
          kpis.avgPlannedPercent !== null ? (
            <>
              در برابر <strong className="tx7">{formatPercentAuto(kpis.avgPlannedPercent)}</strong> برنامه‌ای · میانگین ساده
            </>
          ) : (
            'پروژهٔ فعالی با گزارش تأییدشده نیست'
          )
        }
      />
    </div>
  );
}

// ── پروژه‌های فعال ──

export function ActiveProjectsCard({ projects }: { projects: DashboardProjectRow[] }) {
  const columns: Column<DashboardProjectRow>[] = [
    {
      key: 'name',
      header: 'پروژه',
      minWidth: 180,
      render: (row) => {
        const visual = projectVisual(row.projectTypeId);
        return (
          <Link className="row g10" to={ROUTES.project(row.id)}>
            <span className="thumb sm" style={{ background: visual.tint }}>
              <Icon name={visual.icon} size={14} />
            </span>
            <span className="col" style={{ minWidth: 0 }}>
              <span className="fw6 tx9 trunc">{row.name}</span>
              <span className="t-xs tx5 trunc">{row.clientName}</span>
            </span>
          </Link>
        );
      },
    },
    {
      key: 'progress',
      header: 'پیشرفت (برنامه‌ای / واقعی)',
      minWidth: 170,
      render: (row) => (
        <div className="col g4" style={{ maxWidth: 200 }}>
          <ProgressBar size="thin" value={row.plannedPercent} color="#D4D4D8" trackColor="#F4F4F5" style={{ flex: '0 0 auto' }} />
          <ProgressBar size="thin" value={row.actualPercent} color={STATUS_COLOR[row.status]} style={{ flex: '0 0 auto' }} />
          <span className="row g8 t-xs">
            <span className="tx5">برنامه‌ای {formatPercentAuto(row.plannedPercent)}</span>
            <span className="fw6" style={{ color: STATUS_COLOR[row.status] }}>
              واقعی {formatPercentAuto(row.actualPercent)}
            </span>
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'وضعیت',
      render: (row) => (
        <span className="col g4 ai-s">
          <Badge tone={WBS_PROGRESS_STATUS_TONES[row.status]} dot>
            {WBS_PROGRESS_STATUS[row.status]}
          </Badge>
          {row.atRisk && (
            <Badge size="sm" tone="err" icon="alert-triangle" title="انحراف ≤ −۱۵ یا CPI کمتر از ۰٫۹ (ب24)">
              در خطر
            </Badge>
          )}
        </span>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader icon="folder-kanban" title="پروژه‌های فعال" action={<SeeAll to={`${ROUTES.projects}?status=active`} />} />
      {projects.length === 0 ? (
        <EmptyState icon="folder-kanban" title="پروژهٔ فعالی ندارید" description="پروژه‌های پیش‌نویس پس از فعال‌سازی اینجا می‌آیند." />
      ) : (
        <DataTable rows={projects} columns={columns} getRowId={(row) => row.id} minWidth={440} caption="پروژه‌های فعال" />
      )}
    </Card>
  );
}

// ── مقایسهٔ پیشرفت ──

export function ProgressComparisonCard({ projects }: { projects: DashboardProjectRow[] }) {
  // ترتیب نمایش است، نه محاسبه: انحراف از سرور آمده
  const sorted = [...projects].sort((a, b) => a.deviation - b.deviation);

  return (
    <Card>
      <CardHeader icon="bar-chart-horizontal" title="مقایسهٔ پیشرفت پروژه‌ها" action={<span className="t-sm tx5">مرتب بر اساس انحراف</span>} />
      <div className="col g12" style={{ padding: '14px 16px' }}>
        {sorted.map((project) => (
          <div key={project.id} className="col g4">
            <div className="row between g8">
              <Link className="t-12 fw5 tx8 trunc" to={ROUTES.project(project.id)}>
                {project.name}
              </Link>
              <Badge size="sm" tone={WBS_PROGRESS_STATUS_TONES[project.status]} title={WBS_PROGRESS_STATUS[project.status]}>
                {formatDeviation(project.deviation)}
              </Badge>
            </div>
            <div className="col g2">
              <ProgressBar value={project.plannedPercent} color="#8AA2C2" style={{ height: 7, flex: '0 0 auto' }} label={`${project.name} — برنامه‌ای`} />
              <ProgressBar value={project.actualPercent} color="#1A3354" style={{ height: 7, flex: '0 0 auto' }} label={`${project.name} — واقعی`} />
            </div>
          </div>
        ))}
        <Legend
          entries={[
            { label: 'برنامه‌ای', color: '#8AA2C2' },
            { label: 'واقعی', color: '#1A3354' },
          ]}
          style={{ paddingTop: 8, borderTop: '1px solid #F4F4F5' }}
        />
      </div>
    </Card>
  );
}

// ── در انتظار تأیید من ──

export function PendingApprovalsCard({ pending }: { pending: NonNullable<DashboardDto['pendingApprovals']> }) {
  // W40 همین‌جا باز می‌شود (تصمیم 1405/08/15)
  const [quick, setQuick] = useState<PendingApprovalDto | null>(null);
  return (
    <Card>
      {quick && <QuickApproveDialog projectId={quick.projectId} reportId={quick.reportId} itemId={quick.itemId} onClose={() => setQuick(null)} />}
      <CardHeader
        icon="clipboard-check"
        title={
          <>
            در انتظار تأیید من{' '}
            <Badge size="sm" tone="inf" pill>
              {toFaDigits(pending.total)}
            </Badge>
          </>
        }
        subtitle="قدیمی‌ترین‌ها اول"
      />
      {pending.items.length === 0 ? (
        <EmptyState
          icon="check-circle-2"
          iconStyle={{ background: '#DCFCE7', color: '#15803D' }}
          title="صف تأیید شما خالی است"
          description="گزارش تازه‌ای که به حوزهٔ شما برسد اینجا دیده می‌شود."
        />
      ) : (
        <div className="col">
          {pending.items.map((item) => (
            <div key={item.itemId} className="row g10" style={{ padding: '10px 14px', borderBottom: '1px solid #F4F4F5' }}>
              {item.submittedBy ? (
                <Avatar size="m" name={item.submittedBy.fullName} tone={item.submittedBy.avatarTone} />
              ) : (
                <span className="av m">؟</span>
              )}
              <div className="col grow" style={{ minWidth: 0 }}>
                <span className="t-12 trunc">
                  <strong className="fw6">{item.submittedBy?.fullName ?? 'سرپرست'}</strong> · {item.wbsTitle}
                </span>
                <span className="t-xs tx5 row g4" style={{ minWidth: 0 }}>
                  <Icon name="folder" size={11} />
                  <span className="trunc">{item.projectName}</span>
                  <span>·</span>
                  <span className={item.overdue ? 'tx-wrn fw5 nowrap' : 'nowrap'} title={item.overdue ? 'از مهلت بررسی پروژه گذشته' : undefined}>
                    {formatRelativeTime(item.submittedAt)}
                  </span>
                </span>
              </div>
              <span className="t-12 fw7 tx-ok">{formatPercentAuto(item.toPercent)}</span>
              <AppButton variant="outline" size="xs" onClick={() => setQuick(item)}>
                بررسی
              </AppButton>
            </div>
          ))}
        </div>
      )}
      {pending.total > pending.items.length && (
        <CardFooter style={{ justifyContent: 'center' }}>
          <SeeAll to={`${ROUTES.reports}?stage=mine`} label={`مشاهدهٔ همه (${toFaDigits(pending.total)})`} />
        </CardFooter>
      )}
    </Card>
  );
}

// ── روند کلی پیشرفت ──

export function TrendCard({ trend, dataDate }: { trend: DashboardDto['trend']; dataDate: DashboardDto['dataDate'] }) {
  const exportCsv = () => {
    const csv = toCsv(trend, [
      { header: 'تاریخ', value: (point) => toEnDigits(formatJalaliDate(point.date)) },
      { header: 'برنامه‌ای (میانگین ساده)', value: (point) => point.planned },
      { header: 'واقعی (میانگین ساده)', value: (point) => point.actual },
      { header: 'پیش‌بینی', value: (point) => point.forecast },
    ]);
    downloadCsv('projeyar-portfolio-trend', csv);
  };

  return (
    <Card className="span2">
      <CardHeader
        icon="line-chart"
        iconClassName="tx-pri"
        title="روند کلی پیشرفت — همهٔ پروژه‌ها"
        subtitle="میانگین سادهٔ پروژه‌های فعال"
        action={
          <span className="row wrap g12">
            <Legend
              entries={[
                { label: 'برنامه‌ای', color: '#8AA2C2', shape: 'dash' },
                { label: 'واقعی', color: '#1A3354', thickness: 4 },
                { label: 'پیش‌بینی', color: '#A1A1AA', shape: 'dash' },
              ]}
            />
            <AppButton variant="outline" size="sm" icon="download" onClick={exportCsv} disabled={trend.length === 0}>
              خروجی
            </AppButton>
          </span>
        }
      />
      <div style={{ padding: '12px 12px 8px' }}>
        {trend.length === 0 ? (
          <EmptyState icon="line-chart" title="هنوز روندی نیست" description="با اولین گزارش تأییدشده در پروژه‌های فعال، منحنی ساخته می‌شود." />
        ) : (
          <SCurveChart
            dates={trend.map((point) => point.date)}
            todayDate={dataDate ?? undefined}
            shadeBetween={['planned', 'actual']}
            height={300}
            ariaLabel="روند تجمعی میانگین پیشرفت پروژه‌های فعال"
            series={[
              { key: 'planned', label: 'برنامه‌ای', color: '#8AA2C2', dashed: true, values: trend.map((point) => point.planned) },
              { key: 'forecast', label: 'پیش‌بینی', color: '#A1A1AA', dashed: true, values: trend.map((point) => point.forecast) },
              { key: 'actual', label: 'واقعی', color: '#1A3354', width: 3, dots: true, values: trend.map((point) => point.actual) },
            ]}
          />
        )}
      </div>
    </Card>
  );
}

// ── ریسک‌های مهم و ماتریس ──

const LEVEL_FILL: Record<RiskMatrixCell['level'], { background: string; color: string }> = {
  low: { background: '#EEF2F7', color: '#2C4A73' },
  medium: { background: '#FEF3C7', color: '#B45309' },
  high: { background: '#FEE2E2', color: '#B91C1C' },
  critical: { background: '#FCA5A5', color: '#7F1D1D' },
};

export function RisksCard({ risks }: { risks: NonNullable<DashboardDto['risks']> }) {
  return (
    <Card>
      <CardHeader
        icon="shield-alert"
        iconClassName="tx-err"
        title="ریسک‌های مهم سازمان"
        subtitle={`سطح بالا و بحرانی · ${toFaDigits(risks.totalOpen)} ریسک باز`}
        action={<SeeAll to={ROUTES.risks} label="دفتر ریسک" />}
      />
      {risks.items.length === 0 ? (
        <EmptyState icon="shield-check" title="ریسک بالا یا بحرانی بازی نیست" description="ریسک‌های متوسط و کم در دفتر ریسک هر پروژه‌اند." />
      ) : (
        <div className="col">
          {risks.items.map((risk) => (
            <RiskRow key={risk.id} risk={risk} />
          ))}
        </div>
      )}
      <RiskMatrix cells={risks.matrix} />
      <CardFooter>
        <span className="t-sm tx6">امتیاز = احتمال × اثر (۱ تا ۲۵)</span>
      </CardFooter>
    </Card>
  );
}

function RiskRow({ risk }: { risk: DashboardRiskDto }) {
  const tone = RISK_LEVEL_TONES[risk.level];
  return (
    <Link
      to={ROUTES.riskDetail(risk.projectId, risk.id)}
      className="row g10"
      style={{ padding: '10px 14px', borderBottom: '1px solid #F4F4F5' }}
    >
      <span className={`icb sm ${tone}`} style={{ fontSize: 12, fontWeight: 700 }}>
        {toFaDigits(risk.score)}
      </span>
      <span className="col grow" style={{ minWidth: 0 }}>
        <span className="t-12 fw5 tx8 trunc">{risk.title}</span>
        <span className="t-xs tx5 trunc">
          {risk.projectName} · مالک: {risk.owner.fullName}
        </span>
      </span>
      <Badge size="sm" tone={tone}>
        {RISK_LEVEL[risk.level]}
      </Badge>
    </Link>
  );
}

/**
 * ماتریس ۵×۵ ریسک‌های باز همهٔ پروژه‌ها (تصمیم 1405/08/15). ردیف = اثر (۵ بالا)،
 * ستون = احتمال؛ مثل heatmapها راست‌به‌چپ (CLAUDE.md ۵): احتمال ۱ سمت راست.
 */
function RiskMatrix({ cells }: { cells: RiskMatrixCell[] }) {
  const rows = [5, 4, 3, 2, 1].map((impact) => cells.filter((cell) => cell.impact === impact).sort((a, b) => a.probability - b.probability));

  return (
    <div style={{ padding: '12px 14px 4px' }}>
      <div className="row g6 ai-s">
        <span className="t-xs tx5" style={{ writingMode: 'vertical-rl', alignSelf: 'center' }}>
          اثر ←
        </span>
        <table role="grid" aria-label="ماتریس ریسک‌های باز: احتمال در برابر اثر" style={{ borderCollapse: 'separate', borderSpacing: 3, flex: '1 1 auto' }}>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]?.impact}>
                <th scope="row" className="t-xs tx5" style={{ width: 14, fontWeight: 500 }}>
                  {toFaDigits(row[0]?.impact ?? 0)}
                </th>
                {row.map((cell) => {
                  const fill = LEVEL_FILL[cell.level];
                  return (
                    <td
                      key={cell.probability}
                      aria-label={`احتمال ${toFaDigits(cell.probability)}، اثر ${toFaDigits(cell.impact)}: ${toFaDigits(cell.count)} ریسک`}
                      style={{
                        height: 26,
                        textAlign: 'center',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 700,
                        background: fill.background,
                        color: fill.color,
                        opacity: cell.count === 0 ? 0.45 : 1,
                      }}
                    >
                      {cell.count > 0 ? toFaDigits(cell.count) : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <th />
              {[1, 2, 3, 4, 5].map((probability) => (
                <th key={probability} className="t-xs tx5" style={{ fontWeight: 500 }}>
                  {toFaDigits(probability)}
                </th>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <span className="t-xs tx5" style={{ display: 'block', textAlign: 'center' }}>
        احتمال ←
      </span>
    </div>
  );
}
