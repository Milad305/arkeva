import { useState } from 'react';

import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Modal } from '@/shared/components/ui/Modal';
import { Select } from '@/shared/components/ui/Select';
import { OptionCard } from '@/shared/components/ui/SelectionControls';
import { TextArea, TextInput } from '@/shared/components/ui/TextInput';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { toEnDigits } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import { useChangeRiskStatusMutation, useGetRiskRegisterQuery, useMergeRiskMutation } from '../api/risksApi';
import { CLOSE_REASON_LABEL } from '../services/riskView';
import type { RiskCloseReason, RiskDetailDto } from '../types';

export type RiskStatusMode = 'closed' | 'occurred' | 'assessed';

const REASONS: RiskCloseReason[] = ['mitigated', 'not_applicable', 'accepted', 'other'];
const REASON_HINT: Record<RiskCloseReason, string> = {
  mitigated: 'اقدام‌ها اثر کردند و ریسک دیگر تهدید نیست.',
  not_applicable: 'شرایط عوض شد و ریسک موضوعیت ندارد.',
  accepted: 'اثر باقی‌مانده پذیرفته شد و پیگیری نمی‌شود.',
  other: 'دلیل را در یادداشت بنویسید.',
};

/**
 * تغییر وضعیت ریسک (risk.md ۵.۱): بستن با دلیل اجباری (AC-RK-07)، «رخ داد» با هزینه و
 * تأخیر واقعی، و بازگشایی. اقدام‌های باز ریسک بسته‌شده را سرور لغو می‌کند.
 */
export function RiskStatusDialog({ risk, mode, canViewAmounts, onClose }: { risk: RiskDetailDto; mode: RiskStatusMode; canViewAmounts: boolean; onClose: () => void }) {
  const [change, state] = useChangeRiskStatusMutation();
  const [reason, setReason] = useState<RiskCloseReason | null>(null);
  const [note, setNote] = useState('');
  const [cost, setCost] = useState('');
  const [days, setDays] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const openActions = risk.actions.filter((action) => action.status === 'open' || action.status === 'in_progress').length;

  async function submit() {
    setTouched(true);
    setError(null);
    if (mode === 'closed' && (!reason || (reason === 'other' && !note.trim()))) return;
    const billions = Number(toEnDigits(cost).replace(/[٫/]/g, '.'));
    try {
      await change({
        riskId: risk.id,
        status: mode,
        closeReason: reason ?? undefined,
        note: note.trim() || undefined,
        actualCost: mode === 'occurred' && cost.trim() && Number.isFinite(billions) ? String(Math.round(billions * 1e9)) : null,
        actualDelayDays: mode === 'occurred' && days.trim() ? Number(toEnDigits(days)) || null : null,
      }).unwrap();
      onClose();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    }
  }

  const title = mode === 'closed' ? `بستن ${risk.code}` : mode === 'occurred' ? `ثبت وقوع ${risk.code}` : `بازگشایی ${risk.code}`;
  return (
    <Modal
      isOpen
      onClose={onClose}
      size="md"
      title={title}
      description={risk.title}
      footer={
        <>
          <AppButton variant="ghost" onClick={onClose}>
            انصراف
          </AppButton>
          <AppButton variant={mode === 'occurred' ? 'danger' : 'primary'} loading={state.isLoading} onClick={() => void submit()}>
            {mode === 'closed' ? 'بستن ریسک' : mode === 'occurred' ? 'ثبت وقوع' : 'بازگشایی'}
          </AppButton>
        </>
      }
    >
      <div className="col g14">
        {mode === 'closed' && (
          <>
            <div className="col g8" role="radiogroup" aria-label="دلیل بستن">
              <span className="lbl">
                دلیل بستن <span className="req">*</span>
              </span>
              {REASONS.map((entry) => (
                <OptionCard key={entry} name="close-reason" control="radio" selected={reason === entry} onSelect={() => setReason(entry)} title={CLOSE_REASON_LABEL[entry]} description={REASON_HINT[entry]} />
              ))}
              {touched && !reason && <span className="hint err">برای بستن ریسک دلیل را انتخاب کنید.</span>}
            </div>
            {openActions > 0 && (
              <Alert tone="wrn" icon="alert-triangle">
                {`${openActions.toLocaleString('fa-IR')} اقدام باز این ریسک لغو می‌شود و ذخیرهٔ تخصیص‌یافتهٔ مصرف‌نشده آزاد می‌شود.`}
              </Alert>
            )}
          </>
        )}
        {mode === 'occurred' && (
          <>
            <Alert tone="err" icon="alert-octagon">
              ریسک رخ‌داده به مسئله تبدیل می‌شود و از ماتریس ریسک‌های باز بیرون می‌رود.
            </Alert>
            <div className="grid c2 rsp" style={{ gap: 12 }}>
              {canViewAmounts && (
                <div className="fg">
                  <label className="lbl" htmlFor="occ-cost">هزینهٔ واقعی <span className="opt">(اختیاری)</span></label>
                  <TextInput id="occ-cost" value={cost} onChange={(event) => setCost(event.target.value)} suffix="میلیارد ریال" />
                </div>
              )}
              <div className="fg">
                <label className="lbl" htmlFor="occ-days">تأخیر واقعی <span className="opt">(اختیاری)</span></label>
                <TextInput id="occ-days" value={days} onChange={(event) => setDays(event.target.value)} suffix="روز" />
              </div>
            </div>
          </>
        )}
        <div className="fg">
          <label className="lbl" htmlFor="status-note">
            یادداشت {mode === 'closed' && reason === 'other' ? <span className="req">*</span> : <span className="opt">(اختیاری)</span>}
          </label>
          <TextArea id="status-note" rows={3} value={note} onChange={(event) => setNote(event.target.value)} invalid={touched && mode === 'closed' && reason === 'other' && !note.trim()} />
          {touched && mode === 'closed' && reason === 'other' && !note.trim() && <span className="hint err">برای دلیل «سایر» توضیح بنویسید.</span>}
        </div>
        {error && (
          <Alert tone="err" icon="alert-octagon">
            {error}
          </Alert>
        )}
      </div>
    </Modal>
  );
}

/**
 * ادغام ریسک تکراری (risk.md ۱۱، تصمیم 1405/08/15): با `risk.change_status_owner` این ریسک
 * بسته (سایر) و در مقصد ارجاع می‌شود؛ بدون آن فقط پیشنهاد ادغام برای مدیر پروژه ثبت می‌شود.
 */
export function MergeRiskDialog({ risk, canMerge, onClose, onMerged }: { risk: RiskDetailDto; canMerge: boolean; onClose: () => void; onMerged: (targetId: EntityId | null) => void }) {
  const register = useGetRiskRegisterQuery({ projectId: risk.projectId, canViewAmounts: false });
  const [merge, state] = useMergeRiskMutation();
  const [target, setTarget] = useState<EntityId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const options = (register.data?.items ?? [])
    .filter((item) => item.id !== risk.id && item.status !== 'closed')
    .map((item) => ({ value: item.id, label: `${item.code} · ${item.title}` }));

  async function submit() {
    if (!target) return;
    setError(null);
    try {
      await merge({ riskId: risk.id, intoRiskId: target, propose: !canMerge }).unwrap();
      onMerged(canMerge ? target : null);
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="md"
      title={canMerge ? `ادغام ${risk.code}` : `پیشنهاد ادغام ${risk.code}`}
      description={risk.title}
      footer={
        <>
          <AppButton variant="ghost" onClick={onClose}>
            انصراف
          </AppButton>
          <AppButton variant="primary" icon="git-merge" disabled={!target} loading={state.isLoading} onClick={() => void submit()}>
            {canMerge ? 'ادغام و بستن' : 'ارسال پیشنهاد'}
          </AppButton>
        </>
      }
    >
      <div className="col g14">
        <Select label="ریسک مقصد" options={options} value={target} onChange={setTarget} placeholder="ریسک تکراری کدام است؟" />
        <span className="t-13 tx6 lh">
          {canMerge
            ? 'این ریسک با دلیل «سایر» بسته می‌شود و در یادداشت هر دو ریسک ارجاع می‌نشیند. اقدام‌ها و پیوندها منتقل نمی‌شوند.'
            : 'پیشنهاد شما در یادداشت‌ها ثبت و به مدیر پروژه اعلان می‌شود تا ادغام را انجام دهد.'}
        </span>
        {error && (
          <Alert tone="err" icon="alert-octagon">
            {error}
          </Alert>
        )}
      </div>
    </Modal>
  );
}
