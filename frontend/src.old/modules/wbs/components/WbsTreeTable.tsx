import {
  ChevronsUpDown,
  ChevronsDownUp,
  SlidersHorizontal,
  RefreshCw,
  ArrowUpDown,
  ArrowDown,
  ChevronLeft,
  MousePointerClick,
} from 'lucide-react';

import { toPersianDigits } from '@/shared/utils';
import type { WbsTreeNode } from '../types';
import { flattenVisible, getAllParentIds, getPath } from '../services/wbsTree';
import { WBS_STATUS_STYLE } from '../services/wbsHelpers';
import { WbsTreeRow } from './WbsTreeRow';

// ستون میانی: tree toolbar + table + footer status bar.
// بازنویسی وفادار بر اساس designs/WBS.html tree-panel.

interface Props {
  tree: WbsTreeNode[];
  selectedNodeId: number | null;
  expandedIds: Record<number, boolean>;
  editMode: boolean;
  visibleCount: number;
  onSelect: (id: number) => void;
  onToggleExpand: (id: number) => void;
  onExpandAll?: (map: Record<number, boolean>) => void;
  onCollapseAll?: (map: Record<number, boolean>) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onRowMenu?: (id: number, anchor: { x: number; y: number }) => void;
  onDragStart?: (id: number) => void;
  onDragOver?: (id: number) => void;
  onDrop?: (id: number) => void;
}

export function WbsTreeTable({
  tree,
  selectedNodeId,
  expandedIds,
  editMode,
  visibleCount,
  onSelect,
  onToggleExpand,
  onExpandAll,
  onCollapseAll,
  onEdit,
  onDelete,
  onRowMenu,
  onDragStart,
  onDragOver,
  onDrop,
}: Props) {
  const flat = flattenVisible(tree, expandedIds);

  // breadcrumb از selected node
  const selectedPath = selectedNodeId ? getPath(tree, selectedNodeId) : [];

  return (
    <section className="bg-gray-50 flex flex-col min-w-0 min-h-[calc(100vh-260px)]">
      {/* ─── tree toolbar ─── */}
      <div className="px-3.5 py-2 bg-white border-b border-gray-200 flex items-center gap-2 flex-wrap shrink-0">
        {/* breadcrumb path */}
        <div className="flex items-center gap-1 text-[11.5px] text-gray-500 flex-1 min-w-0">
          <span>مسیر:</span>
          {selectedPath.length === 0 ? (
            <span className="text-gray-400">—</span>
          ) : (
            selectedPath.map((node, idx) => (
              <span key={node.id} className="inline-flex items-center gap-1 min-w-0">
                {idx > 0 && <ChevronLeft className="w-3 h-3 text-gray-300 shrink-0" />}
                {idx === selectedPath.length - 1 ? (
                  <span className="text-gray-900 font-medium truncate">{node.title}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelect(node.id)}
                    className="text-gray-500 hover:text-gray-900 truncate"
                  >
                    {toPersianDigits(node.code)}
                  </button>
                )}
              </span>
            ))
          )}
        </div>

        <div className="w-px h-[18px] bg-gray-200" />

        <button
          type="button"
          onClick={() => {
            if (onExpandAll) {
              const allParents = getAllParentIds(tree);
              const newMap: Record<number, boolean> = {};
              for (const id of allParents) newMap[id] = true;
              onExpandAll(newMap);
            }
          }}
          className="inline-flex items-center gap-1.5 h-[26px] px-2 text-[11.5px] rounded-md text-gray-700 hover:bg-gray-100 border-0 bg-transparent"
          title="گسترش همه"
        >
          <ChevronsUpDown className="w-[13px] h-[13px] shrink-0" />
          <span>گسترش همه</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (onCollapseAll) {
              const allParents = getAllParentIds(tree);
              const newMap: Record<number, boolean> = {};
              for (const id of allParents) newMap[id] = false;
              onCollapseAll(newMap);
            }
          }}
          className="inline-flex items-center gap-1.5 h-[26px] px-2 text-[11.5px] rounded-md text-gray-700 hover:bg-gray-100 border-0 bg-transparent"
          title="جمع‌کردن همه"
        >
          <ChevronsDownUp className="w-[13px] h-[13px] shrink-0" />
          <span>جمع‌کردن</span>
        </button>

        <div className="w-px h-[18px] bg-gray-200" />

        <button
          type="button"
          className="inline-flex items-center gap-1.5 h-[26px] px-2 text-[11.5px] rounded-md text-gray-700 hover:bg-gray-100 border-0 bg-transparent"
        >
          <SlidersHorizontal className="w-[13px] h-[13px] shrink-0" />
          <span>ستون‌ها</span>
        </button>
        <button
          type="button"
          className="w-[26px] h-[26px] rounded-md text-gray-700 hover:bg-gray-100 border-0 bg-transparent inline-flex items-center justify-center"
          title="رفرش"
        >
          <RefreshCw className="w-[13px] h-[13px]" />
        </button>
      </div>

      {/* ─── table ─── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-[12.5px] min-w-[1080px]">
          <thead className="sticky top-0 z-[4] bg-gray-50">
            <tr>
              <th className="text-right text-[10.5px] font-semibold text-gray-500 px-2.5 py-2 border-b border-gray-200 whitespace-nowrap uppercase tracking-[0.04em] bg-gray-50" style={{ width: '40%', minWidth: 300 }}>
                عنوان
              </th>
              <th className="text-right text-[10.5px] font-semibold text-gray-500 px-2.5 py-2 border-b border-gray-200 whitespace-nowrap uppercase tracking-[0.04em] bg-gray-50" style={{ width: 90 }}>
                <button className="bg-transparent border-0 p-0 text-inherit inline-flex items-center gap-[3px] hover:text-gray-900">
                  <span>کد</span>
                  <ArrowUpDown className="w-[10px] h-[10px]" />
                </button>
              </th>
              <th className="text-right text-[10.5px] font-semibold text-gray-500 px-2.5 py-2 border-b border-gray-200 whitespace-nowrap uppercase tracking-[0.04em] bg-gray-50" style={{ width: 64 }}>
                وزن
              </th>
              <th className="text-right text-[10.5px] font-semibold text-gray-500 px-2.5 py-2 border-b border-gray-200 whitespace-nowrap uppercase tracking-[0.04em] bg-gray-50" style={{ width: 110 }}>
                مقدار / واحد
              </th>
              <th className="text-right text-[10.5px] font-semibold text-gray-500 px-2.5 py-2 border-b border-gray-200 whitespace-nowrap uppercase tracking-[0.04em] bg-gray-50" style={{ width: 90 }}>
                شروع
              </th>
              <th className="text-right text-[10.5px] font-semibold text-gray-500 px-2.5 py-2 border-b border-gray-200 whitespace-nowrap uppercase tracking-[0.04em] bg-gray-50" style={{ width: 90 }}>
                پایان
              </th>
              <th className="text-right text-[10.5px] font-semibold text-gray-500 px-2.5 py-2 border-b border-gray-200 whitespace-nowrap uppercase tracking-[0.04em] bg-gray-50" style={{ width: 130 }}>
                پیشرفت برنامه‌ای
              </th>
              <th className="text-right text-[10.5px] font-semibold text-gray-600 px-2.5 py-2 border-b border-gray-200 whitespace-nowrap uppercase tracking-[0.04em] bg-gray-50" style={{ width: 130 }}>
                <button className="bg-transparent border-0 p-0 text-gray-700 font-semibold inline-flex items-center gap-[3px]">
                  <span>پیشرفت واقعی</span>
                  <ArrowDown className="w-[10px] h-[10px]" />
                </button>
              </th>
              <th className="text-right text-[10.5px] font-semibold text-gray-500 px-2.5 py-2 border-b border-gray-200 whitespace-nowrap uppercase tracking-[0.04em] bg-gray-50" style={{ width: 140 }}>
                سرپرست
              </th>
              <th className="text-right text-[10.5px] font-semibold text-gray-500 px-2.5 py-2 border-b border-gray-200 bg-gray-50" style={{ width: 32 }} />
            </tr>
          </thead>
          <tbody>
            {flat.map(({ node, depth }) => {
              const isExpanded = node.id in expandedIds ? expandedIds[node.id]! : true;
              return (
                <WbsTreeRow
                  key={node.id}
                  node={node}
                  depth={depth}
                  isSelected={selectedNodeId === node.id}
                  isExpanded={isExpanded}
                  editMode={editMode}
                  onSelect={onSelect}
                  onToggleExpand={onToggleExpand}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onRowMenu={onRowMenu}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                />
              );
            })}
            {flat.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3.5 py-8 text-center text-gray-500 text-sm">
                  هیچ آیتمی با فیلترهای فعلی یافت نشد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── status bar ─── */}
      <div className="bg-white border-t border-gray-200 px-3.5 py-1.5 flex items-center justify-between text-[11.5px] text-gray-600 shrink-0">
        <div className="flex items-center gap-3">
          <span>
            <strong className="text-gray-900">{toPersianDigits(visibleCount)}</strong> آیتم نمایش داده می‌شود
          </span>
          <span className="text-gray-300">·</span>
          <StatusLegend />
        </div>
        <div className="hidden md:flex items-center gap-1">
          <MousePointerClick className="w-[11px] h-[11px]" />
          <span>برای نمایش جزئیات روی ردیف کلیک کنید</span>
        </div>
      </div>
    </section>
  );
}

function StatusLegend() {
  const items: Array<{ color: string; label: string }> = [
    { color: WBS_STATUS_STYLE.done.bar, label: 'تکمیل' },
    { color: WBS_STATUS_STYLE.progress.bar, label: 'در حال انجام' },
    { color: WBS_STATUS_STYLE.warn.bar, label: 'تأخیر هشدار' },
    { color: WBS_STATUS_STYLE.late.bar, label: 'تأخیر بحرانی' },
    { color: WBS_STATUS_STYLE.pending.bar, label: 'شروع‌نشده' },
  ];
  return (
    <>
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: it.color }} />
          {it.label}
        </span>
      ))}
    </>
  );
}
