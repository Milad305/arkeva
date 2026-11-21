// مرکزی‌سازی همه endpointها (مطابق frontend-react.md بخش ۳ — بدون Magic String).
// هر endpoint جدید اینجا اضافه شود.

export const ENDPOINTS = {
  // Auth
  AUTH_LOGIN: '/auth/login',
  AUTH_VERIFY_OTP: '/auth/verify-otp',
  AUTH_REFRESH: '/auth/refresh',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_ME: '/auth/me',
  AUTH_FORGOT_PASSWORD: '/auth/forgot-password',

  // Organizations
  ORGANIZATIONS: '/organizations',
  ORGANIZATION_DETAILS: (id: number) => `/organizations/${id}`,

  // Users
  USERS: '/users',
  USER_DETAILS: (id: number) => `/users/${id}`,
  USER_PROFILE: '/users/profile',

  // Roles (کتابخانه نقش‌ها — org-level)
  ROLES: '/roles',
  ROLE_DETAILS: (id: number) => `/roles/${id}`,

  // Projects
  PROJECTS: '/projects',
  PROJECT_DETAILS: (id: number) => `/projects/${id}`,
  PROJECT_ACTIVATE: (id: number) => `/projects/${id}/activate`,
  PROJECT_ARCHIVE: (id: number) => `/projects/${id}/archive`,
  PROJECT_OVERVIEW_KPIS: (id: number) => `/projects/${id}/overview/kpis`,
  PROJECT_CRITICAL_WBS: (id: number) => `/projects/${id}/wbs/critical`,
  PROJECT_TOP_CBS: (id: number) => `/projects/${id}/cbs/top-spend`,
  PROJECT_S_CURVE: (id: number) => `/projects/${id}/charts/s-curve`,

  // Project members
  PROJECT_MEMBERS: (projectId: number) => `/projects/${projectId}/members`,
  PROJECT_MEMBER_DETAILS: (projectId: number, memberId: number) =>
    `/projects/${projectId}/members/${memberId}`,

  // WBS
  WBS_TREE: (projectId: number) => `/projects/${projectId}/wbs`,
  WBS_ITEM: (projectId: number, itemId: number) => `/projects/${projectId}/wbs/${itemId}`,
  WBS_IMPORT: (projectId: number) => `/projects/${projectId}/wbs/import`,
  WBS_EXPORT: (projectId: number) => `/projects/${projectId}/wbs/export`,

  // CBS
  CBS_CATALOG: '/cbs/catalog',
  CBS_TREE: (projectId: number) => `/projects/${projectId}/cbs`,
  CBS_ITEM: (projectId: number, itemId: number) => `/projects/${projectId}/cbs/${itemId}`,

  // Links (WBS↔CBS)
  LINKS: (projectId: number) => `/projects/${projectId}/links`,
  LINK_DETAILS: (projectId: number, linkId: number) => `/projects/${projectId}/links/${linkId}`,

  // Assignments (تخصیص WBS به سرپرستان)
  ASSIGNMENTS: (projectId: number) => `/projects/${projectId}/assignments`,

  // Field reports
  FIELD_REPORTS: (projectId?: number) => (projectId ? `/projects/${projectId}/reports` : '/reports'),
  FIELD_REPORT_DETAILS: (id: number) => `/reports/${id}`,
  FIELD_REPORT_APPROVE_ITEM: (reportId: number, itemId: number) =>
    `/reports/${reportId}/items/${itemId}/approve`,
  FIELD_REPORT_REJECT_ITEM: (reportId: number, itemId: number) =>
    `/reports/${reportId}/items/${itemId}/reject`,

  // Settings
  PROJECT_SETTINGS: (projectId: number) => `/projects/${projectId}/settings`,
  PROJECT_HOLIDAYS: (projectId: number) => `/projects/${projectId}/holidays`,
  PROJECT_INTEGRATIONS: (projectId: number) => `/projects/${projectId}/integrations`,

  // Activity log & alerts
  ACTIVITY_LOG: '/activity-log',
  ALERTS: '/alerts',

  // Dashboard
  DASHBOARD: '/dashboard',
} as const;

export type Endpoint = (typeof ENDPOINTS)[keyof typeof ENDPOINTS];
