import { useMemo, useState } from 'react';

import { ROUTES } from '@/config/routes';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton, LinkButton } from '@/shared/components/ui/AppButton';
import { Badge } from '@/shared/components/ui/Badge';
import { Icon, type IconName } from '@/shared/components/ui/Icon';
import { Modal } from '@/shared/components/ui/Modal';
import { Select } from '@/shared/components/ui/Select';
import { Checkbox, Switch } from '@/shared/components/ui/SelectionControls';
import { TextInput } from '@/shared/components/ui/TextInput';
import { useHasPermission } from '@/shared/hooks/useHasAccess';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { toEnDigits, toFaDigits } from '@/shared/utils/num';
import { useExportXerMutation, useSaveAlertRuleMutation, useSetNotificationChannelMutation, useTransferManagerMutation } from '../api/settingsApi';
import { BackupsCard } from '../components/BackupsCard';
import { SectionCard } from '../components/SettingsKit';
import { openFileLink } from '../services/fileLink';
import type { AlertRuleDto, ChannelKey, IntegrationCardDto } from '../types';
import { useSettingsContext } from './ProjectSettingsLayout';

const CHANNELS: Array<{ key: ChannelKey; label: string; icon: IconName }> = [
  { key: 'in_app', label: 'درون‌برنامه', icon: 'bell' },
  { key: 'email', label: 'ایمیل', icon: 'mail' },
  { key: 'sms', label: 'پیامک', icon: 'message-square' },
  { key: 'push', label: 'پوش اندروید', icon: 'smartphone' },
];

/** W30 — اعلان‌ها، قواعد هشدار، یکپارچه‌سازی، پشتیبان، منطقهٔ خطر. */
export default function IntegrationSettingsPage() {
  return (
    <div className="col g16" style={{ maxWidth: 760, minWidth: 0, flex: '1 1 auto' }}>
      <NotificationsCard />
      <AlertRulesCard />
      <IntegrationsCard />
      <BackupsCard />
      <DangerZoneCard />
    </div>
  );
}

function NotificationsCard() {
  const { project, settings } = useSettingsContext();
  const canConfigure = useHasPermission('notifications.configure_project') && project.status !== 'archived';
  const [setChannel] = useSetNotificationChannelMutation();
  return (
    <SectionCard id="notifications" icon="bell" title="اعلان‌ها" subtitle="برای هر رویداد، راه‌های اطلاع‌رسانی؛ گیرنده‌ها از نقش تعیین می‌شوند (notifications.md ۴.۲)" readOnly={!canConfigure}>
      <div className="tbl-wrap" style={{ overflowX: 'auto', margin: '0 -20px' }}>
        <table className="tbl" style={{ minWidth: 620, width: '100%' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'start', paddingInlineStart: 20 }}>رویداد</th>
              {CHANNELS.map((channel) => (
                <th key={channel.key} style={{ width: 84, textAlign: 'center' }}>
                  <span className="row g4" style={{ justifyContent: 'center' }}>
                    <Icon name={channel.icon} size={12} />
                    {channel.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {settings.notifications.map((row) => (
              <tr key={row.code}>
                <td style={{ paddingInlineStart: 20 }}>
                  <span className="col" style={{ gap: 1 }}>
                    <span className="t-13 fw5 tx9">{row.label}</span>
                    <span className="t-xs tx5">{`به: ${row.recipients}`}</span>
                  </span>
                </td>
                {CHANNELS.map((channel) => {
                  const state = row.channels[channel.key];
                  const label = `${row.label} — ${channel.label}`;
                  return (
                    <td key={channel.key} style={{ textAlign: 'center' }}>
                      <span className="row" style={{ justifyContent: 'center', opacity: state === 'na' ? 0.35 : 1 }} title={state === 'na' ? (channel.key === 'sms' ? 'پیامک فقط برای رویدادهای فوری' : 'برای این رویداد قابل‌استفاده نیست') : state === 'locked_on' ? 'همیشه روشن' : undefined}>
                        <Checkbox
                          aria-label={label}
                          checked={state === 'on' || state === 'locked_on'}
                          disabled={!canConfigure || state === 'na' || state === 'locked_on'}
                          onChange={(event) => void setChannel({ projectId: project.id, code: row.code, channel: channel.key, on: event.target.checked })}
                        />
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <span className="row g6 t-12 tx5">
        <Icon name="info" size={14} />
        پیامک فقط برای رویدادهای فوری است؛ پوش برای کاربران اپ اندروید. خانه‌های کم‌رنگ برای آن رویداد قابل‌استفاده نیستند و درون‌برنامه همیشه روشن است. هر کاربر در حساب خود (W32) می‌تواند راه‌ها را برای خودش کم کند.
      </span>
    </SectionCard>
  );
}

function AlertRuleRow({ rule, projectId, canConfigure }: { rule: AlertRuleDto; projectId: string; canConfigure: boolean }) {
  const [save, state] = useSaveAlertRuleMutation();
  const [enabled, setEnabled] = useState(rule.enabled);
  const [params, setParams] = useState<Record<string, string>>(Object.fromEntries(rule.params.map((param) => [param.key, toFaDigits(String(param.value))])));
  const parsed = Object.fromEntries(Object.entries(params).map(([key, value]) => [key, Number(toEnDigits(value).replace('٫', '.'))]));
  const dirty = enabled !== rule.enabled || rule.params.some((param) => parsed[param.key] !== param.value);
  return (
    <div className="col g8" style={{ padding: '12px 0', borderBottom: '1px solid #F4F4F5' }}>
      <div className="row wrap g10">
        <span className="mono t-xs tx5" style={{ width: 76 }}>
          {rule.code}
        </span>
        <span className="col grow" style={{ minWidth: 180 }}>
          <span className="t-13 fw6 tx9">{rule.name}</span>
          <span className="t-xs tx5">{rule.severityText}</span>
        </span>
        <Switch checked={enabled} disabled={!canConfigure || !rule.canDisable} label={`${rule.name} روشن`} onChange={setEnabled} />
        {!rule.canDisable && <Badge size="sm" tone="neu">همیشه روشن</Badge>}
      </div>
      {rule.params.length > 0 && (
        <div className="row wrap g10" style={{ paddingInlineStart: 86 }}>
          {rule.params.map((param) => (
            <label key={param.key} className="row g6 t-12 tx7">
              {param.label}
              <TextInput size="sm" ltr aria-label={`${rule.name}: ${param.label}`} value={params[param.key] ?? ''} disabled={!canConfigure || !enabled} onChange={(event) => setParams((current) => ({ ...current, [param.key]: event.target.value }))} style={{ width: 70 }} />
              {param.unit}
            </label>
          ))}
        </div>
      )}
      {state.error && (
        <span className="hint err" style={{ paddingInlineStart: 86 }}>
          {getApiErrorMessage(state.error)}
        </span>
      )}
      {dirty && (
        <span className="row g6" style={{ paddingInlineStart: 86 }}>
          <AppButton size="xs" variant="primary" loading={state.isLoading} onClick={() => void save({ projectId, code: rule.code, enabled, params: parsed })}>
            ذخیره
          </AppButton>
          <AppButton
            size="xs"
            variant="ghost"
            onClick={() => {
              setEnabled(rule.enabled);
              setParams(Object.fromEntries(rule.params.map((param) => [param.key, toFaDigits(String(param.value))])));
            }}
          >
            صرف‌نظر
          </AppButton>
        </span>
      )}
    </div>
  );
}

function AlertRulesCard() {
  const { project, settings } = useSettingsContext();
  const canConfigure = useHasPermission('alerts.configure') && project.status !== 'archived';
  const groups = useMemo(() => {
    const map = new Map<string, AlertRuleDto[]>();
    settings.alertRules.forEach((rule) => map.set(rule.group, [...(map.get(rule.group) ?? []), rule]));
    return [...map];
  }, [settings.alertRules]);
  return (
    <SectionCard id="alerts" icon="alert-triangle" title="قواعد هشدار" subtitle="روشن/خاموش و پارامترهای هر قاعده برای این پروژه (04 ۲.۴؛ G8). خاموش کردن، هشدارهای بازش را می‌بندد." readOnly={!canConfigure}>
      {groups.map(([group, rules]) => (
        <div key={group} className="col">
          <span className="sect-t" style={{ padding: '4px 0' }}>
            {group}
          </span>
          {rules.map((rule) => (
            <AlertRuleRow key={`${rule.code}-${rule.enabled}-${rule.params.map((param) => param.value).join(',')}`} rule={rule} projectId={project.id} canConfigure={canConfigure} />
          ))}
        </div>
      ))}
      <span className="t-12 tx5">آستانه‌های انحراف (AL-PRG-01/02) و مهلت تأیید (AL-APR-01) از بخش «پیشرفت و محاسبات» و «گردش‌کار تأیید» می‌آیند.</span>
    </SectionCard>
  );
}

const INTEGRATION_ICON: Record<IntegrationCardDto['key'], IconName> = { msp: 'file-code', erp: 'server', accounting: 'calculator', p6: 'file-output' };

function IntegrationsCard() {
  const { project, settings } = useSettingsContext();
  const canExportXer = useHasPermission('integrations.export_p6');
  const [exportXer, xerState] = useExportXerMutation();
  return (
    <SectionCard id="integrations" icon="plug" title="یکپارچه‌سازی" subtitle="اتصال به نرم‌افزارهای برنامه‌ریزی و مالی (اتصال واقعی ERP و حسابداری در فاز بعد — F19)">
      <div className="col g10">
        {settings.integrations.map((card) => (
          <div key={card.key} className="row wrap g12" style={{ padding: '12px 14px', border: '1px solid #E4E4E7', borderRadius: 12 }}>
            <span className="icb lg" style={{ background: card.status === 'connected' ? '#E5EBF3' : '#F4F4F5', color: card.status === 'connected' ? '#1A3354' : '#52525B' }}>
              <Icon name={INTEGRATION_ICON[card.key]} size={18} />
            </span>
            <div className="col grow" style={{ gap: 2, minWidth: 200 }}>
              <span className="row wrap g8">
                <span className="t-13 fw6 tx9">{card.title}</span>
                <Badge size="sm" tone={card.status === 'connected' ? 'ok' : card.status === 'soon' ? 'neu' : 'inf'} dot>
                  {card.status === 'connected' ? 'متصل' : card.status === 'not_linked' ? 'متصل نیست' : card.status === 'soon' ? 'به‌زودی' : 'فقط خروجی'}
                </Badge>
              </span>
              <span className="t-12 tx5">{card.description}</span>
              <span className="t-xs tx6">{card.message}</span>
            </div>
            {card.key === 'msp' &&
              (card.status === 'connected' ? (
                <LinkButton to={ROUTES.mspSync(project.id)} variant="outline" size="sm" icon="refresh-cw">
                  همگام‌سازی
                </LinkButton>
              ) : (
                <LinkButton to={`/msp/import?project=${encodeURIComponent(project.id)}`} variant="outline" size="sm" icon="upload-cloud">
                  ورود از MSP
                </LinkButton>
              ))}
            {card.key === 'p6' && canExportXer && (
              <AppButton
                variant="outline"
                size="sm"
                icon="download"
                loading={xerState.isLoading}
                onClick={() =>
                  void exportXer({ projectId: project.id })
                    .unwrap()
                    .then((link) => openFileLink(link.url, link.fileName))
                }
              >
                دریافت XER
              </AppButton>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function DangerZoneCard() {
  const { project, settings, actions } = useSettingsContext();
  const canArchive = useHasPermission('project.archive');
  const canTransfer = useHasPermission('project.transfer_manager') && project.status !== 'archived';
  const canDelete = useHasPermission('project.delete');
  const [target, setTarget] = useState<string>('');
  const [otpOpen, setOtpOpen] = useState(false);
  const candidates = settings.members.filter((member) => !member.isManager);
  const archivable = project.status === 'completed' || project.status === 'paused';
  const deletable = project.status === 'draft' || project.status === 'archived';

  return (
    <SectionCard id="danger" icon="alert-octagon" tone="danger" title="منطقهٔ خطر" subtitle="اقدام‌های حساس؛ مدیر پروژه و مدیر سازمان (access-control.md ۱۳)">
      <div className="col">
        <DangerRow
          title="بایگانی پروژه"
          description={archivable ? 'داده‌ها حفظ می‌شوند ولی هیچ تغییری مجاز نیست و اپ سرپرستان گزارش نمی‌گیرد. بازگردانی فقط با مدیر سازمان.' : 'فقط پروژهٔ متوقف یا تمام‌شده بایگانی می‌شود؛ اول آن را از منوی پروژه متوقف یا تمام کنید.'}
          action={
            <AppButton variant="accent" size="sm" icon="archive" disabled={!canArchive || !archivable} onClick={() => actions.request('archive', project)}>
              بایگانی پروژه
            </AppButton>
          }
        />
        <DangerRow
          title="انتقال مدیریت پروژه"
          description="مدیریت به عضو دیگری می‌رسد؛ مدیر فعلی برنامه‌ریز می‌شود و تأیید مرحلهٔ دوم و جایگزین به مدیر تازه منتقل می‌شود. با کد تأیید."
          action={
            <span className="row wrap g8">
              <Select size="sm" label="مدیر تازه" placeholder="انتخاب عضو" options={candidates.map((member) => ({ value: member.userId, label: member.fullName }))} value={target || null} onChange={setTarget} disabled={!canTransfer} width={180} />
              <AppButton variant="outline" size="sm" disabled={!canTransfer || !target} onClick={() => setOtpOpen(true)}>
                انتقال مدیریت
              </AppButton>
            </span>
          }
        />
        <DangerRow
          title="حذف پروژه"
          description={deletable ? `پروژه فوراً از همهٔ فهرست‌ها پنهان می‌شود و ${project.status === 'draft' ? 'پیش‌نویس فوراً پاک می‌شود' : 'پس از ۱۴ روز همهٔ WBS، CBS، گزارش‌ها و عکس‌ها پاک می‌شود؛ تا آن زمان مدیر سازمان می‌تواند لغو کند'}.` : 'فقط پروژهٔ پیش‌نویس یا بایگانی‌شده حذف می‌شود.'}
          action={
            <AppButton variant="danger" size="sm" icon="trash-2" disabled={!canDelete || !deletable} onClick={() => actions.request('delete', project)}>
              حذف پروژه
            </AppButton>
          }
          last
        />
      </div>
      {otpOpen && target && <TransferDialog projectId={project.id} userId={target} name={candidates.find((member) => member.userId === target)?.fullName ?? ''} onClose={() => setOtpOpen(false)} onDone={() => { setOtpOpen(false); setTarget(''); }} />}
    </SectionCard>
  );
}

function DangerRow({ title, description, action, last }: { title: string; description: string; action: React.ReactNode; last?: boolean }) {
  return (
    <div className="row wrap g16" style={{ padding: '14px 0', borderBottom: last ? undefined : '1px solid #F4F4F5' }}>
      <div className="col grow" style={{ gap: 2, minWidth: 220, flex: '1 1 280px' }}>
        <span className="t-13 fw6 tx9">{title}</span>
        <span className="t-12 tx5 lh">{description}</span>
      </div>
      {action}
    </div>
  );
}

/** انتقال مدیریت با کد پیامکی (F02 ۸.۴). */
function TransferDialog({ projectId, userId, name, onClose, onDone }: { projectId: string; userId: string; name: string; onClose: () => void; onDone: () => void }) {
  const [transfer, state] = useTransferManagerMutation();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  async function submit() {
    setError(null);
    try {
      await transfer({ projectId, userId, otp: toEnDigits(otp.trim()) }).unwrap();
      onDone();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    }
  }
  return (
    <Modal
      isOpen
      onClose={onClose}
      size="sm"
      title="تأیید انتقال مدیریت"
      description={`مدیریت پروژه به ${name} منتقل می‌شود.`}
      footer={
        <>
          <AppButton variant="ghost" onClick={onClose}>
            انصراف
          </AppButton>
          <AppButton variant="primary" loading={state.isLoading} disabled={otp.trim().length !== 6} onClick={() => void submit()}>
            تأیید و انتقال
          </AppButton>
        </>
      }
    >
      <div className="col g12">
        <span className="t-13 tx7 lh">کد شش‌رقمی پیامک‌شده به شمارهٔ شما را وارد کنید.</span>
        <TextInput ltr className="mono" aria-label="کد تأیید" inputMode="numeric" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value)} />
        {error && (
          <Alert tone="err" icon="alert-octagon">
            {error}
          </Alert>
        )}
      </div>
    </Modal>
  );
}
