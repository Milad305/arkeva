import { ROUTES } from '@/config/routes';
import type { ProjectListItemDto } from '../types';

/** پیش‌نویس ناتمام ویزارد به ویزارد برمی‌گردد (F02 ۵.۵)؛ بقیه به نمای کلی W10. */
export function projectLink(project: Pick<ProjectListItemDto, 'id' | 'wizardIncomplete'>): string {
  return project.wizardIncomplete
    ? `${ROUTES.newProject}?draft=${encodeURIComponent(project.id)}`
    : ROUTES.project(project.id);
}
