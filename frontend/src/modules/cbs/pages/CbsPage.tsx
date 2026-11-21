import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { CBS_DEEP_LINKS, ROUTES } from '@/config/routes';
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
import type { MenuEntry } from '@/shared/components/ui/Menu';
import { formatJalaliDate } from '@/shared/utils/date';
import { toFaDigits } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import { useProjectContext } from '@/modules/projects/layout/ProjectShell';
import { ProjectStatusBanner } from '@/modules/projects/components/ProjectStatusBanner';
import type { ProjectDetailDto } from '@/modules/projects/types';
import { PlanDraftBar } from '@/modules/plan/components/PlanDraftBar';
import { useGetBudgetRevisionsQuery, useGetCbsTreeQuery } from '../api/cbsApi';
import { CbsDetailPanel } from '../components/CbsDetailPanel';
import { CbsSidePane } from '../components/CbsSidePane';
import { CbsTree } from '../components/CbsTree';
import { RevisionDialogLoader } from '../components/RevisionRequestDialog';
import { useCbsPermissions, type CbsPermissions } from '../hooks/useCbsPermissions';
import { exportCbsExcel } from '../services/cbsExport';
import {
  activeCbsFilterCount,
  ancestorCbsIds,
  buildCbsTree,
  CONSUMPTION_LEGEND,
  EMPTY_CBS_FILTERS,
  filterCbsTree,
  type CbsFilters,
  type CbsTreeNode,
} from '../services/cbsView';
import type { CbsItemDto } from '../types';

/**
 * W14 — دفتر CBS (`features/cbs.md` ۱۲).
 *
 * حالت مشاهده (تصمیم 1405/08/15): قلم جدید و ویرایش در «حالت ویرایش» CBS روی نسخهٔ
 * کاری می‌آید. درخواست بازنگری بودجه (G14) همین‌جا ثبت می‌شود. همهٔ اعداد از سرور.
 */
export default function CbsPage() {
  const { project, can: projectCan, actions } = useProjectContext();
  const showBanner =
    project.status === 'paused' || project.status === 'completed' || project.status === 'archived';
  return (
    <>
      <PlanDraftBar project={project} editPath={ROUTES.cbsEdit(project.id)} />
      {showBanner && (
        <div style={{ padding: '12px 16px 0' }}>
          <ProjectStatusBanner project={project} can={projectCan} actions={actions} />
        </div>
      )}
      <CbsWorkspace key={project.id} project={project} />
    </>
  );
}

const NO_ITEMS: CbsItemDto[] = [];
const EMPTY_SET: ReadonlySet<EntityId> = new Set();

function CbsWorkspace({ project }: { project: ProjectDetailDto }) {
  const can = useCbsPermissions(project);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('item');

  const treeQuery = useGetCbsTreeQuery(project.id);
  const revisionsQuery = useGetBudgetRevisionsQuery(project.id, {
    skip: project.status === 'draft',
  });
  const [filters, setFilters] = useState<CbsFilters>(EMPTY_CBS_FILTERS);
  const [isExporting, setIsExporting] = useState(false);
  const [revisionFor, setRevisionFor] = useState<EntityId | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const items = treeQuery.data?.items ?? NO_ITEMS;
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const roots = useMemo(() => buildCbsTree(items), [items]);
  const isFiltering = activeCbsFilterCount(filters) > 0;
  const filtered = useMemo(
    () => (isFiltering ? filterCbsTree(roots, filters) : null),
    [isFiltering, roots, filters],
  );

  // ── باز و بسته: پیش‌فرض همهٔ گروه‌ها باز (درخت CBS کم‌عمق است) ──
  const [expanded, setExpanded] = useState<Set<EntityId>>(() => new Set());
  const [filterExpanded, setFilterExpanded] = useState<Set<EntityId>>(() => new Set());
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current || items.length === 0) return;
    initialized.current = true;
    setExpanded(new Set(items.filter((item) => !item.isLeaf).map((item) => item.id)));
  }, [items]);
  useEffect(() => {
    if (filtered) setFilterExpanded(new Set(filtered.expandIds));
  }, [filtered]);
  useEffect(() => {
    if (!selectedId || !byId.has(selectedId)) return;
    const ancestors = ancestorCbsIds(byId, selectedId);
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

  const menuFor = useCallback(
    (node: CbsTreeNode): MenuEntry[] => {
      const entries: MenuEntry[] = [
        { key: 'detail', label: 'جزئیات', icon: 'eye', onSelect: () => select(node.id) },
      ];
      if (node.isLeaf) {
        entries.push({
          key: 'links',
          label: 'اتصال‌های WBS',
          icon: 'link-2',
          to: CBS_DEEP_LINKS.links(project.id, node.id),
        });
        if (can.viewCharts && node.progress)
          entries.push({
            key: 'trend',
            label: 'روند مصرف',
            icon: 'line-chart',
            to: CBS_DEEP_LINKS.costTrend(project.id, node.id),
          });
        if (can.requestRevision)
          entries.push({
            key: 'request',
            label: 'درخواست بازنگری بودجه',
            icon: 'file-pen-line',
            onSelect: () => {
              select(node.id);
              setRevisionFor(node.id);
            },
          });
        if (can.reviseBudget)
          entries.push({
            key: 'revise',
            label: 'بازنگری بودجه',
            icon: 'pencil',
            to: ROUTES.cbsEdit(project.id, node.id),
          });
      }
      if (can.editDraft)
        entries.push(
          { key: 'd1', separator: true },
          {
            key: 'edit',
            label: 'ویرایش در حالت ویرایش',
            icon: 'pencil',
            to: ROUTES.cbsEdit(project.id, node.id),
          },
        );
      return entries;
    },
    [project.id, can, select],
  );

  async function exportExcel() {
    setIsExporting(true);
    try {
      exportCbsExcel(project, treeQuery.data?.items ?? [], { includeAmounts: can.viewAmounts });
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
  const leafCount = treeQuery.data?.summary.counts.leaves ?? 0;

  return (
    <>
      <Workspace
        fillViewport
        minHeight={520}
        isDetailOpen={selectedId !== null}
        onDetailClose={clearSelection}
        toolbarLabel="خلاصه و فیلترها"
        detailLabel="جزئیات قلم"
        toolbar={
          <CbsSidePane
            project={project}
            can={can}
            tree={treeQuery.data}
            isLoading={treeQuery.isLoading}
            filters={filters}
            onFiltersChange={setFilters}
            revisions={revisionsQuery.data}
            onSelectItem={select}
            onExport={() => void exportExcel()}
            isExporting={isExporting}
          />
        }
        detail={
          <CbsDetailPanel
            projectId={project.id}
            itemId={selectedId}
            can={can}
            onSelect={select}
            onRequestRevision={(detail) => setRevisionFor(detail.item.id)}
          />
        }
      >
        <Toolbar
          project={project}
          can={can}
          selected={selected}
          byId={byId}
          onSelect={select}
          activeFilters={activeCbsFilterCount(filters)}
          onExpandAll={() =>
            setExpandedIds(
              filtered
                ? new Set(filtered.expandIds)
                : new Set(items.filter((item) => !item.isLeaf).map((item) => item.id)),
            )
          }
          onCollapseAll={() => setExpandedIds(new Set())}
          costIndicesDate={treeQuery.data?.costIndicesDate ?? null}
        />

        <WorkspaceScroll scrollRef={scrollRef} label="درخت CBS">
          {treeQuery.isLoading ? (
            <div style={{ padding: 16 }}>
              <SkeletonTable rows={10} />
            </div>
          ) : treeQuery.isError ? (
            <EmptyState
              icon="server"
              iconStyle={{ background: '#FEE2E2', color: '#B91C1C' }}
              title="دفتر CBS بارگذاری نشد"
              description="مشکل از سمت ماست و داده‌های هزینه سالم است. چند لحظهٔ دیگر دوباره امتحان کنید."
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
          ) : items.length === 0 ? (
            <EmptyState
              icon="wallet"
              title="این پروژه هنوز CBS ندارد"
              description="اقلام هزینه را در حالت ویرایش بسازید یا از Excel وارد کنید."
              actions={
                can.editDraft ? (
                  <LinkButton
                    to={ROUTES.cbsEdit(project.id)}
                    variant="primary"
                    size="sm"
                    icon="pencil"
                  >
                    حالت ویرایش
                  </LinkButton>
                ) : undefined
              }
              style={{ marginTop: 48 }}
            />
          ) : nodes.length === 0 ? (
            <EmptyState
              icon="search-x"
              title="هیچ قلمی با این فیلترها نیست"
              description="فیلترها را کم کنید یا جستجو را با عنوان یا کد دیگری امتحان کنید."
              actions={
                <AppButton
                  variant="outline"
                  size="sm"
                  icon="x"
                  onClick={() => setFilters(EMPTY_CBS_FILTERS)}
                >
                  پاک کردن فیلترها
                </AppButton>
              }
              style={{ marginTop: 48 }}
            />
          ) : (
            <CbsTree
              nodes={nodes}
              canViewAmounts={can.viewAmounts}
              expandedIds={expandedIds}
              onToggleExpand={toggle}
              selectedId={selectedId}
              onSelect={(node) => select(node.id)}
              contextIds={filtered?.contextIds ?? EMPTY_SET}
              menuFor={menuFor}
              scrollRef={scrollRef}
            />
          )}
        </WorkspaceScroll>

        <WorkspaceStatusBar>
          <span className="row wrap g12">
            <strong className="tx9">
              {filtered
                ? `${toFaDigits(filtered.matchCount)} از ${toFaDigits(items.length)} قلم`
                : items.length > leafCount
                  ? `${toFaDigits(leafCount)} قلم در ${toFaDigits(items.length - leafCount)} گروه`
                  : `${toFaDigits(leafCount)} قلم`}
            </strong>
            <Legend entries={CONSUMPTION_LEGEND} style={{ gap: 12 }} />
          </span>
          <span className="row g4">
            <Icon name="mouse-pointer-click" size={12} />
            برای جزئیات روی ردیف کلیک کنید · ↑ ↓ برای پیمایش
          </span>
        </WorkspaceStatusBar>
      </Workspace>

      {revisionFor && (
        <RevisionDialogLoader
          projectId={project.id}
          itemId={revisionFor}
          onClose={() => setRevisionFor(null)}
        />
      )}
    </>
  );
}

function Toolbar({
  project,
  can,
  selected,
  byId,
  onSelect,
  activeFilters,
  onExpandAll,
  onCollapseAll,
  costIndicesDate,
}: {
  project: ProjectDetailDto;
  can: CbsPermissions;
  selected: CbsItemDto | null;
  byId: ReadonlyMap<EntityId, CbsItemDto>;
  onSelect: (id: EntityId) => void;
  activeFilters: number;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  costIndicesDate: string | null;
}) {
  const { layout, openToolbar } = useWorkspace();
  const path = selected ? ancestorCbsIds(byId, selected.id).reverse() : [];

  return (
    <WorkspaceToolbar>
      {layout === 'one' && (
        <AppButton variant="outline" size="sm" icon="filter" onClick={openToolbar}>
          خلاصه و فیلترها
          {activeFilters > 0 && (
            <Badge size="sm" tone="pri">
              {toFaDigits(activeFilters)}
            </Badge>
          )}
        </AppButton>
      )}
      <nav
        className="row g4 t-sm tx5 grow"
        aria-label="مسیر قلم"
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
            {project.status === 'draft' ? 'مبنای کاری — هنوز اعمال نشده' : 'CBS جاری'}
            {costIndicesDate && <> · هزینه تا {formatJalaliDate(costIndicesDate)}</>}
          </span>
        )}
      </nav>
      <AppButton
        variant="ghost"
        size="sm"
        icon="chevrons-up-down"
        onClick={onExpandAll}
        aria-label="گسترش همه"
        title="گسترش همه"
      />
      <AppButton
        variant="ghost"
        size="sm"
        icon="chevrons-down-up"
        onClick={onCollapseAll}
        aria-label="جمع کردن همه"
        title="جمع کردن همه"
      />
      {can.editDraft && (
        <LinkButton
          to={ROUTES.cbsEdit(project.id, selected?.id)}
          variant="primary"
          size="sm"
          icon="plus"
        >
          قلم جدید
        </LinkButton>
      )}
    </WorkspaceToolbar>
  );
}
