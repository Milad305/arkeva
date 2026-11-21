import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBlocker, useNavigate, useSearchParams } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { Content } from '@/shared/components/layout/AppShell';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { Workspace, WorkspaceToolbar } from '@/shared/components/layout/Workspace';
import { useWorkspace } from '@/shared/components/layout/workspaceContext';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton } from '@/shared/components/ui/AppButton';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { Icon, type IconName } from '@/shared/components/ui/Icon';
import { useHasPermission } from '@/shared/hooks/useHasAccess';
import { toFaDigits } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import { useProjectContext } from '@/modules/projects/layout/ProjectShell';
import type { ProjectDetailDto } from '@/modules/projects/types';
import { ApplyDraftDialog } from '@/modules/plan/components/ApplyDraftDialog';
import { DraftEditBar } from '@/modules/plan/components/DraftEditBar';
import { useDraftOpsEditor } from '@/modules/plan/hooks/useDraftOpsEditor';
import { applyBlockedReason } from '@/modules/plan/services/applyBlockedReason';
import {
  useGetCurrentLinksQuery,
  useGetDraftLinksQuery,
  usePreviewLinkOpsMutation,
  useSaveLinkOpsMutation,
} from '../api/linksApi';
import { CopyLinksDialog } from '../components/CopyLinksDialog';
import { LeafLinksPanel } from '../components/LeafLinksPanel';
import { LeafPane, type LeafFilter } from '../components/LeafPane';
import { LinkImportDialog } from '../components/LinkImportDialog';
import type { LinkLeafDto, LinkOp, LinksViewDto } from '../types';

/**
 * W15 — اتصال WBS ↔ CBS (`features/cbs.md` ۵ و ۱۲).
 *
 * اتصال جزء نسخهٔ برنامه است (D05). دارندهٔ `plan.edit_draft` در پروژهٔ باز مستقیم روی
 * نسخهٔ کاری ویرایش می‌کند، با همان نوار ذخیره و «اعمال» W12 (تصمیم 1405/08/15)؛ بقیه
 * اتصال‌های برنامهٔ جاری را فقط می‌بینند. زیربودجه، BAC، سهم و تعادل را سرور می‌سازد.
 */
export default function LinksPage() {
  const { project } = useProjectContext();
  const editDraft = useHasPermission('plan.edit_draft');
  const canEdit =
    editDraft &&
    (project.status === 'draft' || project.status === 'active' || project.status === 'paused');
  return canEdit ? (
    <LinksEditor key={project.id} project={project} />
  ) : (
    <LinksReadOnly key={project.id} project={project} />
  );
}

function LinksReadOnly({ project }: { project: ProjectDetailDto }) {
  const query = useGetCurrentLinksQuery(project.id);
  if (query.isLoading) return <Loading />;
  if (query.isError || !query.data) return <LoadError onRetry={() => void query.refetch()} />;
  return <LinksWorkspace view={query.data} canEdit={false} />;
}

function LinksEditor({ project }: { project: ProjectDetailDto }) {
  const canApply =
    useHasPermission('plan.apply') && (project.status === 'active' || project.status === 'paused');
  const navigate = useNavigate();
  const query = useGetDraftLinksQuery(project.id);
  const [preview] = usePreviewLinkOpsMutation();
  const [saveOps, saveState] = useSaveLinkOpsMutation();
  const editor = useDraftOpsEditor<LinkOp, LinksViewDto>({
    projectId: project.id,
    query,
    preview,
    save: saveOps,
    isSaving: saveState.isLoading,
    merge: mergeLinkOp,
  });
  const [applying, setApplying] = useState(false);
  const [importing, setImporting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const dirty = editor.ops.length > 0;
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  // «اعمال…» از نوار نسخهٔ کاری
  const view = editor.view;
  const wantsApply = searchParams.get('apply') === '1';
  useEffect(() => {
    if (!wantsApply || !view?.draft) return;
    setApplying(true);
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.delete('apply');
        return next;
      },
      { replace: true },
    );
  }, [wantsApply, view, setSearchParams]);

  // Ctrl+Z واگرد بیرون از فیلدها
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const inField = (event.target as HTMLElement | null)?.closest?.(
        'input, textarea, select, [contenteditable="true"]',
      );
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !inField) {
        event.preventDefault();
        editor.undo();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [editor]);

  if (editor.isLoading) return <Loading />;
  if (editor.isError || !view) return <LoadError onRetry={editor.reload} />;

  const draftName = view.draft
    ? view.draft.kind === 'baseline'
      ? 'مبنای کاری'
      : `بازنگری کاری R${view.draft.number}`
    : `بازنگری کاری R${(project.plan.current?.number ?? 0) + 1}`;
  const validation = view.validation;

  return (
    <>
      <DraftEditBar
        title={`ویرایش اتصالات — ${draftName}`}
        syncsToCurrent={view.syncsToCurrent}
        hasDraft={Boolean(view.draft)}
        dirtyCount={editor.ops.length}
        isPreviewing={editor.isPreviewing}
        backTo={ROUTES.cbs(project.id)}
        backLabel="دفتر CBS"
        onSave={() => void editor.save()}
        isSaving={editor.isSaving}
        saveBlockedReason={
          editor.conflict
            ? 'نسخهٔ کاری کهنه است؛ بارگذاری دوباره کنید'
            : editor.opErrors.length > 0
              ? 'سرور یک تغییر را نپذیرفت؛ اول آن را واگرد کنید'
              : undefined
        }
        showApply={canApply}
        applyDisabledReason={applyBlockedReason(
          dirty,
          Boolean(view.draft),
          validation?.errors.length ?? 0,
          validation?.canApply ?? false,
        )}
        onApply={() => setApplying(true)}
      />
      {editor.conflict && (
        <div style={{ padding: '12px 16px 0' }}>
          <Alert
            tone="err"
            icon="alert-octagon"
            action={
              <AppButton size="sm" variant="outline" icon="refresh-cw" onClick={editor.reload}>
                بارگذاری دوباره
              </AppButton>
            }
          >
            {editor.conflict}
          </Alert>
        </div>
      )}
      {editor.opErrors.length > 0 && (
        <div style={{ padding: '12px 16px 0' }}>
          <Alert
            tone="err"
            icon="alert-circle"
            action={
              <AppButton size="sm" variant="outline" icon="undo-2" onClick={editor.undo}>
                واگرد
              </AppButton>
            }
          >
            {editor.opErrors[0]!.message}
          </Alert>
        </div>
      )}

      <LinksWorkspace
        view={view}
        canEdit
        onOp={editor.apply}
        touchedIds={touchedOf(editor.ops)}
        onImport={dirty ? undefined : () => setImporting(true)}
      />

      {importing && (
        <LinkImportDialog
          projectId={project.id}
          draftRevision={view.draftRevision}
          onClose={() => setImporting(false)}
        />
      )}

      {applying && view.draft && validation && (
        <ApplyDraftDialog
          projectId={project.id}
          versionName={draftName.replace('کاری ', '')}
          draftRevision={view.draftRevision}
          validation={validation}
          canViewAmounts
          onClose={() => setApplying(false)}
          onShowItem={(id) => {
            setApplying(false);
            navigate(ROUTES.wbsEdit(project.id, id));
          }}
          onApplied={() => setApplying(false)}
        />
      )}

      <ConfirmDialog
        isOpen={blocker.state === 'blocked'}
        onCancel={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
        tone="warning"
        icon="alert-triangle"
        title="تغییرهای ذخیره‌نشده از بین می‌رود"
        description={`${toFaDigits(editor.ops.length)} تغییر هنوز در نسخهٔ کاری ذخیره نشده است. اگر بروید، دیگر برنمی‌گردند.`}
        confirmLabel="رفتن بدون ذخیره"
        cancelLabel="ماندن و ذخیره"
      />
    </>
  );
}

/** ویرایش پشت‌سرهم مقدار یک اتصال یک عمل بماند. */
function mergeLinkOp(ops: LinkOp[], op: LinkOp): LinkOp[] {
  const last = ops[ops.length - 1];
  if (
    (op.type === 'setQuantity' || op.type === 'setAmount') &&
    last &&
    last.type === op.type &&
    last.wbsItemId === op.wbsItemId &&
    last.cbsItemId === op.cbsItemId
  ) {
    return [...ops.slice(0, -1), op];
  }
  return [...ops, op];
}

function touchedOf(ops: LinkOp[]): Set<EntityId> {
  const ids = new Set<EntityId>();
  for (const op of ops) {
    if (op.type === 'copy') op.toWbsItemIds.forEach((id) => ids.add(id));
    else ids.add(op.wbsItemId);
  }
  return ids;
}

const NO_TOUCHED: ReadonlySet<EntityId> = new Set();

function LinksWorkspace({
  view,
  canEdit,
  onOp,
  touchedIds = NO_TOUCHED,
  onImport,
}: {
  view: LinksViewDto;
  canEdit: boolean;
  onOp?: (op: LinkOp) => void;
  touchedIds?: ReadonlySet<EntityId>;
  onImport?: () => void;
}) {
  const { project } = useProjectContext();
  const canViewAmounts = useHasPermission('cbs.view_amounts');
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<LeafFilter>('all');
  const [copying, setCopying] = useState<LinkLeafDto | null>(null);
  const byId = useMemo(() => new Map(view.leaves.map((leaf) => [leaf.id, leaf])), [view.leaves]);

  const cbsParam = searchParams.get('cbsItem');
  const cbsFilter = cbsParam ? (view.cbsItems.find((item) => item.id === cbsParam) ?? null) : null;

  // پیش‌فرض: برگ از پیوند (`?wbsItem=`)، وگرنه اولین برگ بی‌اتصال، وگرنه اولین برگ
  const requested = searchParams.get('wbsItem');
  const fallback =
    view.leaves.find((leaf) => leaf.linkable && leaf.linkCount === 0) ??
    view.leaves.find((leaf) => leaf.linkable);
  const selected = (requested ? byId.get(requested) : undefined) ?? fallback ?? null;

  const select = useCallback(
    (id: EntityId) =>
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.set('wbsItem', id);
          return next;
        },
        { replace: true },
      ),
    [setSearchParams],
  );

  const path = useMemo(() => {
    const result: LinkLeafDto[] = [];
    let parentId = selected?.parentId ?? null;
    while (parentId) {
      const parent = byId.get(parentId);
      if (!parent) break;
      result.unshift(parent);
      parentId = parent.parentId;
    }
    return result;
  }, [selected, byId]);

  // خطاهای V-08 قلم‌هایی که برگ انتخاب‌شده به آن‌ها وصل است
  const issues = useMemo(() => {
    if (!selected || !view.validation) return [];
    const linked = new Set(
      view.links.filter((link) => link.wbsItemId === selected.id).map((link) => link.cbsItemId),
    );
    return view.validation.errors.filter(
      (issue) =>
        issue.code === 'cbs_over_allocated' && issue.cbsItemId && linked.has(issue.cbsItemId),
    );
  }, [selected, view]);

  if (view.leaves.length === 0) {
    return (
      <Content>
        <EmptyState
          inCard
          icon="list-tree"
          title="این پروژه هنوز ساختار کار ندارد"
          description="اول در WBS برگ‌ها را بسازید؛ اتصال فقط بین برگ WBS و برگ CBS است."
        />
      </Content>
    );
  }

  return (
    <>
      <Workspace
        fillViewport
        minHeight={560}
        toolbarWidth={360}
        toolbarLabel="فعالیت‌های WBS"
        toolbar={
          <LeafPane
            view={view}
            selectedId={selected?.id ?? null}
            onSelect={select}
            filter={filter}
            onFilterChange={setFilter}
            cbsFilter={cbsFilter ? { id: cbsFilter.id, code: cbsFilter.code } : null}
            onClearCbsFilter={() =>
              setSearchParams(
                (previous) => {
                  const next = new URLSearchParams(previous);
                  next.delete('cbsItem');
                  return next;
                },
                { replace: true },
              )
            }
            touchedIds={touchedIds}
          />
        }
      >
        <LinksToolbar view={view} canEdit={canEdit} onImport={onImport} />
        <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', background: '#FAFAFA' }}>
          {selected ? (
            <LeafLinksPanel
              view={view}
              projectId={project.id}
              leaf={selected}
              path={path}
              canEdit={canEdit}
              canViewAmounts={canViewAmounts}
              issues={issues}
              onOp={(op) => onOp?.(op)}
              onCopy={() => setCopying(selected)}
              onShowUnlinked={() => setFilter('unlinked')}
            />
          ) : (
            <EmptyState
              icon="mouse-pointer-click"
              title="فعالیتی انتخاب نشده"
              description="یک فعالیت برگ را از فهرست انتخاب کنید."
              style={{ marginTop: 48 }}
            />
          )}
        </div>
      </Workspace>
      {copying && onOp && (
        <CopyLinksDialog
          source={copying}
          leaves={view.leaves}
          linkCount={view.links.filter((link) => link.wbsItemId === copying.id).length}
          onClose={() => setCopying(null)}
          onCopy={onOp}
        />
      )}
    </>
  );
}

function LinksToolbar({
  view,
  canEdit,
  onImport,
}: {
  view: LinksViewDto;
  canEdit: boolean;
  onImport?: () => void;
}) {
  const { layout, openToolbar } = useWorkspace();
  const { imbalancedCount } = view.summary;
  return (
    <WorkspaceToolbar>
      {layout === 'one' && (
        <AppButton variant="outline" size="sm" icon="list-tree" onClick={openToolbar}>
          فعالیت‌ها
        </AppButton>
      )}
      <span className="row wrap g8 t-sm tx6 grow" style={{ minWidth: 0 }}>
        <Chip
          icon={view.source === 'draft' ? 'pencil' : 'eye'}
          text={view.source === 'draft' ? 'نسخهٔ کاری' : 'برنامهٔ جاری — فقط خواندن'}
        />
        {imbalancedCount > 0 && (
          <Chip
            icon="scale"
            text={`${toFaDigits(imbalancedCount)} فعالیت با اختلاف وزن و بودجهٔ بیش از ۱ واحد درصد (AL-STR-03)`}
            tone="tx-wrn"
          />
        )}
      </span>
      {canEdit && (
        <AppButton
          variant="ghost"
          size="sm"
          icon="file-spreadsheet"
          disabled={!onImport}
          title={onImport ? undefined : 'اول تغییرهای این نشست را ذخیره کنید'}
          onClick={onImport}
        >
          ورود از Excel
        </AppButton>
      )}
    </WorkspaceToolbar>
  );
}

function Chip({ icon, text, tone }: { icon: IconName; text: string; tone?: string }) {
  return (
    <span className={`row g4 ${tone ?? ''}`}>
      <Icon name={icon} size={13} />
      {text}
    </span>
  );
}

function Loading() {
  return (
    <Content>
      <SkeletonTable rows={10} />
    </Content>
  );
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <Content>
      <EmptyState
        inCard
        icon="server"
        title="اتصالات بارگذاری نشد"
        description="مشکل از سمت ماست و برنامهٔ پروژه سالم است. چند لحظهٔ دیگر دوباره امتحان کنید."
        actions={
          <AppButton variant="primary" size="sm" icon="refresh-cw" onClick={onRetry}>
            تلاش دوباره
          </AppButton>
        }
      />
    </Content>
  );
}
