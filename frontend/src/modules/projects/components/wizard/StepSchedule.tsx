import { useEffect, useState } from 'react';

import { AppButton } from '@/shared/components/ui/AppButton';
import { IconBox } from '@/shared/components/ui/IconBox';
import { IconButton } from '@/shared/components/ui/IconButton';
import { Select } from '@/shared/components/ui/Select';
import { SegmentedControl } from '@/shared/components/ui/Tabs';
import { TextInput } from '@/shared/components/ui/TextInput';
import { formatJalaliDate, jalaliToIso } from '@/shared/utils/date';
import { toEnDigits, toFaDigits } from '@/shared/utils/num';
import { usePreviewScheduleQuery } from '../../api/wizardApi';
import type { ProjectWizardDraft, WizardOptionsDto } from '../../types/wizard';

type Schedule = ProjectWizardDraft['schedule'];

const toJalaliText = (iso: string | null) => (iso ? formatJalaliDate(iso) : '');
const billionsText = (rial: string | null) => (rial ? toFaDigits(String(Number(rial) / 1e9)).replace('.', '٫') : '');
const parseBillions = (text: string): string | null => {
  const value = Number(toEnDigits(text).replace(/[٫/]/g, '.').replace(/[٬,]/g, ''));
  return text.trim() && Number.isFinite(value) ? String(Math.round(value * 1e9)) : null;
};
const formatBillions = (rial: string) => `${toFaDigits((Number(rial) / 1e9).toLocaleString('en-US', { maximumFractionDigits: 2 })).replace(/,/g, '٬').replace('.', '٫')} میلیارد ریال`;

/** فیلد تاریخ شمسی: متن را نگه می‌دارد و تاریخ میلادی را به بالا می‌دهد (C03). */
function DateField({ id, label, value, onChange, weekday, invalid }: { id: string; label: string; value: string | null; onChange: (iso: string | null) => void; weekday: string | null; invalid: boolean }) {
  const [text, setText] = useState(toJalaliText(value));
  useEffect(() => setText(toJalaliText(value)), [value]);
  const bad = text.trim() !== '' && !jalaliToIso(toEnDigits(text.trim()));
  return (
    <div className="fg">
      <label className="lbl" htmlFor={id}>
        {label} <span className="req">*</span>
      </label>
      <TextInput
        id={id}
        icon="calendar"
        ltr
        placeholder="۱۴۰۵/۰۹/۰۱"
        value={text}
        invalid={bad || invalid}
        onChange={(event) => {
          setText(event.target.value);
          onChange(event.target.value.trim() ? jalaliToIso(toEnDigits(event.target.value.trim())) : null);
        }}
        trailing={weekday && !bad ? <span className="t-12 tx5">{weekday}</span> : undefined}
      />
      {bad && <span className="hint err">تاریخ را شمسی مثل ۱۴۰۵/۰۹/۰۱ بنویسید.</span>}
    </div>
  );
}

/** W47 — زمان و بودجه (F02 ۵.۲): مدت و روز کاری و ذخیره از سرور (AC-PS-01، AC-PS-02). */
export function StepSchedule({ value, onChange, options, showErrors }: { value: Schedule; onChange: (next: Schedule) => void; options: WizardOptionsDto; showErrors: boolean }) {
  const preview = usePreviewScheduleQuery(value);
  const data = preview.data;
  const [budgetText, setBudgetText] = useState(billionsText(value.plannedTotalBudget));
  const [pctText, setPctText] = useState(value.contingencyPct != null ? toFaDigits(String(value.contingencyPct)).replace('.', '٫') : '');
  const set = (patch: Partial<Schedule>) => onChange({ ...value, ...patch });

  return (
    <div className="col g14">
      <div className="grid c2 rsp" style={{ gap: '14px 16px' }}>
        <DateField id="np-start" label="تاریخ شروع برنامه‌ای" value={value.plannedStart} onChange={(iso) => set({ plannedStart: iso })} weekday={data?.startWeekday ?? null} invalid={showErrors && !value.plannedStart} />
        <DateField id="np-finish" label="تاریخ پایان برنامه‌ای" value={value.plannedFinish} onChange={(iso) => set({ plannedFinish: iso })} weekday={data?.finishWeekday ?? null} invalid={(showErrors && !value.plannedFinish) || Boolean(data?.errors.dates)} />
      </div>
      {data?.errors.dates && <span className="hint err">{data.errors.dates}</span>}
      {data?.calendarDays != null && (
        <div className="row g12" style={{ padding: '12px 14px', background: '#E5EBF3', borderRadius: 10 }}>
          <IconBox icon="calendar-range" tone="pri" />
          <div className="col grow" style={{ gap: 2 }}>
            <span className="t-13 tx8">
              مدت محاسبه‌شده: <strong className="tx9">{toFaDigits(data.calendarDays)} روز تقویمی</strong> · حدود {toFaDigits(String(data.months)).replace('.', '٫')} ماه
            </span>
            <span className="t-12 tx6">
              {toFaDigits(data.workDays ?? 0)} روز کاری با تقویم «{data.calendarName}» و {toFaDigits(data.holidays ?? 0)} تعطیلی رسمی ثابت
            </span>
          </div>
        </div>
      )}

      <div className="grid c2 rsp" style={{ gap: '14px 16px' }}>
        <div className="fg">
          <Select label="تقویم کاری" options={options.calendarPresets.map((preset) => ({ value: preset.id, label: preset.name }))} value={value.calendarPresetId} onChange={(id) => set({ calendarPresetId: id })} />
          <span className="hint">پیش‌فرض سازمان · قابل تغییر در تنظیمات پروژه</span>
        </div>
        <div className="fg">
          <span className="lbl">واحد پول گزارش‌ها</span>
          <SegmentedControl
            activeKey={value.currency}
            onChange={(key) => set({ currency: key as Schedule['currency'] })}
            items={[
              { key: 'rial', label: 'ریال' },
              { key: 'toman', label: 'تومان' },
              { key: 'usd', label: 'دلار', disabled: true },
              { key: 'eur', label: 'یورو', disabled: true },
            ]}
            style={{ alignSelf: 'flex-start' }}
          />
          <span className="hint">در نسخهٔ اول فقط ریال ذخیره می‌شود؛ تومان فقط نمایش است (OD-14).</span>
        </div>
        <div className="fg">
          <label className="lbl" htmlFor="np-budget">
            بودجهٔ کل <span className="req">*</span>
          </label>
          <TextInput
            id="np-budget"
            value={budgetText}
            suffix="میلیارد ریال"
            invalid={(showErrors && !value.plannedTotalBudget) || Boolean(data?.errors.budget)}
            onChange={(event) => {
              setBudgetText(event.target.value);
              set({ plannedTotalBudget: parseBillions(event.target.value) });
            }}
          />
          <span className={data?.errors.budget ? 'hint err' : 'hint'}>{data?.errors.budget ?? 'راهنما تا پیش از فعال‌سازی؛ بودجهٔ واقعی جمع اقلام CBS است.'}</span>
        </div>
        <div className="fg">
          <label className="lbl" htmlFor="np-contingency">
            ذخیرهٔ احتیاطی <span className="opt">(اختیاری)</span>
          </label>
          <TextInput
            id="np-contingency"
            value={pctText}
            suffix="٪ از بودجه"
            invalid={Boolean(data?.errors.contingency)}
            onChange={(event) => {
              setPctText(event.target.value);
              const parsed = Number(toEnDigits(event.target.value).replace(/[٫/]/g, '.'));
              set({ contingencyPct: event.target.value.trim() && Number.isFinite(parsed) ? parsed : null });
            }}
          />
          <span className={data?.errors.contingency ? 'hint err' : 'hint'}>
            {data?.errors.contingency ??
              (data?.contingencyReserve && data.cbsShare ? `${formatBillions(data.contingencyReserve)} بیرون از CBS؛ سهم CBS ${formatBillions(data.cbsShare)}` : '۰ تا ۲۰ درصد')}
          </span>
        </div>
      </div>

      <div className="fg">
        <span className="lbl">
          نقاط عطف کلیدی <span className="opt">(اختیاری؛ با وزن ۰ زیر یک گروه سطح اول ساخته می‌شوند)</span>
        </span>
        <div className="col" style={{ border: '1px solid #E4E4E7', borderRadius: 10, overflow: 'hidden' }}>
          {value.milestones.map((milestone, index) => (
            <div key={milestone.key} className="row wrap g10" style={{ padding: '8px 12px', borderBottom: '1px solid #F4F4F5' }}>
              <span style={{ width: 10, height: 10, background: '#E07A2C', transform: 'rotate(45deg)', borderRadius: 2, flexShrink: 0 }} aria-hidden="true" />
              <TextInput
                size="sm"
                aria-label={`نام نقطهٔ عطف ${toFaDigits(index + 1)}`}
                value={milestone.title}
                placeholder="مثلاً «اتمام فونداسیون»"
                onChange={(event) => set({ milestones: value.milestones.map((entry) => (entry.key === milestone.key ? { ...entry, title: event.target.value } : entry)) })}
                style={{ flex: '1 1 200px' }}
                invalid={showErrors && !milestone.title.trim()}
              />
              <MilestoneDate
                value={milestone.date}
                invalid={showErrors && !milestone.date}
                onChange={(iso) => set({ milestones: value.milestones.map((entry) => (entry.key === milestone.key ? { ...entry, date: iso } : entry)) })}
                label={`تاریخ نقطهٔ عطف ${toFaDigits(index + 1)}`}
              />
              <IconButton icon="trash-2" label="حذف نقطهٔ عطف" size="sm" onClick={() => set({ milestones: value.milestones.filter((entry) => entry.key !== milestone.key) })} />
            </div>
          ))}
          <div className="row" style={{ padding: '8px 12px', background: '#FAFAFA' }}>
            <AppButton size="xs" variant="ghost" icon="plus" onClick={() => set({ milestones: [...value.milestones, { key: `m${Date.now() % 100000}`, title: '', date: null }] })}>
              افزودن نقطهٔ عطف
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function MilestoneDate({ value, onChange, label, invalid }: { value: string | null; onChange: (iso: string | null) => void; label: string; invalid: boolean }) {
  const [text, setText] = useState(toJalaliText(value));
  const bad = text.trim() !== '' && !jalaliToIso(toEnDigits(text.trim()));
  return (
    <TextInput
      size="sm"
      ltr
      aria-label={label}
      placeholder="۱۴۰۵/۰۹/۰۱"
      value={text}
      invalid={bad || invalid}
      onChange={(event) => {
        setText(event.target.value);
        onChange(event.target.value.trim() ? jalaliToIso(toEnDigits(event.target.value.trim())) : null);
      }}
      style={{ width: 130 }}
    />
  );
}
