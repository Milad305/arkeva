import { useMemo, useState, type RefObject } from 'react';

import { Badge } from '@/shared/components/ui/Badge';
import { CostTypeTag } from '@/shared/components/ui/CostTypeTag';
import type { Column } from '@/shared/components/ui/DataTable';
import { IconButton } from '@/shared/components/ui/IconButton';
import { ContextMenu, Menu, type MenuEntry } from '@/shared/components/ui/Menu';
import { ProgressBar } from '@/shared/components/ui/ProgressBar';
import { TreeTable, type TreeVirtualization } from '@/shared/components/ui/TreeTable';
import { formatPercentAuto, formatQuantity, toFaDigits } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import { CONSUMPTION_COLOR, CONSUMPTION_ROW_CLASS, consumptionTone, type CbsTreeNode } from '../services/cbsView';
import { Money } from './Money';

export interface CbsTreeProps {
  nodes: CbsTreeNode[];
  canViewAmounts: boolean;
  expandedIds: ReadonlySet<EntityId>;
  onToggleExpand: (id: EntityId) => void;
  selectedId: EntityId | null;
  onSelect: (node: CbsTreeNode) => void;
  contextIds: ReadonlySet<EntityId>;
  menuFor: (node: CbsTreeNode) => MenuEntry[];
  scrollRef: RefObject<HTMLElement>;
}

/** ردیف دارای پیش‌بینی دو خط دارد؛ ارتفاع ثابت روی همه برای مجازی‌سازی. */
const ROW_HEIGHT = 48;
const TITLE_MIN_WIDTH = 240;
const MENU_WIDTH = 44;

type CbsColumn = Column<CbsTreeNode> & { min: number };

/**
 * درخت دفتر CBS (W14، cbs.md ۱۲). بدون `cbs.view_amounts` ستون‌های مبلغ حذف می‌شوند
 * و فقط درصد مصرف (نسبت) می‌ماند (D11، AC-CBS-06). رنگ مصرف از هشدار سرور است.
 */
export function CbsTree({
  nodes,
  canViewAmounts,
  expandedIds,
  onToggleExpand,
  selectedId,
  onSelect,
  contextIds,
  menuFor,
  scrollRef,
}: CbsTreeProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: CbsTreeNode } | null>(null);
  const virtualization = useMemo<TreeVirtualization>(
    () => ({ scrollRef, rowHeight: ROW_HEIGHT, threshold: 150, overscan: 14 }),
    [scrollRef],
  );

  const columns = useMemo(() => {
    const list: CbsColumn[] = [
      {
        key: 'code',
        header: 'کد',
        min: 72,
        minWidth: 72,
        render: (node) => (
          <span className="mono t-sm tx6" dir="ltr">
            {node.code}
          </span>
        ),
      },
      { key: 'type', header: 'نوع', min: 104, minWidth: 104, render: (node) => <CostTypeTag type={node.costType} /> },
      {
        key: 'quantity',
        header: 'برآورد',
        min: 108,
        minWidth: 108,
        render: (node) =>
          !node.isLeaf ? (
            <span className="tx5">—</span>
          ) : node.pricingMode === 'unit_rate' ? (
            <span className="t-12 tx7 nowrap">{formatQuantity(node.estimatedQuantity, node.unit)}</span>
          ) : (
            <span className="t-12 tx5">مقطوع</span>
          ),
      },
    ];

    if (canViewAmounts) {
      list.push(
        {
          key: 'rate',
          header: 'نرخ واحد',
          min: 92,
          minWidth: 92,
          render: (node) => (node.unitRate ? <Money value={node.unitRate} short /> : <span className="tx5">—</span>),
        },
        { key: 'budget', header: 'بودجه', min: 92, minWidth: 92, emphasized: true, render: (node) => <Money value={node.budget} short /> },
        { key: 'ac', header: 'هزینهٔ واقعی', min: 92, minWidth: 92, render: (node) => <Money value={node.progress?.ac ?? null} short /> },
      );
    }

    list.push({
      key: 'consumed',
      header: 'مصرف',
      min: 124,
      minWidth: 124,
      render: (node) => {
        const progress = node.progress;
        if (!progress || progress.consumedPercent === null) return <span className="tx5">—</span>;
        const tone = consumptionTone(progress);
        const color = CONSUMPTION_COLOR[tone];
        return (
          <span className="row g6" style={{ minWidth: 108 }} title={progress.alertCodes.join('، ') || undefined}>
            <span className="t-sm fw6" style={{ width: 42, color: tone === 'normal' ? 'var(--gray-800)' : color }}>
              {formatPercentAuto(progress.consumedPercent)}
            </span>
            <ProgressBar size="thin" value={Math.min(progress.consumedPercent, 100)} color={color} />
          </span>
        );
      },
    });

    if (canViewAmounts) {
      list.push({
        key: 'eac',
        header: 'پیش‌بینی',
        min: 112,
        minWidth: 112,
        render: (node) => {
          const progress = node.progress;
          if (!progress?.eac) return <span className="tx5">—</span>;
          const variance = progress.eacVariancePercent ?? 0;
          return (
            <span className="col" style={{ lineHeight: 1.3 }}>
              <Money value={progress.eac} short />
              <span className="t-xs nowrap">
                {variance > 0.005 ? (
                  <span className="tx-err">+{formatPercentAuto(variance)}</span>
                ) : variance < -0.005 ? (
                  <span className="tx-ok">{formatPercentAuto(variance)}</span>
                ) : (
                  <span className="tx5">برابر بودجه</span>
                )}
                {progress.eacLowConfidence && <span className="tx5"> · کم‌اعتبار</span>}
              </span>
            </span>
          );
        },
      });
    }

    list.push({
      key: 'links',
      header: 'WBS متصل',
      min: 84,
      minWidth: 84,
      render: (node) =>
        node.isLeaf && node.linkCount === 0 ? (
          <Badge size="sm" tone="wrn">
            بدون اتصال
          </Badge>
        ) : (
          <span className="t-12 tx7">{toFaDigits(node.linkCount)}</span>
        ),
    });

    list.push({
      key: 'menu',
      header: <span className="sr-input">اقدامات</span>,
      min: MENU_WIDTH,
      width: MENU_WIDTH,
      render: (node) => (
        <span onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} role="presentation">
          <Menu
            entries={menuFor(node)}
            trigger={(props) => <IconButton {...props} icon="more-vertical" label={`اقدامات ${node.title}`} size="sm" tabIndex={-1} />}
          />
        </span>
      ),
    });
    return list;
  }, [canViewAmounts, menuFor]);

  const minWidth = TITLE_MIN_WIDTH + columns.reduce((sum, column) => sum + column.min + 20, 0);

  return (
    <>
      <TreeTable
        nodes={nodes}
        minWidth={minWidth}
        caption="ساختار شکست هزینه"
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
        rowStatusClass={(node) => CONSUMPTION_ROW_CLASS[consumptionTone(node.progress)]}
        isLate={(node) => consumptionTone(node.progress) === 'over'}
        isDimmed={(node) => contextIds.has(node.id)}
        stickyHeader
        keyboardNavigation
        virtualization={virtualization}
        getRowProps={() => ({ style: { height: ROW_HEIGHT } })}
        titleColumn={{
          header: 'عنوان',
          minWidth: TITLE_MIN_WIDTH,
          title: (node) => node.title,
          badges: (node) =>
            node.isLeaf && node.progress?.alertCodes.includes('AL-CST-02') ? (
              <Badge size="sm" tone="wrn" icon="trending-up" title="پیش‌بینی فراتر از بودجه (AL-CST-02)">
                فراتر از بودجه
              </Badge>
            ) : null,
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
