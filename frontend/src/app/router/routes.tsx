import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import { ROUTE_PARAMS, ROUTES } from '@/config/routes';
import { DisplayPrefsSync } from '@/modules/account/components/DisplayPrefsSync';
import { AppShell, Content } from '@/shared/components/layout/AppShell';
import { InlineLoading } from '@/shared/components/feedback/Skeleton';
import { ProtectedRoute } from './ProtectedRoute';
import { NotFoundPage } from '@/modules/system/pages/NotFoundPage';
import { ROUTER_BASENAME } from '@/shared/utils/appUrl';

// همهٔ صفحه‌ها lazy هستند تا هر ماژول chunk خودش را داشته باشد.
const LoginPage = lazy(() => import('@/modules/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/modules/auth/pages/RegisterPage'));
const OtpPage = lazy(() => import('@/modules/auth/pages/OtpPage'));
const ResetPasswordPage = lazy(() => import('@/modules/auth/pages/ResetPasswordPage'));
const ProjectsPage = lazy(() => import('@/modules/projects/pages/ProjectsPage'));
const KitPage = lazy(() => import('@/modules/system/pages/KitPage'));
const ProjectShell = lazy(() => import('@/modules/projects/layout/ProjectShell'));
const ProjectOverviewPage = lazy(() => import('@/modules/charts/pages/ProjectOverviewPage'));
const SectionPendingPage = lazy(() => import('@/modules/system/pages/SectionPendingPage'));
const WbsPage = lazy(() => import('@/modules/wbs/pages/WbsPage'));
const WbsEditPage = lazy(() => import('@/modules/wbs/pages/WbsEditPage'));
const CbsPage = lazy(() => import('@/modules/cbs/pages/CbsPage'));
const CbsEditPage = lazy(() => import('@/modules/cbs/pages/CbsEditPage'));
const LinksPage = lazy(() => import('@/modules/links/pages/LinksPage'));
const MembersPage = lazy(() => import('@/modules/team/pages/MembersPage'));
const AssignmentPage = lazy(() => import('@/modules/team/pages/AssignmentPage'));
const RisksPage = lazy(() => import('@/modules/risks/pages/RisksPage'));
const RiskDetailPage = lazy(() => import('@/modules/risks/pages/RiskDetailPage'));
const OrgRisksPage = lazy(() => import('@/modules/risks/pages/OrgRisksPage'));
const FieldReportsPage = lazy(() => import('@/modules/reports/pages/FieldReportsPage'));
const OrgFieldReportsPage = lazy(() => import('@/modules/reports/pages/OrgFieldReportsPage'));
const NotificationsPage = lazy(() => import('@/modules/notifications/pages/NotificationsPage'));
const NewProjectPage = lazy(() => import('@/modules/projects/pages/NewProjectPage'));
const ChartsLayout = lazy(() => import('@/modules/charts/pages/analytics/ChartsLayout'));
const ProgressChartsPage = lazy(() => import('@/modules/charts/pages/analytics/ProgressChartsPage'));
const CostChartsPage = lazy(() => import('@/modules/charts/pages/analytics/CostChartsPage'));
const ResourcesChartsPage = lazy(() => import('@/modules/charts/pages/analytics/ResourcesChartsPage'));
const RiskChartsPage = lazy(() => import('@/modules/charts/pages/analytics/RiskChartsPage'));
const ProjectSettingsLayout = lazy(() => import('@/modules/settings/pages/ProjectSettingsLayout'));
const GeneralSettingsPage = lazy(() => import('@/modules/settings/pages/GeneralSettingsPage'));
const WorkflowSettingsPage = lazy(() => import('@/modules/settings/pages/WorkflowSettingsPage'));
const IntegrationSettingsPage = lazy(() => import('@/modules/settings/pages/IntegrationSettingsPage'));
const AccountPage = lazy(() => import('@/modules/account/pages/AccountPage'));
const HelpPage = lazy(() => import('@/modules/help/pages/HelpPage'));
const UsersPage = lazy(() => import('@/modules/users/pages/UsersPage'));
const PermissionsPage = lazy(() => import('@/modules/users/pages/PermissionsPage'));
const DashboardPage = lazy(() => import('@/modules/dashboard/pages/DashboardPage'));
const TemplatesPage = lazy(() => import('@/modules/templates/pages/TemplatesPage'));
const ManagementReportsPage = lazy(() => import('@/modules/managementReports/pages/ManagementReportsPage'));
const MspImportPage = lazy(() => import('@/modules/msp/pages/MspImportPage'));
const MspSyncPage = lazy(() => import('@/modules/msp/pages/MspSyncPage'));

/**
 * صفحه‌های سطح سازمان که هنوز ساخته نشده‌اند — تا پیوندهای نوار کناری و W05 به ۴۰۴
 * نروند. با ساخت هر صفحه از این فهرست حذف می‌شود.
 */
const PENDING_ORG_PAGES: Array<[path: string, title: string]> = [
  ['/settings/*', 'تنظیمات'],
];

function withSuspense(element: ReactNode): ReactNode {
  return <Suspense fallback={<PageLoading />}>{element}</Suspense>;
}

function PageLoading() {
  return (
    <Content>
      <InlineLoading />
    </Content>
  );
}

/** صفحه‌های ورود پوستهٔ خودشان را دارند و بیرون از AppShell می‌نشینند. */
function AuthRoute({ element }: { element: ReactNode }) {
  return <Suspense fallback={null}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  { path: ROUTES.login, element: <AuthRoute element={<LoginPage />} /> },
  { path: ROUTES.register, element: <AuthRoute element={<RegisterPage />} /> },
  { path: ROUTES.otp, element: <AuthRoute element={<OtpPage />} /> },
  { path: ROUTES.resetPassword, element: <AuthRoute element={<ResetPasswordPage />} /> },

  {
    element: (
      <ProtectedRoute>
        <DisplayPrefsSync />
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      // «خانه» در مسیر بالای همهٔ صفحه‌ها داشبورد است (W05)
      { path: '/', element: <Navigate to={ROUTES.dashboard} replace /> },
      { path: ROUTES.dashboard, element: withSuspense(<DashboardPage />) },
      { path: ROUTES.notifications, element: withSuspense(<NotificationsPage />) },
      {
        path: ROUTES.reports,
        element: <ProtectedRoute permissions={['report.view']}>{withSuspense(<OrgFieldReportsPage />)}</ProtectedRoute>,
      },
      {
        path: ROUTES.risks,
        element: <ProtectedRoute permissions={['risk.view']}>{withSuspense(<OrgRisksPage />)}</ProtectedRoute>,
      },
      { path: ROUTES.account, element: withSuspense(<AccountPage />) },
      { path: ROUTES.help, element: withSuspense(<HelpPage />) },
      {
        path: ROUTES.users,
        element: <ProtectedRoute permissions={['users.invite']}>{withSuspense(<UsersPage />)}</ProtectedRoute>,
      },
      {
        path: ROUTES.permissions,
        element: <ProtectedRoute permissions={['roles.edit']}>{withSuspense(<PermissionsPage />)}</ProtectedRoute>,
      },
      {
        path: ROUTES.templates,
        element: <ProtectedRoute permissions={['templates.view']}>{withSuspense(<TemplatesPage />)}</ProtectedRoute>,
      },
      {
        path: ROUTES.managementReports,
        element: <ProtectedRoute permissions={['reports.view']}>{withSuspense(<ManagementReportsPage />)}</ProtectedRoute>,
      },
      {
        path: ROUTES.mspImport,
        element: <ProtectedRoute permissions={['msp.import']}>{withSuspense(<MspImportPage step={1} />)}</ProtectedRoute>,
      },
      {
        path: ROUTES.mspMapping,
        element: <ProtectedRoute permissions={['msp.import']}>{withSuspense(<MspImportPage step={2} />)}</ProtectedRoute>,
      },
      {
        path: ROUTES.mspReview,
        element: <ProtectedRoute permissions={['msp.import']}>{withSuspense(<MspImportPage step={3} />)}</ProtectedRoute>,
      },
      ...PENDING_ORG_PAGES.map(([path, title]) => ({
        path,
        element: withSuspense(<SectionPendingPage title={title} />),
      })),
      {
        path: ROUTES.newProject,
        element: <ProtectedRoute permissions={['project.create']}>{withSuspense(<NewProjectPage />)}</ProtectedRoute>,
      },
      {
        path: ROUTES.projects,
        element: (
          <ProtectedRoute permissions={['project.view']}>{withSuspense(<ProjectsPage />)}</ProtectedRoute>
        ),
      },
      {
        // پوستهٔ پروژه: سربرگ و زبانه‌ها یک‌بار؛ هر زبانه فرزند آن است
        path: ROUTES.project(`:${ROUTE_PARAMS.projectId}`),
        element: (
          <ProtectedRoute permissions={['project.view']}>{withSuspense(<ProjectShell />)}</ProtectedRoute>
        ),
        children: [
          { index: true, element: withSuspense(<ProjectOverviewPage />) },
          {
            path: 'wbs',
            element: <ProtectedRoute permissions={['wbs.view']}>{withSuspense(<WbsPage />)}</ProtectedRoute>,
          },
          {
            // W39 — دیالوگ ورود Excel روی W11 (wbs.md ۶.۲)
            path: 'wbs/import',
            element: <ProtectedRoute permissions={['plan.edit_draft']}>{withSuspense(<WbsPage />)}</ProtectedRoute>,
          },
          {
            path: 'wbs/edit',
            element: <ProtectedRoute permissions={['plan.edit_draft']}>{withSuspense(<WbsEditPage />)}</ProtectedRoute>,
          },
          {
            path: 'cbs',
            element: <ProtectedRoute permissions={['cbs.view']}>{withSuspense(<CbsPage />)}</ProtectedRoute>,
          },
          {
            path: 'members',
            element: <ProtectedRoute permissions={['team.view']}>{withSuspense(<MembersPage />)}</ProtectedRoute>,
          },
          {
            path: 'assignment',
            element: <ProtectedRoute permissions={['team.view']}>{withSuspense(<AssignmentPage />)}</ProtectedRoute>,
          },
          {
            path: 'links',
            element: <ProtectedRoute permissions={['cbs.view']}>{withSuspense(<LinksPage />)}</ProtectedRoute>,
          },
          {
            path: 'cbs/edit',
            element: <ProtectedRoute permissions={['plan.edit_draft']}>{withSuspense(<CbsEditPage />)}</ProtectedRoute>,
          },
          {
            // W28–W30 — تنظیمات پروژه (F02 ۷)
            path: 'settings',
            element: <ProtectedRoute permissions={['project.view']}>{withSuspense(<ProjectSettingsLayout />)}</ProtectedRoute>,
            children: [
              { index: true, element: withSuspense(<GeneralSettingsPage />) },
              { path: 'workflow', element: withSuspense(<WorkflowSettingsPage />) },
              { path: 'integrations', element: withSuspense(<IntegrationSettingsPage />) },
            ],
          },
          {
            // F17 — W21 تا W24 (charts.md ۶.۳–۶.۶)
            path: 'charts',
            // دسترسی (charts.view یا charts.view_summary) را خود پوسته می‌سنجد
            element: withSuspense(<ChartsLayout />),
            children: [
              { index: true, element: <Navigate to="progress" replace /> },
              { path: 'progress', element: withSuspense(<ProgressChartsPage />) },
              { path: 'cost', element: <ProtectedRoute permissions={['cbs.view_amounts']}>{withSuspense(<CostChartsPage />)}</ProtectedRoute> },
              { path: 'resources', element: <ProtectedRoute permissions={['charts.view']}>{withSuspense(<ResourcesChartsPage />)}</ProtectedRoute> },
              { path: 'risk', element: withSuspense(<RiskChartsPage />) },
            ],
          },
          {
            path: 'reports',
            element: <ProtectedRoute permissions={['report.view']}>{withSuspense(<FieldReportsPage />)}</ProtectedRoute>,
          },
          {
            path: 'risks',
            element: <ProtectedRoute permissions={['risk.view']}>{withSuspense(<RisksPage />)}</ProtectedRoute>,
          },
          {
            path: 'risks/:riskId',
            element: <ProtectedRoute permissions={['risk.view']}>{withSuspense(<RiskDetailPage />)}</ProtectedRoute>,
          },
          {
            path: 'msp/sync',
            element: <ProtectedRoute permissions={['msp.sync']}>{withSuspense(<MspSyncPage />)}</ProtectedRoute>,
          },
        ],
      },
      { path: ROUTES.kit, element: withSuspense(<KitPage />) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
], { basename: ROUTER_BASENAME });
