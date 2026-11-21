import { Injectable } from '@nestjs/common';
import { AppContext } from '../../../platform/context/app-context.js';
import { UnauthorizedError } from '../../../platform/http/errors.js';
import { ReportScopeReads } from '../../approvals/index.js';

// گزارش‌های یافته‌شده‌ای که کاربر با دامنهٔ `report.view` می‌بیند: دامنهٔ «همه» همه را، ناظر حوزه (own_area) فقط گزارش‌هایی
// که آیتمی در حوزهٔ او دارند — همان قاعدهٔ صندوق W20 از approvals.

@Injectable()
export class ReportVisibility {
  constructor(
    private readonly context: AppContext,
    private readonly approvals: ReportScopeReads,
  ) {}

  async visible(reports: readonly { readonly id: string; readonly projectId: string }[]): Promise<Set<string>> {
    const access = this.context.access;
    const actor = this.context.actor;
    if (!access || !actor) throw new UnauthorizedError();
    const scoped = reports.filter((report) => !access.isOrgAdmin && access.projects.get(report.projectId)?.get('report.view') !== 'all');
    const result = new Set(reports.filter((report) => !scoped.includes(report)).map((report) => report.id));
    if (scoped.length > 0) for (const id of await this.approvals.visibleReportIds(scoped, actor.userId)) result.add(id);
    return result;
  }
}
