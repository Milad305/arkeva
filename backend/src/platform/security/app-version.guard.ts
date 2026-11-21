import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AppConfig } from '../../config/config.js';
import { AppContext } from '../context/app-context.js';
import { DomainError } from '../http/errors.js';

// حداقل نسخهٔ اپ کارگاه (field-app.md ۵.۳ `[تأییدشده]`؛ تصمیم 1405/08/30): اپ با هر درخواست `X-App-Version` می‌فرستد. نسخهٔ کمتر از
// `APP_MIN_VERSION` ← ۴۲۶ `APP_VERSION_UNSUPPORTED` (retryable: false)؛ اپ صف را دست نمی‌زند و صفحهٔ به‌روزرسانی اجباری نشان می‌دهد.
// فقط ترافیک اپ: مسیرهای ویژهٔ اپ (`/auth/app/*`، `/field/*`) همیشه، و مسیرهای مشترک (`/uploads`، `/notifications`) وقتی سرآیند
// آمده یا نشست android است. نبود سرآیند در ترافیک اپ = نسخهٔ قدیمی‌تر از این سازوکار ← رد. وب هرگز بررسی نمی‌شود.

export const APP_VERSION_HEADER = 'x-app-version';

const APP_ONLY = [/^\/auth\/app(\/|$)/, /^\/field(\/|$)/];
const SHARED = [/^\/uploads(\/|$)/, /^\/notifications(\/|$)/];

/** `1.2.3+45` یا `1.2.3-beta` ← [1, 2, 3]؛ نامعتبر ← null. */
export function parseVersion(raw: string): number[] | null {
  const core = raw.trim().split(/[+-]/, 1)[0] ?? '';
  if (!/^\d+(\.\d+){0,3}$/.test(core)) return null;
  return core.split('.').map(Number);
}

/** آیا `version` دست‌کم `minimum` است؟ بخش‌های جاافتاده صفرند. */
export function meetsMinimum(version: readonly number[], minimum: readonly number[]): boolean {
  for (let index = 0; index < Math.max(version.length, minimum.length); index += 1) {
    const left = version[index] ?? 0;
    const right = minimum[index] ?? 0;
    if (left !== right) return left > right;
  }
  return true;
}

@Injectable()
export class AppVersionGuard implements CanActivate {
  private readonly minimum: number[] | null;

  constructor(
    config: AppConfig,
    private readonly context: AppContext,
  ) {
    this.minimum = config.fieldApp.minVersion ? parseVersion(config.fieldApp.minVersion) : null;
  }

  canActivate(execution: ExecutionContext): boolean {
    if (!this.minimum || execution.getType() !== 'http') return true;
    const request = execution.switchToHttp().getRequest<Request>();
    const path = request.path.replace(/^\/v1(?=\/)/, '');
    const header = request.headers[APP_VERSION_HEADER];
    const raw = Array.isArray(header) ? header[0] : header;
    const appTraffic =
      APP_ONLY.some((pattern) => pattern.test(path)) ||
      (SHARED.some((pattern) => pattern.test(path)) && (raw !== undefined || this.context.actor?.client === 'android'));
    if (!appTraffic) return true;
    const version = raw ? parseVersion(raw) : null;
    if (version && meetsMinimum(version, this.minimum)) return true;
    throw new DomainError('APP_VERSION_UNSUPPORTED', 426, { minVersion: this.minimum.join('.'), currentVersion: raw?.trim() || null });
  }
}
