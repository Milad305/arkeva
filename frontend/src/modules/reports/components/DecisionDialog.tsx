import { useState } from 'react';

import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { IconButton } from '@/shared/components/ui/IconButton';
import { Modal } from '@/shared/components/ui/Modal';
import { PhotoThumb } from '@/shared/components/ui/PhotoThumb';
import { Checkbox } from '@/shared/components/ui/SelectionControls';
import { SegmentedControl } from '@/shared/components/ui/Tabs';
import { TextArea, TextInput } from '@/shared/components/ui/TextInput';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { toEnDigits, toFaDigits } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import { useDecideItemMutation, useRequestReportRevisionMutation } from '../api/fieldReportsApi';
import { toPhotos } from '../services/reportView';
import type { FieldItemDto, RequiredActionDto } from '../types';

export type DecisionMode = 'request_revision' | 'reject' | 'report_revision';

interface ActionDraft {
  key: string;
  text: string;
  type: 'check' | 'photo';
  minPhotos: string;
}

/**
 * درخواست اصلاح و رد (approval-workflow.md ۴.۳): یادداشت اجباری. درخواست اصلاح چک‌لیست
 * «کارهای لازم» و علامت عکس نامناسب دارد (M11، تصمیم 1405/08/15). `report_revision` همین
 * را به همهٔ آیتم‌های باز گزارش می‌فرستد.
 */
export function DecisionDialog({
  projectId,
  mode,
  item,
  report,
  onClose,
  onDone,
}: {
  projectId: EntityId;
  mode: DecisionMode;
  item?: FieldItemDto;
  report?: { id: EntityId; pendingCount: number; reportNo: string };
  onClose: () => void;
  onDone: (message: string | null) => void;
}) {
  const [decide, decideState] = useDecideItemMutation();
  const [reviseReport, reviseState] = useRequestReportRevisionMutation();
  const [note, setNote] = useState('');
  const [actions, setActions] = useState<ActionDraft[]>([]);
  const [unsuitable, setUnsuitable] = useState<Set<EntityId>>(new Set());
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRevision = mode !== 'reject';

  const required: RequiredActionDto[] = actions
    .filter((action) => action.text.trim())
    .map((action) => ({
      key: action.key,
      text: action.text.trim(),
      type: action.type,
      ...(action.type === 'photo' ? { minPhotos: Math.max(1, Number(toEnDigits(action.minPhotos)) || 1) } : {}),
    }));

  async function submit() {
    setTouched(true);
    setError(null);
    if (!note.trim()) return;
    try {
      if (mode === 'report_revision' && report) {
        const result = await reviseReport({ projectId, reportId: report.id, note, requiredActions: required }).unwrap();
        onDone(`${toFaDigits(result.count)} آیتم برای اصلاح برگشت.`);
      } else if (item) {
        const result = await decide({
          projectId,
          itemId: item.id,
          decision: mode === 'reject' ? 'reject' : 'request_revision',
          note,
          requiredActions: isRevision ? required : undefined,
          unsuitablePhotoIds: isRevision ? [...unsuitable] : undefined,
        }).unwrap();
        onDone(result.message);
      }
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    }
  }

  const title = mode === 'reject' ? 'رد آیتم' : mode === 'report_revision' ? `درخواست اصلاح گزارش ${report?.reportNo ?? ''}` : 'درخواست اصلاح';
  const description =
    mode === 'report_revision'
      ? `${toFaDigits(report?.pendingCount ?? 0)} آیتم در انتظار این گزارش با همین یادداشت به سرپرست برمی‌گردد.`
      : item
        ? `${item.wbsCode} · ${item.wbsTitle}`
        : undefined;

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="md"
      dismissOnBackdrop={false}
      title={title}
      description={description}
      footer={
        <>
          <AppButton variant="ghost" onClick={onClose}>
            انصراف
          </AppButton>
          <AppButton
            variant={mode === 'reject' ? 'danger' : 'primary'}
            icon={mode === 'reject' ? 'x' : 'rotate-ccw'}
            loading={decideState.isLoading || reviseState.isLoading}
            onClick={() => void submit()}
          >
            {mode === 'reject' ? 'رد کردن' : 'برگشت برای اصلاح'}
          </AppButton>
        </>
      }
    >
      <div className="col g14">
        {mode === 'reject' && (
          <Alert tone="err" icon="alert-octagon">
            رد پایانی است و سرپرست نمی‌تواند همین آیتم را دوباره بفرستد؛ برای اصلاح‌پذیر بودن «درخواست اصلاح» را بزنید.
          </Alert>
        )}
        <div className="fg">
          <label className="lbl" htmlFor="decision-note">
            یادداشت ناظر <span className="req">*</span>
          </label>
          <TextArea
            id="decision-note"
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            invalid={touched && !note.trim()}
            placeholder={mode === 'reject' ? 'دلیل رد را بنویسید' : 'مثلاً «عکس از نمونه‌گیری بتن اضافه شود»'}
          />
          {touched && !note.trim() && <span className="hint err">یادداشت لازم است تا سرپرست بداند چه کند.</span>}
        </div>

        {isRevision && (
          <div className="col g8">
            <span className="row between">
              <span className="lbl" style={{ margin: 0 }}>
                کارهای لازم <span className="opt">(اختیاری)</span>
              </span>
              <AppButton
                size="xs"
                variant="outline"
                icon="plus"
                onClick={() => setActions((current) => [...current, { key: `a${current.length + 1}-${Date.now() % 1000}`, text: '', type: 'check', minPhotos: '۲' }])}
              >
                افزودن کار
              </AppButton>
            </span>
            {actions.length === 0 && <span className="t-12 tx5">در اپ، «ارسال دوباره» تا انجام کارهای عکسی غیرفعال می‌ماند.</span>}
            {actions.map((action, index) => (
              <div key={action.key} className="row wrap g8" style={{ alignItems: 'center' }}>
                <TextInput
                  size="sm"
                  aria-label={`کار لازم ${toFaDigits(index + 1)}`}
                  value={action.text}
                  onChange={(event) => setActions((current) => current.map((entry) => (entry.key === action.key ? { ...entry, text: event.target.value } : entry)))}
                  placeholder="مثلاً «مقدار را با برگهٔ خروج انبار تطبیق دهید»"
                  style={{ flex: '1 1 220px' }}
                />
                <SegmentedControl
                  activeKey={action.type}
                  items={[
                    { key: 'check', label: 'تیک' },
                    { key: 'photo', label: 'عکس' },
                  ]}
                  onChange={(key) => setActions((current) => current.map((entry) => (entry.key === action.key ? { ...entry, type: key as 'check' | 'photo' } : entry)))}
                />
                {action.type === 'photo' && (
                  <TextInput
                    size="sm"
                    aria-label="حداقل عکس"
                    value={action.minPhotos}
                    onChange={(event) => setActions((current) => current.map((entry) => (entry.key === action.key ? { ...entry, minPhotos: event.target.value } : entry)))}
                    suffix="عکس"
                    style={{ width: 90 }}
                  />
                )}
                <IconButton icon="trash-2" label="حذف کار" size="sm" onClick={() => setActions((current) => current.filter((entry) => entry.key !== action.key))} />
              </div>
            ))}
          </div>
        )}

        {mode === 'request_revision' && item && item.photos.length > 0 && (
          <div className="col g8">
            <span className="lbl" style={{ margin: 0 }}>
              عکس‌های نامناسب <span className="opt">(علامت برای سرپرست)</span>
            </span>
            <div className="row wrap g10">
              {toPhotos(item.photos).map((photo) => (
                <div key={photo.id} className="col g4" style={{ alignItems: 'center' }}>
                  <PhotoThumb photo={photo} width={84} className={unsuitable.has(photo.id) ? 'tx-err' : undefined} />
                  <Checkbox
                    checked={unsuitable.has(photo.id)}
                    onChange={() =>
                      setUnsuitable((current) => {
                        const next = new Set(current);
                        if (next.has(photo.id)) next.delete(photo.id);
                        else next.add(photo.id);
                        return next;
                      })
                    }
                    label="نامناسب"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <Alert tone="err" icon="alert-octagon">
            {error}
          </Alert>
        )}
      </div>
    </Modal>
  );
}
