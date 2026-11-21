import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { formatJalaliDate } from '@/shared/utils/date';
import type { ProjectActions, ProjectPermissions } from '../hooks/useProjectActions';
import type { ProjectDetailDto } from '../types';

/**
 * پیام وضعیت پروژه بالای هر زبانه — رفتار هر وضعیت از F02 ۸.
 * برای `active` و `draft` چیزی نشان نمی‌دهد (پیش‌نویس پنل فعال‌سازی خودش را دارد).
 */
export function ProjectStatusBanner({
  project,
  can,
  actions,
}: {
  project: ProjectDetailDto;
  can: ProjectPermissions;
  actions: ProjectActions;
}) {
  if (project.status === 'paused') {
    return (
      <Alert
        tone="wrn"
        icon="pause-circle"
        className="mb16"
        action={
          can.pause && (
            <AppButton size="sm" variant="outline" icon="play-circle" onClick={() => actions.run('resume', project)}>
              ادامهٔ پروژه
            </AppButton>
          )
        }
      >
        <strong>پروژه متوقف است{project.pausedAt ? ` (از ${formatJalaliDate(project.pausedAt)})` : ''}.</strong>{' '}
        اپ گزارش نمی‌پذیرد و قواعد زمانی اجرا نمی‌شود. ویرایش بازنگری و تأیید گزارش‌های در انتظار مجاز است.
      </Alert>
    );
  }

  if (project.status === 'completed') {
    return (
      <Alert tone="inf" icon="check-circle-2" className="mb16">
        <strong>پروژه تمام شده و فقط‌خواندنی است.</strong> اعداد از آخرین snapshot پیش از پایان خوانده می‌شوند.
      </Alert>
    );
  }

  if (project.status === 'archived') {
    return (
      <Alert
        tone="wrn"
        icon="archive"
        className="mb16"
        action={
          can.restore && (
            <AppButton size="sm" variant="outline" icon="archive-restore" onClick={() => actions.run('restore', project)}>
              بازگشت از بایگانی
            </AppButton>
          )
        }
      >
        <strong>پروژه بایگانی است و هیچ تغییری نمی‌پذیرد.</strong> برای ویرایش، مدیر سازمان باید آن را بازگرداند.
      </Alert>
    );
  }

  return null;
}
