import { useHasPermission } from '@/shared/hooks/useHasAccess';
import type { ProjectDetailDto } from '@/modules/projects/types';

/**
 * آنچه کاربر در W11 می‌تواند — کد دسترسی (D11) **و** وضعیت پروژه با هم.
 *
 * وضعیت‌ها از F02: پروژهٔ تمام‌شده و بایگانی فقط‌خواندنی است؛ پیش‌نویس هنوز گزارش
 * نمی‌گیرد؛ در پروژهٔ فعال و متوقف ویرایش برنامه در نسخهٔ کاری مجاز است (F04 ۱۳ مورد ۵).
 * قاعدهٔ ریزتر هر عمل (مثلاً گزارش برای برگ زمانی) را خود ویژگی مقصد در سرور می‌سنجد.
 */
export interface WbsPermissions {
  /** ورود به حالت ویرایش (W12) — نسخهٔ کاری را باز می‌کند یا می‌سازد. */
  editStructure: boolean;
  editNote: boolean;
  exportExcel: boolean;
  viewAmounts: boolean;
  viewCbs: boolean;
  viewReports: boolean;
  manualEntry: boolean;
  assign: boolean;
  viewRisks: boolean;
  createRisk: boolean;
  viewVersions: boolean;
  validateDraft: boolean;
  mspImport: boolean;
  mspSync: boolean;
  mspExport: boolean;
}

export function useWbsPermissions(project: ProjectDetailDto): WbsPermissions {
  const status = project.status;
  const isEditable = status === 'draft' || status === 'active' || status === 'paused';
  const isLive = status === 'active' || status === 'paused';
  const isOpen = status !== 'completed' && status !== 'archived';

  const editDraft = useHasPermission('plan.edit_draft');
  const editNote = useHasPermission('wbs.edit_note');
  const exportExcel = useHasPermission('wbs.export');
  const viewAmounts = useHasPermission('cbs.view_amounts');
  const viewCbs = useHasPermission('cbs.view');
  const viewReports = useHasPermission('report.view');
  const manualEntry = useHasPermission('report.manual_entry');
  const assign = useHasPermission('assignment.manage');
  const viewRisks = useHasPermission('risk.view');
  const createRisk = useHasPermission('risk.create');
  const viewVersions = useHasPermission('plan.view_versions');
  const mspImport = useHasPermission('msp.import');
  const mspSync = useHasPermission('msp.sync');
  const mspExport = useHasPermission('msp.export');

  return {
    editStructure: editDraft && isEditable,
    editNote: editNote && isOpen,
    exportExcel,
    viewAmounts,
    viewCbs,
    viewReports,
    // OD-F09-01 (تأیید 1405/08/15): ثبت دستی وب فقط در پروژهٔ فعال
    manualEntry: manualEntry && status === 'active',
    assign: assign && isEditable,
    viewRisks,
    createRisk: createRisk && isOpen,
    viewVersions,
    validateDraft: editDraft && project.plan.draft !== null && isEditable,
    mspImport: mspImport && status === 'draft',
    mspSync: mspSync && isLive && project.mspLinked,
    mspExport: mspExport && project.mspLinked && status !== 'draft',
  };
}
