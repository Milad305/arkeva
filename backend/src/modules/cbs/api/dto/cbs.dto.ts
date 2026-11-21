import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateNested } from 'class-validator';
import { ValidationFailedError } from '../../../../platform/http/errors.js';
import { COST_TYPES, type CostType, PRICING_MODES, type PricingModeCode } from '../../../planning/index.js';
import { REVISION_FIELDS, REVISION_STATUSES, type RevisionField, type RevisionStatus } from '../../domain/budget-revision.entity.js';
import type { CbsOp, PricingInput } from '../../domain/cbs-ops.js';
import type { LinkOp } from '../../domain/link-ops.js';

// قرارداد W14، حالت ویرایش CBS و W15 — همان `frontend/src/modules/{cbs,links}/types`.

export class CbsOpsRequestDto {
  @ApiProperty({ description: 'قفل خوش‌بینانهٔ نسخهٔ کاری (F04 ۳)' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  readonly draftRevision!: number;

  @ApiProperty({ type: 'array', items: { type: 'object', additionalProperties: true }, description: 'cbs.md ۱۴؛ حداکثر ۵۰۰ عمل' })
  @IsArray()
  @ArrayMaxSize(500, { message: 'هر ذخیره حداکثر ۵۰۰ تغییر دارد؛ ذخیره را چند بخش کنید.' })
  readonly ops!: unknown[];
}

export class CbsImportFormDto {
  @ApiProperty({ enum: ['replace', 'append'] }) @IsIn(['replace', 'append']) readonly mode!: 'replace' | 'append';
  @ApiProperty() @Type(() => Number) @IsInt() @Min(0) readonly draftRevision!: number;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() readonly parentId?: string;
}

export class LinkImportFormDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Min(0) readonly draftRevision!: number;
}

export class RevisionListQueryDto {
  @ApiPropertyOptional({ enum: REVISION_STATUSES }) @IsOptional() @IsIn(REVISION_STATUSES) readonly status?: RevisionStatus;
}

export class RevisionChangeDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() readonly cbsItemId!: string;
  @ApiProperty({ enum: REVISION_FIELDS }) @IsIn(REVISION_FIELDS) readonly field!: RevisionField;
  @ApiPropertyOptional({ description: 'نمایشی؛ مقدار فعلی را سرور می‌گذارد' }) @IsOptional() @IsString() @MaxLength(40) readonly from?: string;
  @ApiProperty() @IsString() @MaxLength(40) readonly to!: string;
}

export class CreateRevisionDto {
  @ApiProperty({ description: 'دست‌کم ۵ نویسه' }) @IsString() @MaxLength(2000) readonly reason!: string;
  @ApiProperty({ type: [RevisionChangeDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => RevisionChangeDto)
  readonly changes!: RevisionChangeDto[];
}

export class DecideRevisionDto {
  @ApiPropertyOptional({ description: 'برای رد اجباری (دست‌کم ۳ نویسه)' }) @IsOptional() @IsString() @MaxLength(2000) readonly note?: string;
}

type Raw = Record<string, unknown>;

/** اعتبارسنجی شکل عملیات CBS (اتحاد برچسب‌دار). معنای دامنه با موتور عملیات. */
export function parseCbsOps(raw: readonly unknown[]): CbsOp[] {
  return raw.map((value, index) => {
    const { fail, reqId, optId, text, nullableText } = reader(`ops[${index}]`, value);
    const op = value as Raw;
    const costType = (field: unknown): CostType => (COST_TYPES.includes(field as CostType) ? (field as CostType) : fail('نوع هزینه نامعتبر است.'));
    const pricing = (input: Raw, required: boolean): PricingInput => {
      const mode = input['pricing'];
      if (mode === undefined && !required) return {};
      if (!PRICING_MODES.includes(mode as PricingModeCode)) return fail('شیوهٔ قیمت نامعتبر است.');
      const out: { -readonly [K in keyof PricingInput]: PricingInput[K] } = { pricing: mode as PricingModeCode };
      if (input['unit'] !== undefined) out.unit = nullableText(input['unit'], 40);
      if (input['rate'] !== undefined) out.rate = amount(input['rate']);
      if (input['lump'] !== undefined) out.lump = amount(input['lump']);
      if (input['qty'] !== undefined) {
        const qty = input['qty'];
        if (qty !== null && (typeof qty !== 'number' || !Number.isFinite(qty)) && typeof qty !== 'string') return fail('مقدار نامعتبر است.');
        out.qty = qty;
      }
      return out;
    };
    const amount = (field: unknown): string | null => {
      if (field === null) return null;
      if (typeof field === 'number' && Number.isSafeInteger(field)) return String(field);
      return typeof field === 'string' && field.length <= 30 ? field : fail('مبلغ نامعتبر است.');
    };
    switch (op['type']) {
      case 'add': {
        const item = (op['item'] ?? {}) as Raw;
        return {
          type: 'add',
          tempId: reqId('tempId'),
          parentId: optId('parentId'),
          afterId: optId('afterId'),
          item: {
            title: text(item['title'] ?? ''),
            ...(item['code'] !== undefined ? { code: text(item['code'], 60) } : {}),
            costType: costType(item['costType']),
            ...(item['supplier'] !== undefined ? { supplier: nullableText(item['supplier'], 300) } : {}),
            ...pricing(item, false),
          },
        };
      }
      case 'update': {
        const patch = (op['patch'] ?? {}) as Raw;
        return {
          type: 'update',
          id: reqId('id'),
          patch: {
            ...(patch['title'] !== undefined ? { title: text(patch['title']) } : {}),
            ...(patch['code'] !== undefined ? { code: text(patch['code'], 60) } : {}),
            ...(patch['costType'] !== undefined ? { costType: costType(patch['costType']) } : {}),
            ...(patch['unit'] !== undefined ? { unit: nullableText(patch['unit'], 40) } : {}),
            ...(patch['supplier'] !== undefined ? { supplier: nullableText(patch['supplier'], 300) } : {}),
          },
        };
      }
      case 'setPricing': {
        const input = pricing(op, true);
        return { type: 'setPricing', id: reqId('id'), ...input, pricing: input.pricing as PricingModeCode };
      }
      case 'move': {
        const position = op['index'];
        if (typeof position !== 'number' || !Number.isInteger(position) || position < 0) return fail('جایگاه نامعتبر است.');
        return { type: 'move', id: reqId('id'), parentId: optId('parentId'), index: position };
      }
      case 'remove':
      case 'close':
        return { type: op['type'], id: reqId('id') };
      case 'split': {
        const parts = op['parts'];
        if (!Array.isArray(parts) || parts.length > 20) return fail('بخش‌های تقسیم نامعتبرند.');
        return {
          type: 'split',
          id: reqId('id'),
          parentTempId: reqId('parentTempId'),
          parentTitle: text(op['parentTitle'] ?? ''),
          parts: parts.map((part: unknown) => {
            const p = (part ?? {}) as Raw;
            if (typeof p['tempId'] !== 'string' || !p['tempId'] || p['tempId'].length > 100) return fail('شناسهٔ بخش تقسیم نامعتبر است.');
            return { tempId: p['tempId'], title: text(p['title'] ?? ''), ...pricing(p, false) };
          }),
        };
      }
      default:
        return fail('نوع عمل شناخته نیست.');
    }
  });
}

/** اعتبارسنجی شکل عملیات اتصال W15. */
export function parseLinkOps(raw: readonly unknown[]): LinkOp[] {
  return raw.map((value, index) => {
    const { fail, reqId } = reader(`ops[${index}]`, value);
    const op = value as Raw;
    const quantity = (field: unknown): number | string | null => {
      if (field === null || field === undefined) return null;
      if ((typeof field === 'number' && Number.isFinite(field)) || (typeof field === 'string' && field.length <= 30)) return field;
      return fail('مقدار نامعتبر است.');
    };
    const amount = (field: unknown): string | null => {
      if (field === null || field === undefined) return null;
      if (typeof field === 'number' && Number.isSafeInteger(field)) return String(field);
      return typeof field === 'string' && field.length <= 30 ? field : fail('مبلغ نامعتبر است.');
    };
    switch (op['type']) {
      case 'link':
        return { type: 'link', wbsItemId: reqId('wbsItemId'), cbsItemId: reqId('cbsItemId'), quantity: quantity(op['quantity']), amount: amount(op['amount']) };
      case 'unlink':
        return { type: 'unlink', wbsItemId: reqId('wbsItemId'), cbsItemId: reqId('cbsItemId') };
      case 'setQuantity':
        return {
          type: 'setQuantity',
          wbsItemId: reqId('wbsItemId'),
          cbsItemId: reqId('cbsItemId'),
          quantity: quantity(op['quantity']) ?? fail('مقدار لازم است.'),
        };
      case 'setAmount':
        return { type: 'setAmount', wbsItemId: reqId('wbsItemId'), cbsItemId: reqId('cbsItemId'), amount: amount(op['amount']) ?? fail('مبلغ لازم است.') };
      case 'copy': {
        const targets = op['toWbsItemIds'];
        if (!Array.isArray(targets) || targets.length === 0 || targets.length > 500 || targets.some((id) => typeof id !== 'string' || !id))
          return fail('فعالیت‌های مقصد نامعتبرند.');
        return { type: 'copy', fromWbsItemId: reqId('fromWbsItemId'), toWbsItemIds: targets as string[] };
      }
      default:
        return fail('نوع عمل شناخته نیست.');
    }
  });
}

function reader(field: string, value: unknown) {
  const fail = (message: string): never => {
    throw new ValidationFailedError([{ field, message }]);
  };
  if (!value || typeof value !== 'object') fail('عمل نامعتبر است.');
  const op = value as Raw;
  const reqId = (key: string): string => {
    const entry = op[key];
    return typeof entry === 'string' && entry && entry.length <= 100 ? entry : fail(`«${key}» نامعتبر است.`);
  };
  const optId = (key: string): string | null => (op[key] === null || op[key] === undefined ? null : reqId(key));
  const text = (entry: unknown, max = 300): string => (typeof entry === 'string' && entry.length <= max ? entry : fail('متن نامعتبر است.'));
  const nullableText = (entry: unknown, max: number): string | null => (entry === null ? null : text(entry, max));
  return { fail, reqId, optId, text, nullableText };
}
