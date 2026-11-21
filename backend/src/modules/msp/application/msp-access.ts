import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { Permission } from '@projeyar/shared';
import { AppContext } from '../../../platform/context/app-context.js';
import { ConflictError, DomainError, ForbiddenError, NotFoundError, UnauthorizedError } from '../../../platform/http/errors.js';
import { MspImportSession } from '../domain/msp.entities.js';

// دسترسی F15 (msp-integration.md ۹؛ D11). مسیرهای `/msp/imports/:id` پروژه را از جلسه می‌گیرند و کد را اینجا می‌سنجند:
// غیرعضو ← ۴۰۴ (جلسه برایش وجود ندارد)، بی کد ← ۴۰۳.

export const mspInvalid = (reason: string) => new DomainError('MSP_IMPORT_INVALID', 422, { reason });
export const mspConflict = (reason: string) => new ConflictError('MSP_IMPORT_CONFLICT', { reason });

@Injectable()
export class MspAccess {
  constructor(
    private readonly em: EntityManager,
    private readonly context: AppContext,
  ) {}

  actor() {
    const actor = this.context.actor;
    const access = this.context.access;
    if (!actor || !access) throw new UnauthorizedError();
    return { actor, access };
  }

  has(projectId: string, code: Permission): boolean {
    const { access } = this.actor();
    return access.isOrgAdmin || (access.projects.get(projectId)?.has(code) ?? false);
  }

  require(projectId: string, code: Permission, notFound: 'PROJECT_NOT_FOUND' | 'MSP_SESSION_NOT_FOUND' = 'PROJECT_NOT_FOUND'): void {
    const { access } = this.actor();
    if (access.isOrgAdmin) return;
    const codes = access.projects.get(projectId);
    if (!codes) throw new NotFoundError(notFound);
    if (!codes.has(code)) throw new ForbiddenError('PERMISSION_DENIED', { requiredPermission: code });
  }

  /** الگوی سازمان فقط با `msp.templates.manage` در یکی از پروژه‌ها یا مدیر سازمان ذخیره می‌شود (تصمیم کاربر 1405/08/26). */
  canManageTemplates(): boolean {
    const { access } = this.actor();
    return access.isOrgAdmin || [...access.projects.values()].some((codes) => codes.has('msp.templates.manage'));
  }

  async session(id: string, em: EntityManager = this.em): Promise<MspImportSession> {
    const session = await em.findOne(MspImportSession, { id });
    if (!session) throw new NotFoundError('MSP_SESSION_NOT_FOUND');
    this.require(session.projectId, 'msp.import', 'MSP_SESSION_NOT_FOUND');
    return session;
  }
}
