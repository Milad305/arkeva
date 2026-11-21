import { Injectable } from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/postgresql';
import { Clock } from '../../../platform/clock/clock.js';
import { newId } from '../../../platform/database/ids.js';
import { NotFoundError } from '../../../platform/http/errors.js';
import { autoStatus, DEFAULT_CATEGORIES } from '../domain/risk-rules.js';
import { type NoteKind, Risk, RiskAction, RiskCategory, RiskFollower, RiskNote } from '../domain/risk.entities.js';

// نوشتن‌های مشترک دفتر ریسک: قفل ردیف، کد RSK-NNN (C05)، تاریخچه، دنبال‌کننده و وضعیت خودکار.

@Injectable()
export class RiskStore {
  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
  ) {}

  async find(riskId: string, em: EntityManager = this.em): Promise<Risk> {
    const risk = await em.findOne(Risk, { id: riskId });
    if (!risk) throw new NotFoundError('RISK_NOT_FOUND');
    return risk;
  }

  async lock(tx: EntityManager, riskId: string): Promise<Risk> {
    const risk = await tx.findOne(Risk, { id: riskId }, { lockMode: LockMode.PESSIMISTIC_WRITE });
    if (!risk) throw new NotFoundError('RISK_NOT_FOUND');
    return risk;
  }

  /** `RSK-<سه رقم>` یکتا در پروژه (C05)؛ شمارنده درون همان تراکنش. */
  async nextCode(tx: EntityManager, orgId: string, projectId: string): Promise<string> {
    const rows = await tx.getConnection().execute<{ last_value: number }[]>(
      `insert into risk_counter (project_id, org_id, last_value) values (?, ?, 1)
           on conflict (project_id) do update set last_value = risk_counter.last_value + 1 returning last_value`,
      [projectId, orgId],
      'all',
      tx.getTransactionContext(),
    );
    return `RSK-${String(rows[0]?.last_value ?? 1).padStart(3, '0')}`;
  }

  /** کد بعدی برای W44 بی رزرو (درون تراکنش تا متغیر RLS تنظیم باشد). */
  async peekCode(projectId: string): Promise<string> {
    const rows = await this.em.transactional((tx) =>
      tx
        .getConnection()
        .execute<{ last_value: number }[]>('select last_value from risk_counter where project_id = ?', [projectId], 'all', tx.getTransactionContext()),
    );
    return `RSK-${String((rows[0]?.last_value ?? 0) + 1).padStart(3, '0')}`;
  }

  note(tx: EntityManager, risk: Risk, kind: NoteKind, text: string, authorUserId: string, mentioned: readonly string[] = []): RiskNote {
    return tx.create(RiskNote, {
      id: newId(),
      orgId: risk.orgId,
      riskId: risk.id,
      kind,
      text,
      authorUserId,
      attachmentKeys: [],
      mentionedUserIds: [...mentioned],
      createdAt: this.clock.now(),
    });
  }

  async follow(tx: EntityManager, risk: Risk, userIds: readonly string[]): Promise<void> {
    // ردیف ریسک تازه باید پیش از درج خام دنبال‌کننده در پایگاه داده باشد
    await tx.flush();
    for (const userId of new Set(userIds)) {
      await tx
        .getConnection()
        .execute(
          'insert into risk_follower (risk_id, user_id, org_id, created_at) values (?, ?, ?, ?) on conflict do nothing',
          [risk.id, userId, risk.orgId, this.clock.now()],
          'run',
          tx.getTransactionContext(),
        );
    }
  }

  async followers(riskId: string, em: EntityManager = this.em): Promise<string[]> {
    return (await em.find(RiskFollower, { riskId })).map((row) => row.userId);
  }

  /** assessed ↔ in_action خودکار پس از هر تغییر امتیاز یا اقدام (AC-RK-06). */
  async refreshStatus(tx: EntityManager, risk: Risk): Promise<void> {
    const actions = await tx.find(RiskAction, { riskId: risk.id }, { fields: ['status'] });
    risk.status = autoStatus(risk.status, risk.score !== null && risk.score !== undefined, actions);
  }

  /** دسته‌های فعال سازمان؛ پیش‌فرض‌ها هنگام نخستین خواندن (۵.۹؛ تصمیم 1405/08/25). */
  async categories(orgId: string): Promise<string[]> {
    let rows = await this.em.find(RiskCategory, {}, { orderBy: { sortOrder: 'asc' } });
    if (rows.length === 0) {
      try {
        await this.em.transactional((tx) => {
          DEFAULT_CATEGORIES.forEach((name, index) =>
            tx.create(RiskCategory, { id: newId(), orgId, name, isActive: true, sortOrder: index, createdAt: this.clock.now() }),
          );
          return Promise.resolve();
        });
      } catch {
        // درخواست هم‌زمان دیگری همین پیش‌فرض‌ها را ساخت
      }
      rows = await this.em.find(RiskCategory, {}, { orderBy: { sortOrder: 'asc' }, refresh: true });
    }
    return rows.filter((row) => row.isActive).map((row) => row.name);
  }
}
