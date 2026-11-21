import { useState } from 'react';

import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Modal } from '@/shared/components/ui/Modal';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import { TextArea, TextInput } from '@/shared/components/ui/TextInput';
import { formatQuantity, toEnDigits, toFaDigits } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import { useCreateBudgetRevisionRequestMutation, useGetCbsItemQuery } from '../api/cbsApi';
import type { BudgetRevisionRequestDto, CbsItemDetailDto, RevisionField } from '../types';
import { Money } from './Money';

export interface RevisionRequestDialogProps {
  projectId: EntityId;
  detail: CbsItemDetailDto;
  onClose: () => void;
}

const FIELD_LABEL: Record<RevisionField, string> = {
  unitRate: 'نرخ واحد',
  estimatedQuantity: 'مقدار برآورد',
  lumpSumAmount: 'مبلغ مقطوع',
};

/**
 * G14 — «درخواست بازنگری بودجه» (cbs.md ۷.۲ و ۷.۳). درخواست‌دهنده تغییر و دلیل را می‌نویسد؛
 * اثر بر بودجه و BAC را سرور هنگام ثبت می‌سازد و اینجا فقط نمایش داده می‌شود (D07).
 * تأیید یا رد با حالت ویرایش CBS می‌آید (تصمیم 1405/08/15).
 */
export function RevisionRequestDialog({ projectId, detail, onClose }: RevisionRequestDialogProps) {
  const { item } = detail;
  const fields: RevisionField[] = item.pricingMode === 'unit_rate' ? ['unitRate', 'estimatedQuantity'] : ['lumpSumAmount'];
  const [field, setField] = useState<RevisionField>(fields[0]!);
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [created, setCreated] = useState<BudgetRevisionRequestDto | null>(null);
  const [create, state] = useCreateBudgetRevisionRequestMutation();

  const current =
    field === 'unitRate' ? item.unitRate : field === 'estimatedQuantity' ? String(item.estimatedQuantity ?? '') : item.lumpSumAmount;
  const digits = toEnDigits(value).replace(/[^\d]/g, '');
  const valueError = touched && (digits === '' || digits === '0') ? 'مقدار تازه را وارد کنید.' : touched && digits === current ? 'مقدار تازه با مقدار فعلی یکی است.' : null;
  const reasonError = touched && reason.trim().length < 5 ? 'دلیل را بنویسید؛ مدیر پروژه بر اساس آن تصمیم می‌گیرد.' : null;
  const isMoney = field !== 'estimatedQuantity';

  const options: Array<SelectOption<RevisionField>> = fields.map((key) => ({ value: key, label: FIELD_LABEL[key] }));

  async function submit() {
    setTouched(true);
    if (digits === '' || digits === '0' || digits === current || reason.trim().length < 5) return;
    try {
      const result = await create({
        projectId,
        reason: reason.trim(),
        changes: [{ cbsItemId: item.id, field, from: current ?? '', to: digits }],
      }).unwrap();
      setCreated(result);
    } catch {
      // پیام را میان‌افزار سراسری نشان می‌دهد؛ فرم باز می‌ماند
    }
  }

  if (created) {
    return (
      <Modal
        isOpen
        onClose={onClose}
        title="درخواست ثبت شد"
        footer={
          <AppButton variant="primary" onClick={onClose}>
            بستن
          </AppButton>
        }
      >
        <div className="col g12">
          <Alert tone="ok" icon="check-circle-2">
            درخواست برای مدیر پروژه فرستاده شد و در فهرست «درخواست‌های بازنگری» دیده می‌شود.
          </Alert>
          <div className="box col g6" style={{ padding: '10px 12px' }}>
            <span className="sect-t">اثر برآوردشده (محاسبهٔ سرور)</span>
            <div className="row between t-12 tx7">
              <span>تغییر بودجهٔ قلم</span>
              <Money value={created.impact.budgetChange} className="t-12 fw6 tx9" />
            </div>
            <div className="row between t-12 tx7">
              <span>تغییر BAC</span>
              <Money value={created.impact.bacChange} className="t-12 fw6 tx9" />
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="درخواست بازنگری بودجه"
      description={`${item.code} · ${item.title}`}
      footer={
        <>
          <AppButton variant="ghost" onClick={onClose}>
            انصراف
          </AppButton>
          <AppButton variant="primary" icon="send" loading={state.isLoading} onClick={() => void submit()}>
            فرستادن درخواست
          </AppButton>
        </>
      }
    >
      <div className="col g12">
        <div className="fg">
          <span className="lbl">چه چیزی تغییر کند</span>
          <Select label="فیلد بازنگری" options={options} value={field} onChange={(next) => { setField(next); setValue(''); }} />
        </div>
        <div className="grid c2" style={{ gap: 12 }}>
          <div className="fg">
            <span className="lbl">مقدار فعلی</span>
            <span className="t-13 tx8" style={{ padding: '8px 0' }}>
              {isMoney ? <Money value={current} className="t-13 tx8" /> : formatQuantity(item.estimatedQuantity, item.unit)}
            </span>
          </div>
          <div className="fg">
            <label className="lbl" htmlFor="revision-value">
              مقدار تازه {isMoney ? '(ریال)' : item.unit ? `(${item.unit})` : ''}
            </label>
            <TextInput
              id="revision-value"
              inputMode="numeric"
              dir="ltr"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onBlur={() => value && setTouched(true)}
              placeholder={isMoney ? 'مثلاً 102000000' : undefined}
              aria-invalid={valueError ? true : undefined}
            />
            {valueError ? <span className="hint err">{valueError}</span> : digits && isMoney ? <span className="hint">{toFaDigits(Number(digits).toLocaleString('en-US'))} ریال</span> : null}
          </div>
        </div>
        <div className="fg">
          <label className="lbl" htmlFor="revision-reason">
            دلیل (اجباری)
          </label>
          <TextArea
            id="revision-reason"
            rows={3}
            maxLength={1000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="مثلاً «نرخ آرماتور در قرارداد تازهٔ تأمین ۷٪ بالاتر است»"
            aria-invalid={reasonError ? true : undefined}
          />
          {reasonError && <span className="hint err">{reasonError}</span>}
        </div>
        <span className="t-xs tx5">
          اثر بر بودجه و BAC را سرور هنگام ثبت حساب می‌کند. با تأیید مدیر پروژه، بازنگری بودجه نسخهٔ تازه‌ای از برنامه می‌سازد و در تاریخچهٔ نرخ دیده می‌شود.
        </span>
      </div>
    </Modal>
  );
}

/** دیالوگ به جزئیات قلم نیاز دارد (مقدار فعلی)؛ از کش همان پنل خوانده می‌شود. */
export function RevisionDialogLoader({ projectId, itemId, onClose }: { projectId: EntityId; itemId: EntityId; onClose: () => void }) {
  const { data } = useGetCbsItemQuery({ projectId, itemId });
  if (!data || data.item.id !== itemId) return null;
  return <RevisionRequestDialog projectId={projectId} detail={data} onClose={onClose} />;
}

