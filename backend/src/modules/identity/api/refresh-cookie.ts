import { Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppConfig } from '../../../config/config.js';
import { TRUSTED_DEVICE_DAYS } from '../application/trusted-devices.js';

// کوکی تازه‌سازی (docs/backend/07 ۲): HttpOnly، Secure، SameSite=Strict، فقط زیر /v1/auth.

export const REFRESH_COOKIE = 'pj_refresh';
export const DEVICE_COOKIE = 'pj_device';
const COOKIE_PATH = '/v1/auth';

@Injectable()
export class RefreshCookie {
  constructor(private readonly config: AppConfig) {}

  read(request: Request): string | undefined {
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const value = cookies?.[REFRESH_COOKIE];
    return typeof value === 'string' ? value : undefined;
  }

  write(response: Response, token: string): void {
    response.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: this.config.auth.cookieSecure,
      sameSite: 'strict',
      path: COOKIE_PATH,
      maxAge: this.config.auth.refreshAbsoluteTtlHours * 3_600_000,
    });
  }

  clear(response: Response): void {
    response.clearCookie(REFRESH_COOKIE, { httpOnly: true, secure: this.config.auth.cookieSecure, sameSite: 'strict', path: COOKIE_PATH });
  }

  /** کوکی «دستگاه مورد اعتماد» (W03) — با خروج پاک نمی‌شود؛ فقط مرحلهٔ کد را می‌بخشد. */
  readDevice(request: Request): string | undefined {
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const value = cookies?.[DEVICE_COOKIE];
    return typeof value === 'string' ? value : undefined;
  }

  writeDevice(response: Response, token: string): void {
    response.cookie(DEVICE_COOKIE, token, {
      httpOnly: true,
      secure: this.config.auth.cookieSecure,
      sameSite: 'strict',
      path: COOKIE_PATH,
      maxAge: TRUSTED_DEVICE_DAYS * 86_400_000,
    });
  }
}
