import { ROUTES, WBS_DEEP_LINKS } from '@/config/routes';
import type { MenuEntry } from '@/shared/components/ui/Menu';
import { toast } from '@/shared/components/feedback/toastStore';
import { toFaDigits } from '@/shared/utils/num';
import { appLink } from '@/shared/utils/appUrl';
import type { EntityId } from '@/shared/types/api';
import type { WbsPermissions } from '../hooks/useWbsPermissions';
import type { WbsItemDto } from '../types';

// اقدامات یک آیتم در W11 — یک فهرست برای منوی سه‌نقطهٔ ردیف، منوی کلیک‌راست و
// منوی پنل جزئیات (W45 «WBS — آیتم والد / برگ»).
//
// W11 حالت مشاهده است: هر تغییر برنامه (ویرایش، افزودن، حذف) در نسخهٔ کاری انجام
// می‌شود و به حالت ویرایش (W12) می‌رود. آرت‌بورد حذف برگ دارای گزارش را غیرفعال با
// «ابتدا گزارش‌ها را بایگانی کنید» نشان می‌داد؛ طبق `features/wbs.md` ۵.۶ چنین برگی
// در نسخهٔ کاری حذف نرم می‌شود و گزارش‌هایش می‌مانند — پس غیرفعال نیست.

export interface WbsActionContext {
  projectId: EntityId;
  can: WbsPermissions;
  /** شمار همهٔ نوادگان والد — برای هشدار «حذف این شاخه». */
  descendantCount?: number;
  onExpandBranch?: () => void;
}

export function copyItemLink(projectId: EntityId, itemId: EntityId): void {
  const url = appLink(ROUTES.wbsItem(projectId, itemId));
  const done = () => toast.success('پیوند آیتم کپی شد.');
  if (navigator.clipboard?.writeText) {
    navigator.clipboard
      .writeText(url)
      .then(done, () => toast.error('پیوند کپی نشد. نشانی صفحه را از نوار مرورگر بردارید.'));
  } else {
    toast.error('مرورگر اجازهٔ کپی نداد. نشانی صفحه را از نوار مرورگر بردارید.');
  }
}

/** آیا برگ گزارش و سرپرست می‌گیرد؟ برگ `time_based` نه (D03-الف). */
export function isReportable(item: WbsItemDto): boolean {
  return item.isLeaf && item.measurementMethod !== 'time_based';
}

export function buildWbsItemMenu(item: WbsItemDto, context: WbsActionContext): MenuEntry[] {
  const { projectId, can } = context;
  const entries: MenuEntry[] = [];
  const editUrl = ROUTES.wbsEdit(projectId, item.id);

  if (can.editStructure) {
    entries.push({
      key: 'edit',
      label: 'ویرایش در حالت ویرایش',
      icon: 'pencil',
      to: editUrl,
      trailing: 'E',
    });
  }

  if (item.isLeaf) {
    if (can.assign && isReportable(item)) {
      entries.push({
        key: 'assign',
        label: item.supervisor ? 'تغییر سرپرست' : 'تخصیص سرپرست',
        icon: 'user-check',
        to: WBS_DEEP_LINKS.assignment(projectId, item.id),
      });
    }
    if (can.viewCbs) {
      entries.push({
        key: 'links',
        label: 'مدیریت اتصال‌های CBS',
        icon: 'link',
        to: WBS_DEEP_LINKS.links(projectId, item.id),
      });
    }
    if (can.viewReports && isReportable(item)) {
      entries.push({
        key: 'reports',
        label: 'مشاهدهٔ گزارش‌ها',
        icon: 'clipboard-check',
        to: WBS_DEEP_LINKS.reports(projectId, item.id),
      });
    }
    if (can.manualEntry && isReportable(item)) {
      entries.push({
        key: 'manual',
        label: 'ثبت گزارش دستی',
        icon: 'file-pen-line',
        to: WBS_DEEP_LINKS.manualReport(projectId, item.id),
      });
    }
    if (can.createRisk) {
      entries.push({
        key: 'risk',
        label: 'ثبت ریسک',
        icon: 'shield-alert',
        to: WBS_DEEP_LINKS.newRisk(projectId, item.id),
      });
    }
  } else {
    if (can.editStructure) {
      entries.push({ key: 'add-child', label: 'افزودن فرزند', icon: 'plus', to: editUrl });
    }
    if (context.onExpandBranch) {
      entries.push({
        key: 'expand',
        label: 'گسترش همهٔ زیرشاخه‌ها',
        icon: 'chevrons-up-down',
        onSelect: context.onExpandBranch,
      });
    }
  }

  entries.push({ key: 'sep-copy', separator: true });
  entries.push({
    key: 'copy',
    label: 'کپی پیوند آیتم',
    icon: 'link-2',
    onSelect: () => copyItemLink(projectId, item.id),
  });

  if (can.editStructure) {
    entries.push({ key: 'sep-delete', separator: true });
    entries.push(
      item.isLeaf
        ? {
            key: 'delete',
            label: 'حذف آیتم',
            icon: 'trash-2',
            tone: 'danger',
            to: editUrl,
            note: 'در نسخهٔ کاری؛ گزارش‌های ثبت‌شده می‌مانند',
          }
        : {
            key: 'delete',
            label: 'حذف این شاخه',
            icon: 'trash-2',
            tone: 'danger',
            to: editUrl,
            note: context.descendantCount
              ? `${toFaDigits(context.descendantCount)} آیتم زیرشاخه هم حذف می‌شود`
              : 'در نسخهٔ کاری',
          },
    );
  }

  return entries;
}
