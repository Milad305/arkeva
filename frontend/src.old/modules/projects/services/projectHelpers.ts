// منطق کسب‌وکار پروژه — جدا از UI (مطابق frontend-react.md بخش ۱۲.۴).
// تمام محاسبات اینجا، نه در کامپوننت.

import type { ProjectStatus, ProjectType, AvatarColorKey } from '../types';

// ────────── Status styling (مطابق designs/Projects.html statusMap) ──────────

export interface StatusStyle {
  label: string;
  bg: string;
  fg: string;
  dot: string;
}

export const PROJECT_STATUS_STYLE: Record<ProjectStatus, StatusStyle> = {
  active: {
    label: 'فعال',
    bg: '#ECFDF3',
    fg: '#15803D',
    dot: '#16A34A',
  },
  completed: {
    label: 'تمام‌شده',
    bg: '#E5EBF3',
    fg: '#1A3354',
    dot: '#2C4A73',
  },
  draft: {
    label: 'پیش‌نویس',
    bg: '#F4F4F5',
    fg: '#52525B',
    dot: '#A1A1AA',
  },
  critical: {
    label: 'در خطر',
    bg: '#FEF2F2',
    fg: '#B91C1C',
    dot: '#DC2626',
  },
  paused: {
    label: 'متوقف',
    bg: '#FFF8EB',
    fg: '#B45309',
    dot: '#D97706',
  },
};

// ────────── Deviation badge (مطابق designs/Projects.html deviationBadge) ──────────

export type DeviationSeverity = 'positive' | 'ok' | 'warning' | 'critical' | 'neutral';

export interface DeviationBadgeStyle {
  severity: DeviationSeverity;
  bg: string;
  fg: string;
  label: string; // مثلاً «+۵٪ جلو» یا «-۱۲٪ بحرانی» یا «به‌موقع» یا «—»
}

export function getDeviationBadge(
  deviation: number,
  status: ProjectStatus,
): DeviationBadgeStyle {
  const fa = (n: number | string) =>
    String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]!);

  if (status === 'draft') {
    return { severity: 'neutral', bg: '#F4F4F5', fg: '#71717A', label: '—' };
  }
  if (status === 'completed') {
    return { severity: 'ok', bg: '#ECFDF3', fg: '#15803D', label: 'به‌موقع' };
  }
  if (deviation > 0) {
    return {
      severity: 'positive',
      bg: '#ECFDF3',
      fg: '#15803D',
      label: `+${fa(deviation)}٪ جلو`,
    };
  }
  if (deviation >= -5) {
    return { severity: 'ok', bg: '#ECFDF3', fg: '#15803D', label: `${fa(deviation)}٪` };
  }
  if (deviation >= -10) {
    return {
      severity: 'warning',
      bg: '#FFF8EB',
      fg: '#B45309',
      label: `${fa(deviation)}٪`,
    };
  }
  return {
    severity: 'critical',
    bg: '#FEF2F2',
    fg: '#B91C1C',
    label: `${fa(deviation)}٪ بحرانی`,
  };
}

// ────────── Progress bar color (مطابق designs/Projects.html progressColor) ──────────

export function getProgressColor(deviation: number, status: ProjectStatus): string {
  if (status === 'completed') return '#2C4A73';
  if (status === 'draft') return '#D4D4D8';
  if (deviation > 0 || deviation >= -5) return '#16A34A';
  if (deviation >= -10) return '#D97706';
  return '#DC2626';
}

// ────────── Avatar color (مطابق designs/Projects.html avatarColors map) ──────────

export interface AvatarColorStyle {
  bg: string;
  fg: string;
}

export const AVATAR_COLORS: Record<AvatarColorKey, AvatarColorStyle> = {
  primary: { bg: '#E5EBF3', fg: '#1A3354' },
  accent: { bg: '#FCEAD9', fg: '#B45813' },
  success: { bg: '#ECFDF3', fg: '#15803D' },
  warning: { bg: '#FFF8EB', fg: '#B45309' },
  info: { bg: '#EFF6FF', fg: '#1D4ED8' },
  gray: { bg: '#E4E4E7', fg: '#3F3F46' },
};

// ────────── Type labels ──────────

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  building: 'ساختمان مسکونی',
  commercial: 'ساختمان تجاری',
  industrial: 'ساختمان صنعتی',
  road: 'راه',
  tunnel: 'تونل',
  hospital: 'بیمارستان',
  energy: 'نیروگاه',
  parking: 'پارکینگ طبقاتی',
  heritage: 'بازسازی میراث',
};

// رنگ تينت (tint) برای thumbnail/banner — مطابق designs tint field
export const PROJECT_TYPE_TINT: Record<ProjectType, string> = {
  building: '#1A3354',
  commercial: '#1D4ED8',
  industrial: '#3F3F46',
  road: '#2C4A73',
  tunnel: '#3F3F46',
  hospital: '#B45813',
  energy: '#D97706',
  parking: '#15803D',
  heritage: '#52525B',
};
