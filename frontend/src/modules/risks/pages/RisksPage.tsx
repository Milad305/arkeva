import { Content } from '@/shared/components/layout/AppShell';
import { useProjectContext } from '@/modules/projects/layout/ProjectShell';
import { RiskRegisterView } from '../components/RiskRegisterView';

/** W18 در پوستهٔ پروژه — `/projects/:pid/risks` (risk.view). */
export default function RisksPage() {
  const { project } = useProjectContext();
  return (
    <Content>
      <RiskRegisterView project={project} />
    </Content>
  );
}
