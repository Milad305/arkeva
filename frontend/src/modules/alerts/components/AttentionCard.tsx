import { Link } from 'react-router-dom';

import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Badge } from '@/shared/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/shared/components/ui/Card';
import { IconBox } from '@/shared/components/ui/IconBox';
import type { IconName } from '@/shared/components/ui/Icon';
import type { Tone } from '@/shared/types/tone';
import { toFaDigits } from '@/shared/utils/num';
import { useGetMyAlertsQuery } from '../api/alertsApi';
import type { AlertDto, AlertSeverity } from '../types';

const SEVERITY_TONE: Record<AlertSeverity, Tone> = { critical: 'err', warning: 'wrn', info: 'inf' };
const SEVERITY_LABEL: Record<AlertSeverity, string> = { critical: 'بحرانی', warning: 'هشدار', info: 'اطلاع' };

/** آیکن خانوادهٔ قاعده — پیشوند کد (`04-alert-engine.md` ۳). */
function iconFor(ruleCode: string): IconName {
  if (ruleCode.startsWith('AL-PRG')) return 'trending-down';
  if (ruleCode.startsWith('AL-CST')) return 'wallet';
  if (ruleCode.startsWith('AL-FLD')) return 'user-x';
  if (ruleCode.startsWith('AL-APR')) return 'clock';
  if (ruleCode.startsWith('AL-RSK')) return 'shield-alert';
  return 'alert-triangle';
}

/**
 * «نیاز به توجه» W05 — هشدارهای باز و دیده‌شدهٔ همهٔ پروژه‌های کاربر، بحرانی اول
 * (charts.md ۶.۱، `04-alert-engine.md` ۶). متن راهنما همان است که سرور ذخیره کرده؛
 * هر ردیف به صفحهٔ اقدام همان هشدار می‌رود.
 */
export function AttentionCard({ limit = 5 }: { limit?: number }) {
  const { data, isLoading, isError, refetch } = useGetMyAlertsQuery({ limit });

  return (
    <Card>
      <CardHeader
        icon="alert-triangle"
        iconClassName="tx-wrn"
        title={
          <>
            نیاز به توجه{' '}
            {data && data.total > 0 && (
              <Badge size="sm" tone={data.criticalCount > 0 ? 'err' : 'wrn'} pill>
                {toFaDigits(data.total)}
              </Badge>
            )}
          </>
        }
        subtitle="هشدارهای باز پروژه‌های شما، بحرانی اول"
      />
      {isLoading ? (
        <CardBody>
          <SkeletonTable rows={4} />
        </CardBody>
      ) : isError || !data ? (
        <EmptyState
          icon="server"
          title="هشدارها بارگذاری نشد"
          description="چند لحظهٔ دیگر دوباره امتحان کنید."
          actions={
            <AppButton size="sm" variant="outline" icon="refresh-cw" onClick={() => void refetch()}>
              تلاش دوباره
            </AppButton>
          }
        />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon="check-circle-2"
          iconStyle={{ background: '#DCFCE7', color: '#15803D' }}
          title="هشدار بازی ندارید"
          description="هر عقب‌ماندگی، مصرف غیرعادی یا گزارش معوق اینجا دیده می‌شود."
        />
      ) : (
        <div className="col">
          {data.items.map((alert) => (
            <AlertRow key={alert.id} alert={alert} />
          ))}
          {data.total > data.items.length && (
            <span className="t-xs tx5" style={{ padding: '8px 14px' }}>
              و {toFaDigits(data.total - data.items.length)} هشدار دیگر در صفحهٔ هر پروژه
            </span>
          )}
        </div>
      )}
    </Card>
  );
}

function AlertRow({ alert }: { alert: AlertDto }) {
  const tone = SEVERITY_TONE[alert.severity];
  return (
    <Link
      to={alert.actionLink}
      className="row g10 ai-s"
      style={{ padding: '11px 14px', borderBottom: '1px solid #F4F4F5' }}
    >
      <IconBox icon={iconFor(alert.ruleCode)} tone={tone} size="sm" />
      <span className="col g2" style={{ minWidth: 0 }}>
        <span className="t-12 tx8 lh">{alert.guidance}</span>
        <span className="t-xs tx5 row wrap g4">
          <span className={tone === 'err' ? 'tx-err fw5' : tone === 'wrn' ? 'tx-wrn fw5' : undefined}>
            {SEVERITY_LABEL[alert.severity]}
          </span>
          · {alert.title}
          {alert.projectName && <> · {alert.projectName}</>}
          {alert.status === 'open' && (
            <Badge size="sm" tone="pri">
              تازه
            </Badge>
          )}
        </span>
      </span>
    </Link>
  );
}
