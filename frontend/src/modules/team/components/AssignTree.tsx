import { useMemo, useState } from 'react';

import { Avatar } from '@/shared/components/ui/Avatar';
import { Icon } from '@/shared/components/ui/Icon';
import { Checkbox } from '@/shared/components/ui/SelectionControls';
import type { EntityId } from '@/shared/types/api';
import { buildWbsTree, type TreeOf } from '@/modules/wbs/services/wbsTree';
import type { AssignmentItemDto } from '../types';

type Node = TreeOf<AssignmentItemDto>;

export interface AssignTreeProps {
  items: AssignmentItemDto[];
  selected: ReadonlySet<EntityId>;
  onChange: (next: Set<EntityId>) => void;
  /** سرپرست هدف — نشان برگ‌های او سبز است (بوم). */
  targetUserId: EntityId | null;
  search: string;
  onlyUnassigned: boolean;
}

const normalize = (value: string) =>
  value.trim().toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک');

/** برگ‌های قابل تخصیص زیرشاخه — «انتخاب والد = همهٔ فرزندان» (۵.۱، AC-TM-02). */
function assignableBelow(node: Node): EntityId[] {
  if (node.isLeaf) return node.assignable ? [node.id] : [];
  return node.children.flatMap(assignableBelow);
}

/**
 * درخت W17 با چک‌باکس: والد همهٔ برگ‌های فعال غیرزمانی زیرشاخه‌اش را انتخاب می‌کند و حالت
 * نیمه‌انتخاب دارد؛ برگ غیرقابل تخصیص غیرفعال است با دلیل. نشان سرپرست فعلی روی هر برگ.
 */
export function AssignTree({
  items,
  selected,
  onChange,
  targetUserId,
  search,
  onlyUnassigned,
}: AssignTreeProps) {
  const roots = useMemo(() => buildWbsTree(items), [items]);
  const [collapsed, setCollapsed] = useState<Set<EntityId>>(() => new Set());
  const term = normalize(search);
  const filtering = Boolean(term) || onlyUnassigned;

  const prune = (node: Node): Node | null => {
    if (node.isLeaf) {
      const matches =
        (!term || normalize(node.title).includes(term) || node.code.includes(term)) &&
        (!onlyUnassigned || (node.assignable && !node.supervisorUserId));
      return matches ? node : null;
    }
    const children = node.children.map(prune).filter((child): child is Node => child !== null);
    return children.length > 0 || (term && normalize(node.title).includes(term))
      ? { ...node, children: children.length > 0 ? children : node.children }
      : null;
  };
  const nodes = filtering ? roots.map(prune).filter((node): node is Node => node !== null) : roots;

  const toggleIds = (ids: EntityId[], on: boolean) => {
    const next = new Set(selected);
    ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
    onChange(next);
  };

  const render = (node: Node, depth: number): React.ReactNode => {
    const pad = 8 + depth * 20;
    if (!node.isLeaf) {
      const ids = assignableBelow(node);
      const count = ids.filter((id) => selected.has(id)).length;
      const open = filtering || !collapsed.has(node.id);
      return (
        <div key={node.id} role="group" aria-label={node.title}>
          <div
            className="row g6"
            style={{
              padding: '7px 8px',
              paddingInlineStart: pad,
              borderRadius: 8,
              background: count > 0 && count === ids.length ? '#E5EBF3' : undefined,
            }}
          >
            <button
              type="button"
              className="tw"
              aria-label={open ? `بستن ${node.title}` : `باز کردن ${node.title}`}
              aria-expanded={open}
              onClick={() =>
                setCollapsed((previous) => {
                  const next = new Set(previous);
                  if (next.has(node.id)) next.delete(node.id);
                  else next.add(node.id);
                  return next;
                })
              }
            >
              <Icon name={open ? 'chevron-down' : 'chevron-left'} size={13} />
            </button>
            <Checkbox
              checked={ids.length > 0 && count === ids.length}
              indeterminate={count > 0 && count < ids.length}
              disabled={ids.length === 0}
              onChange={(event) => toggleIds(ids, event.target.checked)}
              aria-label={`${node.title} — همهٔ برگ‌ها`}
            />
            <span className="ic-f">
              <Icon name={open ? 'folder-open' : 'folder'} size={14} />
            </span>
            <span className="grow trunc t-13 fw6 tx7">{node.title}</span>
            <span className="mono t-xs tx5" dir="ltr">
              {node.code}
            </span>
          </div>
          {open && node.children.map((child) => render(child, depth + 1))}
        </div>
      );
    }
    const isSelected = selected.has(node.id);
    const transfer = isSelected && node.supervisorUserId && node.supervisorUserId !== targetUserId;
    return (
      <div
        key={node.id}
        className="row g6"
        title={node.notAssignableReason ?? undefined}
        style={{
          padding: '7px 8px',
          paddingInlineStart: pad + 20,
          borderRadius: 8,
          background: isSelected ? (transfer ? '#FFF8EB' : '#E5EBF3') : undefined,
          opacity: node.assignable ? 1 : 0.55,
        }}
      >
        <Checkbox
          checked={isSelected}
          disabled={!node.assignable}
          onChange={(event) => toggleIds([node.id], event.target.checked)}
          aria-label={node.title}
        />
        <span className="ic-l">
          <Icon name={node.assignable ? 'file-text' : 'clock'} size={14} />
        </span>
        <span className="grow trunc t-13 tx8">{node.title}</span>
        {node.supervisorName ? (
          <span className={`bdg sm pill ${node.supervisorUserId === targetUserId ? 'ok' : 'neu'}`}>
            <Avatar name={node.supervisorName} tone={node.supervisorTone ?? undefined} size="s" />
            {node.supervisorName}
          </span>
        ) : node.assignable ? (
          <span className="t-xs tx-wrn">بی‌سرپرست</span>
        ) : (
          <span className="t-xs tx5">زمانی</span>
        )}
      </div>
    );
  };

  return (
    <div className="col" style={{ padding: '6px 8px', gap: 1 }}>
      {nodes.length === 0 ? (
        <span className="t-12 tx6" style={{ padding: 12 }}>
          فعالیتی با این فیلتر نیست.
        </span>
      ) : (
        nodes.map((node) => render(node, 0))
      )}
    </div>
  );
}
