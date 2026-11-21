import { useState } from 'react';

import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Icon } from '@/shared/components/ui/Icon';
import { IconButton } from '@/shared/components/ui/IconButton';
import { Modal } from '@/shared/components/ui/Modal';
import { TextInput } from '@/shared/components/ui/TextInput';
import { toEnDigits, toFaDigits } from '@/shared/utils/num';
import { newTempId } from '../../services/draftOps';
import type { DraftItemDto, WbsOp } from '../../types/draft';

/**
 * «تقسیم» برگ دارای گزارش (G13، wbs.md ۵.۶). والد تازه جای برگ را می‌گیرد؛ برگ قدیمی با
 * همان شناسه و همهٔ گزارش‌ها و سرپرست و اتصال‌ها «— بخش ۱» می‌شود و بخش‌های تازه کنارش.
 * وزن‌ها را سرور می‌سازد: به نسبت مقدار اگر همه مقداری با یک واحدند، وگرنه مساوی.
 */
export function SplitDialog({ item, onClose, onSplit }: { item: DraftItemDto; onClose: () => void; onSplit: (op: WbsOp) => void }) {
  const quantity = item.measurementMethod === 'quantity';
  const [keepQuantity, setKeepQuantity] = useState(item.totalQuantity ? toFaDigits(String(item.totalQuantity)) : '');
  const [parts, setParts] = useState([{ tempId: newTempId(), title: `${item.title} — بخش ۲`, quantity: '' }]);

  const parse = (text: string) => {
    const value = Number(toEnDigits(text).replace(/[٬,]/g, ''));
    return text.trim() && Number.isFinite(value) && value > 0 ? value : null;
  };
  const keep = parse(keepQuantity);
  const belowApproved = quantity && keep !== null && item.approvedQuantity !== null && keep < item.approvedQuantity;
  const valid = parts.every((part) => part.title.trim()) && (!quantity || (keep !== null && parts.every((part) => parse(part.quantity) !== null)));

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="md"
      title={`تقسیم «${item.title}»`}
      description="این برگ گزارش دارد و نمی‌تواند والد شود. با تقسیم، شاخه می‌شود و تاریخچهٔ گزارش‌ها دست نمی‌خورد."
      footer={
        <>
          <AppButton variant="ghost" onClick={onClose}>
            انصراف
          </AppButton>
          <AppButton
            variant="primary"
            icon="split"
            disabled={!valid}
            onClick={() => {
              onSplit({
                type: 'split',
                id: item.id,
                keepTitle: item.title,
                keepQuantity: quantity ? keep : null,
                parts: parts.map((part) => ({ tempId: part.tempId, title: part.title.trim(), totalQuantity: quantity ? parse(part.quantity) : null })),
              });
              onClose();
            }}
          >
            تقسیم به {toFaDigits(parts.length + 1)} بخش
          </AppButton>
        </>
      }
    >
      <div className="col g12">
        <div className="box col g4 t-12">
          <span className="fw6 row g6">
            <Icon name="folder" size={13} />
            {item.title} <span className="tx5 fw5">(والد تازه، با همین کد و وزن)</span>
          </span>
          <span className="tx6" style={{ paddingInlineStart: 20 }}>
            ← «{item.title} — بخش ۱»: همین برگ با همهٔ گزارش‌ها، سرپرست و اتصال‌های CBS
          </span>
        </div>

        {quantity && (
          <label className="fg">
            <span className="lbl">مقدار کل «بخش ۱» ({item.unit})</span>
            <TextInput size="sm" value={keepQuantity} inputMode="decimal" invalid={belowApproved} onChange={(event) => setKeepQuantity(event.target.value)} />
            <span className={belowApproved ? 'hint err' : 'hint'}>
              {item.approvedQuantity !== null ? `تأییدشده تا امروز: ${toFaDigits(item.approvedQuantity)} ${item.unit ?? ''}` : 'مقدار باقی‌مانده را به بخش‌های تازه بدهید.'}
              {belowApproved && ' — کمتر از تأییدشده است؛ درصد این بخش روی ۱۰۰ می‌ماند.'}
            </span>
          </label>
        )}

        <span className="sect-t">بخش‌های تازه</span>
        {parts.map((part, index) => (
          <div key={part.tempId} className="row g6 ai-e">
            <label className="fg grow">
              <span className="lbl">عنوان بخش {toFaDigits(index + 2)}</span>
              <TextInput size="sm" value={part.title} onChange={(event) => setParts((previous) => previous.map((p, i) => (i === index ? { ...p, title: event.target.value } : p)))} />
            </label>
            {quantity && (
              <label className="fg" style={{ width: 130 }}>
                <span className="lbl">مقدار ({item.unit})</span>
                <TextInput size="sm" value={part.quantity} inputMode="decimal" onChange={(event) => setParts((previous) => previous.map((p, i) => (i === index ? { ...p, quantity: event.target.value } : p)))} />
              </label>
            )}
            <IconButton icon="x" label={`حذف بخش ${toFaDigits(index + 2)}`} size="sm" disabled={parts.length === 1} onClick={() => setParts((previous) => previous.filter((_, i) => i !== index))} />
          </div>
        ))}
        <button
          type="button"
          className="link t-12 row g4"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => setParts((previous) => [...previous, { tempId: newTempId(), title: `${item.title} — بخش ${toFaDigits(previous.length + 2)}`, quantity: '' }])}
        >
          <Icon name="plus" size={12} />
          بخش دیگر
        </button>

        <Alert tone="inf" icon="info">
          {quantity
            ? 'وزن بخش‌ها به نسبت مقدارشان ساخته می‌شود تا پیشرفت والد همان پیشرفت فعلی برگ بماند. بعد می‌توانید وزن‌ها را عوض کنید.'
            : 'وزن بخش‌ها مساوی ساخته می‌شود؛ بعد می‌توانید عوضشان کنید.'}
        </Alert>
      </div>
    </Modal>
  );
}
