import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ForbiddenError } from '../http/errors.js';

/**
 * مسیرهایی که فقط با کوکی کار می‌کنند (تازه‌سازی، خروج) سرآیند `X-Requested-With: projeyar` می‌خواهند؛
 * فرم بیرونی نمی‌تواند این سرآیند را بفرستد. کنار SameSite=Strict، دفاع دوم در برابر CSRF (07 ۲).
 */
@Injectable()
export class ClientHeaderGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const header = context.switchToHttp().getRequest<Request>().headers['x-requested-with'];
    if (header === 'projeyar') return true;
    throw new ForbiddenError('CLIENT_HEADER_REQUIRED');
  }
}
