import { useMemo, useState } from 'react';

import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Avatar } from '@/shared/components/ui/Avatar';
import { Icon } from '@/shared/components/ui/Icon';
import { Modal } from '@/shared/components/ui/Modal';
import { Checkbox, OptionCard } from '@/shared/components/ui/SelectionControls';
import { SegmentedControl } from '@/shared/components/ui/Tabs';
import { TextInput } from '@/shared/components/ui/TextInput';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { toFaDigits } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import type { ProjectDetailDto } from '@/modules/projects/types';
import { useGetWbsTreeQuery } from '@/modules/wbs/api/wbsApi';
import { useAddMemberMutation, useSearchProjectCandidatesQuery } from '../api/teamApi';
import { ASSIGNABLE_ROLES, roleLabel } from '../services/teamView';
import { InviteQrDialog } from './InviteQrDialog';
import type { AssignableRole, OrgUserDto } from '../types';

export interface AddMemberDialogProps {
  project: ProjectDetailDto;
  onClose: () => void;
}

const maskMobile = (mobile: string) => `${mobile.slice(0, 4)} ••• ${mobile.slice(-4)}`;

/**
 * W42 — افزودن عضو (team-assignment.md ۴.۱): کاربر موجود سازمان (عضویت فوری) یا دعوت فرد
 * تازه با پیامک یا ایمیل؛ یک یا چند نقش (مدیر پروژه نه — تصمیم 1405/08/15)؛ برای ناظر
 * «حوزهٔ مسئولیت» که ApprovalRoute را می‌سازد (۶)؛ پیامک نصب اپ برای سرپرست.
 */
export function AddMemberDialog({ project, onClose }: AddMemberDialogProps) {
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<OrgUserDto | null>(null);
  const [inviting, setInviting] = useState(false);
  const [channel, setChannel] = useState<'sms' | 'email'>('sms');
  const [target, setTarget] = useState('');
  /** نام فرد تازه — سرور برای دعوت لازم دارد (team-members.add). */
  const [fullName, setFullName] = useState('');
  const [roles, setRoles] = useState<AssignableRole[]>(['supervisor']);
  const [areaName, setAreaName] = useState('');
  const [areaRoots, setAreaRoots] = useState<Set<EntityId>>(() => new Set());
  const [sendSms, setSendSms] = useState(true);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** کد دعوت پس از فرستادن دعوت: QR برای اسکن سرپرست در کارگاه (OD-20). */
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const users = useSearchProjectCandidatesQuery({ projectId: project.id, search }, { skip: inviting });
  const tree = useGetWbsTreeQuery(project.id, { skip: !roles.includes('reviewer') });
  const [add, addState] = useAddMemberMutation();

  // ریشه‌های حوزه: آیتم‌های والد دو سطح اول
  const areaOptions = useMemo(
    () =>
      (tree.data?.items ?? []).filter((item) => !item.isLeaf && item.code.split('.').length <= 3),
    [tree.data],
  );

  const toggleRole = (role: AssignableRole) =>
    setRoles((previous) =>
      previous.includes(role) ? previous.filter((entry) => entry !== role) : [...previous, role],
    );
  const toggleRoot = (id: EntityId) =>
    setAreaRoots((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const reviewer = roles.includes('reviewer');
  const errors = {
    who:
      !picked && !(inviting && target.trim())
        ? 'کاربری انتخاب کنید یا شماره/ایمیل فرد تازه را بنویسید.'
        : null,
    name: inviting && !fullName.trim() ? 'نام فرد دعوت‌شده را بنویسید.' : null,
    roles: roles.length === 0 ? 'دست‌کم یک نقش انتخاب کنید.' : null,
    area:
      reviewer && picked && areaRoots.size === 0
        ? 'برای ناظر دست‌کم یک بخش WBS انتخاب کنید.'
        : null,
  };

  async function submit() {
    setTouched(true);
    setError(null);
    if (errors.who || errors.name || errors.roles || errors.area) return;
    try {
      const result = await add({
        projectId: project.id,
        userId: inviting ? null : (picked?.userId ?? null),
        invite: inviting ? { channel, target: target.trim(), fullName: fullName.trim() } : null,
        roles,
        area:
          reviewer && !inviting
            ? {
                name:
                  areaName.trim() ||
                  areaOptions
                    .filter((item) => areaRoots.has(item.id))
                    .map((item) => item.title)
                    .join(' و '),
                rootIds: [...areaRoots],
              }
            : null,
        sendAppSms: sendSms,
      }).unwrap();
      if (result.inviteCode) setInviteCode(result.inviteCode);
      else onClose();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    }
  }

  const smsTarget = inviting ? (channel === 'sms' ? target : null) : picked?.mobile;

  if (inviteCode) return <InviteQrDialog code={inviteCode} name={fullName.trim() || null} onClose={onClose} />;

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="sm"
      title="افزودن عضو"
      description={`به ${project.name}`}
      footer={
        <>
          <AppButton variant="ghost" onClick={onClose}>
            انصراف
          </AppButton>
          <AppButton
            variant="primary"
            icon={inviting ? 'send' : 'user-plus'}
            loading={addState.isLoading}
            onClick={() => void submit()}
          >
            {inviting ? 'فرستادن دعوت' : 'افزودن به پروژه'}
          </AppButton>
        </>
      }
    >
      <div className="col g14">
        <div className="fg">
          <span className="lbl">کاربر</span>
          {inviting ? (
            <div className="col g8">
              <SegmentedControl
                fill
                activeKey={channel}
                items={[
                  { key: 'sms', label: 'شمارهٔ همراه', icon: 'smartphone' },
                  { key: 'email', label: 'ایمیل', icon: 'mail' },
                ]}
                onChange={(key) => setChannel(key as 'sms' | 'email')}
              />
              <TextInput
                aria-label="نام و نام خانوادگی فرد تازه"
                placeholder="نام و نام خانوادگی"
                value={fullName}
                invalid={touched && Boolean(errors.name)}
                onChange={(event) => setFullName(event.target.value)}
              />
              {touched && errors.name && <span className="hint err">{errors.name}</span>}
              <TextInput
                ltr
                aria-label={channel === 'sms' ? 'شمارهٔ همراه فرد تازه' : 'ایمیل فرد تازه'}
                placeholder={channel === 'sms' ? '09121234567' : 'name@company.ir'}
                value={target}
                invalid={touched && Boolean(errors.who)}
                onChange={(event) => setTarget(event.target.value)}
              />
              <span className="hint">دعوت ۷ روز معتبر است؛ عضویت با پذیرش دعوت ساخته می‌شود.</span>
              <button
                type="button"
                className="link t-12"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => setInviting(false)}
              >
                بازگشت به جستجوی کاربران سازمان
              </button>
            </div>
          ) : (
            <>
              <TextInput
                icon="search"
                aria-label="جستجوی نام یا شماره"
                placeholder="نام یا شمارهٔ همراه…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                invalid={touched && Boolean(errors.who)}
              />
              <div
                className="col"
                style={{ border: '1px solid #E4E4E7', borderRadius: 10, overflow: 'hidden' }}
                role="listbox"
                aria-label="کاربران سازمان"
              >
                {(users.data ?? []).map((user) => {
                  const selected = picked?.userId === user.userId;
                  return (
                    <button
                      key={user.userId}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      disabled={user.alreadyMember}
                      className="row g10"
                      style={{
                        padding: '9px 12px',
                        background: selected ? '#E5EBF3' : undefined,
                        borderTop: '1px solid #F4F4F5',
                        textAlign: 'start',
                        opacity: user.alreadyMember ? 0.55 : 1,
                      }}
                      onClick={() => setPicked(user)}
                    >
                      <Avatar name={user.fullName} tone={user.avatarTone} size="m" />
                      <span className="col grow" style={{ gap: 1 }}>
                        <span className={`t-13 ${selected ? 'fw6' : 'fw5'} tx9`}>
                          {user.fullName}
                        </span>
                        <span className="t-xs tx5">
                          {user.alreadyMember ? 'از پیش عضو این پروژه' : (user.note ?? '')}
                        </span>
                      </span>
                      {selected && <Icon name="check" size={16} className="tx-pri" />}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="row g10"
                  style={{
                    padding: '9px 12px',
                    borderTop: '1px solid #F4F4F5',
                    textAlign: 'start',
                  }}
                  onClick={() => {
                    setInviting(true);
                    setPicked(null);
                  }}
                >
                  <span
                    className="av m"
                    style={{
                      background: '#FFFFFF',
                      border: '1.5px dashed #A1A1AA',
                      color: '#71717A',
                    }}
                  >
                    <Icon name="mail-plus" size={14} />
                  </span>
                  <span className="col grow" style={{ gap: 1 }}>
                    <span className="t-13 fw5 tx9">دعوت فرد جدید</span>
                    <span className="t-xs tx5">با ایمیل یا شمارهٔ همراه</span>
                  </span>
                </button>
              </div>
            </>
          )}
          {touched && errors.who && <span className="hint err">{errors.who}</span>}
        </div>

        <div className="fg">
          <span className="lbl">نقش در این پروژه</span>
          <div className="grid c2" style={{ gap: 8 }}>
            {ASSIGNABLE_ROLES.map(({ role, description }) => (
              <OptionCard
                key={role}
                control="checkbox"
                title={roleLabel(role)}
                description={description}
                selected={roles.includes(role)}
                onSelect={() => toggleRole(role)}
              />
            ))}
          </div>
          <span className="hint">مدیر پروژه از «انتقال مدیریت» در سربرگ پروژه عوض می‌شود.</span>
          {touched && errors.roles && <span className="hint err">{errors.roles}</span>}
        </div>

        {reviewer && !inviting && (
          <div className="fg">
            <span className="lbl">حوزهٔ مسئولیت</span>
            <div className="box col g4" style={{ maxHeight: 180, overflowY: 'auto', padding: 6 }}>
              {areaOptions.map((item) => (
                <Checkbox
                  key={item.id}
                  checked={areaRoots.has(item.id)}
                  onChange={() => toggleRoot(item.id)}
                  label={
                    <span className="row g6">
                      <span className="mono t-12 tx5" dir="ltr">
                        {item.code}
                      </span>
                      {item.title}
                    </span>
                  }
                />
              ))}
            </div>
            <TextInput
              size="sm"
              aria-label="نام حوزه"
              placeholder="نام حوزه (اختیاری) — مثلاً «تأسیسات برقی و مکانیکی»"
              value={areaName}
              onChange={(event) => setAreaName(event.target.value)}
            />
            <span className="hint">
              گزارش‌های این بخش‌ها برای تأیید مرحلهٔ اول به این ناظر می‌رسد؛ اگر بخشی حوزهٔ دیگری
              داشت، به این حوزه منتقل می‌شود.
            </span>
            {touched && errors.area && <span className="hint err">{errors.area}</span>}
          </div>
        )}

        {roles.includes('supervisor') && (
          <Checkbox
            checked={sendSms}
            onChange={(event) => setSendSms(event.target.checked)}
            label={
              <span className="col" style={{ gap: 1 }}>
                <span>ارسال پیامک نصب اپلیکیشن اندروید</span>
                <span className="t-xs tx5">
                  {smsTarget
                    ? `پیوند دانلود و کد ورود به ${toFaDigits(maskMobile(smsTarget))}`
                    : 'پیوند دانلود و کد ورود'}
                </span>
              </span>
            }
          />
        )}

        {error && (
          <Alert tone="err" icon="alert-octagon">
            {error}
          </Alert>
        )}
      </div>
    </Modal>
  );
}
