import { useMemo, useState, type RefObject } from 'react';

import { LEAF_MEASUREMENT_METHODS, WBS_PROGRESS_STATUS } from '@/config/constants';
import { Avatar } from '@/shared/components/ui/Avatar';
import { Badge } from '@/shared/components/ui/Badge';
import type { Column } from '@/shared/components/ui/DataTable';
import { IconButton } from '@/shared/components/ui/IconButton';
import { ContextMenu, Menu, type MenuEntry } from '@/shared/components/ui/Menu';
import { ProgressBar } from '@/shared/components/ui/ProgressBar';
import { TreeTable, type TreeVirtualization } from '@/shared/components/ui/TreeTable';
import { formatJalaliDate } from '@/shared/utils/date';
import { formatPercentAuto, formatQuantity, formatRialParts } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import type { WbsTreeNode } from '../types';
import { formatDeviation, STATUS_COLOR, STATUS_ROW_CLASS } from '../services/progressView';
import {
  COLUMN_MIN_WIDTH,
  COLUMN_ORDER,
  MENU_WIDTH,
  TITLE_MIN_WIDTH,
  type WbsColumnKey,
} from '../hooks/useWbsColumns';

// ── جدول ──

export interface WbsTreeProps {
  nodes: WbsTreeNode[];
  visibleColumns: ReadonlySet<WbsColumnKey>;
  canViewAmounts: boolean;
  expandedIds: ReadonlySet<EntityId>;
  onToggleExpand: (id: EntityId) => void;
  selectedId: EntityId | null;
  onSelect: (node: WbsTreeNode) => void;
  /** والدهای زمینهٔ نتیجهٔ فیلتر. */
  contextIds: ReadonlySet<EntityId>;
  /** گروه‌های نامتعادل — فقط وقتی درخت نمایش‌داده‌شده خودِ نسخهٔ کاری است (پیش‌نویس). */
  unbalanced: ReadonlyMap<EntityId, number>;
  menuFor: (node: WbsTreeNode) => MenuEntry[];
  scrollRef: RefObject<HTMLElement>;
}

/**
 * ارتفاع ثابت ردیف برای مجازی‌سازی. ردیف `.tree` با آواتار سرپرست حدود ۴۳٫۵px است؛
 * ۴۴ روی همهٔ ردیف‌ها گذاشته می‌شود تا محاسبهٔ پنجره با واقعیت یکی باشد.
 */
const ROW_HEIGHT = 44;

export function WbsTree({
  nodes,
  visibleColumns,
  canViewAmounts,
  expandedIds,
  onToggleExpand,
  selectedId,
  onSelect,
  contextIds,
  unbalanced,
  menuFor,
  scrollRef,
}: WbsTreeProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: WbsTreeNode } | null>(null);

  const virtualization = useMemo<TreeVirtualization>(
    () => ({ scrollRef, rowHeight: ROW_HEIGHT, threshold: 150, overscan: 14 }),
    [scrollRef],
  );

  const columns = useMemo(() => {
    const all: Record<WbsColumnKey, Column<WbsTreeNode>> = {
      code: {
        key: 'code',
        header: 'کد',
        minWidth: COLUMN_MIN_WIDTH.code,
        render: (node) => (
          <span className="mono t-sm tx6" dir="ltr">
            {node.code}
          </span>
        ),
      },
      weight: {
        key: 'weight',
        header: 'وزن',
        minWidth: COLUMN_MIN_WIDTH.weight,
        render: (node) => <span className="t-12 fw5 tx8">{formatPercentAuto(node.weightInParent, 2)}</span>,
      },
      weightInProject: {
        key: 'weightInProject',
        header: 'وزن در پروژه',
        minWidth: COLUMN_MIN_WIDTH.weightInProject,
        render: (node) => <span className="t-12 tx7">{formatPercentAuto(node.weightInProject, 2)}</span>,
      },
      quantity: {
        key: 'quantity',
        header: 'مقدار / واحد',
        minWidth: COLUMN_MIN_WIDTH.quantity,
        render: (node) =>
          node.isLeaf && node.totalQuantity ? (
            <span className="t-12 tx7">{formatQuantity(node.totalQuantity, node.unit)}</span>
          ) : (
            <span className="tx5">—</span>
          ),
      },
      method: {
        key: 'method',
        header: 'روش اندازه‌گیری',
        minWidth: COLUMN_MIN_WIDTH.method,
        render: (node) =>
          node.measurementMethod ? (
            <span className="t-12 tx7">{LEAF_MEASUREMENT_METHODS[node.measurementMethod]}</span>
          ) : (
            <span className="tx5">—</span>
          ),
      },
      start: {
        key: 'start',
        header: 'شروع',
        minWidth: COLUMN_MIN_WIDTH.start,
        render: (node) => <span className="t-sm tx7">{formatJalaliDate(node.plannedStart)}</span>,
      },
      finish: {
        key: 'finish',
        header: 'پایان',
        minWidth: COLUMN_MIN_WIDTH.finish,
        render: (node) => <span className="t-sm tx7">{formatJalaliDate(node.plannedFinish)}</span>,
      },
      planned: {
        key: 'planned',
        header: 'پیشرفت برنامه‌ای',
        minWidth: COLUMN_MIN_WIDTH.planned,
        render: (node) =>
          node.progress ? (
            <span className="row g6" style={{ minWidth: 110 }}>
              <span className="t-sm tx7" style={{ width: 38 }}>
                {formatPercentAuto(node.progress.plannedPercent)}
              </span>
              <ProgressBar size="thin" value={node.progress.plannedPercent} color="#A1A1AA" />
            </span>
          ) : (
            <span className="tx5">—</span>
          ),
      },
      actual: {
        key: 'actual',
        header: 'پیشرفت واقعی',
        emphasized: true,
        minWidth: COLUMN_MIN_WIDTH.actual,
        render: (node) => {
          if (!node.progress) return <span className="tx5">—</span>;
          const color = STATUS_COLOR[node.progress.status];
          return (
            <span className="row g6" style={{ minWidth: 110 }} title={WBS_PROGRESS_STATUS[node.progress.status]}>
              <span className="t-sm fw6" style={{ width: 38, color: node.progress.status === 'not_started' ? 'var(--gray-500)' : color }}>
                {formatPercentAuto(node.progress.actualPercent)}
              </span>
              <ProgressBar size="thin" value={node.progress.actualPercent} color={color} />
            </span>
          );
        },
      },
      deviation: {
        key: 'deviation',
        header: 'انحراف',
        minWidth: COLUMN_MIN_WIDTH.deviation,
        render: (node) =>
          node.progress ? (
            <span
              className="t-12 fw5"
              style={{ color: node.progress.deviation === 0 ? 'var(--gray-500)' : STATUS_COLOR[node.progress.status] }}
            >
              {formatDeviation(node.progress.deviation)}
            </span>
          ) : (
            <span className="tx5">—</span>
          ),
      },
      supervisor: {
        key: 'supervisor',
        header: 'سرپرست',
        minWidth: COLUMN_MIN_WIDTH.supervisor,
        render: (node) => {
          if (node.supervisor) {
            return (
              <span className="row g6 t-12">
                <Avatar size="s" name={node.supervisor.fullName} tone={node.supervisor.avatarTone} />
                <span className="trunc">{node.supervisor.fullName}</span>
              </span>
            );
          }
          // برگ بدون سرپرست در اپ به کسی نمی‌رسد (AL-STR-04)؛ برگ زمانی سرپرست نمی‌گیرد
          if (node.isLeaf && node.measurementMethod !== 'time_based' && !node.isMilestone) {
            return <span className="t-12 tx-wrn">تخصیص‌نیافته</span>;
          }
          return <span className="tx5">—</span>;
        },
      },
      bac: {
        key: 'bac',
        header: 'بودجه (BAC)',
        minWidth: COLUMN_MIN_WIDTH.bac,
        render: (node) => {
          if (!node.progress?.bac) return <span className="tx5">—</span>;
          const parts = formatRialParts(node.progress.bac);
          return (
            <span className="t-12 tx7 nowrap">
              {parts.value} <span className="tx5">{parts.unit}</span>
            </span>
          );
        },
      },
    };

    const chosen = COLUMN_ORDER.filter((key) => visibleColumns.has(key) && (key !== 'bac' || canViewAmounts)).map(
      (key) => all[key],
    );

    chosen.push({
      key: 'menu',
      header: <span className="sr-input">اقدامات</span>,
      width: MENU_WIDTH,
      render: (node) => (
        <span onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} role="presentation">
          <Menu
            entries={menuFor(node)}
            trigger={(props) => (
              <IconButton {...props} icon="more-vertical" label={`اقدامات ${node.title}`} size="sm" tabIndex={-1} />
            )}
          />
        </span>
      ),
    });
    return chosen;
  }, [visibleColumns, canViewAmounts, menuFor]);

  const minWidth =
    TITLE_MIN_WIDTH +
    MENU_WIDTH +
    COLUMN_ORDER.filter((key) => visibleColumns.has(key) && (key !== 'bac' || canViewAmounts)).reduce(
      (sum, key) => sum + COLUMN_MIN_WIDTH[key] + 20,
      0,
    );

  return (
    <>
      <TreeTable
        nodes={nodes}
        minWidth={minWidth}
        caption="درخت شکست کار"
        expandedIds={expandedIds}
        onToggleExpand={onToggleExpand}
        selectedId={selectedId}
        onSelect={onSelect}
        onRowContextMenu={(node, event) => {
          event.preventDefault();
          onSelect(node);
          setContextMenu({ x: event.clientX, y: event.clientY, node });
        }}
        isLeaf={(node) => node.isLeaf}
        rowStatusClass={(node) => (node.progress ? STATUS_ROW_CLASS[node.progress.status] : 's-none')}
        isLate={(node) => node.progress?.status === 'critical'}
        isDimmed={(node) => contextIds.has(node.id)}
        stickyHeader
        keyboardNavigation
        virtualization={virtualization}
        titleColumn={{
          header: 'عنوان',
          minWidth: TITLE_MIN_WIDTH,
          title: (node) => node.title,
          badges: (node) => (
            <>
              {node.isMilestone && (
                <Badge size="sm" tone="acc" icon="flag" title="نقطهٔ عطف">
                  نقطهٔ عطف
                </Badge>
              )}
              {node.measurementMethod === 'time_based' && (
                <Badge size="sm" tone="neu" icon="clock" title="پیشرفت زمانی — بدون گزارش کارگاه (D03-الف)">
                  زمانی
                </Badge>
              )}
              {unbalanced.has(node.id) && (
                <Badge
                  size="sm"
                  tone="err"
                  icon="alert-triangle"
                  title={`مجموع وزن فرزندان ${formatPercentAuto(unbalanced.get(node.id)!, 2)} است؛ باید ۱۰۰ باشد`}
                >
                  Σ {formatPercentAuto(unbalanced.get(node.id)!, 2)}
                </Badge>
              )}
            </>
          ),
        }}
        columns={columns}
      />

      <ContextMenu
        position={contextMenu ? { x: contextMenu.x, y: contextMenu.y } : null}
        onClose={() => setContextMenu(null)}
        entries={contextMenu ? menuFor(contextMenu.node) : []}
      />
    </>
  );
}
