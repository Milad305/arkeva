import { useEffect, useState } from 'react';

import { toast } from '@/shared/components/feedback/toastStore';
import { Alert } from '@/shared/components/ui/Alert';
import { Dropzone } from '@/shared/components/ui/Dropzone';
import { Icon } from '@/shared/components/ui/Icon';
import { IconButton } from '@/shared/components/ui/IconButton';
import { TextInput } from '@/shared/components/ui/TextInput';
import { toFaDigits } from '@/shared/utils/num';
import { cn } from '@/shared/utils/cn';
import { useCheckProjectCodeQuery, useGetWizardTemplatesQuery } from '../../api/wizardApi';
import type { ProjectWizardDraft, WizardOptionsDto } from '../../types/wizard';

type Basic = ProjectWizardDraft['basic'];

/** W37 — اطلاعات پایه (F02 ۵.۱): نام، کد با بررسی زنده، کارفرما، محل، نوع، تصویر. */
export function StepBasic({ value, onChange, options, showErrors }: { value: Basic; onChange: (next: Basic) => void; options: WizardOptionsDto; showErrors: boolean }) {
  const [code, setCode] = useState(value.code);
  // بررسی یکتایی کد با کمی درنگ پس از تایپ
  useEffect(() => {
    const timer = window.setTimeout(() => setCode(value.code), 350);
    return () => window.clearTimeout(timer);
  }, [value.code]);
  const codeCheck = useCheckProjectCodeQuery(code, { skip: !code.trim() });
  const templates = useGetWizardTemplatesQuery(value.projectTypeId, { skip: !value.projectTypeId });
  const recommended = templates.data?.find((template) => template.recommended);
  const set = (patch: Partial<Basic>) => onChange({ ...value, ...patch });
  const codeOk = codeCheck.data?.available && codeCheck.data.code === value.code.trim().toUpperCase();
  const codeBad = codeCheck.data && !codeCheck.data.available && code === value.code;

  return (
    <div className="col g14">
      <div className="grid c2 rsp" style={{ gap: '14px 16px' }}>
        <div className="fg">
          <label className="lbl" htmlFor="np-name">
            نام پروژه <span className="req">*</span>
          </label>
          <TextInput id="np-name" value={value.name} onChange={(event) => set({ name: event.target.value })} invalid={showErrors && value.name.trim().length < 3} placeholder="مثلاً «ساختمان اداری ستاره»" />
          {showErrors && value.name.trim().length < 3 && <span className="hint err">نام پروژه را بنویسید.</span>}
        </div>
        <div className="fg">
          <label className="lbl" htmlFor="np-code">
            کد پروژه <span className="req">*</span>
          </label>
          <TextInput
            id="np-code"
            className="mono"
            ltr
            value={value.code}
            onChange={(event) => set({ code: event.target.value })}
            valid={Boolean(codeOk)}
            invalid={Boolean(codeBad)}
            trailing={codeOk ? <span className="tx-ok" style={{ display: 'inline-flex' }}><Icon name="check-circle-2" size={15} /></span> : undefined}
          />
          {codeBad ? (
            <span className="hint err">
              {codeCheck.data!.message}
              {codeCheck.data!.suggestion && (
                <>
                  {' '}
                  <button type="button" className="link" onClick={() => set({ code: codeCheck.data!.suggestion! })}>
                    {`استفاده از ${codeCheck.data!.suggestion}`}
                  </button>
                </>
              )}
            </span>
          ) : (
            <span className={cn('hint', codeOk && 'ok')}>{codeOk ? 'کد در دسترس است · پس از ساخت تغییر نمی‌کند' : 'پیشنهاد خودکار از شمارهٔ بعدی'}</span>
          )}
        </div>
        <div className="fg">
          <label className="lbl" htmlFor="np-client">
            کارفرما <span className="req">*</span>
          </label>
          <TextInput id="np-client" value={value.clientName} onChange={(event) => set({ clientName: event.target.value })} invalid={showErrors && !value.clientName.trim()} />
          {showErrors && !value.clientName.trim() && <span className="hint err">کارفرما را بنویسید.</span>}
        </div>
        <div className="fg">
          <label className="lbl" htmlFor="np-location">
            محل پروژه <span className="opt">(اختیاری)</span>
          </label>
          <TextInput id="np-location" icon="map-pin" value={value.location} onChange={(event) => set({ location: event.target.value })} placeholder="شهر و منطقه" />
        </div>
      </div>

      <div className="fg">
        <span className="lbl">
          نوع پروژه <span className="req">*</span>
        </span>
        <div className="grid c4 rsp" style={{ gap: 8 }} role="radiogroup" aria-label="نوع پروژه">
          {options.projectTypes.map((type) => {
            const selected = value.projectTypeId === type.id;
            return (
              <button
                key={type.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={cn('opt-card', selected && 'on')}
                style={{ alignItems: 'center', padding: '10px 12px' }}
                onClick={() => set({ projectTypeId: type.id })}
              >
                <span style={{ display: 'inline-flex', color: selected ? '#1A3354' : '#71717A' }}>
                  <Icon name={type.icon} size={18} />
                </span>
                <span className="t" style={{ fontSize: 12.5 }}>
                  {type.name}
                </span>
              </button>
            );
          })}
        </div>
        {showErrors && !value.projectTypeId && <span className="hint err">نوع پروژه را انتخاب کنید.</span>}
      </div>

      <div className="fg">
        <span className="lbl">
          تصویر پروژه <span className="opt">(اختیاری)</span>
        </span>
        {value.imageName ? (
          <div className="row g10" style={{ border: '1px solid #E4E4E7', borderRadius: 10, padding: '8px 12px' }}>
            <Icon name="image" size={16} className="tx5" />
            <span className="t-13 tx8 grow trunc">{value.imageName}</span>
            <IconButton icon="x" label="حذف تصویر" size="sm" onClick={() => set({ imageName: null })} />
          </div>
        ) : (
          <Dropzone
            accept=".png,.jpg,.jpeg"
            icon="image-plus"
            title="انتخاب تصویر یا کشیدن و رها کردن"
            hint="PNG یا JPG، حداکثر ۲ مگابایت"
            onFiles={(files) => {
              const file = files[0];
              if (!file) return;
              if (file.size > 2 * 1024 * 1024) {
                toast.error('حجم تصویر بیش از ۲ مگابایت است؛ تصویر کوچک‌تری انتخاب کنید.');
                return;
              }
              set({ imageName: file.name });
            }}
          />
        )}
      </div>

      {recommended && (
        <Alert tone="inf" icon="lightbulb">
          برای «{options.projectTypes.find((type) => type.id === value.projectTypeId)?.name}»، قالب <strong>{recommended.title}</strong> با {toFaDigits(recommended.wbsCount)} آیتم WBS و {toFaDigits(recommended.cbsCount)} قلم CBS در مرحلهٔ ۴ پیشنهاد می‌شود.
        </Alert>
      )}
    </div>
  );
}
