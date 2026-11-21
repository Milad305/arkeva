import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, Check } from 'lucide-react';

import { useAppDispatch, useAppSelector } from '@/app/store';
import { useGetWbsTreeQuery, useGetWbsSummaryQuery } from '../api/wbsApi';
import {
  selectNode,
  toggleExpand,
  setExpandedMap,
  setEditMode,
  setFilters,
  resetFilters,
  resetWbsUi,
} from '../store/wbsUiSlice';
import { flattenVisible, getDefaultExpandedIds, findNode } from '../services/wbsTree';
import { mockCanDelete } from '../mocks/wbsTree';
import { WbsToolbar } from '../components/WbsToolbar';
import { WbsTreeTable } from '../components/WbsTreeTable';
import { WbsDetailPanel } from '../components/WbsDetailPanel';
import { WbsEmptyState } from '../components/WbsEmptyState';
import { WbsImportModal } from '../components/WbsImportModal';
import { WbsEditModal } from '../components/WbsEditModal';
import { WbsAddChildModal } from '../components/WbsAddChildModal';
import { WbsRowMenu, type RowMenuPosition } from '../components/WbsRowMenu';
import type { WbsTreeNode } from '../types';

// صفحه اصلی WBS — چیدمان ۳ ستون + حالت ویرایش + مودال‌ها + منوی راست‌کلیک.
// بازنویسی وفادار بر اساس designs/WBS.html.

export default function WbsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const pid = Number(projectId);
  const dispatch = useAppDispatch();

  const wbsUi = useAppSelector((s) => s.wbsUi);
  const { selectedNodeId, expandedIds, editMode, filters } = wbsUi;

  // Queries
  const { data: tree, isLoading: treeLoading } = useGetWbsTreeQuery({
    projectId: pid,
    filters: filters.search || filters.status !== 'all' || filters.ownerId !== 'all' || filters.nodeType !== 'all'
      ? filters
      : undefined,
  });
  const { data: summary } = useGetWbsSummaryQuery(pid);

  // reset state هنگام تغییر projectId
  useEffect(() => {
    dispatch(resetWbsUi());
  }, [pid, dispatch]);

  // ست کردن expandedIds پیش‌فرض وقتی tree برای اولین بار آمد
  useEffect(() => {
    if (tree && tree.length > 0 && Object.keys(expandedIds).length === 0) {
      dispatch(setExpandedMap(getDefaultExpandedIds(tree)));
    }
  }, [tree, expandedIds, dispatch]);

  // auto-select اولین leaf در بارگذاری اولیه
  useEffect(() => {
    if (tree && tree.length > 0 && selectedNodeId === null) {
      // مطابق طرح: 1.2.3.1 انتخاب پیش‌فرض
      const defaultNode = findNodeByCodeLocal(tree, '1.2.3.1') ?? findFirstLeaf(tree);
      if (defaultNode) dispatch(selectNode(defaultNode.id));
    }
  }, [tree, selectedNodeId, dispatch]);

  // state برای مودال‌ها
  const [importOpen, setImportOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WbsTreeNode | null>(null);
  const [addChildTarget, setAddChildTarget] = useState<WbsTreeNode | null>(null);
  const [rowMenu, setRowMenu] = useState<{ nodeId: number; position: RowMenuPosition } | null>(null);

  // پیدا کردن گره انتخاب‌شده (در درخت اصلی، نه filtered)
  const { data: fullTree } = useGetWbsTreeQuery({ projectId: pid });
  const selectedNode = useMemo(() => {
    if (!fullTree || selectedNodeId === null) return null;
    return findNode(fullTree, selectedNodeId);
  }, [fullTree, selectedNodeId]);

  // گرهی که row menu روی آن باز شده
  const rowMenuNode = useMemo(() => {
    if (!fullTree || !rowMenu) return null;
    return findNode(fullTree, rowMenu.nodeId);
  }, [fullTree, rowMenu]);

  // delete check برای row menu
  const deleteCheck = useMemo(() => {
    if (!rowMenuNode) return null;
    return mockCanDelete(rowMenuNode);
  }, [rowMenuNode]);

  const visibleCount = useMemo(() => {
    if (!tree) return 0;
    return flattenVisible(tree, expandedIds).length;
  }, [tree, expandedIds]);

  // loading state
  if (treeLoading && !tree) {
    return <WbsPageSkeleton />;
  }

  // empty state: درخت خالی
  if (tree && tree.length === 0) {
    return (
      <div className="grid grid-cols-[280px_minmax(0,1fr)_380px] min-h-[calc(100vh-200px)]">
        <div />
        <WbsEmptyState
          onUploadClick={() => setImportOpen(true)}
          onBuildManually={() => {
            // TODO: ساخت ریشه اولیه
            void 0;
          }}
        />
        <div />

        <WbsImportModal open={importOpen} onClose={() => setImportOpen(false)} projectId={pid} />
      </div>
    );
  }

  return (
    <>
      {/* edit banner */}
      {editMode && (
        <div className="bg-warning-50 border-b border-[rgba(217,119,6,0.25)] px-3.5 py-2 flex items-center gap-2 text-xs text-warning-700">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>
            <strong>حالت ویرایش فعال است.</strong>{' '}
            می‌توانید آیتم‌ها را با کشیدن جابه‌جا کنید، وزن‌ها را تغییر دهید یا فرزند جدید اضافه کنید.
          </span>
          <div className="mr-auto flex gap-1">
            <button
              type="button"
              onClick={() => dispatch(setEditMode(false))}
              className="inline-flex items-center h-[26px] px-2 text-[11.5px] rounded-md text-warning-700 hover:bg-warning-500/10 border-0 bg-transparent"
            >
              انصراف
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 h-[26px] px-2 text-[11.5px] rounded-md bg-primary-700 text-white hover:bg-primary-900 border-0"
            >
              <Check className="w-[13px] h-[13px]" />
              <span>ذخیره تغییرات</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-[280px_minmax(0,1fr)_380px] min-h-[calc(100vh-200px)]">
        {/* ─── ستون چپ: detail panel ─── */}
        <WbsDetailPanel
          node={selectedNode}
          onEdit={(id) => {
            const n = findNode(fullTree ?? [], id);
            if (n) setEditTarget(n);
          }}
          onAddChild={(parentId) => {
            const n = findNode(fullTree ?? [], parentId);
            if (n) setAddChildTarget(n);
          }}
          onDelete={handleDelete}
          onSelectChild={(id) => dispatch(selectNode(id))}
          onViewReports={(id) => {
            // TODO: navigate به تب گزارش‌ها با فیلتر این آیتم
            void id;
          }}
        />

        {/* ─── ستون وسط: tree table ─── */}
        {tree && (
          <WbsTreeTable
            tree={tree}
            selectedNodeId={selectedNodeId}
            expandedIds={expandedIds}
            editMode={editMode}
            visibleCount={visibleCount}
            onSelect={(id) => dispatch(selectNode(id))}
            onToggleExpand={(id) => dispatch(toggleExpand(id))}
            onExpandAll={(map) => dispatch(setExpandedMap(map))}
            onCollapseAll={(map) => dispatch(setExpandedMap(map))}
            onEdit={(id) => {
              const n = findNode(fullTree ?? [], id);
              if (n) setEditTarget(n);
            }}
            onDelete={handleDelete}
            onRowMenu={(id, position) => setRowMenu({ nodeId: id, position })}
          />
        )}

        {/* ─── ستون راست: toolbar ─── */}
        <WbsToolbar
          filters={filters}
          onFiltersChange={(f) => dispatch(setFilters(f))}
          onResetFilters={() => dispatch(resetFilters())}
          editMode={editMode}
          onEditModeChange={(on) => dispatch(setEditMode(on))}
          summary={summary}
          onImportClick={() => setImportOpen(true)}
          onDownloadTemplate={() => {
            // TODO
            void 0;
          }}
          onExportMsp={() => {
            // TODO
            void 0;
          }}
          onExportExcel={() => {
            // TODO
            void 0;
          }}
        />
      </div>

      {/* مودال‌ها */}
      <WbsImportModal open={importOpen} onClose={() => setImportOpen(false)} projectId={pid} />
      <WbsEditModal
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        projectId={pid}
        node={editTarget}
      />
      <WbsAddChildModal
        open={addChildTarget !== null}
        onClose={() => setAddChildTarget(null)}
        projectId={pid}
        parent={addChildTarget}
      />

      {/* row menu */}
      {rowMenu && rowMenuNode && (
        <WbsRowMenu
          node={rowMenuNode}
          position={rowMenu.position}
          onClose={() => setRowMenu(null)}
          deleteBlockedReason={deleteCheck?.canDelete ? null : deleteCheck?.reason}
          onEdit={(id) => {
            const n = findNode(fullTree ?? [], id);
            if (n) setEditTarget(n);
          }}
          onAddChild={(parentId) => {
            const n = findNode(fullTree ?? [], parentId);
            if (n) setAddChildTarget(n);
          }}
          onAddSibling={() => void 0}
          onAssignOwner={() => void 0}
          onManageCbs={() => void 0}
          onViewReports={() => void 0}
          onAddManualReport={() => void 0}
          onCopyBranch={() => void 0}
          onMoveToParent={() => void 0}
          onViewHistory={() => void 0}
          onDelete={handleDelete}
        />
      )}
    </>
  );

  async function handleDelete(nodeId: number) {
    if (!fullTree) return;
    const node = findNode(fullTree, nodeId);
    if (!node) return;
    const check = mockCanDelete(node);
    if (!check.canDelete) {
      // error toast توسط middleware سراسری هندل می‌شود، ولی اینجا صریح است
      // eslint-disable-next-line no-console
      console.error(check.reason);
      return;
    }
    // مودال تأیید حذف — برای سادگی فعلاً مستقیم
    // TODO: مودال تأیید با متن «آیا از حذف مطمئن هستید؟»
    // در آینده: useDeleteWbsNodeMutation
  }
}

// ─── Helpers ───

function findNodeByCodeLocal(tree: WbsTreeNode[], code: string): WbsTreeNode | null {
  for (const n of tree) {
    if (n.code === code) return n;
    if (n.children.length > 0) {
      const f = findNodeByCodeLocal(n.children, code);
      if (f) return f;
    }
  }
  return null;
}

function findFirstLeaf(tree: WbsTreeNode[]): WbsTreeNode | null {
  for (const n of tree) {
    if (n.isLeaf) return n;
    if (n.children.length > 0) {
      const f = findFirstLeaf(n.children);
      if (f) return f;
    }
  }
  return null;
}

// skeleton صفحه — حین بارگذاری اولیه
function WbsPageSkeleton() {
  return (
    <div className="grid grid-cols-[280px_minmax(0,1fr)_380px] min-h-[calc(100vh-200px)]">
      <div className="bg-white border-l border-gray-200 p-3.5 flex flex-col gap-3.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-md animate-pulse" />
        ))}
      </div>
      <div className="bg-gray-50 p-3.5">
        <div className="h-10 bg-gray-100 rounded mb-3 animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
      <div className="bg-white border-r border-gray-200 p-3.5">
        <div className="h-40 bg-gray-100 rounded-md animate-pulse" />
      </div>
    </div>
  );
}
