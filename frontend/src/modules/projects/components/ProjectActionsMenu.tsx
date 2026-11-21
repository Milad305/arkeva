import { ROUTES } from '@/config/routes';
import { projectLink } from '../services/projectLink';
import { Icon } from '@/shared/components/ui/Icon';
import { Kbd } from '@/shared/components/ui/Kbd';
import { Menu, type MenuEntry } from '@/shared/components/ui/Menu';
import type { ProjectListItemDto } from '../types';
import type { ProjectActions, ProjectPermissions } from '../hooks/useProjectActions';
import { exportProjectsCsv } from '../services/exportProjects';

/**
 * منوی سه‌نقطهٔ پروژه — W45، با تصحیح‌های F02 ۹:
 *   • «کپی پروژه» در نسخهٔ اول نیست (`[تأییدشده]`)؛
 *   • «تنظیمات» و «توقف/ادامه» اضافه شده‌اند؛
 *   • هر گزینه بر اساس دسترسی دیده می‌شود و بر اساس وضعیت فعال یا غیرفعال است،
 *     با دلیل غیرفعال‌بودن (قاعدهٔ W45)؛
 *   • اقدام خطرناک همیشه پایین است.
 */
export function buildProjectMenu(
  project: ProjectListItemDto,
  can: ProjectPermissions,
  actions: ProjectActions,
  options: { includeView?: boolean } = {},
): MenuEntry[] {
  const { status } = project;
  const isArchived = status === 'archived';
  const entries: MenuEntry[] = [];

  // روی صفحهٔ خود پروژه «مشاهدهٔ جزئیات» بی‌معناست
  if (can.view && options.includeView !== false) {
    entries.push({
      key: 'view',
      label: 'مشاهدهٔ جزئیات',
      icon: 'eye',
      to: projectLink(project),
      trailing: <Kbd>Enter</Kbd>,
    });
  }

  if (can.editSettings) {
    entries.push({
      key: 'settings',
      label: 'تنظیمات پروژه',
      icon: 'settings',
      to: ROUTES.projectSettings(project.id),
      disabled: isArchived,
      disabledReason: 'پروژه بایگانی است؛ ابتدا بازگردانید',
    });
  }

  entries.push(
    { key: 'sep-export', separator: true },
    {
      key: 'excel',
      label: 'خروجی Excel',
      icon: 'file-spreadsheet',
      onSelect: () => exportProjectsCsv([project], { includeAmounts: can.viewAmounts }),
    },
  );

  const lifecycle: MenuEntry[] = [];

  if (can.pause && status === 'active') {
    lifecycle.push({
      key: 'pause',
      label: 'توقف پروژه',
      icon: 'pause-circle',
      note: 'اپ تا ادامه گزارش نمی‌پذیرد',
      onSelect: () => actions.request('pause', project),
    });
  }

  if (can.pause && status === 'paused') {
    lifecycle.push({
      key: 'resume',
      label: 'ادامهٔ پروژه',
      icon: 'play-circle',
      tone: 'good',
      onSelect: () => actions.run('resume', project),
    });
  }

  if (can.complete && status === 'active') {
    lifecycle.push({
      key: 'complete',
      label: 'اعلام پایان پروژه',
      icon: 'check-circle-2',
      onSelect: () => actions.request('complete', project),
    });
  }

  if (can.archive && !isArchived && status !== 'draft') {
    const archivable = status === 'completed' || status === 'paused';
    lifecycle.push({
      key: 'archive',
      label: 'بایگانی پروژه',
      icon: 'archive',
      tone: 'warn',
      disabled: !archivable,
      disabledReason: 'فقط پروژهٔ تمام‌شده یا متوقف بایگانی می‌شود',
      onSelect: () => actions.request('archive', project),
    });
  }

  if (can.restore && isArchived) {
    lifecycle.push({
      key: 'restore',
      label: 'بازگشت از بایگانی',
      icon: 'archive-restore',
      tone: 'good',
      onSelect: () => actions.run('restore', project),
    });
  }

  if (lifecycle.length > 0) {
    entries.push({ key: 'sep-lifecycle', separator: true }, ...lifecycle);
  }

  if (can.delete) {
    const deletable = status === 'draft' || isArchived;
    entries.push(
      { key: 'sep-danger', separator: true },
      {
        key: 'delete',
        label: isArchived ? 'حذف دائمی' : 'حذف پروژه',
        icon: 'trash-2',
        tone: 'danger',
        disabled: !deletable,
        disabledReason: 'فقط پروژهٔ پیش‌نویس یا بایگانی‌شده حذف می‌شود',
        onSelect: () => actions.request('delete', project),
      },
    );
  }

  // جداکنندهٔ آغازین وقتی گزینه‌های بالایی دیده نمی‌شوند
  const first = entries[0];
  return first && 'separator' in first ? entries.slice(1) : entries;
}

export interface ProjectActionsMenuProps {
  project: ProjectListItemDto;
  can: ProjectPermissions;
  actions: ProjectActions;
  /** دکمهٔ روی کارت پس‌زمینهٔ روشن می‌خواهد. */
  variant?: 'row' | 'card';
}

export function ProjectActionsMenu({ project, can, actions, variant = 'row' }: ProjectActionsMenuProps) {
  return (
    <Menu
      entries={buildProjectMenu(project, can, actions)}
      trigger={(props) => (
        <button
          {...props}
          type="button"
          className={variant === 'card' ? 'ibtn sm bd' : 'ibtn sm'}
          aria-label={`اقدامات ${project.name}`}
        >
          <Icon name="more-vertical" size={15} />
        </button>
      )}
    />
  );
}
