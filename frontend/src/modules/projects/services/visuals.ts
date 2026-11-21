import type { IconName } from '@/shared/components/ui/Icon';
import type { EntityId } from '@/shared/types/api';

/**
 * ظاهر کاشی پروژه وقتی تصویر ندارد — رنگ و آیکن بر اساس نوع پروژه.
 *
 * این نمایشی است، نه داده‌ی دامنه: `ProjectType` در سند فقط `name` و `active` دارد
 * (F02 ۴). مقادیر از آرت‌بوردهای W07 و W08 گرفته شده‌اند.
 */
export interface ProjectVisual {
  icon: IconName;
  tint: string;
}

const VISUALS: Record<string, ProjectVisual> = {
  residential: { icon: 'building-2', tint: '#1A3354' },
  road_bridge: { icon: 'milestone', tint: '#15803D' },
  tunnel: { icon: 'mountain', tint: '#3F3F46' },
  healthcare: { icon: 'cross', tint: '#B45813' },
  energy: { icon: 'sun', tint: '#D97706' },
  parking: { icon: 'car', tint: '#15803D' },
  heritage: { icon: 'landmark', tint: '#52525B' },
  commercial: { icon: 'store', tint: '#1D4ED8' },
};

const FALLBACK: ProjectVisual = { icon: 'building-2', tint: '#1A3354' };

export function projectVisual(projectTypeId: EntityId): ProjectVisual {
  return VISUALS[projectTypeId] ?? FALLBACK;
}
