import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ProjectRiskCounts } from '../../projects/index.js';
import { isOpen, OPEN_STATUSES } from '../domain/risk-rules.js';
import { Risk, RiskAction, RiskLink } from '../domain/risk.entities.js';

// خواندن‌های ریسک برای ماژول‌های دیگر: شمار ریسک باز (سربرگ W10، برگ W11) و واقعیت‌های قواعد AL-RSK-01..04 و AL-X-01 (F12).

export interface RiskFact {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly status: string;
  readonly score: number | null;
  readonly source: 'manual' | 'field';
  readonly ownerUserId: string;
  readonly nextReviewDate: string | null;
  readonly createdAt: Date;
  readonly wbsItemIds: readonly string[];
  readonly actions: readonly { readonly id: string; readonly title: string; readonly ownerUserId: string; readonly dueDate: string; readonly status: string }[];
}

@Injectable()
export class RiskReads extends ProjectRiskCounts {
  constructor(private readonly em: EntityManager) {
    super();
  }

  async counts(projectIds: readonly string[]): Promise<Map<string, { open: number; high: number }>> {
    const result = new Map<string, { open: number; high: number }>(projectIds.map((id) => [id, { open: 0, high: 0 }]));
    if (projectIds.length === 0) return result;
    const rows = await this.em.find(Risk, { projectId: { $in: [...projectIds] }, status: { $in: [...OPEN_STATUSES] } }, { fields: ['projectId', 'score'] });
    for (const risk of rows) {
      const entry = result.get(risk.projectId);
      if (!entry) continue;
      entry.open += 1;
      if ((risk.score ?? 0) >= 15) entry.high += 1;
    }
    return result;
  }

  async openByWbsItem(projectId: string): Promise<Map<string, number>> {
    const open = await this.em.find(Risk, { projectId, status: { $in: [...OPEN_STATUSES] } }, { fields: ['id'] });
    const result = new Map<string, number>();
    if (open.length === 0) return result;
    const links = await this.em.find(RiskLink, { riskId: { $in: open.map((risk) => risk.id) }, targetType: 'wbs_item' });
    for (const link of links) result.set(link.targetId, (result.get(link.targetId) ?? 0) + 1);
    return result;
  }

  /** ریسک‌های باز چند پروژه برای کارت‌های W05 و W10 (charts.md ۶.۱، ۶.۲). */
  async openSummaries(projectIds: readonly string[]) {
    if (projectIds.length === 0) return [];
    const rows = await this.em.find(Risk, { projectId: { $in: [...projectIds] }, status: { $in: [...OPEN_STATUSES] } });
    return rows.map((risk) => ({
      id: risk.id,
      projectId: risk.projectId,
      code: risk.code,
      title: risk.title,
      category: risk.category,
      probability: risk.probability ?? null,
      impact: risk.impact ?? null,
      score: risk.score ?? null,
      level: risk.level ?? null,
      status: risk.status,
      ownerUserId: risk.ownerUserId,
    }));
  }

  /** جستجوی W43: ریسک‌های بسته‌نشده با عنوان یا کد نرمال‌شده (`search_norm`). */
  async search(projectIds: readonly string[], pattern: string, limit: number) {
    if (projectIds.length === 0) return [];
    return this.em.transactional((tx) =>
      tx
        .getConnection()
        .execute<
          { id: string; project_id: string; code: string; title: string; score: number | null; level: string | null; status: string; owner_user_id: string }[]
        >(
          `select id, project_id, code, title, score, level, status, owner_user_id from risk
            where project_id in (?) and status <> 'closed' and (search_norm(title) like ? or search_norm(code) like ?)
            order by score desc nulls last, code limit ?`,
          [[...projectIds], pattern, pattern, limit],
          'all',
          tx.getTransactionContext(),
        ),
    );
  }

  /** عنوان ریسک‌ها برای فید فعالیت. */
  async titles(ids: readonly string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    return new Map((await this.em.find(Risk, { id: { $in: [...ids] } }, { fields: ['title'] })).map((risk) => [risk.id, risk.title]));
  }

  /** ریسک‌های باز پروژه با اقدام‌ها و پیوندهای WBS (واقعیت‌های قواعد هشدار). */
  async facts(projectId: string): Promise<RiskFact[]> {
    const risks = (await this.em.find(Risk, { projectId })).filter((risk) => isOpen(risk.status));
    if (risks.length === 0) return [];
    const ids = risks.map((risk) => risk.id);
    const [actions, links] = await Promise.all([
      this.em.find(RiskAction, { riskId: { $in: ids } }),
      this.em.find(RiskLink, { riskId: { $in: ids }, targetType: 'wbs_item' }),
    ]);
    return risks.map((risk) => ({
      id: risk.id,
      code: risk.code,
      title: risk.title,
      status: risk.status,
      score: risk.score ?? null,
      source: risk.source,
      ownerUserId: risk.ownerUserId,
      nextReviewDate: risk.nextReviewDate ?? null,
      createdAt: risk.createdAt,
      wbsItemIds: links.filter((link) => link.riskId === risk.id).map((link) => link.targetId),
      actions: actions
        .filter((action) => action.riskId === risk.id)
        .map((action) => ({ id: action.id, title: action.title, ownerUserId: action.ownerUserId, dueDate: action.dueDate, status: action.status })),
    }));
  }
}
