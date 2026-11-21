import { useState } from 'react';

import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Avatar } from '@/shared/components/ui/Avatar';
import { Badge } from '@/shared/components/ui/Badge';
import { Checkbox } from '@/shared/components/ui/SelectionControls';
import { Chip } from '@/shared/components/ui/Chip';
import { FormField } from '@/shared/components/ui/FormField';
import { Modal } from '@/shared/components/ui/Modal';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import { SegmentedControl } from '@/shared/components/ui/Tabs';
import { Switch } from '@/shared/components/ui/SelectionControls';
import { TextInput } from '@/shared/components/ui/TextInput';
import { toFaDigits } from '@/shared/utils/num';
import type {
  CustomTemplateInput,
  RecipientKind,
  ReportCategory,
  ReportFormat,
  ReportFrequency,
  ReportOptionsDto,
  ReportScheduleDto,
  ReportSectionKey,
  ReportTemplateDto,
  ReportTemplateListDto,
  ScheduleInput,
} from '../types';

const WEEKDAYS: Array<{ value: number; label: string }> = [
  { value: 6, label: 'شنبه' },
  { value: 0, label: 'یکشنبه' },
  { value: 1, label: 'دوشنبه' },
  { value: 2, label: 'سه‌شنبه' },
  { value: 3, label: 'چهارشنبه' },
  { value: 4, label: 'پنجشنبه' },
  { value: 5, label: 'جمعه' },
];

const FREQUENCIES: Array<{ value: ReportFrequency; label: string }> = [
  { value: 'weekly', label: 'هفتگی' },
  { value: 'monthly', label: 'ماهانه' },
  { value: 'daily', label: 'روزانه' },
  { value: 'on_period_close', label: 'با بستن دوره' },
];

export interface ScheduleDialogProps {
  schedule: ReportScheduleDto | null;
  templates: ReportTemplateDto[];
  options: ReportOptionsDto;
  canSendExternal: boolean;
  busy: boolean;
  onSave: (input: ScheduleInput) => void;
  onClose: () => void;
  error: string | null;
}

/**
 * فرم زمان‌بندی (۷.۴) — تکرار، زمان در `Asia/Tehran`، قالب فایل و گیرندگان.
 * گیرندهٔ بیرونی فقط با `reports.send_external` و همیشه بدون مبلغ (۷.۳ · D11).
 */
export function ScheduleDialog({
  schedule,
  templates,
  options,
  canSendExternal,
  busy,
  onSave,
  onClose,
  error,
}: ScheduleDialogProps) {
  const [templateId, setTemplateId] = useState(schedule?.templateId ?? templates[0]?.id ?? '');
  const [projectId, setProjectId] = useState<string | null>(schedule?.projectId ?? options.projects[0]?.id ?? null);
  const [format, setFormat] = useState<ReportFormat>(schedule?.format ?? 'pdf');
  const [frequency, setFrequency] = useState<ReportFrequency>(schedule?.frequency ?? 'weekly');
  const [weekday, setWeekday] = useState(schedule?.weekday ?? 6);
  const [dayOfMonth, setDayOfMonth] = useState(schedule?.dayOfMonth ?? 1);
  const [timeOfDay, setTimeOfDay] = useState(schedule?.timeOfDay ?? '08:00');
  const [workingDaysOnly, setWorkingDaysOnly] = useState(schedule?.workingDaysOnly ?? false);
  const [enabled, setEnabled] = useState(schedule?.enabled ?? true);
  const [recipients, setRecipients] = useState<Array<{ kind: RecipientKind; id: string }>>(
    schedule?.recipients.map((person) => ({ kind: person.kind, id: person.id })) ?? [],
  );
  const [email, setEmail] = useState('');

  const template = templates.find((entry) => entry.id === templateId);
  const isPortfolio = template?.scope === 'portfolio';
  const has = (kind: RecipientKind, id: string) => recipients.some((entry) => entry.kind === kind && entry.id === id);
  const toggle = (kind: RecipientKind, id: string) =>
    setRecipients((current) =>
      has(kind, id) ? current.filter((entry) => !(entry.kind === kind && entry.id === id)) : [...current, { kind, id }],
    );

  const mixedAmounts =
    (template?.includesAmounts ?? false) &&
    recipients.some((entry) => entry.kind === 'email') &&
    recipients.some((entry) => entry.kind !== 'email');

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="lg"
      dismissOnBackdrop={false}
      title={schedule ? 'ویرایش زمان‌بندی' : 'زمان‌بندی جدید'}
      description="گزارش در زمان تعیین‌شده خودکار ساخته و برای گیرندگان فرستاده می‌شود."
      footer={
        <div className="row g8">
          <AppButton onClick={onClose} disabled={busy}>
            انصراف
          </AppButton>
          <AppButton
            variant="primary"
            icon="calendar-clock"
            loading={busy}
            onClick={() =>
              onSave({
                id: schedule?.id ?? null,
                templateId,
                projectId: isPortfolio ? null : projectId,
                format,
                frequency,
                weekday: frequency === 'weekly' ? weekday : null,
                dayOfMonth: frequency === 'monthly' ? dayOfMonth : null,
                timeOfDay,
                workingDaysOnly,
                recipients,
                enabled,
              })
            }
          >
            {schedule ? 'ذخیرهٔ زمان‌بندی' : 'ساخت زمان‌بندی'}
          </AppButton>
        </div>
      }
    >
      <div className="col g14">
        <div className="grid c2 g12">
          <FormField label="گزارش" required>
            <Select
              options={templates.map((entry): SelectOption<string> => ({ value: entry.id, label: entry.name }))}
              value={templateId}
              onChange={setTemplateId}
              label="گزارش"
            />
          </FormField>
          <FormField label="پروژه" required={!isPortfolio} hint={isPortfolio ? 'این گزارش همهٔ پروژه‌های فعال را می‌گیرد.' : undefined}>
            <Select
              options={options.projects.map((project): SelectOption<string> => ({ value: project.id, label: project.name }))}
              value={isPortfolio ? null : projectId}
              onChange={setProjectId}
              placeholder={isPortfolio ? 'همهٔ پروژه‌ها' : 'پروژه را انتخاب کنید'}
              disabled={isPortfolio}
              label="پروژه"
            />
          </FormField>
          <FormField label="تکرار" required>
            <Select
              options={FREQUENCIES.map((entry): SelectOption<string> => ({ value: entry.value, label: entry.label }))}
              value={frequency}
              onChange={(value) => setFrequency(value as ReportFrequency)}
              label="تکرار"
            />
          </FormField>
          {frequency === 'weekly' && (
            <FormField label="روز هفته" required>
              <Select
                options={WEEKDAYS.map((day): SelectOption<string> => ({ value: String(day.value), label: day.label }))}
                value={String(weekday)}
                onChange={(value) => setWeekday(Number(value))}
                label="روز هفته"
              />
            </FormField>
          )}
          {frequency === 'monthly' && (
            <FormField label="روز ماه" required>
              <Select
                options={[1, 15, 30].map((day): SelectOption<string> => ({ value: String(day), label: `${toFaDigits(day)} هر ماه` }))}
                value={String(dayOfMonth)}
                onChange={(value) => setDayOfMonth(Number(value))}
                label="روز ماه"
              />
            </FormField>
          )}
          {frequency !== 'on_period_close' && (
            <FormField label="ساعت اجرا" hint="به وقت تهران (Asia/Tehran).">
              <TextInput ltr value={timeOfDay} onChange={(event) => setTimeOfDay(event.target.value)} placeholder="08:00" />
            </FormField>
          )}
          <FormField label="قالب فایل" required>
            <SegmentedControl
              activeKey={format}
              onChange={(key) => setFormat(key as ReportFormat)}
              items={(template?.formats ?? ['pdf']).map((entry) => ({ key: entry, label: entry === 'pdf' ? 'PDF' : 'Excel' }))}
            />
          </FormField>
        </div>

        <FormField label="گیرندگان" required hint="کاربران سازمان، یک نقش، یا نشانی ایمیل بیرونی.">
          <div className="col g8">
            <div className="row g6 wrap">
              {options.users.slice(0, 8).map((user) => (
                <Chip key={user.id} selected={has('user', user.id)} onClick={() => toggle('user', user.id)}>
                  {user.fullName}
                </Chip>
              ))}
            </div>
            <div className="row g6 wrap">
              {options.roles.map((role) => (
                <Chip key={role.code} icon="users" selected={has('role', role.code)} onClick={() => toggle('role', role.code)}>
                  {`نقش ${role.label}`}
                </Chip>
              ))}
            </div>
            <div className="row g8 wrap">
              <TextInput
                ltr
                size="sm"
                style={{ width: 240 }}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                aria-label="نشانی ایمیل بیرونی"
                disabled={!canSendExternal}
              />
              <AppButton
                size="sm"
                icon="plus"
                disabled={!canSendExternal || email.trim() === ''}
                title={canSendExternal ? undefined : 'دسترسی ارسال به گیرندهٔ بیرونی را ندارید.'}
                onClick={() => {
                  toggle('email', email.trim());
                  setEmail('');
                }}
              >
                افزودن گیرندهٔ بیرونی
              </AppButton>
            </div>
            {recipients.filter((entry) => entry.kind === 'email').length > 0 && (
              <div className="row g6 wrap">
                {recipients
                  .filter((entry) => entry.kind === 'email')
                  .map((entry) => (
                    <Chip key={entry.id} selected icon="mail" onRemove={() => toggle('email', entry.id)}>
                      {entry.id}
                    </Chip>
                  ))}
              </div>
            )}
          </div>
        </FormField>

        {mixedAmounts && (
          <Alert tone="inf">
            گیرندگان مختلط‌اند: دو نسخه ساخته می‌شود و نشانی بیرونی همیشه نسخهٔ بدون مبلغ را می‌گیرد.
          </Alert>
        )}
        {!canSendExternal && (
          <Alert tone="inf">
            ارسال به نشانی بیرون از سازمان دسترسی «ارسال به گیرندهٔ بیرونی» می‌خواهد؛ از مدیر پروژه بخواهید این زمان‌بندی را
            بسازد.
          </Alert>
        )}

        <div className="row g12 wrap">
          <span className="row g6 t-12 tx7">
            <Switch checked={workingDaysOnly} onChange={setWorkingDaysOnly} label="فقط روزهای کاری اجرا شود" />
            فقط روزهای کاری اجرا شود
          </span>
          <span className="row g6 t-12 tx7">
            <Switch checked={enabled} onChange={setEnabled} label="زمان‌بندی فعال باشد" />
            زمان‌بندی فعال باشد
          </span>
        </div>

        {error && <Alert tone="err">{error}</Alert>}
      </div>
    </Modal>
  );
}

export interface CustomTemplateDialogProps {
  library: ReportTemplateListDto;
  busy: boolean;
  error: string | null;
  onSave: (input: CustomTemplateInput) => void;
  onClose: () => void;
}

const CATEGORIES: Array<{ value: ReportCategory; label: string }> = [
  { value: 'project', label: 'پروژه' },
  { value: 'financial', label: 'مالی' },
  { value: 'resources', label: 'منابع' },
  { value: 'risk', label: 'ریسک' },
  { value: 'integration', label: 'یکپارچه‌سازی' },
];

/** «ساخت گزارش سفارشی» (۵) — ترکیب بخش‌های آماده؛ بخش تازه ساخته نمی‌شود. */
export function CustomTemplateDialog({ library, busy, error, onSave, onClose }: CustomTemplateDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ReportCategory>('project');
  const [audience, setAudience] = useState<'internal' | 'client'>('internal');
  const [scope, setScope] = useState<'project' | 'portfolio'>('project');
  const [sections, setSections] = useState<ReportSectionKey[]>(['summary', 'progress']);

  const available = library.sections.filter((section) => (scope === 'portfolio' ? true : section.key !== 'portfolio'));
  const toggle = (key: ReportSectionKey) =>
    setSections((current) => (current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key]));

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="lg"
      dismissOnBackdrop={false}
      title="ساخت گزارش سفارشی"
      description="بخش‌های آماده را ترکیب کنید؛ قالب در کتابخانهٔ سازمان ذخیره می‌شود."
      footer={
        <div className="row g8">
          <AppButton onClick={onClose} disabled={busy}>
            انصراف
          </AppButton>
          <AppButton
            variant="primary"
            icon="plus"
            loading={busy}
            onClick={() => onSave({ name, description, category, audience, scope, sections, formats: ['pdf'] })}
          >
            ساخت قالب
          </AppButton>
        </div>
      }
    >
      <div className="col g14">
        <div className="grid c2 g12">
          <FormField label="نام گزارش" required>
            <TextInput value={name} onChange={(event) => setName(event.target.value)} placeholder="مثلاً: گزارش دوهفتگی سازه" />
          </FormField>
          <FormField label="دسته" required>
            <Select
              options={CATEGORIES.map((entry): SelectOption<string> => ({ value: entry.value, label: entry.label }))}
              value={category}
              onChange={(value) => setCategory(value as ReportCategory)}
              label="دسته"
            />
          </FormField>
          <FormField label="توضیح" full>
            <TextInput value={description} onChange={(event) => setDescription(event.target.value)} placeholder="در کارت کتابخانه دیده می‌شود" />
          </FormField>
        </div>

        <div className="grid c2 g12">
          <FormField label="مخاطب" hint="قالب کارفرما هیچ‌گاه مبلغ ندارد.">
            <SegmentedControl
              activeKey={audience}
              onChange={(key) => setAudience(key as 'internal' | 'client')}
              items={[
                { key: 'internal', label: 'داخلی' },
                { key: 'client', label: 'کارفرما' },
              ]}
            />
          </FormField>
          <FormField label="دامنه">
            <SegmentedControl
              activeKey={scope}
              onChange={(key) => {
                const next = key as 'project' | 'portfolio';
                setScope(next);
                setSections((current) =>
                  next === 'portfolio' ? [...new Set([...current, 'portfolio' as ReportSectionKey])] : current.filter((entry) => entry !== 'portfolio'),
                );
              }}
              items={[
                { key: 'project', label: 'یک پروژه' },
                { key: 'portfolio', label: 'همهٔ پروژه‌ها' },
              ]}
            />
          </FormField>
        </div>

        <FormField label="بخش‌های گزارش" required hint="هر بخش از مقادیر ذخیره‌شدهٔ سیستم پر می‌شود.">
          <div className="col g6">
            {available.map((section) => (
              <Checkbox
                key={section.key}
                checked={sections.includes(section.key)}
                onChange={() => toggle(section.key)}
                className="ai-s"
                label={
                  <span className="col" style={{ gap: 1, minWidth: 0 }}>
                    <span className="row g6">
                      <span className="t-12 fw5 tx9">{section.label}</span>
                      {section.hasAmounts && (
                        <Badge size="sm" tone={audience === 'client' ? 'neu' : 'wrn'}>
                          {audience === 'client' ? 'بدون مبلغ در قالب کارفرما' : 'دارای مبلغ'}
                        </Badge>
                      )}
                    </span>
                    <span className="t-xs tx5">{section.description}</span>
                  </span>
                }
              />
            ))}
          </div>
        </FormField>

        {error && <Alert tone="err">{error}</Alert>}
      </div>
    </Modal>
  );
}

export interface SendDialogProps {
  templateName: string;
  includesAmounts: boolean;
  options: ReportOptionsDto;
  canSendExternal: boolean;
  busy: boolean;
  error: string | null;
  onSend: (recipients: Array<{ kind: RecipientKind; id: string }>) => void;
  onClose: () => void;
}

/** «ارسال به گیرندگان» — همان قواعد ۷.۳ روی ارسال دستی. */
export function SendDialog({
  templateName,
  includesAmounts,
  options,
  canSendExternal,
  busy,
  error,
  onSend,
  onClose,
}: SendDialogProps) {
  const [recipients, setRecipients] = useState<Array<{ kind: RecipientKind; id: string }>>([]);
  const [email, setEmail] = useState('');
  const has = (kind: RecipientKind, id: string) => recipients.some((entry) => entry.kind === kind && entry.id === id);
  const toggle = (kind: RecipientKind, id: string) =>
    setRecipients((current) =>
      has(kind, id) ? current.filter((entry) => !(entry.kind === kind && entry.id === id)) : [...current, { kind, id }],
    );

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="md"
      dismissOnBackdrop={false}
      title="ارسال گزارش"
      description={templateName}
      footer={
        <div className="row g8">
          <AppButton onClick={onClose} disabled={busy}>
            انصراف
          </AppButton>
          <AppButton variant="primary" icon="send" loading={busy} onClick={() => onSend(recipients)}>
            ارسال گزارش
          </AppButton>
        </div>
      }
    >
      <div className="col g12">
        <div className="col g8">
          <span className="t-12 tx6">گیرندگان سازمان</span>
          <div className="row g6 wrap">
            {options.users.slice(0, 8).map((user) => (
              <button
                key={user.id}
                type="button"
                className={has('user', user.id) ? 'chip on' : 'chip'}
                onClick={() => toggle('user', user.id)}
              >
                <Avatar name={user.fullName} tone={user.avatarTone} size="s" />
                {user.fullName}
                {includesAmounts && !user.canViewAmounts && <span className="tx5">· بدون مبلغ</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="row g8 wrap">
          <TextInput
            ltr
            size="sm"
            style={{ width: 230 }}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            aria-label="نشانی ایمیل بیرونی"
            disabled={!canSendExternal}
          />
          <AppButton
            size="sm"
            icon="plus"
            disabled={!canSendExternal || email.trim() === ''}
            title={canSendExternal ? undefined : 'دسترسی ارسال به گیرندهٔ بیرونی را ندارید.'}
            onClick={() => {
              toggle('email', email.trim());
              setEmail('');
            }}
          >
            گیرندهٔ بیرونی
          </AppButton>
        </div>

        {recipients.filter((entry) => entry.kind === 'email').length > 0 && (
          <div className="row g6 wrap">
            {recipients
              .filter((entry) => entry.kind === 'email')
              .map((entry) => (
                <Chip key={entry.id} selected icon="mail" onRemove={() => toggle('email', entry.id)}>
                  {entry.id}
                </Chip>
              ))}
          </div>
        )}

        {includesAmounts && (
          <Alert tone="inf">
            هر گیرنده نسخهٔ خودش را می‌گیرد: بدون دسترسی «مشاهدهٔ مبالغ»، نسخهٔ بدون مبلغ فرستاده می‌شود.
          </Alert>
        )}
        {error && <Alert tone="err">{error}</Alert>}
      </div>
    </Modal>
  );
}
