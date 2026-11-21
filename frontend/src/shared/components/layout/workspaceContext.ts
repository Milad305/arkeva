import { createContext, useContext } from 'react';

/**
 * چیدمان کارگاه بر اساس **عرض خود ظرف**، نه عرض پنجره — نوار کناری جمع یا باز
 * باشد، تصمیم درست می‌ماند.
 *
 *   three  پنل ابزار + مرکز + پنل جزئیات کنار هم (آرت‌بورد ۱۴۴۰)
 *   two    پنل ابزار + مرکز؛ جزئیات به‌صورت لایهٔ کناری روی مرکز باز می‌شود
 *   one    فقط مرکز؛ ابزار و جزئیات هر دو لایهٔ کناری‌اند (تبلت و موبایل)
 */
export type WorkspaceLayout = 'three' | 'two' | 'one';

export interface WorkspaceContextValue {
  layout: WorkspaceLayout;
  /** پنل ابزار در چیدمان `one` باز است؟ */
  isToolbarOpen: boolean;
  openToolbar: () => void;
  closeToolbar: () => void;
}

export const WorkspaceContext = createContext<WorkspaceContextValue>({
  layout: 'three',
  isToolbarOpen: false,
  openToolbar: () => undefined,
  closeToolbar: () => undefined,
});

/** صفحه با این می‌فهمد دکمهٔ «فیلترها» لازم است یا نه. */
export function useWorkspace(): WorkspaceContextValue {
  return useContext(WorkspaceContext);
}
