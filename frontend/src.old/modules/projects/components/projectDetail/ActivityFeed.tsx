import {
  History,
  Filter,
  Clock,
  Dot,
  Clipboard,
  Check,
  AlertTriangle,
  UserPlus,
  Upload,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

import { formatRelativeTime } from '@/shared/utils';
import type { ActivityFeedItemDto, ActivityFeedKind } from '../../types';

// بازنویسی وفادار بر اساس designs/Project.html بخش .feed / .feed-item.

interface Props {
  items: ActivityFeedItemDto[];
}

const KIND_DOT_STYLE: Record<ActivityFeedKind, { border: string; bg: string; fg: string }> = {
  success: { border: '#16A34A', bg: '#ECFDF3', fg: '#15803D' },
  info: { border: '#2563EB', bg: '#EFF6FF', fg: '#1D4ED8' },
  warn: { border: '#D97706', bg: '#FFF8EB', fg: '#B45309' },
  error: { border: '#DC2626', bg: '#FEF2F2', fg: '#B91C1C' },
  primary: { border: '#2C4A73', bg: '#E5EBF3', fg: '#1A3354' },
};

// نقشه‌ی نام آیکن Lucide → کامپوننت آیکن.
// آیکن‌های مورد استفاده در feed طرح (همگی موجود در lucide-react).
const ICONS: Record<string, LucideIcon> = {
  clipboard: Clipboard,
  check: Check,
  'alert-triangle': AlertTriangle,
  'user-plus': UserPlus,
  upload: Upload,
  'x-circle': XCircle,
};

export function ActivityFeed({ items }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* head */}
      <div className="flex items-center justify-between px-[18px] py-3.5 border-b border-gray-100">
        <div>
          <h3 className="text-[14.5px] font-semibold m-0 flex items-center gap-2">
            <History className="w-4 h-4 text-gray-500" />
            فعالیت‌های اخیر
          </h3>
          <div className="text-xs text-gray-500 mt-0.5">آخرین رویدادهای پروژه — به‌روزرسانی زنده</div>
        </div>
        <div className="flex items-center gap-1.5">
          <button className="inline-flex items-center gap-1.5 h-[30px] px-2.5 text-xs rounded-md text-gray-700 hover:bg-gray-100 transition-colors">
            <Filter className="w-[13px] h-[13px] shrink-0" />
            <span>همه فعالیت‌ها</span>
          </button>
          <button className="inline-flex items-center gap-1.5 h-[30px] px-2.5 text-xs rounded-md text-primary-700 hover:bg-gray-100 transition-colors">
            مشاهده تاریخچهٔ کامل
          </button>
        </div>
      </div>

      {/* feed body */}
      <div className="relative px-2 pt-1 pr-4.5">
        {/* خط عمودی timeline — مطابق .feed::before (right:28px) */}
        <span
          className="absolute top-2 bottom-2 w-[2px] bg-gray-100 rounded-[1px]"
          style={{ right: '28px' }}
        />

        {items.map((item) => {
          const kindStyle = KIND_DOT_STYLE[item.kind];
          const Icon = ICONS[item.iconName] ?? History;
          return (
            <div key={item.id} className="relative pt-3 pr-7 pb-3 flex gap-3.5">
              {/* dot — مطابق .feed-dot (right:19px, top:18px) */}
              <span
                className="absolute w-5 h-5 rounded-full bg-white border-2 inline-flex items-center justify-center z-[1]"
                style={{ right: '19px', top: '18px', borderColor: kindStyle.border, background: kindStyle.bg, color: kindStyle.fg }}
              >
                <Icon className="w-[11px] h-[11px]" />
              </span>

              {/* content */}
              <div className="flex-1 pr-7">
                {/* عنوان — با پشتیبانی از strong و pill */}
                <div className="text-[13.5px] text-gray-800 leading-[1.7]">
                  {item.titleParts.map((part, idx) => {
                    if (part.kind === 'strong') {
                      return (
                        <strong key={idx} className="font-semibold text-gray-900">
                          {part.value}
                        </strong>
                      );
                    }
                    if (part.kind === 'pill') {
                      return (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[11px] bg-gray-100 text-gray-700 font-medium mx-0.5"
                        >
                          {part.value}
                        </span>
                      );
                    }
                    return <span key={idx}>{part.value}</span>;
                  })}
                </div>

                {/* meta */}
                {item.meta && (
                  <div className="text-[11.5px] text-gray-500 mt-1 inline-flex items-center gap-1">
                    <Dot className="w-[13px] h-[13px]" />
                    {item.meta}
                  </div>
                )}

                {/* time */}
                <div className="text-[11.5px] text-gray-500 mt-1 inline-flex items-center gap-1">
                  <Clock className="w-[11px] h-[11px]" style={{ display: 'inline', verticalAlign: '-1px' }} />
                  {formatRelativeTime(item.createdAt)}
                </div>
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">فعالیتی ثبت نشده است.</div>
        )}
      </div>
    </div>
  );
}
