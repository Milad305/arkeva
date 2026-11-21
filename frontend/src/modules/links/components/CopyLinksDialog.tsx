import { useMemo, useState } from 'react';

import { AppButton } from '@/shared/components/ui/AppButton';
import { Modal } from '@/shared/components/ui/Modal';
import { Checkbox } from '@/shared/components/ui/SelectionControls';
import { TextInput } from '@/shared/components/ui/TextInput';
import { toFaDigits } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import type { LinkLeafDto, LinkOp } from '../types';

export interface CopyLinksDialogProps {
  source: LinkLeafDto;
  leaves: LinkLeafDto[];
  linkCount: number;
  onClose: () => void;
  onCopy: (op: LinkOp) => void;
}

const normalize = (value: string) =>
  value.trim().toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک');

/**
 * «کپی اتصالات به…» (بوم W15؛ `[پیشنهاد تأییدشده 1405/08/15]`): همان اقلام CBS به برگ‌های
 * مقصد، به نسبت مقدار کل اگر هر دو مقداری با یک واحدند، وگرنه همان مقدارها. اتصال هم‌قلم
 * مقصد با مقدار کپی‌شده یکی می‌شود؛ بقیهٔ اتصال‌های مقصد می‌مانند. محاسبه با سرور است.
 */
export function CopyLinksDialog({
  source,
  leaves,
  linkCount,
  onClose,
  onCopy,
}: CopyLinksDialogProps) {
  const [search, setSearch] = useState('');
  const [chosen, setChosen] = useState<Set<EntityId>>(() => new Set());
  const candidates = useMemo(() => {
    const term = normalize(search);
    return leaves.filter(
      (leaf) =>
        leaf.linkable &&
        leaf.id !== source.id &&
        (!term || normalize(leaf.title).includes(term) || leaf.code.includes(term)),
    );
  }, [leaves, search, source.id]);

  const toggle = (id: EntityId) =>
    setChosen((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="کپی اتصالات"
      description={`${toFaDigits(linkCount)} اتصال «${source.title}» به فعالیت‌های انتخاب‌شده کپی می‌شود.`}
      footer={
        <>
          <AppButton variant="ghost" onClick={onClose}>
            انصراف
          </AppButton>
          <AppButton
            variant="primary"
            icon="copy"
            disabled={chosen.size === 0}
            onClick={() => {
              onCopy({ type: 'copy', fromWbsItemId: source.id, toWbsItemIds: [...chosen] });
              onClose();
            }}
          >
            {chosen.size > 0 ? `کپی به ${toFaDigits(chosen.size)} فعالیت` : 'کپی'}
          </AppButton>
        </>
      }
    >
      <div className="col g12">
        <TextInput
          size="sm"
          icon="search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="جستجوی فعالیت مقصد…"
          aria-label="جستجوی فعالیت مقصد"
        />
        <div className="box col" style={{ maxHeight: 300, overflowY: 'auto', padding: 4, gap: 2 }}>
          {candidates.length === 0 ? (
            <span className="t-12 tx6" style={{ padding: 8 }}>
              فعالیتی پیدا نشد.
            </span>
          ) : (
            candidates.map((leaf) => (
              <div key={leaf.id} className="row between g8" style={{ padding: '4px 6px' }}>
                <Checkbox
                  checked={chosen.has(leaf.id)}
                  onChange={() => toggle(leaf.id)}
                  label={leaf.title}
                />
                <span className="row g6 t-xs tx5">
                  {leaf.linkCount > 0 && <span>{toFaDigits(leaf.linkCount)} اتصال</span>}
                  <span className="mono" dir="ltr">
                    {leaf.code}
                  </span>
                </span>
              </div>
            ))
          )}
        </div>
        <span className="hint">
          اگر مبدأ و مقصد هر دو مقداری با یک واحدند، مقدار اتصال‌ها به نسبت مقدار کل دو فعالیت
          می‌شود؛ وگرنه همان مقدارها کپی می‌شوند. پیش از ذخیره زیربودجه‌ها را در جدول ببینید.
        </span>
      </div>
    </Modal>
  );
}
