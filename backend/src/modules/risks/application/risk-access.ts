import { Injectable } from '@nestjs/common';
import type { Permission } from '@projeyar/shared';
import { AppContext } from '../../../platform/context/app-context.js';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../../../platform/http/errors.js';
import { projectsWith } from '../../../platform/security/access.js';

// دسترسی ریسک (risk.md ۹؛ D11). مسیرهای `/risks/:id` پروژه را از خود ریسک می‌گیرند، پس کد در سرویس سنجیده می‌شود:
//   • غیرعضو = ریسک برایش وجود ندارد (۴۰۴؛ 07 ۴).
//   • ویرایش = `risk.edit` یا مالک همان ریسک (۹: «مالک ریسک و مدیر پروژه»).
//   • مبلغ = `cbs.view_amounts` همان پروژه (`risk.view_amounts` همان است؛ AC-RK-10).
//   • دامنهٔ `risk.view` جز «همه» (سرپرست) ← فقط مشکل‌های کارگاهی که خودش گزارش داده (AC-RK-11؛ برش ۱۳ب).

@Injectable()
export class RiskAccess {
  constructor(private readonly context: AppContext) {}

  actor() {
    const actor = this.context.actor;
    const access = this.context.access;
    if (!actor || !access) throw new UnauthorizedError();
    return { actor, access };
  }

  private codes(projectId: string) {
    const { access } = this.actor();
    return access.projects.get(projectId);
  }

  /** پروژه‌هایی که کاربر دفترشان را می‌بیند (نمای سراسری `/risks`). */
  viewableProjects(): string[] | 'all' {
    const { access } = this.actor();
    return access.isOrgAdmin ? 'all' : projectsWith(access, 'risk.view');
  }

  has(projectId: string, code: Permission): boolean {
    const { access } = this.actor();
    return access.isOrgAdmin || (this.codes(projectId)?.has(code) ?? false);
  }

  /** عضو نیست ← ۴۰۴؛ کد ندارد ← ۴۰۳. */
  require(projectId: string, code: Permission): void {
    const { access } = this.actor();
    if (access.isOrgAdmin) return;
    const codes = this.codes(projectId);
    if (!codes) throw new NotFoundError('RISK_NOT_FOUND');
    if (!codes.has(code)) throw new ForbiddenError('PERMISSION_DENIED', { requiredPermission: code });
  }

  amounts(projectId: string): boolean {
    return this.has(projectId, 'cbs.view_amounts');
  }

  /** دیدِ کامل دفتر؛ false = فقط مشکل‌های گزارش‌شدهٔ خود (سرپرست). */
  fullView(projectId: string): boolean {
    const { access } = this.actor();
    return access.isOrgAdmin || this.codes(projectId)?.get('risk.view') === 'all';
  }

  /** ویرایش محتوا و اقدام‌ها: `risk.edit` یا مالک ریسک. */
  requireEdit(risk: { readonly projectId: string; readonly ownerUserId: string }): void {
    this.require(risk.projectId, 'risk.view');
    if (this.has(risk.projectId, 'risk.edit')) return;
    if (risk.ownerUserId === this.actor().actor.userId) return;
    throw new ForbiddenError('PERMISSION_DENIED', { requiredPermission: 'risk.edit' });
  }
}
