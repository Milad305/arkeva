import { useSearchParams } from 'react-router-dom';

import ProjectsPage from './ProjectsPage';
import { NewProjectWizard } from '../components/wizard/NewProjectWizard';

/**
 * `/projects/new` — ویزارد روی فهرست پروژه‌ها (تصمیم 1405/08/15)؛ `?draft=` ادامهٔ
 * پیش‌نویس و `?template=` قالب از پیش انتخاب‌شده («ساخت پروژه از این قالب» در W31).
 */
export default function NewProjectPage() {
  const [params] = useSearchParams();
  return (
    <>
      <ProjectsPage />
      <NewProjectWizard draftId={params.get('draft')} templateId={params.get('template')} />
    </>
  );
}
