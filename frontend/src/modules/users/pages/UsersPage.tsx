import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { SYSTEM_ROLES, type SystemRole } from '@/config/constants';
import { ROUTES } from '@/config/routes';
import { Content } from '@/shared/components/layout/AppShell';
import { Topbar } from '@/shared/components/layout/Topbar';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { toast } from '@/shared/components/feedback/toastStore';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton, LinkButton } from '@/shared/components/ui/AppButton';
import { Avatar } from '@/shared/components/ui/Avatar';
import { Badge } from '@/shared/components/ui/Badge';
import { Card } from '@/shared/components/ui/Card';
import { Chip } from '@/shared/components/ui/Chip';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { Icon, type IconName } from '@/shared/components/ui/Icon';
import { IconButton } from '@/shared/components/ui/IconButton';
import { Stat, StatStrip } from '@/shared/components/ui/KpiCard';
import { Menu, type MenuEntry } from '@/shared/components/ui/Menu';
import { PageHead } from '@/shared/components/ui/PageHead';
import { Pagination } from '@/shared/components/ui/Pagination';
import { ProgressBar } from '@/shared/components/ui/ProgressBar';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import { Switch } from '@/shared/components/ui/SelectionControls';
import { TextInput } from '@/shared/components/ui/TextInput';
import { useHasPermission } from '@/shared/hooks/useHasAccess';
import { useSelection } from '@/shared/hooks/useSelection';
import { appLink } from '@/shared/utils/appUrl';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { formatRelativeTime } from '@/shared/utils/date';
import { toFaDigits } from '@/shared/utils/num';
import type { Tone } from '@/shared/types/tone';
import { roleLabel, roleTone } from '@/modules/team/services/teamView';
import {
  useBulkUsersMutation,
  useEnableUserMutation,
  useGetOrgUsersQuery,
  useSetOrgAdminMutation,
  useSetRequire2faMutation,
  useUnlockUserMutation,
} from '../api/usersApi';
import { ImportUsersDialog } from '../components/ImportUsersDialog';
import { DisableUserDialog, InviteUserDialog, ProjectRolesDialog } from '../components/UserDialogs';
import { exportUsers } from '../services/usersCsv';
import type { LoginSecurity, OrgUserRowDto, UserRowStatus } from '../types';

const PAGE_SIZE = 12;
const normalize = (value: string) => value.trim().toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک');

const STATUS: Record<UserRowStatus, { label: string; tone: Tone }> = {
  active: { label: 'فعال', tone: 'ok' },
  invited: { label: 'دعوت‌شده', tone: 'inf' },
  locked: { label: 'قفل‌شده', tone: 'err' },
  disabled: { label: 'غیرفعال', tone: 'neu' },
};

const SECURITY: Record<LoginSecurity, { icon: IconName; label: string; className: string }> = {
  '2fa': { icon: 'shield-check', label: 'دومرحله‌ای', className: 'tx-ok' },
  no2fa: { icon: 'shield-x', label: 'فقط رمز عبور', className: 'tx-wrn' },
  otp: { icon: 'message-square', label: 'کد پیامکی', className: 'tx6' },
  none: { icon: 'minus', label: '—', className: 'tx5' },
};

type Dialog =
  | { kind: 'invite' }
  | { kind: 'import' }
  | { kind: 'roles'; mode: 'set_roles' | 'add_to_project'; rowIds: string[] }
  | { kind: 'disable'; userId: string }
  | { kind: 'revoke'; rowIds: string[] }
  | { kind: 'admin'; row: OrgUserRowDto }
  | null;

/**
 * W26 — کاربران سازمان (F01 ۵.۶): آمار و سهم مجوز، اجباری کردن ورود دومرحله‌ای (G18)، فیلتر
 * نقش/پروژه/وضعیت، عملیات گروهی و ورود گروهی. نقش هر کاربر در هر پروژه جداست؛ عضویت از
 * سرویس F07 تغییر می‌کند.
 */
export default function UsersPage() {
  const canManage = useHasPermission('users.manage');
  const canInvite = useHasPermission('users.invite');
  const canOrgSettings = useHasPermission('org.settings');
  const canRoles = useHasPermission('roles.edit');
  const query = useGetOrgUsersQuery({ canManage });
  const [bulk] = useBulkUsersMutation();
  const [unlock] = useUnlockUserMutation();
  const [enable] = useEnableUserMutation();
  const [setAdmin, adminState] = useSetOrgAdminMutation();
  const [setRequire2fa, require2faState] = useSetRequire2faMutation();

  const [search, setSearch] = useState('');
  const [role, setRole] = useState<'all' | SystemRole>('all');
  const [projectId, setProjectId] = useState<string>('all');
  const [status, setStatus] = useState<'all' | UserRowStatus>('all');
  const [no2faOnly, setNo2faOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<Dialog>(null);

  const data = query.data;
  const rows = useMemo(() => {
    const term = normalize(search);
    return (data?.rows ?? []).filter(
      (row) =>
        (role === 'all' || row.roles.includes(role)) &&
        (projectId === 'all' || row.projects.some((project) => project.id === projectId)) &&
        (status === 'all' || row.status === status) &&
        (!no2faOnly || (row.security === 'no2fa' && row.status !== 'disabled')) &&
        (!term || normalize(row.fullName).includes(term) || normalize(row.contact ?? '').replace(/\s/g, '').includes(term.replace(/\s/g, ''))),
    );
  }, [data, search, role, projectId, status, no2faOnly]);
  useEffect(() => setPage(1), [search, role, projectId, status, no2faOnly]);
  const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selection = useSelection(paged.map((row) => row.rowId));
  const selectedRows = (data?.rows ?? []).filter((row) => selection.isSelected(row.rowId));
  const selectedInvites = selectedRows.filter((row) => row.kind === 'invitation');
  const selectedUsers = selectedRows.filter((row) => row.kind === 'user' && row.status !== 'disabled');

  async function runBulk(action: 'resend' | 'revoke', rowIds: string[]) {
    try {
      const result = await bulk({ action, rowIds }).unwrap();
      toast.success(`${toFaDigits(result.done)} دعوت ${action === 'resend' ? 'دوباره فرستاده و ۷ روز تمدید شد' : 'لغو شد'}.`);
      selection.clear();
    } catch (cause) {
      toast.error(getApiErrorMessage(cause));
    }
  }

  const copyInviteLink = (row: OrgUserRowDto) => {
    const link = appLink(`/invite/${row.invitation!.id}`);
    void navigator.clipboard?.writeText(link).then(
      () => toast.success('پیوند دعوت کپی شد.'),
      () => toast.error('کپی نشد؛ پیوند را از پیامک دعوت بردارید.'),
    );
  };

  function menuFor(row: OrgUserRowDto): MenuEntry[] {
    if (row.kind === 'invitation')
      return canInvite
        ? [
            { key: 'resend', label: row.invitation!.expired ? 'تمدید و ارسال دوباره' : 'ارسال مجدد دعوت', icon: 'send', onSelect: () => void runBulk('resend', [row.rowId]) },
            { key: 'copy', label: 'کپی پیوند دعوت', icon: 'link', onSelect: () => copyInviteLink(row) },
            { key: 'sep', separator: true },
            { key: 'revoke', label: 'لغو دعوت', icon: 'x-circle', tone: 'danger', onSelect: () => setDialog({ kind: 'revoke', rowIds: [row.rowId] }) },
          ]
        : [];
    if (row.status === 'disabled')
      return canManage ? [{ key: 'enable', label: 'فعال‌کردن دوباره', icon: 'user-check', onSelect: () => void enable(row.userId!) }] : [];
    return [
      ...(canInvite
        ? [
            { key: 'roles', label: 'تغییر نقش در یک پروژه', icon: 'user-cog' as const, disabled: row.projects.length === 0, disabledReason: 'عضو هیچ پروژه‌ای نیست', onSelect: () => setDialog({ kind: 'roles', mode: 'set_roles', rowIds: [row.rowId] }) },
            { key: 'add', label: 'افزودن به پروژه', icon: 'folder-plus' as const, onSelect: () => setDialog({ kind: 'roles', mode: 'add_to_project', rowIds: [row.rowId] }) },
          ]
        : []),
      ...(canManage
        ? [
            { key: 'sep', separator: true as const },
            ...(row.status === 'locked' ? [{ key: 'unlock', label: 'بازکردن قفل', icon: 'unlock' as const, onSelect: () => void unlock(row.userId!) }] : []),
            { key: 'admin', label: row.isOrgAdmin ? 'برداشتن مدیر سازمان' : 'تعیین به‌عنوان مدیر سازمان', icon: 'shield' as const, onSelect: () => setDialog({ kind: 'admin', row }) },
            { key: 'disable', label: 'غیرفعال‌کردن', icon: 'user-x' as const, tone: 'danger' as const, disabled: row.isMe, disabledReason: 'حساب خودتان را نمی‌توانید غیرفعال کنید', onSelect: () => setDialog({ kind: 'disable', userId: row.userId! }) },
          ]
        : []),
    ];
  }

  const columns: Array<Column<OrgUserRowDto>> = [
    {
      key: 'user',
      header: 'کاربر',
      minWidth: 220,
      render: (row) => (
        <span className="row g10" style={{ minWidth: 0 }}>
          {row.kind === 'invitation' ? (
            <span className="av m" style={{ background: '#FFFFFF', border: '1.5px dashed #A1A1AA', color: '#71717A' }}>
              <Icon name="mail" size={14} />
            </span>
          ) : (
            <Avatar name={row.fullName} tone={row.avatarTone} size="m" />
          )}
          <span className="col" style={{ gap: 1, minWidth: 0 }}>
            <span className="row g6">
              <span className="t-13 fw5 tx9 nowrap">{row.fullName}</span>
              {row.isMe && (
                <Badge size="sm" tone="pri">
                  شما
                </Badge>
              )}
            </span>
            {row.contact && (
              <span className="t-xs tx5 nowrap" dir="ltr" style={{ textAlign: 'right' }}>
                {row.contact}
              </span>
            )}
          </span>
        </span>
      ),
    },
    {
      key: 'role',
      header: 'نقش',
      minWidth: 150,
      render: (row) => {
        const [first, ...rest] = row.roles;
        if (!first) return <span className="t-12 tx5">بدون نقش</span>;
        const badge = (
          <Badge size="sm" tone={first === 'org_admin' ? 'vio' : roleTone(first)}>
            {roleLabel(first)}
          </Badge>
        );
        return (
          <span className="row g4">
            {canRoles ? (
              <Link to={ROUTES.permissions} style={{ textDecoration: 'none' }}>
                {badge}
              </Link>
            ) : (
              badge
            )}
            {rest.length > 0 && (
              <span title={rest.map(roleLabel).join('، ')}>
                <Badge size="sm" tone="neu">{`+${toFaDigits(rest.length)} نقش`}</Badge>
              </span>
            )}
          </span>
        );
      },
    },
    {
      key: 'projects',
      header: 'پروژه‌ها',
      minWidth: 170,
      render: (row) => (
        <span className="col" style={{ gap: 1 }}>
          <span className="t-12 tx8 nowrap" title={row.projects.map((project) => project.name).join('، ')}>
            {row.isOrgAdmin && row.projects.length === 0 ? 'همهٔ پروژه‌ها' : row.projects.slice(0, 2).map((project) => project.name).join('، ') || '—'}
          </span>
          <span className="t-xs tx5 nowrap">
            {row.projects.length > 2 ? `+${toFaDigits(row.projects.length - 2)} پروژهٔ دیگر` : row.projects.length > 0 ? `${toFaDigits(row.projects.length)} پروژه` : row.isOrgAdmin ? 'مدیر سازمان' : 'عضو پروژه‌ای نیست'}
          </span>
        </span>
      ),
    },
    {
      key: 'last',
      header: 'آخرین فعالیت',
      minWidth: 170,
      render: (row) => (
        <span className="col" style={{ gap: 1 }}>
          <span className={`t-12 nowrap ${row.kind === 'invitation' ? 'tx5' : 'tx8'}`}>
            {row.kind === 'invitation' ? `دعوت ${formatRelativeTime(row.invitation!.sentAt)}` : row.lastActiveAt ? formatRelativeTime(row.lastActiveAt) : '—'}
          </span>
          <span className={`row g4 t-xs nowrap ${row.device.warn ? 'tx-wrn' : 'tx5'}`}>
            <Icon name={row.device.icon} size={12} />
            {row.device.text}
          </span>
        </span>
      ),
    },
    {
      key: 'security',
      header: 'امنیت ورود',
      minWidth: 110,
      render: (row) => {
        const view = SECURITY[row.security];
        return (
          <span className={`row g4 t-12 nowrap ${view.className}`}>
            <Icon name={view.icon} size={14} />
            {view.label}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'وضعیت',
      minWidth: 110,
      render: (row) => (
        <span className="col" style={{ gap: 2, alignItems: 'flex-start' }}>
          <Badge size="sm" tone={STATUS[row.status].tone} dot>
            {STATUS[row.status].label}
          </Badge>
          {row.status === 'locked' && canManage ? (
            <button type="button" className="link t-xs" onClick={() => void unlock(row.userId!)} title={row.statusNote ?? undefined}>
              بازکردن قفل
            </button>
          ) : row.invitation && canInvite ? (
            row.invitation.expired || row.invitation.expiringSoon ? (
              <button type="button" className="link t-xs" onClick={() => void runBulk('resend', [row.rowId])}>
                تمدید دعوت
              </button>
            ) : (
              <button type="button" className="link t-xs" onClick={() => copyInviteLink(row)}>
                کپی پیوند دعوت
              </button>
            )
          ) : row.statusNote ? (
            <span className="t-xs tx5">{row.statusNote}</span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'menu',
      header: <span className="sr-input">اقدامات</span>,
      width: 44,
      render: (row) => {
        const entries = menuFor(row);
        return entries.length > 0 ? (
          <Menu entries={entries} trigger={(props) => <IconButton {...props} icon="more-vertical" size="sm" label={`گزینه‌های ${row.fullName}`} />} />
        ) : null;
      },
    },
  ];

  const roleOptions: Array<SelectOption<'all' | SystemRole>> = [
    { value: 'all', label: 'نقش: همه' },
    ...(Object.keys(SYSTEM_ROLES) as SystemRole[]).map((value) => ({ value, label: SYSTEM_ROLES[value] })),
  ];
  const statusOptions: Array<SelectOption<'all' | UserRowStatus>> = [
    { value: 'all', label: 'وضعیت: همه' },
    ...(Object.keys(STATUS) as UserRowStatus[]).map((value) => ({ value, label: STATUS[value].label })),
  ];

  return (
    <>
      <Topbar title="کاربران سازمان" icon="users" />
      <Content>
        <PageHead
          title="کاربران سازمان"
          subtitle="همهٔ کاربران وب و اپلیکیشن اندروید؛ نقش هر کاربر در هر پروژه جداگانه تعیین می‌شود"
          actions={
            <>
              {canRoles && (
                <LinkButton variant="ghost" icon="shield-check" to={ROUTES.permissions}>
                  نقش‌ها و دسترسی‌ها
                </LinkButton>
              )}
              {canInvite && (
                <AppButton variant="outline" icon="file-spreadsheet" onClick={() => setDialog({ kind: 'import' })} disabled={!data}>
                  ورود گروهی
                </AppButton>
              )}
              {canInvite && (
                <AppButton variant="primary" icon="user-plus" onClick={() => setDialog({ kind: 'invite' })} disabled={!data}>
                  دعوت کاربر
                </AppButton>
              )}
            </>
          }
        />

        {query.isLoading ? (
          <SkeletonTable rows={10} />
        ) : query.isError || !data ? (
          <EmptyState
            inCard
            icon="server"
            title="کاربران بارگذاری نشد"
            description="چند لحظهٔ دیگر دوباره امتحان کنید."
            actions={
              <AppButton size="sm" variant="primary" icon="refresh-cw" onClick={() => void query.refetch()}>
                تلاش دوباره
              </AppButton>
            }
          />
        ) : (
          <>
            <StatStrip columns={5} style={{ marginBottom: 16 }}>
              <Stat label="کل کاربران" value={toFaDigits(data.summary.total)} hint={`${toFaDigits(data.summary.web)} کاربر وب · ${toFaDigits(data.summary.android)} کاربر اندروید`} />
              <Stat label="فعال" value={toFaDigits(data.summary.active)} valueClassName="tx-ok" hint={`${toFaDigits(data.summary.active7d)} نفر در ۷ روز اخیر وارد شده‌اند`} />
              <Stat
                label="دعوت در انتظار"
                value={toFaDigits(data.summary.invited)}
                valueClassName="tx-inf"
                hint={data.summary.expiringSoon > 0 ? <span className="tx-wrn">{`${toFaDigits(data.summary.expiringSoon)} دعوت تا فردا منقضی می‌شود`}</span> : 'هیچ دعوتی نزدیک انقضا نیست'}
              />
              <Stat label="قفل‌شده یا غیرفعال" value={toFaDigits(data.summary.locked + data.summary.disabled)} hint={`${toFaDigits(data.summary.no2fa)} کاربر وب بدون ورود دومرحله‌ای`} />
              <Stat
                label="مجوزهای استفاده‌شده"
                value={
                  <>
                    {toFaDigits(data.seats.used)} <span className="t-13 fw5 tx5">از {toFaDigits(data.seats.limit)}</span>
                  </>
                }
                hint={<ProgressBar value={(data.seats.used / data.seats.limit) * 100} color={data.seats.used >= data.seats.limit ? '#B91C1C' : undefined} label="مجوزهای استفاده‌شده" />}
              />
            </StatStrip>

            {canOrgSettings && (
              <Alert
                tone={data.require2fa ? 'ok' : data.summary.no2fa > 0 ? 'wrn' : 'inf'}
                icon={data.require2fa ? 'shield-check' : 'shield-alert'}
                className="mb16"
                action={<Switch label="اجباری کردن ورود دومرحله‌ای" checked={data.require2fa} disabled={require2faState.isLoading} onChange={(value) => void setRequire2fa(value)} />}
              >
                {data.require2fa
                  ? `ورود دومرحله‌ای برای همهٔ کاربران وب اجباری است؛ ${toFaDigits(data.summary.no2fa)} کاربر در ورود بعدی باید آن را فعال کنند.`
                  : `ورود دومرحله‌ای اختیاری است و ${toFaDigits(data.summary.no2fa)} کاربر وب فقط با رمز عبور وارد می‌شوند. با اجباری کردن، در ورود بعدی باید فعالش کنند.`}
              </Alert>
            )}

            <Card>
              <div className="row g8 wrap" style={{ padding: '12px 14px', borderBottom: '1px solid #F4F4F5' }}>
                <TextInput
                  size="sm"
                  icon="search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="نام، ایمیل یا شمارهٔ همراه"
                  aria-label="جستجوی کاربر"
                  style={{ width: 260, maxWidth: '100%' }}
                />
                <Select size="sm" label="فیلتر نقش" options={roleOptions} value={role} onChange={setRole} width={150} />
                <Select
                  size="sm"
                  label="فیلتر پروژه"
                  options={[{ value: 'all', label: 'پروژه: همه' }, ...data.projects.map((project) => ({ value: project.id, label: project.name }))]}
                  value={projectId}
                  onChange={setProjectId}
                  width={190}
                />
                <Select size="sm" label="فیلتر وضعیت" options={statusOptions} value={status} onChange={setStatus} width={140} />
                <Chip icon="shield-x" selected={no2faOnly} onClick={() => setNo2faOnly((value) => !value)}>
                  <>
                    بدون ورود دومرحله‌ای <span className="tx5">{toFaDigits(data.summary.no2fa)}</span>
                  </>
                </Chip>
                <span className="ms-auto t-12 tx5">مرتب‌سازی: آخرین فعالیت</span>
                <IconButton
                  icon="download"
                  size="sm"
                  bordered
                  label="خروجی Excel از فهرست کاربران"
                  onClick={() => {
                    exportUsers(rows);
                    toast.success('خروجی فهرست کاربران آماده شد.');
                  }}
                />
              </div>
              <DataTable
                rows={paged}
                columns={columns}
                getRowId={(row) => row.rowId}
                minWidth={1080}
                caption="کاربران سازمان"
                selection={canInvite ? selection : undefined}
                isRowSelected={(row) => selection.isSelected(row.rowId)}
                rowClassName={(row) => (row.status === 'disabled' ? 'muted' : undefined)}
                bulkActions={(current) => (
                  <>
                    <span className="row g8 t-13 fw6">
                      <Icon name="check-square" size={15} />
                      {`${toFaDigits(current.count)} کاربر انتخاب شد`}
                    </span>
                    <AppButton variant="ghostOnDark" size="sm" icon="send" disabled={selectedInvites.length === 0} onClick={() => void runBulk('resend', selectedInvites.map((row) => row.rowId))}>
                      ارسال مجدد دعوت
                    </AppButton>
                    <AppButton variant="ghostOnDark" size="sm" icon="user-cog" disabled={selectedUsers.length === 0} onClick={() => setDialog({ kind: 'roles', mode: 'set_roles', rowIds: selectedUsers.map((row) => row.rowId) })}>
                      تغییر نقش
                    </AppButton>
                    <AppButton variant="ghostOnDark" size="sm" icon="folder-plus" disabled={selectedUsers.length === 0} onClick={() => setDialog({ kind: 'roles', mode: 'add_to_project', rowIds: selectedUsers.map((row) => row.rowId) })}>
                      افزودن به پروژه
                    </AppButton>
                    <AppButton variant="ghostOnDark" size="sm" icon="x-circle" disabled={selectedInvites.length === 0} onClick={() => setDialog({ kind: 'revoke', rowIds: selectedInvites.map((row) => row.rowId) })}>
                      لغو دعوت
                    </AppButton>
                    <AppButton variant="ghostOnDark" size="sm" className="ms-auto" onClick={current.clear}>
                      لغو انتخاب
                    </AppButton>
                  </>
                )}
                empty={
                  <EmptyState
                    icon="users"
                    title="کاربری با این فیلتر نیست"
                    description="فیلترها را تغییر دهید یا پاک کنید."
                    actions={
                      <AppButton
                        size="sm"
                        variant="outline"
                        icon="x"
                        onClick={() => {
                          setSearch('');
                          setRole('all');
                          setProjectId('all');
                          setStatus('all');
                          setNo2faOnly(false);
                        }}
                      >
                        پاک کردن فیلترها
                      </AppButton>
                    }
                  />
                }
                footer={<Pagination page={page} pageSize={PAGE_SIZE} total={rows.length} unit="کاربر" onPageChange={setPage} />}
              />
            </Card>
          </>
        )}
      </Content>

      {data && dialog?.kind === 'invite' && <InviteUserDialog data={data} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'import' && <ImportUsersDialog onClose={() => setDialog(null)} />}
      {data && dialog?.kind === 'roles' && (
        <ProjectRolesDialog
          mode={dialog.mode}
          rowIds={dialog.rowIds}
          projects={data.projects}
          onClose={(done) => {
            if (done) selection.clear();
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === 'disable' && <DisableUserDialog userId={dialog.userId} onClose={() => setDialog(null)} />}
      <ConfirmDialog
        isOpen={dialog?.kind === 'revoke'}
        tone="danger"
        icon="x-circle"
        title={dialog?.kind === 'revoke' && dialog.rowIds.length > 1 ? `لغو ${toFaDigits(dialog.rowIds.length)} دعوت` : 'لغو دعوت'}
        description="پیوند دعوت باطل می‌شود و مجوزش آزاد می‌شود. برای دعوت دوباره باید از نو دعوت بفرستید."
        confirmLabel="لغو دعوت"
        cancelLabel="نگه داشتن دعوت"
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          if (dialog?.kind === 'revoke') void runBulk('revoke', dialog.rowIds);
          setDialog(null);
        }}
      />
      <ConfirmDialog
        isOpen={dialog?.kind === 'admin'}
        tone={dialog?.kind === 'admin' && dialog.row.isOrgAdmin ? 'warning' : 'info'}
        icon="shield"
        title={dialog?.kind === 'admin' ? (dialog.row.isOrgAdmin ? `برداشتن مدیر سازمان از ${dialog.row.fullName}` : `${dialog.row.fullName} مدیر سازمان شود`) : ''}
        description={
          dialog?.kind === 'admin' && dialog.row.isOrgAdmin
            ? 'دسترسی‌های سازمانی برداشته می‌شود و فقط نقش‌های پروژه‌ای می‌ماند. آخرین مدیر سازمان را نمی‌توان برداشت.'
            : 'مدیر سازمان همهٔ دسترسی‌ها را در همهٔ پروژه‌ها دارد و ماتریسش تغییر نمی‌کند.'
        }
        confirmLabel={dialog?.kind === 'admin' && dialog.row.isOrgAdmin ? 'برداشتن نقش' : 'تعیین مدیر سازمان'}
        loading={adminState.isLoading}
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          if (dialog?.kind !== 'admin') return;
          void setAdmin({ userId: dialog.row.userId!, isOrgAdmin: !dialog.row.isOrgAdmin })
            .unwrap()
            .catch(() => undefined)
            .finally(() => setDialog(null));
        }}
      />
    </>
  );
}
