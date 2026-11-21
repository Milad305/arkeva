import { SYSTEM_ROLES, SYSTEM_ROLE_TONES, type SystemRole } from '@/config/constants';
import type { IconName } from '@/shared/components/ui/Icon';
import { formatRelativeTime } from '@/shared/utils/date';
import type { Tone } from '@/shared/types/tone';
import type { AppStatus, AssignableRole } from '../types';

// نمایش W16، W17 و W42 — فقط برچسب و رنگ؛ داده از سرور.

/** نقش‌های قابل انتخاب در W42 — مدیر پروژه نه (تصمیم 1405/08/15). */
export const ASSIGNABLE_ROLES: Array<{ role: AssignableRole; description: string; color: string }> =
  [
    { role: 'supervisor', description: 'ثبت گزارش از اندروید', color: '#16A34A' },
    { role: 'reviewer', description: 'بازبینی و تأیید گزارش‌ها', color: '#2563EB' },
    { role: 'planner', description: 'ویرایش WBS، CBS و MSP', color: '#1A3354' },
    { role: 'client_reviewer', description: 'دیدن پیشرفت بدون مبالغ', color: '#0E7490' },
    { role: 'finance', description: 'دفتر هزینه و مبالغ', color: '#B45309' },
  ];

export const roleLabel = (role: SystemRole) => SYSTEM_ROLES[role];
export const roleTone = (role: SystemRole): Tone => SYSTEM_ROLE_TONES[role];

/** ستون «اپ اندروید» (team-assignment.md ۸، F08). */
export function appStatusView(app: AppStatus): { icon: IconName; text: string; className: string } {
  switch (app.kind) {
    case 'web':
      return { icon: 'monitor', text: 'وب', className: 'tx6' };
    case 'synced':
      return {
        icon: 'refresh-cw',
        text: `همگام · ${formatRelativeTime(app.at)}`,
        className: Date.now() - new Date(app.at).getTime() < 2 * 3_600_000 ? 'tx-ok' : 'tx6',
      };
    case 'offline':
      return {
        icon: 'cloud-off',
        text: `آفلاین · ${app.queued.toLocaleString('fa-IR')} گزارش در صف`,
        className: 'tx-wrn',
      };
    case 'outdated':
      return { icon: 'alert-triangle', text: 'نسخهٔ قدیمی اپ', className: 'tx-wrn' };
    case 'not_installed':
      return { icon: 'smartphone', text: 'نصب نشده', className: 'tx5' };
  }
}
