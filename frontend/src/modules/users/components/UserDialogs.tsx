import { useState } from 'react';

import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { toast } from '@/shared/components/feedback/toastStore';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { FormField } from '@/shared/components/ui/FormField';
import { Modal } from '@/shared/components/ui/Modal';
import { OptionCard } from '@/shared/components/ui/SelectionControls';
import { Select } from '@/shared/components/ui/Select';
import { TextInput } from '@/shared/components/ui/TextInput';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { toFaDigits } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import { ASSIGNABLE_ROLES, roleLabel } from '@/modules/team/services/teamView';
import type { AssignableRole } from '@/modules/team/types';
import { InviteQrDialog } from '@/modules/team/components/InviteQrDialog';
import {
  useBulkUsersMutation,
  useDisableUserMutation,
  useGetDisableImpactQuery,
  useInviteUserMutation,
} from '../api/usersApi';
import type { BulkResultDto, OrgUsersDto } from '../types';

type ProjectOption = OrgUsersDto['projects'][number];
/** پروژهٔ بسته یا بایگانی عضو تازه نمی‌گیرد. */
const openProjects = (projects: ProjectOption[]) => projects.filter((project) => project.status !== 'archived' && project.status !== 'completed');

function RolePicker({ roles, onToggle }: { roles: AssignableRole[]; onToggle: (role: AssignableRole) => void }) {
  return (
    <div className="grid c2 rsp" style={{ gap: 8 }}>
      {ASSIGNABLE_ROLES.map(({ role, description }) => (
        <OptionCard key={role} control="checkbox" title={roleLabel(role)} description={description} selected={roles.includes(role)} onSelect={() => onToggle(role)} />
      ))}
    </div>
  );
}

const toggleIn = (list: AssignableRole[], role: AssignableRole) => (list.includes(role) ? list.filter((entry) => entry !== role) : [...list, role]);

function ProjectSelect({ projects, value, onChange }: { projects: ProjectOption[]; value: EntityId | null; onChange: (id: EntityId) => void }) {
  return (
    <Select
      label="پروژه"
      placeholder="یک پروژه انتخاب کنید"
      options={openProjects(projects).map((project) => ({ value: project.id, label: `${project.name} · ${project.code}`, text: project.name }))}
      value={value}
      onChange={onChange}
      width="100%"
    />
  );
}

/**
 * دعوت کاربر (۵.۶): موبایل همیشه لازم و ایمیل اختیاری (تصمیم 1405/08/22)؛ دعوت‌شده با «فراموشی رمز» همین
 * شماره وارد می‌شود. ۷ روز، سهم مجوز می‌گیرد؛ نقش در یک پروژه.
 */
export function InviteUserDialog({ data, onClose }: { data: OrgUsersDto; onClose: () => void }) {
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [projectId, setProjectId] = useState<EntityId | null>(null);
  const [roles, setRoles] = useState<AssignableRole[]>([]);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, state] = useInviteUserMutation();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const full = data.seats.used >= data.seats.limit;
  const errors = {
    fullName: fullName.trim() ? undefined : 'نام را بنویسید',
    mobile: mobile.trim() ? undefined : 'شمارهٔ همراه را بنویسید',
    project: projectId ? undefined : 'پروژه را انتخاب کنید',
    roles: roles.length > 0 ? undefined : 'دست‌کم یک نقش انتخاب کنید',
  };
  const valid = !Object.values(errors).some(Boolean);

  async function submit() {
    setTouched(true);
    setError(null);
    if (!valid || !projectId) return;
    try {
      const result = await invite({ fullName, mobile, email: email.trim() || null, projectId, roles }).unwrap();
      // QR دعوت اپ کارگاه (OD-20)؛ کد فقط همین بار
      if (result.inviteCode) setInviteCode(result.inviteCode);
      else onClose();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    }
  }

  if (inviteCode) return <InviteQrDialog code={inviteCode} name={fullName.trim()} onClose={onClose} />;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="دعوت کاربر"
      description="نقش هر کاربر در هر پروژه جداگانه است؛ دعوت با نقش در یک پروژه فرستاده می‌شود و ۷ روز اعتبار دارد."
      footer={
        <>
          <AppButton variant="ghost" onClick={onClose}>
            انصراف
          </AppButton>
          <AppButton variant="primary" icon="send" loading={state.isLoading} disabled={full} onClick={() => void submit()}>
            فرستادن دعوت
          </AppButton>
        </>
      }
    >
      <div className="col g12">
        <Alert tone={full ? 'err' : 'inf'} icon={full ? 'alert-octagon' : 'users'}>
          {full
            ? `ظرفیت پر است: ${toFaDigits(data.seats.used)} از ${toFaDigits(data.seats.limit)} مجوز استفاده شده. یک کاربر را غیرفعال یا دعوتی را لغو کنید.`
            : `${toFaDigits(data.seats.limit - data.seats.used)} مجوز آزاد مانده؛ دعوت‌شده تا پذیرفتن یا لغو یک مجوز می‌گیرد.`}
        </Alert>
        <FormField label="نام و نام خانوادگی" required error={touched ? errors.fullName : undefined}>
          <TextInput value={fullName} onChange={(event) => setFullName(event.target.value)} />
        </FormField>
        <FormField
          label="شمارهٔ همراه"
          required
          error={touched ? errors.mobile : undefined}
          hint="مثل 09121234567. دعوت پیامک می‌شود و ورود با «فراموشی رمز» همین شماره است."
        >
          <TextInput ltr value={mobile} onChange={(event) => setMobile(event.target.value)} inputMode="tel" />
        </FormField>
        <FormField label="ایمیل" hint="اختیاری؛ برای اعلان‌های ایمیلی.">
          <TextInput ltr value={email} onChange={(event) => setEmail(event.target.value)} inputMode="email" />
        </FormField>
        <FormField label="پروژه" required error={touched ? errors.project : undefined}>
          <ProjectSelect projects={data.projects} value={projectId} onChange={setProjectId} />
        </FormField>
        <div className="fg">
          <span className="lbl">نقش در این پروژه</span>
          <RolePicker roles={roles} onToggle={(role) => setRoles((previous) => toggleIn(previous, role))} />
          {touched && errors.roles && <span className="hint err">{errors.roles}</span>}
        </div>
        {error && (
          <Alert tone="err" icon="alert-octagon">
            {error}
          </Alert>
        )}
      </div>
    </Modal>
  );
}

/** تغییر نقش یا افزودن به پروژه برای چند کاربر — همیشه در یک پروژهٔ انتخابی (تصمیم 1405/08/19). */
export function ProjectRolesDialog({
  mode,
  rowIds,
  projects,
  onClose,
}: {
  mode: 'set_roles' | 'add_to_project';
  rowIds: string[];
  projects: ProjectOption[];
  onClose: (done: boolean) => void;
}) {
  const [projectId, setProjectId] = useState<EntityId | null>(null);
  const [roles, setRoles] = useState<AssignableRole[]>([]);
  const [result, setResult] = useState<BulkResultDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bulk, state] = useBulkUsersMutation();
  const setting = mode === 'set_roles';

  async function submit() {
    if (!projectId || roles.length === 0) return;
    setError(null);
    try {
      const response = await bulk({ action: mode, rowIds, projectId, roles }).unwrap();
      if (response.done > 0) toast.success(`${toFaDigits(response.done)} کاربر ${setting ? 'نقش تازه گرفت' : 'به پروژه افزوده شد'}.`);
      if (response.skipped.length === 0) onClose(true);
      else setResult(response);
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    }
  }

  return (
    <Modal
      isOpen
      onClose={() => onClose(Boolean(result))}
      title={setting ? 'تغییر نقش' : 'افزودن به پروژه'}
      description={`${toFaDigits(rowIds.length)} کاربر انتخاب شده. ${setting ? 'نقش‌ها فقط در پروژهٔ انتخابی جایگزین می‌شوند؛ کسی که عضو آن نیست کنار می‌ماند.' : 'عضویت در پروژهٔ دیگر مجوز تازه نمی‌گیرد.'}`}
      footer={
        result ? (
          <AppButton variant="primary" onClick={() => onClose(true)}>
            بستن
          </AppButton>
        ) : (
          <>
            <AppButton variant="ghost" onClick={() => onClose(false)}>
              انصراف
            </AppButton>
            <AppButton variant="primary" icon={setting ? 'user-cog' : 'folder-plus'} loading={state.isLoading} disabled={!projectId || roles.length === 0} onClick={() => void submit()}>
              {setting ? 'جایگزینی نقش‌ها' : 'افزودن به پروژه'}
            </AppButton>
          </>
        )
      }
    >
      {result ? (
        <div className="col g8">
          <Alert tone="wrn" icon="alert-triangle">
            {`${toFaDigits(result.done)} کاربر انجام شد و ${toFaDigits(result.skipped.length)} کاربر کنار ماند:`}
          </Alert>
          <ul className="col g4 t-13" style={{ margin: 0, paddingInlineStart: 18 }}>
            {result.skipped.map((entry) => (
              <li key={entry.name}>
                <span className="fw6">{entry.name}</span> — <span className="tx6">{entry.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="col g12">
          <FormField label="پروژه" required>
            <ProjectSelect projects={projects} value={projectId} onChange={setProjectId} />
          </FormField>
          <div className="fg">
            <span className="lbl">{setting ? 'نقش‌های تازه در این پروژه' : 'نقش در این پروژه'}</span>
            <RolePicker roles={roles} onToggle={(role) => setRoles((previous) => toggleIn(previous, role))} />
            <span className="hint">مدیر پروژه نقشش را نگه می‌دارد و فقط با «انتقال مدیریت» عوض می‌شود.</span>
          </div>
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

/**
 * غیرفعال‌سازی (۵.۶): توکن‌ها باطل و کاربر در همهٔ پروژه‌ها مثل «حذف عضو» (F07 ۴.۳) — پیامد
 * هر پروژه از سرور، با «انتقال فعالیت‌ها به…» برای سرپرست.
 */
export function DisableUserDialog({ userId, onClose }: { userId: EntityId; onClose: () => void }) {
  const impact = useGetDisableImpactQuery(userId, { refetchOnMountOrArgChange: true });
  const [transfers, setTransfers] = useState<Record<EntityId, EntityId | null>>({});
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [disable, state] = useDisableUserMutation();
  const data = impact.data;
  const blocked = data?.blockedReason ?? data?.projects.find((entry) => entry.blockedReason)?.blockedReason ?? null;

  async function submit() {
    setError(null);
    try {
      await disable({ userId, transfers, reason }).unwrap();
      onClose();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={data ? `غیرفعال‌کردن ${data.fullName}` : 'غیرفعال‌کردن کاربر'}
      description="ورودهای فعال باطل می‌شود، مجوزش آزاد می‌شود و از همهٔ پروژه‌ها خارج می‌شود. فعال‌سازی دوباره عضویت‌ها را برنمی‌گرداند."
      footer={
        <>
          <AppButton variant="ghost" onClick={onClose}>
            انصراف
          </AppButton>
          <AppButton variant="danger" icon="user-x" loading={state.isLoading} disabled={!data || Boolean(blocked)} onClick={() => void submit()}>
            غیرفعال‌کردن
          </AppButton>
        </>
      }
    >
      {impact.isLoading || !data ? (
        <SkeletonTable rows={3} />
      ) : (
        <div className="col g12">
          {blocked && (
            <Alert tone="err" icon="alert-octagon">
              {blocked}
            </Alert>
          )}
          {data.projects.length === 0 ? (
            <span className="t-13 tx6">عضو هیچ پروژه‌ای نیست.</span>
          ) : (
            data.projects.map((entry) => (
              <div key={entry.projectId} className="box col g6" style={{ padding: 12 }}>
                <span className="row between g8">
                  <span className="fw6 t-13">{entry.projectName}</span>
                  <span className="t-12 tx6">{entry.roles.map(roleLabel).join('، ')}</span>
                </span>
                {entry.blockedReason ? (
                  <span className="t-12 tx-err">{entry.blockedReason}</span>
                ) : (
                  <span className="t-12 tx6">
                    {[
                      entry.assignedLeaves > 0 && `${toFaDigits(entry.assignedLeaves)} فعالیت تخصیص‌یافته`,
                      entry.inFlightItems > 0 && `${toFaDigits(entry.inFlightItems)} گزارش در جریان`,
                      entry.routes.length > 0 && `حوزه‌های بی‌تأییدکننده: ${entry.routes.join('، ')}`,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'پیامدی ندارد'}
                  </span>
                )}
                {entry.assignedLeaves > 0 && !entry.blockedReason && (
                  <Select
                    size="sm"
                    label="انتقال فعالیت‌ها به"
                    options={[
                      { value: '', label: 'بی‌سرپرست بماند' },
                      ...entry.transferCandidates.map((candidate) => ({ value: candidate.userId, label: `${candidate.fullName} · ${toFaDigits(candidate.assignedCount)} فعالیت`, text: candidate.fullName })),
                    ]}
                    value={transfers[entry.projectId] ?? ''}
                    onChange={(value) => setTransfers((previous) => ({ ...previous, [entry.projectId]: value || null }))}
                    width="100%"
                  />
                )}
              </div>
            ))
          )}
          <FormField label="دلیل" optional hint="در لاگ ممیزی ثبت می‌شود.">
            <TextInput value={reason} onChange={(event) => setReason(event.target.value)} />
          </FormField>
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
