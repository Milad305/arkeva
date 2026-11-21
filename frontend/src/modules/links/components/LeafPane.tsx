import { useMemo, useState } from 'react';

import { Badge } from '@/shared/components/ui/Badge';
import { Icon } from '@/shared/components/ui/Icon';
import { SegmentedControl } from '@/shared/components/ui/Tabs';
import { TextInput } from '@/shared/components/ui/TextInput';
import { toFaDigits } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import { buildWbsTree, type TreeOf } from '@/modules/wbs/services/wbsTree';
import type { LinkLeafDto, LinksViewDto } from '../types';

export type LeafFilter = 'all' | 'linked' | 'unlinked';

type Node = TreeOf<LinkLeafDto>;

export interface LeafPaneProps {
  view: LinksViewDto;
  selectedId: EntityId | null;
  onSelect: (id: EntityId) => void;
  filter: LeafFilter;
  onFilterChange: (filter: LeafFilter) => void;
  /** فقط برگ‌های متصل به این قلم (`?cbsItem=` از W14). */
  cbsFilter: { id: EntityId; code: string } | null;
  onClearCbsFilter: () => void;
  touchedIds: ReadonlySet<EntityId>;
}

const normalize = (value: string) =>
  value.trim().toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک');

/**
 * فهرست فعالیت‌های WBS در W15 (بوم): شمار برگ‌ها، جستجو، فیلتر «با اتصال / بدون»، و
 * درخت با نشان اتصال روی برگ و «متصل/کل» روی والد. فقط برگ انتخاب می‌شود (cbs.md ۵.۱).
 */
export function LeafPane({
  view,
  selectedId,
  onSelect,
  filter,
  onFilterChange,
  cbsFilter,
  onClearCbsFilter,
  touchedIds,
}: LeafPaneProps) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<EntityId>>(() => new Set());
  const roots = useMemo(() => buildWbsTree(view.leaves), [view.leaves]);
  const linkedToCbs = useMemo(
    () =>
      cbsFilter
        ? new Set(
            view.links
              .filter((link) => link.cbsItemId === cbsFilter.id)
              .map((link) => link.wbsItemId),
          )
        : null,
    [cbsFilter, view.links],
  );

  const query = normalize(search);
  const filtering = Boolean(query) || filter !== 'all' || linkedToCbs !== null;
  const matches = (leaf: LinkLeafDto) =>
    leaf.isLeaf &&
    (!query || normalize(leaf.title).includes(query) || leaf.code.includes(query)) &&
    (filter === 'all' ||
      (filter === 'linked' ? leaf.linkCount > 0 : leaf.linkable && leaf.linkCount === 0)) &&
    (!linkedToCbs || linkedToCbs.has(leaf.id));

  const prune = (node: Node): Node | null => {
    if (node.isLeaf) return matches(node) ? node : null;
    const children = node.children.map(prune).filter((child): child is Node => child !== null);
    return children.length > 0 ? { ...node, children } : null;
  };
  const nodes = filtering ? roots.map(prune).filter((node): node is Node => node !== null) : roots;

  const { leafCount, linkedCount, unlinkedCount } = view.summary;

  const renderNode = (node: Node, depth: number): React.ReactNode => {
    const indent = 8 + depth * 18;
    if (!node.isLeaf) {
      const open = filtering || !collapsed.has(node.id);
      const complete = node.linkableLeaves > 0 && node.linkedLeaves === node.linkableLeaves;
      return (
        <div key={node.id} role="group" aria-label={node.title}>
          <button
            type="button"
            className="row g6 t-13"
            aria-expanded={open}
            style={{
              padding: '7px 8px',
              paddingInlineStart: indent,
              width: '100%',
              textAlign: 'start',
            }}
            onClick={() =>
              setCollapsed((previous) => {
                const next = new Set(previous);
                if (next.has(node.id)) next.delete(node.id);
                else next.add(node.id);
                return next;
              })
            }
          >
            <span className="tw">
              <Icon name={open ? 'chevron-down' : 'chevron-left'} size={13} />
            </span>
            <span className="ic-f">
              <Icon name={open ? 'folder-open' : 'folder'} size={15} />
            </span>
            <span className="fw6 tx6 grow trunc">{node.title}</span>
            {node.linkableLeaves > 0 && (
              <Badge size="sm" tone={complete ? 'ok' : 'acc'}>
                {toFaDigits(node.linkedLeaves)}/{toFaDigits(node.linkableLeaves)}
              </Badge>
            )}
            <span className="mono t-xs tx5" dir="ltr">
              {node.code}
            </span>
          </button>
          {open && node.children.map((child) => renderNode(child, depth + 1))}
        </div>
      );
    }
    const selected = node.id === selectedId;
    const linked = node.linkCount > 0;
    return (
      <button
        key={node.id}
        type="button"
        className={selected ? 'row g6 t-13 sel-card' : 'row g6 t-13'}
        aria-current={selected ? 'true' : undefined}
        disabled={!node.linkable}
        title={node.linkable ? undefined : 'نقطهٔ عطف بودجه و اتصال CBS ندارد'}
        style={{
          padding: '7px 8px',
          paddingInlineStart: indent + 18,
          borderRadius: 8,
          width: '100%',
          textAlign: 'start',
          opacity: node.linkable ? 1 : 0.55,
        }}
        onClick={() => onSelect(node.id)}
      >
        <span
          className={linked ? 'tx-ok' : node.linkable ? 'tx-acc' : 'tx5'}
          style={{ display: 'inline-flex' }}
          title={linked ? 'دارای اتصال' : node.linkable ? 'بدون اتصال' : 'نقطهٔ عطف'}
        >
          <Icon name={linked ? 'link-2' : node.linkable ? 'alert-circle' : 'flag'} size={14} />
        </span>
        <span className={selected ? 'tx9 fw6 grow trunc' : 'tx8 grow trunc'}>{node.title}</span>
        {touchedIds.has(node.id) && (
          <span className="dot" style={{ color: '#E07A2C' }} aria-label="تغییر ذخیره‌نشده" />
        )}
        <span className="mono t-xs tx5" dir="ltr">
          {node.code}
        </span>
      </button>
    );
  };

  return (
    <div className="col" style={{ minHeight: 0, height: '100%' }}>
      <div
        className="col g12"
        style={{ padding: '14px 16px 12px', borderBottom: '1px solid #F4F4F5' }}
      >
        <div className="row between">
          <h2 className="h-sh row g6">
            <span className="tx-pri" style={{ display: 'inline-flex' }}>
              <Icon name="git-branch" size={16} />
            </span>
            فعالیت‌های WBS
          </h2>
          <Badge tone="neu">فقط برگ‌ها</Badge>
        </div>
        <div className="strip c3">
          <Stat value={leafCount} label="کل برگ‌ها" />
          <Stat value={linkedCount} label="دارای اتصال" tone="tx-ok" />
          <Stat
            value={unlinkedCount}
            label="بدون اتصال"
            tone={unlinkedCount > 0 ? 'tx-acc' : undefined}
          />
        </div>
        <TextInput
          size="sm"
          icon="search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="جستجوی فعالیت…"
          aria-label="جستجوی فعالیت"
        />
        <SegmentedControl
          fill
          activeKey={filter}
          items={[
            { key: 'all', label: 'همه' },
            { key: 'linked', label: 'با اتصال' },
            { key: 'unlinked', label: 'بدون اتصال' },
          ]}
          onChange={(key) => onFilterChange(key as LeafFilter)}
          style={{ width: '100%' }}
        />
        {cbsFilter && (
          <span className="row between t-12 box" style={{ padding: '6px 10px' }}>
            <span>
              فقط متصل به{' '}
              <span className="mono" dir="ltr">
                {cbsFilter.code}
              </span>
            </span>
            <button type="button" className="link t-12" onClick={onClearCbsFilter}>
              همه
            </button>
          </span>
        )}
      </div>
      <nav
        className="col"
        aria-label="فعالیت‌های WBS"
        style={{ padding: '6px 8px', gap: 1, overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}
      >
        {nodes.length === 0 ? (
          <span className="t-12 tx6" style={{ padding: 12 }}>
            فعالیتی با این فیلتر نیست.
          </span>
        ) : (
          nodes.map((node) => renderNode(node, 0))
        )}
      </nav>
    </div>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone?: string }) {
  return (
    <div style={{ alignItems: 'center', padding: 8 }}>
      <span className={`stat-v ${tone ?? ''}`} style={{ fontSize: 17 }}>
        {toFaDigits(value)}
      </span>
      <span className="t-xs tx5">{label}</span>
    </div>
  );
}
