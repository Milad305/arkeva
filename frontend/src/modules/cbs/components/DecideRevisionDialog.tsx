import { useState } from 'react';

import { ROUTES } from '@/config/routes';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton, LinkButton } from '@/shared/components/ui/AppButton';
import { Modal } from '@/shared/components/ui/Modal';
import { TextArea } from '@/shared/components/ui/TextInput';
import { formatJalaliDateTime } from '@/shared/utils/date';
import { formatQuantity } from '@/shared/utils/num';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import type { EntityId } from '@/shared/types/api';
import { useDecideBudgetRevisionMutation } from '../api/cbsApi';
import type { BudgetRevisionRequestDto } from '../types';
import { Money } from './Money';

export interface DecideRevisionDialogProps {
  projectId: EntityId;
  request: BudgetRevisionRequestDto;
  onClose: () => void;
}

const FIELD_LABEL = { unitRate: 'نرخ واحد', estimatedQuantity: 'مقدار برآورد', lumpSumAmount: 'مبلغ مقطوع' } as const;

/**
 * تأیید یا رد درخواست بازنگری بودجه (cbs.md ۷.۲؛ تصمیم 1405/08/15: از فهرست W14).
 * تأیید نسخهٔ «بازنگری بودجه» جدایی می‌سازد و همان لحظه اعمال می‌کند؛ اگر بازنگری کاری
 * باز باشد سرور با ۴۰۹ رد می‌کند (AC-CBS-08) و اینجا راه ادامه نشان داده می‌شود.
 */
export function DecideRevisionDialog({ projectId, request, onClose }: DecideRevisionDialogProps) {
  const [note, setNote] = useState('');
  const [error, setError] = useState<{ message: string; draftOpen: boolean } | null>(null);
  const [decide, state] = useDecideBudgetRevisionMutation();
  const [pending, setPending] = useState<'approve' | 'reject' | null>(null);

  async function submit(decision: 'approve' | 'reject') {
    if (decision === 'reject' && note.trim().length < 3) {
      setError({ message: 'دلیل رد را بنویسید تا درخواست‌دهنده بداند چه کند.', draftOpen: false });
      return;
    }
    setPending(decision);
    setError(null);
    try {
      await decide({ projectId, requestId: request.id, decision, note: note.trim() }).unwrap();
      onClose();
    } catch (cause) {
      const details = (cause as { data?: { details?: { code?: string } } })?.data?.details;
      setError({ message: getApiErrorMessage(cause), draftOpen: details?.code === 'DRAFT_OPEN' });
    } finally {
      setPending(null);
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="بررسی درخواست بازنگری بودجه"
      description={`${request.requestedBy.fullName} · ${formatJalaliDateTime(request.requestedAt)}`}
      footer={
        <>
          <AppButton variant="ghost" onClick={onClose}>
            بستن
          </AppButton>
          <AppButton variant="dangerOutline" icon="x" loading={state.isLoading && pending === 'reject'} disabled={state.isLoading} onClick={() => void submit('reject')}>
            رد درخواست
          </AppButton>
          <AppButton variant="success" icon="check" loading={state.isLoading && pending === 'approve'} disabled={state.isLoading || error?.draftOpen} onClick={() => void submit('approve')}>
            تأیید و اعمال
          </AppButton>
        </>
      }
    >
      <div className="col g12">
        <div className="box col g6" style={{ padding: '10px 12px' }}>
          {request.changes.map((change, index) => (
            <div key={index} className="col g2">
              <span className="t-12 fw5 tx8">
                <span className="mono" dir="ltr">
                  {change.cbsCode}
                </span>{' '}
                {change.cbsTitle}
              </span>
              <span className="t-12 tx7">
                {FIELD_LABEL[change.field]}:{' '}
                {change.field === 'estimatedQuantity' ? (
                  <>
                    {formatQuantity(Number(change.from), null)} ← <strong>{formatQuantity(Number(change.to), null)}</strong>
                  </>
                ) : (
                  <>
                    <Money value={change.from} className="t-12 tx7" /> ← <Money value={change.to} className="t-12 fw6 tx9" />
                  </>
                )}
              </span>
            </div>
          ))}
          <span className="hr" />
          <span className="t-12 tx7">{request.reason}</span>
          {request.impact.budgetChange !== null && (
            <span className="t-12 tx6">
              اثر بر بودجهٔ CBS: <Money value={request.impact.budgetChange} className="t-12 fw6 tx9" />
              {request.impact.bacChange !== null && (
                <>
                  {' '}
                  · BAC: <Money value={request.impact.bacChange} className="t-12 fw6 tx9" />
                </>
              )}
            </span>
          )}
        </div>

        <div className="fg">
          <label className="lbl" htmlFor="decision-note">
            یادداشت تصمیم (برای رد اجباری)
          </label>
          <TextArea id="decision-note" rows={3} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="مثلاً «با قرارداد تأمین جدید هم‌خوان است»" />
          <span className="hint">با تأیید، نسخهٔ تازهٔ «بازنگری بودجه» ساخته و همان لحظه اعمال می‌شود؛ ردیف تاریخچهٔ نرخ با دلیل درخواست و همین یادداشت ثبت می‌شود.</span>
        </div>

        {error && (
          <Alert
            tone={error.draftOpen ? 'wrn' : 'err'}
            icon={error.draftOpen ? 'git-branch' : 'alert-octagon'}
            action={
              error.draftOpen ? (
                <LinkButton to={ROUTES.cbsEdit(projectId)} size="sm" variant="outline" icon="pencil">
                  رفتن به نسخهٔ کاری
                </LinkButton>
              ) : undefined
            }
          >
            {error.message}
          </Alert>
        )}
      </div>
    </Modal>
  );
}
