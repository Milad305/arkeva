import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { PATH_METADATA } from '@nestjs/common/constants.js';
import { isPermission, type Permission } from '@projeyar/shared';
import { ACCESS_KIND, ACCESS_PERMISSION, type AccessKind } from './decorators.js';

// «دسترسی‌ای که کد ندارد وجود ندارد» (access-control.md ۵.۲). هر handler بدون یکی از
// @Public / @Authenticated / @Permission، یا با کدی بیرون از کاتالوگ، برنامه را بالا نمی‌آورد.

export interface RouteAccess {
  readonly route: string;
  readonly kind: AccessKind | undefined;
  readonly permission: Permission | undefined;
}

@Injectable()
export class AccessCoverage implements OnApplicationBootstrap {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly reflector: Reflector,
  ) {}

  /** فهرست همهٔ handlerها با نوع دسترسی‌شان — تست قرارداد هم از همین می‌خواند (09 ۵). */
  routes(): RouteAccess[] {
    return this.discovery.getControllers().flatMap((wrapper) => {
      const instance = wrapper.instance as object | null;
      if (!instance || !wrapper.metatype) return [];
      const controller = wrapper.metatype;
      const prototype = Object.getPrototypeOf(instance) as object;
      return this.scanner.getAllMethodNames(prototype).flatMap((name) => {
        const handler = (prototype as Record<string, unknown>)[name];
        if (typeof handler !== 'function' || this.reflector.get(PATH_METADATA, handler) === undefined) return [];
        return [
          {
            route: `${controller.name}.${name}`,
            kind: this.reflector.getAllAndOverride<AccessKind>(ACCESS_KIND, [handler, controller]),
            permission: this.reflector.get<Permission>(ACCESS_PERMISSION, handler),
          },
        ];
      });
    });
  }

  onApplicationBootstrap(): void {
    const problems = this.routes().flatMap((route) => {
      if (!route.kind) return [`${route.route}: هیچ‌کدام از Public، Authenticated یا Permission`];
      if (route.kind === 'permission' && !(route.permission && isPermission(route.permission))) {
        return [`${route.route}: کد دسترسی بیرون از کاتالوگ (${String(route.permission)})`];
      }
      return [];
    });
    if (problems.length > 0) {
      throw new Error(`پوشش دسترسی ناقص است (D11):\n- ${problems.join('\n- ')}`);
    }
  }
}
