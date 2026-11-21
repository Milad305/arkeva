import { useState } from 'react';

import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Badge } from '@/shared/components/ui/Badge';
import { FormField } from '@/shared/components/ui/FormField';
import { Icon } from '@/shared/components/ui/Icon';
import { Modal } from '@/shared/components/ui/Modal';
import { TextArea } from '@/shared/components/ui/TextInput';
import { formatPercentAuto, toFaDigits } from '@/shared/utils/num';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { useValidateTemplateQuery } from '../api/templatesApi';
import type { TemplateDetailDto, TemplateIssueDto } from '../types';

function IssueList({ issues, tone }: { issues: TemplateIssueDto[]; tone: 'err' | 'wrn' }) {
  return (
    <ul className="col g6" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
      {issues.map((issue, index) => (
        <li key={`${issue.rule}-${issue.at ?? index}`} className="row ai-s g8">
          <span className={tone === 'err' ? 'tx-err' : 'tx-wrn'} style={{ display: 'inline-flex', marginTop: 2 }}>
            <Icon name={tone === 'err' ? 'x-circle' : 'alert-triangle'} size={15} />
          </span>
          <span className="col grow" style={{ gap: 2, minWidth: 0 }}>
            <span className="t-12 tx8">{issue.message}</span>
            {issue.at && <span className="t-xs tx5">{issue.at}</span>}
          </span>
          <Badge size="sm" mono title={issue.rule}>
            {issue.rule}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

export interface ValidationDialogProps {
  template: TemplateDetailDto;
  canPublish: boolean;
  onPublish: () => void;
  onClose: () => void;
}

/**
 * «بررسی وزن‌ها» (W31) — قواعد اعتبارسنجی انتشار قالب (`templates.md` ۵.۲).
 * بدون اعتبار، قالب پیش‌نویس می‌ماند و منتشر نمی‌شود (AC-TP-03).
 */
export function ValidationDialog({ template, canPublish, onPublish, onClose }: ValidationDialogProps) {
  const report = useValidateTemplateQuery(template.id);

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="lg"
      title="بررسی وزن‌ها و اعتبار قالب"
      description={template.name}
      footer={
        <div className="row g8 wrap">
          <span className="grow t-xs tx5" style={{ minWidth: 160 }}>
            {report.data
              ? report.data.canPublish
                ? 'این قالب قابل انتشار است.'
                : 'تا این خطاها درست نشود، انتشار انجام نمی‌شود.'
              : ''}
          </span>
          <AppButton onClick={onClose}>بستن</AppButton>
          {report.data?.canPublish && canPublish && (
            <AppButton
              variant="primary"
              icon="rocket"
              onClick={() => {
                onClose();
                onPublish();
              }}
            >
              انتشار نسخه
            </AppButton>
          )}
        </div>
      }
    >
      {report.isLoading && <SkeletonTable rows={4} />}
      {report.isError && (
        <Alert tone="err" action={<AppButton size="sm" onClick={() => report.refetch()}>تلاش دوباره</AppButton>}>
          {getApiErrorMessage(report.error)}
        </Alert>
      )}
      {report.data && (
        <div className="col g14">
          <div className="row g8 wrap">
            <Badge tone={report.data.weightsOk ? 'ok' : 'err'} icon={report.data.weightsOk ? 'check-circle-2' : 'x-circle'}>
              {report.data.weightsOk ? 'جمع وزن هر گروه ۱۰۰٪' : 'جمع وزن بعضی گروه‌ها ۱۰۰ نیست'}
            </Badge>
            <Badge
              tone={Math.abs(report.data.cbsShareSum - 100) < 0.0001 ? 'ok' : report.data.cbsShareSum === 0 ? 'neu' : 'err'}
            >
              {`جمع سهم بودجهٔ اقلام ${formatPercentAuto(report.data.cbsShareSum)}`}
            </Badge>
            <Badge tone={report.data.errors.length === 0 ? 'ok' : 'err'}>
              {`${toFaDigits(report.data.errors.length)} خطا`}
            </Badge>
            <Badge tone={report.data.warnings.length === 0 ? 'ok' : 'wrn'}>
              {`${toFaDigits(report.data.warnings.length)} هشدار`}
            </Badge>
          </div>

          {report.data.errors.length === 0 && report.data.warnings.length === 0 && (
            <Alert tone="ok">همهٔ قواعد انتشار برقرار است: وزن‌ها، سهم بودجه، واحد روش مقداری، گام‌ها و اتصال‌ها.</Alert>
          )}

          {report.data.errors.length > 0 && (
            <section className="col g8">
              <h4 className="t-13 fw6 tx9">خطاها — مانع انتشار</h4>
              <IssueList issues={report.data.errors} tone="err" />
            </section>
          )}

          {report.data.warnings.length > 0 && (
            <section className="col g8">
              <h4 className="t-13 fw6 tx9">هشدارها — انتشار را متوقف نمی‌کنند</h4>
              <IssueList issues={report.data.warnings} tone="wrn" />
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}

export interface PublishDialogProps {
  template: TemplateDetailDto;
  busy: boolean;
  error: string | null;
  onConfirm: (note: string) => void;
  onClose: () => void;
}

/** انتشار نسخهٔ تازه با یادداشت تغییر (۵.۴ · AC-TP-06). */
export function PublishDialog({ template, busy, error, onConfirm, onClose }: PublishDialogProps) {
  const [note, setNote] = useState('');
  const nextVersion = (template.version ?? 0) + 1;

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="md"
      dismissOnBackdrop={false}
      title={`انتشار نسخهٔ ${toFaDigits(nextVersion)}`}
      description={template.name}
      footer={
        <div className="row g8">
          <AppButton onClick={onClose} disabled={busy}>
            انصراف
          </AppButton>
          <AppButton variant="primary" icon="rocket" loading={busy} onClick={() => onConfirm(note)}>
            انتشار نسخه
          </AppButton>
        </div>
      }
    >
      <div className="col g12">
        <Alert tone="inf">
          محتوای این نسخه بعد از انتشار تغییرناپذیر است. پروژه‌هایی که از نسخه‌های قبلی ساخته شده‌اند دست‌نخورده
          می‌مانند.
        </Alert>
        <FormField label="یادداشت تغییر" hint="در تاریخچهٔ نسخه‌ها دیده می‌شود؛ بنویسید چه چیزی عوض شد.">
          <TextArea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="مثلاً: وزن نازک‌کاری از ۱۰ به ۱۵ و افزودن گام‌های بتن‌ریزی سقف"
          />
        </FormField>
        {error && <Alert tone="err">{error}</Alert>}
      </div>
    </Modal>
  );
}
