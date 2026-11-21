import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EntityManager } from '@mikro-orm/postgresql';
import type { Permission } from '@projeyar/shared';
import type { Request } from 'express';
import { AppContext } from '../context/app-context.js';
import { applyTenant } from '../database/tenant.js';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../http/errors.js';
import { AccessResolver, projectsWith } from './access.js';
import { AccessTokens } from './access-tokens.js';
import { ACCESS_KIND, ACCESS_PERMISSION, type AccessKind } from './decorators.js';

// ترتیب بررسی هر درخواست (access-control.md ۵.۲؛ docs/backend/07 ۱):
// احراز هویت ← زمینهٔ سازمان (فیلتر + RLS) ← عضویت پروژه ← کد ← (scope در سرویس) ← حذف مبلغ.

function kindOf(reflector: Reflector, context: ExecutionContext): AccessKind | undefined {
  return reflector.getAllAndOverride<AccessKind>(ACCESS_KIND, [context.getHandler(), context.getClass()]);
}

function bearer(request: Request): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token || null;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: AccessTokens,
    private readonly context: AppContext,
    private readonly em: EntityManager,
  ) {}

  async canActivate(execution: ExecutionContext): Promise<boolean> {
    if (kindOf(this.reflector, execution) === 'public') return true;

    const token = bearer(execution.switchToHttp().getRequest<Request>());
    if (!token) throw new UnauthorizedError('AUTH_REQUIRED');

    const actor = await this.tokens.verify(token);
    this.context.setActor(actor);
    // هر پرس‌وجوی این درخواست از اینجا به بعد به همین سازمان محدود است (05 ۴)
    applyTenant(this.em, actor.orgId);
    return true;
  }
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly context: AppContext,
    private readonly resolver: AccessResolver,
  ) {}

  async canActivate(execution: ExecutionContext): Promise<boolean> {
    if (kindOf(this.reflector, execution) !== 'permission') return true;

    const code = this.reflector.get<Permission>(ACCESS_PERMISSION, execution.getHandler());
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError('AUTH_REQUIRED');

    const access = await this.resolver.resolve(actor);
    this.context.setAccess(access);

    const projectId = execution.switchToHttp().getRequest<Request>().params['projectId'];
    if (typeof projectId === 'string') {
      const codes = access.projects.get(projectId);
      // عضو نیست = پروژه برایش وجود ندارد (۴۰۴، نه ۴۰۳؛ 07 ۴)
      if (!codes && !access.isOrgAdmin) throw new NotFoundError('PROJECT_NOT_FOUND');
      if (!access.isOrgAdmin && !codes?.has(code)) throw new ForbiddenError('PERMISSION_DENIED', { requiredPermission: code });
      return true;
    }

    if (access.isOrgAdmin || projectsWith(access, code).length > 0) return true;
    throw new ForbiddenError('PERMISSION_DENIED', { requiredPermission: code });
  }
}
