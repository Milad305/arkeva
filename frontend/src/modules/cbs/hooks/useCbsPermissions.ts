import { useHasPermission } from '@/shared/hooks/useHasAccess';
import type { ProjectDetailDto } from '@/modules/projects/types';

/**
 * آنچه کاربر در W14 و حالت ویرایش CBS می‌تواند — کد دسترسی (D11) و وضعیت پروژه با هم
 * (cbs.md ۱۳). ویرایش ساختار با `plan.edit_draft` است، مثل WBS (تصمیم 1405/08/15).
 */
export interface CbsPermissions {
  viewAmounts: boolean;
  /** «حالت ویرایش» CBS روی نسخهٔ کاری. */
  editDraft: boolean;
  /** تغییر نرخ، مقدار و مبلغ در پروژهٔ فعال — بازنگری مستقیم (۷.۲). */
  reviseBudget: boolean;
  /** «درخواست بازنگری بودجه» (G14) برای کسی که بازنگری مستقیم ندارد. */
  requestRevision: boolean;
  /** تأیید یا رد درخواست‌ها از فهرست W14 (تصمیم 1405/08/15). */
  approveRevision: boolean;
  /** ورود Excel: پیش‌نویس با ویرایش؛ پروژهٔ فعال فقط با بازنگری مستقیم (تصمیم 1405/08/15). */
  importExcel: boolean;
  applyDraft: boolean;
  viewWbs: boolean;
  viewCharts: boolean;
  exportExcel: boolean;
}

export function useCbsPermissions(project: ProjectDetailDto): CbsPermissions {
  const status = project.status;
  const isLive = status === 'active' || status === 'paused';
  const isEditable = status === 'draft' || isLive;

  const viewAmounts = useHasPermission('cbs.view_amounts');
  const editDraft = useHasPermission('plan.edit_draft');
  const revise = useHasPermission('cbs.revise_budget');
  const request = useHasPermission('cbs.request_revision');
  const approve = useHasPermission('cbs.approve_revision');
  const apply = useHasPermission('plan.apply');
  const viewWbs = useHasPermission('wbs.view');
  const viewCharts = useHasPermission('charts.view');

  const canEdit = editDraft && isEditable;
  return {
    viewAmounts,
    editDraft: canEdit,
    reviseBudget: revise && viewAmounts && isLive,
    // بازنگری فقط پس از فعال‌سازی معنا دارد؛ در پیش‌نویس نرخ مستقیم عوض می‌شود (۴.۴)
    requestRevision: request && !revise && viewAmounts && isLive,
    approveRevision: approve && viewAmounts && isLive,
    importExcel: canEdit && viewAmounts && (status === 'draft' || revise),
    applyDraft: apply && isLive,
    viewWbs,
    viewCharts,
    exportExcel: viewAmounts,
  };
}
