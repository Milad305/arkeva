import type { EntityId } from '@/shared/types/api';

// مرکزی‌سازی همه endpointها (مطابق frontend-react.md بخش ۳ — بدون Magic String).
// هر endpoint جدید اینجا اضافه شود.

export const ENDPOINTS = {
  // Auth
  AUTH_LOGIN: '/auth/login',
  AUTH_VERIFY_OTP: '/auth/otp/verify',
  AUTH_RESEND_OTP: '/auth/otp/resend',
  AUTH_REFRESH: '/auth/refresh',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_ME: '/auth/me',
  AUTH_FORGOT_PASSWORD: '/auth/forgot-password',
  AUTH_RESET_VERIFY_CODE: '/auth/password/verify-code', // W04 مرحلهٔ ۲ — کد مصرف نمی‌شود
  AUTH_RESET_RESEND: '/auth/password/resend',
  AUTH_RESET_PASSWORD: '/auth/password/reset',
  AUTH_REGISTER_REQUEST_CODE: '/auth/register/request-code',
  AUTH_REGISTER_VERIFY_CODE: '/auth/register/verify-code',
  AUTH_REGISTER_RESEND: '/auth/register/resend',
  AUTH_REGISTER_COMPLETE: '/auth/register/complete',
  AUTH_STEP_UP: '/auth/step-up', // کد تأیید دوباره برای عمل حساس (F02 ۸.۴، روشن کردن ۲FA)

  // Organizations

  // Users
  USERS: '/users',
  USER_DETAILS: (id: EntityId) => `/users/${id}`,

  // حساب من (W32، F01 ۵.۷) — فقط احراز هویت؛ روی حساب خود کاربر
  ME: '/me', // GET/PATCH
  ME_PASSWORD: '/me/password', // PUT
  ME_SESSIONS: '/me/sessions', // GET؛ DELETE همه جز این دستگاه [پیش‌فرض فنی]
  ME_SESSION: (id: EntityId) => `/me/sessions/${id}`, // DELETE
  ME_LOGIN_HISTORY: '/me/login-history', // GET ?days=30
  ME_BACKUP_CODES: '/me/2fa/backup-codes', // POST
  ME_2FA_ENABLE: '/me/2fa/enable', // POST [پیش‌فرض فنی]
  ME_2FA_DISABLE: '/me/2fa/disable', // POST [پیش‌فرض فنی]
  ME_NOTIFICATION_PREFS: '/me/notification-preferences', // PUT [پیش‌فرض فنی]

  // Roles (کتابخانه نقش‌ها — org-level)
  ROLES: '/roles',
  ROLE_DETAILS: (id: EntityId) => `/roles/${id}`, // DELETE — roles.edit
  ROLE_PERMISSIONS: (id: EntityId) => `/roles/${id}/permissions`, // PUT — roles.edit
  ROLES_IMPACT: '/roles/impact', // POST — roles.edit [پیش‌فرض فنی: چند نقش با هم؛ سند: GET /roles/:id/impact]
  ROLES_AUDIT: '/roles/audit', // roles.edit [پیش‌فرض فنی]
  PERMISSIONS_CATALOG: '/permissions/catalog', // roles.edit

  // کاربران سازمان (W26، F01 ۵.۶)
  USER_UNLOCK: (id: EntityId) => `/users/${id}/unlock`, // users.manage
  USER_DISABLE: (id: EntityId) => `/users/${id}/disable`, // users.manage
  USER_DISABLE_IMPACT: (id: EntityId) => `/users/${id}/disable-impact`, // users.manage [پیش‌فرض فنی]
  USER_ENABLE: (id: EntityId) => `/users/${id}/enable`, // users.manage [پیش‌فرض فنی]
  USERS_IMPORT: '/users/import', // users.invite
  USERS_BULK: '/users/bulk', // users.invite [پیش‌فرض فنی]
  INVITATIONS: '/invitations', // POST — users.invite
  ORG_SECURITY: '/org/security', // PATCH require2fa — org.settings

  // Projects
  PROJECTS: '/projects',
  /** کارت‌های W07 (تصمیم 1405/08/23: جدا از /dashboard که مال W05 است). */
  PROJECTS_SUMMARY: '/projects/summary', // project.view
  PROJECT_DETAILS: (id: EntityId) => `/projects/${id}`,
  // ویزارد ساخت — features/project-setup.md ۱۲ (project.create)
  PROJECT_DRAFTS: '/projects/drafts',
  PROJECT_DRAFT: (id: EntityId) => `/projects/drafts/${id}`,
  PROJECT_DRAFT_CREATE: (id: EntityId) => `/projects/drafts/${id}/create`,
  PROJECT_DRAFT_OPTIONS: '/projects/drafts/options', // [پیش‌فرض فنی]
  PROJECT_DRAFT_SCHEDULE_PREVIEW: '/projects/drafts/schedule-preview', // [پیش‌فرض فنی]
  PROJECT_DRAFT_TEMPLATES: '/projects/drafts/templates', // F16 — [پیش‌فرض فنی]
  PROJECT_DRAFT_TEAM_CHECK: '/projects/drafts/team-check', // [پیش‌فرض فنی]
  PROJECT_DRAFT_SUMMARY: '/projects/drafts/summary', // [پیش‌فرض فنی]
  PROJECT_CODE_AVAILABLE: '/projects/code-available',
  ORG_USERS_SEARCH: '/org/users/search', // [پیش‌فرض فنی]
  // چرخهٔ عمر — features/project-setup.md ۱۲
  PROJECT_ACTIVATE: (id: EntityId) => `/projects/${id}/activate`,
  PROJECT_PAUSE: (id: EntityId) => `/projects/${id}/pause`,
  PROJECT_RESUME: (id: EntityId) => `/projects/${id}/resume`,
  PROJECT_COMPLETE: (id: EntityId) => `/projects/${id}/complete`,
  PROJECT_ARCHIVE: (id: EntityId) => `/projects/${id}/archive`,
  PROJECT_RESTORE: (id: EntityId) => `/projects/${id}/restore`,
  PROJECT_DELETE: (id: EntityId) => `/projects/${id}/delete`,
  PROJECT_ACTIVATION_CHECK: (id: EntityId) => `/projects/${id}/activation-check`,
  // نمای کلی W10 — features/charts.md ۹
  PROJECT_OVERVIEW: (id: EntityId) => `/projects/${id}/overview`,
  // F17 — charts.md ۹ (charts.view؛ هزینه با charts.view_cost)
  CHARTS_PROGRESS: (id: EntityId) => `/projects/${id}/charts/progress`,
  CHARTS_COST: (id: EntityId) => `/projects/${id}/charts/cost`,
  CHARTS_RESOURCES: (id: EntityId) => `/projects/${id}/charts/resources`,
  CHARTS_RISK: (id: EntityId) => `/projects/${id}/charts/risk`,
  APPROVER_REMIND: (id: EntityId, userId: EntityId) => `/projects/${id}/approvers/${userId}/remind`, // report.approve.stage2 — [پیش‌فرض فنی]
  APPROVER_REASSIGN: (id: EntityId, userId: EntityId) =>
    `/projects/${id}/approvers/${userId}/reassign`, // report.approve.stage2 — [پیش‌فرض فنی]
  // «این عدد از کجا آمد؟» — features/progress-calculation.md (G9)
  PROJECT_PROGRESS_EXPLAIN: (id: EntityId) => `/projects/${id}/progress/explain`,
  // فعالیت‌های اخیر — features/platform.md ۱۰. [پیش‌فرض فنی] مسیر در سند نیامده
  PROJECT_ACTIVITY: (id: EntityId) => `/projects/${id}/activity`,

  // Project members
  PROJECT_MEMBERS: (projectId: EntityId) => `/projects/${projectId}/members`,
  PROJECT_MEMBER_DETAILS: (projectId: EntityId, memberId: EntityId) =>
    `/projects/${projectId}/members/${memberId}`,
  PROJECT_MEMBER_REMOVAL_IMPACT: (projectId: EntityId, userId: EntityId) =>
    `/projects/${projectId}/members/${userId}/removal-impact`, // team.manage
  INVITATION_RESEND: (invitationId: EntityId) => `/invitations/${invitationId}/resend`, // team.manage
  INVITATION: (invitationId: EntityId) => `/invitations/${invitationId}`, // DELETE — team.manage
  APPROVAL_ROUTES: (projectId: EntityId) => `/projects/${projectId}/approval-routes`, // team.view | approval_routes.manage

  // WBS — features/wbs.md ۱۱
  WBS_TREE: (projectId: EntityId) => `/projects/${projectId}/wbs`, // ?include=progress · wbs.view
  WBS_ITEM: (projectId: EntityId, itemId: EntityId) => `/projects/${projectId}/wbs/${itemId}`, // wbs.view
  WBS_STATUS_NOTE: (projectId: EntityId, itemId: EntityId) =>
    `/projects/${projectId}/wbs/${itemId}/status-note`, // wbs.edit_note
  WBS_IMPORT_PREVIEW: (projectId: EntityId) =>
    `/projects/${projectId}/plan-draft/wbs/import/preview`, // plan.edit_draft
  WBS_IMPORT_CONFIRM: (projectId: EntityId) =>
    `/projects/${projectId}/plan-draft/wbs/import/confirm`, // plan.edit_draft
  WBS_DRAFT_OPS: (projectId: EntityId) => `/projects/${projectId}/plan-draft/wbs/ops`, // plan.edit_draft
  // [پیش‌فرض فنی] درخت نسخهٔ کاری (یا کپی جاری اگر هنوز نیست) با قفل‌ها و اعتبارسنجی
  WBS_DRAFT_TREE: (projectId: EntityId) => `/projects/${projectId}/plan-draft/wbs`, // plan.edit_draft
  // [پیشنهاد تأییدشده 1405/08/15] اجرای عملیات بدون نوشتن — «کمک ویرایش» سمت سرور
  WBS_DRAFT_OPS_PREVIEW: (projectId: EntityId) =>
    `/projects/${projectId}/plan-draft/wbs/ops/preview`, // plan.edit_draft

  // جستجوی سریع (W43) — features/platform.md ۹
  SEARCH: '/search', // ?q=&kind= — هر نتیجه با دسترسی خودِ موضوع فیلتر می‌شود

  // ورود و همگام‌سازی MSP (W34، W35، W49، W36) — features/msp-integration.md ۱۰
  MSP_IMPORTS: (projectId: EntityId) => `/projects/${projectId}/msp/imports`, // POST فایل — msp.import
  MSP_IMPORT: (id: EntityId) => `/msp/imports/${id}`, // msp.import
  MSP_IMPORT_MAPPING: (id: EntityId) => `/msp/imports/${id}/mapping`, // PUT (نگاشت، منابع، وزن) — msp.import
  MSP_IMPORT_PREVIEW: (id: EntityId) => `/msp/imports/${id}/preview`, // msp.import
  MSP_IMPORT_BUILD: (id: EntityId) => `/msp/imports/${id}/build`, // msp.import
  MSP_IMPORT_ROLLBACK: (id: EntityId) => `/msp/imports/${id}/rollback`, // msp.import
  MSP_MAPPING_OPTIONS: '/org/msp-templates', // ?projectId= — فیلدها، سرپرستان پروژه و الگوها — msp.import (تصمیم 1405/08/26)
  MSP_SYNCS: (projectId: EntityId) => `/projects/${projectId}/msp/syncs`, // msp.sync
  MSP_SYNC_CHANGES: (id: EntityId) => `/msp/syncs/${id}/changes`, // msp.sync
  MSP_SYNC_CHANGE: (id: EntityId, changeId: string) => `/msp/syncs/${id}/changes/${changeId}`, // msp.sync
  MSP_SYNC_APPLY: (id: EntityId) => `/msp/syncs/${id}/apply`, // msp.sync
  MSP_EXPORT_PREVIEW: (projectId: EntityId) => `/projects/${projectId}/msp/export-preview`, // msp.export
  MSP_EXPORT: (projectId: EntityId) => `/projects/${projectId}/msp/export`, // msp.export (فایل XML)

  // گزارش‌های مدیریتی (W25) — features/management-reports.md ۱۱
  REPORT_TEMPLATES: '/report-templates', // GET (reports.view) · POST (reports.custom_template)
  REPORT_OPTIONS: '/report-templates/options', // [پیش‌فرض فنی] پروژه‌ها، کاربران و نقش‌ها برای فرم‌ها
  REPORT_RANGES: '/report-templates/ranges', // [پیش‌فرض فنی] بازه‌های آماده (۷.۱)
  REPORT_PREVIEW: (projectId: EntityId) => `/projects/${projectId}/reports/preview`, // reports.view
  PROJECT_REPORTS: (projectId: EntityId) => `/projects/${projectId}/reports`, // GET · POST (reports.generate)
  REPORT_SEND: (projectId: EntityId) => `/projects/${projectId}/reports/send`, // [پیش‌فرض فنی] (reports.send_external برای نشانی بیرونی)
  GENERATED_REPORTS: '/reports', // [پیش‌فرض فنی] خروجی‌های همهٔ پروژه‌های کاربر
  GENERATED_REPORT: (id: EntityId) => `/reports/${id}`, // DELETE (۷.۵) · GET .../download
  REPORT_SCHEDULES: '/report-schedules', // GET · POST — reports.schedule
  REPORT_SCHEDULE: (id: EntityId) => `/report-schedules/${id}`, // PATCH · DELETE
  REPORT_SCHEDULE_RUN: (id: EntityId) => `/report-schedules/${id}/run-now`,

  // قالب‌ها (W31) — features/templates.md ۹
  TEMPLATES: '/templates', // GET ?type=&status= (templates.view) · POST (templates.manage)
  TEMPLATE_DETAILS: (id: EntityId) => `/templates/${id}`, // GET (templates.view) · PATCH isDefaultForType · DELETE (templates.manage)
  TEMPLATE_VERSIONS: (id: EntityId) => `/templates/${id}/versions`, // templates.view
  // [پیش‌فرض فنی] پیش‌نمایش ساخت پروژه از قالب با بودجه و مدت دلخواه (۵.۳)
  TEMPLATE_PREVIEW: (id: EntityId) => `/templates/${id}/preview`, // templates.view
  TEMPLATE_DRAFT: (id: EntityId) => `/templates/${id}/draft`, // PUT — templates.manage
  TEMPLATE_VALIDATE: (id: EntityId) => `/templates/${id}/validate`, // templates.manage
  TEMPLATE_PUBLISH: (id: EntityId) => `/templates/${id}/publish`, // templates.publish
  TEMPLATE_ARCHIVE: (id: EntityId) => `/templates/${id}/archive`, // templates.manage
  TEMPLATE_FROM_PROJECT: '/templates/from-project', // templates.manage
  TEMPLATE_IMPORT: '/templates/import', // templates.manage

  // نسخه‌های برنامه — features/plan-versions.md ۱۲
  PLAN_DRAFT: (projectId: EntityId) => `/projects/${projectId}/plan-draft`, // GET · POST · DELETE (plan.discard)
  PLAN_DRAFT_VALIDATION: (projectId: EntityId) => `/projects/${projectId}/plan-draft/validation`, // plan.edit_draft
  PLAN_DRAFT_IMPACT: (projectId: EntityId) => `/projects/${projectId}/plan-draft/impact`,
  PLAN_DRAFT_APPLY: (projectId: EntityId) => `/projects/${projectId}/plan-draft/apply`, // plan.apply

  // CBS
  CBS_TREE: (projectId: EntityId) => `/projects/${projectId}/cbs`,
  CBS_ITEM: (projectId: EntityId, itemId: EntityId) => `/projects/${projectId}/cbs/${itemId}`,
  BUDGET_REVISIONS: (projectId: EntityId) => `/projects/${projectId}/budget-revisions`, // cbs.view | cbs.request_revision
  BUDGET_REVISION_DECIDE: (
    projectId: EntityId,
    requestId: EntityId,
    decision: 'approve' | 'reject',
  ) => `/projects/${projectId}/budget-revisions/${requestId}/${decision}`, // cbs.approve_revision
  CBS_DRAFT_TREE: (projectId: EntityId) => `/projects/${projectId}/plan-draft/cbs`, // plan.edit_draft
  CBS_DRAFT_OPS: (projectId: EntityId) => `/projects/${projectId}/plan-draft/cbs/ops`, // plan.edit_draft
  CBS_DRAFT_OPS_PREVIEW: (projectId: EntityId) =>
    `/projects/${projectId}/plan-draft/cbs/ops/preview`, // plan.edit_draft
  CBS_IMPORT_PREVIEW: (projectId: EntityId) =>
    `/projects/${projectId}/plan-draft/cbs/import/preview`, // plan.edit_draft
  CBS_IMPORT_CONFIRM: (projectId: EntityId) =>
    `/projects/${projectId}/plan-draft/cbs/import/confirm`, // plan.edit_draft

  // Links (WBS↔CBS)
  LINKS: (projectId: EntityId) => `/projects/${projectId}/links`,
  LINKS_DRAFT: (projectId: EntityId) => `/projects/${projectId}/plan-draft/links`, // plan.edit_draft
  LINKS_DRAFT_OPS: (projectId: EntityId) => `/projects/${projectId}/plan-draft/links/ops`, // plan.edit_draft
  LINKS_DRAFT_OPS_PREVIEW: (projectId: EntityId) =>
    `/projects/${projectId}/plan-draft/links/ops/preview`, // plan.edit_draft
  LINKS_IMPORT_PREVIEW: (projectId: EntityId) =>
    `/projects/${projectId}/plan-draft/links/import/preview`, // plan.edit_draft
  LINKS_IMPORT_CONFIRM: (projectId: EntityId) =>
    `/projects/${projectId}/plan-draft/links/import/confirm`, // plan.edit_draft

  // Risks — features/risk.md ۱۰
  PROJECT_RISKS: (projectId: EntityId) => `/projects/${projectId}/risks`, // risk.view | risk.create
  RISKS: '/risks', // risk.view — نمای سراسری (تصمیم 1405/08/15)
  RISK_PEOPLE: (projectId: EntityId) => `/projects/${projectId}/risks/people`, // risk.view — اعضا برای مالک و @نام
  RISK: (riskId: EntityId) => `/risks/${riskId}`, // GET risk.view · PATCH risk.edit
  RISK_STATUS: (riskId: EntityId) => `/risks/${riskId}/status`, // risk.change_status_owner
  RISK_ACTIONS: (riskId: EntityId) => `/risks/${riskId}/actions`, // risk.edit
  RISK_ACTION: (actionId: EntityId) => `/risk-actions/${actionId}`, // risk.edit
  RISK_NOTES: (riskId: EntityId) => `/risks/${riskId}/notes`, // risk.view
  RISK_FOLLOW: (riskId: EntityId) => `/risks/${riskId}/follow`, // risk.view
  RISK_CONTINGENCY: (riskId: EntityId) => `/risks/${riskId}/contingency`, // risk.allocate_contingency
  RISK_MERGE: (riskId: EntityId) => `/risks/${riskId}/merge`, // risk.view (پیشنهاد) | risk.change_status_owner (ادغام)

  // Assignments (تخصیص WBS به سرپرستان)
  ASSIGNMENTS: (projectId: EntityId) => `/projects/${projectId}/assignments`,
  ASSIGNMENTS_PREVIEW: (projectId: EntityId) => `/projects/${projectId}/assignments/preview`, // assignment.manage

  // Notifications — features/notifications.md ۹ (notifications.view_own)
  NOTIFICATIONS: '/notifications',
  NOTIFICATIONS_UNREAD_COUNT: '/notifications/unread-count',
  NOTIFICATION_READ: (id: EntityId) => `/notifications/${id}/read`,
  NOTIFICATIONS_READ_ALL: '/notifications/read-all',

  // Field reports — features/approval-workflow.md ۸
  FIELD_INBOX: '/inbox/field-items', // report.view (دامنه D11)
  FIELD_REPORT: (projectId: EntityId, reportId: EntityId) =>
    `/projects/${projectId}/field-reports/${reportId}`, // report.view
  FIELD_ITEM_DECISION: (projectId: EntityId, itemId: EntityId) =>
    `/projects/${projectId}/field-items/${itemId}/decision`, // report.approve.stage1 | stage2
  FIELD_REPORT_APPROVE_CLEAN: (projectId: EntityId, reportId: EntityId) =>
    `/projects/${projectId}/field-reports/${reportId}/approve-clean`, // report.approve.stage1
  FIELD_REPORT_REQUEST_REVISION: (projectId: EntityId, reportId: EntityId) =>
    `/projects/${projectId}/field-reports/${reportId}/request-revision`, // report.approve.stage1 — تصمیم 1405/08/15
  FIELD_ITEM_REVOKE_AUTO: (projectId: EntityId, itemId: EntityId) =>
    `/projects/${projectId}/field-items/${itemId}/revoke-auto`, // report.approve.stage1
  FIELD_ITEM_CORRECT: (projectId: EntityId, itemId: EntityId) =>
    `/projects/${projectId}/field-items/${itemId}/correct`, // report.correct
  FIELD_ITEM_RESOLVE: (projectId: EntityId, itemId: EntityId) =>
    `/projects/${projectId}/field-items/${itemId}/resolve`, // report.resolve
  FIELD_REPORT_MANUAL: (projectId: EntityId) => `/projects/${projectId}/field-reports/manual`, // report.manual_entry
  WBS_REPORT_CONTEXT: (projectId: EntityId, itemId: EntityId) =>
    `/projects/${projectId}/wbs/${itemId}/report-context`, // report.manual_entry | report.correct

  // Settings
  PROJECT_SETTINGS: (projectId: EntityId) => `/projects/${projectId}/settings`,
  // تنظیمات W28–W30 — project-setup.md ۱۲، notifications.md ۹، 04 ۸
  PROJECT_CALENDAR: (projectId: EntityId) => `/projects/${projectId}/calendar`, // project.settings.edit
  PROJECT_CALENDAR_OFFICIAL: (projectId: EntityId, year: number) =>
    `/projects/${projectId}/calendar/official-holidays/${year}`, // project.settings.edit
  APPROVAL_ROUTES_PUT: (projectId: EntityId) => `/projects/${projectId}/approval-routes`, // approval_routes.manage
  PROJECT_PERIOD_CLOSE: (projectId: EntityId, periodId: EntityId) =>
    `/projects/${projectId}/periods/${periodId}/close`, // period.close
  NOTIFICATION_MATRIX: (projectId: EntityId) => `/projects/${projectId}/notification-matrix`, // notifications.configure_project
  ALERT_RULE: (projectId: EntityId, code: string) => `/projects/${projectId}/alert-rules/${code}`, // alerts.configure
  PROJECT_BACKUPS: (projectId: EntityId) => `/projects/${projectId}/backups`, // project.settings.edit — platform ۱۲
  PROJECT_TRANSFER_MANAGER: (projectId: EntityId) => `/projects/${projectId}/transfer-manager`, // project.transfer_manager
  PROJECT_P6_XER: (projectId: EntityId) => `/projects/${projectId}/integrations/p6/xer`, // integrations.export_p6 — F19 ۶.۳
  PROJECT_FULL_EXPORT: (projectId: EntityId) => `/projects/${projectId}/exports/full`, // export.full — platform ۱۲
  PROJECT_FULL_EXPORT_DOWNLOAD: (projectId: EntityId, exportId: EntityId) =>
    `/projects/${projectId}/exports/full/${exportId}/download`, // export.full

  // فعالیت‌های اخیر همهٔ پروژه‌های کاربر (W05) — [پیش‌فرض فنی] مسیر در platform.md ۱۰ نیامده
  ACTIVITY_MINE: '/activity',
  // هشدارها — 04-alert-engine.md ۸ · alerts.view
  ALERTS_MINE: '/alerts/mine',
  ALERTS: (projectId: EntityId) => `/projects/${projectId}/alerts`,
  ALERT_SEEN: (alertId: EntityId) => `/alerts/${alertId}/seen`,
  ALERT_DISMISS: (alertId: EntityId) => `/alerts/${alertId}/dismiss`,

  // داشبورد سازمان W05 — charts.md ۶.۱. [پیش‌فرض فنی] یک پاسخ تجمیعی برای کارت‌ها
  DASHBOARD: '/dashboard',
} as const;

export type Endpoint = (typeof ENDPOINTS)[keyof typeof ENDPOINTS];
