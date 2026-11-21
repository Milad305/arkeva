import { useState } from 'react';

import { PROJECT_STATUS, PROJECT_STATUS_TONES } from '@/config/constants';
import { ROUTES } from '@/config/routes';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Avatar } from '@/shared/components/ui/Avatar';
import { Badge } from '@/shared/components/ui/Badge';
import { Chip } from '@/shared/components/ui/Chip';
import { Icon } from '@/shared/components/ui/Icon';
import { IconButton } from '@/shared/components/ui/IconButton';
import { Select } from '@/shared/components/ui/Select';
import { Switch } from '@/shared/components/ui/SelectionControls';
import { SegmentedControl } from '@/shared/components/ui/Tabs';
import { TextArea, TextInput } from '@/shared/components/ui/TextInput';
import { formatJalaliDate, jalaliToIso } from '@/shared/utils/date';
import { formatPercentAuto, formatRial, toEnDigits, toFaDigits } from '@/shared/utils/num';
import { Link } from 'react-router-dom';
import { GpsSketch } from '@/modules/reports/components/GpsSketch';
import { useAddOfficialHolidaysMutation, useSaveCalendarMutation, useSaveGeneralMutation } from '../api/settingsApi';
import { SectionCard, useSectionDraft } from '../components/SettingsKit';
import type { CalendarDto, WeekdayKey } from '../types';
import { useSettingsContext } from './ProjectSettingsLayout';

const DAY_LABEL: Record<WeekdayKey, string> = { sat: 'شنبه', sun: 'یکشنبه', mon: 'دوشنبه', tue: 'سه‌شنبه', wed: 'چهارشنبه', thu: 'پنجشنبه', fri: 'جمعه' };
const NEXT_MODE = { full: 'half', half: 'off', off: 'full' } as const;
const toJalali = (iso: string | null) => (iso ? formatJalaliDate(iso) : '');
const parseCoords = (text: string): [number, number] | null => {
  const parts = toEnDigits(text).split(/[,،\s]+/).filter(Boolean).map(Number);
  return parts.length === 2 && parts.every(Number.isFinite) ? [parts[0]!, parts[1]!] : null;
};

/** W28 — اطلاعات عمومی و تقویم (F02 ۶–۷). */
export default function GeneralSettingsPage() {
  return (
    <div className="col g16" style={{ maxWidth: 760, minWidth: 0, flex: '1 1 auto' }}>
      <GeneralCard />
      <CalendarCard />
    </div>
  );
}

function GeneralCard() {
  const { project, settings, canEdit } = useSettingsContext();
  const general = settings.general;
  const draft = useSectionDraft('general', {
    name: general.name,
    clientName: general.clientName,
    projectTypeId: general.projectTypeId,
    description: general.description,
    plannedStart: toJalali(general.plannedStart),
    plannedFinish: toJalali(general.plannedFinish),
    currency: general.currency,
    location: general.location,
    coords: general.siteLat != null && general.siteLng != null ? `${general.siteLat}, ${general.siteLng}` : '',
    imageName: general.imageName,
  });
  const [save, state] = useSaveGeneralMutation();
  const value = draft.value;
  const coords = value.coords.trim() ? parseCoords(value.coords) : null;
  const coordsBad = value.coords.trim() !== '' && !coords;
  const startIso = jalaliToIso(toEnDigits(value.plannedStart));
  const finishIso = jalaliToIso(toEnDigits(value.plannedFinish));

  async function submit() {
    if (coordsBad || !startIso || (value.plannedFinish && !finishIso)) return;
    await save({
      projectId: project.id,
      input: {
        name: value.name,
        clientName: value.clientName,
        projectTypeId: value.projectTypeId,
        description: value.description,
        ...(general.mspLinked ? {} : { plannedStart: startIso, plannedFinish: finishIso }),
        currency: value.currency,
        location: value.location,
        siteLat: coords?.[0] ?? null,
        siteLng: coords?.[1] ?? null,
        imageName: value.imageName,
      },
    })
      .unwrap()
      .catch(() => undefined);
  }

  return (
    <SectionCard
      id="general"
      title="اطلاعات عمومی"
      subtitle="اطلاعات پایهٔ پروژه که در گزارش‌ها، داشبورد و اپ سرپرستان نمایش داده می‌شود"
      dirty={draft.dirty}
      saving={state.isLoading}
      error={state.error}
      onSave={() => void submit()}
      onDiscard={draft.reset}
      readOnly={!canEdit}
    >
      <div className="row wrap g16">
        <span className="icb xl" style={{ background: '#1A3354', color: '#FFFFFF', width: 64, height: 64, borderRadius: 14 }}>
          <Icon name="building-2" size={28} />
        </span>
        <div className="col g6">
          <span className="lbl">تصویر پروژه</span>
          <div className="row g8">
            <label className="btn btn-o btn-sm" style={{ cursor: canEdit ? 'pointer' : 'not-allowed' }}>
              <Icon name="image-plus" size={14} />
              {value.imageName ? 'تغییر تصویر' : 'انتخاب تصویر'}
              <input
                type="file"
                accept=".png,.jpg,.jpeg"
                className="sr-input"
                disabled={!canEdit}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file && file.size <= 2 * 1024 * 1024) draft.set({ imageName: file.name });
                }}
              />
            </label>
            {value.imageName && (
              <AppButton variant="ghost" size="sm" disabled={!canEdit} onClick={() => draft.set({ imageName: null })}>
                حذف
              </AppButton>
            )}
          </div>
          <span className="hint">{value.imageName ?? 'PNG یا JPG، حداکثر ۲ مگابایت؛ تصویر مربعی بهتر نمایش داده می‌شود'}</span>
        </div>
      </div>

      <div className="grid c2 rsp" style={{ gap: '16px 18px' }}>
        <div className="fg">
          <label className="lbl" htmlFor="s-name">
            نام پروژه <span className="req">*</span>
          </label>
          <TextInput id="s-name" value={value.name} disabled={!canEdit} onChange={(event) => draft.set({ name: event.target.value })} invalid={value.name.trim().length < 3} />
        </div>
        <div className="fg">
          <span className="lbl">کد پروژه</span>
          <TextInput value={general.code} readOnly className="mono" ltr trailing={<Icon name="lock" size={14} />} aria-label="کد پروژه" />
          <span className="hint">کد پس از ساخت پروژه تغییر نمی‌کند</span>
        </div>
        <div className="fg">
          <label className="lbl" htmlFor="s-client">
            کارفرما <span className="req">*</span>
          </label>
          <TextInput id="s-client" value={value.clientName} disabled={!canEdit} onChange={(event) => draft.set({ clientName: event.target.value })} invalid={!value.clientName.trim()} />
        </div>
        <Select label="نوع پروژه" options={settings.projectTypes.map((type) => ({ value: type.id, label: type.name }))} value={value.projectTypeId} onChange={(projectTypeId) => draft.set({ projectTypeId })} disabled={!canEdit} />
        <div className="fg">
          <span className="lbl">مدیر پروژه</span>
          <div className="row g8" style={{ height: 38, padding: '0 10px', border: '1px solid #E4E4E7', borderRadius: 8, background: '#FAFAFA' }}>
            <Avatar name={general.manager.fullName} tone={general.manager.avatarTone ?? 'a1'} size="s" />
            <span className="t-13 tx8">{general.manager.fullName}</span>
          </div>
          <span className="hint">
            برای انتقال مدیریت به <Link className="link" to={`${ROUTES.settingsIntegrations(project.id)}#danger`}>منطقهٔ خطر</Link> بروید
          </span>
        </div>
        <div className="fg">
          <span className="lbl">وضعیت پروژه</span>
          <span style={{ height: 38, display: 'inline-flex', alignItems: 'center' }}>
            <Badge tone={PROJECT_STATUS_TONES[general.status]} dot>
              {PROJECT_STATUS[general.status]}
            </Badge>
          </span>
          <span className="hint">توقف، ادامه و تمام کردن از منوی پروژه در سربرگ انجام می‌شود</span>
        </div>
        <div className="fg" style={{ gridColumn: '1 / -1' }}>
          <label className="lbl" htmlFor="s-desc">
            توضیحات <span className="opt">(اختیاری)</span>
          </label>
          <TextArea id="s-desc" rows={3} value={value.description} disabled={!canEdit} maxLength={500} onChange={(event) => draft.set({ description: event.target.value })} />
          <span className="hint row between">
            <span>در صفحهٔ نخست گزارش ماهانهٔ کارفرما چاپ می‌شود</span>
            <span>{`${toFaDigits(value.description.length)} / ۵۰۰`}</span>
          </span>
        </div>
        <div className="fg">
          <label className="lbl" htmlFor="s-start">
            تاریخ شروع برنامه‌ای
          </label>
          <TextInput id="s-start" icon="calendar" ltr value={value.plannedStart} readOnly={general.mspLinked} disabled={!canEdit} onChange={(event) => draft.set({ plannedStart: event.target.value })} invalid={!startIso} />
          {general.mspLinked && (
            <span className="hint row g4">
              <Icon name="refresh-cw" size={12} />
              همگام با فایل Microsoft Project
            </span>
          )}
        </div>
        <div className="fg">
          <label className="lbl" htmlFor="s-finish">
            تاریخ پایان برنامه‌ای
          </label>
          <TextInput id="s-finish" icon="calendar" ltr value={value.plannedFinish} readOnly={general.mspLinked} disabled={!canEdit} onChange={(event) => draft.set({ plannedFinish: event.target.value })} invalid={Boolean(value.plannedFinish) && !finishIso} />
          {general.forecastFinish && (
            <span className="hint">{`پیش‌بینی فعلی: ${formatJalaliDate(general.forecastFinish)}${general.delayWorkingDays ? ` (${toFaDigits(general.delayWorkingDays)} روز تأخیر)` : ''}`}</span>
          )}
        </div>
        <div className="fg">
          <span className="lbl">بودجهٔ کل</span>
          <TextInput value={general.actualTotalBudget ? formatRial(general.actualTotalBudget) : '—'} readOnly aria-label="بودجهٔ کل" />
          {general.budgetMismatchPercent != null && Math.abs(general.budgetMismatchPercent) > 1 ? (
            <span className="hint" style={{ color: '#B45309' }}>{`با برآورد اولیهٔ ${formatRial(general.plannedTotalBudget ?? '0')} ${formatPercentAuto(Math.abs(general.budgetMismatchPercent))} فرق دارد`}</span>
          ) : (
            <span className="hint ok row g4">
              <Icon name="check-circle-2" size={12} />
              بودجهٔ کل = جمع اقلام CBS + ذخیرهٔ احتیاطی
            </span>
          )}
        </div>
        <div className="fg">
          <span className="lbl">واحد پول گزارش‌ها</span>
          <SegmentedControl
            activeKey={value.currency}
            onChange={(key) => draft.set({ currency: key as 'rial' | 'toman' })}
            items={[
              { key: 'rial', label: 'ریال', disabled: !canEdit },
              { key: 'toman', label: 'تومان', disabled: !canEdit },
              { key: 'usd', label: 'دلار', disabled: true },
              { key: 'eur', label: 'یورو', disabled: true },
            ]}
            style={{ alignSelf: 'flex-start' }}
          />
          <span className="hint">در نسخهٔ اول فقط ریال ذخیره می‌شود (OD-14)</span>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #F4F4F5', paddingTop: 14 }} className="col g12">
        <div>
          <span className="lbl">موقعیت کارگاه</span>
          <p className="hint" style={{ margin: '2px 0 0' }}>
            گزارش‌های اندروید با این مختصات مقایسه می‌شوند تا گزارش‌های بیرون از کارگاه علامت بخورند
          </p>
        </div>
        <div className="row wrap ai-st g16">
          <div className="col g12 grow" style={{ minWidth: 240 }}>
            <div className="fg">
              <label className="lbl t-12" htmlFor="s-address">
                نشانی
              </label>
              <TextInput id="s-address" size="sm" value={value.location} disabled={!canEdit} onChange={(event) => draft.set({ location: event.target.value })} />
            </div>
            <div className="fg">
              <label className="lbl t-12" htmlFor="s-coords">
                مختصات (عرض، طول)
              </label>
              <TextInput id="s-coords" size="sm" icon="map-pin" ltr className="mono" placeholder="35.7448, 51.2032" value={value.coords} disabled={!canEdit} onChange={(event) => draft.set({ coords: event.target.value })} invalid={coordsBad} />
              {coordsBad ? <span className="hint err">مختصات را مثل «35.7448, 51.2032» بنویسید.</span> : !coords && <span className="hint" style={{ color: '#B45309' }}>بدون مختصات، کنترل GPS گزارش‌ها انجام نمی‌شود.</span>}
            </div>
            <span className="hint row g4">
              <Icon name="locate-fixed" size={12} />
              {`شعاع مجاز ${toFaDigits(general.gpsRadiusM)} متر؛ قابل تغییر در `}
              <Link className="link" to={`${ROUTES.settingsWorkflow(project.id)}#field`}>
                قواعد گزارش کارگاه
              </Link>
            </span>
          </div>
          <GpsSketch distanceM={coords ? 0 : null} radiusM={general.gpsRadiusM} seed={project.id} />
        </div>
      </div>
    </SectionCard>
  );
}

function CalendarCard() {
  const { project, settings, canEdit } = useSettingsContext();
  const calendar = settings.calendar;
  const { missingOfficialYears: _missing, ...editable } = calendar;
  const draft = useSectionDraft<Omit<CalendarDto, 'missingOfficialYears'>>('calendar', editable);
  const [save, state] = useSaveCalendarMutation();
  const [addOfficial, officialState] = useAddOfficialHolidaysMutation();
  const [showAll, setShowAll] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const value = draft.value;
  const official = value.holidays.filter((holiday) => holiday.type === 'official').length;
  const manual = value.holidays.length - official;
  const visible = showAll ? value.holidays : value.holidays.slice(0, 7);
  const newIso = newDate.trim() ? jalaliToIso(toEnDigits(newDate.trim())) : null;

  return (
    <SectionCard
      id="calendar"
      title="تقویم و روزهای کاری"
      subtitle="برای محاسبهٔ روز کاری، تاریخ‌های پیش‌بینی، منحنی S و پوشش گزارش روزانه (C03)"
      dirty={draft.dirty}
      saving={state.isLoading}
      error={state.error}
      onSave={() => void save({ projectId: project.id, input: value }).unwrap().catch(() => undefined)}
      onDiscard={draft.reset}
      readOnly={!canEdit}
    >
      <div className="fg">
        <span className="lbl">روزهای کاری هفته</span>
        <div className="row wrap g6">
          {value.workWeek.map((entry) => (
            <Chip
              key={entry.day}
              selected={entry.mode !== 'off'}
              dashed={entry.mode === 'half'}
              title="برای تغییر کلیک کنید: کامل ← نیم‌روز ← تعطیل"
              onClick={canEdit ? () => draft.set({ workWeek: value.workWeek.map((day) => (day.day === entry.day ? { ...day, mode: NEXT_MODE[day.mode] } : day)) }) : undefined}
            >
              {DAY_LABEL[entry.day]}
              {entry.mode !== 'full' && <span className="t-xs" style={{ opacity: 0.8 }}>{entry.mode === 'half' ? 'نیم‌روز' : 'تعطیل'}</span>}
            </Chip>
          ))}
        </div>
      </div>
      <div className="grid c3 rsp" style={{ gap: 16 }}>
        {(
          [
            ['dayStart', 'شروع کار روزانه'],
            ['dayEnd', 'پایان کار روزانه'],
            ['halfDayEnd', 'پایان کار نیم‌روز'],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="fg">
            <label className="lbl" htmlFor={`s-${key}`}>
              {label}
            </label>
            <TextInput id={`s-${key}`} icon="clock" ltr value={toFaDigits(value[key])} disabled={!canEdit} onChange={(event) => draft.set({ [key]: toEnDigits(event.target.value) } as Partial<CalendarDto>)} />
          </div>
        ))}
      </div>

      <div className="col g8">
        <div className="row wrap between g8">
          <div>
            <span className="lbl">تعطیلات</span>
            <p className="hint" style={{ margin: '2px 0 0' }}>{`${toFaDigits(official)} تعطیلی رسمی · ${toFaDigits(manual)} تعطیلی دستی`}</p>
          </div>
          <div className="row wrap g8">
            {calendar.missingOfficialYears.map((year) => (
              <AppButton key={year} variant="outline" size="sm" icon="calendar-check" disabled={!canEdit || draft.dirty} loading={officialState.isLoading} onClick={() => void addOfficial({ projectId: project.id, year })}>
                {`افزودن تعطیلات رسمی ${toFaDigits(year)}`}
              </AppButton>
            ))}
          </div>
        </div>
        {calendar.missingOfficialYears.length > 0 && (
          <Alert tone="wrn" icon="alert-triangle">
            {`تعطیلات رسمی ${calendar.missingOfficialYears.map((year) => toFaDigits(year)).join(' و ')} هنوز اضافه نشده؛ روزهای کاری آن سال‌ها بیش از واقع شمرده می‌شود.`}
          </Alert>
        )}
        <div style={{ border: '1px solid #E4E4E7', borderRadius: 10, overflow: 'hidden' }}>
          {visible.map((holiday) => (
            <div key={holiday.date} className="row wrap g12" style={{ padding: '9px 14px', borderBottom: '1px solid #F4F4F5' }}>
              <span className="t-12 fw6 tx8" style={{ width: 84 }}>
                {formatJalaliDate(holiday.date)}
              </span>
              <span className="t-13 tx9 grow">{holiday.title}</span>
              <Badge size="sm" tone={holiday.type === 'official' ? 'neu' : 'pri'}>
                {holiday.type === 'official' ? 'رسمی' : 'دستی'}
              </Badge>
              <Switch
                checked={holiday.enabled}
                disabled={!canEdit}
                label={`${holiday.title} در محاسبهٔ روز کاری`}
                onChange={(enabled) => draft.set({ holidays: value.holidays.map((entry) => (entry.date === holiday.date ? { ...entry, enabled } : entry)) })}
              />
              {holiday.type === 'manual' && canEdit && <IconButton icon="trash-2" label={`حذف ${holiday.title}`} size="sm" onClick={() => draft.set({ holidays: value.holidays.filter((entry) => entry.date !== holiday.date) })} />}
            </div>
          ))}
          {value.holidays.length > 7 && (
            <div className="row" style={{ padding: '9px 14px', background: '#FAFAFA' }}>
              <button type="button" className="link t-12" onClick={() => setShowAll((current) => !current)}>
                {showAll ? 'نمایش کمتر' : `نمایش ${toFaDigits(value.holidays.length - 7)} تعطیلی دیگر`}
              </button>
            </div>
          )}
          {canEdit && (
            <div className="row wrap g8" style={{ padding: '9px 14px', background: '#FAFAFA', borderTop: '1px solid #F4F4F5' }}>
              <TextInput size="sm" ltr placeholder="۱۴۰۵/۰۹/۱۵" aria-label="تاریخ تعطیلی دستی" value={newDate} onChange={(event) => setNewDate(event.target.value)} invalid={newDate.trim() !== '' && !newIso} style={{ width: 130 }} />
              <TextInput size="sm" placeholder="مثلاً «بازدید ایمنی سالانه»" aria-label="عنوان تعطیلی دستی" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} style={{ flex: '1 1 200px' }} />
              <AppButton
                size="sm"
                variant="ghost"
                icon="plus"
                disabled={!newIso || !newTitle.trim()}
                onClick={() => {
                  draft.set({ holidays: [...value.holidays.filter((entry) => entry.date !== newIso), { date: newIso!, title: newTitle.trim(), type: 'manual' as const, enabled: true }].sort((a, b) => a.date.localeCompare(b.date)) });
                  setNewDate('');
                  setNewTitle('');
                }}
              >
                روز تعطیل دستی
              </AppButton>
            </div>
          )}
        </div>
      </div>
      <Alert tone="inf" icon="info">
        با تغییر تقویم، تاریخ‌های پیش‌بینی در WBS و منحنی S دوباره محاسبه می‌شود{project.mspLinked ? ' و تقویم در همگام‌سازی بعدی به فایل Microsoft Project هم ارسال می‌شود' : ''}.
      </Alert>
    </SectionCard>
  );
}
