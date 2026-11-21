import { Injectable } from '@nestjs/common';
import { ReportViews } from './report-views.js';

// گزارش‌هایی که کاربر با دامنهٔ `report.view` (مثلاً ناظر حوزه، own_area) می‌بیند — همان قاعدهٔ صندوق W20 (AC-AP-11)؛ برای جستجو.

@Injectable()
export class ReportScopeReads {
  constructor(private readonly views: ReportViews) {}

  async visibleReportIds(reports: readonly { readonly id: string; readonly projectId: string }[], userId: string): Promise<Set<string>> {
    if (reports.length === 0) return new Set();
    const loaded = await this.views.load({ projectIds: [...new Set(reports.map((report) => report.projectId))], ids: reports.map((report) => report.id) });
    const { items } = await this.views.visibleItems(loaded, userId);
    return new Set(items.map((item) => item.reportId));
  }
}
