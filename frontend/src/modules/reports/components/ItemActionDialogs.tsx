import { useState } from 'react';

import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Modal } from '@/shared/components/ui/Modal';
import { TextArea, TextInput } from '@/shared/components/ui/TextInput';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { formatJalaliDate, jalaliToIso, todayIso } from '@/shared/utils/date';
import { faNum, formatPercentAuto, formatQuantity, toEnDigits, toFaDigits } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import {
  useCorrectItemMutation,
  useCreateManualReportMutation,
  useGetLeafReportContextQuery,
  useResolveItemMutation,
  useRevokeAutoMutation,
} from '../api/fieldReportsApi';
import type { FieldItemDto, FieldValuesInput, LeafReportContextDto } from '../types';

const parse = (text: string): number | null => {
  const value = Number(toEnDigits(text).replace(/[٫/]/g, '.').replace(/[٬,]/g, ''));
  return text.trim() && Number.isFinite(value) ? value : null;
};

interface ValuesDraft {
  quantity: string;
  percent: string;
  info: string;
  steps: Record<string, string>;
}

/** ورودی روش برگ (D03): مقدار امروز، درصد تجمعی با مقدار اطلاعاتی، یا درصد هر گام. */
function ValuesFields({ context, draft, onChange }: { context: LeafReportContextDto; draft: ValuesDraft; onChange: (next: ValuesDraft) => void }) {
  if (context.method === 'quantity') {
    return (
      <div className="fg">
        <label className="lbl" htmlFor="val-qty">
          مقدار امروز <span className="req">*</span>
        </label>
        <TextInput id="val-qty" value={draft.quantity} onChange={(event) => onChange({ ...draft, quantity: event.target.value })} suffix={context.unit ?? undefined} />
        <span className="hint">
          تأییدشده تا امروز: {faNum(context.approvedQuantity ?? 0)} از {formatQuantity(context.totalQuantity, context.unit)} ({formatPercentAuto(context.approvedPercent)})
        </span>
      </div>
    );
  }
  if (context.method === 'steps' && context.steps) {
    return (
      <div className="col g8">
        <span className="lbl" style={{ margin: 0 }}>
          درصد هر گام <span className="req">*</span>
        </span>
        {context.steps.map((step) => (
          <div key={step.key} className="row g10">
            <span className="t-13 tx8 grow">
              {step.title} <span className="t-xs tx5">(وزن {formatPercentAuto(step.weight)} · تأییدشده {formatPercentAuto(step.approvedPercent)})</span>
            </span>
            <TextInput
              size="sm"
              aria-label={`درصد گام ${step.title}`}
              value={draft.steps[step.key] ?? ''}
              placeholder={toFaDigits(step.approvedPercent)}
              onChange={(event) => onChange({ ...draft, steps: { ...draft.steps, [step.key]: event.target.value } })}
              suffix="٪"
              style={{ width: 110 }}
            />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid c2 rsp" style={{ gap: 12 }}>
      <div className="fg">
        <label className="lbl" htmlFor="val-pct">
          درصد تجمعی <span className="req">*</span>
        </label>
        <TextInput id="val-pct" value={draft.percent} onChange={(event) => onChange({ ...draft, percent: event.target.value })} suffix="٪" />
        <span className="hint">آخرین تأییدشده: {formatPercentAuto(context.approvedPercent)}</span>
      </div>
      {context.unit && (
        <div className="fg">
          <label className="lbl" htmlFor="val-info">
            مقدار اطلاعاتی <span className="opt">(اختیاری)</span>
          </label>
          <TextInput id="val-info" value={draft.info} onChange={(event) => onChange({ ...draft, info: event.target.value })} suffix={context.unit} />
        </div>
      )}
    </div>
  );
}

function toValues(context: LeafReportContextDto, draft: ValuesDraft): FieldValuesInput {
  if (context.method === 'quantity') return { quantityToday: parse(draft.quantity) };
  if (context.method === 'steps') {
    const steps: Record<string, number> = {};
    Object.entries(draft.steps).forEach(([key, value]) => {
      const parsed = parse(value);
      if (parsed !== null) steps[key] = parsed;
    });
    return { steps };
  }
  return { reportedPercent: parse(draft.percent), reportedQuantityInfo: parse(draft.info) };
}

const EMPTY_DRAFT: ValuesDraft = { quantity: '', percent: '', info: '', steps: {} };

/**
 * G10 — ثبت دستی پیشرفت در وب (approval-workflow.md ۵.۳): برگ از W11، تاریخ کار (نه آینده)،
 * ورودی روش برگ و یادداشت اجباری. هرگز خودکار تأیید نمی‌شود و نزد جایگزین می‌رود.
 */
export function ManualEntryDialog({ projectId, wbsItemId, onClose, onCreated }: { projectId: EntityId; wbsItemId: EntityId; onClose: () => void; onCreated: (reportId: EntityId) => void }) {
  const context = useGetLeafReportContextQuery({ projectId, wbsItemId });
  const [create, state] = useCreateManualReportMutation();
  const [draft, setDraft] = useState<ValuesDraft>(EMPTY_DRAFT);
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workDate = date.trim() ? jalaliToIso(toEnDigits(date.trim())) : todayIso();
  const dateError = date.trim() && !workDate ? 'تاریخ را شمسی مثل ۱۴۰۵/۰۸/۱۹ بنویسید.' : workDate && workDate > todayIso() ? 'تاریخ کار نمی‌تواند در آینده باشد.' : null;
  const timeBased = context.data?.method === 'time_based';

  async function submit() {
    setTouched(true);
    setError(null);
    if (!context.data || !note.trim() || dateError || !workDate || timeBased) return;
    try {
      const report = await create({ projectId, wbsItemId, workDate, note, ...toValues(context.data, draft) }).unwrap();
      onCreated(report.id);
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="md"
      dismissOnBackdrop={false}
      title="ثبت گزارش دستی"
      description={context.data ? `${context.data.code} · ${context.data.title}` : undefined}
      footer={
        <>
          <AppButton variant="ghost" onClick={onClose}>
            انصراف
          </AppButton>
          <AppButton variant="primary" icon="file-pen-line" loading={state.isLoading} disabled={!context.data || timeBased} onClick={() => void submit()}>
            ثبت و ارسال برای تأیید
          </AppButton>
        </>
      }
    >
      {context.isLoading ? (
        <SkeletonTable rows={3} />
      ) : !context.data ? (
        <Alert tone="err" icon="alert-octagon">
          این فعالیت پیدا نشد؛ از WBS دوباره امتحان کنید.
        </Alert>
      ) : timeBased ? (
        <Alert tone="inf" icon="info">
          پیشرفت فعالیت زمانی از تاریخ‌های برنامه محاسبه می‌شود و گزارش نمی‌گیرد.
        </Alert>
      ) : (
        <div className="col g14">
          <div className="fg">
            <label className="lbl" htmlFor="manual-date">
              تاریخ کار
            </label>
            <TextInput id="manual-date" icon="calendar" ltr placeholder={formatJalaliDate(todayIso())} value={date} onChange={(event) => setDate(event.target.value)} invalid={Boolean(dateError)} />
            {dateError ? <span className="hint err">{dateError}</span> : <span className="hint">خالی بماند یعنی امروز ({formatJalaliDate(todayIso())}).</span>}
          </div>
          <ValuesFields context={context.data} draft={draft} onChange={setDraft} />
          <div className="fg">
            <label className="lbl" htmlFor="manual-note">
              یادداشت <span className="req">*</span>
            </label>
            <TextArea id="manual-note" rows={3} value={note} onChange={(event) => setNote(event.target.value)} invalid={touched && !note.trim()} placeholder="منبع این عدد چیست؟ مثلاً «صورت‌جلسهٔ بازدید ۱۹ آبان»" />
            {touched && !note.trim() && <span className="hint err">یادداشت لازم است تا تأییدکننده بداند عدد از کجاست.</span>}
          </div>
          <Alert tone="inf" icon="user-check">
            ثبت دستی هرگز خودکار تأیید نمی‌شود و چون نویسندهٔ آن شما هستید، نزد تأییدکنندهٔ جایگزین می‌رود.
          </Alert>
          {error && (
            <Alert tone="err" icon="alert-octagon">
              {error}
            </Alert>
          )}
        </div>
      )}
    </Modal>
  );
}

/** اصلاح بعد از تأیید (۴.۷): آیتم تازهٔ `correction` با دلیل اجباری؛ قبلی `superseded`. */
export function CorrectItemDialog({ projectId, item, onClose, onDone }: { projectId: EntityId; item: FieldItemDto; onClose: () => void; onDone: (message: string | null) => void }) {
  const context = useGetLeafReportContextQuery({ projectId, wbsItemId: item.wbsItemId });
  const [correct, state] = useCorrectItemMutation();
  const [draft, setDraft] = useState<ValuesDraft>({
    quantity: item.quantityToday != null ? toFaDigits(String(item.quantityToday)) : '',
    percent: item.method === 'percent' ? toFaDigits(String(item.computedPercent)) : '',
    info: item.reportedQuantityInfo != null ? toFaDigits(String(item.reportedQuantityInfo)) : '',
    steps: Object.fromEntries((item.stepsProgress ?? []).map((step) => [step.key, toFaDigits(String(step.toPercent))])),
  });
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setTouched(true);
    setError(null);
    if (!context.data || !reason.trim()) return;
    try {
      const result = await correct({ projectId, itemId: item.id, values: toValues(context.data, draft), reason }).unwrap();
      onDone(result.message);
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="md"
      dismissOnBackdrop={false}
      title="اصلاح آیتم تأییدشده"
      description={`${item.wbsCode} · ${item.wbsTitle}`}
      footer={
        <>
          <AppButton variant="ghost" onClick={onClose}>
            انصراف
          </AppButton>
          <AppButton variant="primary" icon="file-pen-line" loading={state.isLoading} onClick={() => void submit()}>
            ثبت اصلاح
          </AppButton>
        </>
      }
    >
      <div className="col g14">
        <Alert tone="inf" icon="history">
          آیتم فعلی دست نمی‌خورد و «جایگزین‌شده» می‌شود؛ آیتم اصلاحی تازه‌ای با همان تاریخ کار و مستقیم تأییدشده ساخته و در ممیزی ثبت می‌شود.
        </Alert>
        {context.data ? <ValuesFields context={{ ...context.data, approvedPercent: item.lastApprovedPercent }} draft={draft} onChange={setDraft} /> : <SkeletonTable rows={2} />}
        <div className="fg">
          <label className="lbl" htmlFor="correct-reason">
            دلیل اصلاح <span className="req">*</span>
          </label>
          <TextArea id="correct-reason" rows={2} value={reason} onChange={(event) => setReason(event.target.value)} invalid={touched && !reason.trim()} />
          {touched && !reason.trim() && <span className="hint err">دلیل اصلاح لازم است.</span>}
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

/** برگرداندن تأیید خودکار در مهلت (۴.۶) و تعیین تکلیف (۴.۸). */
export function NoteActionDialog({
  projectId,
  item,
  kind,
  onClose,
  onDone,
}: {
  projectId: EntityId;
  item: FieldItemDto;
  kind: 'revoke' | 'resolve';
  onClose: () => void;
  onDone: (message: string | null) => void;
}) {
  const [revoke, revokeState] = useRevokeAutoMutation();
  const [resolve, resolveState] = useResolveItemMutation();
  const [note, setNote] = useState(item.resolution === 'leaf_removed' ? 'فعالیت در بازنگری برنامه حذف شده است.' : '');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canAccept = kind === 'resolve' && item.resolution === 'reassigned';

  async function run(accept: boolean) {
    setTouched(true);
    setError(null);
    if (!note.trim() && !(kind === 'resolve' && accept)) return;
    try {
      const result = kind === 'revoke' ? await revoke({ projectId, itemId: item.id, note }).unwrap() : await resolve({ projectId, itemId: item.id, accept, note }).unwrap();
      onDone(result.message);
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="sm"
      title={kind === 'revoke' ? 'برگرداندن تأیید خودکار' : 'تعیین تکلیف آیتم'}
      description={`${item.wbsCode} · ${item.wbsTitle}`}
      footer={
        <>
          <AppButton variant="ghost" onClick={onClose}>
            انصراف
          </AppButton>
          {kind === 'resolve' && (
            <AppButton variant="dangerOutline" loading={resolveState.isLoading} onClick={() => void run(false)}>
              رد
            </AppButton>
          )}
          {kind === 'revoke' ? (
            <AppButton variant="primary" icon="undo-2" loading={revokeState.isLoading} onClick={() => void run(false)}>
              برگرداندن
            </AppButton>
          ) : (
            canAccept && (
              <AppButton variant="primary" loading={resolveState.isLoading} onClick={() => void run(true)}>
                پذیرش و بررسی
              </AppButton>
            )
          )}
        </>
      }
    >
      <div className="col g12">
        <span className="t-13 tx7 lh">
          {kind === 'revoke'
            ? 'آیتم به «نیاز اصلاح» برمی‌گردد و اثرش از پیشرفت حذف می‌شود. سرپرست اعلان می‌گیرد.'
            : item.resolution === 'leaf_removed'
              ? 'فعالیت این آیتم در بازنگری برنامه حذف شده است؛ فقط «رد» ممکن است.'
              : 'این فعالیت دیگر به نویسندهٔ گزارش سپرده نیست. با «پذیرش»، آیتم وارد بررسی عادی می‌شود.'}
        </span>
        <div className="fg">
          <label className="lbl" htmlFor="action-note">
            یادداشت {kind === 'revoke' ? <span className="req">*</span> : <span className="opt">(برای رد لازم است)</span>}
          </label>
          <TextArea id="action-note" rows={2} value={note} onChange={(event) => setNote(event.target.value)} invalid={touched && !note.trim()} />
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
