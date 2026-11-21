import type { AlertSeverity } from '@/config/constants';
import type { Tone } from '@/shared/types/tone';
import { formatPercent, toFaDigits } from '@/shared/utils/num';
import type {
  ActivityEventDto,
  CostTrend,
  OverviewEvm,
  ScheduleTrend,
  SupervisorTodayDto,
} from '../types';
import type { IconName } from '@/shared/components/ui/Icon';
import { formatRelativeTime } from '@/shared/utils/date';

// متن‌ها و رنگ‌های W10 از مقادیر دسته‌بندی‌شدهٔ سرور — بدون هیچ آستانه یا محاسبه (D07).

const COST_PHRASE: Record<CostTrend, string> = {
  near: 'نزدیک برنامه',
  over: 'بالاتر از برنامه',
  under: 'پایین‌تر از برنامه',
};

export interface EvmSentence {
  cost: string;
  joiner: string;
  schedule: string;
  scheduleTone: Tone | null;
}

/**
 * جملهٔ خلاصهٔ EVM — قالب ثابت charts.md ۶.۲:
 * «هزینه {…} است ولی پروژه از نظر زمان {n}٪ {عقب | جلو} است.»
 * «ولی» فقط وقتی دو نیمه در دو جهت مخالف‌اند؛ وگرنه «و».
 */
export function evmSentence(evm: OverviewEvm): EvmSentence | null {
  if (!evm.costTrend || !evm.scheduleTrend) return null;

  const gap = evm.scheduleGapPercent === null ? '' : formatPercent(evm.scheduleGapPercent);
  const schedule: Record<ScheduleTrend, string> = {
    behind: `${gap} عقب`,
    ahead: `${gap} جلو`,
    near: 'نزدیک برنامه',
  };

  const costGood = evm.costTrend !== 'over';
  const scheduleGood = evm.scheduleTrend !== 'behind';

  return {
    cost: COST_PHRASE[evm.costTrend],
    joiner: costGood === scheduleGood ? 'و' : 'ولی',
    schedule: schedule[evm.scheduleTrend],
    scheduleTone:
      evm.scheduleTrend === 'behind' ? 'err' : evm.scheduleTrend === 'ahead' ? 'ok' : null,
  };
}

/** کلاس رنگ کادر شاخص از شدت هشدار باز. */
export function severityBoxClass(severity: AlertSeverity | null): string {
  if (severity === 'critical') return 'err';
  if (severity === 'warning') return 'wrn';
  return 'neu';
}

export interface SupervisorView {
  label: string;
  tone: Tone;
  line: string;
}

/** وضعیت سرپرست — هم‌راستا با AL-FLD-01 (تأیید 1405/08/14). */
export function supervisorView(item: SupervisorTodayDto): SupervisorView {
  if (item.state === 'reported') {
    return {
      label: 'گزارش داده',
      tone: 'ok',
      line: `${toFaDigits(item.reportCountToday)} گزارش امروز · آخرین ${formatRelativeTime(item.lastReportAt)}`,
    };
  }
  if (item.state === 'queued') {
    return {
      label: 'در صف گوشی',
      tone: 'inf',
      line: `${toFaDigits(item.queuedReports)} گزارش هنوز به سرور نرسیده`,
    };
  }
  if (item.alertSeverity) {
    return {
      label: `${toFaDigits(item.workingDaysWithoutReport)} روز کاری بی‌گزارش`,
      tone: item.alertSeverity === 'critical' ? 'err' : 'wrn',
      line: item.lastReportAt
        ? `آخرین گزارش ${formatRelativeTime(item.lastReportAt)}`
        : 'هنوز گزارشی نداده',
    };
  }
  return {
    label: 'بدون گزارش امروز',
    tone: 'neu',
    line: item.lastReportAt
      ? `آخرین گزارش ${formatRelativeTime(item.lastReportAt)}`
      : 'هنوز گزارشی نداده',
  };
}

export interface ActivityView {
  icon: IconName;
  tone: Tone;
}

export const ACTIVITY_VIEW: Record<ActivityEventDto['kind'], ActivityView> = {
  report_submitted: { icon: 'clipboard', tone: 'inf' },
  report_approved: { icon: 'check', tone: 'ok' },
  report_items_rejected: { icon: 'x-circle', tone: 'err' },
  alert_raised: { icon: 'alert-triangle', tone: 'wrn' },
  member_added: { icon: 'user-plus', tone: 'pri' },
  msp_synced: { icon: 'refresh-cw', tone: 'acc' },
  plan_applied: { icon: 'git-branch', tone: 'pri' },
  period_closed: { icon: 'calendar-check', tone: 'neu' },
  risk_changed: { icon: 'shield-alert', tone: 'wrn' },
  cost_posted: { icon: 'banknote', tone: 'acc' },
};
