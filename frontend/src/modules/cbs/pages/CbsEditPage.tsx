import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker, useNavigate, useSearchParams } from 'react-router-dom';

import { ROUTES } from '@/config/routes';
import { Content } from '@/shared/components/layout/AppShell';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { SkeletonTable } from '@/shared/components/feedback/Skeleton';
import { Workspace, WorkspaceScroll, WorkspaceStatusBar, WorkspaceToolbar } from '@/shared/components/layout/Workspace';
import { useWorkspace } from '@/shared/components/layout/workspaceContext';
import { Alert } from '@/shared/components/ui/Alert';
import { AppButton, LinkButton } from '@/shared/components/ui/AppButton';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { Icon } from '@/shared/components/ui/Icon';
import { IconButton } from '@/shared/components/ui/IconButton';
import { Spinner } from '@/shared/components/ui/Spinner';
import { toFaDigits } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import { useProjectContext } from '@/modules/projects/layout/ProjectShell';
import type { ProjectDetailDto } from '@/modules/projects/types';
import { ApplyDraftDialog } from '@/modules/plan/components/ApplyDraftDialog';
import { CbsEditSidePane } from '../components/edit/CbsEditSidePane';
import { CbsEditTree } from '../components/edit/CbsEditTree';
import { CbsImportDialog } from '../components/edit/CbsImportDialog';
import { CbsItemForm } from '../components/edit/CbsItemForm';
import { CbsSplitDialog } from '../components/edit/CbsSplitDialog';
import { Money } from '../components/Money';
import { RevisionDialogLoader } from '../components/RevisionRequestDialog';
import { useCbsDraftEditor } from '../hooks/useCbsDraftEditor';
import { useCbsPermissions } from '../hooks/useCbsPermissions';
import { downloadCbsTemplate } from '../services/cbsExport';
import { ancestorCbsIds } from '../services/cbsView';
import type { CbsDraftItemDto, CbsOp } from '../types/draft';

const tempId = (): EntityId => `tmp-${crypto.randomUUID().slice(0, 8)}`;

/**
 * حالت ویرایش CBS (`features/cbs.md` ۴، ۷ و ۱۴؛ تصمیم 1405/08/15) — طراحی بوم ندارد و
 * الگوی W12 را دنبال می‌کند. همهٔ ویرایش‌ها روی همان نسخهٔ کاری WBS‌اند؛ اعمال هر دو را
 * با هم جاری می‌کند. بودجه، تخصیص، قفل‌ها و اعتبارسنجی از سرور.
 */
export default function CbsEditPage() {
  const { project } = useProjectContext();
  const can = useCbsPermissions(project);
  if (!can.editDraft) {
    return (
      <Content>
        <EmptyState
          inCard
          icon="lock"
          title="CBS این پروژه ویرایش نمی‌شود"
          description={
            project.status === 'completed' || project.status === 'archived'
              ? 'پروژهٔ تمام‌شده یا بایگانی‌شده فقط خواندنی است.'
              : 'برای ویرایش نسخهٔ کاری دسترسی «ویرایش نسخهٔ پیش‌نویس» (plan.edit_draft) لازم است.'
          }
          actions={
            <LinkButton to={ROUTES.cbs(project.id)} variant="primary" size="sm" icon="wallet">
              بازگشت به دفتر CBS
            </LinkButton>
          }
        />
      </Content>
    );
  }
  return <CbsEditor key={project.id} project={project} />;
}

function CbsEditor({ project }: { project: ProjectDetailDto }) {
  const can = useCbsPermissions(project);
  const navigate = useNavigate();
  const editor = useCbsDraftEditor(project.id);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('item');
  const scrollRef = useRef<HTMLDivElement>(null);

  const view = editor.view;
  const items = useMemo(() => view?.items ?? [], [view]);
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const selected = selectedId ? (byId.get(selectedId) ?? null) : null;

  const [expanded, setExpanded] = useState<Set<EntityId>>(() => new Set());
  const [splitting, setSplitting] = useState<CbsDraftItemDto | null>(null);
  const [removing, setRemoving] = useState<CbsDraftItemDto | null>(null);
  const [closing, setClosing] = useState<CbsDraftItemDto | null>(null);
  const [converting, setConverting] = useState<CbsDraftItemDto | null>(null);
  const [importing, setImporting] = useState(false);
  const [requesting, setRequesting] = useState<EntityId | null>(null);
  const [applying, setApplying] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || items.length === 0) return;
    initialized.current = true;
    setExpanded(new Set(items.filter((item) => !item.isLeaf).map((item) => item.id)));
  }, [items]);

  useEffect(() => {
    if (!selectedId || !byId.has(selectedId)) return;
    const ancestors = ancestorCbsIds(byId, selectedId);
    setExpanded((previous) => (ancestors.every((id) => previous.has(id)) ? previous : new Set([...previous, ...ancestors])));
  }, [selectedId, byId]);

  const select = useCallback(
    (id: EntityId | null) =>
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (id) next.set('item', id);
          else next.delete('item');
          return next;
        },
        { replace: true },
      ),
    [setSearchParams],
  );

  const run = useCallback(
    (op: CbsOp) => {
      editor.apply(op);
      if (op.type === 'add') {
        if (op.parentId) setExpanded((previous) => new Set([...previous, op.parentId!]));
        select(op.tempId);
      }
      if (op.type === 'split') setExpanded((previous) => new Set([...previous, op.parentTempId]));
    },
    [editor, select],
  );

  const nameOf = useCallback(
    (id: EntityId | null) => {
      if (!id) return 'سطح اول';
      const item = byId.get(id) ?? editor.base?.items.find((entry) => entry.id === id);
      if (item) return item.title;
      const added = editor.ops.find((op) => op.type === 'add' && op.tempId === id);
      return added?.type === 'add' ? added.item.title : 'قلم';
    },
    [byId, editor.base, editor.ops],
  );

  const touchedIds = useMemo(() => {
    const ids = new Set<EntityId>();
    for (const op of editor.ops) {
      if ('id' in op) ids.add(op.id);
      if (op.type === 'add') ids.add(op.tempId);
    }
    return ids;
  }, [editor.ops]);

  const errorIds = useMemo(() => new Set((view?.validation.errors ?? []).map((issue) => issue.cbsItemId).filter((id): id is EntityId => Boolean(id))), [view]);

  // ── عملیات ──
  const addChild = useCallback(
    (parent: CbsDraftItemDto | null) => {
      if (parent?.isLeaf) {
        if (parent.locks.addChild) return setSplitting(parent);
        if (parent.pricingMode || parent.linkCount > 0) return setConverting(parent);
      }
      run({ type: 'add', tempId: tempId(), parentId: parent?.id ?? null, afterId: null, item: { title: 'قلم تازه', costType: parent?.costType ?? 'materials' } });
    },
    [run],
  );
  const addSibling = useCallback(
    (item: CbsDraftItemDto | null) =>
      run({ type: 'add', tempId: tempId(), parentId: item?.parentId ?? null, afterId: item?.id ?? null, item: { title: 'قلم تازه', costType: item?.costType ?? 'materials' } }),
    [run],
  );
  const moveSibling = useCallback(
    (item: CbsDraftItemDto, direction: -1 | 1) => {
      const siblings = items.filter((entry) => entry.parentId === item.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
      const index = siblings.findIndex((entry) => entry.id === item.id);
      const target = index + direction;
      if (target < 0 || target >= siblings.length) return;
      run({ type: 'move', id: item.id, parentId: item.parentId, index: target });
    },
    [items, run],
  );
  /** Tab: زیر هم‌سطح قبلی؛ Shift+Tab: پس از والد. */
  const indent = useCallback(
    (item: CbsDraftItemDto, outdent: boolean) => {
      if (outdent) {
        if (!item.parentId) return;
        const parent = byId.get(item.parentId)!;
        run({ type: 'move', id: item.id, parentId: parent.parentId, index: parent.sortOrder + 1 });
        return;
      }
      const siblings = items.filter((entry) => entry.parentId === item.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
      const previous = siblings[siblings.findIndex((entry) => entry.id === item.id) - 1];
      if (!previous) return;
      run({ type: 'move', id: item.id, parentId: previous.id, index: items.filter((entry) => entry.parentId === previous.id).length });
    },
    [byId, items, run],
  );

  // ── کلیدها مثل W12 ──
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const inField = target?.closest('input, textarea, select, [contenteditable="true"]');
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !inField) {
        event.preventDefault();
        editor.undo();
        return;
      }
      if (inField || !scrollRef.current?.contains(target) || !selected) return;
      if (event.key === 'Tab') {
        event.preventDefault();
        indent(selected, event.shiftKey);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        addSibling(selected);
      } else if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        event.preventDefault();
        moveSibling(selected, event.key === 'ArrowUp' ? -1 : 1);
      } else if (event.key === 'Delete' && !selected.locks.remove) {
        event.preventDefault();
        setRemoving(selected);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [addSibling, editor, indent, moveSibling, selected]);

  // «اعمال…» از نوار نسخهٔ کاری (`?apply=1`) دیالوگ اعمال را باز می‌کند
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

  // ── ترک صفحه ──
  const dirty = editor.ops.length > 0;
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  async function save() {
    const idMap = await editor.save();
    if (idMap && selectedId && idMap[selectedId]) select(idMap[selectedId]);
  }

  if (editor.isLoading) {
    return (
      <Content>
        <SkeletonTable rows={10} />
      </Content>
    );
  }
  if (editor.isError || !view) {
    return (
      <Content>
        <EmptyState
          inCard
          icon="server"
          title="نسخهٔ کاری بارگذاری نشد"
          description="مشکل از سمت ماست و CBS پروژه سالم است. چند لحظهٔ دیگر دوباره امتحان کنید."
          actions={
            <AppButton variant="primary" size="sm" icon="refresh-cw" onClick={editor.reload}>
              تلاش دوباره
            </AppButton>
          }
        />
      </Content>
    );
  }

  const isRevision = project.status === 'active' || project.status === 'paused';
  const draftName = view.draft ? (view.draft.kind === 'baseline' ? 'مبنای کاری' : `بازنگری کاری R${view.draft.number}`) : `بازنگری کاری R${(project.plan.current?.number ?? 0) + 1}`;
  const applyDisabledReason = dirty
    ? 'اول تغییرها را ذخیره کنید'
    : !view.draft
      ? 'هنوز تغییری در نسخهٔ کاری ذخیره نشده است'
      : view.validation.errors.length > 0
        ? `${toFaDigits(view.validation.errors.length)} خطا مانع اعمال است`
        : !view.validation.canApply
          ? 'نسخهٔ کاری با برنامهٔ جاری فرقی ندارد'
          : undefined;
  const closingAc = closing ? BigInt(closing.postedAc ?? '0') : 0n;

  return (
    <>
      <div className="row wrap g8 wrn" style={{ padding: '9px 16px', borderBottom: '1px solid rgba(217,119,6,0.28)', fontSize: 12.5 }}>
        <Icon name="pencil" size={14} />
        <span>
          <strong>حالت ویرایش CBS — {draftName}.</strong>{' '}
          {view.syncsToCurrent
            ? 'ذخیره بلافاصله در دفتر CBS دیده می‌شود؛ با فعال‌سازی، مبنا ثبت و قفل می‌شود.'
            : view.draft
              ? 'ذخیره فقط نسخهٔ کاری را عوض می‌کند؛ CBS جاری تا «اعمال» دست نمی‌خورد.'
              : 'با اولین ذخیره، نسخهٔ کاری از برنامهٔ جاری ساخته می‌شود.'}
        </span>
        <span className="row g6 ms-auto">
          {editor.isPreviewing && (
            <span className="row g4 tx6" role="status">
              <Spinner size={12} />
              محاسبه…
            </span>
          )}
          {dirty ? (
            <span className="row g6">
              <span className="dot" style={{ color: '#E07A2C' }} />
              <span className="tx7">{toFaDigits(editor.ops.length)} تغییر ذخیره‌نشده</span>
            </span>
          ) : (
            <span className="tx7">همه ذخیره شده</span>
          )}
          <LinkButton to={selectedId && !selectedId.startsWith('tmp-') ? `${ROUTES.cbs(project.id)}?item=${encodeURIComponent(selectedId)}` : ROUTES.cbs(project.id)} variant="ghost" size="sm">
            {dirty ? 'انصراف' : 'بازگشت به دفتر'}
          </LinkButton>
          <AppButton
            variant="primary"
            size="sm"
            icon="check"
            disabled={!dirty || Boolean(editor.conflict) || editor.opErrors.length > 0}
            title={editor.opErrors.length > 0 ? 'سرور یک تغییر را نپذیرفت؛ اول آن را واگرد کنید' : undefined}
            loading={editor.isSaving}
            onClick={() => void save()}
          >
            ذخیرهٔ تغییرات
          </AppButton>
          {isRevision && can.applyDraft && (
            <AppButton variant="success" size="sm" icon="git-branch" disabled={Boolean(applyDisabledReason)} title={applyDisabledReason} onClick={() => setApplying(true)}>
              اعمال…
            </AppButton>
          )}
        </span>
      </div>

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

      <Workspace
        fillViewport
        minHeight={520}
        isDetailOpen={selected !== null}
        onDetailClose={() => select(null)}
        toolbarLabel="ابزار ویرایش"
        detailLabel="ویرایش قلم"
        toolbar={
          <CbsEditSidePane
            view={view}
            ops={editor.ops}
            opErrors={editor.opErrors}
            nameOf={nameOf}
            canViewAmounts={can.viewAmounts}
            canImport={can.importExcel}
            onUndo={editor.undo}
            onShowItem={select}
            onImport={() => setImporting(true)}
            onTemplate={downloadCbsTemplate}
          />
        }
        detail={
          selected ? (
            <CbsItemForm
              key={selected.id}
              item={selected}
              issues={[...view.validation.errors, ...view.validation.warnings].filter((issue) => issue.cbsItemId === selected.id)}
              childCount={items.filter((item) => item.parentId === selected.id).length}
              budgetNeedsRevision={view.budgetNeedsRevision}
              canReviseBudget={can.reviseBudget}
              canViewAmounts={can.viewAmounts}
              onOp={run}
              onAddChild={() => addChild(selected)}
              onSplit={() => setSplitting(selected)}
              onClose={() => setClosing(selected)}
              onRemove={() => setRemoving(selected)}
              onRequestRevision={can.requestRevision ? () => setRequesting(selected.id) : undefined}
            />
          ) : (
            <EmptyState icon="mouse-pointer-click" title="قلمی انتخاب نشده" description="روی یک ردیف کلیک کنید تا عنوان، نوع، شیوهٔ قیمت و مقدارهایش را ویرایش کنید." style={{ margin: 'auto 0' }} />
          )
        }
      >
        <EditToolbar
          selected={selected}
          onAddChild={() => addChild(selected)}
          onAddSibling={() => addSibling(selected)}
          onSplit={() => selected && setSplitting(selected)}
          onRemove={() => selected && setRemoving(selected)}
          onExpandAll={() => setExpanded(new Set(items.filter((item) => !item.isLeaf).map((item) => item.id)))}
          onCollapseAll={() => setExpanded(new Set())}
        />
        <WorkspaceScroll scrollRef={scrollRef} label="CBS نسخهٔ کاری">
          {items.length === 0 ? (
            <EmptyState
              icon="wallet"
              title="CBS نسخهٔ کاری خالی است"
              description="اولین گروه هزینه را بسازید یا اقلام را از Excel وارد کنید."
              actions={
                <>
                  <AppButton variant="primary" size="sm" icon="plus" onClick={() => addSibling(null)}>
                    قلم سطح اول
                  </AppButton>
                  {can.importExcel && (
                    <AppButton variant="outline" size="sm" icon="file-spreadsheet" onClick={() => setImporting(true)}>
                      ورود از Excel
                    </AppButton>
                  )}
                </>
              }
              style={{ marginTop: 48 }}
            />
          ) : (
            <CbsEditTree
              items={items}
              expandedIds={expanded}
              onToggleExpand={(id) =>
                setExpanded((previous) => {
                  const next = new Set(previous);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
              selectedId={selectedId}
              onSelect={select}
              touchedIds={touchedIds}
              errorIds={errorIds}
              canViewAmounts={can.viewAmounts}
              scrollRef={scrollRef}
            />
          )}
        </WorkspaceScroll>
        <WorkspaceStatusBar>
          <span className="row wrap g12">
            <strong className="tx9">{toFaDigits(items.filter((item) => item.isLeaf).length)} قلم</strong>
            <span className="row g4">
              <span className="dot" style={{ color: '#E07A2C' }} />
              تغییر ذخیره‌نشده
            </span>
          </span>
          <span className="row g4">
            <Icon name="keyboard" size={12} />
            Enter هم‌سطح · Tab زیرقلم · Alt+↑↓ جابه‌جایی · Ctrl+Z واگرد
          </span>
        </WorkspaceStatusBar>
      </Workspace>

      {splitting && <CbsSplitDialog item={splitting} onClose={() => setSplitting(null)} onSplit={run} />}

      {importing && view && (
        <CbsImportDialog
          projectId={project.id}
          draftRevision={view.draftRevision}
          isDraftProject={project.status === 'draft'}
          groups={items.filter((item) => !item.isLeaf)}
          onClose={() => setImporting(false)}
          onImported={() => setImporting(false)}
        />
      )}

      {requesting && <RevisionDialogLoader projectId={project.id} itemId={requesting} onClose={() => setRequesting(null)} />}

      <ConfirmDialog
        isOpen={converting !== null}
        onCancel={() => setConverting(null)}
        onConfirm={() => {
          if (converting) run({ type: 'add', tempId: tempId(), parentId: converting.id, afterId: null, item: { title: 'قلم تازه', costType: converting.costType } });
          setConverting(null);
        }}
        tone="warning"
        icon="folder"
        title={`«${converting?.title ?? ''}» گروه شود؟`}
        description={`شیوهٔ قیمت و مقدارهای این قلم پاک می‌شود${converting && converting.linkCount > 0 ? ` و ${toFaDigits(converting.linkCount)} اتصال WBS آن برداشته می‌شود؛ زیربودجهٔ آن کارها صفر می‌شود` : ''}. بودجه‌اش از زیرقلم‌ها می‌آید (cbs.md ۴.۴).`}
        confirmLabel="افزودن زیرقلم"
      />

      <ConfirmDialog
        isOpen={closing !== null}
        onCancel={() => setClosing(null)}
        onConfirm={() => {
          if (closing) run({ type: 'close', id: closing.id });
          setClosing(null);
        }}
        tone="warning"
        icon="lock"
        title={`بستن «${closing?.title ?? ''}»`}
        description={
          closing ? (
            <span className="col g6">
              <span>
                برآورد قلم به هزینهٔ ثبت‌شده (<Money value={closingAc.toString()} className="fw6" />) کم می‌شود و دیگر بودجه‌ای برایش نمی‌ماند (cbs.md ۴.۴).
              </span>
              {closing.linkCount > 0 && <span>تخصیص {toFaDigits(closing.linkCount)} اتصال WBS به همان نسبت کم می‌شود تا از برآورد بیشتر نشود؛ BAC آن کارها هم کم می‌شود. اثر دقیق پیش از اعمال در خلاصهٔ اثر دیده می‌شود.</span>}
              {isRevision && <span>این تغییر «بازنگری بودجه» است.</span>}
            </span>
          ) : undefined
        }
        confirmLabel="بستن قلم"
      />

      <ConfirmDialog
        isOpen={removing !== null}
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) {
            run({ type: 'remove', id: removing.id });
            select(removing.parentId);
          }
          setRemoving(null);
        }}
        tone="danger"
        icon="trash-2"
        title={`حذف «${removing?.title ?? ''}»`}
        description={
          removing
            ? removing.change === 'added'
              ? 'این قلم تازه است و هنوز ذخیره نشده؛ کامل حذف می‌شود.'
              : `${removing.isLeaf ? '' : 'همهٔ زیرقلم‌ها هم حذف می‌شوند. '}${removing.linkCount > 0 ? `${toFaDigits(removing.linkCount)} اتصال WBS برداشته می‌شود و BAC آن کارها کم می‌شود. ` : ''}با اعمال نسخه از CBS حذف می‌شود.`
            : undefined
        }
        confirmLabel={removing && !removing.isLeaf ? 'حذف گروه' : 'حذف قلم'}
      />

      {applying && view.draft && (
        <ApplyDraftDialog
          projectId={project.id}
          versionName={draftName.replace('کاری ', '')}
          draftRevision={view.draftRevision}
          validation={view.validation}
          canViewAmounts={can.viewAmounts}
          onClose={() => setApplying(false)}
          onShowItem={(id) => {
            setApplying(false);
            if (byId.has(id)) select(id);
            else navigate(ROUTES.wbsEdit(project.id, id));
          }}
          onApplied={() => {
            setApplying(false);
            navigate(ROUTES.cbs(project.id));
          }}
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

function EditToolbar({
  selected,
  onAddChild,
  onAddSibling,
  onSplit,
  onRemove,
  onExpandAll,
  onCollapseAll,
}: {
  selected: CbsDraftItemDto | null;
  onAddChild: () => void;
  onAddSibling: () => void;
  onSplit: () => void;
  onRemove: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}) {
  const { layout, openToolbar } = useWorkspace();
  const mustSplit = Boolean(selected?.isLeaf && selected.locks.addChild);
  return (
    <WorkspaceToolbar>
      {layout === 'one' && (
        <AppButton variant="outline" size="sm" icon="sliders-horizontal" onClick={openToolbar}>
          ابزار
        </AppButton>
      )}
      <IconButton icon="chevrons-up-down" label="گسترش همه" size="sm" title="گسترش همه" onClick={onExpandAll} />
      <IconButton icon="chevrons-down-up" label="جمع کردن همه" size="sm" title="جمع کردن همه" onClick={onCollapseAll} />
      <span className="vsep" />
      {mustSplit ? (
        <AppButton variant="ghost" size="sm" icon="split" title="این قلم هزینه دارد؛ به‌جای افزودن زیرقلم تقسیمش کنید" onClick={onSplit}>
          تقسیم
        </AppButton>
      ) : (
        <AppButton variant="ghost" size="sm" icon="plus-circle" onClick={onAddChild}>
          {selected ? 'افزودن زیرقلم' : 'قلم سطح اول'}
        </AppButton>
      )}
      <AppButton variant="ghost" size="sm" icon="plus-square" disabled={!selected} onClick={onAddSibling}>
        افزودن هم‌سطح
      </AppButton>
      <AppButton variant="dangerOutline" size="sm" icon="trash-2" disabled={!selected || Boolean(selected.locks.remove)} title={selected?.locks.remove} onClick={onRemove}>
        حذف
      </AppButton>
    </WorkspaceToolbar>
  );
}
