import { Injectable } from '@nestjs/common';
import type { Permission } from '@projeyar/shared';
import { AppContext } from '../../../platform/context/app-context.js';
import { DomainError, ForbiddenError, NotFoundError, UnauthorizedError } from '../../../platform/http/errors.js';
import { ProjectBasicsCatalog } from '../../projects/index.js';

// دسترسی گزارش مدیریتی (management-reports.md ۱۰؛ D11). مسیرها `projects/:scope/...` با شناسهٔ پروژه یا «org» (گزارش سطح سازمان؛
// تصمیم کاربر 1405/08/26)؛ کد پروژه را همین‌جا می‌سنجد. مبلغ فقط با `cbs.view_amounts` همان پروژه.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class ReportAccess {
  constructor(
    private readonly context: AppContext,
    private readonly catalog: ProjectBasicsCatalog,
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

  /** «org» ← null؛ شناسهٔ پروژه با کد لازم (غیرعضو ۴۰۴، بی کد ۴۰۳). */
  scope(raw: string, code: Permission): string | null {
    if (raw === 'org') return null;
    if (!UUID.test(raw)) throw new DomainError('REPORT_INVALID', 422, { reason: 'پروژه شناخته نشد.' });
    const { access } = this.actor();
    if (access.isOrgAdmin) return raw;
    const codes = access.projects.get(raw);
    if (!codes) throw new NotFoundError('PROJECT_NOT_FOUND');
    if (!codes.has(code)) throw new ForbiddenError('PERMISSION_DENIED', { requiredPermission: code });
    return raw;
  }

  /** پروژه‌های دیدنی با یک کد (پرتفوی، فهرست خروجی‌ها، گزینه‌ها). */
  async projects(code: Permission): Promise<string[]> {
    const { access } = this.actor();
    if (access.isOrgAdmin) return (await this.catalog.list()).filter((project) => project.status !== 'archived').map((project) => project.id);
    return [...access.projects].filter(([, codes]) => codes.has(code)).map(([id]) => id);
  }

  /** ارسال به نشانی بیرونی (۷.۳؛ AC-MR-08): کد همان پروژه، یا برای سطح سازمان در یکی از پروژه‌ها. */
  canSendExternal(projectId: string | null): boolean {
    const { access } = this.actor();
    if (access.isOrgAdmin) return true;
    return projectId ? this.has(projectId, 'reports.send_external') : [...access.projects.values()].some((codes) => codes.has('reports.send_external'));
  }

  /** زمان‌بندی (۱۰): `reports.schedule`، یا برای قالب مالی `reports.schedule_financial`. */
  canSchedule(projectId: string | null, financial: boolean): boolean {
    const { access } = this.actor();
    if (access.isOrgAdmin) return true;
    const ok = (codes: ReadonlyMap<string, unknown>) => codes.has('reports.schedule') || (financial && codes.has('reports.schedule_financial'));
    if (projectId) {
      const codes = access.projects.get(projectId);
      return !!codes && ok(codes);
    }
    return [...access.projects.values()].some(ok);
  }

  /** نسخهٔ با مبلغ برای کاربر جاری (D11؛ AC-MR-03). */
  amounts(projectId: string | null): boolean {
    const { access } = this.actor();
    return projectId === null ? access.isOrgAdmin : this.has(projectId, 'cbs.view_amounts');
  }
}
