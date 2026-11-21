import { useState } from 'react';

import { AppButton } from '@/shared/components/ui/AppButton';
import { IconButton } from '@/shared/components/ui/IconButton';
import { Modal } from '@/shared/components/ui/Modal';
import { TextInput } from '@/shared/components/ui/TextInput';
import { formatQuantity, toFaDigits } from '@/shared/utils/num';
import { parseNumber } from '@/modules/plan/services/parseNumber';
import type { EntityId } from '@/shared/types/api';
import type { CbsDraftItemDto, CbsOp } from '../../types/draft';
import { Money } from '../Money';

export interface CbsSplitDialogProps {
  item: CbsDraftItemDto;
  onClose: () => void;
  onSplit: (op: CbsOp) => void;
}

const tempId = (): EntityId => `tmp-${crypto.randomUUID().slice(0, 8)}`;
const digits = (text: string) => text.replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[^\d]/g, '');

/**
 * «تقسیم» قلم CBS (cbs.md ۴.۴): قلم با همان شناسه، هزینه‌ها و اتصال‌هایش زیر گروه تازه
 * می‌رود و بخش‌های تازه هم‌سطحش می‌شوند. بخش‌ها همان شیوهٔ قیمت، واحد و نرخ قلم را
 * می‌گیرند؛ فقط مقدار یا مبلغ هر بخش نوشته می‌شود. بودجه را سرور می‌سازد.
 */
export function CbsSplitDialog({ item, onClose, onSplit }: CbsSplitDialogProps) {
  const unitRate = item.pricingMode === 'unit_rate';
  const [parentTitle, setParentTitle] = useState(item.title);
  const [parts, setParts] = useState([{ id: tempId(), title: '', amount: '' }]);
  const [touched, setTouched] = useState(false);

  const partErrors = parts.map((part) => {
    if (!part.title.trim()) return 'عنوان بخش لازم است.';
    if (unitRate) {
      const qty = parseNumber(part.amount);
      return qty !== null && qty > 0 ? null : `مقدار (${item.unit ?? 'واحد'}) باید بزرگ‌تر از صفر باشد.`;
    }
    return digits(part.amount) && BigInt(digits(part.amount)) > 0n ? null : 'مبلغ (ریال) لازم است.';
  });
  const valid = parentTitle.trim() !== '' && partErrors.every((error) => error === null);

  function submit() {
    setTouched(true);
    if (!valid) return;
    onSplit({
      type: 'split',
      id: item.id,
      parentTempId: tempId(),
      parentTitle: parentTitle.trim(),
      parts: parts.map((part) => ({
        tempId: part.id,
        title: part.title.trim(),
        ...(unitRate ? { qty: parseNumber(part.amount)! } : { pricing: 'lump_sum' as const, lump: digits(part.amount) }),
      })),
    });
    onClose();
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="lg"
      title={`تقسیم «${item.title}»`}
      description="قلم فعلی با هزینه‌ها و اتصال‌هایش بخش اول می‌شود و زیر گروه تازه‌ای با عنوان زیر می‌رود."
      footer={
        <>
          <AppButton variant="ghost" onClick={onClose}>
            انصراف
          </AppButton>
          <AppButton variant="primary" icon="split" onClick={submit}>
            تقسیم
          </AppButton>
        </>
      }
    >
      <div className="col g12">
        <div className="fg">
          <label className="lbl" htmlFor="split-parent">
            عنوان گروه تازه
          </label>
          <TextInput id="split-parent" value={parentTitle} onChange={(event) => setParentTitle(event.target.value)} invalid={touched && !parentTitle.trim()} />
        </div>

        <div className="box col g4" style={{ padding: '8px 10px' }}>
          <span className="t-12 fw5 tx8">بخش ۱ — همین قلم (بدون تغییر)</span>
          <span className="t-12 tx6">
            <span className="mono" dir="ltr">
              {item.code}.1
            </span>{' '}
            · {unitRate ? formatQuantity(item.estimatedQuantity, item.unit) : 'مقطوع'} · بودجه <Money value={item.budget} className="t-12 tx8" />
          </span>
        </div>

        {parts.map((part, index) => {
          const n = toFaDigits(index + 2);
          const update = (patch: Partial<typeof part>) => setParts((list) => list.map((entry) => (entry.id === part.id ? { ...entry, ...patch } : entry)));
          return (
            <div key={part.id} className="box col g8" style={{ padding: '10px 12px' }}>
              <div className="row between">
                <span className="t-12 fw5 tx8">بخش {n} — قلم تازه</span>
                <IconButton icon="x" label={`حذف بخش ${n}`} size="sm" disabled={parts.length === 1} onClick={() => setParts((list) => list.filter((entry) => entry.id !== part.id))} />
              </div>
              <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 10 }}>
                <div className="fg">
                  <label className="lbl" htmlFor={`split-title-${part.id}`}>
                    عنوان
                  </label>
                  <TextInput id={`split-title-${part.id}`} size="sm" value={part.title} invalid={touched && !part.title.trim()} onChange={(event) => update({ title: event.target.value })} />
                </div>
                <div className="fg">
                  <label className="lbl" htmlFor={`split-amount-${part.id}`}>
                    {unitRate ? `مقدار (${item.unit ?? 'واحد'})` : 'مبلغ (ریال)'}
                  </label>
                  <TextInput
                    id={`split-amount-${part.id}`}
                    size="sm"
                    ltr={!unitRate}
                    value={part.amount}
                    invalid={touched && Boolean(partErrors[index]) && Boolean(part.title.trim())}
                    onChange={(event) => update({ amount: event.target.value })}
                  />
                </div>
              </div>
              {touched && partErrors[index] && <span className="hint err">{partErrors[index]}</span>}
              {unitRate && <span className="hint">نرخ و واحد همان قلم اصلی است.</span>}
            </div>
          );
        })}
        <AppButton variant="ghost" size="sm" icon="plus" style={{ alignSelf: 'flex-start' }} onClick={() => setParts((list) => [...list, { id: tempId(), title: '', amount: '' }])}>
          بخش دیگر
        </AppButton>
        <span className="hint">بخش‌های تازه بودجهٔ تازه‌اند؛ در پروژهٔ فعال این تغییر «بازنگری بودجه» است. اتصال کار به بخش‌ها در «اتصالات» انجام می‌شود.</span>
      </div>
    </Modal>
  );
}
