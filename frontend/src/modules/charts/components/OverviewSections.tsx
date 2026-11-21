import { Link } from 'react-router-dom';

import {
  RISK_LEVEL_TONES,
  RISK_STATUS,
  RISK_STATUS_TONES,
  WBS_PROGRESS_STATUS,
  WBS_PROGRESS_STATUS_TONES,
} from '@/config/constants';
import { ROUTES } from '@/config/routes';
import { SCurveChart } from '@/shared/components/charts/SCurveChart';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { Avatar } from '@/shared/components/ui/Avatar';
import { Badge } from '@/shared/components/ui/Badge';
import { Card, CardHeader } from '@/shared/components/ui/Card';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { Icon } from '@/shared/components/ui/Icon';
import { IconBox } from '@/shared/components/ui/IconBox';
import { LinkButton } from '@/shared/components/ui/AppButton';
import { Legend } from '@/shared/components/ui/Legend';
import { ProgressBar } from '@/shared/components/ui/ProgressBar';
import { Timeline } from '@/shared/components/ui/Timeline';
import { formatJalaliDate, formatRelativeTime } from '@/shared/utils/date';
import { formatDelta, formatPercentAuto, formatRial, toFaDigits } from '@/shared/utils/num';
import { cn } from '@/shared/utils/cn';
import type { EntityId } from '@/shared/types/api';
import { ExplainButton } from '@/modules/progress/components/ExplainButton';
import type {
  ActivityEventDto,
  CbsConsumptionDto,
  CriticalItemDto,
  FieldTeamTodayDto,
  MilestoneDto,
  ProjectOverviewDto,
  RiskSummaryDto,
} from '../types';
import { ACTIVITY_VIEW, supervisorView } from '../services/overviewText';

const PLANNED_COLOR = '#8AA2C2';
const ACTUAL_COLOR = '#1A3354';
const FORECAST_COLOR = '#A1A1AA';

// ── منحنی S ──

export function SCurveCard({
  projectId,
  overview,
}: {
  projectId: EntityId;
  overview: ProjectOverviewDto;
}) {
  const points = overview.sCurve;
  const { progress, time } = overview;

  return (
    <Card style={{ marginBottom: 16 }}>
      <CardHeader
        icon="line-chart"
        iconClassName="tx-pri"
        title="منحنی پیشرفت (S-Curve)"
        subtitle={
          overview.hasApprovedReports
            ? 'پیشرفت برنامه‌ای، واقعی و پیش‌بینی تا پایان پروژه'
            : 'هنوز گزارشی تأیید نشده؛ منحنی برنامه نشان داده می‌شود'
        }
        action={
          <div className="row g12 wrap">
            <Legend
              entries={[
                { label: 'برنامه‌ای', color: PLANNED_COLOR, shape: 'dash' },
                { label: 'واقعی', color: ACTUAL_COLOR, thickness: 4 },
                { label: 'پیش‌بینی', color: FORECAST_COLOR, shape: 'dash' },
              ]}
            />
            <span className="vsep" />
            <LinkButton to={ROUTES.chartsProgress(projectId)} variant="ghost" size="sm" icon="maximize-2">
              همهٔ نمودارها
            </LinkButton>
          </div>
        }
      />
      <div className="chart" style={{ padding: '12px 12px 8px' }}>
        <SCurveChart
          dates={points.map((point) => point.date)}
          series={[
            { key: 'planned', label: 'برنامه‌ای', color: PLANNED_COLOR, dashed: true, values: points.map((p) => p.planned) },
            { key: 'forecast', label: 'پیش‌بینی', color: FORECAST_COLOR, dashed: true, values: points.map((p) => p.forecast) },
            { key: 'actual', label: 'واقعی', color: ACTUAL_COLOR, width: 3, dots: true, values: points.map((p) => p.actual) },
          ]}
          todayDate={overview.dataDate}
          shadeBetween={['planned', 'actual']}
          ariaLabel={`منحنی S؛ تا ${formatJalaliDate(overview.dataDate)} ${formatPercentAuto(progress.actualPercent)} واقعی در برابر ${formatPercentAuto(progress.plannedPercent)} برنامه‌ای`}
        />
      </div>
      <div
        className="row wrap g24"
        style={{ padding: '10px 18px', background: '#FAFAFA', borderTop: '1px solid #F4F4F5' }}
      >
        <Figure label="پیشرفت واقعی" value={formatPercentAuto(progress.actualPercent)} />
        <Figure
          label="برنامه‌ای امروز"
          value={formatPercentAuto(progress.plannedPercent)}
          explain={<ExplainButton projectId={projectId} metric="planned_percent" label="پیشرفت برنامه‌ای" />}
        />
        <Figure
          label="انحراف"
          value={formatDelta(progress.deviation, progress.deviation % 1 === 0 ? 0 : 1)}
          valueClass={`tx-${WBS_PROGRESS_STATUS_TONES[progress.status]}`}
          explain={<ExplainButton projectId={projectId} metric="deviation" label="انحراف" />}
        />
        <Figure label="پیش‌بینی اتمام" value={formatJalaliDate(time.forecastFinish)} />
        <Figure
          label="تأخیر تخمینی"
          value={
            time.delayWorkingDays === null
              ? '—'
              : time.delayWorkingDays <= 0
                ? 'به‌موقع'
                : `${toFaDigits(time.delayWorkingDays)} روز کاری`
          }
          valueClass={time.delayWorkingDays && time.delayWorkingDays > 0 ? 'tx-wrn' : undefined}
        />
      </div>
    </Card>
  );
}

function Figure({
  label,
  value,
  valueClass,
  explain,
}: {
  label: string;
  value: string;
  valueClass?: string;
  explain?: React.ReactNode;
}) {
  return (
    <span className="col">
      <span className="t-xs tx5 row g2">
        {label}
        {explain}
      </span>
      <span className={cn('num-i', valueClass)}>{value}</span>
    </span>
  );
}

// ── فعالیت‌های بحرانی ──

export function CriticalItemsCard({ projectId, items }: { projectId: EntityId; items: CriticalItemDto[] }) {
  const columns: Column<CriticalItemDto>[] = [
    { key: 'code', header: 'کد', render: (row) => <span className="mono t-sm tx5">{row.code}</span> },
    {
      key: 'title',
      header: 'فعالیت',
      minWidth: 120,
      render: (row) => (
        <Link className="fw5 tx9" to={ROUTES.wbsItem(projectId, row.wbsItemId)}>
          {row.title}
        </Link>
      ),
    },
    {
      key: 'planned',
      header: 'برنامه‌ای',
      render: (row) => <PercentCell value={row.plannedPercent} color="#A1A1AA" muted />,
    },
    {
      key: 'actual',
      header: 'واقعی',
      render: (row) => (
        <PercentCell value={row.actualPercent} color={toneColor(WBS_PROGRESS_STATUS_TONES[row.status])} />
      ),
    },
    {
      key: 'deviation',
      header: 'انحراف',
      render: (row) => (
        <Badge tone={WBS_PROGRESS_STATUS_TONES[row.status]} title={WBS_PROGRESS_STATUS[row.status]}>
          {formatDelta(row.deviation, row.deviation % 1 === 0 ? 0 : 1)}
        </Badge>
      ),
    },
    {
      key: 'supervisor',
      header: 'سرپرست',
      render: (row) =>
        row.supervisor ? (
          <span className="row g6">
            <Avatar name={row.supervisor.fullName} tone={row.supervisor.avatarTone} size="s" />
            <span className="t-12">{row.supervisor.fullName}</span>
          </span>
        ) : (
          <span className="tx5">بدون سرپرست</span>
        ),
    },
  ];

  return (
    <Card>
      <CardHeader
        icon="alert-triangle"
        iconClassName="tx-err"
        title="فعالیت‌های بحرانی WBS"
        subtitle="برگ‌های با بیشترین عقب‌ماندگی از برنامه"
        action={<SeeAll to={ROUTES.wbs(projectId)} />}
      />
      {items.length === 0 ? (
        <EmptyState
          icon="check-circle-2"
          iconStyle={{ background: 'var(--success-50)', color: 'var(--success-700)' }}
          title="هیچ فعالیتی عقب نیست"
          description="همهٔ برگ‌ها طبق برنامه یا جلوتر از آن‌اند."
        />
      ) : (
        <DataTable rows={items} columns={columns} getRowId={(row) => row.wbsItemId} minWidth={500} caption="فعالیت‌های بحرانی" />
      )}
    </Card>
  );
}

// ── بیشترین مصرف CBS ──

export function TopCbsCard({
  projectId,
  items,
  showAmounts,
}: {
  projectId: EntityId;
  items: CbsConsumptionDto[];
  showAmounts: boolean;
}) {
  const columns: Column<CbsConsumptionDto>[] = [
    { key: 'code', header: 'کد', render: (row) => <span className="mono t-sm tx5">{row.code}</span> },
    { key: 'title', header: 'عنوان', minWidth: 130, render: (row) => <span className="fw5 tx9">{row.title}</span> },
    ...(showAmounts
      ? ([
          { key: 'budget', header: 'بودجه', render: (row) => <span className="t-12 tx7 nowrap">{row.budget ? formatRial(row.budget) : '—'}</span> },
          { key: 'ac', header: 'مصرف‌شده', render: (row) => <span className="t-12 fw6 nowrap">{row.ac ? formatRial(row.ac) : '—'}</span> },
        ] satisfies Column<CbsConsumptionDto>[])
      : []),
    {
      key: 'pct',
      header: 'درصد مصرف',
      render: (row) => {
        const color =
          row.consumedPercent > 100
            ? 'var(--error-500)'
            : row.alertSeverity
              ? 'var(--warning-500)'
              : 'var(--primary-700)';
        return (
          <span className="row g8" title={row.consumedPercent > 100 ? 'فراتر از بودجهٔ قلم' : undefined}>
            <span className="t-13 fw7" style={{ color, width: 52 }}>
              {formatPercentAuto(row.consumedPercent)}
            </span>
            <ProgressBar value={row.consumedPercent} size="thin" color={color} style={{ width: 70, flex: '0 0 auto' }} />
          </span>
        );
      },
    },
  ];

  return (
    <Card>
      <CardHeader
        icon="wallet"
        iconClassName="tx-acc"
        title="بیشترین مصرف بودجهٔ CBS"
        subtitle="اقلام هزینه با بالاترین درصد مصرف"
        action={<SeeAll to={ROUTES.cbs(projectId)} />}
      />
      {items.length === 0 ? (
        <EmptyState icon="wallet" title="هنوز هزینه‌ای ثبت نشده" description="با ثبت اولین ردیف دفتر هزینه، مصرف اقلام اینجا می‌آید." />
      ) : (
        <DataTable rows={items} columns={columns} getRowId={(row) => row.cbsItemId} minWidth={showAmounts ? 500 : 340} caption="مصرف بودجهٔ CBS" />
      )}
    </Card>
  );
}

// ── نقاط عطف ──

export function MilestonesCard({ projectId, items }: { projectId: EntityId; items: MilestoneDto[] }) {
  return (
    <Card>
      <CardHeader
        icon="flag-triangle-right"
        iconClassName="tx-acc"
        title="نقاط عطف پیش رو"
        action={
          <Link className="link" to={ROUTES.chartsProgress(projectId)}>
            گانت
          </Link>
        }
      />
      {items.length === 0 ? (
        <EmptyState icon="milestone" title="نقطهٔ عطفی تعریف نشده" description="نقاط عطف کلیدی در گروه «نقاط عطف» درخت WBS تعریف می‌شوند." />
      ) : (
        <div className="col">
          {items.map((item) => (
            <div key={item.wbsItemId} className="row g10 ai-s" style={{ padding: '11px 16px', borderBottom: '1px solid #F4F4F5' }}>
              <IconBox icon="milestone" tone="acc" size="sm" />
              <span className="col g2 grow" style={{ minWidth: 0 }}>
                <span className="t-13 fw5 tx9">{item.title}</span>
                <span className="t-sm tx5">
                  برنامه: {formatJalaliDate(item.plannedDate)} · {milestoneNote(item)}
                </span>
              </span>
              <Badge tone={WBS_PROGRESS_STATUS_TONES[item.status]}>{WBS_PROGRESS_STATUS[item.status]}</Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function milestoneNote(item: MilestoneDto): string {
  if (item.status === 'completed' && item.actualDate) return `انجام شد ${formatJalaliDate(item.actualDate)}`;
  if (item.delayWorkingDays && item.delayWorkingDays > 0) {
    return `${toFaDigits(item.delayWorkingDays)} روز کاری تأخیر پیش‌بینی`;
  }
  return `پیش‌بینی ${formatJalaliDate(item.forecastDate ?? item.plannedDate)}`;
}

// ── ریسک‌های باز ──

export function OpenRisksCard({
  projectId,
  total,
  items,
}: {
  projectId: EntityId;
  total: number;
  items: RiskSummaryDto[];
}) {
  return (
    <Card>
      <CardHeader
        icon="shield-alert"
        iconClassName="tx-err"
        title="ریسک‌های باز پروژه"
        action={
          <Link className="link" to={ROUTES.projectRisks(projectId)}>
            ثبت ریسک‌ها ({toFaDigits(total)})
          </Link>
        }
      />
      {items.length === 0 ? (
        <EmptyState icon="shield-alert" title="ریسک بازی ثبت نشده" description="ریسک‌ها و مشکل‌های کارگاه در دفتر ریسک ثبت می‌شوند." />
      ) : (
        <div className="col">
          {items.map((risk) => (
            <Link
              key={risk.id}
              to={ROUTES.riskDetail(projectId, risk.id)}
              className="row g10"
              style={{ padding: '11px 16px', borderBottom: '1px solid #F4F4F5' }}
            >
              <span
                className={cn('icb sm', risk.level ? RISK_LEVEL_TONES[risk.level] : 'neu')}
                style={{ fontWeight: 700, fontSize: 12 }}
                title="امتیاز = احتمال × اثر"
              >
                {risk.score === null ? '؟' : toFaDigits(risk.score)}
              </span>
              <span className="col g2 grow" style={{ minWidth: 0 }}>
                <span className="t-13 fw5 tx9 trunc">{risk.title}</span>
                <span className="t-sm tx5">
                  {risk.category} · {risk.owner.fullName}
                </span>
              </span>
              <Badge size="sm" tone={RISK_STATUS_TONES[risk.status]}>
                {RISK_STATUS[risk.status]}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── تیم کارگاه امروز ──

export function FieldTeamCard({ team }: { team: FieldTeamTodayDto }) {
  return (
    <Card>
      <CardHeader
        icon="hard-hat"
        iconClassName="tx-ok"
        title="تیم کارگاه امروز"
        action={
          team.expectedCount > 0 ? (
            <span className="t-sm tx5">
              {toFaDigits(team.reportedCount)} از {toFaDigits(team.expectedCount)} سرپرست گزارش داده‌اند
            </span>
          ) : undefined
        }
      />
      {team.supervisors.length === 0 ? (
        <EmptyState icon="hard-hat" title="امروز فعالیت بازی تخصیص نیافته" description="سرپرستانی که فعالیت باز دارند اینجا دیده می‌شوند." />
      ) : (
        <div className="col">
          {team.supervisors.map((item) => {
            const view = supervisorView(item);
            return (
              <div key={item.user.id} className="row g10" style={{ padding: '10px 16px', borderBottom: '1px solid #F4F4F5' }}>
                <Avatar name={item.user.fullName} tone={item.user.avatarTone} size="m" />
                <span className="col g2 grow" style={{ minWidth: 0 }}>
                  <span className="t-13 fw5 tx9">
                    {item.user.fullName}
                    {item.areaName && <span className="t-sm tx5" style={{ fontWeight: 400 }}> · {item.areaName}</span>}
                  </span>
                  <span className="t-sm tx5">{view.line}</span>
                </span>
                <Badge size="sm" tone={view.tone} dot>
                  {view.label}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ── فعالیت‌های اخیر ──

export function RecentActivityCard({
  events,
  isLoading,
  subtitle = 'رویدادهای پروژه، به‌روز با هر گزارش و تأیید',
}: {
  events: ActivityEventDto[];
  isLoading: boolean;
  /** فید سطح سازمان (W05) زیرنویس خودش را دارد و نام پروژه را کنار هر رویداد نشان می‌دهد. */
  subtitle?: string;
}) {
  return (
    <Card>
      <CardHeader icon="history" title="فعالیت‌های اخیر" subtitle={subtitle} />
      {!isLoading && events.length === 0 ? (
        <EmptyState icon="history" title="هنوز رویدادی ثبت نشده" description="گزارش‌ها، تأییدها و تغییر برنامه اینجا دیده می‌شوند." />
      ) : (
        <Timeline
          entries={events.map((event) => ({
            id: event.id,
            icon: ACTIVITY_VIEW[event.kind].icon,
            tone: ACTIVITY_VIEW[event.kind].tone,
            text: event.project ? (
              <>
                <ActivityText event={event} />{' '}
                <span className="tx5">
                  در <Link to={ROUTES.project(event.project.id)} className="tx7 fw5">{event.project.name}</Link>
                </span>
              </>
            ) : (
              <ActivityText event={event} />
            ),
            time: [event.details, formatRelativeTime(event.occurredAt)].filter(Boolean).join(' · '),
          }))}
        />
      )}
    </Card>
  );
}

/** قالب فارسی هر نوع رویداد (platform.md ۱۰) با جای‌خالی کاربر و موضوع. */
function ActivityText({ event }: { event: ActivityEventDto }) {
  const actor = event.actor ? <strong>{event.actor.fullName}</strong> : 'سامانه';
  const subject = event.subject ? (
    <Badge size="sm" tone="neu">
      {event.subject.label}
    </Badge>
  ) : null;
  const n = event.value === null ? '' : toFaDigits(event.value);

  switch (event.kind) {
    case 'report_submitted':
      return <>{actor} گزارش پیشرفت {subject} را ثبت کرد</>;
    case 'report_approved':
      return <>{actor} گزارش {subject} را تأیید کرد</>;
    case 'report_items_rejected':
      return <>{actor} {n} آیتم گزارش را برای اصلاح برگرداند</>;
    case 'alert_raised':
      return event.value !== null ? (
        <>سامانه تشخیص داد {subject} {n}٪ از برنامه عقب است</>
      ) : (
        <>سامانه برای {subject} هشدار ثبت کرد</>
      );
    case 'member_added':
      return <>{event.subject ? <strong>{event.subject.label}</strong> : 'عضو تازه'} به پروژه اضافه شد</>;
    case 'msp_synced':
      return <>{actor} برنامه را با MSP همگام کرد و {subject} اعمال شد</>;
    case 'plan_applied':
      return <>{actor} {subject} را اعمال کرد</>;
    case 'period_closed':
      return <>{actor} دورهٔ گزارش را بست</>;
    case 'risk_changed':
      return <>{actor} ریسک {subject} را به‌روز کرد</>;
    case 'cost_posted':
      return <>{actor} هزینه‌های {subject} را قطعی کرد</>;
  }
}

// ── کمکی‌ها ──

function SeeAll({ to }: { to: string }) {
  return (
    <Link className="link" to={to}>
      مشاهدهٔ همه
      <Icon name="chevron-left" size={12} />
    </Link>
  );
}

function PercentCell({ value, color, muted }: { value: number; color: string; muted?: boolean }) {
  return (
    <span className="row g6 nowrap">
      <span className={muted ? 't-12 tx7' : 't-12 fw6'}>{formatPercentAuto(value)}</span>
      <ProgressBar value={value} size="thin" color={color} style={{ width: 40, flex: '0 0 auto' }} />
    </span>
  );
}

function toneColor(tone: string): string {
  switch (tone) {
    case 'err':
      return 'var(--error-500)';
    case 'wrn':
      return 'var(--warning-500)';
    case 'ok':
      return 'var(--success-500)';
    default:
      return 'var(--primary-500)';
  }
}
