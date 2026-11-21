import { Injectable } from '@nestjs/common';
import { EntityManager, type FilterQuery } from '@mikro-orm/postgresql';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { NotFoundError, UnauthorizedError, ValidationFailedError } from '../../../platform/http/errors.js';
import { ProjectCatalog } from '../../identity/index.js';
import { Notification, NOTIFICATION_CATEGORIES, type NotificationCategory } from '../domain/notification.entity.js';

// اعلان‌های من (W06؛ notifications.md ۷، ۹). فقط اعلان‌های in_app خود کاربر؛ صفحه‌بندی cursor با
// (createdAt، id) نزولی.

export type NotificationTab = 'all' | NotificationCategory;

export interface ListQuery {
  readonly type?: NotificationCategory | undefined;
  readonly unreadOnly: boolean;
  readonly cursor?: string | undefined;
  readonly limit: number;
}

const encodeCursor = (row: Notification): string => Buffer.from(`${row.createdAt.toISOString()}|${row.id}`).toString('base64url');

function decodeCursor(cursor: string): { at: Date; id: string } {
  const [at = '', id = ''] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
  const date = new Date(at);
  if (Number.isNaN(date.getTime()) || !/^[0-9a-f-]{36}$/i.test(id)) {
    throw new ValidationFailedError([{ field: 'cursor', message: 'ادامهٔ فهرست معتبر نیست؛ فهرست را تازه کنید.' }]);
  }
  return { at: date, id };
}

@Injectable()
export class MyNotifications {
  constructor(
    private readonly em: EntityManager,
    private readonly context: AppContext,
    private readonly clock: Clock,
    private readonly projects: ProjectCatalog,
  ) {}

  /** `GET /notifications?type=&status=&cursor=&limit=` */
  async list(query: ListQuery) {
    const userId = this.userId();
    const mine: FilterQuery<Notification> = { userId, channel: 'in_app' };
    const where: FilterQuery<Notification> = {
      ...mine,
      ...(query.type ? { category: query.type } : {}),
      ...(query.unreadOnly ? { readAt: null } : {}),
    };
    const page = query.cursor ? decodeCursor(query.cursor) : null;
    const filtered: FilterQuery<Notification> = page
      ? { $and: [where, { $or: [{ createdAt: { $lt: page.at } }, { createdAt: page.at, id: { $lt: page.id } }] }] }
      : where;

    const [rows, unreadCount, perCategory, projects] = await Promise.all([
      this.em.find(Notification, filtered, { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], limit: query.limit + 1 }),
      this.em.count(Notification, { ...mine, readAt: null }),
      Promise.all(NOTIFICATION_CATEGORIES.map(async (category) => [category, await this.em.count(Notification, { ...mine, category })] as const)),
      this.projects.list(),
    ]);
    const names = new Map(projects.map((project) => [project.id, project.name]));
    const items = rows.slice(0, query.limit);
    const counts = Object.fromEntries(perCategory) as Record<NotificationCategory, number>;
    return {
      items: items.map((row) => itemView(row, names)),
      nextCursor: rows.length > query.limit && items.length > 0 ? encodeCursor(items[items.length - 1] as Notification) : null,
      unreadCount,
      counts: { all: counts.approvals + counts.risks + counts.system, ...counts } as Record<NotificationTab, number>,
    };
  }

  /**
   * اعلان‌های اخیر برای `GET /field/sync` (field-app.md ۵.۱): همان شکل فهرست، تازه‌ترین اول، از `since` و حداکثر `limit`.
   * خواندنی است؛ علامت «خوانده شد» آنلاین با `read` می‌ماند.
   */
  async recent(window: { readonly since: Date; readonly limit: number }) {
    const userId = this.userId();
    const [rows, projects] = await Promise.all([
      this.em.find(
        Notification,
        { userId, channel: 'in_app', createdAt: { $gte: window.since } },
        { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], limit: window.limit },
      ),
      this.projects.list(),
    ]);
    const names = new Map(projects.map((project) => [project.id, project.name]));
    return rows.map((row) => itemView(row, names));
  }

  /** `GET /notifications/unread-count` */
  async unreadCount(): Promise<{ count: number }> {
    return { count: await this.em.count(Notification, { userId: this.userId(), channel: 'in_app', readAt: null }) };
  }

  /** `POST /notifications/:id/read` — `read` فقط با باز شدن (۵.۲ بند ۵). */
  async read(id: string): Promise<{ id: string }> {
    const userId = this.userId();
    const now = this.clock.now();
    await this.em.transactional(async (tx) => {
      const row = await tx.findOne(Notification, { id, userId, channel: 'in_app' });
      if (!row) throw new NotFoundError('NOTIFICATION_NOT_FOUND');
      if (row.readAt) return;
      row.readAt = now;
      row.status = 'read';
    });
    return { id };
  }

  /** `POST /notifications/read-all` — فقط زبانهٔ جاری (تصمیم 1405/08/15). */
  async readAll(type: NotificationCategory | undefined): Promise<{ count: number }> {
    const userId = this.userId();
    const now = this.clock.now();
    const count = await this.em.transactional((tx) =>
      tx.nativeUpdate(Notification, { userId, channel: 'in_app', readAt: null, ...(type ? { category: type } : {}) }, { readAt: now, status: 'read' }),
    );
    return { count };
  }

  private userId(): string {
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError();
    return actor.userId;
  }
}

function itemView(row: Notification, names: ReadonlyMap<string, string>) {
  return {
    id: row.id,
    code: row.code,
    category: row.category,
    severity: row.severity ?? null,
    title: row.title,
    body: row.body,
    projectId: row.projectId ?? null,
    projectName: row.projectId ? (names.get(row.projectId) ?? null) : null,
    link: row.link,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt?.toISOString() ?? null,
    mergedCount: row.mergedCount,
  };
}
