import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { baseApi } from '@/app/api/baseApi';
import { logout, updateUser } from '@/app/store/authSlice';
import { useAppDispatch } from '@/app/store/hooks';
import { ROUTES } from '@/config/routes';
import { Content } from '@/shared/components/layout/AppShell';
import { Topbar } from '@/shared/components/layout/Topbar';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { toast } from '@/shared/components/feedback/toastStore';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Avatar, initialsFor } from '@/shared/components/ui/Avatar';
import { Badge } from '@/shared/components/ui/Badge';
import { Card, CardHeader } from '@/shared/components/ui/Card';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { FormField } from '@/shared/components/ui/FormField';
import { Icon, type IconName } from '@/shared/components/ui/Icon';
import { Select } from '@/shared/components/ui/Select';
import { Switch } from '@/shared/components/ui/SelectionControls';
import { SegmentedControl } from '@/shared/components/ui/Tabs';
import { TextInput } from '@/shared/components/ui/TextInput';
import { formatJalaliDateTime, formatRelativeTime } from '@/shared/utils/date';
import { toFaDigits } from '@/shared/utils/num';
import { useLogoutMutation } from '@/modules/auth/api/authApi';
import type { UserPreferences } from '@/modules/auth/types';
import { roleLabel, roleTone } from '@/modules/team/services/teamView';
import {
  useGetAccountQuery,
  useGetLoginHistoryQuery,
  useRevokeOtherSessionsMutation,
  useRevokeSessionMutation,
  useSaveNotificationPrefsMutation,
  useUpdatePreferencesMutation,
  useUpdateProfileMutation,
} from '../api/accountApi';
import { BackupCodesDialog, ChangePasswordDialog, TwoFactorDialog, useRegenerateBackupCodes } from '../components/SecurityDialogs';
import { LOGIN_RESULT_LABEL, NOTIFY_CHANNEL_LABEL, START_PAGES } from '../services/accountView';
import type { AccountDto, LoginAttemptDto, NotifyChannel } from '../types';

const SECTIONS: Array<{ id: string; label: string; icon: IconName }> = [
  { id: 'profile', label: 'پروفایل', icon: 'user' },
  { id: 'security', label: 'امنیت و ورود', icon: 'shield-check' },
  { id: 'history', label: 'تاریخچهٔ ورود', icon: 'history' },
  { id: 'notifications', label: 'اعلان‌های من', icon: 'bell' },
  { id: 'preferences', label: 'ترجیحات نمایش', icon: 'sliders-horizontal' },
];

/**
 * W32 — حساب من (F01 ۵.۷): پروفایل، امنیت (رمز، ورود دومرحله‌ای، دستگاه‌ها)، تاریخچهٔ ورود ۳۰ روزه،
 * ترجیح اعلان و ساعت آرام (notifications.md ۵.۱ و ۵.۴) و ترجیحات نمایش که در همهٔ اپ اعمال می‌شود.
 * «کلیدهای API» بوم ساخته نشد (تصمیم 1405/08/19).
 */
export default function AccountPage() {
  const query = useGetAccountQuery();
  const dispatch = useAppDispatch();
  const [serverLogout] = useLogoutMutation();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const [leaving, setLeaving] = useState(false);
  const data = query.data;

  useEffect(() => {
    if (!data || !hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [data, hash]);

  function signOut() {
    // نشست سرور و کوکی تازه‌سازی باطل می‌شوند؛ خروج محلی منتظر پاسخ نمی‌ماند.
    // پاک‌کردن کش API باید پس از پایان درخواست باشد: resetApiState درخواست‌های در جریان را
    // abort می‌کند و خروج سرور هیچ‌وقت نمی‌رسید.
    const request = serverLogout();
    dispatch(logout());
    navigate(ROUTES.login, { replace: true });
    void request.finally(() => dispatch(baseApi.util.resetApiState()));
  }

  return (
    <>
      <Topbar title="حساب کاربری" icon="user" />
      <Content>
        {query.isLoading ? (
          <SkeletonTable rows={10} />
        ) : query.isError || !data ? (
          <EmptyState
            inCard
            icon="server"
            title="حساب بارگذاری نشد"
            description="چند لحظهٔ دیگر دوباره امتحان کنید."
            actions={
              <AppButton size="sm" variant="primary" icon="refresh-cw" onClick={() => void query.refetch()}>
                تلاش دوباره
              </AppButton>
            }
          />
        ) : (
          <div className="acc-wrap">
          <div className="acc-layout">
            <nav className="acc-nav" aria-label="بخش‌های حساب کاربری">
              <div className="row g10 acc-me">
                <Avatar name={data.profile.fullName} tone={data.profile.avatarTone} size="l" />
                <span className="col" style={{ minWidth: 0 }}>
                  <span className="t-13 fw6 tx9 trunc">{data.profile.fullName}</span>
                  <span className="t-xs tx5 trunc">{data.profile.jobTitle ?? '—'}</span>
                </span>
              </div>
              {SECTIONS.map((section) => (
                <a key={section.id} className={`nav-a${hash === `#${section.id}` ? ' on' : ''}`} href={`#${section.id}`}>
                  <Icon name={section.icon} size={16} />
                  {section.label}
                </a>
              ))}
              <div className="hr acc-sep" />
              <button type="button" className="nav-a acc-out" onClick={() => setLeaving(true)}>
                <Icon name="log-out" size={16} />
                خروج از حساب
              </button>
            </nav>
            <div className="col g16 acc-main">
              <ProfileCard data={data} />
              <SecurityCard data={data} />
              <HistoryCard />
              <NotificationsCard data={data} />
              <PreferencesCard data={data} />
            </div>
          </div>
          </div>
        )}
      </Content>
      <ConfirmDialog
        isOpen={leaving}
        tone="warning"
        icon="log-out"
        title="خروج از حساب"
        description="از همین دستگاه خارج می‌شوید؛ نشست دستگاه‌های دیگر می‌ماند."
        confirmLabel="خروج"
        cancelLabel="ماندن"
        onCancel={() => setLeaving(false)}
        onConfirm={signOut}
      />
    </>
  );
}

function ProfileCard({ data }: { data: AccountDto }) {
  const dispatch = useAppDispatch();
  const [fullName, setFullName] = useState(data.profile.fullName);
  const [jobTitle, setJobTitle] = useState(data.profile.jobTitle ?? '');
  const [department, setDepartment] = useState<string | null>(data.profile.department);
  const [save, state] = useUpdateProfileMutation();
  const dirty = fullName !== data.profile.fullName || jobTitle !== (data.profile.jobTitle ?? '') || department !== data.profile.department;
  const nameError = fullName.trim().length < 3 ? 'نام و نام خانوادگی را کامل بنویسید' : undefined;

  async function submit() {
    if (nameError) return;
    try {
      const result = await save({ fullName, jobTitle, department }).unwrap();
      dispatch(updateUser({ fullName: result.profile.fullName, initials: initialsFor(result.profile.fullName), jobTitle: result.profile.jobTitle ?? '' }));
    } catch {
      // پیام را میان‌افزار نشان می‌دهد
    }
  }

  return (
    <Card id="profile" className="acc-card">
      <CardHeader title="پروفایل" subtitle="نام شما در گزارش‌ها، تأییدها و اپلیکیشن سرپرستان دیده می‌شود" />
      <div className="col g20" style={{ padding: '18px 20px 22px' }}>
        <div className="grid c2 rsp" style={{ gap: '16px 18px' }}>
          <FormField label="نام و نام خانوادگی" required error={nameError}>
            <TextInput value={fullName} maxLength={80} onChange={(event) => setFullName(event.target.value)} />
          </FormField>
          <FormField label="عنوان شغلی" optional>
            <TextInput value={jobTitle} maxLength={80} onChange={(event) => setJobTitle(event.target.value)} />
          </FormField>
          <FormField label="واحد سازمانی" optional>
            <Select label="واحد سازمانی" placeholder="انتخاب واحد" options={data.departments.map((entry) => ({ value: entry, label: entry }))} value={department} onChange={setDepartment} width="100%" />
          </FormField>
          <div />
          <FormField label="ایمیل" hint="برای تغییر ایمیل با مدیر سازمان هماهنگ کنید">
            <TextInput ltr readOnly readOnlyLook value={data.profile.email ?? '—'} trailing={data.profile.email ? <Badge size="sm" tone="ok">تأییدشده</Badge> : undefined} />
          </FormField>
          <FormField label="شمارهٔ همراه" hint="کد ورود دومرحله‌ای به این شماره می‌رود؛ تغییرش فقط با مدیر سازمان و تأیید کد">
            <TextInput ltr readOnly readOnlyLook value={data.profile.mobile} trailing={<Badge size="sm" tone="ok">تأییدشده</Badge>} />
          </FormField>
        </div>

        <div className="col g8">
          <span className="lbl">نقش‌های شما در پروژه‌ها</span>
          {data.memberships.length === 0 && !data.profile.isOrgAdmin ? (
            <span className="t-13 tx6">هنوز عضو هیچ پروژه‌ای نیستید.</span>
          ) : (
            <div className="box" style={{ padding: 0, overflow: 'hidden' }}>
              {data.profile.isOrgAdmin && (
                <div className="row g12 acc-role">
                  <span className="col grow">
                    <span className="t-13 fw5 tx9">همهٔ پروژه‌های سازمان</span>
                  </span>
                  <Badge size="sm" tone="vio">
                    مدیر سازمان
                  </Badge>
                </div>
              )}
              {data.memberships.map((entry) => (
                <div key={entry.projectId} className="row g12 acc-role">
                  <span className="col grow" style={{ gap: 1, minWidth: 0 }}>
                    <span className="t-13 fw5 tx9 trunc">{entry.name}</span>
                    <span className="mono t-xs tx5">{entry.code}</span>
                  </span>
                  <span className="row wrap g4">
                    {entry.roles.map((role) => (
                      <Badge key={role} size="sm" tone={roleTone(role)}>
                        {roleLabel(role)}
                      </Badge>
                    ))}
                  </span>
                  {entry.status !== 'active' && <span className="t-xs tx5 nowrap">{entry.status === 'paused' ? 'پروژه متوقف است' : entry.status === 'draft' ? 'پیش‌نویس' : 'بسته'}</span>}
                </div>
              ))}
            </div>
          )}
          <span className="hint">نقش‌ها را مدیر هر پروژه از صفحهٔ اعضا تعیین می‌کند.</span>
        </div>

        <div className="row g8" style={{ justifyContent: 'flex-end' }}>
          <AppButton
            variant="ghost"
            size="sm"
            disabled={!dirty}
            onClick={() => {
              setFullName(data.profile.fullName);
              setJobTitle(data.profile.jobTitle ?? '');
              setDepartment(data.profile.department);
            }}
          >
            صرف‌نظر
          </AppButton>
          <AppButton variant="primary" size="sm" icon="save" disabled={!dirty || Boolean(nameError)} loading={state.isLoading} onClick={() => void submit()}>
            ذخیرهٔ پروفایل
          </AppButton>
        </div>
      </div>
    </Card>
  );
}

function SecurityCard({ data }: { data: AccountDto }) {
  const [dialog, setDialog] = useState<'password' | 'enable' | 'disable' | 'revoke-all' | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [revoke] = useRevokeSessionMutation();
  const [revokeOthers, revokeOthersState] = useRevokeOtherSessionsMutation();
  const backup = useRegenerateBackupCodes(setCodes);
  const security = data.security;
  const rotation = security.daysUntilRotation;
  const secure = security.twoFactorEnabled && (rotation === null || rotation > 0);
  const others = data.sessions.filter((session) => !session.current).length;

  return (
    <Card id="security" className="acc-card">
      <CardHeader
        title="امنیت و ورود"
        subtitle="رمز عبور، ورود دومرحله‌ای و دستگاه‌هایی که با حساب شما وارد شده‌اند"
        action={
          <Badge tone={secure ? 'ok' : 'wrn'}>
            <Icon name={secure ? 'shield-check' : 'shield-alert'} size={13} />
            {secure ? 'حساب ایمن' : 'نیاز به توجه'}
          </Badge>
        }
      />
      <div className="col" style={{ padding: '4px 20px 4px' }}>
        <div className="acc-row">
          <span className="icb sm" style={{ background: '#F4F4F5', color: '#52525B' }}>
            <Icon name="key-round" size={14} />
          </span>
          <div className="col grow" style={{ gap: 2, minWidth: 0 }}>
            <span className="t-13 fw6 tx9">رمز عبور</span>
            <span className={`t-12 ${rotation !== null && rotation <= 10 ? 'tx-wrn' : 'tx5'}`}>
              {security.passwordChangedAt ? `آخرین تغییر ${formatRelativeTime(security.passwordChangedAt)}` : 'هنوز تغییر نکرده'}
              {rotation !== null &&
                (rotation > 0
                  ? ` · ${toFaDigits(rotation)} روز تا تغییر اجباری (هر ${toFaDigits(security.rotationDays)} روز)`
                  : ' · مهلت گذشته؛ در ورود بعدی باید رمز را عوض کنید')}
            </span>
          </div>
          <AppButton variant="outline" size="sm" onClick={() => setDialog('password')}>
            تغییر رمز عبور
          </AppButton>
        </div>

        <div className="acc-row">
          <span className={`icb sm ${security.twoFactorEnabled ? 'ok' : 'wrn'}`}>
            <Icon name="smartphone" size={14} />
          </span>
          <div className="col grow" style={{ gap: 2, minWidth: 0 }}>
            <span className="row g8">
              <span className="t-13 fw6 tx9">ورود دومرحله‌ای</span>
              <Badge size="sm" tone={security.twoFactorEnabled ? 'ok' : 'wrn'}>
                {security.twoFactorEnabled ? 'فعال' : 'خاموش'}
              </Badge>
              {security.orgRequires2fa && <span className="t-xs tx5">اجباری سازمان</span>}
            </span>
            <span className="t-12 tx5">
              {security.twoFactorEnabled
                ? `کد پیامکی به ${security.maskedMobile} · ${toFaDigits(security.backupCodesLeft)} کد پشتیبان باقی مانده است`
                : 'ورود فقط با رمز عبور؛ با روشن کردن، کد پیامکی هم لازم می‌شود'}
            </span>
          </div>
          {security.twoFactorEnabled ? (
            <>
              <AppButton variant="ghost" size="sm" loading={backup.loading} onClick={() => void backup.run()}>
                کدهای پشتیبان تازه
              </AppButton>
              <AppButton
                variant="outline"
                size="sm"
                disabled={security.orgRequires2fa}
                title={security.orgRequires2fa ? 'سازمان ورود دومرحله‌ای را اجباری کرده است' : undefined}
                onClick={() => setDialog('disable')}
              >
                خاموش کردن
              </AppButton>
            </>
          ) : (
            <AppButton variant="primary" size="sm" icon="shield-check" onClick={() => setDialog('enable')}>
              روشن کردن
            </AppButton>
          )}
        </div>

        <div className="col g8" style={{ padding: '14px 0' }}>
          <div className="row between wrap g8">
            <span className="t-13 fw6 tx9">دستگاه‌های فعال</span>
            <AppButton variant="dangerOutline" size="xs" icon="log-out" disabled={others === 0} onClick={() => setDialog('revoke-all')}>
              خروج از همهٔ دستگاه‌های دیگر
            </AppButton>
          </div>
          {data.sessions.map((session) => (
            <div key={session.id} className={`row g12 acc-device${session.current ? ' cur' : ''}`}>
              <span className="icb sm" style={{ background: '#FFFFFF', color: '#3F3F46', border: '1px solid #E4E4E7' }}>
                <Icon name={session.client === 'android' ? 'smartphone' : /iPhone|Android/.test(session.deviceName) ? 'smartphone' : 'monitor'} size={15} />
              </span>
              <div className="col grow" style={{ gap: 1, minWidth: 0 }}>
                <span className="row g8">
                  <span className="t-13 fw5 tx9 trunc">{session.deviceName}</span>
                  {session.current && (
                    <Badge size="sm" tone="ok">
                      همین دستگاه
                    </Badge>
                  )}
                </span>
                <span className="t-xs tx5">
                  {`${session.location} · ${session.current ? 'هم‌اکنون' : formatRelativeTime(session.lastUsedAt)} · `}
                  <span className="mono" dir="ltr">
                    {session.ip}
                  </span>
                </span>
              </div>
              {!session.current && (
                <AppButton variant="ghost" size="xs" onClick={() => void revoke(session.id)}>
                  خروج
                </AppButton>
              )}
            </div>
          ))}
        </div>
      </div>

      {dialog === 'password' && <ChangePasswordDialog onClose={() => setDialog(null)} />}
      {(dialog === 'enable' || dialog === 'disable') && (
        <TwoFactorDialog
          mode={dialog}
          userId={data.profile.id}
          maskedMobile={security.maskedMobile}
          onClose={(backupCodes) => {
            setDialog(null);
            if (backupCodes) setCodes(backupCodes);
          }}
        />
      )}
      {codes && <BackupCodesDialog codes={codes} onClose={() => setCodes(null)} />}
      <ConfirmDialog
        isOpen={dialog === 'revoke-all'}
        tone="warning"
        icon="log-out"
        title="خروج از همهٔ دستگاه‌های دیگر"
        description={`نشست ${toFaDigits(others)} دستگاه دیگر باطل می‌شود و آن‌ها باید دوباره وارد شوند. همین دستگاه وارد می‌ماند.`}
        confirmLabel="خروج از دستگاه‌های دیگر"
        loading={revokeOthersState.isLoading}
        onCancel={() => setDialog(null)}
        onConfirm={() =>
          void revokeOthers()
            .unwrap()
            .then((result) => toast.success(`از ${toFaDigits(result.signedOut)} دستگاه خارج شدید.`))
            .catch(() => undefined)
            .finally(() => setDialog(null))
        }
      />
    </Card>
  );
}

function HistoryCard() {
  const query = useGetLoginHistoryQuery();
  const [all, setAll] = useState(false);
  const rows = query.data ?? [];
  const columns: Array<Column<LoginAttemptDto>> = [
    { key: 'at', header: 'زمان', minWidth: 140, render: (row) => <span className="t-12 tx8 nowrap">{formatJalaliDateTime(row.at)}</span> },
    {
      key: 'result',
      header: 'نتیجه',
      minWidth: 130,
      render: (row) => (
        <Badge size="sm" tone={row.result === 'success' ? 'ok' : 'err'}>
          {LOGIN_RESULT_LABEL[row.result]}
        </Badge>
      ),
    },
    { key: 'method', header: 'روش', minWidth: 140, render: (row) => <span className="t-12 tx7">{row.method}</span> },
    {
      key: 'location',
      header: 'مکان تقریبی',
      minWidth: 110,
      render: (row) => (
        <span className={`row g4 t-12 ${row.suspicious ? 'tx-err' : 'tx7'}`}>
          {row.suspicious && <Icon name="alert-triangle" size={13} />}
          {row.location}
        </span>
      ),
    },
    { key: 'ip', header: 'نشانی IP', minWidth: 110, render: (row) => <span className="mono t-xs tx6" dir="ltr">{row.ip}</span> },
  ];
  return (
    <Card id="history" className="acc-card">
      <CardHeader
        title="تاریخچهٔ ورود"
        subtitle="۳۰ روز اخیر · ورود ناموفق از مکان ناشناس با رنگ هشدار"
        action={
          rows.length > 5 && (
            <button type="button" className="link t-12" onClick={() => setAll((value) => !value)}>
              {all ? 'نمایش کمتر' : `مشاهدهٔ همه (${toFaDigits(rows.length)})`}
            </button>
          )
        }
      />
      {query.isLoading ? (
        <SkeletonTable rows={4} />
      ) : (
        <DataTable
          rows={all ? rows : rows.slice(0, 5)}
          columns={columns}
          getRowId={(row) => row.id}
          minWidth={640}
          caption="تاریخچهٔ ورود"
          rowClassName={(row) => (row.suspicious ? 'row-warn' : undefined)}
          empty={<span className="t-13 tx6">در ۳۰ روز اخیر ورودی ثبت نشده است.</span>}
        />
      )}
    </Card>
  );
}

function NotificationsCard({ data }: { data: AccountDto }) {
  const [draft, setDraft] = useState(data.notifications);
  const [save, state] = useSaveNotificationPrefsMutation();
  useEffect(() => setDraft(data.notifications), [data.notifications]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(data.notifications);
  const channels: NotifyChannel[] = ['in_app', 'email', 'push', 'sms'];

  const toggle = (key: string, channel: NotifyChannel, on: boolean) =>
    setDraft((previous) => ({
      ...previous,
      groups: previous.groups.map((entry) => (entry.key === key ? { ...entry, channels: { ...entry.channels, [channel]: on ? 'on' : 'off' } } : entry)),
    }));

  return (
    <Card id="notifications" className="acc-card">
      <CardHeader title="اعلان‌های من" subtitle="فقط می‌توانید کانال‌ها را برای خودتان کم کنید؛ اعلان درون برنامه و اعلان‌های الزامی همیشه روشن‌اند" />
      <div className="tbl-wrap">
        <table className="tbl" style={{ minWidth: 560 }}>
          <caption className="sr-input">ترجیح کانال اعلان</caption>
          <thead>
            <tr>
              <th>رویداد</th>
              {channels.map((channel) => (
                <th key={channel} className="c">
                  {NOTIFY_CHANNEL_LABEL[channel]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {draft.groups.map((entry) => (
              <tr key={entry.key}>
                <td>
                  <span className="col" style={{ gap: 1 }}>
                    <span className="t-13 fw5 tx9">{entry.label}</span>
                    <span className="t-xs tx5">{entry.description}</span>
                  </span>
                </td>
                {channels.map((channel) => {
                  const value = entry.channels[channel];
                  return (
                    <td key={channel} className="c">
                      {value === 'na' ? (
                        <span className="t-12 tx4" title={channel === 'push' ? 'اپ اندروید ندارید' : 'این کانال برای این رویداد نیست'}>
                          —
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex' }} title={value === 'locked_on' ? 'الزامی' : undefined}>
                          <Switch label={`${entry.label} — ${NOTIFY_CHANNEL_LABEL[channel]}`} checked={value !== 'off'} disabled={value === 'locked_on'} onChange={(on) => toggle(entry.key, channel, on)} />
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="col g12" style={{ padding: '16px 20px 20px', borderTop: '1px solid #F4F4F5' }}>
        <div className="row wrap g12">
          <Switch label="ساعت آرام" checked={draft.quietHours.enabled} onChange={(enabled) => setDraft((previous) => ({ ...previous, quietHours: { ...previous.quietHours, enabled } }))} />
          <span className="t-13 tx8">ساعت آرام</span>
          <span className="row g8">
            <span className="t-12 tx6">از</span>
            <TextInput size="sm" type="time" ltr aria-label="شروع ساعت آرام" disabled={!draft.quietHours.enabled} value={draft.quietHours.from} onChange={(event) => setDraft((previous) => ({ ...previous, quietHours: { ...previous.quietHours, from: event.target.value } }))} style={{ width: 120 }} />
            <span className="t-12 tx6">تا</span>
            <TextInput size="sm" type="time" ltr aria-label="پایان ساعت آرام" disabled={!draft.quietHours.enabled} value={draft.quietHours.to} onChange={(event) => setDraft((previous) => ({ ...previous, quietHours: { ...previous.quietHours, to: event.target.value } }))} style={{ width: 120 }} />
          </span>
        </div>
        <span className="hint">در این بازه ایمیل و پوش غیربحرانی تا پایان آن نگه داشته می‌شود؛ اعلان درون برنامه و پیامک فوری تأخیر نمی‌خورند.</span>
        <div className="row g8" style={{ justifyContent: 'flex-end' }}>
          <AppButton variant="ghost" size="sm" disabled={!dirty} onClick={() => setDraft(data.notifications)}>
            صرف‌نظر
          </AppButton>
          <AppButton variant="primary" size="sm" icon="save" disabled={!dirty} loading={state.isLoading} onClick={() => void save(draft)}>
            ذخیرهٔ اعلان‌ها
          </AppButton>
        </div>
      </div>
    </Card>
  );
}

function PreferencesCard({ data }: { data: AccountDto }) {
  const [draft, setDraft] = useState<UserPreferences>(data.preferences);
  const [save, state] = useUpdatePreferencesMutation();
  useEffect(() => setDraft(data.preferences), [data.preferences]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(data.preferences);
  const set = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => setDraft((previous) => ({ ...previous, [key]: value }));

  return (
    <Card id="preferences" className="acc-card">
      <CardHeader title="ترجیحات نمایش" subtitle="فقط برای حساب شما و فقط در نمایش؛ داده‌ها و محاسبه‌ها عوض نمی‌شوند" />
      <div className="col g16" style={{ padding: '18px 20px 22px' }}>
        <div className="grid c2 rsp" style={{ gap: '16px 18px' }}>
          <div className="fg">
            <span className="lbl">تقویم</span>
            <SegmentedControl
              items={[
                { key: 'jalali', label: 'هجری شمسی' },
                { key: 'gregorian', label: 'میلادی' },
              ]}
              activeKey={draft.calendar}
              onChange={(key) => set('calendar', key as UserPreferences['calendar'])}
              style={{ alignSelf: 'flex-start' }}
            />
          </div>
          <div className="fg">
            <span className="lbl">نمایش اعداد</span>
            <SegmentedControl
              items={[
                { key: 'fa', label: 'فارسی ۱۲۳' },
                { key: 'latin', label: 'لاتین 123' },
              ]}
              activeKey={draft.digits}
              onChange={(key) => set('digits', key as UserPreferences['digits'])}
              style={{ alignSelf: 'flex-start' }}
            />
          </div>
          <FormField label="صفحهٔ شروع پس از ورود">
            <Select label="صفحهٔ شروع" options={START_PAGES} value={draft.startPage ?? ''} onChange={(value) => set('startPage', value || null)} width="100%" />
          </FormField>
          <FormField label="واحد نمایش مبالغ" hint="ریال یا تومان تنظیم هر پروژه است.">
            <Select
              label="واحد نمایش مبالغ"
              options={[
                { value: 'auto', label: 'خودکار (بر اساس بزرگی مبلغ)' },
                { value: 'million', label: 'میلیون ریال' },
                { value: 'billion', label: 'میلیارد ریال' },
              ]}
              value={draft.amountScale}
              onChange={(value) => set('amountScale', value as UserPreferences['amountScale'])}
              width="100%"
            />
          </FormField>
        </div>
        {(draft.calendar !== 'jalali' || draft.digits !== 'fa') && (
          <Alert tone="inf" icon="info">
            پیش‌فرض سازمان شمسی و ارقام فارسی است؛ این انتخاب فقط نمایش شما را عوض می‌کند و گزارش‌ها و خروجی‌های دیگران تغییری نمی‌کنند.
          </Alert>
        )}
        <div className="row g8" style={{ justifyContent: 'flex-end' }}>
          <AppButton variant="ghost" size="sm" disabled={!dirty} onClick={() => setDraft(data.preferences)}>
            صرف‌نظر
          </AppButton>
          <AppButton variant="primary" size="sm" icon="save" disabled={!dirty} loading={state.isLoading} onClick={() => void save(draft)}>
            ذخیره و اعمال
          </AppButton>
        </div>
      </div>
    </Card>
  );
}
