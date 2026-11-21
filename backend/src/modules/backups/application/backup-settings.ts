import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { ConflictError, DomainError, UnauthorizedError } from '../../../platform/http/errors.js';
import { toFaDigits } from '../../../platform/http/fa.js';
import { type BackupsView, ProjectRules, type ProjectBackupsView } from '../../projects/index.js';
import { BackupSchedule, type BackupScheduleKind, ProjectBackup, ProjectExport } from '../domain/backup.entities.js';
import { sizeText } from '../domain/text.js';
import { ProjectBackups } from './project-backups.js';

// بخش «پشتیبان و خروجی» تنظیمات پروژه (W30؛ F20 ۱۲؛ تصمیم‌های 1405/08/26): برنامه با `project.settings.edit`، پشتیبان دستی
// همان‌جا، و آخرین خروجی کامل برای دارندهٔ `export.full`. تمام‌شده و بایگانی فقط‌خواندنی‌اند (AC-PS-11).

const READ_ONLY = new Set(['completed', 'archived']);
const NOTE_MAX = 200;

@Injectable()
export class BackupSettings implements ProjectBackupsView {
  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly context: AppContext,
    private readonly audit: Audit,
    private readonly rules: ProjectRules,
    private readonly backups: ProjectBackups,
  ) {}

  private actor() {
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError('AUTH_REQUIRED');
    return actor;
  }

  private can(projectId: string, code: 'export.full'): boolean {
    const access = this.context.access;
    return !!access && (access.isOrgAdmin || (access.projects.get(projectId)?.has(code) ?? false));
  }

  private async writable(projectId: string): Promise<void> {
    const { status } = await this.rules.of(projectId);
    if (READ_ONLY.has(status)) throw new ConflictError('PROJECT_READ_ONLY', { status });
  }

  /** BackupsDto فرانت؛ نبود برنامه = روزانه (پیش‌فرض سند). */
  async view(projectId: string): Promise<BackupsView> {
    const [schedule, rows, last] = await Promise.all([
      this.em.findOne(BackupSchedule, { projectId }),
      this.em.find(ProjectBackup, { projectId }, { orderBy: { createdAt: 'desc', id: 'desc' } }),
      this.can(projectId, 'export.full') ? this.em.findOne(ProjectExport, { projectId }, { orderBy: { createdAt: 'desc', id: 'desc' } }) : null,
    ]);
    const latest = rows[0];
    return {
      schedule: schedule?.schedule ?? 'daily',
      items: rows.map((row) => ({
        id: row.id,
        at: row.createdAt.toISOString(),
        sizeText: sizeText(row.sizeBytes),
        kind: row.kind,
        note: row.note ?? null,
      })),
      fullBackupSizeText: latest ? sizeText(latest.sizeBytes + latest.fileBytes) : '—',
      fullExport: last
        ? {
            id: last.id,
            status: last.status,
            includesAmounts: last.includesAmounts,
            createdAt: last.createdAt.toISOString(),
            expiresAt: last.expiresAt?.toISOString() ?? null,
            sizeText: last.sizeBytes === null || last.sizeBytes === undefined ? null : sizeText(last.sizeBytes),
            error: last.error ?? null,
          }
        : null,
    };
  }

  /** `PATCH /projects/:pid/backups {schedule}` */
  async setSchedule(projectId: string, schedule: BackupScheduleKind): Promise<BackupsView> {
    const actor = this.actor();
    await this.writable(projectId);
    await this.em.transactional(async (tx) => {
      const row = await tx.findOne(BackupSchedule, { projectId });
      const before = row?.schedule ?? 'daily';
      if (before === schedule) return;
      if (row) Object.assign(row, { schedule, updatedByUserId: actor.userId, updatedAt: this.clock.now() });
      else tx.create(BackupSchedule, { projectId, orgId: actor.orgId, schedule, updatedByUserId: actor.userId, updatedAt: this.clock.now() });
      this.audit.record(tx, {
        action: 'backup.schedule_changed',
        entityType: 'BackupSchedule',
        entityId: projectId,
        projectId,
        before: { schedule: before },
        after: { schedule },
      });
    });
    return this.view(projectId);
  }

  /** `POST /projects/:pid/backups {note}` — پیش از کار حساس؛ همان لحظه ساخته می‌شود (داده بی فایل، کوچک). */
  async manual(projectId: string, rawNote: string | undefined): Promise<BackupsView> {
    const actor = this.actor();
    const note = rawNote?.trim() ?? '';
    if (note.length > NOTE_MAX)
      throw new DomainError('BACKUP_INVALID', 422, { reason: `یادداشت پشتیبان حداکثر ${toFaDigits(NOTE_MAX)} نویسه است؛ کوتاه‌ترش کنید.` });
    await this.writable(projectId);
    await this.backups.create({ orgId: actor.orgId, projectId, kind: 'manual', runDate: null, note: note || null, userId: actor.userId });
    return this.view(projectId);
  }
}
