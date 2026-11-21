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
import { useHasPermission } from '@/shared/hooks/useHasAccess';
import { formatPercentAuto, toFaDigits } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import { useProjectContext } from '@/modules/projects/layout/ProjectShell';
import type { ProjectDetailDto } from '@/modules/projects/types';
import { ApplyDraftDialog } from '@/modules/plan/components/ApplyDraftDialog';
import type { PlanValidationIssue } from '@/modules/plan/types';
import { EditSidePane } from '../components/edit/EditSidePane';
import { SplitDialog } from '../components/edit/SplitDialog';
import { WbsEditTree } from '../components/edit/WbsEditTree';
import { WbsItemForm } from '../components/edit/WbsItemForm';
import { useWbsDraftEditor } from '../hooks/useWbsDraftEditor';
import { useWbsPermissions } from '../hooks/useWbsPermissions';
import { newTempId } from '../services/draftOps';
import { ancestorIds } from '../services/wbsTree';
import type { DraftItemDto, WbsOp } from '../types/draft';

/**
 * W12 — حالت ویرایش WBS (`features/wbs.md` ۸، `features/plan-versions.md`).
 *
 * همهٔ ویرایش‌ها روی نسخهٔ کاری‌اند (F04 ۳). تغییرهای ذخیره‌نشده فهرست عملیات در
 * مرورگرند؛ سرور پیش‌نمایششان را می‌سازد (جمع وزن، پخش خودکار، مولدها، اعتبارسنجی).
 * ذخیره با وزن نامتعادل آزاد است و فقط «اعمال» مسدود می‌شود (تصمیم 1405/08/15).
 */
export default function WbsEditPage() {
  const { project } = useProjectContext();
  const can = useWbsPermissions(project);

  if (!can.editStructure) {
    return (
      <Content>
        <EmptyState
          inCard
          icon="lock"
          title="برنامهٔ این پروژه ویرایش نمی‌شود"
          description={
            project.status === 'completed' || project.status === 'archived'
              ? 'پروژهٔ تمام‌شده یا بایگانی‌شده فقط خواندنی است.'
              : 'برای ویرایش نسخهٔ کاری دسترسی «ویرایش نسخهٔ پیش‌نویس» لازم است.'
          }
          actions={
            <LinkButton to={ROUTES.wbs(project.id)} variant="primary" size="sm" icon="list-tree">
              بازگشت به درخت
            </LinkButton>
          }
        />
      </Content>
    );
  }

  return <WbsEditor key={project.id} project={project} />;
}

function WbsEditor({ project }: { project: ProjectDetailDto }) {
  const can = useWbsPermissions(project);
  const canApply = useHasPermission('plan.apply');
  const navigate = useNavigate();
  const editor = useWbsDraftEditor(project.id);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('item');
  const scrollRef = useRef<HTMLDivElement>(null);

  const view = editor.view;
  const items = useMemo(() => view?.items ?? [], [view]);
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const selected = selectedId ? (byId.get(selectedId) ?? null) : null;
  const structureLocked = Boolean(view?.mspLinked);

  const [expanded, setExpanded] = useState<Set<EntityId>>(() => new Set());
  const [splitting, setSplitting] = useState<DraftItemDto | null>(null);
  const [removing, setRemoving] = useState<DraftItemDto | null>(null);
  const [converting, setConverting] = useState<DraftItemDto | null>(null);
  const [applying, setApplying] = useState(false);
  const initialized = useRef(false);

  // دو سطح اول باز + مسیر آیتم انتخاب‌شده
  useEffect(() => {
    if (initialized.current || items.length === 0) return;
    initialized.current = true;
    const depthLimit = items.length > 300 ? 0 : 1;
    const initial = new Set(items.filter((item) => !item.isLeaf && ancestorIds(byId, item.id).length <= depthLimit).map((item) => item.id));
    if (selectedId) ancestorIds(byId, selectedId).forEach((id) => initial.add(id));
    setExpanded(initial);
  }, [items, byId, selectedId]);

  // آیتم انتخاب‌شده همیشه دیده شود — مثلاً پس از «تقسیم» زیر والد تازه می‌رود
  useEffect(() => {
    if (!selectedId || !byId.has(selectedId)) return;
    const ancestors = ancestorIds(byId, selectedId);
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

  const reveal = useCallback(
    (id: EntityId) => {
      setExpanded((previous) => new Set([...previous, ...ancestorIds(byId, id)]));
      select(id);
    },
    [byId, select],
  );

  /** هر عمل؛ والد آیتم تازه باز می‌شود تا آیتم دیده شود. */
  const run = useCallback(
    (op: WbsOp) => {
      editor.apply(op);
      if (op.type === 'add' && op.parentId) setExpanded((previous) => new Set([...previous, op.parentId!]));
      if (op.type === 'add') select(op.tempId);
    },
    [editor, select],
  );

  // ── نام‌ها برای «تغییرات این نشست» ──
  const nameOf = useCallback(
    (id: EntityId | null) => {
      if (!id) return 'سطح اول';
      const item = byId.get(id) ?? editor.base?.items.find((entry) => entry.id === id);
      if (item) return item.title;
      const added = editor.ops.find((op) => op.type === 'add' && op.tempId === id);
      return added?.type === 'add' ? added.fields.title : 'آیتم';
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

  const weightIssues = useMemo(() => {
    const map = new Map<string, PlanValidationIssue>();
    for (const issue of view?.validation.errors ?? []) if (issue.code === 'weight_sum') map.set(issue.parentId ?? 'root', issue);
    return map;
  }, [view]);

  // ── عملیات ساختار ──
  const addChild = useCallback(
    (parent: DraftItemDto | null) => {
      if (parent?.isLeaf) {
        if (parent.hasReports) return setSplitting(parent);
        if (parent.measurementMethod || parent.supervisor) return setConverting(parent);
      }
      run({ type: 'add', tempId: newTempId(), parentId: parent?.id ?? null, afterId: null, fields: { title: 'آیتم تازه', weightInParent: 0 } });
    },
    [run],
  );

  const addSibling = useCallback(
    (item: DraftItemDto | null) =>
      run({ type: 'add', tempId: newTempId(), parentId: item?.parentId ?? null, afterId: item?.id ?? null, fields: { title: 'آیتم تازه', weightInParent: 0 } }),
    [run],
  );

  /** «تکثیر» — کپی شاخه با عملیات `add`؛ گزارش، سرپرست و اتصال کپی نمی‌شود. */
  const duplicate = useCallback(
    (item: DraftItemDto) => {
      const copy = (source: DraftItemDto, parentId: EntityId | null, afterId: EntityId | null, suffix: string) => {
        const tempId = newTempId();
        editor.apply({
          type: 'add',
          tempId,
          parentId,
          afterId,
          fields: {
            title: `${source.title}${suffix}`,
            weightInParent: source.weightInParent,
            unit: source.unit,
            totalQuantity: source.totalQuantity,
            plannedStart: source.isLeaf ? source.plannedStart || null : null,
            plannedFinish: source.isLeaf ? source.plannedFinish || null : null,
            measurementMethod: source.measurementMethod,
            isMilestone: source.isMilestone,
          },
        });
        items.filter((child) => child.parentId === source.id).sort((a, b) => a.sortOrder - b.sortOrder).forEach((child) => copy(child, tempId, null, ''));
        return tempId;
      };
      select(copy(item, item.parentId, item.id, ' (کپی)'));
    },
    [editor, items, select],
  );

  const moveSibling = useCallback(
    (item: DraftItemDto, direction: -1 | 1) => {
      const siblings = items.filter((entry) => entry.parentId === item.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
      const index = siblings.findIndex((entry) => entry.id === item.id);
      const target = index + direction;
      if (target < 0 || target >= siblings.length) return;
      const without = siblings.filter((entry) => entry.id !== item.id);
      const afterIndex = direction === 1 ? index : index - 2;
      run({ type: 'move', id: item.id, parentId: item.parentId, afterId: afterIndex >= 0 ? (without[afterIndex]?.id ?? null) : null });
    },
    [items, run],
  );

  // ── کلیدها (wbs.md ۸): Tab، Shift+Tab، Enter، Alt+↑↓، Delete، Ctrl+Z ──
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
      if (event.key === 'Tab' && !structureLocked) {
        event.preventDefault();
        run(event.shiftKey ? { type: 'outdent', id: selected.id } : { type: 'indent', id: selected.id });
      } else if (event.key === 'Enter' && !structureLocked) {
        event.preventDefault();
        addSibling(selected);
      } else if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown') && !structureLocked) {
        event.preventDefault();
        moveSibling(selected, event.key === 'ArrowUp' ? -1 : 1);
      } else if (event.key === 'Delete' && !structureLocked) {
        event.preventDefault();
        setRemoving(selected);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [addSibling, editor, moveSibling, run, selected, structureLocked]);

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

  // ── ترک صفحه با تغییر ذخیره‌نشده ──
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

  const descendantCount = (id: EntityId) => {
    let count = 0;
    const walk = (parent: EntityId) =>
      items.filter((item) => item.parentId === parent).forEach((child) => {
        count += 1;
        walk(child.id);
      });
    walk(id);
    return count;
  };

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
          description="مشکل از سمت ماست و برنامهٔ پروژه سالم است. چند لحظهٔ دیگر دوباره امتحان کنید."
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

  return (
    <>
      {/* ── نوار حالت ویرایش (بوم W12) ── */}
      <div className="row wrap g8 wrn" style={{ padding: '9px 16px', borderBottom: '1px solid rgba(217,119,6,0.28)', fontSize: 12.5 }}>
        <Icon name="pencil" size={14} />
        <span>
          <strong>حالت ویرایش {draftName}.</strong>{' '}
          {view.syncsToCurrent
            ? 'ذخیره بلافاصله در درخت پروژه دیده می‌شود؛ با فعال‌سازی، مبنا ثبت و قفل می‌شود.'
            : view.draft
              ? 'ذخیره فقط نسخهٔ کاری را عوض می‌کند؛ برنامهٔ جاری تا «اعمال» دست نمی‌خورد.'
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
          <LinkButton to={selectedId ? ROUTES.wbsItem(project.id, selectedId) : ROUTES.wbs(project.id)} variant="ghost" size="sm">
            {dirty ? 'انصراف' : 'بازگشت به درخت'}
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
          {isRevision && canApply && (
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
      {structureLocked && (
        <div style={{ padding: '12px 16px 0' }}>
          <Alert tone="inf" icon="info">
            این پروژه به MSP متصل است: ساختار و تاریخ‌ها فقط در MSP عوض می‌شوند و با همگام‌سازی می‌آیند (msp-integration.md ۶). اینجا وزن، روش، گام‌ها، عنوان، کد، واحد و مقدار را ویرایش کنید.
          </Alert>
        </div>
      )}

      <Workspace
        fillViewport
        minHeight={520}
        isDetailOpen={selected !== null}
        onDetailClose={() => select(null)}
        toolbarLabel="ابزار ویرایش"
        detailLabel="ویرایش آیتم"
        toolbar={
          <EditSidePane
            projectId={project.id}
            validation={view.validation}
            ops={editor.ops}
            opErrors={editor.opErrors}
            nameOf={nameOf}
            selected={selected}
            structureLocked={structureLocked}
            canViewAmounts={can.viewAmounts}
            onOp={run}
            onUndo={editor.undo}
            onShowItem={reveal}
          />
        }
        detail={
          selected ? (
            <WbsItemForm
              key={selected.id}
              projectId={project.id}
              item={selected}
              issues={[...view.validation.errors, ...view.validation.warnings].filter((issue) => issue.wbsItemId === selected.id)}
              groupIssue={weightIssues.get(selected.parentId ?? 'root')}
              childCount={items.filter((item) => item.parentId === selected.id).length}
              canAssign={can.assign}
              onOp={run}
              onSplit={() => setSplitting(selected)}
              onRemove={() => setRemoving(selected)}
              onAddChild={() => addChild(selected)}
            />
          ) : (
            <EmptyState icon="mouse-pointer-click" title="آیتمی انتخاب نشده" description="روی یک ردیف کلیک کنید تا همهٔ فیلدهایش را ویرایش کنید." style={{ margin: 'auto 0' }} />
          )
        }
      >
        <EditToolbar
          selected={selected}
          structureLocked={structureLocked}
          onAddChild={() => addChild(selected)}
          onAddSibling={() => addSibling(selected)}
          onDuplicate={() => selected && duplicate(selected)}
          onSplit={() => selected && setSplitting(selected)}
          onRemove={() => selected && setRemoving(selected)}
          onExpandAll={() => setExpanded(new Set(items.filter((item) => !item.isLeaf).map((item) => item.id)))}
          onCollapseAll={() => setExpanded(new Set())}
        />
        <WorkspaceScroll scrollRef={scrollRef} label="درخت نسخهٔ کاری">
          {items.length === 0 ? (
            <EmptyState
              icon="list-tree"
              title="نسخهٔ کاری خالی است"
              description="اولین آیتم سطح اول را بسازید."
              actions={
                <AppButton variant="primary" size="sm" icon="plus" disabled={structureLocked} onClick={() => addSibling(null)}>
                  آیتم سطح اول
                </AppButton>
              }
              style={{ marginTop: 48 }}
            />
          ) : (
            <WbsEditTree
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
              weightIssues={weightIssues}
              touchedIds={touchedIds}
              structureLocked={structureLocked}
              onOp={run}
              scrollRef={scrollRef}
            />
          )}
        </WorkspaceScroll>
        <WorkspaceStatusBar>
          <span className="row wrap g12">
            <strong className="tx9">{toFaDigits(items.length)} آیتم</strong>
            <span className="row g4">
              <span className="dot" style={{ color: '#E07A2C' }} />
              تغییر ذخیره‌نشده
            </span>
            <span className="row g4">
              <span style={{ width: 14, height: 10, borderRadius: 3, background: '#FFF8EB', border: '1px solid #F4B17C', display: 'inline-block' }} />
              قابل ویرایش
            </span>
          </span>
          <span>
            مجموع وزن ریشه:{' '}
            <strong className={Math.abs(view.rootWeightSum - 100) < 0.00005 ? 'tx-ok' : 'tx-err'}>{formatPercentAuto(view.rootWeightSum, 2)}</strong>
          </span>
        </WorkspaceStatusBar>
      </Workspace>

      {splitting && <SplitDialog item={splitting} onClose={() => setSplitting(null)} onSplit={run} />}

      <ConfirmDialog
        isOpen={converting !== null}
        onCancel={() => setConverting(null)}
        onConfirm={() => {
          if (converting) run({ type: 'add', tempId: newTempId(), parentId: converting.id, afterId: null, fields: { title: 'آیتم تازه', weightInParent: 100 } });
          setConverting(null);
        }}
        tone="warning"
        icon="folder"
        title={`«${converting?.title ?? ''}» والد شود؟`}
        description="روش اندازه‌گیری، مقدار، گام‌ها، اتصال‌های CBS و سرپرست این برگ پاک می‌شود و پیشرفتش از فرزندانش می‌آید (wbs.md ۵.۶)."
        confirmLabel="افزودن فرزند و پاک کردن داده‌های برگ"
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
        description={removing ? removeText(removing, descendantCount(removing.id), project.status === 'draft') : undefined}
        confirmLabel={removing && !removing.isLeaf ? 'حذف شاخه' : 'حذف آیتم'}
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
            reveal(id);
          }}
          onApplied={() => {
            setApplying(false);
            navigate(ROUTES.wbs(project.id));
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

function removeText(item: DraftItemDto, descendants: number, isDraftProject: boolean): string {
  if (!item.isLeaf) return `${toFaDigits(descendants)} آیتم زیرشاخه هم حذف می‌شود. برگ‌هایی که گزارش دارند حذف نرم می‌شوند و گزارش‌هایشان می‌ماند.`;
  if (item.change === 'added') return 'این آیتم تازه است و هنوز ذخیره نشده؛ کامل حذف می‌شود.';
  if (isDraftProject) return 'پروژه هنوز پیش‌نویس است؛ آیتم کامل حذف می‌شود.';
  if (item.hasReports) return 'حذف نرم: گزارش‌های این برگ می‌ماند، وزنش از والد کنار می‌رود و گزارش‌های در انتظار پس از اعمال «نیاز به تعیین تکلیف» می‌شوند. هم‌سطح‌ها باید دوباره ۱۰۰ شوند.';
  return 'با اعمال نسخه از برنامه حذف می‌شود؛ هم‌سطح‌ها باید دوباره ۱۰۰ شوند.';
}

function EditToolbar({
  selected,
  structureLocked,
  onAddChild,
  onAddSibling,
  onDuplicate,
  onSplit,
  onRemove,
  onExpandAll,
  onCollapseAll,
}: {
  selected: DraftItemDto | null;
  structureLocked: boolean;
  onAddChild: () => void;
  onAddSibling: () => void;
  onDuplicate: () => void;
  onSplit: () => void;
  onRemove: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}) {
  const { layout, openToolbar } = useWorkspace();
  const lockReason = structureLocked ? 'ساختار این پروژه مال MSP است' : undefined;
  const leafWithReports = Boolean(selected?.isLeaf && selected.hasReports);

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
      {leafWithReports ? (
        <AppButton variant="ghost" size="sm" icon="split" disabled={structureLocked} title={lockReason ?? 'این برگ گزارش دارد؛ به‌جای افزودن فرزند تقسیمش کنید'} onClick={onSplit}>
          تقسیم
        </AppButton>
      ) : (
        <AppButton variant="ghost" size="sm" icon="plus-circle" disabled={structureLocked} title={lockReason} onClick={onAddChild}>
          {selected ? 'افزودن فرزند' : 'آیتم سطح اول'}
        </AppButton>
      )}
      <AppButton variant="ghost" size="sm" icon="plus-square" disabled={structureLocked || !selected} title={lockReason} onClick={onAddSibling}>
        افزودن هم‌سطح
      </AppButton>
      <AppButton variant="ghost" size="sm" icon="copy" disabled={structureLocked || !selected} title={lockReason} onClick={onDuplicate}>
        تکثیر
      </AppButton>
      <AppButton variant="dangerOutline" size="sm" icon="trash-2" disabled={structureLocked || !selected} title={lockReason} onClick={onRemove}>
        حذف
      </AppButton>
    </WorkspaceToolbar>
  );
}
