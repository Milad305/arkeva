import { useMemo, useState } from 'react';
import { useBlocker } from 'react-router-dom';

import type { GrantedPermission } from '@/config/permissions';
import { ROUTES } from '@/config/routes';
import { Content } from '@/shared/components/layout/AppShell';
import { Topbar } from '@/shared/components/layout/Topbar';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { toast } from '@/shared/components/feedback/toastStore';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton, LinkButton } from '@/shared/components/ui/AppButton';
import { Card, CardHeader } from '@/shared/components/ui/Card';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { FormField } from '@/shared/components/ui/FormField';
import { Icon } from '@/shared/components/ui/Icon';
import type { MenuEntry } from '@/shared/components/ui/Menu';
import { Modal } from '@/shared/components/ui/Modal';
import { PageHead } from '@/shared/components/ui/PageHead';
import { Select } from '@/shared/components/ui/Select';
import { TextInput } from '@/shared/components/ui/TextInput';
import { useHasPermission } from '@/shared/hooks/useHasAccess';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { formatRelativeTime } from '@/shared/utils/date';
import { toFaDigits } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import {
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useGetRolesAuditQuery,
  useGetRolesQuery,
  useRolesImpactQuery,
  useSaveRolePermissionsMutation,
} from '../api/usersApi';
import { PermissionMatrix } from '../components/PermissionMatrix';
import { SCOPE_SHORT } from '../services/permissionView';
import type { RoleChange, RoleDto } from '../types';

const sameGrants = (a: GrantedPermission[], b: GrantedPermission[]) => {
  const flat = (list: GrantedPermission[]) => list.map((entry) => `${entry.code}:${entry.scope}`).sort().join('|');
  return flat(a) === flat(b);
};

/**
 * W27 — نقش‌ها و سطح دسترسی (F01 ۵.۲–۵.۴، ۵.۸). تغییر خانه‌ها در حافظه می‌ماند تا «ذخیرهٔ
 * تغییرات»؛ پیش از ذخیره «اثر روی N کاربر» و هشدار دسترسی ضروری از سرور، و دلیل اختیاری در ممیزی
 * (AC-AC-08). نقش سیستمی «بازگشت به پیش‌فرض» دارد (G17)؛ نقش سفارشی با کپی ساخته می‌شود.
 */
export default function PermissionsPage() {
  const canEdit = useHasPermission('roles.edit');
  const query = useGetRolesQuery();
  const audit = useGetRolesAuditQuery();
  const [save] = useSaveRolePermissionsMutation();
  const [removeRole] = useDeleteRoleMutation();
  const [draft, setDraft] = useState<Record<EntityId, GrantedPermission[]>>({});
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [creating, setCreating] = useState<'copy' | 'new' | null>(null);
  const [deleting, setDeleting] = useState<RoleDto | null>(null);

  const roles = useMemo(() => query.data?.roles ?? [], [query.data]);
  const changes = useMemo<RoleChange[]>(
    () => roles.filter((role) => draft[role.id] && !sameGrants(draft[role.id]!, role.grants)).map((role) => ({ roleId: role.id, grants: draft[role.id]! })),
    [roles, draft],
  );
  const impact = useRolesImpactQuery(changes, { skip: changes.length === 0 });
  const blocker = useBlocker(({ currentLocation, nextLocation }) => changes.length > 0 && !saving && currentLocation.pathname !== nextLocation.pathname);

  const grantsOf = (role: RoleDto) => draft[role.id] ?? role.grants;
  const nameOf = (id: EntityId) => roles.find((role) => role.id === id)?.name ?? '';
  const changedCodes = (change: RoleChange) => {
    const role = roles.find((entry) => entry.id === change.roleId)!;
    const before = new Map(role.grants.map((entry) => [entry.code, entry.scope]));
    const after = new Map(change.grants.map((entry) => [entry.code, entry.scope]));
    return [...new Set([...before.keys(), ...after.keys()])].filter((code) => before.get(code) !== after.get(code)).length;
  };

  const roleMenu = (role: RoleDto): MenuEntry[] => {
    if (role.kind === 'admin') return [];
    if (role.kind === 'system')
      return [
        {
          key: 'reset',
          label: 'بازگشت به پیش‌فرض',
          icon: 'rotate-ccw',
          disabled: sameGrants(grantsOf(role), role.defaults ?? []),
          disabledReason: 'همین حالا با پیش‌فرض یکی است',
          onSelect: () => setDraft((previous) => ({ ...previous, [role.id]: (role.defaults ?? []).map((entry) => ({ ...entry })) })),
        },
      ];
    return [
      {
        key: 'delete',
        label: 'حذف نقش',
        icon: 'trash-2',
        tone: 'danger',
        disabled: role.userCount > 0,
        disabledReason: 'این نقش کاربر فعال دارد',
        onSelect: () => setDeleting(role),
      },
    ];
  };

  async function commit(reason: string) {
    setSaving(true);
    try {
      for (const change of changes) await save({ change, reason: reason || null }).unwrap();
      setDraft({});
      setConfirming(false);
      toast.success(`تغییرات ${toFaDigits(changes.length)} نقش ذخیره شد؛ حداکثر تا یک دقیقه روی همهٔ پروژه‌ها اعمال می‌شود.`);
    } catch (cause) {
      toast.error(getApiErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  const summary = changes.map((change) => `${nameOf(change.roleId)}: ${toFaDigits(changedCodes(change))} کد`).join(' · ');

  return (
    <>
      <Topbar title="نقش‌ها و دسترسی‌ها" icon="shield-check" />
      <Content>
        <PageHead
          title="نقش‌ها و سطح دسترسی"
          subtitle="نقش‌های سیستمی و نقش‌های سفارشی سازمان؛ هر کاربر در هر پروژه یک یا چند نقش دارد"
          actions={
            canEdit && (
              <>
                <LinkButton variant="ghost" icon="users" to={ROUTES.users}>
                  کاربران سازمان
                </LinkButton>
                <AppButton variant="outline" icon="copy" disabled={!query.data} onClick={() => setCreating('copy')}>
                  کپی از نقش موجود
                </AppButton>
                <AppButton variant="primary" icon="plus" disabled={!query.data} onClick={() => setCreating('new')}>
                  نقش سفارشی جدید
                </AppButton>
              </>
            )
          }
        />
        <Alert tone="inf" icon="info" className="mb16">
          دسترسی‌ها در سطح پروژه اعمال می‌شوند. نقش هر کاربر در هر پروژه از «اعضای پروژه» تعیین می‌شود و تغییر این جدول روی همهٔ پروژه‌ها اثر دارد. «محدود» یعنی بخشی از کدهای ردیف یا دامنهٔ دادهٔ کوچک‌تر؛ برای دیدن کدها ردیف را باز کنید.
        </Alert>

        {query.isLoading ? (
          <SkeletonTable rows={12} />
        ) : query.isError || !query.data ? (
          <EmptyState
            inCard
            icon="server"
            title="نقش‌ها بارگذاری نشد"
            description="چند لحظهٔ دیگر دوباره امتحان کنید."
            actions={
              <AppButton size="sm" variant="primary" icon="refresh-cw" onClick={() => void query.refetch()}>
                تلاش دوباره
              </AppButton>
            }
          />
        ) : (
          <Card style={{ marginBottom: 16 }}>
            <CardHeader
              icon="shield-check"
              title="ماتریس دسترسی"
              subtitle="برای تغییر روی هر خانه بزنید؛ دسترسی مدیر سازمان قابل تغییر نیست"
              action={
                <span className="row wrap g12 t-12 tx6">
                  <span className="row g6">
                    <span className="cb on">
                      <Icon name="check" size={12} />
                    </span>
                    کامل
                  </span>
                  <span className="row g6">
                    <span className="cb part" />
                    محدود
                  </span>
                  <span className="row g6">
                    <span className="cb" />
                    بدون دسترسی
                  </span>
                  <span className="row g6">
                    <span className="pm-legend-chg" />
                    تغییر ذخیره‌نشده
                  </span>
                </span>
              }
            />
            <PermissionMatrix
              roles={roles}
              catalog={query.data.catalog}
              grantsOf={grantsOf}
              readOnly={!canEdit}
              roleMenu={roleMenu}
              onChange={(role, grants) => setDraft((previous) => ({ ...previous, [role.id]: grants }))}
            />
            {changes.length > 0 && (
              <div className="pm-savebar">
                <span className="pm-dot" style={{ background: '#E07A2C' }} />
                <span className="col" style={{ gap: 1, minWidth: 0, flex: 1 }}>
                  <span className="t-13 fw6 tx9">{`${toFaDigits(changes.length)} نقش تغییر ذخیره‌نشده دارد`}</span>
                  <span className="t-12 tx6">
                    {summary}
                    {impact.data && ` — اثر روی ${toFaDigits(impact.data.users)} کاربر`}
                  </span>
                  {impact.data?.warnings.map((warning) => (
                    <span key={warning} className="row g4 t-12 tx-wrn">
                      <Icon name="alert-triangle" size={13} />
                      {warning}
                    </span>
                  ))}
                </span>
                <AppButton variant="ghost" size="sm" onClick={() => setDraft({})}>
                  لغو تغییرات
                </AppButton>
                <AppButton variant="primary" size="sm" icon="save" onClick={() => setConfirming(true)}>
                  ذخیرهٔ تغییرات
                </AppButton>
              </div>
            )}
          </Card>
        )}

        <Card>
          <CardHeader icon="history" title="تاریخچهٔ تغییر دسترسی‌ها" subtitle="هر ذخیره با قبل و بعد و دلیل در ممیزی ثبت می‌شود" />
          {(audit.data ?? []).length === 0 ? (
            <div className="t-13 tx6" style={{ padding: '12px 16px 16px' }}>
              هنوز تغییری ثبت نشده است.
            </div>
          ) : (
            <ul className="col" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {audit.data!.map((entry) => (
                <li key={entry.id} className="col" style={{ gap: 3, padding: '10px 16px', borderTop: '1px solid #F4F4F5' }}>
                  <span className="row wrap g8 t-13">
                    <span className="fw6 tx9">{entry.roleName}</span>
                    <span className="tx5 t-12">{`${entry.byName} · ${formatRelativeTime(entry.at)}`}</span>
                  </span>
                  {entry.added.length > 0 && (
                    <span className="t-12 tx-ok">{`افزوده: ${entry.added.map((item) => `${item.code}${item.scope === 'all' ? '' : ` (${SCOPE_SHORT[item.scope]})`}`).join('، ')}`}</span>
                  )}
                  {entry.removed.length > 0 && (
                    <span className="t-12 tx-err">{`برداشته: ${entry.removed.map((item) => `${item.code}${item.scope === 'all' ? '' : ` (${SCOPE_SHORT[item.scope]})`}`).join('، ')}`}</span>
                  )}
                  {entry.reason && <span className="t-12 tx6">{`دلیل: ${entry.reason}`}</span>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Content>

      <ConfirmDialog
        isOpen={confirming}
        tone={impact.data?.warnings.length ? 'warning' : 'info'}
        icon="shield-check"
        title="ذخیرهٔ تغییر دسترسی‌ها"
        description={
          <span className="col g6">
            <span>{summary}</span>
            <span className="fw6">{impact.data ? `اثر روی ${toFaDigits(impact.data.users)} کاربر در همهٔ پروژه‌ها` : 'در حال شمارش کاربران…'}</span>
            {impact.data?.warnings.map((warning) => (
              <span key={warning} className="tx-wrn">
                {warning}
              </span>
            ))}
          </span>
        }
        reasonLabel="دلیل تغییر (اختیاری)"
        confirmLabel="ذخیرهٔ تغییرات"
        confirmIcon="save"
        loading={saving}
        onCancel={() => setConfirming(false)}
        onConfirm={(reason) => void commit(reason)}
      />
      <ConfirmDialog
        isOpen={blocker.state === 'blocked'}
        tone="warning"
        icon="alert-triangle"
        title="تغییرات ذخیره‌نشده"
        description="اگر این صفحه را ترک کنید، تغییرهای ماتریس دسترسی از بین می‌رود."
        confirmLabel="ترک صفحه"
        cancelLabel="ماندن و ذخیره"
        onCancel={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
      />
      <ConfirmDialog
        isOpen={Boolean(deleting)}
        tone="danger"
        icon="trash-2"
        title={`حذف نقش «${deleting?.name ?? ''}»`}
        description="نقش سفارشی بی‌کاربر حذف می‌شود و برنمی‌گردد."
        confirmLabel="حذف نقش"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            setDraft((previous) => {
              const next = { ...previous };
              delete next[deleting.id];
              return next;
            });
            void removeRole(deleting.id);
          }
          setDeleting(null);
        }}
      />
      {creating && <CreateRoleDialog mode={creating} roles={roles} onClose={() => setCreating(null)} />}
    </>
  );
}

/** نقش سفارشی (OD-09): بدون کپی هیچ دسترسی ندارد. */
function CreateRoleDialog({ mode, roles, onClose }: { mode: 'copy' | 'new'; roles: RoleDto[]; onClose: () => void }) {
  const [name, setName] = useState('');
  const [source, setSource] = useState<EntityId | null>(mode === 'copy' ? (roles.find((role) => role.systemKey === 'reviewer')?.id ?? null) : null);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [create, state] = useCreateRoleMutation();

  async function submit() {
    setTouched(true);
    setError(null);
    if (!name.trim() || (mode === 'copy' && !source)) return;
    try {
      await create({ name, copyFromId: mode === 'copy' ? source : null }).unwrap();
      onClose();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="sm"
      title={mode === 'copy' ? 'کپی از نقش موجود' : 'نقش سفارشی جدید'}
      description={mode === 'copy' ? 'نقش تازه همهٔ دسترسی‌های نقش مبدأ را با همان دامنه می‌گیرد؛ بعد در ماتریس تنظیمش کنید.' : 'نقش تازه بدون هیچ دسترسی ساخته می‌شود؛ دسترسی‌ها را در ماتریس روشن کنید.'}
      footer={
        <>
          <AppButton variant="ghost" onClick={onClose}>
            انصراف
          </AppButton>
          <AppButton variant="primary" icon="plus" loading={state.isLoading} onClick={() => void submit()}>
            ساخت نقش
          </AppButton>
        </>
      }
    >
      <div className="col g12">
        <FormField label="نام نقش" required error={touched && !name.trim() ? 'نام نقش را بنویسید' : undefined}>
          <TextInput value={name} onChange={(event) => setName(event.target.value)} placeholder="مثلاً کنترل پروژه" />
        </FormField>
        {mode === 'copy' && (
          <FormField label="نقش مبدأ" required>
            <Select label="نقش مبدأ" options={roles.map((role) => ({ value: role.id, label: role.name }))} value={source} onChange={setSource} width="100%" />
          </FormField>
        )}
        <span className="hint">نقش سفارشی فعلاً فقط در ماتریس تعریف می‌شود؛ تخصیص آن به اعضای پروژه در فاز بعد است.</span>
        {error && (
          <Alert tone="err" icon="alert-octagon">
            {error}
          </Alert>
        )}
      </div>
    </Modal>
  );
}
