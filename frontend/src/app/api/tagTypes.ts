/**
 * برچسب‌های کش RTK Query.
 * هر query باید `providesTags` داشته باشد و هر mutation `invalidatesTags`
 * (قاعدهٔ frontend-react.md بخش ۴) — هیچ‌وقت `refetch()` دستی در useEffect.
 */
export const TAG_TYPES = [
  'Auth',
  'Organization',
  'User',
  'Role',
  'Permission',
  'Project',
  'ProjectMember',
  'ProjectSettings',
  'WbsItem',
  'PlanVersion',
  'CbsItem',
  'CbsCatalog',
  'Link',
  'Assignment',
  'FieldReport',
  'FieldReportItem',
  'Risk',
  'RiskAction',
  'Template',
  'MspSession',
  'Chart',
  'ManagementReport',
  'ActivityLog',
  'Notification',
  'Alert',
  'Dashboard',
] as const;

export type TagType = (typeof TAG_TYPES)[number];

/** شناسهٔ مجازی فهرست یک موجودیت — برای ابطال کل لیست بعد از ساخت/حذف. */
export const LIST_ID = 'LIST' as const;
