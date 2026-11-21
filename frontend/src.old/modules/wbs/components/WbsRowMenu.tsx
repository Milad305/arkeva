import { useEffect, useRef } from 'react';
import {
  Edit3,
  Plus,
  UserPlus,
  Banknote,
  ClipboardCheck,
  FileText,
  History,
  Copy,
  Move,
  Trash2,
  Link as LinkIcon,
} from 'lucide-react';

import { cn } from '@/shared/utils';
import type { WbsTreeNode } from '../types';

// منوی راست‌کلیک / سه‌نقطه برای یک آیتم WBS — مطابق designs/ContextMenus.html S2.
// دو variant: parent (folder) و leaf (reportable).
// آیتم حذف با disabled + tooltip اگر ارجاع دارد (قاعده ۵.۶ AGENTS).

export interface RowMenuPosition {
  x: number;
  y: number;
}

interface Props {
  node: WbsTreeNode;
  position: RowMenuPosition;
  onClose: () => void;
  onEdit: (id: number) => void;
  onAddChild: (parentId: number) => void;
  onAddSibling: (parentId: number | null) => void;
  onAssignOwner: (id: number) => void;
  onManageCbs: (id: number) => void;
  onViewReports: (id: number) => void;
  onAddManualReport: (id: number) => void;
  onCopyBranch: (id: number) => void;
  onMoveToParent: (id: number) => void;
  onViewHistory: (id: number) => void;
  onDelete: (id: number) => void;
  deleteBlockedReason?: string | null;
}

export function WbsRowMenu({
  node,
  position,
  onClose,
  onEdit,
  onAddChild,
  onAssignOwner,
  onManageCbs,
  onViewReports,
  onAddManualReport,
  onCopyBranch,
  onMoveToParent,
  onViewHistory,
  onDelete,
  deleteBlockedReason,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // بستن با Escape یا کلیک بیرون
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  // position — اطمینان از جا ماندن در viewport
  const style: React.CSSProperties = {
    position: 'fixed',
    top: position.y,
    left: position.x,
    zIndex: 50,
  };

  const canDelete = !deleteBlockedReason;

  return (
    <div
      ref={ref}
      style={style}
      className="w-[248px] bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden py-1 text-[13px]"
      role="menu"
    >
      {node.isLeaf ? (
        // ─── leaf variant ───
        <>
          <MenuItem icon={<Edit3 className="w-4 h-4" />} label="ویرایش جزئیات" shortcut="E" onClick={() => { onEdit(node.id); onClose(); }} />
          <MenuItem icon={<UserPlus className="w-4 h-4" />} label="تخصیص سرپرست" onClick={() => { onAssignOwner(node.id); onClose(); }} />
          <MenuItem icon={<Banknote className="w-4 h-4" />} label="مدیریت اتصالات CBS" onClick={() => { onManageCbs(node.id); onClose(); }} />
          <MenuItem
            icon={<ClipboardCheck className="w-4 h-4" />}
            label="مشاهده گزارش‌ها"
            badge={node.reportsCount > 0 ? node.reportsCount : undefined}
            onClick={() => { onViewReports(node.id); onClose(); }}
          />
          <MenuItem icon={<FileText className="w-4 h-4" />} label="ثبت گزارش دستی" onClick={() => { onAddManualReport(node.id); onClose(); }} />
          <Divider />
          <MenuItem icon={<Copy className="w-4 h-4" />} label="کپی این آیتم" onClick={() => { onCopyBranch(node.id); onClose(); }} />
          <MenuItem icon={<Move className="w-4 h-4" />} label="انتقال به والد دیگر" onClick={() => { onMoveToParent(node.id); onClose(); }} />
          <Divider />
          <MenuItem icon={<History className="w-4 h-4" />} label="تاریخچه تغییرات" onClick={() => { onViewHistory(node.id); onClose(); }} />
          <Divider />
          <MenuItem
            icon={<Trash2 className="w-4 h-4" />}
            label="حذف آیتم"
            danger
            disabled={!canDelete}
            tooltip={deleteBlockedReason ?? undefined}
            onClick={() => {
              if (canDelete) {
                onDelete(node.id);
                onClose();
              }
            }}
          />
        </>
      ) : (
        // ─── parent variant ───
        <>
          <MenuItem icon={<Edit3 className="w-4 h-4" />} label="ویرایش جزئیات" shortcut="E" onClick={() => { onEdit(node.id); onClose(); }} />
          <MenuItem icon={<Plus className="w-4 h-4" />} label="افزودن فرزند" onClick={() => { onAddChild(node.id); onClose(); }} />
          <MenuItem icon={<Plus className="w-4 h-4" />} label="افزودن آیتم خواهر/برادر" onClick={() => { /* TODO */ onClose(); }} />
          <Divider />
          <MenuItem icon={<Copy className="w-4 h-4" />} label="کپی این شاخه" onClick={() => { onCopyBranch(node.id); onClose(); }} />
          <MenuItem icon={<Move className="w-4 h-4" />} label="انتقال به والد دیگر" onClick={() => { onMoveToParent(node.id); onClose(); }} />
          <MenuItem icon={<LinkIcon className="w-4 h-4" />} label="انتقال به بالا" onClick={() => { /* TODO */ onClose(); }} />
          <MenuItem icon={<LinkIcon className="w-4 h-4" />} label="انتقال به پایین" onClick={() => { /* TODO */ onClose(); }} />
          <Divider />
          <MenuItem icon={<ClipboardCheck className="w-4 h-4" />} label="گزارش‌های مرتبط" onClick={() => { onViewReports(node.id); onClose(); }} />
          <MenuItem icon={<History className="w-4 h-4" />} label="تاریخچه تغییرات" onClick={() => { onViewHistory(node.id); onClose(); }} />
          <Divider />
          <MenuItem
            icon={<Trash2 className="w-4 h-4" />}
            label="حذف این شاخه"
            danger
            disabled={!canDelete}
            sublabel={canDelete && node.children.length > 0 ? `${node.children.length} آیتم فرزند هم حذف می‌شوند` : undefined}
            tooltip={deleteBlockedReason ?? undefined}
            onClick={() => {
              if (canDelete) {
                onDelete(node.id);
                onClose();
              }
            }}
          />
        </>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  shortcut,
  badge,
  sublabel,
  danger,
  disabled,
  tooltip,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  badge?: number;
  sublabel?: string;
  danger?: boolean;
  disabled?: boolean;
  tooltip?: string;
  onClick: () => void;
}) {
  const faBadge = badge !== undefined ? String(badge).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]!) : undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={cn(
        'w-full px-3 py-2 flex items-center gap-2.5 text-right text-[13px] border-0 cursor-pointer transition-colors',
        disabled
          ? 'opacity-50 cursor-not-allowed bg-transparent'
          : danger
            ? 'text-error-700 hover:bg-error-50 bg-transparent'
            : 'text-gray-700 hover:bg-gray-100 bg-transparent',
      )}
      role="menuitem"
    >
      <span className={cn('shrink-0', disabled ? 'text-gray-400' : danger ? 'text-error-500' : 'text-gray-500')}>
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block">{label}</span>
        {sublabel && <span className="block text-[11px] text-gray-500 mt-0.5">{sublabel}</span>}
      </span>
      {shortcut && (
        <kbd className="text-[10px] text-gray-400 mono shrink-0">{shortcut}</kbd>
      )}
      {faBadge !== undefined && (
        <span className="bg-gray-100 text-gray-600 text-[10.5px] px-1.5 py-px rounded-full shrink-0">{faBadge}</span>
      )}
    </button>
  );
}

function Divider() {
  return <div className="h-px bg-gray-100 my-1" />;
}
