import { ROUTES } from '@/config/routes';
import { SegmentedControl } from '@/shared/components/ui/Tabs';
import type { EntityId } from '@/shared/types/api';

/** سوئیچ «اعضا / تخصیص فعالیت‌ها» بالای W16 و W17 (بوم). */
export function TeamTabs({
  projectId,
  active,
  showAssignment,
}: {
  projectId: EntityId;
  active: 'members' | 'assignment';
  showAssignment: boolean;
}) {
  return (
    <div className="row wrap g10" style={{ marginBottom: 16 }}>
      <SegmentedControl
        emphasis
        activeKey={active}
        items={[
          { key: 'members', label: 'اعضا', icon: 'users', to: ROUTES.members(projectId) },
          ...(showAssignment
            ? [
                {
                  key: 'assignment',
                  label: 'تخصیص فعالیت‌ها',
                  icon: 'list-checks' as const,
                  to: ROUTES.assignment(projectId),
                },
              ]
            : []),
        ]}
      />
      <span className="t-12 tx5">مدیریت دسترسی‌ها و سپردن بخش‌های WBS به سرپرستان کارگاه</span>
    </div>
  );
}
