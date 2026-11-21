import { useEffect } from 'react';

import { Alert } from '@/shared/components/ui/Alert';
import { Badge } from '@/shared/components/ui/Badge';
import { Icon } from '@/shared/components/ui/Icon';
import { IconBox } from '@/shared/components/ui/IconBox';
import { OptionCard } from '@/shared/components/ui/SelectionControls';
import { Checkbox } from '@/shared/components/ui/SelectionControls';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { toFaDigits } from '@/shared/utils/num';
import { cn } from '@/shared/utils/cn';
import { useGetWizardSummaryQuery, useGetWizardTemplatesQuery } from '../../api/wizardApi';
import type { ProjectWizardDraft, StructureMode } from '../../types/wizard';

const MODES: Array<{ key: StructureMode; title: string; description: string }> = [
  { key: 'empty', title: 'شروع از صفر', description: 'WBS را بعداً دستی یا با Excel تعریف می‌کنم' },
  { key: 'msp', title: 'ورود از فایل MSP', description: 'XML از Microsoft Project؛ پس از ساخت به ورود می‌روید' },
  { key: 'template', title: 'استفاده از قالب', description: 'از کتابخانهٔ قالب‌های سازمان' },
];

/** W38 — ساختار و خلاصه (F02 ۵.۴). مانع‌های ساخت را سرور می‌دهد. */
export function StepStructure({ draft, onChange, onSendInvites, onGoToStep }: { draft: ProjectWizardDraft; onChange: (next: ProjectWizardDraft['structure']) => void; onSendInvites: (value: boolean) => void; onGoToStep: (step: 1 | 2 | 3) => void }) {
  const templates = useGetWizardTemplatesQuery(draft.basic.projectTypeId);
  const summary = useGetWizardSummaryQuery(draft);
  const selected = templates.data?.find((template) => template.id === draft.structure.templateId);
  const structure = draft.structure;
  const recommended = templates.data?.find((template) => template.recommended) ?? templates.data?.[0];
  // قالب پیشنهادی از پیش انتخاب می‌شود (W38)
  useEffect(() => {
    if (structure.mode === 'template' && !structure.templateId && recommended) onChange({ ...structure, templateId: recommended.id });
  }, [structure, recommended, onChange]);

  return (
    <div className="col g14">
      <div className="fg">
        <span className="lbl">ساختار اولیهٔ WBS و CBS</span>
        <div className="grid c3 rsp" style={{ gap: 8 }}>
          {MODES.map((mode) => (
            <OptionCard key={mode.key} control="radio" name="structure-mode" selected={structure.mode === mode.key} onSelect={() => onChange({ ...structure, mode: mode.key })} title={mode.title} description={mode.description} />
          ))}
        </div>
      </div>

      {structure.mode === 'template' &&
        (templates.isLoading ? (
          <SkeletonTable rows={3} />
        ) : (
          <div className="col" role="radiogroup" aria-label="قالب" style={{ border: '1px solid #E4E4E7', borderRadius: 12, overflow: 'hidden' }}>
            {(templates.data ?? []).map((template) => {
              const on = template.id === structure.templateId;
              return (
                <button
                  key={template.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={cn('row g12', on && 'sel-card')}
                  style={{ padding: '11px 14px', borderBottom: '1px solid #F4F4F5', textAlign: 'start', width: '100%', background: on ? '#F1F4F8' : undefined }}
                  onClick={() => onChange({ ...structure, templateId: template.id })}
                >
                  <span className={cn('rd', on && 'on')} aria-hidden="true" />
                  <span className="icb" style={{ background: on ? '#1A3354' : '#F4F4F5', color: on ? '#FFFFFF' : '#52525B' }}>
                    <Icon name={template.icon} size={16} />
                  </span>
                  <span className="col grow" style={{ gap: 1 }}>
                    <span className="row wrap g6">
                      <span className="t-13 fw6 tx9">{template.title}</span>
                      {template.recommended && (
                        <Badge size="sm" tone="pri">
                          پیشنهادی برای نوع پروژه
                        </Badge>
                      )}
                    </span>
                    <span className="t-xs tx5">
                      {template.version} · {toFaDigits(template.wbsCount)} آیتم WBS · {toFaDigits(template.cbsCount)} قلم CBS · استفاده در {toFaDigits(template.usedIn)} پروژه
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ))}

      {structure.mode === 'msp' && (
        <Alert tone="inf" icon="info">
          پروژه پیش‌نویس ساخته می‌شود و شما به صفحهٔ ورود از MSP می‌روید؛ ساختار، تاریخ‌ها و وابستگی‌ها از فایل می‌آید.
        </Alert>
      )}

      <div className="grid c2 rsp" style={{ gap: 12 }}>
        <div className="box col g8" style={{ background: '#FFFFFF' }}>
          <span className="t-12 fw6 tx8">{structure.mode === 'template' ? 'از قالب کپی می‌شود' : 'پس از ساخت'}</span>
          {structure.mode === 'template' && selected ? (
            selected.copies.map((line) => (
              <span key={line} className="row g6 t-12 tx7">
                <span className="tx-ok" style={{ display: 'inline-flex' }}>
                  <Icon name="check" size={13} />
                </span>
                {line}
              </span>
            ))
          ) : (
            <span className="t-12 tx6 lh">
              {structure.mode === 'empty'
                ? 'پروژه با WBS خالی ساخته می‌شود؛ در صفحهٔ WBS می‌توانید دستی، با Excel یا از قالب شروع کنید.'
                : structure.mode === 'msp'
                  ? 'ورود فایل MSP در سه مرحله: بارگذاری، نگاشت ستون‌ها و بازبینی.'
                  : 'یک قالب انتخاب کنید.'}
            </span>
          )}
          {draft.schedule.milestones.length > 0 && (
            <span className="row g6 t-12 tx7">
              <span className="tx-ok" style={{ display: 'inline-flex' }}>
                <Icon name="check" size={13} />
              </span>
              {toFaDigits(draft.schedule.milestones.length)} نقطهٔ عطف کلیدی با وزن ۰
            </span>
          )}
        </div>
        <div className="box col g8" style={{ background: '#FFFFFF' }}>
          <span className="t-12 fw6 tx8">خلاصهٔ پروژه</span>
          {summary.data?.rows.map((row) => (
            <div key={row.label} className="row between g8 t-12">
              <span className="tx5">{row.label}</span>
              <span className="fw5 tx9" style={{ textAlign: 'end' }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {summary.data && summary.data.inviteCount > 0 && (
        <Checkbox
          checked={draft.sendInvites}
          onChange={(event) => onSendInvites(event.target.checked)}
          label={`ارسال دعوت‌نامه به ${toFaDigits(summary.data.inviteCount)} عضو تیم${summary.data.appSmsNames.length ? ` و پیامک نصب اپ برای ${summary.data.appSmsNames.join('، ')}` : ''}`}
        />
      )}

      {summary.data && summary.data.blockers.length > 0 && (
        <Alert tone="wrn" icon="alert-triangle">
          <span className="col g4">
            <span className="fw6">پیش از ساخت این‌ها را کامل کنید:</span>
            {summary.data.blockers.map((blocker) => (
              <span key={blocker.message} className="row g6">
                <IconBox icon="arrow-left" size="sm" tone="wrn" />
                {blocker.step < 4 ? (
                  <button type="button" className="link" onClick={() => onGoToStep(blocker.step as 1 | 2 | 3)}>
                    {`مرحلهٔ ${toFaDigits(blocker.step)}: ${blocker.message}`}
                  </button>
                ) : (
                  blocker.message
                )}
              </span>
            ))}
          </span>
        </Alert>
      )}
    </div>
  );
}
