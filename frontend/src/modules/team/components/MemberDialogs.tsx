import { useState } from 'react';

import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Modal } from '@/shared/components/ui/Modal';
import { OptionCard, Radio } from '@/shared/components/ui/SelectionControls';
import { Select } from '@/shared/components/ui/Select';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { toFaDigits } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import {
  useGetRemovalImpactQuery,
  useRemoveMemberMutation,
  useUpdateMemberRolesMutation,
} from '../api/teamApi';
import { ASSIGNABLE_ROLES, roleLabel } from '../services/teamView';
import type { AssignableRole, MemberDto } from '../types';

/** تغییر نقش (۴.۲) — مدیر پروژه همیشه نقشش را نگه می‌دارد. */
export function EditRolesDialog({
  projectId,
  member,
  onClose,
}: {
  projectId: EntityId;
  member: MemberDto;
  onClose: () => void;
}) {
  const [roles, setRoles] = useState<AssignableRole[]>(
    member.roles.filter(
      (role): role is AssignableRole => role !== 'project_manager' && role !== 'org_admin',
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [update, state] = useUpdateMemberRolesMutation();
  const toggle = (role: AssignableRole) =>
    setRoles((previous) =>
      previous.includes(role) ? previous.filter((entry) => entry !== role) : [...previous, role],
    );

  async function submit() {
    setError(null);
    try {
      await update({ projectId, userId: member.userId, roles }).unwrap();
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
      title={`نقش‌های ${member.fullName}`}
      description="افزودن و حذف نقش در ممیزی ثبت می‌شود."
      footer={
        <>
          <AppButton variant="ghost" onClick={onClose}>
            انصراف
          </AppButton>
          <AppButton
            variant="primary"
            icon="check"
            loading={state.isLoading}
            disabled={roles.length === 0 && !member.isManager}
            onClick={() => void submit()}
          >
            ذخیرهٔ نقش‌ها
          </AppButton>
        </>
      }
    >
      <div className="col g12">
        {member.isManager && (
          <Alert tone="inf" icon="shield">
            {member.fullName} مدیر این پروژه است؛ این نقش با «انتقال مدیریت» عوض می‌شود.
          </Alert>
        )}
        <div className="grid c2" style={{ gap: 8 }}>
          {ASSIGNABLE_ROLES.map(({ role, description }) => (
            <OptionCard
              key={role}
              control="checkbox"
              title={roleLabel(role)}
              description={description}
              selected={roles.includes(role)}
              onSelect={() => toggle(role)}
            />
          ))}
        </div>
        <span className="hint">
          حذف نقش سرپرست از کسی که فعالیت دارد، نیازمند انتقال فعالیت‌هاست؛ حذف نقش ناظر حوزه‌اش را
          بی‌تأییدکننده می‌کند (۴.۲).
        </span>
        {error && (
          <Alert tone="err" icon="alert-octagon">
            {error}
          </Alert>
        )}
      </div>
    </Modal>
  );
}

/**
 * حذف عضو (۴.۳): پیامدها پیش از تأیید از سرور، و برای سرپرست «انتقال به …» یا «بی‌سرپرست
 * ماندن». حذف مدیر پروژه مسدود است (AC-TM-05).
 */
export function RemoveMemberDialog({
  projectId,
  member,
  onClose,
}: {
  projectId: EntityId;
  member: MemberDto;
  onClose: () => void;
}) {
  const impact = useGetRemovalImpactQuery({ projectId, userId: member.userId });
  const [mode, setMode] = useState<'transfer' | 'unassign'>('transfer');
  const [transferTo, setTransferTo] = useState<EntityId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remove, state] = useRemoveMemberMutation();
  const data = impact.data;
  const needsChoice = Boolean(data && data.assignedLeaves > 0);
  const target =
    mode === 'transfer' ? (transferTo ?? data?.transferCandidates[0]?.userId ?? null) : null;

  async function submit() {
    setError(null);
    try {
      await remove({
        projectId,
        userId: member.userId,
        transferTo: needsChoice ? target : null,
      }).unwrap();
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
      title={`حذف ${member.fullName} از پروژه`}
      description="عضویت حذف نرم است؛ تاریخچهٔ گزارش‌ها و تأییدها به نام او می‌ماند."
      footer={
        <>
          <AppButton variant="ghost" onClick={onClose}>
            انصراف
          </AppButton>
          <AppButton
            variant="danger"
            icon="user-x"
            loading={state.isLoading}
            disabled={
              !data ||
              Boolean(data.blockedReason) ||
              (needsChoice && mode === 'transfer' && !target)
            }
            onClick={() => void submit()}
          >
            حذف عضو
          </AppButton>
        </>
      }
    >
      {!data ? (
        <SkeletonTable rows={3} />
      ) : data.blockedReason ? (
        <Alert tone="err" icon="lock">
          {data.blockedReason}
        </Alert>
      ) : (
        <div className="col g12">
          <ul className="col g6 t-13" style={{ margin: 0, paddingInlineStart: 18 }}>
            {data.assignedLeaves > 0 && (
              <li>{toFaDigits(data.assignedLeaves)} فعالیت به او سپرده شده است.</li>
            )}
            {data.routes.map((route) => (
              <li key={route.id}>
                تأییدکنندهٔ حوزهٔ «{route.areaName}» است؛ حوزه بی‌تأییدکننده می‌شود و آیتم‌های
                منتظرش به تأییدکنندهٔ جایگزین می‌روند (AL-STR-06).
              </li>
            ))}
            {data.isFallbackApprover && (
              <li>تأییدکنندهٔ جایگزین پروژه است؛ جایگزین به مدیر پروژه برمی‌گردد.</li>
            )}
            {data.inFlightItems > 0 && (
              <li>
                {toFaDigits(data.inFlightItems)} آیتم ارسال‌شده در گردش دارد که معتبر می‌مانند؛ فقط
                آیتم‌هایی که پس از حذف برسند «نیاز به تعیین تکلیف» می‌شوند (D10).
              </li>
            )}
            {data.assignedLeaves === 0 && data.routes.length === 0 && !data.isFallbackApprover && (
              <li>پیامد دیگری ندارد.</li>
            )}
          </ul>
          {needsChoice && (
            <div className="col g8" role="radiogroup" aria-label="فعالیت‌های سپرده‌شده">
              <Radio
                name="removal"
                checked={mode === 'transfer'}
                onChange={() => setMode('transfer')}
                label="انتقال فعالیت‌ها به…"
                disabled={data.transferCandidates.length === 0}
              />
              {mode === 'transfer' && data.transferCandidates.length > 0 && (
                <Select
                  size="sm"
                  label="سرپرست مقصد"
                  options={data.transferCandidates.map((candidate) => ({
                    value: candidate.userId,
                    label: `${candidate.fullName} · ${toFaDigits(candidate.assignedCount)} فعالیت`,
                  }))}
                  value={target}
                  onChange={setTransferTo}
                />
              )}
              <Radio
                name="removal"
                checked={mode === 'unassign'}
                onChange={() => setMode('unassign')}
                label="بی‌سرپرست ماندن (در اپ به کسی نمی‌رسند، AL-STR-04)"
              />
            </div>
          )}
          {error && (
            <Alert tone="err" icon="alert-octagon">
              {error}
            </Alert>
          )}
        </div>
      )}
    </Modal>
  );
}
