import { Link } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Badge } from '@/shared/components/ui/Badge';
import { Chip } from '@/shared/components/ui/Chip';
import { Icon, type IconName } from '@/shared/components/ui/Icon';
import { IconButton } from '@/shared/components/ui/IconButton';
import { Select } from '@/shared/components/ui/Select';
import { Checkbox, OptionCard, Switch } from '@/shared/components/ui/SelectionControls';
import { SegmentedControl } from '@/shared/components/ui/Tabs';
import { TextInput } from '@/shared/components/ui/TextInput';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { useHasPermission } from '@/shared/hooks/useHasAccess';
import { formatJalaliDate, formatJalaliDateTime } from '@/shared/utils/date';
import { formatRial, toEnDigits, toFaDigits } from '@/shared/utils/num';
import { useState } from 'react';
import { useClosePeriodMutation, useGetAreasQuery, useSaveAreasMutation, useSaveFieldRulesMutation, useSaveProgressMutation, useSaveWorkflowMutation } from '../api/settingsApi';
import { NumberStepper, RuleRow, SectionCard, useSectionDraft } from '../components/SettingsKit';
import type { AreaDto, PeriodDto, WeightGenerator } from '../types';
import { useSettingsContext } from './ProjectSettingsLayout';

const GENERATORS: Array<{ key: WeightGenerator; title: string; description: string }> = [
  { key: 'manual', title: 'وزن دستی در WBS', description: 'هر آیتم وزن مشخصی در والد خود دارد' },
  { key: 'cost', title: 'بر اساس هزینه (CBS)', description: 'پیشنهاد وزن از بودجهٔ اقلام CBS متصل' },
  { key: 'duration', title: 'بر اساس مدت زمان', description: 'پیشنهاد وزن از طول برنامه‌ای آیتم' },
  { key: 'equal', title: 'مساوی', description: 'فرزندان هر والد سهم برابر می‌گیرند' },
];

/** W29 — پیشرفت و محاسبات، قواعد گزارش، گردش‌کار، حوزه‌ها، دوره‌ها. */
export default function WorkflowSettingsPage() {
  return (
    <div className="col g16" style={{ maxWidth: 760, minWidth: 0, flex: '1 1 auto' }}>
      <span className="t-12 tx5">تغییر این بخش روی محاسبهٔ پیشرفت همهٔ گزارش‌ها و نمودارهای پروژه اثر دارد</span>
      <ProgressCard />
      <FieldRulesCard />
      <WorkflowCard />
      <AreasCard />
      <PeriodsCard />
    </div>
  );
}

function ProgressCard() {
  const { project, settings, canEdit, canViewAmounts } = useSettingsContext();
  const canPv = useHasPermission('plan.set_pv_reference');
  const progress = settings.progress;
  const draft = useSectionDraft('progress', {
    weightGenerator: progress.weightGenerator,
    showFinancialProgress: progress.showFinancialProgress,
    warningThreshold: progress.warningThreshold,
    criticalThreshold: progress.criticalThreshold,
    eacMethod: progress.eacMethod,
    pvReferenceVersionId: progress.pvReferenceVersionId,
  });
  const [save, state] = useSaveProgressMutation();
  const value = draft.value;
  const valid = value.warningThreshold > 0 && value.criticalThreshold > value.warningThreshold;
  // نوار نمایشی آستانه‌ها: −۳۰ تا +۵
  const span = 35;
  const segment = (from: number, to: number) => `${((to - from) / span) * 100}%`;

  return (
    <SectionCard
      id="progress"
      title="پیشرفت و محاسبات"
      subtitle="نحوهٔ ترکیب پیشرفت آیتم‌ها، هشدار انحراف و برآورد پایان"
      dirty={draft.dirty}
      saving={state.isLoading}
      error={state.error}
      onSave={() => valid && void save({ projectId: project.id, input: value }).unwrap().catch(() => undefined)}
      onDiscard={draft.reset}
      readOnly={!canEdit}
    >
      <div className="fg">
        <span className="lbl">مولد پیشنهادی وزن (D04)</span>
        <div className="grid c2 rsp" style={{ gap: 10 }}>
          {GENERATORS.map((entry) => (
            <OptionCard key={entry.key} control="radio" name="weight-generator" selected={value.weightGenerator === entry.key} onSelect={() => canEdit && draft.set({ weightGenerator: entry.key })} title={entry.title} description={entry.description} />
          ))}
        </div>
        <span className="hint">
          مولد فقط وزن پیشنهادی نسخهٔ کاری را می‌سازد؛ وزن‌ها در <Link className="link" to={ROUTES.wbsEdit(project.id)}>ویرایش WBS</Link> قطعی می‌شوند و جمع فرزندان هر آیتم ۱۰۰٪ است
        </span>
      </div>
      <RuleRow
        icon="receipt"
        title="نمایش پیشرفت ریالی کنار فیزیکی"
        description="پیشرفت بر پایهٔ ارزش کسب‌شده کنار پیشرفت فیزیکی در W10 و نمودارها (اصلاح برچسب «هر دو شاخص» — G19)"
        control={<Switch checked={value.showFinancialProgress} disabled={!canEdit} label="نمایش پیشرفت ریالی" onChange={(showFinancialProgress) => draft.set({ showFinancialProgress })} />}
        last
      />
      <div className="fg">
        <span className="lbl">آستانه‌های هشدار انحراف</span>
        <span className="hint" style={{ marginTop: -2 }}>
          عقب‌ماندگی از برنامه که رنگ وضعیت را در WBS، نمودارها و اپ عوض می‌کند
        </span>
        <div className="grid c2 rsp" style={{ gap: 14, marginTop: 4 }}>
          {(
            [
              ['warningThreshold', 'آستانهٔ هشدار', '#D97706'],
              ['criticalThreshold', 'آستانهٔ بحرانی', '#DC2626'],
            ] as const
          ).map(([key, label, color]) => (
            <div key={key} className="fg">
              <label className="lbl t-12 row g6" htmlFor={`s-${key}`}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                {label}
              </label>
              <TextInput id={`s-${key}`} value={toFaDigits(value[key])} suffix="٪ عقب‌تر" disabled={!canEdit} onChange={(event) => draft.set({ [key]: Number(toEnDigits(event.target.value)) || 0 } as Partial<typeof value>)} invalid={!valid} />
            </div>
          ))}
        </div>
        {!valid && <span className="hint err">آستانهٔ هشدار باید بیشتر از صفر و کمتر از آستانهٔ بحرانی باشد.</span>}
        <div className="col g4" style={{ marginTop: 8 }} aria-hidden="true">
          <div className="row" style={{ gap: 2, height: 10, direction: 'ltr' }}>
            <span style={{ width: segment(-30, -value.criticalThreshold), height: '100%', background: '#DC2626', borderRadius: '5px 0 0 5px' }} />
            <span style={{ width: segment(-value.criticalThreshold, -value.warningThreshold), height: '100%', background: '#D97706' }} />
            <span style={{ width: segment(-value.warningThreshold, 0), height: '100%', background: '#2C4A73' }} />
            <span style={{ width: segment(0, 5), height: '100%', background: '#16A34A', borderRadius: '0 5px 5px 0' }} />
          </div>
          <div className="row wrap g16 t-xs tx6">
            <span className="row g4"><span style={{ width: 8, height: 8, background: '#DC2626', borderRadius: 2 }} />{`بحرانی ≤ −${toFaDigits(value.criticalThreshold)}٪`}</span>
            <span className="row g4"><span style={{ width: 8, height: 8, background: '#D97706', borderRadius: 2 }} />هشدار</span>
            <span className="row g4"><span style={{ width: 8, height: 8, background: '#2C4A73', borderRadius: 2 }} />طبق برنامه</span>
            <span className="row g4"><span style={{ width: 8, height: 8, background: '#16A34A', borderRadius: 2 }} />جلوتر از برنامه</span>
          </div>
        </div>
      </div>
      <div className="fg">
        <span className="lbl">روش برآورد پایان (EAC)</span>
        <div className="col g8">
          {progress.eacPreview.map((entry) => (
            <OptionCard
              key={entry.method}
              control="radio"
              name="eac-method"
              selected={value.eacMethod === entry.method}
              onSelect={() => canEdit && draft.set({ eacMethod: entry.method })}
              title={
                <span className="row wrap g8">
                  {entry.label}
                  {entry.method === 'cpi' && <Badge size="sm" tone="pri">پیش‌فرض</Badge>}
                  {canViewAmounts && entry.value && <span className="t-12 tx6">{`برای این پروژه: ${formatRial(entry.value)}`}</span>}
                </span>
              }
              description={<span className="mono" dir="ltr">{entry.formula}</span>}
            />
          ))}
        </div>
        <span className="hint">دو روش دیگر در «این عدد از کجا آمد؟» کنار EAC برای مقایسه می‌آیند (evm.md ۵)</span>
      </div>
      {progress.versions.length > 0 && (
        <RuleRow
          title="مبنای مقایسه برای PV و انحراف"
          description="برنامهٔ مبنا تا پایان پروژه ثابت می‌ماند؛ تغییر مرجع همهٔ PV، EV و انحراف‌ها را بازمحاسبه می‌کند"
          control={
            <SegmentedControl
              activeKey={value.pvReferenceVersionId ?? ''}
              onChange={(key) => draft.set({ pvReferenceVersionId: key })}
              items={progress.versions.map((version) => ({ key: version.id, label: `${version.label}${version.appliedAt ? ` · ${formatJalaliDate(version.appliedAt)}` : ''}`, disabled: !canEdit || !canPv }))}
            />
          }
          last
        />
      )}
    </SectionCard>
  );
}

function FieldRulesCard() {
  const { project, settings, canEdit } = useSettingsContext();
  const draft = useSectionDraft('field', settings.field);
  const [save, state] = useSaveFieldRulesMutation();
  const value = draft.value;
  const rows: Array<{ icon: IconName; title: string; description: string; control: React.ReactNode }> = [
    { icon: 'image', title: 'حداقل تعداد عکس در هر گزارش', description: 'گزارش با عکس کمتر علامت «عکس ناکافی» می‌گیرد و خودکار تأیید نمی‌شود', control: <NumberStepper label="حداقل عکس" value={value.minPhotos} min={0} max={10} unit="عکس" disabled={!canEdit} onChange={(minPhotos) => draft.set({ minPhotos })} /> },
    { icon: 'trending-up', title: 'حداکثر جهش مجاز در یک گزارش', description: 'جهش بیشتر علامت «جهش غیرعادی» می‌گیرد و به مرحلهٔ دوم می‌رود', control: <NumberStepper label="حداکثر جهش" value={value.maxJumpPct} min={5} max={100} step={5} unit="درصد" disabled={!canEdit} onChange={(maxJumpPct) => draft.set({ maxJumpPct })} /> },
    { icon: 'trending-down', title: 'اجازهٔ ثبت درصد کاهشی', description: 'وقتی خاموش است، کاهش رد نمی‌شود بلکه علامت می‌خورد و ناظر تصمیم می‌گیرد', control: <Switch checked={value.allowDecrease} disabled={!canEdit} label="اجازهٔ ثبت درصد کاهشی" onChange={(allowDecrease) => draft.set({ allowDecrease })} /> },
    { icon: 'cloud-off', title: 'ثبت آفلاین', description: `گزارش در گوشی می‌ماند و پس از اتصال ارسال می‌شود؛ پس از ${toFaDigits(value.lateAfterHours)} ساعت علامت «ثبت با تأخیر» می‌گیرد`, control: <Switch checked={value.offlineEnabled} disabled={!canEdit} label="ثبت آفلاین" onChange={(offlineEnabled) => draft.set({ offlineEnabled })} /> },
    {
      icon: 'alarm-clock',
      title: 'یادآوری گزارش روزانه',
      description: 'سرپرستی که تا این ساعت در روز کاری گزارشی نداده، اعلان می‌گیرد (NT-FLD-04)',
      control: (
        <span className="row g8">
          <TextInput size="sm" ltr aria-label="ساعت یادآوری" value={toFaDigits(value.dailyReminderTime)} disabled={!canEdit || !value.dailyReminderEnabled} onChange={(event) => draft.set({ dailyReminderTime: toEnDigits(event.target.value) })} style={{ width: 80 }} />
          <Switch checked={value.dailyReminderEnabled} disabled={!canEdit} label="یادآوری گزارش روزانه" onChange={(dailyReminderEnabled) => draft.set({ dailyReminderEnabled })} />
        </span>
      ),
    },
    { icon: 'locate-fixed', title: 'شعاع مجاز کارگاه', description: 'فاصله از موقعیت کارگاه در اطلاعات عمومی', control: <NumberStepper label="شعاع کارگاه" value={value.gpsRadiusM} min={50} max={5000} step={50} unit="متر" disabled={!canEdit} onChange={(gpsRadiusM) => draft.set({ gpsRadiusM })} /> },
    {
      icon: 'map-pin',
      title: 'گزارش بیرون از محدودهٔ GPS',
      description: '«جلوگیری» گزارش را با یادداشت سیستمی رد می‌کند (approval-workflow.md ۳.۲)',
      control: (
        <SegmentedControl
          activeKey={value.gpsMode}
          onChange={(key) => draft.set({ gpsMode: key as typeof value.gpsMode })}
          items={[
            { key: 'flag_only', label: 'فقط علامت‌گذاری', disabled: !canEdit },
            { key: 'block', label: 'رد خودکار', disabled: !canEdit },
          ]}
        />
      ),
    },
  ];
  return (
    <SectionCard
      id="field"
      title="قواعد گزارش کارگاه"
      subtitle="کنترل کیفیت گزارش‌هایی که سرپرستان در اپ اندروید ثبت می‌کنند"
      dirty={draft.dirty}
      saving={state.isLoading}
      error={state.error}
      onSave={() => void save({ projectId: project.id, input: value }).unwrap().catch(() => undefined)}
      onDiscard={draft.reset}
      readOnly={!canEdit}
    >
      <div className="col">
        {rows.map((row, index) => (
          <RuleRow key={row.title} icon={row.icon} title={row.title} description={row.description} control={row.control} last={index === rows.length - 1} />
        ))}
      </div>
    </SectionCard>
  );
}

function WorkflowCard() {
  const { project, settings, canEdit } = useSettingsContext();
  const { avgApprovalHours, mspLinked, ...editable } = settings.workflow;
  const draft = useSectionDraft('workflow', editable);
  const [save, state] = useSaveWorkflowMutation();
  const value = draft.value;
  const flow: Array<{ icon: IconName; title: string; text: string; bg: string; fg: string }> = [
    { icon: 'smartphone', title: 'سرپرست کارگاه', text: 'ثبت درصد، مقدار، عکس و GPS', bg: '#D1FADF', fg: '#15803D' },
    { icon: 'user-check', title: 'ناظر حوزه', text: 'تأیید مرحلهٔ اول یا برگشت', bg: '#DBEAFE', fg: '#1D4ED8' },
    ...(value.approvalMode === 'two_stage' ? [{ icon: 'stamp' as IconName, title: 'مدیر پروژه', text: 'تأیید نهایی فقط برای تغییرهای بزرگ', bg: '#FCEAD9', fg: '#B45813' }] : []),
    { icon: 'git-branch', title: 'به‌روزرسانی WBS', text: 'پیشرفت و انحراف بازمحاسبه می‌شود', bg: '#E5EBF3', fg: '#1A3354' },
  ];
  return (
    <SectionCard
      id="workflow"
      title="گردش‌کار تأیید"
      subtitle="مسیر هر گزارش از کارگاه تا به‌روزرسانی WBS"
      dirty={draft.dirty}
      saving={state.isLoading}
      error={state.error}
      onSave={() => void save({ projectId: project.id, input: value }).unwrap().catch(() => undefined)}
      onDiscard={draft.reset}
      readOnly={!canEdit}
    >
      <div className="grid c2 rsp" style={{ gap: 10 }}>
        <OptionCard control="radio" name="approval-mode" selected={value.approvalMode === 'single_stage'} onSelect={() => canEdit && draft.set({ approvalMode: 'single_stage' })} title="یک‌مرحله‌ای" description="فقط ناظر گزارش را تأیید می‌کند" />
        <OptionCard control="radio" name="approval-mode" selected={value.approvalMode === 'two_stage'} onSelect={() => canEdit && draft.set({ approvalMode: 'two_stage' })} title="دومرحله‌ای" description="ابتدا ناظر، سپس مدیر پروژه برای تغییرهای بزرگ" />
      </div>
      <div className="row wrap ai-st" style={{ gap: 4, padding: '14px 10px', background: '#FAFAFA', border: '1px solid #F4F4F5', borderRadius: 12 }}>
        {flow.map((step, index) => (
          <span key={step.title} className="row ai-st" style={{ flex: '1 1 120px', minWidth: 0, gap: 4 }}>
            <span className="col g6" style={{ alignItems: 'center', textAlign: 'center', flex: '1 1 auto', minWidth: 0 }}>
              <span className="icb" style={{ background: step.bg, color: step.fg }}>
                <Icon name={step.icon} size={16} />
              </span>
              <span className="t-12 fw6 tx9">{step.title}</span>
              <span className="t-xs tx5 lh">{step.text}</span>
            </span>
            {index < flow.length - 1 && (
              <span className="tx5" style={{ marginTop: 8 }}>
                <Icon name="chevron-left" size={16} />
              </span>
            )}
          </span>
        ))}
      </div>
      {value.approvalMode === 'two_stage' && (
        <div className="fg">
          <span className="lbl">مرحلهٔ دوم فقط وقتی لازم است که</span>
          <div className="col g8">
            <Checkbox checked={value.stage2OnCritical} disabled={!canEdit} onChange={(event) => draft.set({ stage2OnCritical: event.target.checked })} label={`تغییر پیشرفت بیش از ${toFaDigits(settings.progress.criticalThreshold)}٪ (آستانهٔ بحرانی)`} />
            <Checkbox checked={value.stage2OnJump} disabled={!canEdit} onChange={(event) => draft.set({ stage2OnJump: event.target.checked })} label="گزارش علامت «جهش غیرعادی» دارد" />
            <Checkbox checked={value.stage2OnGpsOut} disabled={!canEdit} onChange={(event) => draft.set({ stage2OnGpsOut: event.target.checked })} label="گزارش بیرون از محدودهٔ GPS ثبت شده است" />
            <Checkbox checked={value.stage2OnCriticalPath} disabled={!canEdit || !mspLinked} onChange={(event) => draft.set({ stage2OnCriticalPath: event.target.checked })} label={`آیتم روی مسیر بحرانی برنامه است${mspLinked ? '' : ' (فقط پروژهٔ متصل به MSP)'}`} />
          </div>
        </div>
      )}
      <div className="grid c2 rsp" style={{ gap: 14 }}>
        <div className="fg">
          <label className="lbl" htmlFor="s-deadline">
            مهلت بررسی هر گزارش
          </label>
          <TextInput id="s-deadline" value={toFaDigits(value.reviewDeadlineHours)} suffix="ساعت" disabled={!canEdit} onChange={(event) => draft.set({ reviewDeadlineHours: Number(toEnDigits(event.target.value)) || 0 })} invalid={value.reviewDeadlineHours < 1 || value.reviewDeadlineHours > 168} />
          <span className="hint">
            {avgApprovalHours != null ? `میانگین فعلی: ${toFaDigits(String(avgApprovalHours)).replace('.', '٫')} ساعت · ` : ''}
            <Link className="link" to={ROUTES.chartsResources(project.id)}>
              گزارش زمان تأیید
            </Link>
          </span>
        </div>
        <div className="fg">
          <span className="lbl">پس از پایان مهلت</span>
          <SegmentedControl
            activeKey={value.onDeadline}
            onChange={(key) => draft.set({ onDeadline: key as typeof value.onDeadline })}
            items={[
              { key: 'remind_only', label: 'فقط یادآوری', disabled: !canEdit },
              { key: 'escalate', label: 'ارجاع به جایگزین', disabled: !canEdit },
            ]}
            style={{ alignSelf: 'flex-start' }}
          />
          <span className="hint">ارجاع فقط یک بار انجام می‌شود (approval-workflow.md ۴.۴)</span>
        </div>
      </div>
      <RuleRow
        title="تأیید خودکار گزارش‌های کم‌اهمیت"
        description={
          <span className="row wrap g6">
            گزارش با تغییر کمتر از
            <NumberStepper label="سقف تأیید خودکار" value={value.autoApproveMaxDelta} min={0} max={10} step={0.5} unit="٪" disabled={!canEdit || !value.autoApproveEnabled} onChange={(autoApproveMaxDelta) => draft.set({ autoApproveMaxDelta })} />
            {`، دست‌کم ${toFaDigits(settings.field.minPhotos)} عکس و GPS معتبر بدون بررسی دستی تأیید می‌شود؛ ثبت دستی وب هرگز`}
          </span>
        }
        control={<Switch checked={value.autoApproveEnabled} disabled={!canEdit} label="تأیید خودکار" onChange={(autoApproveEnabled) => draft.set({ autoApproveEnabled })} />}
        last
      />
    </SectionCard>
  );
}

function AreasCard() {
  const { project, settings } = useSettingsContext();
  const canManage = useHasPermission('approval_routes.manage') && project.status !== 'archived';
  const query = useGetAreasQuery(project.id);
  const data = query.data;
  const draft = useSectionDraft('areas', { areas: data?.areas.map(({ id, areaName, rootIds, reviewerUserId }) => ({ id, areaName, rootIds, reviewerUserId })) ?? [], fallbackApproverId: data?.fallbackApproverId ?? '' });
  const [save, state] = useSaveAreasMutation();
  const value = draft.value;
  const updateArea = (index: number, patch: Partial<AreaDto>) => draft.set({ areas: value.areas.map((area, position) => (position === index ? { ...area, ...patch } : area)) });
  const used = new Map(value.areas.flatMap((area, index) => area.rootIds.map((id) => [id, index] as const)));
  const reviewerOptions = [{ value: '', label: 'بدون ناظر (به جایگزین)' }, ...(data?.reviewers ?? []).map((entry) => ({ value: entry.userId, label: `${entry.fullName}${entry.isManager ? ' · مدیر پروژه' : ''}` }))];

  return (
    <SectionCard
      id="routes"
      icon="user-check"
      title="تأییدکنندهٔ مرحلهٔ اول بر اساس حوزه"
      subtitle="هر بخش WBS در یک حوزه؛ برگ بدون حوزه به تأییدکنندهٔ جایگزین می‌رسد (F07 ۶)"
      dirty={draft.dirty}
      saving={state.isLoading}
      error={state.error}
      onSave={() => void save({ projectId: project.id, areas: value.areas, fallbackApproverId: value.fallbackApproverId }).unwrap().catch(() => undefined)}
      onDiscard={draft.reset}
      readOnly={!canManage}
      action={
        canManage && (
          <AppButton size="sm" variant="outline" icon="plus" onClick={() => draft.set({ areas: [...value.areas, { id: null, areaName: '', rootIds: [], reviewerUserId: null }] })}>
            حوزهٔ تازه
          </AppButton>
        )
      }
    >
      {!data ? (
        <span className="t-13 tx6">در حال بارگذاری…</span>
      ) : (
        <>
          {data.unroutedLeafCount > 0 && (
            <Alert tone="wrn" icon="alert-triangle">
              {`گزارش‌های ${toFaDigits(data.unroutedLeafCount)} فعالیت ناظر حوزه ندارند و به تأییدکنندهٔ جایگزین می‌رسند (AL-STR-06).`}
            </Alert>
          )}
          <div className="col g10">
            {value.areas.map((area, index) => (
              <div key={area.id ?? `new-${index}`} className="col g8" style={{ border: '1px solid #E4E4E7', borderRadius: 10, padding: '10px 12px' }}>
                <div className="row wrap g8">
                  <TextInput size="sm" aria-label="نام حوزه" placeholder="مثلاً «تأسیسات برقی و مکانیکی»" value={area.areaName} disabled={!canManage} onChange={(event) => updateArea(index, { areaName: event.target.value })} style={{ flex: '1 1 220px' }} invalid={!area.areaName.trim()} />
                  <Select size="sm" label={`ناظر حوزهٔ ${area.areaName || 'تازه'}`} options={reviewerOptions} value={area.reviewerUserId ?? ''} onChange={(id) => updateArea(index, { reviewerUserId: id || null })} disabled={!canManage} width={220} />
                  {canManage && <IconButton icon="trash-2" label={`حذف حوزهٔ ${area.areaName}`} size="sm" onClick={() => draft.set({ areas: value.areas.filter((_, position) => position !== index) })} />}
                </div>
                <div className="row wrap g6" role="group" aria-label="بخش‌های WBS این حوزه">
                  {data.wbsRoots.map((root) => {
                    const owner = used.get(root.id);
                    const mine = owner === index;
                    const taken = owner !== undefined && !mine;
                    return (
                      <Chip
                        key={root.id}
                        selected={mine}
                        title={taken ? `در حوزهٔ «${value.areas[owner!]?.areaName}»` : root.title}
                        className={taken ? 'tx5' : undefined}
                        onClick={
                          canManage
                            ? () => {
                                // انتخاب بخشی که در حوزهٔ دیگری است، آن را جابه‌جا می‌کند
                                const areas = value.areas.map((entry, position) => ({
                                  ...entry,
                                  rootIds: position === index ? (mine ? entry.rootIds.filter((id) => id !== root.id) : [...entry.rootIds, root.id]) : entry.rootIds.filter((id) => id !== root.id),
                                }));
                                draft.set({ areas });
                              }
                            : undefined
                        }
                      >
                        <span className="mono t-xs">{root.code}</span> {root.title}
                      </Chip>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="row wrap g12" style={{ padding: '10px 12px', background: '#FAFAFA', borderRadius: 10 }}>
              <span className="t-12 tx6 grow">تأییدکنندهٔ جایگزین در غیاب، تأخیر یا نبودِ حوزه</span>
              <Select size="sm" label="تأییدکنندهٔ جایگزین" options={settings.members.map((member) => ({ value: member.userId, label: `${member.fullName}${member.isManager ? ' · مدیر پروژه' : ''}` }))} value={value.fallbackApproverId} onChange={(fallbackApproverId) => draft.set({ fallbackApproverId })} disabled={!canManage} width={220} />
            </div>
          </div>
        </>
      )}
    </SectionCard>
  );
}

function PeriodsCard() {
  const { project, settings } = useSettingsContext();
  const canClose = useHasPermission('period.close') && project.status !== 'archived';
  const [close, state] = useClosePeriodMutation();
  const [target, setTarget] = useState<PeriodDto | null>(null);
  const periods = settings.periods;
  return (
    <SectionCard id="periods" icon="calendar-check" title="دوره‌های گزارش" subtitle="دورهٔ ماهانهٔ شمسی؛ بستن دوره عکس اعداد را ثابت می‌کند و تأیید دیرهنگام اثرش را از دورهٔ باز بعد می‌گذارد (D06، G2)">
      {periods.length === 0 ? (
        <span className="t-13 tx6">پروژهٔ پیش‌نویس هنوز دوره‌ای ندارد؛ دوره‌ها با فعال‌سازی ساخته می‌شوند.</span>
      ) : (
        <div style={{ border: '1px solid #E4E4E7', borderRadius: 10, overflow: 'hidden' }}>
          {periods.slice(0, 8).map((period) => (
            <div key={period.id} className="row wrap g12" style={{ padding: '9px 14px', borderBottom: '1px solid #F4F4F5' }}>
              <span className="t-13 fw6 tx9" style={{ width: 80 }}>
                {period.label}
              </span>
              <span className="t-12 tx6 grow">{`${formatJalaliDate(period.startDate)} تا ${formatJalaliDate(period.endDate)}`}</span>
              {period.status === 'closed' ? (
                <span className="t-12 tx5">{`بسته · ${period.closedBy ?? ''} · ${formatJalaliDateTime(period.closedAt)}`}</span>
              ) : (
                <Badge size="sm" tone={period.overdue ? 'wrn' : 'inf'}>
                  {period.overdue ? 'باز · از موعد بستن گذشته' : 'باز'}
                </Badge>
              )}
              {period.closable && canClose && (
                <AppButton size="xs" variant="primary" icon="lock" onClick={() => setTarget(period)}>
                  بستن دوره
                </AppButton>
              )}
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        isOpen={target !== null}
        tone="warning"
        icon="lock"
        title={`بستن دورهٔ ${target?.label ?? ''}`}
        description="اعداد این دوره ثابت می‌شوند (PeriodSnapshot) و دیگر با تأیید دیرهنگام تغییر نمی‌کنند؛ اثر تأیید دیرهنگام از دورهٔ باز بعد حساب می‌شود."
        confirmLabel="بستن دوره"
        loading={state.isLoading}
        onCancel={() => setTarget(null)}
        onConfirm={() => {
          if (target) void close({ projectId: project.id, periodId: target.id }).unwrap().then(() => setTarget(null)).catch(() => setTarget(null));
        }}
      />
    </SectionCard>
  );
}
