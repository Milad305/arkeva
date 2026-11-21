import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { SYSTEM_ROLES, type SystemRole } from '@/config/constants';
import { Content } from '@/shared/components/layout/AppShell';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Avatar } from '@/shared/components/ui/Avatar';
import { Badge } from '@/shared/components/ui/Badge';
import { Card, CardHeader } from '@/shared/components/ui/Card';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { Icon } from '@/shared/components/ui/Icon';
import { IconButton } from '@/shared/components/ui/IconButton';
import { KpiCard } from '@/shared/components/ui/KpiCard';
import { Menu, type MenuEntry } from '@/shared/components/ui/Menu';
import { PageHead } from '@/shared/components/ui/PageHead';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import { TextInput } from '@/shared/components/ui/TextInput';
import { toast } from '@/shared/components/feedback/toastStore';
import { useHasPermission } from '@/shared/hooks/useHasAccess';
import { formatRelativeTime } from '@/shared/utils/date';
import { toFaDigits } from '@/shared/utils/num';
import { useProjectContext } from '@/modules/projects/layout/ProjectShell';
import { useGetMembersQuery, useInvitationActionMutation } from '../api/teamApi';
import { AddMemberDialog } from '../components/AddMemberDialog';
import { InviteQrDialog } from '../components/InviteQrDialog';
import { EditRolesDialog, RemoveMemberDialog } from '../components/MemberDialogs';
import { TeamTabs } from '../components/TeamTabs';
import { exportMembers } from '../services/membersExport';
import { appStatusView, roleLabel, roleTone } from '../services/teamView';
import type { InvitationDto, MemberDto } from '../types';

const normalize = (value: string) =>
  value.trim().toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک');

/**
 * W16 — اعضای پروژه (team-assignment.md ۴ و ۸): آمار بالا، فهرست اعضا با نقش، فعالیت‌های
 * سپرده‌شده، وضعیت اپ اندروید و آخرین فعالیت، و دعوت‌های در انتظار. افزودن، تغییر نقش،
 * حذف و خروجی فقط با `team.manage`؛ موبایل هم فقط برای همان (تصمیم 1405/08/15).
 */
export default function MembersPage() {
  const { project } = useProjectContext();
  const canManage = useHasPermission('team.manage') && project.status !== 'archived';
  const canAssign = useHasPermission('assignment.manage');
  const query = useGetMembersQuery({ projectId: project.id, canManage });
  const [invite] = useInvitationActionMutation();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<'all' | SystemRole>('all');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<MemberDto | null>(null);
  const [removing, setRemoving] = useState<MemberDto | null>(null);
  /** کد تازه پس از «ارسال دوباره» (OD-20). */
  const [qr, setQr] = useState<{ code: string; name: string | null } | null>(null);

  const data = query.data;
  const rows = useMemo(() => {
    const term = normalize(search);
    return (data?.members ?? []).filter(
      (member) =>
        (role === 'all' || member.roles.includes(role)) &&
        (!term ||
          normalize(member.fullName).includes(term) ||
          (member.mobile ?? '').includes(term)),
    );
  }, [data, search, role]);

  const menuFor = (member: MemberDto): MenuEntry[] => [
    ...(member.roles.includes('supervisor') && canAssign
      ? [
          {
            key: 'assign',
            label: 'تخصیص فعالیت',
            icon: 'list-checks' as const,
            to: `${ROUTES.assignment(project.id)}?supervisor=${member.userId}`,
          },
        ]
      : []),
    ...(canManage
      ? [
          {
            key: 'roles',
            label: 'تغییر نقش‌ها',
            icon: 'user-cog' as const,
            onSelect: () => setEditing(member),
          },
          { key: 'sep', separator: true as const },
          {
            key: 'remove',
            label: 'حذف از پروژه',
            icon: 'user-x' as const,
            tone: 'danger' as const,
            onSelect: () => setRemoving(member),
          },
        ]
      : []),
  ];

  const columns: Array<Column<MemberDto>> = [
    {
      key: 'member',
      header: 'عضو',
      minWidth: 200,
      render: (member) => (
        <span className="row g10">
          <Avatar name={member.fullName} tone={member.avatarTone} size="l" />
          <span className="col">
            <span className="fw6 tx9">{member.fullName}</span>
            <span className="t-xs tx5">
              {member.isManager ? 'مدیر پروژه' : member.roles.map(roleLabel).join('، ')}
            </span>
          </span>
        </span>
      ),
    },
    ...(canManage
      ? [
          {
            key: 'mobile',
            header: 'شماره موبایل',
            minWidth: 120,
            render: (member: MemberDto) => (
              <span className="mono t-12 tx7" dir="ltr">
                {member.mobile}
              </span>
            ),
          },
        ]
      : []),
    {
      key: 'roles',
      header: 'نقش در پروژه',
      minWidth: 140,
      render: (member) => (
        <span className="row wrap g4">
          {member.roles.map((entry) => (
            <Badge key={entry} tone={roleTone(entry)}>
              {roleLabel(entry)}
            </Badge>
          ))}
        </span>
      ),
    },
    {
      key: 'assigned',
      header: 'مسئولیت',
      minWidth: 170,
      render: (member) =>
        member.assignedCount > 0 && canAssign ? (
          <Link
            className="link row g6"
            to={`${ROUTES.assignment(project.id)}?supervisor=${member.userId}`}
          >
            {member.responsibility}
            <Badge size="sm" tone="neu">
              {toFaDigits(member.assignedCount)}
            </Badge>
          </Link>
        ) : (
          <span
            className={`t-12 ${member.roles.includes('supervisor') && member.assignedCount === 0 ? 'tx-wrn' : 'tx6'}`}
          >
            {member.responsibility ?? '—'}
          </span>
        ),
    },
    {
      key: 'app',
      header: 'اپ اندروید',
      minWidth: 170,
      render: (member) => {
        if (!member.roles.includes('supervisor'))
          return (
            <span className="row g6 t-12 tx6">
              <Icon name="monitor" size={13} />
              وب
            </span>
          );
        const view = appStatusView(member.app);
        return (
          <span className={`row g6 t-12 ${view.className}`}>
            <Icon name={view.icon} size={13} />
            {view.text}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'وضعیت',
      minWidth: 80,
      render: (member) => (
        <span className="row g6 t-12">
          <span
            className="dot"
            style={{ color: member.status === 'active' ? '#16A34A' : '#A1A1AA' }}
          />
          {member.status === 'active' ? 'فعال' : 'غیرفعال'}
        </span>
      ),
    },
    {
      key: 'last',
      header: 'آخرین فعالیت',
      minWidth: 100,
      render: (member) => (
        <span className="t-12 tx6">{formatRelativeTime(member.lastActiveAt)}</span>
      ),
    },
    {
      key: 'menu',
      header: <span className="sr-input">اقدامات</span>,
      width: 44,
      render: (member) => {
        const entries = menuFor(member);
        return entries.length > 0 ? (
          <Menu
            entries={entries}
            trigger={(props) => (
              <IconButton
                {...props}
                icon="more-vertical"
                label={`منوی ${member.fullName}`}
                size="sm"
              />
            )}
          />
        ) : null;
      },
    },
  ];

  const roleOptions: Array<SelectOption<'all' | SystemRole>> = [
    { value: 'all', label: 'همهٔ نقش‌ها' },
    ...(
      [
        'project_manager',
        'planner',
        'reviewer',
        'supervisor',
        'client_reviewer',
        'finance',
      ] as SystemRole[]
    ).map((value) => ({ value, label: SYSTEM_ROLES[value] })),
  ];

  async function onInvitation(entry: InvitationDto, action: 'resend' | 'revoke') {
    try {
      const result = await invite({ projectId: project.id, invitationId: entry.id, action }).unwrap();
      if (action === 'resend' && result.inviteCode) setQr({ code: result.inviteCode, name: entry.fullName ?? null });
    } catch {
      // پیام را میان‌افزار نشان می‌دهد
    }
  }

  return (
    <Content>
      <TeamTabs projectId={project.id} active="members" showAssignment={canAssign} />
      <PageHead
        title="اعضای پروژه"
        subtitle={
          data
            ? `${toFaDigits(data.summary.total)} نفر عضو این پروژه‌اند: مدیر پروژه، برنامه‌ریز، ناظران و سرپرستان کارگاه`
            : undefined
        }
        actions={
          canManage && (
            <>
              <AppButton
                variant="outline"
                icon="download"
                disabled={!data}
                onClick={() => {
                  if (!data) return;
                  exportMembers(project, data.members);
                  toast.success('خروجی اعضا آماده شد.');
                }}
              >
                خروجی اعضا
              </AppButton>
              <AppButton variant="primary" icon="user-plus" onClick={() => setAdding(true)}>
                افزودن عضو
              </AppButton>
            </>
          )
        }
      />

      {query.isLoading ? (
        <SkeletonTable rows={8} />
      ) : query.isError || !data ? (
        <EmptyState
          inCard
          icon="server"
          title="اعضا بارگذاری نشد"
          description="چند لحظهٔ دیگر دوباره امتحان کنید."
          actions={
            <AppButton
              size="sm"
              variant="primary"
              icon="refresh-cw"
              onClick={() => void query.refetch()}
            >
              تلاش دوباره
            </AppButton>
          }
        />
      ) : (
        <>
          <div className="grid c5 rsp" style={{ gap: 12, marginBottom: 16 }}>
            <KpiCard
              label="کل اعضا"
              icon="users"
              tone="pri"
              value={toFaDigits(data.summary.total)}
              hint={`مجوز سازمان: ${toFaDigits(data.seats.used)} از ${toFaDigits(data.seats.limit)}`}
            />
            <KpiCard
              label="مدیر پروژه"
              icon="shield"
              tone="acc"
              value="۱"
              hint={data.summary.managerName}
            />
            <KpiCard
              label="ناظران"
              icon="eye"
              tone="inf"
              value={toFaDigits(data.summary.reviewers)}
              hint="بازبینی گزارش‌ها"
            />
            <KpiCard
              label="سرپرستان کارگاه"
              icon="hard-hat"
              tone="ok"
              value={toFaDigits(data.summary.supervisors)}
              hint={
                data.summary.unassignedSupervisors > 0 ? (
                  <span className="tx-wrn">
                    {toFaDigits(data.summary.unassignedSupervisors)} نفر بدون تخصیص
                  </span>
                ) : (
                  'همه تخصیص دارند'
                )
              }
            />
            <KpiCard
              label="فعال در ۷ روز"
              icon="activity"
              tone="neu"
              value={toFaDigits(data.summary.active7d)}
              hint={`از ${toFaDigits(data.summary.total)} عضو`}
            />
          </div>

          <Card style={{ marginBottom: 16 }}>
            <CardHeader
              title={
                <span className="row g6">
                  فهرست اعضا
                  <Badge size="sm" tone="neu">
                    {toFaDigits(rows.length)} نفر
                  </Badge>
                </span>
              }
              action={
                <span className="row wrap g8">
                  <TextInput
                    size="sm"
                    icon="search"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="جستجوی نام یا شماره…"
                    aria-label="جستجوی عضو"
                    style={{ width: 220 }}
                  />
                  <Select
                    size="sm"
                    label="فیلتر نقش"
                    options={roleOptions}
                    value={role}
                    onChange={setRole}
                    width={150}
                  />
                </span>
              }
            />
            <DataTable
              rows={rows}
              columns={columns}
              getRowId={(member) => member.userId}
              minWidth={1000}
              caption="اعضای پروژه"
              empty={<span className="t-13 tx6">عضوی با این فیلتر نیست.</span>}
            />
          </Card>

          {canManage && data.invitations.length > 0 && (
            <Card>
              <CardHeader
                icon="mail-plus"
                title={
                  <span className="row g6">
                    دعوت‌های در انتظار
                    <Badge size="sm" tone="wrn">
                      {toFaDigits(data.invitations.length)}
                    </Badge>
                  </span>
                }
                action={<span className="t-sm tx5">دعوت‌نامه‌ها پس از ۷ روز منقضی می‌شوند</span>}
              />
              <div className="col">
                {data.invitations.map((entry, index) => {
                  const daysLeft = Math.max(
                    0,
                    Math.ceil((new Date(entry.expiresAt).getTime() - Date.now()) / 86_400_000),
                  );
                  return (
                    <div
                      key={entry.id}
                      className="row wrap g10"
                      style={{
                        padding: '10px 16px',
                        borderTop: index > 0 ? '1px solid #F4F4F5' : undefined,
                      }}
                    >
                      <span className="av m a7">
                        <Icon name={entry.channel === 'sms' ? 'smartphone' : 'mail'} size={14} />
                      </span>
                      <span className="col grow" style={{ minWidth: 180 }}>
                        <span className="mono t-13 tx9" dir="ltr" style={{ textAlign: 'right' }}>
                          {entry.target}
                        </span>
                        <span className="t-xs tx5">
                          {entry.roles.map(roleLabel).join('، ')} ·{' '}
                          {entry.channel === 'sms' ? 'پیامک دعوت و لینک نصب اپ' : 'ایمیل'} ·{' '}
                          {formatRelativeTime(entry.sentAt)} ·{' '}
                          {daysLeft > 0 ? `${toFaDigits(daysLeft)} روز تا انقضا` : 'منقضی'}
                        </span>
                      </span>
                      {entry.roles.map((entryRole) => (
                        <Badge key={entryRole} tone={roleTone(entryRole)}>
                          {roleLabel(entryRole)}
                        </Badge>
                      ))}
                      <AppButton
                        variant="outline"
                        size="xs"
                        onClick={() => void onInvitation(entry, 'resend')}
                      >
                        ارسال دوباره
                      </AppButton>
                      <AppButton
                        variant="ghost"
                        size="xs"
                        className="tx-err"
                        onClick={() => void onInvitation(entry, 'revoke')}
                      >
                        لغو دعوت
                      </AppButton>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}

      {adding && <AddMemberDialog project={project} onClose={() => setAdding(false)} />}
      {qr && <InviteQrDialog code={qr.code} name={qr.name} onClose={() => setQr(null)} />}
      {editing && (
        <EditRolesDialog projectId={project.id} member={editing} onClose={() => setEditing(null)} />
      )}
      {removing && (
        <RemoveMemberDialog
          projectId={project.id}
          member={removing}
          onClose={() => setRemoving(null)}
        />
      )}
    </Content>
  );
}
