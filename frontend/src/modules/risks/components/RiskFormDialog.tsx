import { useMemo, useState } from 'react';

import { RISK_LEVEL } from '@/config/constants';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import { Checkbox } from '@/shared/components/ui/SelectionControls';
import { SegmentedControl } from '@/shared/components/ui/Tabs';
import { TextArea, TextInput } from '@/shared/components/ui/TextInput';
import { formatJalaliDate, jalaliToIso } from '@/shared/utils/date';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { toEnDigits, toFaDigits } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import { useHasPermission } from '@/shared/hooks/useHasAccess';
import { useGetCbsTreeQuery } from '@/modules/cbs/api/cbsApi';
import { useGetWbsTreeQuery } from '@/modules/wbs/api/wbsApi';
import { useCreateRiskMutation, useGetRiskPeopleQuery, useUpdateRiskMutation } from '../api/risksApi';
import { cellLevel, IMPACT_SCALE, PROBABILITY_SCALE, STRATEGY_LABEL } from '../services/riskView';
import type { ResponseStrategy, RiskDetailDto } from '../types';
import { RiskMatrix } from './RiskMatrix';

export interface RiskFormDialogProps {
  projectId: EntityId;
  projectName: string;
  categories: string[];
  /** شناسهٔ بعدی (C05) — فقط در ثبت. */
  nextCode?: string | null;
  /** ویرایش ریسک موجود؛ نبودن یعنی ثبت تازه (W44). */
  risk?: RiskDetailDto;
  /** برگ از پیوند W11 (`?wbsItem=`). */
  initialWbsItemId?: EntityId | null;
  onClose: () => void;
  onSaved: (riskId: EntityId) => void;
}

const STRATEGIES: ResponseStrategy[] = ['avoid', 'mitigate', 'transfer', 'accept'];
const billions = (rial: string | null) => (rial ? toFaDigits(String(Math.round(Number(rial) / 1e8) / 10)).replace('.', '٫') : '');
const parseBillions = (text: string): string | null => {
  const value = Number(toEnDigits(text).replace(/[٫/]/g, '.').replace(/[٬,]/g, ''));
  return text.trim() && Number.isFinite(value) && value >= 0 ? String(Math.round(value * 1e9)) : null;
};

/**
 * W44 — ثبت ریسک (risk.md ۸) و ویرایش همان فیلدها. امتیاز کنار فرم پیش‌نمایش لحظه‌ای است
 * و سرور داور است (CLAUDE.md ۳.۵). امتیاز ≥ ۱۵ همیشه اعلان فوری دارد (AC-RK-02)؛ برای کمتر،
 * اعلان با انتخاب کاربر (تصمیم 1405/08/15).
 */
export function RiskFormDialog({ projectId, projectName, categories, nextCode, risk, initialWbsItemId, onClose, onSaved }: RiskFormDialogProps) {
  const canViewAmounts = useHasPermission('cbs.view_amounts');
  const people = useGetRiskPeopleQuery(projectId);
  const wbs = useGetWbsTreeQuery(projectId);
  const cbs = useGetCbsTreeQuery(projectId, { skip: !canViewAmounts && false });
  const [create, createState] = useCreateRiskMutation();
  const [update, updateState] = useUpdateRiskMutation();

  const initialWbs = risk?.links.find((link) => link.kind === 'wbs_item')?.targetId ?? initialWbsItemId ?? null;
  const [title, setTitle] = useState(risk?.title ?? '');
  const [category, setCategory] = useState(risk?.category ?? categories[0] ?? 'فنی');
  const [wbsItemId, setWbsItemId] = useState<string>(initialWbs ?? 'none');
  const [cbsItemId, setCbsItemId] = useState<string>(risk?.links.find((link) => link.kind === 'cbs_item')?.targetId ?? 'none');
  const [probability, setProbability] = useState<number | null>(risk?.probability ?? null);
  const [impact, setImpact] = useState<number | null>(risk?.impact ?? null);
  const [cause, setCause] = useState(risk?.cause ?? '');
  const [event, setEvent] = useState(risk?.event ?? '');
  const [consequence, setConsequence] = useState(risk?.consequence ?? '');
  const [strategy, setStrategy] = useState<ResponseStrategy | null>(risk?.responseStrategy ?? 'mitigate');
  const [ownerId, setOwnerId] = useState<string | null>(risk?.owner.id ?? null);
  const [trigger, setTrigger] = useState(risk?.triggerText ?? '');
  const [actionTitle, setActionTitle] = useState('');
  const [actionDue, setActionDue] = useState('');
  const [cost, setCost] = useState(billions(risk?.costImpact ?? null));
  const [days, setDays] = useState(risk?.scheduleImpactDays != null ? toFaDigits(risk.scheduleImpactDays) : '');
  const [targetP, setTargetP] = useState<number | null>(risk?.targetProbability ?? null);
  const [targetI, setTargetI] = useState<number | null>(risk?.targetImpact ?? null);
  const [notify, setNotify] = useState(true);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const owner = ownerId ?? people.data?.managerId ?? null;
  const score = probability && impact ? probability * impact : null;
  const level = probability && impact ? cellLevel(probability, impact) : null;
  const dueIso = actionDue.trim() ? jalaliToIso(toEnDigits(actionDue.trim())) : null;

  const wbsOptions: Array<SelectOption<string>> = useMemo(
    () => [{ value: 'none', label: 'بدون پیوند WBS' }, ...(wbs.data?.items ?? []).filter((item) => item.isLeaf).map((item) => ({ value: item.id, label: `${item.code} · ${item.title}` }))],
    [wbs.data],
  );
  const cbsOptions: Array<SelectOption<string>> = useMemo(
    () => [{ value: 'none', label: 'بدون قلم CBS' }, ...(cbs.data?.items ?? []).filter((item) => item.isLeaf).map((item) => ({ value: item.id, label: `${item.code} · ${item.title}` }))],
    [cbs.data],
  );

  const errors = {
    title: title.trim().length < 4 ? 'عنوان ریسک را کامل بنویسید.' : null,
    score: (probability === null) !== (impact === null) ? 'احتمال و اثر را با هم بدهید، یا هر دو را خالی بگذارید.' : null,
    due: actionTitle.trim() && !dueIso ? 'سررسید را شمسی مثل ۱۴۰۵/۰۹/۱۵ بنویسید.' : null,
  };

  async function submit() {
    setTouched(true);
    setError(null);
    if (errors.title || errors.score || errors.due || !owner) return;
    const input = {
      title,
      category,
      probability,
      impact,
      cause,
      event,
      consequence,
      responseStrategy: strategy,
      ownerUserId: owner,
      triggerText: trigger,
      costImpact: canViewAmounts ? parseBillions(cost) : (risk?.costImpact ?? null),
      scheduleImpactDays: days.trim() ? Number(toEnDigits(days)) || null : null,
      targetProbability: targetP,
      targetImpact: targetI,
      nextReviewDate: risk?.nextReviewDate ?? null,
      reviewFrequency: risk?.reviewFrequency ?? null,
      links: [
        ...(wbsItemId !== 'none' ? [{ kind: 'wbs_item' as const, targetId: wbsItemId }] : []),
        ...(cbsItemId !== 'none' ? [{ kind: 'cbs_item' as const, targetId: cbsItemId }] : []),
      ],
    };
    try {
      const saved = risk
        ? await update({ riskId: risk.id, input }).unwrap()
        : await create({ projectId, ...input, firstAction: actionTitle.trim() ? { title: actionTitle.trim(), dueDate: dueIso } : null, notifyBelowThreshold: notify }).unwrap();
      onSaved(saved.id);
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    }
  }

  const scaleItems = (value: number | null) => [1, 2, 3, 4, 5].map((step) => ({ key: String(step), label: toFaDigits(step) })).concat(value === null ? [] : []);

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="lg"
      dismissOnBackdrop={false}
      title={risk ? `ویرایش ${risk.code}` : 'ثبت ریسک جدید'}
      description={
        risk ? (
          risk.title
        ) : (
          <>
            {projectName} · شناسه پس از ثبت: <span className="mono">{nextCode ?? '—'}</span>
          </>
        )
      }
      footer={
        <>
          {!risk ? (
            score !== null && score >= 15 ? (
              <span className="t-12 tx7">امتیاز ۱۵ و بیشتر فوری به مدیر پروژه و مالک اعلان می‌شود.</span>
            ) : (
              <Checkbox checked={notify} onChange={(event) => setNotify(event.target.checked)} label="اعلان به مدیر پروژه و مالک ریسک" />
            )
          ) : (
            <span />
          )}
          <span className="row g8">
            <AppButton variant="ghost" onClick={onClose}>
              انصراف
            </AppButton>
            <AppButton variant="primary" icon="shield-alert" loading={createState.isLoading || updateState.isLoading} onClick={() => void submit()}>
              {risk ? 'ذخیرهٔ تغییرات' : 'ثبت ریسک'}
            </AppButton>
          </span>
        </>
      }
    >
      <div className="col g14">
        <div className="fg">
          <label className="lbl" htmlFor="risk-title">
            عنوان ریسک <span className="req">*</span>
          </label>
          <TextInput id="risk-title" value={title} onChange={(event) => setTitle(event.target.value)} invalid={touched && Boolean(errors.title)} placeholder="مثلاً «افت کیفیت بتن ستون‌ها در گرمای تابستان»" />
          {touched && errors.title && <span className="hint err">{errors.title}</span>}
        </div>

        <div className="grid c2 rsp" style={{ gap: '14px 16px' }}>
          <div className="fg">
            <span className="lbl">دسته</span>
            <div className="row g6 wrap" role="radiogroup" aria-label="دستهٔ ریسک">
              {categories.map((entry) => (
                <button key={entry} type="button" role="radio" aria-checked={category === entry} className={category === entry ? 'chip on' : 'chip'} style={{ height: 26 }} onClick={() => setCategory(entry)}>
                  {entry}
                </button>
              ))}
            </div>
          </div>
          <div className="fg">
            <span className="lbl">مرتبط با</span>
            <Select size="sm" label="فعالیت WBS مرتبط" options={wbsOptions} value={wbsItemId} onChange={setWbsItemId} />
            <Select size="sm" label="قلم CBS مرتبط" options={cbsOptions} value={cbsItemId} onChange={setCbsItemId} />
          </div>
        </div>

        <div className="row wrap ai-st g20" style={{ padding: '14px 16px', border: '1px solid #E4E4E7', borderRadius: 12, background: '#FAFAFA' }}>
          <div className="col g12 grow" style={{ minWidth: 240 }}>
            <div className="fg">
              <span className="lbl t-12">احتمال وقوع</span>
              <SegmentedControl activeKey={probability ? String(probability) : ''} items={scaleItems(probability)} onChange={(key) => setProbability(Number(key))} />
              <span className="hint">{probability ? `${toFaDigits(probability)} · ${PROBABILITY_SCALE[probability]}` : 'خالی بماند تا ریسک «ارزیابی‌نشده» ثبت شود.'}</span>
            </div>
            <div className="fg">
              <span className="lbl t-12">شدت اثر</span>
              <SegmentedControl activeKey={impact ? String(impact) : ''} items={scaleItems(impact)} onChange={(key) => setImpact(Number(key))} />
              <span className="hint">{impact ? `${toFaDigits(impact)} · ${IMPACT_SCALE[impact]}` : ' '}</span>
            </div>
            {(probability || impact) && (
              <button type="button" className="link t-12" style={{ alignSelf: 'flex-start' }} onClick={() => { setProbability(null); setImpact(null); }}>
                پاک کردن ارزیابی
              </button>
            )}
            {touched && errors.score && <span className="hint err">{errors.score}</span>}
          </div>
          <RiskMatrix compact selected={probability && impact ? { probability, impact } : null} />
          <div className="col g4" style={{ width: 150 }}>
            <span className="t-xs tx5">امتیاز ریسک (پیش‌نمایش)</span>
            {score !== null && level ? (
              <>
                <span className="row g6">
                  <span className={`fw7 ${level === 'low' ? 'tx-pri' : level === 'medium' ? 'tx-wrn' : 'tx-err'}`} style={{ fontSize: 26 }}>
                    {toFaDigits(score)}
                  </span>
                  <span className="t-12 tx5">از ۲۵</span>
                </span>
                <Badge tone={level === 'low' ? 'pri' : level === 'medium' ? 'wrn' : 'err'} style={{ alignSelf: 'flex-start' }}>
                  {RISK_LEVEL[level]}
                </Badge>
              </>
            ) : (
              <span className="t-13 tx5">ارزیابی‌نشده</span>
            )}
            <span className="t-xs tx6 lh" style={{ marginTop: 4 }}>
              ریسک‌های ۱۵ به بالا فوری به مدیر پروژه اعلان می‌شوند
            </span>
          </div>
        </div>

        <div className="grid c3 rsp" style={{ gap: 12 }}>
          <div className="fg">
            <label className="lbl" htmlFor="risk-cause">علت</label>
            <TextArea id="risk-cause" rows={2} value={cause} onChange={(event) => setCause(event.target.value)} />
          </div>
          <div className="fg">
            <label className="lbl" htmlFor="risk-event">رویداد (شرح ریسک)</label>
            <TextArea id="risk-event" rows={2} value={event} onChange={(event) => setEvent(event.target.value)} />
          </div>
          <div className="fg">
            <label className="lbl" htmlFor="risk-consequence">پیامد</label>
            <TextArea id="risk-consequence" rows={2} value={consequence} onChange={(event) => setConsequence(event.target.value)} />
          </div>
        </div>

        <div className="grid c2 rsp" style={{ gap: '14px 16px' }}>
          <div className="fg">
            <span className="lbl">راهبرد پاسخ</span>
            <SegmentedControl activeKey={strategy ?? ''} items={STRATEGIES.map((key) => ({ key, label: STRATEGY_LABEL[key] }))} onChange={(key) => setStrategy(key as ResponseStrategy)} style={{ alignSelf: 'flex-start' }} />
          </div>
          <div className="fg">
            <span className="lbl">مالک ریسک</span>
            <Select size="sm" label="مالک ریسک" options={(people.data?.members ?? []).map((person) => ({ value: person.id, label: person.fullName }))} value={owner} onChange={setOwnerId} />
          </div>
        </div>

        {!risk && (
          <div className="risk-action-grid">
            <div className="fg">
              <label className="lbl" htmlFor="risk-action">برنامهٔ اقدام (اولین اقدام)</label>
              <TextArea id="risk-action" rows={2} value={actionTitle} onChange={(event) => setActionTitle(event.target.value)} placeholder="مثلاً «بتن‌ریزی در ساعات خنک و افزودنی کندگیر»" />
            </div>
            <div className="fg">
              <label className="lbl" htmlFor="risk-due">سررسید اقدام</label>
              <TextInput id="risk-due" icon="calendar" ltr placeholder="۱۴۰۵/۰۹/۱۵" value={actionDue} onChange={(event) => setActionDue(event.target.value)} invalid={touched && Boolean(errors.due)} />
              {touched && errors.due ? <span className="hint err">{errors.due}</span> : dueIso ? <span className="hint">{formatJalaliDate(dueIso)}</span> : null}
            </div>
          </div>
        )}

        <div className="grid c3 rsp" style={{ gap: '14px 16px' }}>
          {canViewAmounts && (
            <div className="fg">
              <label className="lbl" htmlFor="risk-cost">
                اثر هزینه‌ای (میلیارد ریال) <span className="opt">(اختیاری)</span>
              </label>
              <TextInput id="risk-cost" value={cost} onChange={(event) => setCost(event.target.value)} suffix="میلیارد" />
            </div>
          )}
          <div className="fg">
            <label className="lbl" htmlFor="risk-days">
              اثر زمانی برآوردی <span className="opt">(اختیاری)</span>
            </label>
            <TextInput id="risk-days" value={days} onChange={(event) => setDays(event.target.value)} suffix="روز" />
          </div>
          <div className="fg">
            <label className="lbl" htmlFor="risk-trigger">نشانهٔ هشدار</label>
            <TextInput id="risk-trigger" value={trigger} onChange={(event) => setTrigger(event.target.value)} placeholder="مثلاً «تحویل کمتر از ۷۰٪ بار هفتگی»" />
          </div>
        </div>

        {risk && (
          <div className="fg">
            <span className="lbl">هدف پس از اقدام‌ها (احتمال × اثر)</span>
            <div className="row wrap g12">
              <SegmentedControl activeKey={targetP ? String(targetP) : ''} items={scaleItems(targetP)} onChange={(key) => setTargetP(Number(key))} />
              <span className="tx5">×</span>
              <SegmentedControl activeKey={targetI ? String(targetI) : ''} items={scaleItems(targetI)} onChange={(key) => setTargetI(Number(key))} />
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
