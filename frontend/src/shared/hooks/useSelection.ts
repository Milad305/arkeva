import { useCallback, useMemo, useState } from 'react';

export type SelectionState = 'none' | 'some' | 'all';

export interface Selection<Id> {
  selected: ReadonlySet<Id>;
  count: number;
  state: SelectionState;
  isSelected: (id: Id) => boolean;
  toggle: (id: Id) => void;
  toggleAll: () => void;
  clear: () => void;
  select: (ids: Id[]) => void;
}

/**
 * انتخاب چندتایی ردیف‌های جدول، با حالت سه‌گانهٔ سرستون (هیچ/بخشی/همه).
 * جدول پروژه‌ها، صندوق گزارش‌ها و اعضا همه از همین استفاده می‌کنند.
 */
export function useSelection<Id extends string | number>(allIds: readonly Id[]): Selection<Id> {
  const [selected, setSelected] = useState<Set<Id>>(() => new Set());

  const isSelected = useCallback((id: Id) => selected.has(id), [selected]);

  const toggle = useCallback((id: Id) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  const select = useCallback((ids: Id[]) => setSelected(new Set(ids)), []);

  const state: SelectionState = useMemo(() => {
    if (selected.size === 0) return 'none';
    if (allIds.length > 0 && selected.size >= allIds.length) return 'all';
    return 'some';
  }, [selected, allIds.length]);

  const toggleAll = useCallback(() => {
    setSelected((previous) => (previous.size >= allIds.length ? new Set() : new Set(allIds)));
  }, [allIds]);

  return { selected, count: selected.size, state, isSelected, toggle, toggleAll, clear, select };
}
