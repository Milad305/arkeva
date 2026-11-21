import { useState, type ReactNode } from 'react';

import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { toast } from '@/shared/components/feedback/toastStore';
import { useHasPermission } from '@/shared/hooks/useHasAccess';
import type { ProjectListItemDto } from '../types';
import {
  useArchiveProjectMutation,
  useCompleteProjectMutation,
  useDeleteProjectMutation,
  usePauseProjectMutation,
  useRestoreProjectMutation,
  useResumeProjectMutation,
} from '../api/projectsApi';

/** اقدام‌هایی که پیش از اجرا تأیید می‌خواهند (F02 ۸). */
export type ConfirmableAction = 'pause' | 'complete' | 'archive' | 'delete';

/** اقدام‌های بی‌خطر که مستقیم اجرا می‌شوند. */
export type DirectAction = 'resume' | 'restore';

export interface ProjectPermissions {
  view: boolean;
  editSettings: boolean;
  pause: boolean;
  complete: boolean;
  archive: boolean;
  restore: boolean;
  delete: boolean;
  viewAmounts: boolean;
  viewIndices: boolean;
}

/** دسترسی‌های مربوط به فهرست پروژه‌ها — از کاتالوگ F01 ۵.۴ و F02 ۱۱. */
export function useProjectPermissions(): ProjectPermissions {
  return {
    view: useHasPermission('project.view'),
    editSettings: useHasPermission('project.settings.edit'),
    pause: useHasPermission('project.pause'),
    complete: useHasPermission('project.complete'),
    archive: useHasPermission('project.archive'),
    restore: useHasPermission('project.restore'),
    delete: useHasPermission('project.delete'),
    viewAmounts: useHasPermission('cbs.view_amounts'),
    // ستون‌های CPI و SPI — F02 ۹، تأییدشده 1405/08/14. نسبت‌ها مبلغ نیستند (F01 ۵.۵)
    // پس `cbs.view_amounts` نمی‌خواهند؛ ناظر کارفرما با `charts.view_summary` آن‌ها را نمی‌بیند.
    viewIndices: useHasPermission('charts.view'),
  };
}

export interface ProjectActions {
  request: (action: ConfirmableAction, project: ProjectListItemDto) => void;
  run: (action: DirectAction, project: ProjectListItemDto) => void;
  /** دیالوگ‌های تأیید — یک‌بار در صفحه رندر می‌شود. */
  dialogs: ReactNode;
}

export interface UseProjectActionsOptions {
  /** پس از حذف موفق — صفحهٔ خود پروژه باید به فهرست برگردد. */
  onDeleted?: (projectId: string) => void;
}

export function useProjectActions(options: UseProjectActionsOptions = {}): ProjectActions {
  const [pending, setPending] = useState<{
    action: ConfirmableAction;
    project: ProjectListItemDto;
  } | null>(null);

  const [pause, pauseState] = usePauseProjectMutation();
  const [resume] = useResumeProjectMutation();
  const [complete, completeState] = useCompleteProjectMutation();
  const [archive, archiveState] = useArchiveProjectMutation();
  const [restore] = useRestoreProjectMutation();
  const [remove, removeState] = useDeleteProjectMutation();

  const close = () => setPending(null);
  const project = pending?.project;

  async function confirm(reason: string) {
    if (!pending) return;
    const { action, project: target } = pending;

    try {
      if (action === 'pause') await pause(target.id).unwrap();
      if (action === 'complete') await complete({ id: target.id, reason }).unwrap();
      if (action === 'archive') await archive({ id: target.id, reason }).unwrap();
      if (action === 'delete') {
        const result = await remove({ id: target.id, confirmName: target.name }).unwrap();
        toast.success(
          result.purgeAfterDays > 0
            ? `«${target.name}» برای حذف علامت خورد. تا ${result.purgeAfterDays} روز مدیر سازمان می‌تواند آن را لغو کند.`
            : `پیش‌نویس «${target.name}» حذف شد.`,
        );
        options.onDeleted?.(target.id);
      }
      close();
    } catch {
      // پیام خطا را میان‌افزار سراسری نشان می‌دهد؛ دیالوگ باز می‌ماند تا کاربر دوباره تلاش کند
    }
  }

  const loading =
    pauseState.isLoading || completeState.isLoading || archiveState.isLoading || removeState.isLoading;

  const dialogs = project && (
    <>
      <ConfirmDialog
        isOpen={pending?.action === 'pause'}
        onCancel={close}
        onConfirm={confirm}
        loading={loading}
        tone="warning"
        icon="pause-circle"
        title={`پروژهٔ «${project.name}» متوقف شود؟`}
        description="تا ادامهٔ پروژه، اپ سرپرستان گزارش نمی‌پذیرد و پروژه از فهرست اپ پنهان می‌شود. مهلت‌های تأیید و قواعد زمانی هشدار هم متوقف می‌شوند. تأیید گزارش‌های در انتظار همچنان ممکن است."
        confirmLabel="توقف پروژه"
        confirmIcon="pause-circle"
      />

      <ConfirmDialog
        isOpen={pending?.action === 'complete'}
        onCancel={close}
        onConfirm={confirm}
        loading={loading}
        tone="info"
        icon="check-circle-2"
        title={`پروژهٔ «${project.name}» تمام‌شده اعلام شود؟`}
        description={
          (project.progress?.actualPercent ?? 0) < 100
            ? 'پیشرفت این پروژه هنوز به ۱۰۰٪ نرسیده است. پس از اعلام پایان، دورهٔ باز بسته می‌شود، پروژه فقط‌خواندنی می‌شود و بازگشت به وضعیت فعال ممکن نیست.'
            : 'دورهٔ باز بسته می‌شود، پروژه فقط‌خواندنی می‌شود و گزارش‌گیری از اپ بسته می‌شود.'
        }
        confirmLabel="اعلام پایان پروژه"
        confirmIcon="check-circle-2"
        reasonLabel="دلیل"
        reasonRequired
      />

      <ConfirmDialog
        isOpen={pending?.action === 'archive'}
        onCancel={close}
        onConfirm={confirm}
        loading={loading}
        tone="warning"
        icon="archive"
        title={`پروژهٔ «${project.name}» بایگانی شود؟`}
        description="داده‌ها حفظ می‌شوند ولی هیچ تغییری مجاز نیست، اپ بسته می‌شود و هشدارهای باز رفع‌شده علامت می‌خورند. بازگردانی فقط با مدیر سازمان است."
        confirmLabel="بایگانی پروژه"
        confirmIcon="archive"
        reasonLabel="دلیل بایگانی"
        reasonRequired
      />

      <ConfirmDialog
        isOpen={pending?.action === 'delete'}
        onCancel={close}
        onConfirm={confirm}
        loading={loading}
        tone="danger"
        title={`پروژهٔ «${project.name}» حذف شود؟`}
        description={
          project.status === 'draft' ? (
            'این پیش‌نویس و همهٔ داده‌هایش فوراً حذف می‌شود.'
          ) : (
            <>
              پروژه فوراً از همهٔ فهرست‌ها پنهان می‌شود و پس از ۱۴ روز همهٔ WBS، CBS، گزارش‌ها، عکس‌ها
              و ریسک‌هایش پاک می‌شود. <strong className="tx-err">تا ۱۴ روز قابل لغو است.</strong>
            </>
          )
        }
        confirmLabel="حذف پروژه"
        confirmIcon="trash-2"
        confirmText={project.name}
        confirmTextLabel="برای تأیید، نام پروژه را تایپ کنید"
      />
    </>
  );

  return {
    request: (action, target) => setPending({ action, project: target }),
    run: (action, target) => {
      if (action === 'resume') void resume(target.id);
      if (action === 'restore') void restore(target.id);
    },
    dialogs,
  };
}
