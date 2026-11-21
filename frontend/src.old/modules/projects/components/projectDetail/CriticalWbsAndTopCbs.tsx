import { AlertTriangle, Wallet, ArrowLeft } from 'lucide-react';

import { toPersianDigits, formatFaNumber } from '@/shared/utils';
import { AVATAR_COLORS } from '../../services/projectHelpers';
import type { CriticalWbsItemDto, TopCbsItemDto } from '../../types';

// بازنویسی وفادار بر اساس designs/Project.html بخش .row-split.
// دو جدول کنار هم: «آیتم‌های بحرانی WBS» و «بیشترین مصرف CBS».

interface Props {
  criticalWbs: CriticalWbsItemDto[];
  topCbs: TopCbsItemDto[];
}

export function CriticalWbsAndTopCbs({ criticalWbs, topCbs }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-4 max-[1100px]:grid-cols-1">
      <CriticalWbsTable items={criticalWbs} />
      <TopCbsTable items={topCbs} />
    </div>
  );
}

// ────────── جدول آیتم‌های بحرانی WBS ──────────

function CriticalWbsTable({ items }: { items: CriticalWbsItemDto[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* head */}
      <div className="flex items-center justify-between px-[18px] py-3.5 border-b border-gray-100">
        <div>
          <h3 className="text-[14.5px] font-semibold m-0 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-error-500" />
            آیتم‌های بحرانی WBS
          </h3>
          <div className="text-xs text-gray-500 mt-0.5">
            {toPersianDigits(items.length)} فعالیت با بیشترین تأخیر نسبت به برنامه
          </div>
        </div>
        <a
          href="#"
          className="text-[12.5px] text-primary-700 font-medium inline-flex items-center gap-1 hover:underline"
        >
          <span>مشاهده همه</span>
          <ArrowLeft className="w-[13px] h-[13px] shrink-0" />
        </a>
      </div>

      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            <th className="text-right text-[11px] font-semibold text-gray-500 px-3.5 py-2 border-b border-gray-200 bg-gray-50 uppercase tracking-[0.04em] whitespace-nowrap w-20">
              کد
            </th>
            <th className="text-right text-[11px] font-semibold text-gray-500 px-3.5 py-2 border-b border-gray-200 bg-gray-50 uppercase tracking-[0.04em]">
              فعالیت
            </th>
            <th className="text-right text-[11px] font-semibold text-gray-500 px-3.5 py-2 border-b border-gray-200 bg-gray-50 uppercase tracking-[0.04em] whitespace-nowrap w-[90px] text-center">
              برنامه‌ای
            </th>
            <th className="text-right text-[11px] font-semibold text-gray-500 px-3.5 py-2 border-b border-gray-200 bg-gray-50 uppercase tracking-[0.04em] whitespace-nowrap w-[90px] text-center">
              واقعی
            </th>
            <th className="text-right text-[11px] font-semibold text-gray-500 px-3.5 py-2 border-b border-gray-200 bg-gray-50 uppercase tracking-[0.04em] whitespace-nowrap w-20">
              انحراف
            </th>
            <th className="text-right text-[11px] font-semibold text-gray-500 px-3.5 py-2 border-b border-gray-200 bg-gray-50 uppercase tracking-[0.04em] whitespace-nowrap w-[120px]">
              سرپرست
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => {
            const dev = row.actualProgress - row.plannedProgress;
            const col = dev <= -20 ? '#DC2626' : dev <= -10 ? '#D97706' : '#16A34A';
            const isDanger = dev <= -20;
            return (
              <tr
                key={row.id}
                className={`cursor-pointer transition-colors hover:bg-gray-50 ${isDanger ? 'hover:bg-error-50' : ''}`}
              >
                <td className="px-3.5 py-2.5 border-b border-gray-100">
                  <span className="mono text-[11px] text-gray-500">{toPersianDigits(row.code)}</span>
                </td>
                <td className="px-3.5 py-2.5 border-b border-gray-100">
                  <span className="font-medium text-gray-900">{row.name}</span>
                </td>
                <td className="px-3.5 py-2.5 border-b border-gray-100 text-center">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-gray-700 font-medium">{toPersianDigits(row.plannedProgress)}٪</span>
                    <MiniBar value={row.plannedProgress} color="#A1A1AA" />
                  </div>
                </td>
                <td className="px-3.5 py-2.5 border-b border-gray-100 text-center">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-gray-900 font-semibold">{toPersianDigits(row.actualProgress)}٪</span>
                    <MiniBar value={row.actualProgress} color={col} />
                  </div>
                </td>
                <td className="px-3.5 py-2.5 border-b border-gray-100">{DevBadge(dev)}</td>
                <td className="px-3.5 py-2.5 border-b border-gray-100">
                  <OwnerPill
                    initials={row.owner.initials}
                    fullName={row.owner.fullName}
                    colorKey={row.owner.avatarColor}
                  />
                </td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr>
              <td colSpan={6} className="px-3.5 py-8 text-center text-gray-500 text-sm">
                آیتم بحرانی وجود ندارد.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ────────── جدول CBS با بیشترین مصرف ──────────

function TopCbsTable({ items }: { items: TopCbsItemDto[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-[18px] py-3.5 border-b border-gray-100">
        <div>
          <h3 className="text-[14.5px] font-semibold m-0 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-accent-500" />
            بیشترین مصرف CBS
          </h3>
          <div className="text-xs text-gray-500 mt-0.5">
            {toPersianDigits(items.length)} آیتم هزینه با بالاترین درصد مصرف بودجه
          </div>
        </div>
        <a
          href="#"
          className="text-[12.5px] text-primary-700 font-medium inline-flex items-center gap-1 hover:underline"
        >
          <span>مشاهده همه</span>
          <ArrowLeft className="w-[13px] h-[13px] shrink-0" />
        </a>
      </div>

      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            <th className="text-right text-[11px] font-semibold text-gray-500 px-3.5 py-2 border-b border-gray-200 bg-gray-50 uppercase tracking-[0.04em] whitespace-nowrap w-20">
              کد
            </th>
            <th className="text-right text-[11px] font-semibold text-gray-500 px-3.5 py-2 border-b border-gray-200 bg-gray-50 uppercase tracking-[0.04em]">
              عنوان
            </th>
            <th className="text-right text-[11px] font-semibold text-gray-500 px-3.5 py-2 border-b border-gray-200 bg-gray-50 uppercase tracking-[0.04em] whitespace-nowrap w-[120px]">
              بودجه
            </th>
            <th className="text-right text-[11px] font-semibold text-gray-500 px-3.5 py-2 border-b border-gray-200 bg-gray-50 uppercase tracking-[0.04em] whitespace-nowrap w-[120px]">
              مصرف‌شده
            </th>
            <th className="text-right text-[11px] font-semibold text-gray-500 px-3.5 py-2 border-b border-gray-200 bg-gray-50 uppercase tracking-[0.04em] whitespace-nowrap w-20 text-left">
              درصد
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => {
            const pct = row.budget > 0 ? (row.used / row.budget) * 100 : 0;
            const danger = pct >= 90;
            const color = danger ? '#DC2626' : pct >= 75 ? '#D97706' : '#1A3354';
            return (
              <tr
                key={row.id}
                className={`cursor-pointer transition-colors hover:bg-gray-50 ${danger ? 'hover:bg-error-50' : ''}`}
              >
                <td className="px-3.5 py-2.5 border-b border-gray-100">
                  <span className="mono text-[11px] text-gray-500">{row.code}</span>
                </td>
                <td className="px-3.5 py-2.5 border-b border-gray-100">
                  <span className="font-medium text-gray-900">{row.name}</span>
                </td>
                <td className="px-3.5 py-2.5 border-b border-gray-100">
                  <span className="mono text-xs text-gray-700">{toPersianDigits(row.budget)} میلیارد</span>
                </td>
                <td className="px-3.5 py-2.5 border-b border-gray-100">
                  <span className="mono text-xs text-gray-900 font-semibold">
                    {toPersianDigits(row.used)} میلیارد
                  </span>
                </td>
                <td className="px-3.5 py-2.5 border-b border-gray-100 text-left">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="font-bold text-[13px]" style={{ color }}>
                      {formatFaNumber(pct, 1)}٪
                    </span>
                    <MiniBar value={pct} color={color} />
                  </div>
                </td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr>
              <td colSpan={5} className="px-3.5 py-8 text-center text-gray-500 text-sm">
                داده‌ای موجود نیست.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ────────── اجزای مشترک ──────────

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-20 h-1 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }} />
    </div>
  );
}

function DevBadge(dev: number): React.ReactNode {
  const fa = (n: number) => toPersianDigits(n);
  if (dev <= -20) {
    return (
      <span className="inline-flex items-center gap-[5px] h-6 px-[9px] rounded-sm text-xs font-medium leading-none" style={{ background: '#FEF2F2', color: '#B91C1C' }}>
        <AlertTriangle className="w-[11px] h-[11px] shrink-0" />
        <span>{fa(dev)}٪</span>
      </span>
    );
  }
  if (dev <= -10) {
    return (
      <span className="inline-flex items-center gap-[5px] h-6 px-[9px] rounded-sm text-xs font-medium leading-none" style={{ background: '#FFF8EB', color: '#B45309' }}>
        <AlertTriangle className="w-[11px] h-[11px] shrink-0" />
        <span>{fa(dev)}٪</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-[5px] h-6 px-[9px] rounded-sm text-xs font-medium leading-none" style={{ background: '#ECFDF3', color: '#15803D' }}>
      <span>{fa(dev)}٪</span>
    </span>
  );
}

function OwnerPill({
  initials,
  fullName,
  colorKey,
}: {
  initials: string;
  fullName: string;
  colorKey: CriticalWbsItemDto['owner']['avatarColor'];
}) {
  const c = AVATAR_COLORS[colorKey];
  return (
    <span className="inline-flex items-center gap-[5px]">
      <span
        className="w-[22px] h-[22px] rounded-full inline-flex items-center justify-center text-[10px] font-semibold shrink-0"
        style={{ background: c.bg, color: c.fg }}
      >
        {initials}
      </span>
      <span>{fullName}</span>
    </span>
  );
}
