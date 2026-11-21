import { cn } from '@/shared/utils';
import { Badge } from './Badge';

// مطابق designs/Design System.html بخش tabs.
// دو نوع: underline و pill/segmented.

type TabsVariant = 'underline' | 'pill';

export interface TabItem {
  key: string;
  label: string;
  badge?: number; // عدد روی تب (مثل «گزارش‌ها ۳»)
  disabled?: boolean;
}

interface TabsProps {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  variant?: TabsVariant;
  className?: string;
}

export function Tabs({ items, activeKey, onChange, variant = 'underline', className }: TabsProps) {
  if (variant === 'pill') {
    return (
      <div className={cn('inline-flex p-1 bg-gray-100 rounded-md', className)}>
        {items.map((item) => (
          <button
            key={item.key}
            disabled={item.disabled}
            onClick={() => onChange(item.key)}
            className={cn(
              'px-3.5 py-1.5 text-[13px] rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed',
              activeKey === item.key
                ? 'bg-white text-gray-900 shadow font-semibold'
                : 'text-gray-500 hover:text-gray-900',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    );
  }

  // underline variant
  return (
    <div className={cn('border-b border-gray-200', className)}>
      <div className="flex gap-6 -mb-px">
        {items.map((item) => (
          <button
            key={item.key}
            disabled={item.disabled}
            onClick={() => onChange(item.key)}
            className={cn(
              'py-2.5 text-sm border-b-2 border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5',
              activeKey === item.key
                ? 'text-primary-700 border-primary-700 font-semibold'
                : 'text-gray-500 hover:text-gray-900',
            )}
          >
            {item.label}
            {item.badge !== undefined && item.badge > 0 && (
              <Badge variant="numeric" className={activeKey === item.key ? 'bg-primary-700' : 'bg-gray-300'}>
                {item.badge.toLocaleString('fa-IR')}
              </Badge>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
