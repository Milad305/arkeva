import { PROJECT_STATUS, type ProjectStatus } from '@/config/constants';
import { Delta } from '@/shared/components/ui/Badge';
import { Stat, StatStrip } from '@/shared/components/ui/KpiCard';
import { Skeleton } from '@/shared/components/feedback/Skeleton';
import { faNum, formatPercent, toBillions, toFaDigits } from '@/shared/utils/num';
import type { PortfolioSummaryDto } from '../types';

/** ترتیب نمایش وضعیت‌ها در خلاصهٔ «۸ فعال · ۲ متوقف · …». */
const STATUS_ORDER: ProjectStatus[] = ['active', 'paused', 'draft', 'completed', 'archived'];

export interface PortfolioStripProps {
  summary: PortfolioSummaryDto | undefined;
  isLoading: boolean;
  /** بدون `cbs.view_amounts` خانهٔ بودجه نمایش داده نمی‌شود (D11). */
  showAmounts: boolean;
}

/**
 * نوار شاخص‌های پرتفوی — بالای W07.
 * همهٔ اعداد از `GET /dashboard` (ب24) می‌آیند؛ اینجا فقط قالب‌بندی می‌شوند.
 */
export function PortfolioStrip({ summary, isLoading, showAmounts }: PortfolioStripProps) {
  const columns = showAmounts ? 4 : 3;

  if (isLoading || !summary) {
    return (
      <StatStrip columns={columns} style={{ marginBottom: 16 }}>
        {Array.from({ length: columns }, (_, index) => (
          <div key={index} aria-hidden="true">
            <Skeleton width="45%" height={10} />
            <Skeleton width="30%" height={22} />
            <Skeleton width="70%" height={8} />
          </div>
        ))}
      </StatStrip>
    );
  }

  const breakdown = STATUS_ORDER.filter((status) => summary.countByStatus[status] > 0)
    .map((status) => `${toFaDigits(summary.countByStatus[status])} ${PROJECT_STATUS[status]}`)
    .join(' · ');

  return (
    <StatStrip columns={columns} style={{ marginBottom: 16 }}>
      <Stat
        icon="folder"
        label="مجموع پروژه‌ها"
        value={toFaDigits(summary.totalCount)}
        hint={breakdown}
      />

      <Stat
        icon="trending-up"
        iconClassName="tx-ok"
        label="میانگین پیشرفت"
        value={formatPercent(summary.avgActualPercent)}
        delta={
          summary.avgActualPercentDelta !== 0 && (
            <Delta
              tone={summary.avgActualPercentDelta > 0 ? 'ok' : 'err'}
              direction={summary.avgActualPercentDelta > 0 ? 'up' : 'down'}
            >
              {formatPercent(Math.abs(summary.avgActualPercentDelta))}
            </Delta>
          )
        }
        hint="میانگین ساده پروژه‌های فعال، نسبت به ماه گذشته"
      />

      {showAmounts && summary.totalBac && (
        <Stat
          icon="banknote"
          iconClassName="tx-acc"
          label="بودجهٔ کل"
          value={toBillions(summary.totalBac, 0)}
          unit="میلیارد ریال"
          hint={
            summary.totalAc
              ? `مصرف‌شده: ${toBillions(summary.totalAc, 0)} میلیارد (${formatPercent(summary.totalAcPercent ?? 0)})`
              : undefined
          }
        />
      )}

      <Stat
        icon="alert-triangle"
        iconClassName="tx-err"
        label="پروژه‌های در خطر"
        value={faNum(summary.atRiskCount)}
        valueClassName={summary.atRiskCount > 0 ? 'tx-err' : undefined}
        delta={
          summary.atRiskDelta !== 0 && (
            <Delta
              tone={summary.atRiskDelta > 0 ? 'err' : 'ok'}
              direction={summary.atRiskDelta > 0 ? 'up' : 'down'}
            >
              {toFaDigits(Math.abs(summary.atRiskDelta))}
            </Delta>
          )
        }
        hint="انحراف ۱۵ واحد یا بیشتر، یا CPI زیر ۰٫۹"
      />
    </StatStrip>
  );
}
