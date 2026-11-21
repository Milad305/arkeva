import { useState } from 'react';

/** وضعیت سری‌های خاموش یک نمودار — همان الگوی منحنی S برای بقیهٔ کارت‌ها. */
export function useHiddenSeries() {
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const toggle = (key: string) =>
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  return { hidden, toggle };
}
