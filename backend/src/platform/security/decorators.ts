import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiBearerAuth, ApiExtension } from '@nestjs/swagger';
import type { Permission as PermissionCode } from '@projeyar/shared';

// هر endpoint دقیقاً یکی از این سه را دارد (D11؛ docs/backend/07 ۵). نبودش خطای راه‌اندازی است.

export const ACCESS_KIND = 'projeyar:access-kind';
export const ACCESS_PERMISSION = 'projeyar:access-permission';

export type AccessKind = 'public' | 'authenticated' | 'permission';

/** بدون احراز هویت (ورود، سلامت). */
export const Public = (): MethodDecorator & ClassDecorator => applyDecorators(SetMetadata(ACCESS_KIND, 'public'), ApiExtension('x-access', 'public'));

/** فقط احراز هویت، روی دادهٔ خود کاربر (/auth/me، حساب من) — بی‌کد دسترسی (F01 ۸). */
export const Authenticated = (): MethodDecorator & ClassDecorator =>
  applyDecorators(SetMetadata(ACCESS_KIND, 'authenticated'), ApiBearerAuth('access-token'), ApiExtension('x-access', 'authenticated'));

/**
 * یک کد دسترسی از کاتالوگ مشترک. روی مسیر دارای `:projectId` عضویت و کد در همان پروژه سنجیده
 * می‌شود؛ روی مسیر سطح سازمان، مدیر سازمان یا داشتن کد در دست‌کم یک پروژه، و سرویس سطرها را
 * به پروژه‌های دارای کد محدود می‌کند.
 */
export const Permission = (code: PermissionCode): MethodDecorator =>
  applyDecorators(
    SetMetadata(ACCESS_KIND, 'permission'),
    SetMetadata(ACCESS_PERMISSION, code),
    ApiBearerAuth('access-token'),
    ApiExtension('x-permission', code),
  );
