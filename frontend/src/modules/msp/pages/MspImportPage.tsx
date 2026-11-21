import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { Content } from '@/shared/components/layout/AppShell';
import { Topbar } from '@/shared/components/layout/Topbar';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { toast } from '@/shared/components/feedback/toastStore';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton, LinkButton } from '@/shared/components/ui/AppButton';
import { Card, CardBody, CardHeader } from '@/shared/components/ui/Card';
import { Icon } from '@/shared/components/ui/Icon';
import { IconBox } from '@/shared/components/ui/IconBox';
import { Select, type SelectOption } from '@/shared/components/ui/Select';
import { Stepper } from '@/shared/components/ui/Stepper';
import { useHasPermission } from '@/shared/hooks/useHasAccess';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { formatRelativeTime } from '@/shared/utils/date';
import { toFaDigits } from '@/shared/utils/num';
import { useGetProjectsQuery } from '@/modules/projects/api/projectsApi';
import {
  useBuildImportMutation,
  useCreateImportMutation,
  useGetImportPreviewQuery,
  useGetImportQuery,
  useGetMappingOptionsQuery,
  useRollbackImportMutation,
  useUpdateImportMutation,
} from '../api/mspApi';
import { ImportMappingStep, ImportReviewStep, ImportUploadStep } from '../components/ImportSteps';
import type { BuildImportResultDto, OpeningProgressRowDto } from '../types';

const STEPS = [
  { key: '1', label: 'بارگذاری و اعتبارسنجی' },
  { key: '2', label: 'تطبیق فیلدها' },
  { key: '3', label: 'بازبینی و ساخت WBS' },
];

export interface MspImportPageProps {
  /** مرحله از مسیر می‌آید: `/msp/import`، `.../mapping`، `.../review`. */
  step: 1 | 2 | 3;
}

/**
 * W34 ← W35 ← W49 — ورود ساختار از Microsoft Project (F15 ۷.۱).
 *
 * شرط: پروژهٔ پیش‌نویس. خطاهای اعتبارسنجی تا تعیین تکلیف ادامه را می‌بندند (AC-MS-03)؛
 * ساخت از مسیر نسخهٔ برنامه می‌گذرد و تا ۳۰ دقیقه بازگردانی دارد (AC-MS-04).
 */
export default function MspImportPage({ step }: MspImportPageProps) {
  const canImport = useHasPermission('msp.import');
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const sessionId = params.get('session');
  const projectParam = params.get('project');

  const projects = useGetProjectsQuery({});
  const draftProjects = useMemo(
    () => (projects.data ?? []).filter((project) => project.status === 'draft'),
    [projects.data],
  );
  const [projectId, setProjectId] = useState<string | null>(projectParam);
  const activeProjectId = projectId ?? projectParam ?? draftProjects[0]?.id ?? null;

  const session = useGetImportQuery(sessionId ?? '', { skip: !sessionId });
  // سرپرستان همین پروژه (تصمیم کاربر 1405/08/26)
  const sessionProjectId = session.data?.projectId ?? activeProjectId;
  const options = useGetMappingOptionsQuery(sessionProjectId, { skip: step !== 2 || !sessionProjectId });
  const preview = useGetImportPreviewQuery(sessionId ?? '', { skip: step !== 3 || !sessionId });

  const [createImport, createState] = useCreateImportMutation();
  const [updateImport] = useUpdateImportMutation();
  const [buildImport, buildState] = useBuildImportMutation();
  const [rollback] = useRollbackImportMutation();

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [built, setBuilt] = useState<BuildImportResultDto | null>(null);
  const [opening, setOpening] = useState<OpeningProgressRowDto[]>([]);

  useEffect(() => {
    if (preview.data) setOpening(preview.data.openingProgress);
  }, [preview.data]);

  const data = session.data ?? null;
  const goto = (nextStep: 1 | 2 | 3) => {
    const search = new URLSearchParams();
    if (activeProjectId) search.set('project', activeProjectId);
    if (sessionId) search.set('session', sessionId);
    const path = nextStep === 1 ? ROUTES.mspImport : nextStep === 2 ? ROUTES.mspMapping : ROUTES.mspReview;
    navigate(`${path}?${search.toString()}`);
  };

  async function onFile(file: File) {
    if (!activeProjectId) {
      setUploadError('اول پروژهٔ پیش‌نویس را انتخاب کنید.');
      return;
    }
    setUploadError(null);
    try {
      const created = await createImport({ projectId: activeProjectId, file }).unwrap();
      const search = new URLSearchParams({ project: activeProjectId, session: created.id });
      setParams(search, { replace: true });
    } catch (cause) {
      setUploadError(getApiErrorMessage(cause));
    }
  }

  const patch = async (request: Parameters<typeof updateImport>[0]) => {
    try {
      await updateImport(request).unwrap();
    } catch (cause) {
      toast.error(getApiErrorMessage(cause));
    }
  };

  async function onBuild() {
    if (!sessionId) return;
    try {
      const result = await buildImport({
        sessionId,
        openingProgress: opening.map((row) => ({ id: row.id, percent: row.percent, selected: row.selected })),
      }).unwrap();
      setBuilt(result);
      toast.success('ساختار WBS و CBS ساخته شد.');
    } catch (cause) {
      toast.error(getApiErrorMessage(cause));
    }
  }

  if (!canImport) {
    return (
      <>
        <Topbar title="ورود از MSP" icon="file-code-2" />
        <Content>
          <Alert tone="inf">دسترسی «ورود از MSP» را ندارید. از مدیر پروژه بخواهید فایل برنامه را وارد کند.</Alert>
        </Content>
      </>
    );
  }

  const projectOptions: Array<SelectOption<string>> = draftProjects.map((project) => ({
    value: project.id,
    label: `${project.name} · ${project.code}`,
  }));

  return (
    <>
      <Topbar title="ورود از MSP" icon="file-code-2" />
      <Content>
        <div className="page-head" style={{ marginBottom: 16 }}>
          <div className="row g12">
            <IconBox icon="file-code-2" tone="neu" size="lg" />
            <div>
              <h1 className="h-t2">ورود ساختار از Microsoft Project</h1>
              <p className="sub" style={{ fontSize: 13 }}>
                {data
                  ? `${data.projectName} · ${data.fileName} · ${toFaDigits(data.stats.tasks)} فعالیت`
                  : 'پروژهٔ پیش‌نویس بدون WBS؛ ساختار، تاریخ‌ها و هزینه‌ها از فایل برنامه خوانده می‌شود'}
              </p>
            </div>
          </div>
          <LinkButton to={activeProjectId ? ROUTES.wbs(activeProjectId) : ROUTES.projects} icon="x">
            انصراف
          </LinkButton>
        </div>

        <Card style={{ padding: '16px 20px', marginBottom: 16 }}>
          <Stepper steps={STEPS} current={step} />
        </Card>

        {!sessionId && step === 1 && (
          <Card style={{ marginBottom: 16 }}>
            <CardHeader title="پروژهٔ مقصد" subtitle="ورود از MSP فقط برای پروژهٔ پیش‌نویس است (F15 ۷.۱)" />
            <CardBody>
              {projects.isLoading ? (
                <SkeletonTable rows={2} />
              ) : draftProjects.length === 0 ? (
                <Alert tone="wrn">
                  پروژهٔ پیش‌نویسی نیست. اول با «پروژهٔ جدید» یک پروژه بسازید و بعد ساختارش را از فایل وارد کنید.
                </Alert>
              ) : (
                <Select
                  options={projectOptions}
                  value={activeProjectId}
                  onChange={(value) => setProjectId(value)}
                  placeholder="پروژه را انتخاب کنید"
                  label="پروژهٔ مقصد"
                  width={320}
                />
              )}
            </CardBody>
          </Card>
        )}

        {session.isLoading && sessionId ? (
          <Card>
            <SkeletonTable rows={6} />
          </Card>
        ) : step === 1 ? (
          <ImportUploadStep
            session={data}
            busy={createState.isLoading}
            error={uploadError}
            onFile={(file) => void onFile(file)}
            onResolve={(checkId, resolution) => void patch({ sessionId: sessionId!, checkResolution: { checkId, resolution } })}
            onOption={(option, value) => void patch({ sessionId: sessionId!, options: { [option]: value } })}
          />
        ) : step === 2 ? (
          data && options.data ? (
            <ImportMappingStep
              session={data}
              options={options.data}
              onMapping={(rowId, target) => void patch({ sessionId: data.id, mapping: { rowId, target } })}
              onResource={(rowId, userId, action) => void patch({ sessionId: data.id, resource: { rowId, userId, action } })}
              onWeightGenerator={(value) => void patch({ sessionId: data.id, weightGenerator: value })}
              onSaveTemplate={(value) => void patch({ sessionId: data.id, saveTemplate: value })}
            />
          ) : (
            <Card>
              <SkeletonTable rows={6} />
            </Card>
          )
        ) : built || data?.builtAt ? (
          <Card>
            <CardHeader title="ساختار ساخته شد" icon="check-circle-2" iconClassName="tx-ok" />
            <CardBody className="col g12">
              <Alert tone="ok">
                {built
                  ? `${toFaDigits(built.itemCount)} آیتم (${toFaDigits(built.leafCount)} فعالیت قابل گزارش)، ${toFaDigits(built.cbsItemCount)} قلم CBS و ${toFaDigits(built.openingItems)} پیشرفت اولیه در «${built.versionLabel}» ثبت شد. پروژه پیش‌نویس می‌ماند تا خودتان فعالش کنید.`
                  : `ساختار این فایل پیش‌تر ساخته شد. پروژه پیش‌نویس می‌ماند تا خودتان فعالش کنید.`}
              </Alert>
              <div className="row g8 wrap">
                <LinkButton to={ROUTES.wbs(built?.projectId ?? data!.projectId)} variant="primary" icon="list-tree">
                  رفتن به WBS پروژه
                </LinkButton>
                <LinkButton to={ROUTES.assignment(built?.projectId ?? data!.projectId)} icon="user-check">
                  تخصیص سرپرست‌ها
                </LinkButton>
                <AppButton
                  icon="undo-2"
                  onClick={async () => {
                    try {
                      await rollback(sessionId!).unwrap();
                      setBuilt(null);
                    } catch (cause) {
                      toast.error(getApiErrorMessage(cause));
                    }
                  }}
                >
                  بازگردانی ساختار
                </AppButton>
              </div>
              <span className="t-12 tx5">
                {`بازگردانی تا ${formatRelativeTime(built?.rollbackUntil ?? data!.rollbackUntil ?? '')} ممکن است و فقط اگر هنوز گزارشی ثبت نشده باشد.`}
              </span>
            </CardBody>
          </Card>
        ) : preview.isLoading || !preview.data ? (
          <Card>
            <SkeletonTable rows={8} />
          </Card>
        ) : (
          <ImportReviewStep
            preview={preview.data}
            opening={opening}
            onOpeningChange={(id, change) =>
              setOpening((rows) => rows.map((row) => (row.id === id ? { ...row, ...change } : row)))
            }
          />
        )}

        {!built && (
          <div className="row g8 wrap" style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #E4E4E7' }}>
            <span className="t-12 tx5">
              {`مرحلهٔ ${toFaDigits(step)} از ۳`}
              {data?.blockingReason ? ` · ${data.blockingReason}` : ''}
            </span>
            <span className="grow" />
            {step > 1 && (
              <AppButton icon="arrow-right" onClick={() => goto((step - 1) as 1 | 2)}>
                بازگشت
              </AppButton>
            )}
            {step < 3 ? (
              <AppButton
                variant="primary"
                trailingIcon="arrow-left"
                disabled={!data || !data.canContinue}
                title={data?.blockingReason ?? undefined}
                onClick={() => goto((step + 1) as 2 | 3)}
              >
                {step === 1 ? 'ادامه: تطبیق فیلدها' : 'ادامه: بازبینی و ساخت WBS'}
              </AppButton>
            ) : (
              <AppButton variant="primary" icon="check" loading={buildState.isLoading} onClick={() => void onBuild()}>
                ساخت WBS و CBS
              </AppButton>
            )}
          </div>
        )}

        {data?.source === 'sample' && step === 1 && (
          <p className="t-xs tx5" style={{ marginTop: 10 }}>
            <Icon name="info" size={12} /> تحلیل واقعی فایل MPP با مبدل سمت سرور انجام می‌شود؛ فایل XML استاندارد MSPDI همین
            حالا هم کامل خوانده می‌شود.{' '}
            <Link className="link" to={ROUTES.help}>
              راهنمای ورود از MSP
            </Link>
          </p>
        )}
      </Content>
    </>
  );
}
