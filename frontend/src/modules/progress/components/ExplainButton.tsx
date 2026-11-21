import { useState } from 'react';
import { Link } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Icon } from '@/shared/components/ui/Icon';
import { Modal } from '@/shared/components/ui/Modal';
import { ProgressBar } from '@/shared/components/ui/ProgressBar';
import { InlineLoading } from '@/shared/components/feedback/Skeleton';
import { formatJalaliDate, formatJalaliDateTime } from '@/shared/utils/date';
import { toFaDigits } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import { versionLabel } from '@/modules/projects/services/planVersion';
import { useExplainMetricQuery } from '../api/progressApi';
import type { ExplainMetric, ExplainSource } from '../types';

export interface ExplainButtonProps {
  projectId: EntityId;
  metric: ExplainMetric;
  itemId?: EntityId;
  /** نام عدد برای برچسب دسترس‌پذیری: «پیشرفت واقعی». */
  label: string;
}

/**
 * «این عدد از کجا آمد؟» — G9، `features/charts.md` ۴.
 *
 * دکمهٔ کوچک کنار هر عدد مهم. داده فقط وقتی پنجره باز شد خوانده می‌شود.
 * محتوا را سرور می‌سازد (فرمول با عدد جای‌گذاری‌شده)؛ اینجا فقط نمایش است (D07).
 */
export function ExplainButton({ projectId, metric, itemId, label }: ExplainButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="ibtn sm"
        style={{ width: 22, height: 22, color: 'var(--gray-400)' }}
        aria-label={`این عدد از کجا آمد؟ — ${label}`}
        title="این عدد از کجا آمد؟"
        onClick={() => setIsOpen(true)}
      >
        <Icon name="help-circle" size={14} />
      </button>
      {isOpen && (
        <ExplainDialog
          projectId={projectId}
          metric={metric}
          itemId={itemId}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

function ExplainDialog({
  projectId,
  metric,
  itemId,
  onClose,
}: Omit<ExplainButtonProps, 'label'> & { onClose: () => void }) {
  const { data, isLoading, isError, refetch } = useExplainMetricQuery({ projectId, metric, itemId });

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="md"
      title={data ? data.title : 'این عدد از کجا آمد؟'}
      description={
        data
          ? `تاریخ داده ${formatJalaliDate(data.dataDate)} · محاسبه ${formatJalaliDateTime(data.computedAt)}`
          : undefined
      }
      footer={
        <AppButton variant="outline" onClick={onClose}>
          بستن
        </AppButton>
      }
    >
      {isLoading && <InlineLoading />}

      {isError && (
        <Alert
          tone="err"
          action={
            <AppButton size="sm" variant="outline" icon="refresh-cw" onClick={() => void refetch()}>
              تلاش دوباره
            </AppButton>
          }
        >
          توضیح این عدد بارگذاری نشد. چند لحظهٔ دیگر دوباره امتحان کنید.
        </Alert>
      )}

      {data && (
        <div className="col g16">
          <div className="row g12 ai-e">
            <span className="kpi-v">{data.valueText}</span>
          </div>

          <p className="t-13 tx7 lh" style={{ margin: 0 }}>
            {data.definition}
          </p>

          <div className="box col g4">
            <span className="t-xs tx5">فرمول با اعداد همین پروژه</span>
            {/* ریاضی همیشه چپ‌به‌راست خوانده می‌شود، حتی در متن فارسی */}
            {data.formula.split(' · ').map((line) => (
              <span key={line} className="t-13 fw6 tx9" dir="ltr" style={{ lineHeight: 1.9, textAlign: 'left' }}>
                {line}
              </span>
            ))}
          </div>

          {data.sources.length > 0 && (
            <div className="col g8">
              <span className="t-sm fw6 tx7">بزرگ‌ترین سهم‌ها</span>
              {data.sources.slice(0, 5).map((source) => (
                <SourceRow key={source.id} projectId={projectId} source={source} />
              ))}
            </div>
          )}

          {data.costIndicesNote && (
            <Alert tone="inf" icon="calendar-clock">
              {data.costIndicesNote}
            </Alert>
          )}

          {data.referenceVersion && (
            <span className="t-sm tx5">مقایسه نسبت به {versionLabel(data.referenceVersion)}</span>
          )}
        </div>
      )}
    </Modal>
  );
}

function SourceRow({ projectId, source }: { projectId: EntityId; source: ExplainSource }) {
  const to =
    source.kind === 'wbs_item'
      ? ROUTES.wbs(projectId)
      : source.kind === 'cbs_item'
        ? ROUTES.cbs(projectId)
        : null;

  const title = (
    <span className="row g6" style={{ minWidth: 0 }}>
      {source.code && <span className="mono t-sm tx5">{source.code}</span>}
      <span className="t-13 fw5 tx9 trunc">{source.label}</span>
    </span>
  );

  return (
    <div className="col g4" style={{ paddingBottom: 8, borderBottom: '1px solid var(--gray-100)' }}>
      <div className="row between g8">
        {to ? (
          <Link to={to} className="link" style={{ minWidth: 0 }}>
            {title}
          </Link>
        ) : (
          title
        )}
        {source.sharePercent !== null && (
          <span className="t-sm tx6 nowrap">سهم {toFaDigits(Math.round(source.sharePercent))}٪</span>
        )}
      </div>
      <span className="t-sm tx6">{source.detail}</span>
      {source.sharePercent !== null && (
        <ProgressBar value={source.sharePercent} size="thin" style={{ width: '100%' }} />
      )}
    </div>
  );
}
