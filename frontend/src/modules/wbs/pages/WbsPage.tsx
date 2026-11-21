import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMatch, useNavigate, useSearchParams } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { toast } from '@/shared/components/feedback/toastStore';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import {
  Workspace,
  WorkspaceScroll,
  WorkspaceStatusBar,
  WorkspaceToolbar,
} from '@/shared/components/layout/Workspace';
import { useWorkspace } from '@/shared/components/layout/workspaceContext';
import { AppButton, LinkButton } from '@/shared/components/ui/AppButton';
import { Badge } from '@/shared/components/ui/Badge';
import { Icon } from '@/shared/components/ui/Icon';
import { Legend } from '@/shared/components/ui/Legend';
import { Menu, type MenuEntry } from '@/shared/components/ui/Menu';
import { formatJalaliDate } from '@/shared/utils/date';
import { toFaDigits } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import { useProjectContext } from '@/modules/projects/layout/ProjectShell';
import { ProjectStatusBanner } from '@/modules/projects/components/ProjectStatusBanner';
import type { ProjectDetailDto } from '@/modules/projects/types';
import { PlanDraftBar } from '@/modules/plan/components/PlanDraftBar';
import { useGetPlanDraftValidationQuery } from '@/modules/plan/api/planApi';
import { useGetWbsTreeQuery } from '../api/wbsApi';
import { WbsDetailPanel } from '../components/WbsDetailPanel';
import { WbsEmptyState } from '../components/WbsEmptyState';
import { WbsImportDialog } from '../components/WbsImportDialog';
import { useGetWbsDraftQuery } from '../api/wbsDraftApi';
import type { WbsImportMode } from '../types/import';
import { WbsFilterPane } from '../components/WbsFilterPane';
import { WbsTree } from '../components/WbsTree';
import { columnMenuEntries, useWbsColumns } from '../hooks/useWbsColumns';
import { useWbsPermissions, type WbsPermissions } from '../hooks/useWbsPermissions';
import { itemCountLabel, STATUS_LEGEND } from '../services/progressView';
import { exportWbsExcel } from '../services/wbsExport';
import { buildWbsItemMenu } from '../services/wbsActions';
import {
  activeFilterCount,
  ancestorIds,
  buildWbsTree,
  EMPTY_WBS_FILTERS,
  filterWbsTree,
  parentIds,
  supervisorsOf,
  type WbsFilters,
} from '../services/wbsTree';
import type { WbsItemDto, WbsTreeNode } from '../types';

/**
 * W11 — درخت WBS و جزئیات (`features/wbs.md` ۸).
 *
 * حالت مشاهدهٔ درخت **جاری** (آینهٔ آخرین نسخهٔ اعمال‌شده؛ در پروژهٔ پیش‌نویس، مبنای
 * کاری). هر تغییر برنامه در حالت ویرایش (W12) و روی نسخهٔ کاری انجام می‌شود.
 * همهٔ اعداد از سرور می‌آیند؛ اینجا فقط درخت از فهرست تخت ساخته و فیلتر می‌شود.
 */
export default function WbsPage() {
  const { project, can: projectCan, actions } = useProjectContext();
  const showBanner =
    project.status === 'paused' || project.status === 'completed' || project.status === 'archived';

  return (
    <>
      <PlanDraftBar project={project} />
      {showBanner && (
        <div style={{ padding: '12px 16px 0' }}>
          <ProjectStatusBanner project={project} can={projectCan} actions={actions} />
        </div>
      )}
      {/* حالت درخت (فیلتر، باز و بسته) با عوض شدن پروژه از نو شروع شود */}
      <WbsWorkspace key={project.id} project={project} />
    </>
  );
}

const NO_ITEMS: WbsItemDto[] = [];

function WbsWorkspace({ project }: { project: ProjectDetailDto }) {
  const can = useWbsPermissions(project);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('item');

  const treeQuery = useGetWbsTreeQuery(project.id);
  const validationQuery = useGetPlanDraftValidationQuery(project.id, { skip: !can.validateDraft });
  // پس از کنار گذاشتن یا اعمال، نتیجهٔ قبلی نباید بماند: فقط پاسخ همین نسخهٔ کاری
  const validation = can.validateDraft ? validationQuery.currentData : undefined;

  const [filters, setFilters] = useState<WbsFilters>(EMPTY_WBS_FILTERS);
  const [visibleColumns, toggleColumn, resetColumns] = useWbsColumns();
  const [isExporting, setIsExporting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // W39 — مسیر `/wbs/import?mode=` یا فایل رهاشده روی W13
  const navigate = useNavigate();
  const importRoute = useMatch('/projects/:projectId/wbs/import');
  const [droppedFile, setDroppedFile] = useState<{ file: File | null } | null>(null);
  const importState = importRoute
    ? {
        file: droppedFile?.file ?? null,
        mode: (searchParams.get('mode') as WbsImportMode | null) ?? undefined,
      }
    : droppedFile
      ? { file: droppedFile.file, mode: undefined }
      : null;
  const openImport = (file: File | null) => setDroppedFile({ file });
  const openMsp = () => navigate(`${ROUTES.mspImport}?project=${project.id}`);
  const closeImport = () => {
    setDroppedFile(null);
    if (importRoute) navigate(ROUTES.wbs(project.id), { replace: true });
  };

  const items = treeQuery.data?.items ?? NO_ITEMS;
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const childrenOf = useMemo(() => {
    const map = new Map<EntityId, EntityId[]>();
    for (const item of items) {
      if (!item.parentId) continue;
      const list = map.get(item.parentId) ?? [];
      list.push(item.id);
      map.set(item.parentId, list);
    }
    return map;
  }, [items]);
  const roots = useMemo(() => buildWbsTree(items), [items]);
  const supervisors = useMemo(() => supervisorsOf(items), [items]);

  const isFiltering = activeFilterCount(filters) > 0;
  const filtered = useMemo(
    () => (isFiltering ? filterWbsTree(roots, filters) : null),
    [isFiltering, roots, filters],
  );

  // ── باز و بسته ──
  const [expanded, setExpanded] = useState<Set<EntityId>>(() => new Set());
  const [filterExpanded, setFilterExpanded] = useState<Set<EntityId>>(() => new Set());
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || items.length === 0) return;
    initialized.current = true;
    // دو سطح اول باز؛ درخت بزرگ فقط سطح اول (`features/wbs.md` ۱۲)
    const depthLimit = items.length > 300 ? 0 : 1;
    const depthOf = (item: WbsItemDto) => ancestorIds(byId, item.id).length;
    const initial = new Set(
      items.filter((item) => !item.isLeaf && depthOf(item) <= depthLimit).map((item) => item.id),
    );
    if (selectedId) ancestorIds(byId, selectedId).forEach((id) => initial.add(id));
    setExpanded(initial);
  }, [items, byId, selectedId]);

  useEffect(() => {
    if (filtered) setFilterExpanded(new Set(filtered.expandIds));
  }, [filtered]);

  // آیتمی که از بیرون انتخاب شده (W10، پیوند کپی‌شده، مسیر) باید در درخت دیده شود
  useEffect(() => {
    if (!selectedId || !byId.has(selectedId)) return;
    const ancestors = ancestorIds(byId, selectedId);
    setExpanded((previous) =>
      ancestors.every((id) => previous.has(id)) ? previous : new Set([...previous, ...ancestors]),
    );
  }, [selectedId, byId]);

  const expandedIds = filtered ? filterExpanded : expanded;
  const setExpandedIds = filtered ? setFilterExpanded : setExpanded;

  const toggle = useCallback(
    (id: EntityId) =>
      setExpandedIds((previous) => {
        const next = new Set(previous);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    [setExpandedIds],
  );

  const descendantsOf = useCallback(
    (id: EntityId): EntityId[] => {
      const result: EntityId[] = [];
      const walk = (current: EntityId) =>
        (childrenOf.get(current) ?? []).forEach((child) => {
          result.push(child);
          walk(child);
        });
      walk(id);
      return result;
    },
    [childrenOf],
  );

  const expandBranch = useCallback(
    (id: EntityId) =>
      setExpandedIds((previous) => {
        const next = new Set(previous);
        next.add(id);
        descendantsOf(id).forEach((child) => {
          if (childrenOf.has(child)) next.add(child);
        });
        return next;
      }),
    [setExpandedIds, descendantsOf, childrenOf],
  );

  // ── انتخاب در URL (`?item=`) تا پیوند کپی‌شده همین حالت را باز کند ──
  const select = useCallback(
    (itemId: EntityId) =>
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.set('item', itemId);
          return next;
        },
        { replace: true },
      ),
    [setSearchParams],
  );
  const clearSelection = useCallback(
    () =>
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.delete('item');
          return next;
        },
        { replace: true },
      ),
    [setSearchParams],
  );

  // ── گروه‌های نامتعادل روی ردیف‌ها: فقط وقتی درخت نمایش‌داده‌شده خودِ نسخهٔ کاری است ──
  const unbalanced = useMemo(() => {
    const map = new Map<EntityId, number>();
    if (project.status !== 'draft' || !validation) return map;
    for (const issue of validation.errors) {
      if (issue.code === 'weight_sum' && issue.parentId && issue.currentSum !== undefined)
        map.set(issue.parentId, issue.currentSum);
    }
    return map;
  }, [project.status, validation]);

  const menuFor = useCallback(
    (node: WbsTreeNode) =>
      buildWbsItemMenu(node, {
        projectId: project.id,
        can,
        descendantCount: node.isLeaf ? 0 : descendantsOf(node.id).length,
        onExpandBranch: node.isLeaf ? undefined : () => expandBranch(node.id),
      }),
    [project.id, can, descendantsOf, expandBranch],
  );

  async function exportExcel() {
    setIsExporting(true);
    try {
      exportWbsExcel(project, treeQuery.data?.items ?? [], { includeAmounts: can.viewAmounts });
      toast.success('خروجی Excel آماده شد.');
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : 'خروجی Excel ساخته نشد. دوباره امتحان کنید.',
      );
    } finally {
      setIsExporting(false);
    }
  }

  const nodes = filtered ? filtered.nodes : roots;
  const selected = selectedId ? (byId.get(selectedId) ?? null) : null;

  // W13 — پروژهٔ بدون ساختار: صفحهٔ کامل به‌جای کارگاه درخت
  if (treeQuery.isSuccess && items.length === 0) {
    return (
      <>
        <WbsEmptyState
          project={project}
          can={can}
          onExcelFile={(file) => openImport(file)}
          onMspFile={openMsp}
        />
        {importState && (
          <ImportFlow
            project={project}
            items={items}
            file={importState.file}
            mode={importState.mode}
            onClose={closeImport}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Workspace
        fillViewport
        minHeight={520}
        isDetailOpen={selectedId !== null}
        onDetailClose={clearSelection}
        toolbarLabel="فیلترها و ابزار"
        detailLabel="جزئیات آیتم"
        toolbar={
          <WbsFilterPane
            project={project}
            can={can}
            tree={treeQuery.data}
            isLoading={treeQuery.isLoading}
            filters={filters}
            onFiltersChange={setFilters}
            supervisors={supervisors}
            validation={validation}
            onExport={() => void exportExcel()}
            isExporting={isExporting}
          />
        }
        detail={
          <WbsDetailPanel
            projectId={project.id}
            itemId={selectedId}
            can={can}
            onSelect={select}
            descendantCount={(id) => descendantsOf(id).length}
          />
        }
      >
        <TreeToolbar
          project={project}
          can={can}
          selected={selected}
          byId={byId}
          onSelect={select}
          activeFilters={activeFilterCount(filters)}
          onExpandAll={() =>
            setExpandedIds(filtered ? new Set(filtered.expandIds) : parentIds(items))
          }
          onCollapseAll={() => setExpandedIds(new Set())}
          columnsMenu={columnMenuEntries(
            visibleColumns,
            toggleColumn,
            resetColumns,
            can.viewAmounts,
          )}
        />

        <WorkspaceScroll scrollRef={scrollRef} label="درخت WBS">
          {treeQuery.isLoading ? (
            <div style={{ padding: 16 }}>
              <SkeletonTable rows={10} />
            </div>
          ) : treeQuery.isError ? (
            <EmptyState
              icon="server"
              iconStyle={{ background: '#FEE2E2', color: '#B91C1C' }}
              title="درخت WBS بارگذاری نشد"
              description="مشکل از سمت ماست و ساختار پروژه سالم است. چند لحظهٔ دیگر دوباره امتحان کنید."
              actions={
                <AppButton
                  variant="primary"
                  size="sm"
                  icon="refresh-cw"
                  onClick={() => void treeQuery.refetch()}
                >
                  تلاش دوباره
                </AppButton>
              }
              style={{ marginTop: 48 }}
            />
          ) : nodes.length === 0 ? (
            <EmptyState
              icon="search-x"
              title="هیچ آیتمی با این فیلترها نیست"
              description="فیلترها را کم کنید یا جستجو را با عنوان یا کد دیگری امتحان کنید."
              actions={
                <AppButton
                  variant="outline"
                  size="sm"
                  icon="x"
                  onClick={() => setFilters(EMPTY_WBS_FILTERS)}
                >
                  پاک کردن فیلترها
                </AppButton>
              }
              style={{ marginTop: 48 }}
            />
          ) : (
            <WbsTree
              nodes={nodes}
              visibleColumns={visibleColumns}
              canViewAmounts={can.viewAmounts}
              expandedIds={expandedIds}
              onToggleExpand={toggle}
              selectedId={selectedId}
              onSelect={(node) => select(node.id)}
              contextIds={filtered?.contextIds ?? EMPTY_SET}
              unbalanced={unbalanced}
              menuFor={menuFor}
              scrollRef={scrollRef}
            />
          )}
        </WorkspaceScroll>

        <WorkspaceStatusBar>
          <span className="row wrap g12">
            <span>
              <strong className="tx9">
                {itemCountLabel(
                  filtered?.matchCount ?? items.length,
                  items.length,
                  Boolean(filtered),
                )}
              </strong>
            </span>
            <Legend entries={STATUS_LEGEND} style={{ gap: 12 }} />
          </span>
          <span className="row g4">
            <Icon name="mouse-pointer-click" size={12} />
            برای جزئیات روی ردیف کلیک کنید · ↑ ↓ برای پیمایش
          </span>
        </WorkspaceStatusBar>
      </Workspace>
      {importState && (
        <ImportFlow
          project={project}
          items={items}
          file={importState.file}
          mode={importState.mode}
          onClose={closeImport}
        />
      )}
    </>
  );
}

const EMPTY_SET: ReadonlySet<EntityId> = new Set();

function TreeToolbar({
  project,
  can,
  selected,
  byId,
  onSelect,
  activeFilters,
  onExpandAll,
  onCollapseAll,
  columnsMenu,
}: {
  project: ProjectDetailDto;
  can: WbsPermissions;
  selected: WbsItemDto | null;
  byId: ReadonlyMap<EntityId, WbsItemDto>;
  onSelect: (id: EntityId) => void;
  activeFilters: number;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  columnsMenu: MenuEntry[];
}) {
  const { layout, openToolbar } = useWorkspace();
  const path = selected ? ancestorIds(byId, selected.id).reverse() : [];

  return (
    <WorkspaceToolbar>
      {layout === 'one' && (
        <AppButton variant="outline" size="sm" icon="filter" onClick={openToolbar}>
          فیلترها
          {activeFilters > 0 && (
            <Badge size="sm" tone="pri">
              {toFaDigits(activeFilters)}
            </Badge>
          )}
        </AppButton>
      )}

      <nav
        className="row g4 t-sm tx5 grow"
        aria-label="مسیر آیتم"
        // در موبایل بدون آیتم انتخاب‌شده فقط جای دکمه‌ها را تنگ می‌کند
        style={{
          minWidth: 0,
          flexWrap: 'wrap',
          visibility: layout === 'one' && !selected ? 'hidden' : undefined,
        }}
      >
        {selected ? (
          <>
            <span>مسیر:</span>
            {path.map((id) => {
              const ancestor = byId.get(id);
              if (!ancestor) return null;
              return (
                <span key={id} className="row g4">
                  <button
                    type="button"
                    className="mono link t-sm"
                    dir="ltr"
                    title={ancestor.title}
                    onClick={() => onSelect(id)}
                  >
                    {ancestor.code}
                  </button>
                  <Icon name="chevron-left" size={12} />
                </span>
              );
            })}
            <span className="tx9 fw5 trunc">{selected.title}</span>
          </>
        ) : (
          <span>
            {project.status === 'draft' ? 'مبنای کاری — هنوز اعمال نشده' : 'ساختار جاری'}
            {project.progress?.dataDate && (
              <> · پیشرفت تا {formatJalaliDate(project.progress.dataDate)}</>
            )}
          </span>
        )}
      </nav>

      <AppButton variant="ghost" size="sm" icon="chevrons-up-down" onClick={onExpandAll}>
        گسترش همه
      </AppButton>
      <AppButton variant="ghost" size="sm" icon="chevrons-down-up" onClick={onCollapseAll}>
        جمع کردن
      </AppButton>
      <span className="vsep" />
      <Menu
        entries={columnsMenu}
        width={220}
        trigger={(props) => (
          <AppButton {...props} variant="ghost" size="sm" icon="sliders-horizontal">
            ستون‌ها
          </AppButton>
        )}
      />
      {can.editStructure && (
        <LinkButton
          to={ROUTES.wbsEdit(project.id, selected?.id)}
          variant="primary"
          size="sm"
          icon="plus"
        >
          آیتم جدید
        </LinkButton>
      )}
    </WorkspaceToolbar>
  );
}

/** W39 در دیالوگ: شمارهٔ بازنگری نسخهٔ کاری را می‌گیرد و پس از ورود به درخت برمی‌گردد. */
function ImportFlow({
  project,
  items,
  file,
  mode,
  onClose,
}: {
  project: ProjectDetailDto;
  items: WbsItemDto[];
  file: File | null;
  mode: WbsImportMode | undefined;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const draft = useGetWbsDraftQuery(project.id);
  if (!draft.data) return null;
  return (
    <WbsImportDialog
      project={project}
      draftRevision={draft.data.draftRevision}
      items={items}
      initialMode={mode}
      initialFile={file}
      onClose={onClose}
      onMspFile={() => navigate(`${ROUTES.mspImport}?project=${project.id}`)}
      onImported={(firstId) => {
        onClose();
        // پروژهٔ پیش‌نویس: درخت جاری همان مبنای کاری است؛ پروژهٔ فعال: نسخهٔ کاری در W12
        navigate(
          project.status === 'draft'
            ? ROUTES.wbs(project.id)
            : ROUTES.wbsEdit(project.id, firstId ?? undefined),
        );
      }}
    />
  );
}
