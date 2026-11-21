import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { newId } from '../../../platform/database/ids.js';
import { DomainError, NotFoundError } from '../../../platform/http/errors.js';
import { Outbox } from '../../../platform/outbox/outbox.js';
import { fileKey, ObjectStorage } from '../../../platform/storage/object-storage.js';
import { FieldRecords } from '../../field/index.js';
import { type DraftState, PlanningService, pruneLinks, ScheduleProposals } from '../../planning/index.js';
import { ProjectMspFlag, ProjectPlanState, ProjectRules } from '../../projects/index.js';
import { WbsDraftService } from '../../wbs/index.js';
import { ExternalIdMap, MspLink, MspSyncChange, MspSyncSession } from '../domain/msp.entities.js';
import { MspFileError, readMspUpload } from '../domain/mspdi.js';
import { applySync } from '../domain/sync-apply.js';
import { activeTasks, diffFile, matchItems } from '../domain/sync-diff.js';
import type { UploadedFile } from './import-sessions.js';
import { MspAccess, mspConflict, mspInvalid } from './msp-access.js';
import { SyncViews } from './sync-views.js';

// همگام‌سازی W36 (msp-integration.md ۷.۳؛ AC-MS-06، ۰۷، ۰۸، ۱۰، ۱۱، ۱۲). تحلیل در همان درخواست؛ اعمال یک بازنگری `msp_sync`
// (R‹n›) با مسیر مالک نسخه (planning.applyRevision) و اعتبارسنجی WBS؛ مبنا دست‌نخورده.

const OPEN_ITEMS = ['submitted', 'stage1', 'stage2', 'needs_revision', 'needs_resolution'] as const;

@Injectable()
export class SyncSessions {
  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly audit: Audit,
    private readonly outbox: Outbox,
    private readonly storage: ObjectStorage,
    private readonly access: MspAccess,
    private readonly rules: ProjectRules,
    private readonly planState: ProjectPlanState,
    private readonly planning: PlanningService,
    private readonly proposals: ScheduleProposals,
    private readonly wbs: WbsDraftService,
    private readonly records: FieldRecords,
    private readonly flag: ProjectMspFlag,
    private readonly views: SyncViews,
  ) {}

  private async session(id: string, em: EntityManager = this.em): Promise<MspSyncSession> {
    const session = await em.findOne(MspSyncSession, { id });
    if (!session) throw new NotFoundError('MSP_SESSION_NOT_FOUND');
    this.access.require(session.projectId, 'msp.sync', 'MSP_SESSION_NOT_FOUND');
    return session;
  }

  /** `POST /projects/:pid/msp/syncs` */
  async create(projectId: string, upload: UploadedFile | undefined) {
    const { actor } = this.access.actor();
    const project = await this.rules.of(projectId);
    if (project.status === 'draft') throw mspConflict('پروژهٔ پیش‌نویس با «ورود از MSP» ساخته می‌شود؛ همگام‌سازی برای پروژهٔ فعال است.');
    if (project.status !== 'active' && project.status !== 'paused') throw mspConflict('پروژهٔ بسته یا بایگانی‌شده همگام‌سازی نمی‌شود.');
    if (!upload) throw new DomainError('MSP_FILE_INVALID', 422, { reason: 'فایلی نرسید. فایل XML را دوباره انتخاب کنید.' });
    let file;
    try {
      file = readMspUpload(upload);
    } catch (error) {
      if (error instanceof MspFileError) throw new DomainError('MSP_FILE_INVALID', /حجم/.test(error.message) ? 413 : 422, { reason: error.message });
      throw error;
    }
    const id = newId();
    const storageKey = fileKey(actor.orgId, projectId, 'import', id);
    // نسخهٔ فایل هر همگام‌سازی همیشه نگه داشته می‌شود (۱۱)
    await this.storage.put(storageKey, upload.buffer, 'application/xml');
    const state = await this.planState.state(projectId);
    const session = await this.em.transactional(async (tx) => {
      const now = this.clock.now();
      // بارگذاری تازه جلسهٔ بررسی قبلی را کنار می‌گذارد (`[پیش‌فرض فنی]`؛ ۱۲ «دو بارگذاری»)
      await tx.nativeUpdate(MspSyncSession, { projectId, status: 'review' }, { status: 'cancelled', updatedAt: now });
      const created = tx.create(MspSyncSession, {
        id,
        orgId: actor.orgId,
        projectId,
        fileName: upload.originalname,
        storageKey,
        fileSize: upload.size,
        status: state.draft ? 'blocked' : 'review',
        // AC-MS-12
        blockedReason: state.draft ? 'یک نسخهٔ کاری دستی باز است. اول آن را اعمال یا کنار بگذارید تا تغییرهای MSP روی برنامهٔ جاری مقایسه شود.' : null,
        analysis: file,
        baseVersionId: state.current?.id ?? null,
        resultVersionId: null,
        appliedAt: null,
        createdByUserId: actor.userId,
        createdAt: now,
        updatedAt: now,
      });
      await tx.flush();
      if (!state.draft) await this.compare(tx, created);
      return created;
    });
    return this.views.session(session);
  }

  private async compare(tx: EntityManager, session: MspSyncSession): Promise<void> {
    const [current, ids, link, approved] = await Promise.all([
      this.planning.currentContent(session.projectId),
      tx.find(ExternalIdMap, { system: 'msp', projectId: session.projectId, entityType: 'wbs_item' }),
      tx.findOne(MspLink, { projectId: session.projectId }),
      this.records.items(tx, { projectId: session.projectId, statuses: ['approved'] }),
    ]);
    const lastSynced = link?.lastSyncedVersionId ? await this.planning.versionContent(link.lastSyncedVersionId) : null;
    const changes = diffFile({
      current: current.wbs,
      uidOf: new Map(ids.map((row) => [row.entityId, Number(row.externalId)])),
      file: session.analysis,
      lastFile: link?.lastAnalysis ?? null,
      lastSynced: lastSynced ? new Map(lastSynced.wbs.map((node) => [node.id, node])) : null,
      approvedLeaves: new Set(approved.map((item) => item.wbsItemId)),
    });
    changes.forEach((change, index) =>
      tx.create(MspSyncChange, {
        id: newId(),
        orgId: session.orgId,
        sessionId: session.id,
        sortOrder: index,
        direction: 'inbound',
        changeType: change.kind,
        wbsItemId: change.wbsItemId,
        mspUid: change.uid === null ? null : String(change.uid),
        code: change.code,
        title: change.title,
        field: change.field,
        projeyarValue: change.projeyarValue ?? null,
        mspValue: change.mspValue ?? null,
        selected: change.selected,
        resolution: null,
        hasApprovedReports: change.hasApprovedReports,
      }),
    );
  }

  /** `GET /msp/syncs/:id/changes` */
  async get(id: string) {
    return this.views.session(await this.session(id));
  }

  /** `PATCH /msp/syncs/:id/changes/:cid {selected, resolution}` */
  async updateChange(id: string, changeId: string, input: { readonly selected?: boolean; readonly resolution?: 'keep_projeyar' | 'accept_msp' }) {
    const session = await this.em.transactional(async (tx) => {
      const session = await this.session(id, tx);
      if (session.status !== 'review') throw mspConflict('این همگام‌سازی دیگر قابل ویرایش نیست.');
      const change = await tx.findOne(MspSyncChange, { id: changeId, sessionId: id });
      if (!change) throw new NotFoundError('MSP_SESSION_NOT_FOUND');
      if (input.resolution && change.changeType !== 'conflict') throw mspInvalid('تعیین تکلیف فقط برای تعارض است.');
      if (input.selected !== undefined) change.selected = input.selected;
      if (input.resolution) change.resolution = input.resolution;
      return session;
    });
    return this.views.session(session);
  }

  /** `PATCH /msp/syncs/:id/changes {selected}` — همه؛ حذف‌ها با «انتخاب همه» انتخاب نمی‌شوند (W36). */
  async selectAll(id: string, selected: boolean) {
    const session = await this.em.transactional(async (tx) => {
      const session = await this.session(id, tx);
      if (session.status !== 'review') throw mspConflict('این همگام‌سازی دیگر قابل ویرایش نیست.');
      await tx.nativeUpdate(MspSyncChange, { sessionId: id, ...(selected ? { changeType: { $ne: 'delete' } } : {}) }, { selected });
      return session;
    });
    return this.views.session(session);
  }

  /** `POST /msp/syncs/:id/apply {reweight}` (AC-MS-07، AC-MS-08، AC-MS-11). */
  async apply(id: string, input: { readonly reweight: boolean }) {
    const session = await this.session(id);
    if (session.status === 'blocked') throw mspConflict(session.blockedReason ?? 'همگام‌سازی مسدود است.');
    if (session.status !== 'review') throw mspConflict('این همگام‌سازی پیش‌تر اعمال یا کنار گذاشته شده است.');
    const rows = await this.em.find(MspSyncChange, { sessionId: id, selected: true }, { orderBy: { sortOrder: 'asc' } });
    if (rows.some((row) => row.changeType === 'conflict' && !row.resolution)) {
      throw mspInvalid('تعارض‌ها باید تعیین تکلیف شوند: «نگه‌داشتن پروژه‌یار» یا «پذیرش فایل MSP».');
    }
    if (rows.length === 0) throw mspInvalid('هیچ تغییری انتخاب نشده است.');
    const tasks = activeTasks(session.analysis);
    const taskByUid = new Map(tasks.map((task) => [task.uid, task]));
    let result = { appliedCount: 0, added: [] as { wbsItemId: string; uid: number }[], removed: [] as string[], uidOf: new Map<string, number>() };
    const applied = await this.planning.applyRevision(
      session.projectId,
      { note: `همگام‌سازی با فایل ${session.fileName}`, source: 'msp_sync' },
      async ({ project, current }) => {
        const ids = await this.em.find(ExternalIdMap, { system: 'msp', projectId: session.projectId, entityType: 'wbs_item' });
        const uidOf = matchItems(current.wbs, new Map(ids.map((row) => [row.entityId, Number(row.externalId)])), tasks);
        const plan = applySync({
          current: current.wbs.map(({ supervisorUserId: _s, statusNote: _n, ...node }) => node),
          changes: rows.map((row) => ({
            kind: row.changeType,
            wbsItemId: row.wbsItemId ?? null,
            field: row.field as never,
            mspValue: row.mspValue,
            resolution: row.resolution ?? null,
          })),
          uidOf,
          fileMeta: new Map(tasks.map((task) => [task.uid, { critical: task.critical, totalSlackDays: task.totalSlackDays }])),
          reweight: input.reweight,
          newId,
        });
        result = { appliedCount: plan.appliedCount, added: plan.added, removed: plan.removed, uidOf };
        const links = pruneLinks({ wbs: plan.wbs, cbs: current.cbs, links: current.links });
        const state: DraftState = {
          project,
          draft: null,
          current: current.wbs,
          nodes: plan.wbs,
          currentCbs: current.cbs,
          cbs: current.cbs,
          currentLinks: current.links,
          links,
        };
        const assessed = this.wbs.assess(state);
        if (assessed.changeCount === 0) throw mspInvalid('تغییرهای انتخاب‌شده برنامه را عوض نمی‌کنند.');
        const error = assessed.validation.errors[0]?.message ?? null;
        return {
          content: assessed.content,
          verdict: {
            error: error
              ? `برنامه پس از همگام‌سازی خطا می‌گیرد: ${error}${input.reweight ? '' : ' «پخش دوبارهٔ وزن» را روشن کنید یا وزن‌ها را اصلاح کنید.'}`
              : null,
            changeCount: assessed.changeCount,
            summary: { added: plan.added.length, removed: plan.removed.length, changed: plan.appliedCount },
            plannedStart: project.plannedStart,
            plannedFinish: project.plannedFinish,
          },
        };
      },
      async (tx, version) => this.afterApply(tx, session, version, result, taskByUid),
    );
    // مصرف‌کنندهٔ PlanVersionApplied (approvals) آیتم‌های در صفِ برگ حذف‌شده را needs_resolution می‌کند (AC-MS-11)
    const needsResolution = await this.openItemsOn(session.projectId, result.removed);
    return { versionId: applied.versionId, number: applied.number, appliedCount: result.appliedCount, needsResolution };
  }

  private async afterApply(
    tx: EntityManager,
    session: MspSyncSession,
    version: { readonly versionId: string; readonly number: number },
    result: { appliedCount: number; added: { wbsItemId: string; uid: number }[]; removed: string[]; uidOf: Map<string, number> },
    taskByUid: ReadonlyMap<number, { start: string; finish: string; isMilestone: boolean; durationDays: number }>,
  ): Promise<void> {
    const now = this.clock.now();
    const projectId = session.projectId;
    // نگاشت UID: نخستین اتصال با کد همه را می‌نویسد؛ حذف‌شده‌ها کنار می‌روند
    await tx.nativeDelete(ExternalIdMap, { system: 'msp', projectId, entityType: 'wbs_item' });
    const removed = new Set(result.removed);
    for (const [wbsItemId, uid] of [
      ...[...result.uidOf].filter(([itemId]) => !removed.has(itemId)),
      ...result.added.map((entry) => [entry.wbsItemId, entry.uid] as const),
    ]) {
      tx.create(ExternalIdMap, {
        id: newId(),
        orgId: session.orgId,
        system: 'msp',
        entityType: 'wbs_item',
        entityId: wbsItemId,
        projectId,
        externalId: String(uid),
        createdAt: now,
      });
    }
    const link = await tx.findOne(MspLink, { projectId });
    const fields = {
      status: 'connected' as const,
      lastFileName: session.fileName,
      lastStorageKey: session.storageKey,
      lastSyncAt: now,
      lastAnalysis: session.analysis,
      lastSyncedVersionId: version.versionId,
    };
    if (link) Object.assign(link, fields);
    else tx.create(MspLink, { projectId, orgId: session.orgId, mappingTemplateId: null, ...fields, createdAt: now, updatedAt: now });
    await this.flag.setLinked(tx, projectId, true);

    // ۷.۳ بند ۶: پیشنهادها با مقدار فایل
    const fileValues = new Map<string, { plannedStart: string | null; plannedFinish: string | null }>();
    for (const [itemId, uid] of [...result.uidOf, ...result.added.map((entry) => [entry.wbsItemId, entry.uid] as const)]) {
      const task = taskByUid.get(uid);
      if (task && !removed.has(itemId))
        fileValues.set(itemId, { plannedStart: task.start, plannedFinish: task.isMilestone || task.durationDays === 0 ? task.start : task.finish });
    }
    const proposals = await this.proposals.resolveWithFile(tx, projectId, fileValues);

    const locked = await tx.findOneOrFail(MspSyncSession, { id: session.id });
    Object.assign(locked, { status: 'applied', resultVersionId: version.versionId, appliedAt: now, updatedAt: now });
    await this.outbox.emit(tx, {
      type: 'SyncSessionApplied',
      projectId,
      payload: { v: 1, sessionId: session.id, versionId: version.versionId, number: version.number, appliedCount: result.appliedCount, ...proposals },
    });
    this.audit.record(tx, {
      action: 'msp.sync_applied',
      entityType: 'MspSyncSession',
      entityId: session.id,
      projectId,
      after: { number: version.number, appliedCount: result.appliedCount, added: result.added.length, removed: result.removed.length },
    });
  }

  private async openItemsOn(projectId: string, wbsItemIds: readonly string[]): Promise<number> {
    return wbsItemIds.length === 0 ? 0 : (await this.records.items(this.em, { projectId, wbsItemIds, statuses: OPEN_ITEMS })).length;
  }
}
