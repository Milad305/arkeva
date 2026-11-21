import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Clock } from '../../../platform/clock/clock.js';
import { Outbox } from '../../../platform/outbox/outbox.js';
import { DeviceQueueState } from '../domain/field.entities.js';

// ضربان صف گوشی (field-app.md ۵.۲؛ G7؛ AC-FA-08): با هر باز شدن اپ و هر تلاش همگام‌سازی. آخرین حالت هر کاربر نگه داشته
// می‌شود `[پیش‌فرض فنی]` و DeviceQueueHeartbeat برای AL-FLD-04 (برش هشدارها) منتشر می‌شود.

export interface HeartbeatInput {
  readonly queuedReports: number;
  readonly queuedPhotos: number;
  readonly queuedBytes: number;
  readonly oldestQueuedAt: Date | null;
  readonly appVersion: string | null;
  readonly lastSyncAt: Date | null;
  readonly wifiOnly: boolean;
}

@Injectable()
export class DeviceHeartbeats {
  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly outbox: Outbox,
  ) {}

  async record(user: { readonly userId: string; readonly orgId: string }, input: HeartbeatInput): Promise<{ receivedAt: string }> {
    const now = this.clock.now();
    await this.em.transactional(async (tx) => {
      await tx.upsert(
        DeviceQueueState,
        { userId: user.userId, orgId: user.orgId, ...input, receivedAt: now },
        { onConflictFields: ['userId'], onConflictAction: 'merge' },
      );
      await this.outbox.emit(tx, {
        type: 'DeviceQueueHeartbeat',
        projectId: null,
        payload: {
          v: 1,
          userId: user.userId,
          queuedReports: input.queuedReports,
          queuedPhotos: input.queuedPhotos,
          oldestQueuedAt: input.oldestQueuedAt?.toISOString() ?? null,
        },
      });
    });
    return { receivedAt: now.toISOString() };
  }

  /** آخرین حالت صف کاربران (W23)؛ بی ضربان ← ناموجود. */
  async latest(userIds: readonly string[]): Promise<Map<string, DeviceQueueState>> {
    if (userIds.length === 0) return new Map();
    const rows = await this.em.find(DeviceQueueState, { userId: { $in: [...userIds] } });
    return new Map(rows.map((row) => [row.userId, row]));
  }
}
