import type { RecentEntryDto, SearchResultDto } from '../types';

/**
 * بازدیدهای اخیر پالت جستجو — فقط در مرورگر همین کاربر می‌ماند و به سرور نمی‌رود
 * (`[پیش‌فرض فنی]`؛ سند دربارهٔ حالت خالی W43 ساکت است).
 */

const KEY = 'projeyar.search.recent';
const MAX = 5;

export function readRecent(): RecentEntryDto[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RecentEntryDto[]).slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function pushRecent(result: SearchResultDto): void {
  if (result.kind === 'command') return;
  const entry: RecentEntryDto = {
    id: result.id,
    title: result.title,
    subtitle: result.subtitle,
    icon: result.icon,
    iconTone: result.iconTone,
    to: result.to,
  };
  try {
    const next = [entry, ...readRecent().filter((item) => item.id !== entry.id)].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // حافظهٔ مرورگر در دسترس نیست — بازدیدهای اخیر یک راحتی است، نه بخشی از جریان کار
  }
}

export function clearRecent(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // بی‌اثر
  }
}
