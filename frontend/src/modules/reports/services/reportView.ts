import type { Tone } from '@/shared/types/tone';
import { formatJalaliDate, formatTime } from '@/shared/utils/date';
import { formatPercentAuto, toFaDigits } from '@/shared/utils/num';
import type { Photo } from '@/shared/components/ui/PhotoThumb';
import type { FieldItemDto, FieldPhotoDto, InboxTab, ReviewDecision } from '../types';

// نمایش F09 — فقط برچسب، رنگ و قالب. عددها و پرچم‌ها از سرور است (D07).

export const INBOX_TABS: Array<{ key: InboxTab; label: string; tone?: 'w' | 'e' }> = [
  { key: 'pending', label: 'در انتظار' },
  { key: 'approved', label: 'تأییدشده' },
  { key: 'needs_revision', label: 'نیاز اصلاح', tone: 'w' },
  { key: 'rejected', label: 'رد شده', tone: 'e' },
  { key: 'all', label: 'همه' },
];

export const DECISION_LABEL: Record<ReviewDecision, string> = {
  approve: 'تأیید کرد',
  request_revision: 'درخواست اصلاح داد',
  reject: 'رد کرد',
  auto_approve: 'تأیید خودکار',
  revoke_auto: 'تأیید خودکار را برگرداند',
  escalate: 'مهلت گذشت و ارجاع شد',
  resolve_assignment: 'تعیین تکلیف کرد',
};

export const signedPercent = (value: number) =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatPercentAuto(Math.abs(value))}`;

/** رنگ تغییر: کاهش و جهش هشدار، بقیه سبز. */
export function deltaTone(item: Pick<FieldItemDto, 'deltaPercent' | 'flags'>): Tone {
  if (item.flags.includes('abnormal_jump') || item.flags.includes('decrease')) return 'wrn';
  return item.deltaPercent < 0 ? 'wrn' : 'ok';
}

/** «۴۹ از ۹۸۰ مترمکعب» یا «۱۳۰ مترمکعب». */
export function quantityText(item: FieldItemDto): string | null {
  const qty = item.quantityToday ?? item.reportedQuantityInfo;
  if (qty == null || !item.unit) return null;
  const amount = toFaDigits(String(Math.round(qty * 100) / 100)).replace('.', '٫');
  return item.totalQuantity
    ? `${amount} از ${toFaDigits(item.totalQuantity.toLocaleString('en-US')).replace(/,/g, '٬')} ${item.unit}`
    : `${amount} ${item.unit}`;
}

export function toPhotos(photos: FieldPhotoDto[]): Photo[] {
  return photos.map((photo) => ({
    id: photo.id,
    alt: photo.caption ?? 'عکس گزارش',
    tag: `${formatTime(photo.takenAt)}${photo.distanceM != null ? ` · ${toFaDigits(photo.distanceM)}م` : ''}`,
  }));
}

/** «گزارش روزانهٔ علی محمدی — ۱۴۰۴/۰۳/۳۱» */
export const reportTitle = (author: string, workDate: string, manual: boolean) =>
  `${manual ? 'ثبت دستی' : 'گزارش روزانهٔ'} ${author} — ${formatJalaliDate(workDate)}`;

export const STATUS_HINT: Partial<Record<FieldItemDto['status'], string>> = {
  stage1: 'در انتظار تأیید ناظر',
  stage2: 'در انتظار تأیید نهایی مدیر پروژه',
};
