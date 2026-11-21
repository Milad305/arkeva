import { useState } from 'react';

import type { MenuEntry } from '@/shared/components/ui/Menu';

// ── ستون‌ها ──

export type WbsColumnKey =
  | 'code'
  | 'weight'
  | 'weightInProject'
  | 'quantity'
  | 'method'
  | 'start'
  | 'finish'
  | 'planned'
  | 'actual'
  | 'deviation'
  | 'supervisor'
  | 'bac';

export const WBS_COLUMN_LABELS: Record<WbsColumnKey, string> = {
  code: 'کد',
  weight: 'وزن',
  weightInProject: 'وزن در پروژه',
  quantity: 'مقدار / واحد',
  method: 'روش اندازه‌گیری',
  start: 'شروع',
  finish: 'پایان',
  planned: 'پیشرفت برنامه‌ای',
  actual: 'پیشرفت واقعی',
  deviation: 'انحراف',
  supervisor: 'سرپرست',
  bac: 'بودجه (BAC)',
};

/** ستون‌های آرت‌بورد به‌علاوهٔ «انحراف» (`features/wbs.md` ۸)؛ باقی از منوی «ستون‌ها». */
export const DEFAULT_WBS_COLUMNS: WbsColumnKey[] = [
  'code',
  'weight',
  'quantity',
  'start',
  'finish',
  'planned',
  'actual',
  'deviation',
  'supervisor',
];

export const COLUMN_ORDER: WbsColumnKey[] = [
  'code',
  'weight',
  'weightInProject',
  'quantity',
  'method',
  'start',
  'finish',
  'planned',
  'actual',
  'deviation',
  'supervisor',
  'bac',
];

export const COLUMN_MIN_WIDTH: Record<WbsColumnKey, number> = {
  code: 76,
  weight: 60,
  weightInProject: 84,
  quantity: 118,
  method: 104,
  start: 84,
  finish: 84,
  planned: 124,
  actual: 124,
  deviation: 70,
  supervisor: 132,
  bac: 104,
};

export const TITLE_MIN_WIDTH = 290;
export const MENU_WIDTH = 40;

const STORAGE_KEY = 'pj.wbs.columns';

/** ستون‌های انتخابی هر بیننده — فقط راحتی؛ اگر ذخیره ممکن نبود پیش‌فرض می‌ماند. */
export function useWbsColumns(): [Set<WbsColumnKey>, (key: WbsColumnKey) => void, () => void] {
  const [visible, setVisible] = useState<Set<WbsColumnKey>>(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = (JSON.parse(stored) as string[]).filter((key): key is WbsColumnKey => key in WBS_COLUMN_LABELS);
        if (parsed.length > 0) return new Set(parsed);
      }
    } catch {
      // ذخیره در دسترس نیست — پیش‌فرض
    }
    return new Set(DEFAULT_WBS_COLUMNS);
  });

  const persist = (next: Set<WbsColumnKey>) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      // نادیده
    }
  };

  const toggle = (key: WbsColumnKey) =>
    setVisible((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      persist(next);
      return next;
    });

  const reset = () => {
    const next = new Set(DEFAULT_WBS_COLUMNS);
    persist(next);
    setVisible(next);
  };

  return [visible, toggle, reset];
}

export function columnMenuEntries(
  visible: ReadonlySet<WbsColumnKey>,
  toggle: (key: WbsColumnKey) => void,
  reset: () => void,
  canViewAmounts: boolean,
): MenuEntry[] {
  return [
    { key: 'group', group: 'ستون‌های جدول' },
    ...COLUMN_ORDER.filter((key) => key !== 'bac' || canViewAmounts).map((key) => ({
      key,
      label: WBS_COLUMN_LABELS[key],
      checked: visible.has(key),
      keepOpen: true,
      onSelect: () => toggle(key),
    })),
    { key: 'sep', separator: true },
    { key: 'reset', label: 'بازگشت به پیش‌فرض', icon: 'rotate-ccw', onSelect: reset },
  ];
}
