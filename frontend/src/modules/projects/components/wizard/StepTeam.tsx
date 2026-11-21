import { useState } from 'react';

import type { SystemRole } from '@/config/constants';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Avatar } from '@/shared/components/ui/Avatar';
import { Badge } from '@/shared/components/ui/Badge';
import { Chip } from '@/shared/components/ui/Chip';
import { IconButton } from '@/shared/components/ui/IconButton';
import { Select } from '@/shared/components/ui/Select';
import { TextInput } from '@/shared/components/ui/TextInput';
import { toFaDigits } from '@/shared/utils/num';
import { ASSIGNABLE_ROLES, roleLabel } from '@/modules/team/services/teamView';
import { useCheckWizardTeamQuery, useSearchOrgUsersQuery } from '../../api/wizardApi';
import type { OrgDirectoryUserDto, ProjectWizardDraft, WizardMember, WizardOptionsDto } from '../../types/wizard';

type Team = ProjectWizardDraft['team'];

const ROLE_COLOR = Object.fromEntries(ASSIGNABLE_ROLES.map((entry) => [entry.role, entry.color])) as Record<string, string>;
const isContact = (text: string) => /^09\d{9}$/.test(text.replace(/[\s-]/g, '')) || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text.trim());

function UserSearch({ placeholder, exclude, onPick, onInvite }: { placeholder: string; exclude: Set<string>; onPick: (user: OrgDirectoryUserDto) => void; onInvite?: (target: string) => void }) {
  const [term, setTerm] = useState('');
  const results = useSearchOrgUsersQuery(term, { skip: term.trim().length < 2 });
  const list = (results.data ?? []).filter((user) => !exclude.has(user.userId));
  const contact = term.trim();
  return (
    <div className="col g6">
      <TextInput icon="search" value={term} onChange={(event) => setTerm(event.target.value)} placeholder={placeholder} aria-label={placeholder} />
      {term.trim().length >= 2 && (
        <div className="col" style={{ border: '1px solid #E4E4E7', borderRadius: 10, overflow: 'hidden' }}>
          {list.map((user) => (
            <button
              key={user.userId}
              type="button"
              className="row g10"
              style={{ padding: '8px 12px', borderBottom: '1px solid #F4F4F5', textAlign: 'start', width: '100%' }}
              onClick={() => {
                onPick(user);
                setTerm('');
              }}
            >
              <Avatar name={user.fullName} tone={user.avatarTone} size="m" />
              <span className="col grow" style={{ minWidth: 0 }}>
                <span className="t-13 fw5 tx9">{user.fullName}</span>
                <span className="t-12 tx5 trunc">
                  <span dir="ltr">{user.contact}</span> · {user.note}
                </span>
              </span>
            </button>
          ))}
          {onInvite && isContact(contact) && (
            <button
              type="button"
              className="row g10"
              style={{ padding: '8px 12px', textAlign: 'start', width: '100%', background: '#FAFAFA' }}
              onClick={() => {
                onInvite(contact.replace(/[\s-]/g, ''));
                setTerm('');
              }}
            >
              <span className="av m a7">+</span>
              <span className="t-13 tx8">
                دعوت <span dir="ltr">{contact}</span> {contact.includes('@') ? 'با ایمیل' : 'با پیامک'} (پس از ساخت پروژه)
              </span>
            </button>
          )}
          {list.length === 0 && !(onInvite && isContact(contact)) && <span className="t-12 tx5" style={{ padding: '8px 12px' }}>کاربری پیدا نشد؛ برای دعوت، شمارهٔ همراه یا ایمیل کامل را بنویسید.</span>}
        </div>
      )}
    </div>
  );
}

/** W48 — تیم (F02 ۵.۳): مدیر پروژه (الزامی)، اعضای اولیه، ترکیب و هشدار ناظر از سرور. */
export function StepTeam({ draft, onChange, options, showErrors }: { draft: ProjectWizardDraft; onChange: (next: Team) => void; options: WizardOptionsDto; showErrors: boolean }) {
  const team = draft.team;
  const check = useCheckWizardTeamQuery({ team, structure: draft.structure, basic: draft.basic });
  const [changingManager, setChangingManager] = useState(false);
  const chosen = new Set([team.managerUserId ?? '', ...team.members.map((member) => member.userId ?? member.inviteTarget ?? '')]);
  const isMe = team.managerUserId === options.me.userId;
  const manager = isMe ? { fullName: options.me.fullName, avatarTone: options.me.avatarTone, contact: '' } : team.managerDisplay;

  const addMember = (member: WizardMember) => onChange({ ...team, members: [...team.members, member] });
  const updateRole = (index: number, role: SystemRole) => onChange({ ...team, members: team.members.map((member, position) => (position === index ? { ...member, roles: [role] } : member)) });

  return (
    <div className="col g14">
      <div className="fg">
        <span className="lbl">
          مدیر پروژه <span className="req">*</span>
        </span>
        {team.managerUserId && manager && !changingManager ? (
          <div className="row g12" style={{ padding: '10px 12px', border: '1px solid #E4E4E7', borderRadius: 10 }}>
            <Avatar name={manager.fullName} tone={manager.avatarTone} size="m" />
            <div className="col grow" style={{ gap: 1 }}>
              <span className="row g6">
                <span className="t-13 fw6 tx9">{manager.fullName}</span>
                {isMe && (
                  <Badge size="sm" tone="pri">
                    شما
                  </Badge>
                )}
              </span>
              {!isMe && manager.contact && (
                <span className="t-12 tx5" dir="ltr" style={{ textAlign: 'right' }}>
                  {manager.contact}
                </span>
              )}
            </div>
            <Badge tone="acc">مدیر پروژه</Badge>
            <AppButton variant="ghost" size="sm" onClick={() => setChangingManager(true)}>
              تغییر
            </AppButton>
          </div>
        ) : (
          <>
            <UserSearch
              placeholder="جستجوی مدیر پروژه با نام یا شماره"
              exclude={new Set(team.members.map((member) => member.userId ?? ''))}
              onPick={(user) => {
                setChangingManager(false);
                onChange({ ...team, managerUserId: user.userId, managerDisplay: { fullName: user.fullName, avatarTone: user.avatarTone, contact: user.contact } });
              }}
            />
            {!options.me.isProjectManagerRole && (
              <span className="row g6 t-12 tx6">
                شما نقش مدیر پروژه ندارید؛ پس از ساخت، برنامه‌ریز این پروژه می‌شوید.
                <button type="button" className="link" onClick={() => {
                    setChangingManager(false);
                    onChange({ ...team, managerUserId: options.me.userId, managerDisplay: null });
                  }}>
                  خودم مدیر باشم
                </button>
              </span>
            )}
            {showErrors && !team.managerUserId && <span className="hint err">مدیر پروژه را انتخاب کنید.</span>}
          </>
        )}
      </div>

      <div className="fg">
        <span className="lbl">
          اعضای اولیه <span className="opt">(اختیاری؛ بعداً هم می‌توانید اضافه کنید)</span>
        </span>
        <UserSearch
          placeholder="نام، ایمیل یا شمارهٔ همراه"
          exclude={chosen}
          onPick={(user) => addMember({ userId: user.userId, fullName: user.fullName, avatarTone: user.avatarTone, inviteTarget: null, roles: [user.note.includes('سرپرست') ? 'supervisor' : 'reviewer'], note: `${user.contact} · ${user.note}` })}
          onInvite={(target) => addMember({ userId: null, fullName: target, avatarTone: 'a7', inviteTarget: target, roles: ['supervisor'], note: target.includes('@') ? 'دعوت با ایمیل پس از ساخت پروژه' : 'پیامک دعوت و نصب اپ پس از ساخت پروژه' })}
        />
        {team.members.length > 0 && (
          <div className="col" style={{ border: '1px solid #E4E4E7', borderRadius: 10, overflow: 'hidden' }}>
            {team.members.map((member, index) => (
              <div key={member.userId ?? member.inviteTarget} className="row wrap g12" style={{ padding: '9px 12px', borderBottom: '1px solid #F4F4F5' }}>
                <Avatar name={member.fullName} tone={member.avatarTone} size="m" />
                <div className="col grow" style={{ gap: 1, minWidth: 160 }}>
                  <span className="t-13 fw5 tx9" dir={member.inviteTarget ? 'ltr' : undefined} style={member.inviteTarget ? { textAlign: 'right' } : undefined}>
                    {member.fullName}
                  </span>
                  <span className="t-12 tx5 trunc">{member.note}</span>
                </div>
                <Select
                  size="sm"
                  label={`نقش ${member.fullName}`}
                  options={ASSIGNABLE_ROLES.map((entry) => ({ value: entry.role, label: roleLabel(entry.role) }))}
                  value={member.roles[0] ?? 'supervisor'}
                  onChange={(role) => updateRole(index, role)}
                  width={170}
                />
                <IconButton icon="x" label={`حذف ${member.fullName} از فهرست`} size="sm" onClick={() => onChange({ ...team, members: team.members.filter((_, position) => position !== index) })} />
              </div>
            ))}
          </div>
        )}
      </div>

      {check.data && check.data.suggestions.length > 0 && (
        <div className="row g8 wrap">
          <span className="t-12 tx6">پیشنهاد از پروژه‌های مشابه:</span>
          {check.data.suggestions.map((entry) => (
            <Chip key={entry.userId} icon="plus" onClick={() => addMember({ userId: entry.userId, fullName: entry.fullName, avatarTone: entry.avatarTone, inviteTarget: null, roles: [entry.role], note: entry.note })}>
              {`${entry.fullName} · ${entry.note}`}
            </Chip>
          ))}
        </div>
      )}

      {check.data && check.data.composition.length > 0 && (
        <div className="row wrap g16 t-12 tx6" style={{ padding: '10px 12px', background: '#FAFAFA', borderRadius: 10 }}>
          <span className="fw6 tx8">ترکیب تیم:</span>
          {check.data.composition.map((entry) => (
            <span key={entry.role} className="row g4">
              <span style={{ width: 8, height: 8, borderRadius: 999, background: entry.role === 'project_manager' ? '#E07A2C' : (ROLE_COLOR[entry.role] ?? '#71717A') }} />
              {toFaDigits(entry.count)} {roleLabel(entry.role)}
            </span>
          ))}
        </div>
      )}

      {check.data?.warnings.map((warning) => (
        <Alert key={warning} tone="wrn" icon="alert-triangle">
          {warning}
        </Alert>
      ))}
      <span className="t-12 tx5">هیچ دعوتی تا زدن «ساخت پروژه» فرستاده نمی‌شود.</span>
    </div>
  );
}
