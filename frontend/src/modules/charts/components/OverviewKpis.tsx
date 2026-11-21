import { RingProgress } from '@/shared/components/charts/RingProgress';
import { IconBox } from '@/shared/components/ui/IconBox';
import { Icon } from '@/shared/components/ui/Icon';
import { ProgressBar } from '@/shared/components/ui/ProgressBar';
import { WBS_PROGRESS_STATUS, WBS_PROGRESS_STATUS_TONES } from '@/config/constants';
import { formatJalaliDate } from '@/shared/utils/date';
import {
  faNum,
  formatDelta,
  formatPercentAuto,
  formatRatio,
  formatRial,
  formatRialParts,
  toFaDigits,
} from '@/shared/utils/num';
import { cn } from '@/shared/utils/cn';
import type { EntityId } from '@/shared/types/api';
import { ExplainButton } from '@/modules/progress/components/ExplainButton';
import type { ProjectOverviewDto } from '../types';
import { evmSentence, severityBoxClass } from '../services/overviewText';

export interface OverviewKpisProps {
  projectId: EntityId;
  overview: ProjectOverviewDto;
  /** `cbs.view_amounts` — بدون آن فقط درصد (AC-CH-04). */
  showAmounts: boolean;
  /** `charts.view` — ناظر کارفرما شاخص‌ها را نمی‌بیند (F02 ۹، تأیید 1405/08/14). */
  showIndices: boolean;
}

const KPI_LABEL = { display: 'inline-flex' } as const;
/** `.pbar` در kit برای ردیف `flex:1` دارد؛ در ستون کارت KPI نباید قد بکشد. */
const BAR_STYLE = { flex: '0 0 auto' } as const;

/** چهار کارت بالای W10 — همه از مقادیر ذخیره‌شده (AC-CH-01). */
export function OverviewKpis({ projectId, overview, showAmounts, showIndices }: OverviewKpisProps) {
  const { progress, budget, time, evm } = overview;
  const sentence = evmSentence(evm);
  const statusTone = WBS_PROGRESS_STATUS_TONES[progress.status];

  return (
    <div className="grid c4" style={{ marginBottom: 16 }}>
      {/* پیشرفت فیزیکی */}
      <div className="kpi">
        <div className="row between">
          <span className="kpi-l row g6">
            <span className="tx-pri" style={KPI_LABEL}>
              <Icon name="activity" size={13} />
            </span>
            پیشرفت فیزیکی
            <ExplainButton projectId={projectId} metric="actual_percent" label="پیشرفت فیزیکی واقعی" />
          </span>
          <IconBox icon="trending-up" tone="pri" />
        </div>
        <div className="row between">
          <div className="col g6">
            <span className="kpi-v">
              {faNum(progress.actualPercent, progress.actualPercent % 1 === 0 ? 0 : 1)}
              <span className="t-14 tx5 fw5">٪</span>
            </span>
            <span className="t-12 tx6">
              {progress.deviation === 0
                ? `هم‌پای برنامهٔ امروز (${formatPercentAuto(progress.plannedPercent, 1)})`
                : `${formatPercentAuto(Math.abs(progress.deviation), 1)} ${progress.deviation < 0 ? 'عقب از' : 'جلوتر از'} برنامهٔ امروز (${formatPercentAuto(progress.plannedPercent, 1)})`}
            </span>
          </div>
          <RingProgress value={progress.actualPercent} label={formatPercentAuto(progress.actualPercent, 0)} />
        </div>
        <ProgressBar
          value={progress.actualPercent}
          marker={progress.plannedPercent}
          label="پیشرفت واقعی در برابر برنامه"
          style={BAR_STYLE}
        />
        <div className="row between g8 wrap">
          <span className={cn('bdg sm', statusTone)}>
            <span className="dot" />
            {WBS_PROGRESS_STATUS[progress.status]} · انحراف {formatDelta(progress.deviation, progress.deviation % 1 === 0 ? 0 : 1)}
          </span>
          {progress.financialPercent !== undefined && (
            <span className="t-sm tx5">ریالی {formatPercentAuto(progress.financialPercent, 1)}</span>
          )}
        </div>
      </div>

      {/* بودجهٔ مصرف‌شده */}
      <div className="kpi">
        <div className="row between">
          <span className="kpi-l row g6">
            <span className="tx-acc" style={KPI_LABEL}>
              <Icon name="banknote" size={13} />
            </span>
            بودجهٔ مصرف‌شده
            <ExplainButton projectId={projectId} metric="cbs_consumption" label="بودجهٔ مصرف‌شده" />
          </span>
          <IconBox icon="wallet" tone="acc" />
        </div>
        {showAmounts && budget.ac !== undefined ? (
          <>
            <div className="row g6 ai-e">
              <span className="kpi-v">{formatRialParts(budget.ac).value}</span>
              <span className="t-13 tx5" style={{ paddingBottom: 3 }}>
                {formatRialParts(budget.ac).unit}
              </span>
            </div>
            <span className="t-12 tx6">
              از کل <strong className="tx9">{budget.bac ? formatRial(budget.bac) : '—'}</strong> · مصرف{' '}
              <strong className="tx9">{formatPercentAuto(budget.consumedPercent, 1)}</strong>
            </span>
          </>
        ) : (
          <>
            <span className="kpi-v">{formatPercentAuto(budget.consumedPercent, 1)}</span>
            <span className="t-12 tx6">هزینهٔ واقعی نسبت به بودجه در اتمام</span>
          </>
        )}
        <ProgressBar value={budget.consumedPercent} color="var(--accent-500)" label="درصد مصرف بودجه" style={BAR_STYLE} />
        {overview.costIndicesDate && overview.costIndicesDate !== overview.dataDate && (
          <span className="t-sm tx5">هزینه‌ها تا {formatJalaliDate(overview.costIndicesDate)} کامل است</span>
        )}
      </div>

      {/* زمان — روز کاری (تأیید 1405/08/14) */}
      <div className="kpi">
        <div className="row between">
          <span className="kpi-l row g6">
            <span className="tx-inf" style={KPI_LABEL}>
              <Icon name="clock" size={13} />
            </span>
            زمان
          </span>
          <IconBox icon="calendar" tone="inf" />
        </div>
        <div className="grid c2" style={{ gap: 10 }}>
          <div className="col">
            <span className="stat-v">
              {toFaDigits(time.elapsedWorkingDays)} <span className="t-13 tx5 fw5">روز کاری</span>
            </span>
            <span className="t-12 tx6">سپری‌شده</span>
          </div>
          <div className="col">
            <span className="stat-v">
              {toFaDigits(time.remainingWorkingDays)} <span className="t-13 tx5 fw5">روز کاری</span>
            </span>
            <span className="t-12 tx6">باقی‌مانده</span>
          </div>
        </div>
        <ProgressBar value={time.elapsedPercent} color="#2563EB" label="زمان سپری‌شده" style={BAR_STYLE} />
        <span className="t-sm tx5 row g4 wrap">
          کل {toFaDigits(time.totalWorkingDays)} روز کاری · پیش‌بینی پایان{' '}
          {formatJalaliDate(time.forecastFinish)}
          {time.delayWorkingDays !== null && time.delayWorkingDays !== 0 && (
            <span className={time.delayWorkingDays > 0 ? 'tx-wrn fw6' : 'tx-ok fw6'}>
              ({toFaDigits(Math.abs(time.delayWorkingDays))} روز کاری{' '}
              {time.delayWorkingDays > 0 ? 'تأخیر' : 'جلوتر'})
            </span>
          )}
          <ExplainButton projectId={projectId} metric="forecast_finish" label="پیش‌بینی پایان" />
        </span>
      </div>

      {/* شاخص‌های ارزش کسب‌شده */}
      <div className="kpi">
        <div className="row between">
          <span className="kpi-l row g6">
            <span className="tx5" style={KPI_LABEL}>
              <Icon name="gauge" size={13} />
            </span>
            شاخص‌های ارزش کسب‌شده
          </span>
          <IconBox icon="bar-chart-2" tone="neu" />
        </div>
        {showIndices ? (
          <>
            <div className="grid c2" style={{ gap: 8 }}>
              <IndexBox
                label="CPI · هزینه"
                value={evm.cpi}
                boxClass={severityBoxClass(evm.costAlert)}
                explain={<ExplainButton projectId={projectId} metric="cpi" label="CPI" />}
              />
              <IndexBox
                label="SPI · زمان"
                value={evm.spi}
                boxClass={severityBoxClass(evm.scheduleAlert)}
                explain={<ExplainButton projectId={projectId} metric="spi" label="SPI" />}
              />
            </div>
            {sentence ? (
              <span className="t-12 tx6 lh">
                هزینه {sentence.cost} است {sentence.joiner} پروژه از نظر زمان{' '}
                <strong className={sentence.scheduleTone ? `tx-${sentence.scheduleTone}` : 'tx9'}>
                  {sentence.schedule}
                </strong>{' '}
                است.
              </span>
            ) : (
              <span className="t-12 tx6 lh">
                تا اولین گزارش تأییدشده شاخص‌ها محاسبه نمی‌شوند.
              </span>
            )}
          </>
        ) : (
          <span className="t-12 tx6 lh">شاخص‌های EVM فقط برای نقش‌های دارای دسترسی نمودارها نمایش داده می‌شود.</span>
        )}
      </div>
    </div>
  );
}

function IndexBox({
  label,
  value,
  boxClass,
  explain,
}: {
  label: string;
  value: number | null;
  boxClass: string;
  explain: React.ReactNode;
}) {
  return (
    <div
      className={boxClass}
      style={{
        borderRadius: 8,
        padding: '8px 10px',
        border: '1px solid',
        borderColor:
          boxClass === 'err'
            ? 'rgba(220,38,38,0.25)'
            : boxClass === 'wrn'
              ? 'rgba(217,119,6,0.25)'
              : 'var(--gray-200)',
      }}
    >
      <div className="row between">
        <span className="t-sm fw6">{label}</span>
        {value !== null && explain}
      </div>
      <div className="mono" style={{ fontSize: 18, fontWeight: 700 }}>
        {value === null ? '—' : formatRatio(value)}
      </div>
    </div>
  );
}
