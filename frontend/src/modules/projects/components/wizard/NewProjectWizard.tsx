import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { toast } from '@/shared/components/feedback/toastStore';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Modal } from '@/shared/components/ui/Modal';
import { Stepper } from '@/shared/components/ui/Stepper';
import { getApiError, getApiErrorMessage } from '@/shared/utils/apiError';
import type { EntityId } from '@/shared/types/api';
import { useCreateProjectMutation, useDeleteWizardDraftMutation, useGetWizardDraftQuery, useGetWizardOptionsQuery, useSaveWizardDraftMutation, wizardApi } from '../../api/wizardApi';
import type { ProjectWizardDraft, WizardOptionsDto, WizardStep } from '../../types/wizard';
import { StepBasic } from './StepBasic';
import { StepSchedule } from './StepSchedule';
import { StepStructure } from './StepStructure';
import { StepTeam } from './StepTeam';

const STEPS = [
  { key: '1', label: 'اطلاعات پایه' },
  { key: '2', label: 'زمان و بودجه' },
  { key: '3', label: 'تیم' },
  { key: '4', label: 'ساختار' },
];
const NEXT_LABEL: Record<number, string> = { 1: 'بعدی: زمان و بودجه', 2: 'بعدی: تیم', 3: 'بعدی: ساختار' };

function initialDraft(options: WizardOptionsDto, templateId: EntityId | null): ProjectWizardDraft {
  const defaultCalendar = options.calendarPresets.find((preset) => preset.isDefault) ?? options.calendarPresets[0]!;
  return {
    id: '',
    step: 1,
    basic: { name: '', code: options.suggestedCode, clientName: '', projectTypeId: null, location: '', imageName: null },
    schedule: { plannedStart: null, plannedFinish: null, calendarPresetId: defaultCalendar.id, currency: 'rial', plannedTotalBudget: null, contingencyPct: 5, milestones: [] },
    // ۵.۳: پیش‌فرض خود سازنده فقط اگر نقش مدیر پروژه دارد
    team: { managerUserId: options.me.isProjectManagerRole ? options.me.userId : null, managerDisplay: null, members: [] },
    structure: { mode: 'template', templateId },
    sendInvites: true,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * ویزارد ساخت پروژه (F02 ۵؛ W37، W47، W48، W38) — مودال روی W07 در `/projects/new`
 * (تصمیم 1405/08/15). هر «بعدی» پیش‌نویس را ذخیره می‌کند (۵.۵)؛ `?draft=` ادامه می‌دهد.
 */
export function NewProjectWizard({ draftId, templateId = null }: { draftId: EntityId | null; templateId?: EntityId | null }) {
  const options = useGetWizardOptionsQuery();
  const saved = useGetWizardDraftQuery(draftId ?? '', { skip: !draftId });
  const ready = options.data && (!draftId || saved.data || saved.isError);

  return ready ? (
    <WizardBody key={draftId ?? 'new'} options={options.data!} initial={saved.data ?? initialDraft(options.data!, templateId)} missingDraft={Boolean(draftId && saved.isError)} />
  ) : (
    <Modal isOpen onClose={() => window.history.back()} size="lg" title="ساخت پروژهٔ جدید">
      <SkeletonTable rows={5} />
    </Modal>
  );
}

function WizardBody({ options, initial, missingDraft }: { options: WizardOptionsDto; initial: ProjectWizardDraft; missingDraft: boolean }) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<ProjectWizardDraft>(initial);
  const [step, setStep] = useState<WizardStep>(initial.step);
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState<string | null>(missingDraft ? 'پیش‌نویس پیدا نشد؛ ساخت را از ابتدا شروع کنید.' : null);
  const dirty = useRef(false);
  const [save, saveState] = useSaveWizardDraftMutation();
  const [create, createState] = useCreateProjectMutation();
  const [remove] = useDeleteWizardDraftMutation();
  const [loadSummary, summaryState] = wizardApi.useLazyGetWizardSummaryQuery();

  const update = (patch: Partial<ProjectWizardDraft>) => {
    dirty.current = true;
    setError(null);
    setDraft((current) => ({ ...current, ...patch }));
  };

  useEffect(() => {
    setShowErrors(false);
  }, [step]);

  async function persist(nextStep: WizardStep, silent = true): Promise<ProjectWizardDraft | null> {
    try {
      const result = await save({ ...draft, step: nextStep }).unwrap();
      setDraft((current) => ({ ...current, id: result.id }));
      dirty.current = false;
      if (!silent) toast.success('پیش‌نویس ذخیره شد؛ از فهرست پروژه‌ها ادامه دهید.');
      return result;
    } catch {
      return null;
    }
  }

  /** «بعدی»: مانع‌های همین مرحله از سرور، سپس ذخیرهٔ خودکار (۵.۵). */
  async function next() {
    setError(null);
    const summary = await loadSummary(draft).unwrap().catch(() => null);
    const blockers = summary?.blockers.filter((blocker) => blocker.step === step) ?? [];
    if (blockers.length > 0) {
      setShowErrors(true);
      setError(blockers.map((blocker) => blocker.message).join(' '));
      return;
    }
    const nextStep = (step + 1) as WizardStep;
    await persist(nextStep);
    setStep(nextStep);
  }

  async function submit() {
    setError(null);
    try {
      const result = await create(draft).unwrap();
      toast.success(`پروژهٔ «${draft.basic.name}» ساخته شد. پس از تکمیل ساختار، آن را فعال کنید.`);
      navigate(result.next === 'msp_import' ? `/msp/import?project=${encodeURIComponent(result.projectId)}` : ROUTES.project(result.projectId), { replace: true });
    } catch (cause) {
      const details = getApiError(cause)?.details;
      const suggestion = details?.suggestion;
      if (typeof suggestion === 'string') update({ basic: { ...draft.basic, code: suggestion } });
      const target = details?.step;
      if (typeof target === 'number' && target !== step) setStep(target as WizardStep);
      setShowErrors(true);
      setError(getApiErrorMessage(cause));
    }
  }

  async function close() {
    // ترک ویزارد با داده = ذخیرهٔ پیش‌نویس (۵.۵)
    if (dirty.current && (draft.basic.name.trim() || draft.id)) await persist(step, false);
    navigate(ROUTES.projects);
  }

  return (
    <Modal
      isOpen
      onClose={() => void close()}
      size="lg"
      dismissOnBackdrop={false}
      title="ساخت پروژهٔ جدید"
      description={
        draft.basic.name.trim() ? (
          <>
            {draft.basic.name} · <span className="mono">{draft.basic.code}</span>
          </>
        ) : (
          'اطلاعات پروژه را در ۴ مرحله تکمیل کنید؛ هر زمان می‌توانید پیش‌نویس را ذخیره کنید'
        )
      }
      footer={
        <>
          <span className="row g6">
            <AppButton variant="ghost" icon="save" loading={saveState.isLoading} onClick={() => void persist(step, false)}>
              ذخیره به‌عنوان پیش‌نویس
            </AppButton>
            {draft.id && (
              <AppButton
                variant="ghost"
                className="tx-err"
                icon="trash-2"
                onClick={() => {
                  void remove(draft.id).then(() => navigate(ROUTES.projects));
                }}
              >
                حذف پیش‌نویس
              </AppButton>
            )}
          </span>
          <span className="row g8">
            <AppButton variant="outline" icon="arrow-right" disabled={step === 1} onClick={() => setStep((step - 1) as WizardStep)}>
              قبلی
            </AppButton>
            {step < 4 ? (
              <AppButton variant="primary" loading={summaryState.isFetching || saveState.isLoading} onClick={() => void next()}>
                {NEXT_LABEL[step]}
              </AppButton>
            ) : (
              <AppButton variant="primary" icon="folder-plus" loading={createState.isLoading} onClick={() => void submit()}>
                ساخت پروژه
              </AppButton>
            )}
          </span>
        </>
      }
    >
      <div className="col g14">
        <Stepper steps={STEPS} current={step} />
        {step === 1 && <StepBasic value={draft.basic} onChange={(basic) => update({ basic })} options={options} showErrors={showErrors} />}
        {step === 2 && <StepSchedule value={draft.schedule} onChange={(schedule) => update({ schedule })} options={options} showErrors={showErrors} />}
        {step === 3 && <StepTeam draft={draft} onChange={(team) => update({ team })} options={options} showErrors={showErrors} />}
        {step === 4 && (
          <StepStructure
            draft={draft}
            onChange={(structure) => update({ structure })}
            onSendInvites={(sendInvites) => update({ sendInvites })}
            onGoToStep={(target) => setStep(target)}
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
