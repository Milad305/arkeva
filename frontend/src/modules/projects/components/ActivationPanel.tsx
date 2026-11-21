import { useState } from 'react';
import { Link } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { Guard } from '@/shared/components/rbac/Guard';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { Card, CardBody, CardHeader } from '@/shared/components/ui/Card';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { Icon } from '@/shared/components/ui/Icon';
import { toFaDigits } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import { useActivateProjectMutation, useGetActivationCheckQuery } from '../api/projectsApi';
import type { ActivationCheckItem, ProjectDetailDto } from '../types';

/**
 * W10 برای پروژهٔ پیش‌نویس — «کاربر به W10 با بنر فعال‌سازی می‌رود» (F02 ۵.۴ گام ۵).
 *
 * پیش‌شرط‌ها و هشدارها را سرور می‌سنجد (`GET /projects/:pid/activation-check`)؛
 * اینجا فقط نمایش و دیالوگ «فعال‌سازی و ثبت برنامهٔ مبنا» است (F02 ۸.۱).
 */
export function ActivationPanel({ project }: { project: ProjectDetailDto }) {
  const { data: check, isLoading, isError, refetch } = useGetActivationCheckQuery(project.id);
  const [activate, activateState] = useActivateProjectMutation();
  const [isConfirming, setIsConfirming] = useState(false);

  const openWarnings = check?.warnings.filter((item) => !item.passed) ?? [];

  async function confirmActivate() {
    try {
      await activate(project.id).unwrap();
      setIsConfirming(false);
    } catch {
      // پیام خطا را میان‌افزار سراسری نشان می‌دهد؛ دیالوگ باز می‌ماند
    }
  }

  return (
    <>
      <Alert
        tone="inf"
        icon="rocket"
        className="mb16"
        action={
          <Guard permissions={['project.activate']}>
            <AppButton
              variant="primary"
              size="sm"
              icon="rocket"
              disabled={!check?.canActivate}
              onClick={() => setIsConfirming(true)}
            >
              فعال‌سازی پروژه
            </AppButton>
          </Guard>
        }
      >
        <strong>این پروژه هنوز پیش‌نویس است.</strong> ساختار و بودجه را کامل کنید و سپس فعال کنید. با فعال‌سازی،
        برنامهٔ مبنا ثبت و قفل می‌شود و از همان لحظه اپ گزارش کارگاه می‌پذیرد.
      </Alert>

      <div className="grid c2" style={{ marginBottom: 16 }}>
        <Card>
          <CardHeader
            icon="list-checks"
            iconClassName="tx-pri"
            title="پیش‌شرط‌های فعال‌سازی"
            subtitle="همه باید برقرار باشند"
          />
          {isLoading ? (
            <CardBody>
              <SkeletonTable rows={5} />
            </CardBody>
          ) : isError || !check ? (
            <ActivationError onRetry={() => void refetch()} />
          ) : (
            <ChecklistRows projectId={project.id} items={check.blockers} kind="blocker" />
          )}
        </Card>

        <Card>
          <CardHeader
            icon="alert-triangle"
            iconClassName="tx-wrn"
            title="هشدارهای پیش از فعال‌سازی"
            subtitle="مانع نیستند، ولی بهتر است پیش از شروع کار برطرف شوند"
          />
          {isLoading ? (
            <CardBody>
              <SkeletonTable rows={5} />
            </CardBody>
          ) : isError || !check ? (
            <ActivationError onRetry={() => void refetch()} />
          ) : (
            <ChecklistRows projectId={project.id} items={check.warnings} kind="warning" />
          )}
        </Card>
      </div>

      <ConfirmDialog
        isOpen={isConfirming}
        onCancel={() => setIsConfirming(false)}
        onConfirm={() => void confirmActivate()}
        loading={activateState.isLoading}
        tone="info"
        icon="rocket"
        title={`فعال‌سازی «${project.name}»`}
        description="برنامهٔ مبنا ثبت می‌شود و دیگر تغییر نمی‌کند. هر تغییر بعدی برنامه به‌صورت بازنگری (R1، R2، …) ثبت می‌شود و مبنا برای مقایسه می‌ماند."
        confirmLabel="فعال‌سازی و ثبت برنامهٔ مبنا"
        confirmIcon="rocket"
        extra={
          openWarnings.length > 0 ? (
            <Alert tone="wrn">
              {toFaDigits(openWarnings.length)} هشدار باز است:{' '}
              {openWarnings.map((item) => item.label).join('، ')}. می‌توانید پس از فعال‌سازی هم برطرفشان کنید.
            </Alert>
          ) : undefined
        }
      />
    </>
  );
}

const FIX_ROUTE: Record<NonNullable<ActivationCheckItem['fixAt']>, (id: EntityId) => string> = {
  wbs: ROUTES.wbs,
  cbs: ROUTES.cbs,
  links: ROUTES.links,
  members: ROUTES.members,
  assignment: ROUTES.assignment,
  settings: ROUTES.projectSettings,
  calendar: ROUTES.projectSettings,
};

function ChecklistRows({
  projectId,
  items,
  kind,
}: {
  projectId: EntityId;
  items: ActivationCheckItem[];
  kind: 'blocker' | 'warning';
}) {
  return (
    <ul className="col" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
      {items.map((item) => {
        const failedIcon = kind === 'blocker' ? 'x-circle' : 'alert-triangle';
        const failedClass = kind === 'blocker' ? 'tx-err' : 'tx-wrn';
        return (
          <li
            key={item.code}
            className="row g10 ai-s"
            style={{ padding: '10px 16px', borderBottom: '1px solid #F4F4F5' }}
          >
            <span className={item.passed ? 'tx-ok' : failedClass} style={{ display: 'inline-flex', marginTop: 2 }}>
              <Icon name={item.passed ? 'check-circle-2' : failedIcon} size={16} />
            </span>
            <span className="col g2 grow" style={{ minWidth: 0 }}>
              <span className={item.passed ? 't-13 tx7' : 't-13 fw5 tx9'}>{item.label}</span>
              {item.detail && <span className="t-sm tx5">{item.detail}</span>}
            </span>
            {!item.passed && item.fixAt && (
              <Link className="link nowrap" to={FIX_ROUTE[item.fixAt](projectId)}>
                رفع
                <Icon name="chevron-left" size={12} />
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ActivationError({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      icon="server"
      title="پیش‌شرط‌ها بارگذاری نشد"
      description="چند لحظهٔ دیگر دوباره امتحان کنید."
      actions={
        <AppButton size="sm" variant="outline" icon="refresh-cw" onClick={onRetry}>
          تلاش دوباره
        </AppButton>
      }
    />
  );
}
