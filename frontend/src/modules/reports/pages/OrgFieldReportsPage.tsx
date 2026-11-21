import { Content } from '@/shared/components/layout/AppShell';
import { Topbar } from '@/shared/components/layout/Topbar';
import { FieldReportsView } from '../components/FieldReportsView';

/** W20 میان‌پروژه‌ای — `/reports` (approval-workflow.md ۵.۱). */
export default function OrgFieldReportsPage() {
  return (
    <>
      <Topbar title="گزارش‌های کارگاه" icon="clipboard-check" />
      <Content>
      <FieldReportsView project={null} />
      </Content>
    </>
  );
}
