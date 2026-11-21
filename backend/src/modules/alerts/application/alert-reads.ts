import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Alert, type AlertSeverity } from '../domain/alert.entities.js';

// هشدارهای باز برای لایهٔ خواندن (F17): رنگ کارت‌های W10 از هشدار ثبت‌شده، نه بازمحاسبهٔ شرط (charts.md ۶.۲).

export interface OpenAlertView {
  readonly id: string;
  readonly projectId: string;
  readonly ruleCode: string;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly severity: AlertSeverity;
  readonly title: string;
  /** متن راهنمای بی مبلغ (فهرست «نیاز به توجه» و پیشنهاد بازتوزیع W23). */
  readonly guidance: string;
}

@Injectable()
export class AlertReads {
  constructor(private readonly em: EntityManager) {}

  async open(projectIds: readonly string[]): Promise<OpenAlertView[]> {
    if (projectIds.length === 0) return [];
    const rows = await this.em.find(Alert, { projectId: { $in: [...projectIds] }, status: { $in: ['open', 'seen'] } });
    return rows.map((row) => ({
      id: row.id,
      projectId: row.projectId as string,
      ruleCode: row.ruleCode,
      subjectType: row.subjectType,
      subjectId: row.subjectId,
      severity: row.severity,
      title: row.title,
      guidance: row.guidanceSafe,
    }));
  }

  /** عنوان و موضوع هشدارها برای فید فعالیت. */
  async byIds(ids: readonly string[]): Promise<Map<string, { title: string; subjectType: string; subjectId: string; ruleCode: string }>> {
    if (ids.length === 0) return new Map();
    const rows = await this.em.find(Alert, { id: { $in: [...ids] } });
    return new Map(rows.map((row) => [row.id, { title: row.title, subjectType: row.subjectType, subjectId: row.subjectId, ruleCode: row.ruleCode }]));
  }
}
