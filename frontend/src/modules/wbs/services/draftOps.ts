import { LEAF_MEASUREMENT_METHODS } from '@/config/constants';
import { formatJalaliDate } from '@/shared/utils/date';
import { formatPercentAuto, toFaDigits } from '@/shared/utils/num';
import type { EntityId } from '@/shared/types/api';
import type { DraftFields, WbsOp, WeightGenerator } from '../types/draft';

// فهرست عملیات ذخیره‌نشدهٔ W12 — فقط نگه‌داری و توصیف؛ اجرا و هر عدد حاصل در سرور است.

export function newTempId(): EntityId {
  return `tmp-${crypto.randomUUID().slice(0, 8)}`;
}

/** ویرایش پشت‌سرهم یک آیتم یک عمل بماند تا واگرد معنادار باشد و فهرست کوتاه. */
export function pushOp(ops: WbsOp[], op: WbsOp): WbsOp[] {
  const last = ops[ops.length - 1];
  if (op.type === 'update' && last?.type === 'update' && last.id === op.id) {
    const sameFields = Object.keys(op.fields).every((key) => key in last.fields);
    if (sameFields)
      return [...ops.slice(0, -1), { ...last, fields: { ...last.fields, ...op.fields } }];
  }
  return [...ops, op];
}

export const GENERATOR_LABELS: Record<WeightGenerator, string> = {
  equal: 'مساوی',
  duration: 'از مدت (روز کاری)',
  cost: 'از هزینه (BAC)',
};

const FIELD_TEXT: Partial<Record<keyof DraftFields, string>> = {
  title: 'عنوان',
  code: 'کد',
  weightInParent: 'وزن',
  unit: 'واحد',
  totalQuantity: 'مقدار کل',
  plannedStart: 'شروع',
  plannedFinish: 'پایان',
  measurementMethod: 'روش',
  isMilestone: 'نقطهٔ عطف',
};

function fieldValue(key: keyof DraftFields, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (key === 'weightInParent') return formatPercentAuto(Number(value), 2);
  if (key === 'plannedStart' || key === 'plannedFinish') return formatJalaliDate(String(value));
  if (key === 'measurementMethod')
    return (
      LEAF_MEASUREMENT_METHODS[value as keyof typeof LEAF_MEASUREMENT_METHODS] ?? String(value)
    );
  if (key === 'isMilestone') return value ? 'بله' : 'خیر';
  if (typeof value === 'number') return toFaDigits(value);
  return String(value);
}

export type OpIconName =
  | 'plus'
  | 'percent'
  | 'move'
  | 'trash-2'
  | 'pencil'
  | 'split'
  | 'sliders-horizontal'
  | 'list-checks';

/** متن «تغییرات این نشست» (بوم W12). */
export function describeOp(
  op: WbsOp,
  nameOf: (id: EntityId | null) => string,
): { icon: OpIconName; tone: 'ok' | 'wrn' | 'pri' | 'err'; text: string } {
  switch (op.type) {
    case 'add':
      return {
        icon: 'plus',
        tone: 'ok',
        text: `آیتم تازهٔ «${op.fields.title}» زیر «${nameOf(op.parentId)}»`,
      };
    case 'update': {
      const entries = Object.entries(op.fields) as Array<[keyof DraftFields, unknown]>;
      const text = entries
        .map(([key, value]) => `${FIELD_TEXT[key] ?? key} ← ${fieldValue(key, value)}`)
        .join('، ');
      const onlyWeight = entries.length === 1 && entries[0]![0] === 'weightInParent';
      return {
        icon: onlyWeight ? 'percent' : 'pencil',
        tone: 'wrn',
        text: `«${nameOf(op.id)}»: ${text}`,
      };
    }
    case 'move':
      return {
        icon: 'move',
        tone: 'pri',
        text: `جابه‌جایی «${nameOf(op.id)}» زیر «${nameOf(op.parentId)}»`,
      };
    case 'indent':
      return { icon: 'move', tone: 'pri', text: `تورفتگی «${nameOf(op.id)}»` };
    case 'outdent':
      return { icon: 'move', tone: 'pri', text: `برگرداندن تورفتگی «${nameOf(op.id)}»` };
    case 'remove':
      return { icon: 'trash-2', tone: 'err', text: `حذف «${nameOf(op.id)}»` };
    case 'split':
      return {
        icon: 'split',
        tone: 'pri',
        text: `تقسیم «${nameOf(op.id)}» به ${toFaDigits(op.parts.length + 1)} بخش`,
      };
    case 'autoDistribute':
      return {
        icon: 'sliders-horizontal',
        tone: 'wrn',
        text: `پخش خودکار وزن فرزندان «${nameOf(op.parentId)}»`,
      };
    case 'generateWeights':
      return {
        icon: 'sliders-horizontal',
        tone: 'wrn',
        text: `مولد وزن «${GENERATOR_LABELS[op.generator]}» روی ${op.scope === 'tree' ? 'کل درخت' : `«${nameOf(op.scope)}»`}`,
      };
    case 'setSteps':
      return {
        icon: 'list-checks',
        tone: 'wrn',
        text: `گام‌های «${nameOf(op.id)}» (${toFaDigits(op.steps.length)} گام)`,
      };
  }
}
