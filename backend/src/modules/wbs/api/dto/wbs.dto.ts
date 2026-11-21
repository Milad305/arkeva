import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { ValidationFailedError } from '../../../../platform/http/errors.js';
import type { DraftFields, WbsOp } from '../../domain/ops.js';

// قرارداد W11، W12، W39 و F04 ۱۲ — همان `frontend/src/modules/{wbs,plan}/types`.

export class OpsRequestDto {
  @ApiProperty({ description: 'قفل خوش‌بینانهٔ نسخهٔ کاری (F04 ۳)' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  readonly draftRevision!: number;

  @ApiProperty({ type: 'array', items: { type: 'object', additionalProperties: true }, description: 'wbs.md ۱۱؛ حداکثر ۵۰۰ عمل' })
  @IsArray()
  @ArrayMaxSize(500, { message: 'هر ذخیره حداکثر ۵۰۰ تغییر دارد؛ ذخیره را چند بخش کنید.' })
  readonly ops!: unknown[];
}

export class ApplyRequestDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Min(0) readonly draftRevision!: number;
  @ApiProperty({ description: 'یادداشت بازنگری؛ اجباری (AC-PV-10)' }) @IsString() @MaxLength(2000) readonly note!: string;
}

export class StatusNoteDto {
  @ApiProperty({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'یادداشت وضعیت حداکثر ۱۰۰۰ نویسه است.' })
  readonly statusNote!: string | null;
}

export class ImportFormDto {
  @ApiProperty({ enum: ['replace', 'append'] }) @IsIn(['replace', 'append']) readonly mode!: 'replace' | 'append';
  @ApiProperty() @Type(() => Number) @IsInt() @Min(0) readonly draftRevision!: number;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() readonly parentId?: string;
}

const METHODS = ['quantity', 'percent', 'steps', 'time_based'] as const;
const GENERATORS = ['equal', 'duration', 'cost'] as const;

type Raw = Record<string, unknown>;

/** اعتبارسنجی شکل عملیات (اتحاد برچسب‌دار؛ class-validator آن را خوب نمی‌سنجد). معنای دامنه با موتور عملیات. */
export function parseOps(raw: readonly unknown[]): WbsOp[] {
  return raw.map((value, index) => {
    const fail = (message: string): never => {
      throw new ValidationFailedError([{ field: `ops[${index}]`, message }]);
    };
    if (!value || typeof value !== 'object') fail('عمل نامعتبر است.');
    const op = value as Raw;
    const optId = (key: string): string | null => (op[key] === null || op[key] === undefined ? null : reqId(key));
    const reqId = (key: string): string => {
      const field = op[key];
      return typeof field === 'string' && field && field.length <= 100 ? field : fail(`«${key}» نامعتبر است.`);
    };
    const num = (field: unknown, nullable = true): number | null => {
      if (field === null && nullable) return null;
      if (typeof field !== 'number' || !Number.isFinite(field)) return fail('عدد نامعتبر است.');
      return field;
    };
    const text = (field: unknown, max = 300): string => (typeof field === 'string' && field.length <= max ? field : fail('متن نامعتبر است.'));
    const fields = (input: unknown): DraftFields => {
      if (!input || typeof input !== 'object') return fail('فیلدها نامعتبرند.');
      const f = input as Raw;
      const out: Record<string, unknown> = {};
      if (f['title'] !== undefined) out['title'] = text(f['title']);
      if (f['code'] !== undefined) out['code'] = text(f['code'], 60);
      if (f['weightInParent'] !== undefined) out['weightInParent'] = num(f['weightInParent'], false);
      if (f['unit'] !== undefined) out['unit'] = f['unit'] === null ? null : text(f['unit'], 40);
      if (f['totalQuantity'] !== undefined) out['totalQuantity'] = num(f['totalQuantity']);
      for (const key of ['plannedStart', 'plannedFinish'] as const) if (f[key] !== undefined) out[key] = f[key] === null ? null : text(f[key], 10);
      if (f['measurementMethod'] !== undefined) {
        const method = f['measurementMethod'];
        if (method !== null && !METHODS.includes(method as (typeof METHODS)[number])) fail('روش اندازه‌گیری نامعتبر است.');
        out['measurementMethod'] = method;
      }
      if (f['isMilestone'] !== undefined) out['isMilestone'] = f['isMilestone'] === true;
      return out;
    };
    switch (op['type']) {
      case 'add': {
        const f = fields(op['fields']);
        return { type: 'add', tempId: reqId('tempId'), parentId: optId('parentId'), afterId: optId('afterId'), fields: { ...f, title: f.title ?? '' } };
      }
      case 'update':
        return { type: 'update', id: reqId('id'), fields: fields(op['fields']) };
      case 'move':
        return { type: 'move', id: reqId('id'), parentId: optId('parentId'), afterId: optId('afterId') };
      case 'indent':
      case 'outdent':
      case 'remove':
        return { type: op['type'], id: reqId('id') };
      case 'split': {
        const parts = op['parts'];
        if (!Array.isArray(parts) || parts.length > 20) return fail('بخش‌های تقسیم نامعتبرند.');
        return {
          type: 'split',
          id: reqId('id'),
          keepTitle: text(op['keepTitle'] ?? ''),
          keepQuantity: num(op['keepQuantity'] ?? null),
          parts: parts.map((part: unknown) => {
            const p = (part ?? {}) as Raw;
            if (typeof p['tempId'] !== 'string' || !p['tempId']) return fail('شناسهٔ بخش تقسیم نامعتبر است.');
            return { tempId: p['tempId'], title: text(p['title'] ?? ''), totalQuantity: num(p['totalQuantity'] ?? null) };
          }),
        };
      }
      case 'autoDistribute':
        return { type: 'autoDistribute', parentId: optId('parentId') };
      case 'generateWeights': {
        const generator = op['generator'];
        if (!GENERATORS.includes(generator as (typeof GENERATORS)[number])) return fail('مولد وزن نامعتبر است.');
        const scope = op['scope'] === 'tree' ? 'tree' : optId('scope');
        return { type: 'generateWeights', scope, generator: generator as (typeof GENERATORS)[number] };
      }
      case 'setSteps': {
        const steps = op['steps'];
        if (!Array.isArray(steps) || steps.length > 10) return fail('گام‌ها نامعتبرند.');
        const done = op['stepsDone'];
        return {
          type: 'setSteps',
          id: reqId('id'),
          steps: steps.map((step: unknown) => {
            const s = (step ?? {}) as Raw;
            if (typeof s['key'] !== 'string' || !s['key']) return fail('کلید گام نامعتبر است.');
            return { key: s['key'], title: text(s['title'] ?? '', 120), weight: num(s['weight'], false) as number };
          }),
          ...(done && typeof done === 'object'
            ? { stepsDone: Object.fromEntries(Object.entries(done as Raw).map(([key, percent]) => [key, num(percent, false) as number])) }
            : {}),
        };
      }
      default:
        return fail('نوع عمل شناخته نیست.');
    }
  });
}
