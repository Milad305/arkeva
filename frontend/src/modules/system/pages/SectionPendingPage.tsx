import { useParams } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { Content } from '@/shared/components/layout/AppShell';
import { Topbar } from '@/shared/components/layout/Topbar';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { LinkButton } from '@/shared/components/ui/AppButton';

/**
 * جای‌نگهدار صفحه‌هایی (زبانهٔ پروژه یا صفحهٔ سازمان) که هنوز ساخته نشده‌اند.
 * مسیر واقعی است تا زبانه‌ها و پیوندهای W10 به ۴۰۴ نروند؛ با ساخت هر صفحه حذف می‌شود.
 */
export default function SectionPendingPage({ title }: { title?: string }) {
  const { projectId = '' } = useParams();

  return (
    <>
    {/* صفحهٔ سطح سازمان نوار بالای خودش را دارد؛ زبانهٔ پروژه نوار پوستهٔ پروژه را */}
    {title && <Topbar title={title} />}
    <Content>
      <EmptyState
        inCard
        icon="layout-template"
        title="این بخش هنوز ساخته نشده"
        description={projectId ? 'این زبانه در مرحله‌های بعدی ساخت پنل اضافه می‌شود. تا آن موقع از نمای کلی پروژه استفاده کنید.' : 'این صفحه در مرحله‌های بعدی ساخت پنل اضافه می‌شود.'}
        actions={
          projectId ? (
            <LinkButton to={ROUTES.project(projectId)} variant="primary" size="sm" icon="layout-dashboard">
              نمای کلی پروژه
            </LinkButton>
          ) : (
            <LinkButton to={ROUTES.dashboard} variant="primary" size="sm" icon="layout-dashboard">
              داشبورد
            </LinkButton>
          )
        }
      />
    </Content>
    </>
  );
}
