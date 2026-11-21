import { Content } from '@/shared/components/layout/AppShell';
import { Topbar } from '@/shared/components/layout/Topbar';
import { RiskRegisterView } from '../components/RiskRegisterView';

/** W18 سراسری — `/risks`: دفتر همهٔ پروژه‌های قابل‌مشاهده با ستون پروژه (تصمیم 1405/08/15). */
export default function OrgRisksPage() {
  return (
    <>
      <Topbar title="ریسک‌ها" icon="shield-alert" />
      <Content>
      <RiskRegisterView project={null} />
      </Content>
    </>
  );
}
