import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';

// جستجوی آیتم‌های WBS جاری (W43؛ platform.md ۹) روی عنوان و کد نرمال‌شده با `search_norm`. فقط خواندن؛ دسترسی را فراخوان
// با فهرست پروژه‌ها اعمال می‌کند.

export interface WbsHit {
  readonly id: string;
  readonly projectId: string;
  readonly code: string;
  readonly title: string;
  readonly isLeaf: boolean;
  readonly supervisorUserId: string | null;
}

@Injectable()
export class PlanSearch {
  constructor(private readonly em: EntityManager) {}

  async wbs(projectIds: readonly string[], pattern: string, limit: number): Promise<WbsHit[]> {
    if (projectIds.length === 0) return [];
    const rows = await this.em.transactional((tx) =>
      tx.getConnection().execute<{ id: string; project_id: string; code: string; title: string; is_leaf: boolean; supervisor_user_id: string | null }[]>(
        `select id, project_id, code, title, is_leaf, supervisor_user_id from wbs_item
          where project_id in (?) and removed_at is null and (search_norm(title) like ? or search_norm(code) like ?)
          order by is_leaf desc, code limit ?`,
        [[...projectIds], pattern, pattern, limit],
        'all',
        tx.getTransactionContext(),
      ),
    );
    return rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      code: row.code,
      title: row.title,
      isLeaf: row.is_leaf,
      supervisorUserId: row.supervisor_user_id,
    }));
  }
}
