import {
  ChevronDown,
  ChevronLeft,
  Folder,
  FolderOpen,
  FileText,
  GripVertical,
  AlertTriangle,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';

import { cn, toPersianDigits } from '@/shared/utils';
import { AVATAR_COLORS } from '@/modules/projects/services/projectHelpers';
import type { WbsTreeNode } from '../types';
import { getNodeStatus } from '../services/wbsTree';
import { WBS_STATUS_STYLE, getProgressColor, formatFaDateOrDash } from '../services/wbsHelpers';

// یک ردیف در درخت WBS — بازنویسی وفادار بر اساس designs/WBS.html row template.
// نکته: side-stripe رنگی با td:first-child::after پیاده می‌شود (مطابق طرح lines 178-188).

interface Props {
  node: WbsTreeNode;
  depth: number; // 1-based
  isSelected: boolean;
  isExpanded: boolean; // فقط برای parent
  editMode: boolean;
  onSelect: (id: number) => void;
  onToggleExpand: (id: number) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onRowMenu?: (id: number, anchor: { x: number; y: number }) => void;
  onDragStart?: (id: number) => void;
  onDragOver?: (id: number) => void;
  onDrop?: (id: number) => void;
}

export function WbsTreeRow({
  node,
  depth,
  isSelected,
  isExpanded,
  editMode,
  onSelect,
  onToggleExpand,
  onEdit,
  onDelete,
  onRowMenu,
  onDragStart,
  onDragOver,
  onDrop,
}: Props) {
  const status = getNodeStatus(node);
  const statusStyle = WBS_STATUS_STYLE[status];
  const progressColor = getProgressColor(status);
  const hasChildren = node.children.length > 0;
  const indent = (depth - 1) * 22;

  const owner = node.owner;
  const ownerColor = owner ? AVATAR_COLORS[owner.avatarColor] : null;

  return (
    <tr
      data-code={node.code}
      data-status={status}
      draggable={editMode && hasChildren}
      onDragStart={() => onDragStart?.(node.id)}
      onDragOver={(e) => {
        if (editMode) {
          e.preventDefault();
          onDragOver?.(node.id);
        }
      }}
      onDrop={() => onDrop?.(node.id)}
      onClick={() => onSelect(node.id)}
      className={cn(
        'cursor-pointer transition-colors group',
        status === 'late' && !isSelected && 'bg-[linear-gradient(to_left,rgba(220,38,38,0.04),rgba(220,38,38,0.06))]',
        isSelected ? 'bg-primary-100' : 'hover:bg-[#F5F8FC]',
        isSelected && status === 'late' && '!bg-[rgba(220,38,38,0.10)]',
      )}
    >
      {/* ─── ستون عنوان (با indent + twisty + icon + weight-bad) ─── */}
      <td className="p-0 border-b border-gray-100 align-middle bg-white relative">
        {/* side-stripe رنگی */}
        <span
          className="absolute top-0 bottom-0 right-0 w-[3px]"
          style={{ backgroundColor: statusStyle.bar }}
        />
        <div className="flex items-center gap-1.5 pr-3.5 py-2" style={{ paddingRight: 14 + indent }}>
          {/* drag handle — فقط در edit mode */}
          {editMode && (
            <GripVertical className="w-[13px] h-[13px] text-gray-400 shrink-0 cursor-grab" />
          )}
          {/* twisty */}
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(node.id);
              }}
              className="w-[18px] h-[18px] rounded-[4px] text-gray-400 inline-flex items-center justify-center shrink-0 border-0 bg-transparent hover:bg-gray-100 hover:text-gray-900"
              aria-label={isExpanded ? 'جمع‌کردن' : 'گسترش'}
            >
              {isExpanded ? <ChevronDown className="w-[13px] h-[13px]" /> : <ChevronLeft className="w-[13px] h-[13px]" />}
            </button>
          ) : (
            <span className="w-[18px] h-[18px] shrink-0" />
          )}
          {/* node icon */}
          <span className="w-[18px] h-[18px] shrink-0 inline-flex items-center justify-center">
            {hasChildren ? (
              isExpanded ? (
                <FolderOpen className="w-[14px] h-[14px] text-gray-500" />
              ) : (
                <Folder className="w-[14px] h-[14px] text-gray-500" />
              )
            ) : (
              <FileText className="w-[14px] h-[14px] text-primary-500" />
            )}
          </span>
          {/* عنوان */}
          <span className={cn('text-[13px] min-w-0 truncate', hasChildren ? 'font-semibold text-gray-900' : 'text-gray-800')}>
            {node.title}
          </span>
          {/* weight mismatch badge */}
          {node.hasWeightMismatch && node.weightSumOfChildren !== null && (
            <span
              className="inline-flex items-center gap-[3px] px-[5px] py-px rounded-[4px] text-[10.5px] font-semibold shrink-0 mr-1"
              style={{ backgroundColor: '#FEF2F2', color: '#B91C1C' }}
              title={`مجموع وزن فرزندان: ${toPersianDigits(node.weightSumOfChildren)}٪ — باید ۱۰۰٪ باشد`}
            >
              <AlertTriangle className="w-[10px] h-[10px] shrink-0" />
              <span>Σ {toPersianDigits(node.weightSumOfChildren)}٪</span>
            </span>
          )}
          {/* critical flag (مطابق نکته notes در 1.2.3.1) */}
          {node.isCritical && (
            <span
              className="inline-flex items-center gap-[3px] px-[5px] py-px rounded-[4px] text-[10.5px] font-semibold shrink-0"
              style={{ backgroundColor: '#FEF2F2', color: '#B91C1C' }}
            >
              <AlertTriangle className="w-[10px] h-[10px] shrink-0" />
              <span>بحرانی</span>
            </span>
          )}
        </div>
      </td>

      {/* کد */}
      <td className="p-0 border-b border-gray-100 bg-white">
        <div className="px-2.5 py-2">
          <span className="mono text-[11px] text-gray-500">{toPersianDigits(node.code)}</span>
        </div>
      </td>

      {/* وزن */}
      <td className="p-0 border-b border-gray-100 bg-white">
        <div className="px-2.5 py-2">
          <span
            className={cn(
              'text-gray-800 font-medium',
              editMode && 'bg-warning-50 px-1.5 py-0.5 rounded-[4px] cursor-text',
            )}
            style={editMode ? { color: '#B45309' } : undefined}
          >
            {toPersianDigits(node.weight)}٪
          </span>
        </div>
      </td>

      {/* مقدار/واحد */}
      <td className="p-0 border-b border-gray-100 bg-white">
        <div className="px-2.5 py-2 text-gray-700">
          {node.isLeaf && node.quantity !== null ? (
            <span>
              <span>{toPersianDigits(node.quantity.toLocaleString('fa-IR'))}</span>
              {node.quantityUnit && <span className="text-gray-500 text-[10.5px] mr-0.5">{node.quantityUnit}</span>}
            </span>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </div>
      </td>

      {/* شروع */}
      <td className="p-0 border-b border-gray-100 bg-white">
        <div className="px-2.5 py-2 mono text-[11.5px] text-gray-700">{formatFaDateOrDash(node.startDate)}</div>
      </td>

      {/* پایان */}
      <td className="p-0 border-b border-gray-100 bg-white">
        <div className="px-2.5 py-2 mono text-[11.5px] text-gray-700">{formatFaDateOrDash(node.endDate)}</div>
      </td>

      {/* پیشرفت برنامه‌ای */}
      <td className="p-0 border-b border-gray-100 bg-white">
        <div className="px-2.5 py-2">
          <div className="flex items-center gap-1.5 min-w-[110px]">
            <span className="text-[11.5px] font-medium w-8 text-left">{toPersianDigits(node.plannedProgress)}٪</span>
            <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden min-w-[50px]">
              <div className="h-full rounded-full bg-gray-400" style={{ width: `${node.plannedProgress}%` }} />
            </div>
          </div>
        </div>
      </td>

      {/* پیشرفت واقعی */}
      <td className="p-0 border-b border-gray-100 bg-white">
        <div className="px-2.5 py-2">
          <div className="flex items-center gap-1.5 min-w-[110px]">
            <span
              className="text-[11.5px] font-semibold w-8 text-left"
              style={{ color: progressColor }}
            >
              {toPersianDigits(node.actualProgress)}٪
            </span>
            <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden min-w-[50px]">
              <div className="h-full rounded-full" style={{ width: `${node.actualProgress}%`, backgroundColor: progressColor }} />
            </div>
          </div>
        </div>
      </td>

      {/* سرپرست */}
      <td className="p-0 border-b border-gray-100 bg-white">
        <div className="px-2.5 py-2">
          {node.isLeaf && owner && ownerColor ? (
            <div className="inline-flex items-center gap-1.5 min-w-0">
              <span
                className="w-[22px] h-[22px] rounded-full inline-flex items-center justify-center text-[10px] font-semibold shrink-0"
                style={{ backgroundColor: ownerColor.bg, color: ownerColor.fg }}
              >
                {owner.initials}
              </span>
              <span className="text-xs text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">
                {owner.fullName.replace('مهندس ', '')}
              </span>
            </div>
          ) : (
            <span className="text-gray-400 text-[11.5px]">—</span>
          )}
        </div>
      </td>

      {/* actions */}
      <td className="p-0 border-b border-gray-100 bg-white">
        <div className="px-1 py-2">
          <div className="inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {editMode && onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(node.id);
                }}
                className="w-6 h-6 rounded-[4px] text-gray-500 inline-flex items-center justify-center hover:bg-gray-200 hover:text-gray-900 border-0 bg-transparent"
                aria-label="ویرایش"
              >
                <Pencil className="w-[13px] h-[13px]" />
              </button>
            )}
            {editMode && onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(node.id);
                }}
                className="w-6 h-6 rounded-[4px] text-gray-500 inline-flex items-center justify-center hover:bg-error-50 hover:text-error-700 border-0 bg-transparent"
                aria-label="حذف"
              >
                <Trash2 className="w-[13px] h-[13px]" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                onRowMenu?.(node.id, { x: rect.left, y: rect.bottom });
              }}
              className="w-6 h-6 rounded-[4px] text-gray-500 inline-flex items-center justify-center hover:bg-gray-200 hover:text-gray-900 border-0 bg-transparent"
              aria-label="بیشتر"
            >
              <MoreVertical className="w-[13px] h-[13px]" />
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}
