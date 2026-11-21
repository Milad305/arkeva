import type { ProjectRoleCode } from '@projeyar/shared';

// شناسه‌های ثابت دادهٔ سیستمی (نه نمایشی): در همهٔ نصب‌ها یکی‌اند و migration آن‌ها را می‌سازد.

/** نقش گروهی پایگاه داده که مجوزها به آن داده می‌شود؛ کاربر اتصال اپ عضو آن است (05 ۴.۳). */
export const APP_DB_ROLE = 'projeyar_app_role';

/** schemaی صف pg-boss؛ migration آن را با نقش مالک می‌سازد (docs/backend/08). */
export const JOB_SCHEMA = 'pgboss';

/** نقش‌های سیستمی (org_id تهی). */
export const SYSTEM_ROLE_IDS: Record<ProjectRoleCode, string> = {
  project_manager: '01930000-0000-7000-8000-000000000301',
  planner: '01930000-0000-7000-8000-000000000302',
  reviewer: '01930000-0000-7000-8000-000000000303',
  supervisor: '01930000-0000-7000-8000-000000000304',
  client_reviewer: '01930000-0000-7000-8000-000000000305',
  finance: '01930000-0000-7000-8000-000000000306',
};

/** ردیف «مدیر سازمان» در W27 — نقش پایگاه داده نیست (isOrgAdmin روی کاربر)؛ فقط شناسهٔ ثابت نمایشی. */
export const ORG_ADMIN_ROLE_ID = '01930000-0000-7000-8000-000000000300';
