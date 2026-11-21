import type { ComponentType } from 'react';

/**
 * جای زنگ اعلان در نوار بالا. لایهٔ `shared` ماژول‌ها را نمی‌شناسد؛ `main.tsx` زنگ F13
 * (`NotificationBell`) را اینجا ثبت می‌کند و `Topbar` آن را می‌کشد.
 */
let bell: ComponentType | null = null;

export function registerTopbarBell(component: ComponentType): void {
  bell = component;
}

export function getTopbarBell(): ComponentType | null {
  return bell;
}
