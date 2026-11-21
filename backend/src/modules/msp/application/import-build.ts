import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { newId } from '../../../platform/database/ids.js';
import { toFaDigits } from '../../../platform/http/fa.js';
import { Outbox } from '../../../platform/outbox/outbox.js';
import { tehranClock } from '../../../platform/scheduler/ticks.js';
import { OpeningProgress } from '../../field/index.js';
import { BaselineReplacer, MILESTONE_GROUP_TITLE, type PlanNode, PlanningService, type PlanVersionSource } from '../../planning/index.js';
import { ProjectMspFlag, ProjectRules } from '../../projects/index.js';
import { Assignments } from '../../team/index.js';
import { blockingOf } from '../domain/checks.js';
import { ExternalIdMap, FieldMappingTemplate, MspImportSession, MspLink } from '../domain/msp.entities.js';
import type { PlanContentSnapshot } from '../domain/snapshot.js';
import { DEFAULT_TEMPLATE_NAME, ImportViews } from './import-views.js';
import { MspAccess, mspConflict, mspInvalid } from './msp-access.js';

// ساخت و بازگردانی ورود MSP (W49؛ msp-integration.md ۷.۱ گام ۳، ۷.۲) — هر کدام یک تراکنش.

export const ROLLBACK_WINDOW_MS = 30 * 60_000;

/** گروه «نقاط عطف کلیدی» ویزارد پس از فازهای فایل می‌ماند؛ کدش بعد از بزرگ‌ترین کد سطح اول تا با کدهای فایل برخورد نکند. */
function keptMilestones(previous: readonly PlanNode[], fileRoots: readonly PlanNode[]): PlanNode[] {
  const group = previous.find((node) => node.parentId === null && node.title === MILESTONE_GROUP_TITLE);
  if (!group) return [];
  const next = fileRoots.reduce((max, node) => Math.max(max, Number.parseInt(node.code, 10) || 0), 0) + 1;
  const children = previous.filter((node) => node.parentId === group.id);
  return [
    { ...group, code: String(next), codeMode: 'custom', sortOrder: fileRoots.length, weightInParent: '0.0000' },
    ...children.map((node, index) => ({ ...node, code: `${next}.${index + 1}`, codeMode: 'custom' as const, weightInParent: '0.0000' })),
  ];
}

const bySupervisor = (pairs: Iterable<[string, string]>) => {
  const groups = new Map<string, string[]>();
  for (const [itemId, userId] of pairs) groups.set(userId, [...(groups.get(userId) ?? []), itemId]);
  return groups;
};

@Injectable()
export class ImportBuild {
  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly audit: Audit,
    private readonly outbox: Outbox,
    private readonly access: MspAccess,
    private readonly views: ImportViews,
    private readonly planning: PlanningService,
    private readonly baseline: BaselineReplacer,
    private readonly rules: ProjectRules,
    private readonly assignments: Assignments,
    private readonly opening: OpeningProgress,
    private readonly flag: ProjectMspFlag,
  ) {}

  /** `POST /msp/imports/:id/build` (AC-MS-01، AC-MS-05). */
  async build(id: string, input: { readonly openingProgress: readonly { readonly id: string; readonly percent: number; readonly selected: boolean }[] }) {
    const { actor } = this.access.actor();
    return this.em.transactional(async (tx) => {
      const session = await this.access.session(id, tx);
      if (session.status === 'built') throw mspConflict('این ورود پیش‌تر ساخته شده است.');
      if (session.status !== 'validated') throw mspConflict('این ورود بازگردانده شده است؛ فایل را دوباره بارگذاری کنید.');
      const block = blockingOf(session.checks);
      if (!block.canContinue) throw mspInvalid(block.reason ?? 'خطاهای فایل باید تعیین تکلیف شوند.');
      const project = await this.rules.of(session.projectId, tx);
      if (project.status !== 'draft') throw mspConflict('ساخت از فایل فقط برای پروژهٔ پیش‌نویس است.');
      const now = this.clock.now();
      const today = tehranClock(now).date;
      const workDate = session.analysis.statusDate ?? today;
      if (workDate > today) throw mspInvalid('Status Date فایل در آینده است؛ در MS Project آن را درست کنید و فایل را دوباره بارگذاری کنید.');

      const plan = this.views.plan(session, newId);
      const allowed = new Map(this.views.openingRows(session, plan).map((row) => [row.id, row]));
      const entries: { wbsItemId: string; percent: number }[] = [];
      for (const row of input.openingProgress) {
        if (!row.selected || !allowed.has(row.id)) continue;
        if (!Number.isFinite(row.percent) || row.percent < 0 || row.percent > 100) throw mspInvalid(`درصد پیشرفت اولیهٔ ${row.id} باید بین ۰ و ۱۰۰ باشد.`);
        const leaf = plan.leaves.get(row.id);
        if (leaf) entries.push({ wbsItemId: leaf.id, percent: row.percent });
      }

      const current = await this.planning.currentContent(session.projectId);
      const previous: Omit<PlanContentSnapshot, 'source'> = {
        wbs: current.wbs.map(({ supervisorUserId: _s, statusNote: _n, ...node }) => node),
        cbs: [...current.cbs],
        links: [...current.links],
        supervisors: Object.fromEntries(current.wbs.flatMap((node) => (node.supervisorUserId ? [[node.id, node.supervisorUserId]] : []))),
      };
      const roots = plan.wbs.filter((node) => node.parentId === null);
      const content = { wbs: [...plan.wbs, ...keptMilestones(previous.wbs, roots)], cbs: plan.cbs, links: plan.links };
      const { versionId, previousSource } = await this.baseline.replaceBaseline(tx, {
        projectId: session.projectId,
        content,
        source: 'msp_import',
        actorUserId: actor.userId,
      });
      await this.assignments.assignImported(tx, session.projectId, bySupervisor(plan.supervisors));

      await tx.nativeDelete(ExternalIdMap, { system: 'msp', projectId: session.projectId, entityType: 'wbs_item' });
      for (const entry of plan.uids) {
        tx.create(ExternalIdMap, {
          id: newId(),
          orgId: session.orgId,
          system: 'msp',
          entityType: 'wbs_item',
          entityId: entry.wbsItemId,
          projectId: session.projectId,
          externalId: String(entry.uid),
          createdAt: now,
        });
      }
      const template = await this.saveTemplate(tx, session);
      const link = await tx.findOne(MspLink, { projectId: session.projectId });
      const linkFields = {
        status: 'connected' as const,
        lastFileName: session.fileName,
        lastStorageKey: session.storageKey,
        lastSyncAt: now,
        mappingTemplateId: template,
        lastAnalysis: session.analysis,
        lastSyncedVersionId: versionId,
      };
      if (link) Object.assign(link, linkFields);
      else tx.create(MspLink, { projectId: session.projectId, orgId: session.orgId, ...linkFields, createdAt: now, updatedAt: now });
      await this.flag.setLinked(tx, session.projectId, true);

      const reportId = await this.opening.create(tx, { orgId: session.orgId, projectId: session.projectId, workDate, entries });
      const deadline = new Date(now.getTime() + ROLLBACK_WINDOW_MS);
      Object.assign(session, {
        status: 'built',
        builtAt: now,
        builtVersionId: versionId,
        rollbackDeadline: deadline,
        previousContent: { ...previous, source: previousSource },
        openingReportId: reportId,
        updatedAt: now,
      });
      await this.outbox.emit(tx, {
        type: 'ImportBuilt',
        projectId: session.projectId,
        payload: { v: 1, sessionId: session.id, versionId, itemCount: plan.wbs.length, openingItems: entries.length },
      });
      this.audit.record(tx, {
        action: 'msp.import_built',
        entityType: 'MspImportSession',
        entityId: session.id,
        projectId: session.projectId,
        after: { fileName: session.fileName, itemCount: plan.wbs.length, openingItems: entries.length },
      });
      return {
        projectId: session.projectId,
        itemCount: plan.wbs.length,
        leafCount: plan.leaves.size,
        cbsItemCount: plan.cbs.filter((node) => node.isLeaf).length,
        openingItems: entries.length,
        versionLabel: `مبنا (Rev${toFaDigits(0)})`,
        rollbackUntil: deadline.toISOString(),
      };
    });
  }

  /** `POST /msp/imports/:id/rollback` — تا ۳۰ دقیقه و بی هیچ گزارش جز پیشرفت اولیه (AC-MS-04). */
  async rollback(id: string) {
    const { actor } = this.access.actor();
    const session = await this.em.transactional(async (tx) => {
      const session = await this.access.session(id, tx);
      if (session.status !== 'built' || !session.rollbackDeadline || !session.previousContent) throw mspConflict('هنوز چیزی ساخته نشده است.');
      const now = this.clock.now();
      if (now.getTime() > session.rollbackDeadline.getTime()) throw mspConflict('پنجرهٔ ۳۰ دقیقه‌ای بازگردانی گذشته است. ساختار را از صفحهٔ WBS ویرایش کنید.');
      if ((await this.opening.otherReports(tx, session.projectId, session.openingReportId ?? null)) > 0) {
        throw mspConflict('پس از ساخت، گزارش کارگاه ثبت شده است و بازگردانی دیگر ممکن نیست. ساختار را از صفحهٔ WBS ویرایش کنید.');
      }
      if (session.openingReportId) await this.opening.remove(tx, session.openingReportId);
      const previous = session.previousContent;
      await this.baseline.replaceBaseline(tx, {
        projectId: session.projectId,
        content: { wbs: previous.wbs, cbs: previous.cbs, links: previous.links },
        source: previous.source as PlanVersionSource,
        actorUserId: actor.userId,
      });
      await this.assignments.assignImported(tx, session.projectId, bySupervisor(Object.entries(previous.supervisors)));
      await tx.nativeDelete(ExternalIdMap, { system: 'msp', projectId: session.projectId, entityType: 'wbs_item' });
      await tx.nativeDelete(MspLink, { projectId: session.projectId });
      await this.flag.setLinked(tx, session.projectId, false);
      Object.assign(session, { status: 'rolled_back', rollbackDeadline: null, openingReportId: null, updatedAt: now });
      await this.outbox.emit(tx, { type: 'ImportRolledBack', projectId: session.projectId, payload: { v: 1, sessionId: session.id } });
      this.audit.record(tx, { action: 'msp.import_rolled_back', entityType: 'MspImportSession', entityId: session.id, projectId: session.projectId });
      return session;
    });
    return this.views.session(session);
  }

  /** «به‌روزرسانی الگو» (۷.۱ گام ۲): الگوی پیش‌فرض سازمان؛ بی `msp.templates.manage` نادیده (تصمیم کاربر 1405/08/26). */
  private async saveTemplate(tx: EntityManager, session: MspImportSession): Promise<string | null> {
    const existing = await tx.findOne(FieldMappingTemplate, { isDefault: true });
    if (!session.saveTemplate || !this.access.canManageTemplates()) return existing?.id ?? null;
    const mappings = session.mapping.map((row) => ({ mspField: row.mspField, projeyarField: row.target }));
    const now = this.clock.now();
    if (existing) {
      const merged = new Map(existing.mappings.map((entry) => [entry.mspField, entry]));
      for (const entry of mappings) merged.set(entry.mspField, entry);
      Object.assign(existing, { mappings: [...merged.values()], updatedAt: now });
      return existing.id;
    }
    const created = tx.create(FieldMappingTemplate, {
      id: newId(),
      orgId: session.orgId,
      name: DEFAULT_TEMPLATE_NAME,
      mappings,
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    });
    return created.id;
  }
}
