import type { ReactNode } from 'react';
import { Construction } from 'lucide-react';

import { EmptyState } from '@/shared/components/ui';

// صفحه جای‌نگهدار برای routeهایی که هنوز صفحه واقعی نساخته‌ایم.
// وقتی هر صفحه را پیاده‌سازی کنیم، این را با صفحه واقعی جایگزین می‌کنیم.

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps): ReactNode {
  return (
    <div className="p-8">
      <EmptyState
        icon={<Construction className="w-7 h-7 text-gray-400" />}
        title={title}
        description={
          description ??
          'این صفحه هنوز پیاده‌سازی نشده است. زیرساخت پروژه آماده است و این صفحه به‌زودی ساخته می‌شود.'
        }
      />
    </div>
  );
}
