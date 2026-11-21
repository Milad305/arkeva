import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { type TeamPlanItem, TeamPlanPort } from '../../team/index.js';
import { WbsItem } from '../domain/plan.entities.js';

// پیاده‌سازی قرارداد team (team-ports.ts): planning مالک جدول WbsItem است و ستون سرپرست را فقط به دستور team می‌نویسد
// (تنها استثنای جدول جاری؛ CLAUDE.md ۳ بند ۷).

@Injectable()
export class TeamPlanProvider extends TeamPlanPort {
  constructor(private readonly em: EntityManager) {
    super();
  }

  async items(projectId: string, em: EntityManager = this.em): Promise<TeamPlanItem[]> {
    const rows = await em.find(WbsItem, { projectId, removedAt: null });
    const byParent = new Map<string | null, WbsItem[]>();
    for (const row of rows) byParent.set(row.parentId ?? null, [...(byParent.get(row.parentId ?? null) ?? []), row]);
    // ترتیب پیمایش درخت: والد پیش از فرزند
    const ordered: TeamPlanItem[] = [];
    const visit = (parentId: string | null) => {
      for (const row of (byParent.get(parentId) ?? []).sort((a, b) => a.sortOrder - b.sortOrder)) {
        ordered.push({
          id: row.id,
          parentId: row.parentId ?? null,
          code: row.code,
          title: row.title,
          sortOrder: row.sortOrder,
          isLeaf: row.isLeaf,
          isMilestone: row.isMilestone,
          measurementMethod: row.measurementMethod ?? null,
          supervisorUserId: row.supervisorUserId ?? null,
        });
        visit(row.id);
      }
    };
    visit(null);
    return ordered;
  }

  async setSupervisor(tx: EntityManager, projectId: string, wbsItemIds: readonly string[], supervisorUserId: string | null): Promise<void> {
    if (wbsItemIds.length === 0) return;
    const rows = await tx.find(WbsItem, { projectId, id: { $in: [...wbsItemIds] }, removedAt: null });
    for (const row of rows) row.supervisorUserId = supervisorUserId;
  }
}
