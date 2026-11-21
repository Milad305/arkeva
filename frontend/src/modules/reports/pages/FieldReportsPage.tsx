import { Content } from '@/shared/components/layout/AppShell';
import { useProjectContext } from '@/modules/projects/layout/ProjectShell';
import { FieldReportsView } from '../components/FieldReportsView';

/** W20 در پوستهٔ پروژه — `/projects/:pid/reports` (report.view). */
export default function FieldReportsPage() {
  const { project } = useProjectContext();
  return (
    <Content>
      <FieldReportsView project={project} />
    </Content>
  );
}
