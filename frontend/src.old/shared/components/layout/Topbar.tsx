import { useState } from 'react';
import { Bell, Search, Wifi, HelpCircle } from 'lucide-react';

import { cn } from '@/shared/utils';
import { Tooltip } from '@/shared/components/ui/Tooltip';

// مطابق designs/Projects.html topbar.
// topbar شامل: عنوان صفحه (سمت راست)، جستجوی سراسری وسط (Ctrl+K)، آیکن‌های نوتیفیکیشن، آواتار.

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 h-14 flex items-center justify-between gap-4 px-6">
      {/* عنوان صفحه (سمت راست در RTL) */}
      <div className="min-w-0">
        <h1 className="text-lg font-bold text-gray-900 truncate">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
      </div>

      {/* جستجوی سراسری وسط */}
      <div className="flex-1 max-w-md">
        <button
          onClick={() => setSearchOpen(true)}
          className={cn(
            'w-full flex items-center gap-2 px-3 h-9 rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-500 hover:bg-gray-100 transition-colors',
          )}
        >
          <Search className="w-4 h-4 text-gray-400" />
          <span className="flex-1 text-right">جستجو در پروژه‌ها، WBS، گزارش‌ها...</span>
          <kbd className="mono text-[11px] bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-500">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* آیکن‌های اکشن (سمت چپ) */}
      <div className="flex items-center gap-1">
        <Tooltip content="وضعیت اتصال">
          <button className="w-9 h-9 inline-flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 transition-colors">
            <Wifi className="w-[18px] h-[18px]" />
          </button>
        </Tooltip>

        <Tooltip content="راهنما">
          <button className="w-9 h-9 inline-flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 transition-colors">
            <HelpCircle className="w-[18px] h-[18px]" />
          </button>
        </Tooltip>

        <Tooltip content="اعلان‌ها">
          <button className="relative w-9 h-9 inline-flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 transition-colors">
            <Bell className="w-[18px] h-[18px]" />
            <span className="absolute top-1.5 left-2 w-2 h-2 rounded-full bg-accent-500" />
          </button>
        </Tooltip>
      </div>

      {/* TODO: Quick Switcher (Ctrl+K) modal در فاز بعد */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 bg-gray-900/40 flex items-start justify-center pt-20"
          onClick={() => setSearchOpen(false)}
        >
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-xl overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center gap-3">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                autoFocus
                placeholder="جستجوی سراسری..."
                className="flex-1 outline-none text-sm bg-transparent"
              />
              <kbd className="mono text-[11px] text-gray-400">ESC</kbd>
            </div>
            <div className="p-4 text-sm text-gray-500">
              جستجوی سراسری در فاز بعد پیاده‌سازی می‌شود.
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
