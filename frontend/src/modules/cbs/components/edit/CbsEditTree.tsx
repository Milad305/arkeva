import { useMemo, type RefObject } from 'react';

import { Badge } from '@/shared/components/ui/Badge';
import { CostTypeTag } from '@/shared/components/ui/CostTypeTag';
import type { Column } from '@/shared/components/ui/DataTable';
import { Icon } from '@/shared/components/ui/Icon';
import { TreeTable, type TreeVirtualization } from '@/shared/components/ui/TreeTable';
import { formatQuantity } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import { buildWbsTree, type TreeOf } from '@/modules/wbs/services/wbsTree';
import type { CbsDraftItemDto } from '../../types/draft';
import { Money } from '../Money';

type Node = TreeOf<CbsDraftItemDto>;

export interface CbsEditTreeProps {
  items: CbsDraftItemDto[];
  expandedIds: ReadonlySet<EntityId>;
  onToggleExpand: (id: EntityId) => void;
  selectedId: EntityId | null;
  onSelect: (id: EntityId) => void;
  touchedIds: ReadonlySet<EntityId>;
  /** قلم‌هایی که خطای اعتبارسنجی دارند (V-08). */
  errorIds: ReadonlySet<EntityId>;
  canViewAmounts: boolean;
  scrollRef: RefObject<HTMLElement>;
}

const ROW_HEIGHT = 44;
const TITLE_MIN_WIDTH = 260;

/**
 * درخت حالت ویرایش CBS: نشان تغییر ذخیره‌نشده، «جدید»، «بازنگری بودجه» و وضعیت تخصیص.
 * بودجه و تخصیص از پیش‌نمایش سرور است؛ هیچ ضربی اینجا نیست (D07).
 */
export function CbsEditTree({ items, expandedIds, onToggleExpand, selectedId, onSelect, touchedIds, errorIds, canViewAmounts, scrollRef }: CbsEditTreeProps) {
  const nodes = useMemo(() => buildWbsTree(items), [items]);
  const virtualization = useMemo<TreeVirtualization>(() => ({ scrollRef, rowHeight: ROW_HEIGHT, threshold: 200 }), [scrollRef]);

  const columns = useMemo(() => {
    const list: Array<Column<Node> & { min: number }> = [
      {
        key: 'code',
        header: 'کد',
        min: 80,
        minWidth: 80,
        render: (node) => (
          <span className="mono t-sm tx6" dir="ltr">
            {node.code}
          </span>
        ),
      },
      { key: 'type', header: 'نوع', min: 104, minWidth: 104, render: (node) => <CostTypeTag type={node.costType} /> },
      {
        key: 'estimate',
        header: 'برآورد',
        min: 112,
        minWidth: 112,
        render: (node) =>
          !node.isLeaf ? (
            <span className="tx5">—</span>
          ) : node.pricingMode === 'unit_rate' ? (
            node.estimatedQuantity && node.unit ? (
              <span className="t-12 tx7 nowrap">{formatQuantity(node.estimatedQuantity, node.unit)}</span>
            ) : (
              <span className="t-12 tx-err">ناقص</span>
            )
          ) : node.pricingMode === 'lump_sum' ? (
            <span className="t-12 tx5">مقطوع</span>
          ) : (
            <span className="t-12 tx-err">بدون شیوهٔ قیمت</span>
          ),
      },
    ];
    if (canViewAmounts) {
      list.push(
        { key: 'rate', header: 'نرخ واحد', min: 92, minWidth: 92, render: (node) => (node.unitRate ? <Money value={node.unitRate} short /> : <span className="tx5">—</span>) },
        { key: 'budget', header: 'بودجه', min: 96, minWidth: 96, emphasized: true, render: (node) => <Money value={node.budget} short /> },
        {
          key: 'allocation',
          header: 'تخصیص',
          min: 120,
          minWidth: 120,
          render: (node) => {
            const rest = BigInt(node.unallocated ?? '0');
            if (node.isLeaf && node.linkCount === 0) return <Badge size="sm" tone="wrn">بدون اتصال</Badge>;
            if (rest < 0n)
              return (
                <span className="t-12 tx-err nowrap">
                  بیش از برآورد <Money value={(-rest).toString()} short className="t-12 tx-err" />
                </span>
              );
            if (rest > 0n)
              return (
                <span className="t-12 tx-wrn nowrap">
                  مانده <Money value={rest.toString()} short className="t-12 tx-wrn" />
                </span>
              );
            return <span className="t-12 tx-ok">کامل</span>;
          },
        },
      );
    }
    return list;
  }, [canViewAmounts]);

  const minWidth = TITLE_MIN_WIDTH + columns.reduce((sum, column) => sum + column.min + 20, 0);

  return (
    <TreeTable
      nodes={nodes}
      minWidth={minWidth}
      caption="CBS نسخهٔ کاری"
      expandedIds={expandedIds}
      onToggleExpand={onToggleExpand}
      selectedId={selectedId}
      onSelect={(node) => onSelect(node.id)}
      isLeaf={(node) => node.isLeaf}
      rowStatusClass={(node) => (errorIds.has(node.id) ? 's-late' : node.budgetChanged ? 's-warn' : node.change ? 's-prog' : 's-none')}
      stickyHeader
      keyboardNavigation
      virtualization={virtualization}
      getRowProps={() => ({ style: { height: ROW_HEIGHT } })}
      titleColumn={{
        header: 'عنوان',
        minWidth: TITLE_MIN_WIDTH,
        title: (node) => (
          <span className="row g6" style={{ minWidth: 0 }}>
            <span className="trunc">{node.title}</span>
            {touchedIds.has(node.id) && <span className="dot" style={{ color: '#E07A2C', flexShrink: 0 }} title="تغییر ذخیره‌نشده" aria-label="تغییر ذخیره‌نشده" />}
          </span>
        ),
        badges: (node) => (
          <>
            {node.change === 'added' && <Badge size="sm" tone="ok">جدید</Badge>}
            {node.change === 'moved' && (
              <Badge size="sm" tone="pri" icon="move">
                جابه‌جا
              </Badge>
            )}
            {node.budgetChanged && node.change !== 'added' && (
              <Badge size="sm" tone="wrn" icon="wallet" title="نرخ، مقدار یا مبلغ عوض شده — بازنگری بودجه">
                بودجه
              </Badge>
            )}
            {node.hasPostedCost && (
              <span className="tx5" title="هزینهٔ ثبت‌شده دارد" style={{ display: 'inline-flex' }}>
                <Icon name="receipt" size={12} />
              </span>
            )}
          </>
        ),
      }}
      columns={columns}
    />
  );
}
