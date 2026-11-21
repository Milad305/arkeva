import { useState } from 'react';
import {
  FileSearch,
  Hash,
  Copy,
  Edit2,
  MessageSquare,
  FileText,
  Folder,
  Layers,
  Info,
  Calendar,
  Activity,
  ClipboardCheck,
  ArrowLeft,
  Banknote,
  Sigma,
  UserPlus,
  Edit3,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  GitFork,
} from 'lucide-react';

import { cn, toPersianDigits } from '@/shared/utils';
import { AVATAR_COLORS } from '@/modules/projects/services/projectHelpers';
import { Guard } from '@/shared/components/rbac/Guard';
import type { WbsTreeNode } from '../types';
import { getNodeStatus } from '../services/wbsTree';
import {
  WBS_STATUS_STYLE,
  getProgressColor,
  getVarianceBadge,
  formatFaDateOrDash,
  daysBetween,
  levelFromCode,
} from '../services/wbsHelpers';

// ستون چپ: detail panel — بازنویسی وفادار بر اساس designs/WBS.html detail-panel.

interface Props {
  node: WbsTreeNode | null;
  onEdit?: (id: number) => void;
  onAddChild?: (parentId: number) => void;
  onDelete?: (id: number) => void;
  onSelectChild?: (id: number) => void;
  onViewReports?: (id: number) => void;
}

export function WbsDetailPanel({
  node,
  onEdit,
  onAddChild,
  onDelete,
  onSelectChild,
  onViewReports,
}: Props) {
  // empty state
  if (!node) {
    return (
      <aside className="bg-white border-r border-gray-200 overflow-y-auto flex flex-col min-w-0 min-h-[calc(100vh-260px)]">
        <div className="py-20 px-6 text-center text-gray-500">
          <div className="w-14 h-14 rounded-lg bg-gray-100 inline-flex items-center justify-center text-gray-400 mb-3">
            <FileSearch className="w-7 h-7" />
          </div>
          <h4 className="text-sm text-gray-700 font-semibold m-0 mb-1">چیزی انتخاب نشده است</h4>
          <p className="text-xs text-gray-500 m-0 leading-[1.7]">
            برای مشاهده جزئیات هر آیتم، روی آن در درخت کلیک کنید.
            <br />
            می‌توانید عنوان، وزن، تاریخ‌ها و سرپرست را در همین پنل ویرایش کنید.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <DetailContent
      node={node}
      onEdit={onEdit}
      onAddChild={onAddChild}
      onDelete={onDelete}
      onSelectChild={onSelectChild}
      onViewReports={onViewReports}
    />
  );
}

function DetailContent({
  node,
  onEdit,
  onAddChild,
  onDelete,
  onSelectChild,
  onViewReports,
}: {
  node: WbsTreeNode;
  onEdit?: (id: number) => void;
  onAddChild?: (parentId: number) => void;
  onDelete?: (id: number) => void;
  onSelectChild?: (id: number) => void;
  onViewReports?: (id: number) => void;
}) {
  const status = getNodeStatus(node);
  const statusStyle = WBS_STATUS_STYLE[status];
  const progressColor = getProgressColor(status);
  const variance = getVarianceBadge(node.deviation, status);
  const VarianceIcon = variance.iconName === 'trending-up' ? TrendingUp : TrendingDown;
  const level = levelFromCode(node.code);

  return (
    <aside className="bg-white border-r border-gray-200 overflow-y-auto flex flex-col min-w-0 min-h-[calc(100vh-260px)]">
      {/* ─── header ─── */}
      <div className="px-4 py-3.5 border-b border-gray-100">
        {/* code row */}
        <div className="flex items-center justify-between mb-1.5">
          <button
            type="button"
            className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-sm text-[11.5px] hover:bg-gray-200 border-0 cursor-pointer"
            title="کلیک کنید تا کپی شود"
          >
            <Hash className="w-[11px] h-[11px]" />
            <span className="mono">{toPersianDigits(node.code)}</span>
            <Copy className="w-[11px] h-[11px] text-gray-400" />
          </button>
          <span
            className="inline-flex items-center gap-1 h-[22px] px-2 rounded-sm text-[11.5px] font-medium"
            style={{ backgroundColor: statusStyle.bg, color: statusStyle.fg }}
          >
            <span className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: statusStyle.dot }} />
            {statusStyle.label}
          </span>
        </div>

        {/* title + edit */}
        <div className="flex items-center gap-1">
          <h3 className="text-base font-semibold m-0 leading-[1.4] text-gray-900">{node.title}</h3>
          <Guard permissions={['wbs.edit']} fallback={null}>
            <button
              type="button"
              onClick={() => onEdit?.(node.id)}
              className="text-gray-400 p-0.5 rounded-[4px] bg-transparent border-0 hover:bg-gray-100 hover:text-primary-700"
              title="ویرایش عنوان"
            >
              <Edit2 className="w-[13px] h-[13px]" />
            </button>
          </Guard>
        </div>

        {/* notes */}
        {node.notes && (
          <p className="text-xs text-gray-600 leading-[1.7] mt-2 m-0">
            <MessageSquare className="w-[11px] h-[11px] inline align-[-1px] text-gray-400" />{' '}
            {node.notes}
          </p>
        )}

        {/* status row */}
        <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 h-[22px] rounded-sm text-[11.5px] font-medium">
            {node.isLeaf ? <FileText className="w-[11px] h-[11px]" /> : <Folder className="w-[11px] h-[11px]" />}
            {node.isLeaf ? 'برگ — قابل گزارش‌گیری' : 'والد — مجموع فرزندان'}
          </span>
          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 h-[22px] rounded-sm text-[11.5px] font-medium">
            <Layers className="w-[11px] h-[11px]" />
            سطح {toPersianDigits(level)}
          </span>
          <span
            className="inline-flex items-center gap-1 px-2 h-[22px] rounded-sm text-[11.5px] font-medium"
            style={{ backgroundColor: variance.bg, color: variance.fg }}
          >
            <VarianceIcon className="w-[11px] h-[11px]" />
            {variance.label}
          </span>
        </div>
      </div>

      {/* ─── big progress ─── */}
      <div className="px-4 py-3.5">
        <div className="flex items-center justify-between mb-1.5 text-[11.5px] text-gray-600">
          <span>پیشرفت واقعی</span>
          <strong className="text-sm text-gray-900 font-semibold" style={{ color: progressColor }}>
            {toPersianDigits(node.actualProgress)}٪
          </strong>
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${node.actualProgress}%`, backgroundColor: progressColor }} />
        </div>
        <div className="flex items-center justify-between mt-2 mb-1.5 text-[11.5px] text-gray-600">
          <span>پیشرفت برنامه‌ای امروز</span>
          <strong className="text-sm text-gray-900 font-semibold">{toPersianDigits(node.plannedProgress)}٪</strong>
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gray-400" style={{ width: `${node.plannedProgress}%` }} />
        </div>
      </div>

      {/* ─── accordion: اطلاعات کلی ─── */}
      <Accordion icon={<Info className="w-3.5 h-3.5" />} title="اطلاعات کلی" defaultOpen>
        <KeyValue k="کد" v={toPersianDigits(node.code)} mono />
        <KeyValue k="وزن نسبی" v={`${toPersianDigits(node.weight)}٪`} />
        <KeyValue k="عنوان" v={node.title} full />
        <KeyValue k="سطح" v={toPersianDigits(level)} />
        <KeyValue k="نوع" v={node.isLeaf ? 'برگ' : 'والد'} />
      </Accordion>

      {/* ─── accordion: زمان‌بندی ─── */}
      <Accordion icon={<Calendar className="w-3.5 h-3.5" />} title="زمان‌بندی" defaultOpen>
        <KeyValue k="تاریخ شروع" v={formatFaDateOrDash(node.startDate)} mono />
        <KeyValue k="تاریخ پایان" v={formatFaDateOrDash(node.endDate)} mono />
        <KeyValue k="مدت برنامه‌ای" v={`${toPersianDigits(daysBetween(node.startDate, node.endDate))} روز`} />
        <KeyValue k="سپری‌شده تا امروز" v={`${toPersianDigits(node.plannedProgress)}٪`} />
      </Accordion>

      {/* ─── leaf-only sections ─── */}
      {node.isLeaf ? (
        <LeafSections
          node={node}
          progressColor={progressColor}
          onViewReports={onViewReports}
        />
      ) : (
        <ParentSections node={node} onSelectChild={onSelectChild} />
      )}

      {/* ─── footer actions ─── */}
      <div className="px-4 py-3.5 border-t border-gray-100 bg-white flex flex-col gap-1.5 sticky bottom-0">
        <div className="flex gap-1.5">
          <Guard permissions={['wbs.edit']} fallback={<div className="flex-1" />}>
            <button
              type="button"
              onClick={() => onEdit?.(node.id)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-[30px] px-2.5 rounded-md bg-primary-700 text-white text-[12.5px] font-medium hover:bg-primary-900 border-0"
            >
              <Edit3 className="w-[13px] h-[13px]" />
              <span>ویرایش جزئیات</span>
            </button>
          </Guard>
          <Guard permissions={['wbs.create']} fallback={null}>
            <button
              type="button"
              onClick={() => onAddChild?.(node.id)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-[30px] px-2.5 rounded-md bg-white text-gray-800 border border-gray-300 text-[12.5px] font-medium hover:bg-gray-50"
            >
              <Plus className="w-[13px] h-[13px]" />
              <span>افزودن فرزند</span>
            </button>
          </Guard>
        </div>
        <Guard permissions={['wbs.delete']} fallback={null}>
          <button
            type="button"
            onClick={() => onDelete?.(node.id)}
            className="inline-flex items-center justify-center gap-1.5 h-[30px] px-2.5 rounded-md bg-white text-error-700 border border-gray-200 text-[12.5px] font-medium hover:bg-error-50 hover:border-error-500 w-full"
          >
            <Trash2 className="w-[13px] h-[13px]" />
            <span>حذف آیتم</span>
          </button>
        </Guard>
      </div>
    </aside>
  );
}

// ────────── Leaf-only sections ──────────

function LeafSections({
  node,
  progressColor,
  onViewReports,
}: {
  node: WbsTreeNode;
  progressColor: string;
  onViewReports?: (id: number) => void;
}) {
  const owner = node.owner;
  const ownerColor = owner ? AVATAR_COLORS[owner.avatarColor] : null;
  const cbsLinks = node.cbsLinks;
  const totalBudget = cbsLinks.reduce((s, c) => s + c.budget, 0);
  const totalUsed = cbsLinks.reduce((s, c) => s + c.used, 0);
  const seedReports = node.reportsCount > 0 ? node.reportsCount : 4;

  return (
    <>
      <Accordion icon={<Activity className="w-3.5 h-3.5" />} title="پیشرفت تفصیلی" defaultOpen>
        {node.quantity !== null && (
          <KeyValue
            k="مقدار کل"
            v={`${toPersianDigits(node.quantity.toLocaleString('fa-IR'))} ${node.quantityUnit ?? ''}`}
          />
        )}
        {node.doneQuantity !== null && (
          <KeyValue
            k="انجام شده"
            v={`${toPersianDigits(node.doneQuantity.toLocaleString('fa-IR'))} ${node.quantityUnit ?? ''}`}
            valueColor={progressColor}
          />
        )}
        {owner && ownerColor && (
          <div className="col-span-2 flex flex-col gap-[3px]">
            <span className="text-[10.5px] text-gray-500 font-medium uppercase tracking-[0.04em]">سرپرست مسئول</span>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="w-6 h-6 rounded-full inline-flex items-center justify-center text-[10.5px] font-semibold"
                  style={{ backgroundColor: ownerColor.bg, color: ownerColor.fg }}
                >
                  {owner.initials}
                </span>
                <span className="text-[13px] text-gray-900 font-medium">{owner.fullName}</span>
              </span>
              <Guard permissions={['assignments.manage']} fallback={null}>
                <button className="inline-flex items-center gap-1 h-[26px] px-1.5 rounded-md bg-transparent text-gray-700 hover:bg-gray-100 text-[11.5px] border-0">
                  <UserPlus className="w-3 h-3" />
                  <span>تغییر</span>
                </button>
              </Guard>
            </div>
          </div>
        )}
      </Accordion>

      {/* reports link */}
      {seedReports > 0 && (
        <div className="mx-4 mb-3.5 mt-3 px-4 py-3 bg-primary-100 rounded-md flex items-center justify-between">
          <div className="flex items-center gap-2 text-[12.5px] text-primary-700 font-medium">
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>گزارش‌های این آیتم</span>
          </div>
          <button
            type="button"
            onClick={() => onViewReports?.(node.id)}
            className="flex items-center gap-2"
          >
            <span className="bg-primary-700 text-white px-2 py-0.5 rounded-full text-[11px] font-semibold">
              {toPersianDigits(seedReports)} گزارش
            </span>
            <ArrowLeft className="w-3.5 h-3.5 text-primary-700" />
          </button>
        </div>
      )}

      {/* CBS links */}
      <div className="px-4 pb-3.5">
        <div className="flex items-center justify-between py-3 border-t border-gray-100">
          <div className="flex items-center gap-2 text-[12.5px] font-semibold text-gray-800">
            <Banknote className="w-3.5 h-3.5 text-gray-500" />
            <span>CBSهای متصل</span>
            <span className="bg-gray-100 text-gray-600 h-[18px] px-1 text-[10px] inline-flex items-center rounded-sm">
              {toPersianDigits(cbsLinks.length)}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          {cbsLinks.length === 0 ? (
            <div className="text-xs text-gray-500 px-2.5 py-3 text-center">هیچ اتصال CBS ای وجود ندارد.</div>
          ) : (
            cbsLinks.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between px-2.5 py-2 bg-gray-50 border border-gray-100 rounded-md gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="mono text-[10.5px] text-gray-500">{c.cbsCode}</span>
                  <span className="text-xs text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">{c.cbsTitle}</span>
                </div>
                <span className="text-[11.5px] text-gray-700 whitespace-nowrap">
                  <strong className="text-gray-900 font-semibold">{toPersianDigits(c.used)}</strong>{' '}
                  / {toPersianDigits(c.budget)} میلیارد
                </span>
              </div>
            ))
          )}
          <div className="px-3 py-2.5 rounded-md border border-dashed border-gray-200 flex items-center justify-between">
            <span className="text-[11.5px] text-gray-600 inline-flex items-center gap-1">
              <Sigma className="w-3 h-3 inline align-[-1px]" />
              جمع بودجه
            </span>
            <span>
              <strong className="text-gray-900 font-bold">{toPersianDigits(totalUsed)}</strong>{' '}
              <span className="text-gray-500">از</span>{' '}
              <strong className="text-gray-900 font-bold">{toPersianDigits(totalBudget)}</strong>{' '}
              میلیارد ریال
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

// ────────── Parent-only section ──────────

function ParentSections({
  node,
  onSelectChild,
}: {
  node: WbsTreeNode;
  onSelectChild?: (id: number) => void;
}) {
  return (
    <div className="px-4 pb-3.5">
      <div className="flex items-center justify-between py-3 border-t border-gray-100">
        <div className="flex items-center gap-2 text-[12.5px] font-semibold text-gray-800">
          <GitFork className="w-3.5 h-3.5 text-gray-500" />
          <span>فرزندان</span>
          <span className="bg-gray-100 text-gray-600 h-[18px] px-1 text-[10px] inline-flex items-center rounded-sm">
            {toPersianDigits(node.children.length)}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {node.children.map((c) => {
          const cStatus = getNodeStatus(c);
          const cColor = getProgressColor(cStatus);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectChild?.(c.id)}
              className="text-right bg-gray-50 px-2.5 py-2 rounded-md hover:bg-gray-100 transition-colors border-0 cursor-pointer"
            >
              <div className="text-[10.5px] text-gray-500 mono">
                {toPersianDigits(c.code)} · وزن {toPersianDigits(c.weight)}٪
              </div>
              <div className="text-[13px] text-gray-900 flex items-center gap-1.5">
                <span className="flex-1 truncate">{c.title}</span>
                <span className="text-[11.5px] font-semibold shrink-0" style={{ color: cColor }}>
                  {toPersianDigits(c.actualProgress)}٪
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ────────── Accordion ──────────

function Accordion({
  icon,
  title,
  children,
  defaultOpen = false,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="px-4 py-3 flex items-center justify-between w-full text-right bg-transparent border-0 cursor-pointer"
      >
        <div className="flex items-center gap-2 text-[12.5px] font-semibold text-gray-800">
          <span className="text-gray-500">{icon}</span>
          {title}
        </div>
        <ChevronDown className={cn('w-3.5 h-3.5 text-gray-400 transition-transform', !open && 'rotate-[-90deg]')} />
      </button>
      {open && <div className="px-4 pb-3.5 grid grid-cols-2 gap-2.5">{children}</div>}
    </div>
  );
}

// ────────── KeyValue ──────────

function KeyValue({
  k,
  v,
  full,
  mono,
  valueColor,
}: {
  k: string;
  v: string;
  full?: boolean;
  mono?: boolean;
  valueColor?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-[3px] min-w-0', full && 'col-span-2')}>
      <span className="text-[10.5px] text-gray-500 font-medium uppercase tracking-[0.04em]">{k}</span>
      <span
        className={cn('text-[13px] text-gray-900 font-medium whitespace-nowrap overflow-hidden text-ellipsis', mono && 'mono')}
        style={valueColor ? { color: valueColor } : undefined}
      >
        {v}
      </span>
    </div>
  );
}
