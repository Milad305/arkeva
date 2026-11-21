import { useMemo, useState, type DragEvent, type KeyboardEvent, type RefObject } from 'react';

import { Badge } from '@/shared/components/ui/Badge';
import type { Column } from '@/shared/components/ui/DataTable';
import { Icon } from '@/shared/components/ui/Icon';
import { TreeTable, type TreeVirtualization } from '@/shared/components/ui/TreeTable';
import { formatJalaliDate } from '@/shared/utils/date';
import { formatPercentAuto, toEnDigits, toFaDigits } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import type { PlanValidationIssue } from '@/modules/plan/types';
import { buildWbsTree, type TreeOf } from '../../services/wbsTree';
import type { DraftItemDto, WbsOp } from '../../types/draft';

type Node = TreeOf<DraftItemDto>;

export interface WbsEditTreeProps {
  items: DraftItemDto[];
  expandedIds: ReadonlySet<EntityId>;
  onToggleExpand: (id: EntityId) => void;
  selectedId: EntityId | null;
  onSelect: (id: EntityId) => void;
  /** گروه‌های نامتعادل از اعتبارسنجی سرور (V-01)، با کلید والد (`root` برای سطح اول). */
  weightIssues: ReadonlyMap<string, PlanValidationIssue>;
  /** آیتم‌هایی که در فهرست عملیات ذخیره‌نشده آمده‌اند. */
  touchedIds: ReadonlySet<EntityId>;
  /** پروژهٔ متصل به MSP: ساختار قفل است. */
  structureLocked: boolean;
  onOp: (op: WbsOp) => void;
  scrollRef: RefObject<HTMLElement>;
}

const ROW_HEIGHT = 46;

/**
 * درخت حالت ویرایش (W12): وزن درجا، کشیدن و رها کردن با دستگیره، نشان تغییر
 * ذخیره‌نشده و «Σ» گروه نامتعادل. هیچ عددی اینجا ساخته نمی‌شود؛ همه از پیش‌نمایش سرور.
 */
export function WbsEditTree({
  items,
  expandedIds,
  onToggleExpand,
  selectedId,
  onSelect,
  weightIssues,
  touchedIds,
  structureLocked,
  onOp,
  scrollRef,
}: WbsEditTreeProps) {
  const nodes = useMemo(() => buildWbsTree(items), [items]);
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const [dragging, setDragging] = useState<EntityId | null>(null);
  const [drop, setDrop] = useState<{ id: EntityId; position: 'before' | 'after' } | null>(null);

  const virtualization = useMemo<TreeVirtualization>(() => ({ scrollRef, rowHeight: ROW_HEIGHT, threshold: 200 }), [scrollRef]);

  /** جایگاه رها کردن ← عمل `move`؛ «پیش از» یعنی پس از هم‌سطح قبلی. */
  function dropOn(target: DraftItemDto, position: 'before' | 'after') {
    if (!dragging || dragging === target.id) return;
    let afterId: EntityId | null = target.id;
    if (position === 'before') {
      const siblings = items
        .filter((item) => item.parentId === target.parentId && item.id !== dragging)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const index = siblings.findIndex((item) => item.id === target.id);
      afterId = index > 0 ? siblings[index - 1]!.id : null;
    }
    onOp({ type: 'move', id: dragging, parentId: target.parentId, afterId });
  }

  const issueFor = (id: EntityId | null) => weightIssues.get(id ?? 'root');

  const columns: Array<Column<Node>> = [
    {
      key: 'code',
      header: 'کد',
      minWidth: 80,
      render: (node) => (
        <span className="mono t-sm tx6" dir="ltr" title={node.codeMode === 'custom' ? 'کد دستی — خودکار شماره نمی‌خورد' : undefined}>
          {node.code}
          {node.codeMode === 'custom' && <span className="tx5"> *</span>}
        </span>
      ),
    },
    {
      key: 'weight',
      header: 'وزن',
      minWidth: 84,
      render: (node) => (
        <WeightInput
          key={`${node.id}:${node.weightInParent}`}
          item={node}
          invalid={Boolean(issueFor(node.parentId))}
          onCommit={(weight) => onOp({ type: 'update', id: node.id, fields: { weightInParent: weight } })}
        />
      ),
    },
    {
      key: 'quantity',
      header: 'مقدار',
      minWidth: 76,
      render: (node) =>
        node.isLeaf && node.totalQuantity ? <span className="t-12">{toFaDigits(node.totalQuantity.toLocaleString('en-US'))}</span> : <span className="tx5">—</span>,
    },
    {
      key: 'unit',
      header: 'واحد',
      minWidth: 70,
      render: (node) => (node.isLeaf && node.unit ? <span className="t-12 tx6">{node.unit}</span> : <span className="tx5">—</span>),
    },
    {
      key: 'start',
      header: 'شروع',
      minWidth: 84,
      render: (node) =>
        node.plannedStart ? <span className="t-sm tx7">{formatJalaliDate(node.plannedStart)}</span> : <span className="t-sm tx-err">بدون تاریخ</span>,
    },
    {
      key: 'finish',
      header: 'پایان',
      minWidth: 84,
      render: (node) =>
        node.plannedFinish ? <span className="t-sm tx7">{formatJalaliDate(node.plannedFinish)}</span> : <span className="t-sm tx-err">بدون تاریخ</span>,
    },
  ];

  return (
    <TreeTable
      nodes={nodes}
      minWidth={290 + 40 + 80 + 84 + 76 + 70 + 84 + 84 + 120}
      caption="درخت نسخهٔ کاری WBS"
      expandedIds={expandedIds}
      onToggleExpand={onToggleExpand}
      selectedId={selectedId}
      onSelect={(node) => onSelect(node.id)}
      isLeaf={(node) => node.isLeaf}
      keyboardNavigation
      stickyHeader
      virtualization={virtualization}
      getRowProps={(node) => ({
        'data-drop': drop?.id === node.id ? drop.position : undefined,
        onDragOver: (event: DragEvent<HTMLTableRowElement>) => {
          if (!dragging || structureLocked) return;
          event.preventDefault();
          const rect = event.currentTarget.getBoundingClientRect();
          const position = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
          if (drop?.id !== node.id || drop.position !== position) setDrop({ id: node.id, position });
        },
        onDrop: (event: DragEvent<HTMLTableRowElement>) => {
          event.preventDefault();
          if (drop) dropOn(node, drop.position);
          setDrop(null);
          setDragging(null);
        },
      })}
      titleColumn={{
        header: 'عنوان',
        minWidth: 290,
        title: (node) => (
          <span className="row g6" style={{ minWidth: 0 }}>
            {!structureLocked && (
              <span
                draggable
                role="button"
                tabIndex={-1}
                aria-label={`جابه‌جایی ${node.title}`}
                title="بکشید و روی ردیف دیگر رها کنید"
                className="tx5"
                style={{ display: 'inline-flex', cursor: 'grab' }}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', node.id);
                  setDragging(node.id);
                }}
                onDragEnd={() => {
                  setDragging(null);
                  setDrop(null);
                }}
              >
                <Icon name="grip-vertical" size={14} />
              </span>
            )}
            <span className="trunc">{node.title}</span>
          </span>
        ),
        badges: (node) => (
          <>
            {touchedIds.has(node.id) && (
              <span className="dot" style={{ color: '#E07A2C', flexShrink: 0 }} title="تغییر ذخیره‌نشده" aria-label="تغییر ذخیره‌نشده" />
            )}
            {node.change === 'added' && (
              <Badge size="sm" tone="ok">
                جدید
              </Badge>
            )}
            {node.change === 'moved' && (
              <Badge size="sm" tone="pri" icon="move">
                جابه‌جا
              </Badge>
            )}
            {node.isMilestone && (
              <Badge size="sm" tone="acc" icon="flag">
                نقطهٔ عطف
              </Badge>
            )}
            {weightIssues.has(node.id) && (
              <Badge size="sm" tone="err" icon="alert-triangle" title={weightIssues.get(node.id)!.message}>
                Σ فرزندان {formatPercentAuto(weightIssues.get(node.id)!.currentSum ?? 0, 2)}
              </Badge>
            )}
            {byId.get(node.id)?.hasReports && node.isLeaf && (
              <span className="tx5" title="این برگ گزارش دارد" style={{ display: 'inline-flex' }}>
                <Icon name="clipboard-check" size={12} />
              </span>
            )}
          </>
        ),
      }}
      columns={columns}
    />
  );
}

/** ورودی وزن درجا — با Enter یا ترک فیلد ثبت می‌شود؛ ارقام فارسی پذیرفته می‌شود. */
function WeightInput({
  item,
  invalid,
  onCommit,
}: {
  item: DraftItemDto;
  invalid: boolean;
  onCommit: (weight: number) => void;
}) {
  const initial = toFaDigits(String(item.weightInParent)).replace('.', '٫');
  const [value, setValue] = useState(initial);

  function commit() {
    const parsed = Number(toEnDigits(value).replace('٫', '.').replace('/', '.'));
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      setValue(initial);
      return;
    }
    // رابط تا ۲ رقم اعشار می‌پذیرد (wbs.md ۵.۳)
    const rounded = Math.round(parsed * 100) / 100;
    if (rounded !== item.weightInParent) onCommit(rounded);
  }

  return (
    <span className={invalid ? 'fld sm err' : 'fld sm'} style={{ width: 72, height: 28, background: invalid ? undefined : '#FFF8EB' }}>
      <input
        value={value}
        inputMode="decimal"
        aria-label={`وزن ${item.title}`}
        aria-invalid={invalid || undefined}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            (event.target as HTMLInputElement).blur();
          }
          if (event.key === 'Escape') setValue(initial);
          event.stopPropagation();
        }}
        style={{ width: '100%', textAlign: 'center' }}
      />
      <span className="sfx">٪</span>
    </span>
  );
}
