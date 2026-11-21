import { applyDecorators, type CallHandler, type ExecutionContext, Injectable, type NestInterceptor, SetMetadata } from '@nestjs/common';
import { ApiExtension } from '@nestjs/swagger';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { map, type Observable } from 'rxjs';
import { AppContext } from '../context/app-context.js';

// حذف مبلغ (D11؛ access-control ۵.۵؛ AC-CBS-06؛ 07 ۵). هر endpoint که مبلغ ریالی برمی‌گرداند کلیدهای مبلغ را با
// `@Amounts(...)` نام می‌برد؛ بی `cbs.view_amounts` در پروژهٔ مسیر (یا مدیر سازمان)، هر جای پاسخ که آن کلیدها
// آمده‌اند `null` می‌شوند — قرارداد فرانت «بی مجوز مبلغ از سرور null می‌آید». نسبت‌ها مبلغ نیستند و نام نمی‌برند.
// جدایی از 07 ۵: کلیدها روی مسیر نام برده می‌شوند نه روی فیلد DTO، چون پاسخ‌های ویرایش شیء آزادند (README ۶).

export const AMOUNT_KEYS = 'projeyar:amount-keys';

/** نام کلیدها در Swagger هم می‌آید (`x-amount-fields`؛ 06 ۸) تا تست قرارداد و فرانت ببینند. */
export const Amounts = (...keys: string[]): MethodDecorator => applyDecorators(SetMetadata(AMOUNT_KEYS, keys), ApiExtension('x-amount-fields', keys));

/** هر کلید نام‌برده در هر عمقی ← null. */
export function redactAmounts<T>(value: T, keys: ReadonlySet<string>): T {
  if (Array.isArray(value)) return value.map((entry: unknown) => redactAmounts(entry, keys)) as T;
  if (value === null || typeof value !== 'object' || value instanceof Date) return value;
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) out[key] = keys.has(key) ? null : redactAmounts(entry, keys);
  return out as T;
}

@Injectable()
export class AmountInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly context: AppContext,
  ) {}

  intercept(execution: ExecutionContext, next: CallHandler): Observable<unknown> {
    const keys = this.reflector.get<string[] | undefined>(AMOUNT_KEYS, execution.getHandler());
    if (!keys || keys.length === 0) return next.handle();
    const request = execution.switchToHttp().getRequest<Request>();
    const projectId = typeof request.params['projectId'] === 'string' ? request.params['projectId'] : null;
    const access = this.context.access;
    const canView = !!access && (access.isOrgAdmin || (projectId !== null && (access.projects.get(projectId)?.has('cbs.view_amounts') ?? false)));
    if (canView) return next.handle();
    const set = new Set(keys);
    return next.handle().pipe(map((body: unknown) => redactAmounts(body, set)));
  }
}
