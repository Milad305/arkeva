import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Card, CardHeader } from '@/shared/components/ui/Card';
import { IconButton } from '@/shared/components/ui/IconButton';
import { Icon, type IconName } from '@/shared/components/ui/Icon';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { toFaDigits } from '@/shared/utils/num';

// اجزای مشترک W28–W30: هر کارت پیش‌نویس خودش را دارد و با «تغییرات ذخیره‌نشده» ذخیره
// می‌شود (F02 ۷)؛ ترک صفحه با تغییر ذخیره‌نشده تأیید می‌خواهد.

const DirtyContext = createContext<(key: string, dirty: boolean) => void>(() => undefined);

export function DirtyProvider({ onChange, children }: { onChange: (dirtyKeys: string[]) => void; children: ReactNode }) {
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const report = useCallback((key: string, dirty: boolean) => {
    setKeys((current) => {
      if (current.has(key) === dirty) return current;
      const next = new Set(current);
      if (dirty) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);
  useEffect(() => onChange([...keys]), [keys, onChange]);
  return <DirtyContext.Provider value={report}>{children}</DirtyContext.Provider>;
}

/** پیش‌نویس یک بخش: مقدار سرور ← ویرایش محلی ← ذخیره. */
export function useSectionDraft<T>(key: string, server: T) {
  const report = useContext(DirtyContext);
  const serverJson = JSON.stringify(server);
  const [value, setValue] = useState<T>(server);
  // پس از ذخیره یا تغییر سرور، پیش‌نویس هم‌گام شود
  useEffect(() => setValue(JSON.parse(serverJson) as T), [serverJson]);
  const dirty = JSON.stringify(value) !== serverJson;
  useEffect(() => {
    report(key, dirty);
    return () => report(key, false);
  }, [key, dirty, report]);
  return useMemo(
    () => ({
      value,
      dirty,
      set: (patch: Partial<T>) => setValue((current) => ({ ...current, ...patch })),
      replace: setValue,
      reset: () => setValue(JSON.parse(serverJson) as T),
    }),
    [value, dirty, serverJson],
  );
}

/** کارت بخش با نوار «تغییرات ذخیره‌نشده». */
export function SectionCard({
  id,
  icon,
  title,
  subtitle,
  action,
  dirty,
  saving,
  error,
  onSave,
  onDiscard,
  readOnly,
  tone,
  children,
}: {
  id: string;
  icon?: IconName;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  dirty?: boolean;
  saving?: boolean;
  error?: unknown;
  onSave?: () => void;
  onDiscard?: () => void;
  readOnly?: boolean;
  tone?: 'danger';
  children: ReactNode;
}) {
  return (
    <section id={id} style={{ scrollMarginTop: 120 }}>
      <Card style={tone === 'danger' ? { borderColor: 'rgba(220, 38, 38, 0.35)' } : undefined}>
        <CardHeader icon={icon} iconClassName={tone === 'danger' ? 'tx-err' : undefined} title={<span className={tone === 'danger' ? 'tx-err' : undefined}>{title}</span>} subtitle={subtitle} action={action} />
        <div className="col g16" style={{ padding: '16px 20px 20px' }}>
          {readOnly && (
            <Alert tone="inf" icon="lock">
              فقط‌خواندنی؛ ویرایش این بخش مجوز جداگانه می‌خواهد.
            </Alert>
          )}
          {children}
          {Boolean(error) && (
            <Alert tone="err" icon="alert-octagon">
              {getApiErrorMessage(error)}
            </Alert>
          )}
        </div>
        {dirty && onSave && (
          <div className="row wrap g8" style={{ padding: '10px 20px', borderTop: '1px solid #F4B17C', background: '#FFF8F1', position: 'sticky', bottom: 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: '#E07A2C' }} />
            <span className="t-13 fw5 tx9 grow">تغییرات ذخیره‌نشده دارید</span>
            <AppButton variant="ghost" size="sm" onClick={onDiscard}>
              صرف‌نظر
            </AppButton>
            <AppButton variant="primary" size="sm" icon="save" loading={saving} onClick={onSave}>
              ذخیرهٔ تغییرات
            </AppButton>
          </div>
        )}
      </Card>
    </section>
  );
}

/** ردیف قاعده: آیکن، عنوان، توضیح و کنترل. */
export function RuleRow({ icon, title, description, control, last }: { icon?: IconName; title: ReactNode; description?: ReactNode; control: ReactNode; last?: boolean }) {
  return (
    <div className="row wrap g16" style={{ padding: '12px 0', borderBottom: last ? undefined : '1px solid #F4F4F5' }}>
      {icon && (
        <span className="icb sm" style={{ background: '#F4F4F5', color: '#52525B' }}>
          <IconGlyph name={icon} />
        </span>
      )}
      <div className="col grow" style={{ gap: 2, minWidth: 200, flex: '1 1 260px' }}>
        <span className="t-13 fw6 tx9">{title}</span>
        {description && <span className="t-12 tx5 lh">{description}</span>}
      </div>
      <div style={{ flexShrink: 0 }}>{control}</div>
    </div>
  );
}

function IconGlyph({ name }: { name: IconName }) {
  return <Icon name={name} size={14} />;
}

/** شمارندهٔ عددی − / + با واحد (بوم W29). */
export function NumberStepper({ value, onChange, min, max, step = 1, unit, label, disabled }: { value: number; onChange: (value: number) => void; min: number; max: number; step?: number; unit: string; label: string; disabled?: boolean }) {
  const clamp = (next: number) => Math.min(max, Math.max(min, Math.round(next * 100) / 100));
  return (
    <div className="row" style={{ gap: 0, border: '1px solid #D4D4D8', borderRadius: 8, height: 34, background: '#FFFFFF' }} role="group" aria-label={label}>
      <IconButton icon="minus" label={`کاهش ${label}`} size="sm" disabled={disabled || value <= min} onClick={() => onChange(clamp(value - step))} />
      <span className="t-13 fw6 tx9" style={{ minWidth: 44, textAlign: 'center' }} aria-live="polite">
        {toFaDigits(String(value)).replace('.', '٫')}
      </span>
      <IconButton icon="plus" label={`افزایش ${label}`} size="sm" disabled={disabled || value >= max} onClick={() => onChange(clamp(value + step))} />
      <span className="t-12 tx5" style={{ padding: '0 10px', borderInlineStart: '1px solid #E4E4E7', height: '60%', display: 'inline-flex', alignItems: 'center' }}>
        {unit}
      </span>
    </div>
  );
}
