import type { EntityId } from '@/shared/types/api';

/**
 * مسیرهای اپ — بدون Magic String.
 * هر `<Link to>` و `navigate()` از اینجا می‌آید تا تغییر مسیر یک‌جا انجام شود.
 * نام هر مسیر با آرت‌بورد متناظرش در بوم طراحی کامنت شده است.
 */
export const ROUTES = {
  // ── ورود و دسترسی ──
  login: '/login', // W01 / W02
  otp: '/login/otp', // W03
  resetPassword: '/login/reset', // W04

  // ── سازمان ──
  dashboard: '/dashboard', // W05
  notifications: '/notifications', // W06

  // ── پرتفوی پروژه‌ها ──
  projects: '/projects', // W07 / W08 / W09
  newProject: '/projects/new', // W37 · W47 · W48 · W38

  // ── پروژه ──
  project: (id: EntityId) => `/projects/${id}`, // W10
  wbs: (id: EntityId) => `/projects/${id}/wbs`, // W11 / W13
  wbsItem: (id: EntityId, itemId: EntityId) => `/projects/${id}/wbs?item=${encodeURIComponent(itemId)}`, // W11 با آیتم انتخاب‌شده
  wbsEdit: (id: EntityId, itemId?: EntityId) =>
    `/projects/${id}/wbs/edit${itemId ? `?item=${encodeURIComponent(itemId)}` : ''}`, // W12
  wbsImport: (id: EntityId, mode?: 'replace' | 'append') =>
    `/projects/${id}/wbs/import${mode ? `?mode=${mode}` : ''}`, // W39
  cbs: (id: EntityId) => `/projects/${id}/cbs`, // W14
  cbsItem: (id: EntityId, itemId: EntityId) => `/projects/${id}/cbs?item=${encodeURIComponent(itemId)}`, // W14 با قلم انتخاب‌شده
  cbsEdit: (id: EntityId, itemId?: EntityId) =>
    `/projects/${id}/cbs/edit${itemId ? `?item=${encodeURIComponent(itemId)}` : ''}`, // حالت ویرایش CBS — گام بعد
  links: (id: EntityId) => `/projects/${id}/links`, // W15
  members: (id: EntityId) => `/projects/${id}/members`, // W16
  assignment: (id: EntityId) => `/projects/${id}/assignment`, // W17
  projectRisks: (id: EntityId) => `/projects/${id}/risks`, // W18
  riskDetail: (id: EntityId, riskId: EntityId) => `/projects/${id}/risks/${riskId}`, // W19
  projectReports: (id: EntityId) => `/projects/${id}/reports`, // W20
  projectSettings: (id: EntityId) => `/projects/${id}/settings`, // W28
  settingsWorkflow: (id: EntityId) => `/projects/${id}/settings/workflow`, // W29
  settingsIntegrations: (id: EntityId) => `/projects/${id}/settings/integrations`, // W30
  mspSync: (id: EntityId) => `/projects/${id}/msp/sync`, // W36
  mspExport: (id: EntityId) => `/projects/${id}/msp/export`, // W41 «ساخت XML به‌روز»

  // ── نمودارها ──
  chartsProgress: (id: EntityId) => `/projects/${id}/charts/progress`, // W21
  chartsCost: (id: EntityId) => `/projects/${id}/charts/cost`, // W22
  chartsResources: (id: EntityId) => `/projects/${id}/charts/resources`, // W23
  chartsRisk: (id: EntityId) => `/projects/${id}/charts/risk`, // W24

  // ── سطح سازمان ──
  reports: '/reports', // W20 در نمای سراسری
  risks: '/risks', // W18 در نمای سراسری
  managementReports: '/management-reports', // W25
  users: '/users', // W26
  permissions: '/users/permissions', // W27
  templates: '/templates', // W31
  account: '/account', // W32
  help: '/help', // W33

  // ── ورود از MSP ──
  mspImport: '/msp/import', // W34
  mspMapping: '/msp/import/mapping', // W35
  mspReview: '/msp/import/review', // W49

  // ── گالری کامپوننت‌ها (فقط توسعه) ──
  kit: '/_kit', // W45 + W46 + Design System
} as const;

/**
 * پیوند به بخش‌های دیگر پروژه با آیتم WBS ازپیش‌انتخاب‌شده — دکمه‌های پنل W11.
 * هر صفحه وقتی ساخته شد همین پارامتر `wbsItem` را می‌خواند.
 */
export const WBS_DEEP_LINKS = {
  assignment: (id: EntityId, itemId: EntityId) => `/projects/${id}/assignment?wbsItem=${encodeURIComponent(itemId)}`, // W17
  links: (id: EntityId, itemId: EntityId) => `/projects/${id}/links?wbsItem=${encodeURIComponent(itemId)}`, // W15
  reports: (id: EntityId, itemId: EntityId) => `/projects/${id}/reports?wbsItem=${encodeURIComponent(itemId)}`, // W20
  manualReport: (id: EntityId, itemId: EntityId) =>
    `/projects/${id}/reports?manual=1&wbsItem=${encodeURIComponent(itemId)}`, // G10
  newRisk: (id: EntityId, itemId: EntityId) => `/projects/${id}/risks?new=1&wbsItem=${encodeURIComponent(itemId)}`, // W44
  risks: (id: EntityId, itemId: EntityId) => `/projects/${id}/risks?wbsItem=${encodeURIComponent(itemId)}`, // W18
} as const;

/** پیوندهای عمیق از یک قلم CBS به صفحه‌های دیگر (پارامتر `cbsItem`). */
export const CBS_DEEP_LINKS = {
  links: (id: EntityId, itemId: EntityId) => `/projects/${id}/links?cbsItem=${encodeURIComponent(itemId)}`, // W15
  costTrend: (id: EntityId, itemId: EntityId) => `/projects/${id}/charts/cost?cbsItem=${encodeURIComponent(itemId)}`, // W22
} as const;

/** پارامترهای مسیر که در صفحه‌ها خوانده می‌شوند. */
export const ROUTE_PARAMS = {
  projectId: 'projectId',
  riskId: 'riskId',
} as const;
