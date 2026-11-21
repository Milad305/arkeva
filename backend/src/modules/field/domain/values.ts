import type { ItemMethod } from './field.entities.js';

// مقادیر یک آیتم بر اساس روش برگ (D03؛ approval-workflow.md ۳.۱؛ G10). تابع خالص؛ خطا پیام کاربر است.

export class InvalidValues extends Error {}

export interface LeafForEntry {
  readonly code: string;
  readonly title: string;
  readonly isLeaf: boolean;
  readonly isMilestone: boolean;
  readonly measurementMethod: string | null;
  readonly unit: string | null;
  readonly totalQuantity: number | null;
  readonly steps: readonly { readonly key: string; readonly title: string; readonly weight: number }[] | null;
}

export interface ValuesInput {
  readonly quantityToday?: number | null;
  readonly reportedPercent?: number | null;
  readonly reportedQuantityInfo?: number | null;
  readonly steps?: Readonly<Record<string, number>> | null;
}

export interface ItemValues {
  readonly method: ItemMethod;
  readonly quantityToday: number | null;
  readonly reportedPercent: number | null;
  readonly reportedQuantityInfo: number | null;
  readonly stepsProgress: Record<string, number> | null;
}

const decimals = (value: number, places: number) => Math.abs(value * 10 ** places - Math.round(value * 10 ** places)) < 1e-9;

/** روش برگ ← روش آیتم؛ برگ زمانی، والد و نقطهٔ عطف گزارش نمی‌گیرند. */
export function reportMethodOf(leaf: LeafForEntry): ItemMethod {
  if (!leaf.isLeaf) throw new InvalidValues(`«${leaf.title}» والد است؛ پیشرفت روی برگ‌ها ثبت می‌شود.`);
  if (leaf.isMilestone) throw new InvalidValues(`«${leaf.title}» نقطهٔ عطف است و گزارش پیشرفت نمی‌گیرد.`);
  if (leaf.measurementMethod === 'time_based') throw new InvalidValues(`«${leaf.title}» زمانی است و پیشرفتش از برنامه می‌آید؛ گزارش نمی‌گیرد (D03-الف).`);
  if (leaf.measurementMethod === 'quantity' || leaf.measurementMethod === 'percent' || leaf.measurementMethod === 'steps') return leaf.measurementMethod;
  throw new InvalidValues(`«${leaf.title}» روش اندازه‌گیری ندارد.`);
}

export function valuesFor(leaf: LeafForEntry, input: ValuesInput): ItemValues {
  const method = reportMethodOf(leaf);
  if (method === 'quantity') {
    const quantity = input.quantityToday;
    if (quantity === null || quantity === undefined || !Number.isFinite(quantity) || quantity < 0 || !decimals(quantity, 4)) {
      throw new InvalidValues(`مقدار امروز را به ${leaf.unit ?? 'واحد فعالیت'} بنویسید؛ عدد نامنفی با حداکثر چهار رقم اعشار.`);
    }
    return { method, quantityToday: quantity, reportedPercent: null, reportedQuantityInfo: null, stepsProgress: null };
  }
  if (method === 'percent') {
    const percent = input.reportedPercent;
    if (percent === null || percent === undefined || !Number.isFinite(percent) || percent < 0 || percent > 100 || !decimals(percent, 2)) {
      throw new InvalidValues('درصد تجمعی باید عددی از ۰ تا ۱۰۰ با حداکثر دو رقم اعشار باشد.');
    }
    const info = input.reportedQuantityInfo ?? null;
    if (info !== null && (!Number.isFinite(info) || info < 0)) throw new InvalidValues('مقدار اطلاعاتی باید عدد نامنفی باشد.');
    return { method, quantityToday: null, reportedPercent: percent, reportedQuantityInfo: info, stepsProgress: null };
  }
  const known = new Set((leaf.steps ?? []).map((step) => step.key));
  const steps: Record<string, number> = {};
  for (const [key, percent] of Object.entries(input.steps ?? {})) {
    if (!known.has(key)) throw new InvalidValues('یکی از گام‌ها در این فعالیت نیست؛ فرم را دوباره باز کنید.');
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) throw new InvalidValues('درصد هر گام باید از ۰ تا ۱۰۰ باشد.');
    steps[key] = percent;
  }
  if (Object.keys(steps).length === 0) throw new InvalidValues('دست‌کم پیشرفت یک گام را بنویسید.');
  return { method, quantityToday: null, reportedPercent: null, reportedQuantityInfo: null, stepsProgress: steps };
}
