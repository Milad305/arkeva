import type { IconName } from '@/shared/components/ui/Icon';
import type { Tone } from '@/shared/types/tone';
import type { NotificationDto, NotificationTab } from '../types';

// نمایش W06 — آیکن و رنگ از کد، گروه روز از زمان. متن را سرور ساخته است.

export const NOTIFICATION_TABS: Array<{ key: NotificationTab; label: string }> = [
  { key: 'all', label: 'همه' },
  { key: 'approvals', label: 'تأییدها' },
  { key: 'risks', label: 'ریسک‌ها' },
  { key: 'system', label: 'سیستم' },
];

export function visualOf(notification: Pick<NotificationDto, 'code' | 'severity'>): {
  icon: IconName;
  tone: Tone;
} {
  const { code, severity } = notification;
  if (code === 'NT-APR-01') return { icon: 'clipboard-check', tone: 'inf' };
  if (code === 'AL-APR-01') return { icon: 'clock', tone: 'wrn' };
  if (code === 'NT-FLD-01') return { icon: 'rotate-ccw', tone: 'wrn' };
  if (code === 'NT-FLD-02') return { icon: 'x', tone: 'err' };
  if (code.startsWith('NT-FLD')) return { icon: 'file-pen-line', tone: 'pri' };
  if (code.startsWith('NT-RSK') || code.startsWith('AL-RSK'))
    return { icon: 'shield-alert', tone: severity === 'critical' ? 'err' : 'wrn' };
  if (code.startsWith('AL-PRG'))
    return { icon: 'trending-down', tone: severity === 'critical' ? 'err' : 'wrn' };
  if (code.startsWith('AL-CST') || code.startsWith('NT-BUD'))
    return { icon: 'receipt', tone: 'acc' };
  if (code.startsWith('AL-INT')) return { icon: 'refresh-cw', tone: 'err' };
  if (code === 'NT-ASG-01') return { icon: 'user-check', tone: 'pri' };
  if (code === 'NT-PLN-01') return { icon: 'git-compare-arrows', tone: 'pri' };
  if (code === 'NT-RPT-01') return { icon: 'file-down', tone: 'neu' };
  if (code.startsWith('AL-'))
    return { icon: 'alert-triangle', tone: severity === 'critical' ? 'err' : 'wrn' };
  return { icon: 'bell', tone: 'neu' };
}

const DAY = 86_400_000;

/** «امروز»، «دیروز»، «این هفته»، «قدیمی‌تر» — روز تهران. */
export function dayGroup(instant: string): string {
  const key = (date: Date) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(date);
  const today = key(new Date());
  const day = key(new Date(instant));
  if (day === today) return 'امروز';
  if (day === key(new Date(Date.now() - DAY))) return 'دیروز';
  if (Date.now() - new Date(instant).getTime() < 7 * DAY) return 'این هفته';
  return 'قدیمی‌تر';
}

export function groupByDay(
  items: NotificationDto[],
): Array<{ label: string; items: NotificationDto[] }> {
  const groups: Array<{ label: string; items: NotificationDto[] }> = [];
  for (const item of items) {
    const label = dayGroup(item.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}
