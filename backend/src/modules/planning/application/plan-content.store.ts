import { Injectable } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/postgresql';
import { cbsLeafBudget, linkSubBudget } from '../../computation/index.js';
import type { ProjectPlanContext } from '../../projects/index.js';
import { planColumns } from '../domain/plan-columns.js';
import { type CbsNode, cbsNodeOf, type LinkNode, linkNodeOf, type PlanNode, planNodeOf } from '../domain/plan-node.js';
import { CbsItem, CbsItemPlan, type PlanVersion, WbsCbsLink, WbsCbsLinkPlan, WbsItem, WbsItemPlan } from '../domain/plan.entities.js';

// محتوای نسخهٔ برنامه (D05): WBS، CBS و اتصال‌ها — خواندن و نوشتن عکس نسخه و جدول‌های جاری. همه به‌روزرسانی درجا
// (نه حذف و درج دوباره با همان کلید؛ README ۶). قید اتصال (cbs.md ۵.۱): فقط برگ WBS غیرنقطهٔ عطف ↔ برگ CBS.

export interface CurrentItem extends PlanNode {
  readonly supervisorUserId: string | null;
  readonly statusNote: string | null;
}

export interface PlanContent {
  readonly wbs: readonly PlanNode[];
  readonly cbs: readonly CbsNode[];
  readonly links: readonly LinkNode[];
}

export interface CurrentContent extends PlanContent {
  readonly wbs: readonly CurrentItem[];
}

/** اتصالی که دو سرش برگ معتبر نیست کنار می‌رود (حذف برگ، برگ ← والد؛ cbs.md ۱۵.۵). */
export function pruneLinks(content: PlanContent): LinkNode[] {
  const wbsLeaves = new Set(content.wbs.filter((node) => node.isLeaf && !node.isMilestone).map((node) => node.id));
  const cbsLeaves = new Set(content.cbs.filter((node) => node.isLeaf).map((node) => node.id));
  const seen = new Set<string>();
  return content.links.filter((link) => {
    const key = `${link.wbsItemId}|${link.cbsItemId}`;
    if (seen.has(key) || !wbsLeaves.has(link.wbsItemId) || !cbsLeaves.has(link.cbsItemId)) return false;
    seen.add(key);
    return true;
  });
}

/** BAC هر برگ WBS = Σ زیربودجهٔ اتصال‌ها (ب6؛ OD-13). */
export function leafBacOf(content: PlanContent): Map<string, bigint> {
  const cbs = new Map(content.cbs.map((node) => [node.id, node]));
  const bac = new Map<string, bigint>();
  for (const link of content.links) {
    const item = cbs.get(link.cbsItemId);
    if (!item) continue;
    bac.set(link.wbsItemId, (bac.get(link.wbsItemId) ?? 0n) + linkSubBudget(item, link));
  }
  return bac;
}

const cbsColumns = (node: CbsNode) => ({
  parentId: node.parentId,
  code: node.code,
  title: node.title,
  sortOrder: node.sortOrder,
  isLeaf: node.isLeaf,
  costType: node.costType,
  unit: node.unit,
  estimatedQuantity: node.estimatedQuantity,
  pricingMode: node.pricingMode,
  unitRate: node.unitRate,
  lumpSumAmount: node.lumpSumAmount,
  supplierNote: node.supplierNote,
});

const linkKey = (link: { wbsItemId: string; cbsItemId: string }) => `${link.wbsItemId}|${link.cbsItemId}`;

@Injectable()
export class PlanContentStore {
  /** ردیف یک قلم CBS در هر نسخهٔ داده‌شده، به همان ترتیب — تاریخچهٔ نرخ (cbs.md ۷.۴؛ D01). */
  async cbsItemHistory(
    em: EntityManager,
    versions: readonly PlanVersion[],
    cbsItemId: string,
  ): Promise<{ readonly version: PlanVersion; readonly item: CbsNode }[]> {
    if (versions.length === 0) return [];
    const rows = await em.find(CbsItemPlan, { cbsItemId, planVersionId: { $in: versions.map((version) => version.id) } });
    const byVersion = new Map(rows.map((row) => [row.planVersionId, cbsNodeOf(row)]));
    return versions.flatMap((version) => {
      const item = byVersion.get(version.id);
      return item ? [{ version, item }] : [];
    });
  }

  async current(em: EntityManager, projectId: string): Promise<CurrentContent> {
    const [wbs, cbs, links] = await Promise.all([
      em.find(WbsItem, { projectId, removedAt: null }),
      em.find(CbsItem, { projectId, removedAt: null }),
      em.find(WbsCbsLink, { projectId }),
    ]);
    return {
      wbs: wbs.map((row) => ({ ...planNodeOf(row), supervisorUserId: row.supervisorUserId ?? null, statusNote: row.statusNote ?? null })),
      cbs: cbs.map(cbsNodeOf),
      links: links.map(linkNodeOf),
    };
  }

  async ofVersion(em: EntityManager, versionId: string): Promise<PlanContent> {
    const [wbs, cbs, links] = await Promise.all([
      em.find(WbsItemPlan, { planVersionId: versionId }),
      em.find(CbsItemPlan, { planVersionId: versionId }),
      em.find(WbsCbsLinkPlan, { planVersionId: versionId }),
    ]);
    return { wbs: wbs.map(planNodeOf), cbs: cbs.map(cbsNodeOf), links: links.map(linkNodeOf) };
  }

  /** عکس نسخه ← محتوا (اتصال‌ها پاک‌سازی‌شده؛ BAC برگ و زیربودجهٔ اتصال عکس گرفته می‌شود). */
  async writeVersion(tx: EntityManager, version: PlanVersion, content: PlanContent): Promise<void> {
    const links = pruneLinks(content);
    const bac = leafBacOf({ ...content, links });
    const cbsById = new Map(content.cbs.map((node) => [node.id, node]));

    const wbsRows = await tx.find(WbsItemPlan, { planVersionId: version.id });
    const wbsById = new Map(wbsRows.map((row) => [row.wbsItemId, row]));
    const keepWbs = new Set(content.wbs.map((node) => node.id));
    for (const row of wbsRows) if (!keepWbs.has(row.wbsItemId)) tx.remove(row);
    for (const node of content.wbs) {
      const values = { ...planColumns(node), bac: (bac.get(node.id) ?? 0n).toString() };
      const row = wbsById.get(node.id);
      if (row) Object.assign(row, values);
      else tx.create(WbsItemPlan, { planVersionId: version.id, wbsItemId: node.id, orgId: version.orgId, projectId: version.projectId, ...values });
    }

    const cbsRows = await tx.find(CbsItemPlan, { planVersionId: version.id });
    const cbsRowById = new Map(cbsRows.map((row) => [row.cbsItemId, row]));
    const keepCbs = new Set(content.cbs.map((node) => node.id));
    for (const row of cbsRows) if (!keepCbs.has(row.cbsItemId)) tx.remove(row);
    for (const node of content.cbs) {
      const row = cbsRowById.get(node.id);
      if (row) Object.assign(row, cbsColumns(node));
      else tx.create(CbsItemPlan, { planVersionId: version.id, cbsItemId: node.id, orgId: version.orgId, projectId: version.projectId, ...cbsColumns(node) });
    }

    const linkRows = await tx.find(WbsCbsLinkPlan, { planVersionId: version.id });
    const linkRowByKey = new Map(linkRows.map((row) => [linkKey(row), row]));
    const keepLinks = new Set(links.map(linkKey));
    for (const row of linkRows) if (!keepLinks.has(linkKey(row))) tx.remove(row);
    for (const link of links) {
      const item = cbsById.get(link.cbsItemId);
      const values = { quantity: link.quantity, allocatedAmount: link.allocatedAmount, subBudget: (item ? linkSubBudget(item, link) : 0n).toString() };
      const row = linkRowByKey.get(linkKey(link));
      if (row) Object.assign(row, values);
      else
        tx.create(WbsCbsLinkPlan, {
          planVersionId: version.id,
          wbsItemId: link.wbsItemId,
          cbsItemId: link.cbsItemId,
          orgId: version.orgId,
          projectId: version.projectId,
          ...values,
        });
    }
  }

  /**
   * جدول‌های جاری ← محتوا (F04 ۵.۳ گام ۶). سرپرست و یادداشت وضعیت دست نمی‌خورند؛ فقط سرپرست آیتم حذف‌شده پاک می‌شود.
   * با `removedInVersionId` حذف نرم آیتم‌ها (پروژهٔ فعال)، بی آن حذف سخت (پیش‌نویس؛ wbs.md ۵.۶). اتصال جاری بی تاریخچه است
   * (تاریخچه در عکس نسخه‌ها).
   */
  async syncCurrent(tx: EntityManager, project: ProjectPlanContext, content: PlanContent, removedInVersionId: string | null, now: Date): Promise<string[]> {
    const links = pruneLinks(content);

    const wbsRows = await tx.find(WbsItem, { projectId: project.id, removedAt: null });
    const wbsById = new Map(wbsRows.map((row) => [row.id, row]));
    const keepWbs = new Set(content.wbs.map((node) => node.id));
    for (const node of content.wbs) {
      const row = wbsById.get(node.id);
      if (row) Object.assign(row, planColumns(node));
      else
        tx.create(WbsItem, {
          id: node.id,
          orgId: project.orgId,
          projectId: project.id,
          ...planColumns(node),
          supervisorUserId: null,
          statusNote: null,
          removedAt: null,
          removedInVersionId: null,
        });
    }
    const removedWbs = wbsRows.filter((row) => !keepWbs.has(row.id));
    for (const row of removedWbs) {
      if (removedInVersionId) Object.assign(row, { removedAt: now, removedInVersionId, supervisorUserId: null });
      else tx.remove(row);
    }

    const cbsRows = await tx.find(CbsItem, { projectId: project.id, removedAt: null });
    const cbsById = new Map(cbsRows.map((row) => [row.id, row]));
    const keepCbs = new Set(content.cbs.map((node) => node.id));
    for (const node of content.cbs) {
      const row = cbsById.get(node.id);
      if (row) Object.assign(row, cbsColumns(node));
      else tx.create(CbsItem, { id: node.id, orgId: project.orgId, projectId: project.id, ...cbsColumns(node), removedAt: null, removedInVersionId: null });
    }
    for (const row of cbsRows.filter((item) => !keepCbs.has(item.id))) {
      if (removedInVersionId) Object.assign(row, { removedAt: now, removedInVersionId });
      else tx.remove(row);
    }

    const linkRows = await tx.find(WbsCbsLink, { projectId: project.id });
    const linkByKey = new Map(linkRows.map((row) => [linkKey(row), row]));
    const keepLinks = new Set(links.map(linkKey));
    for (const row of linkRows) if (!keepLinks.has(linkKey(row))) tx.remove(row);
    for (const link of links) {
      const row = linkByKey.get(linkKey(link));
      if (row) Object.assign(row, { quantity: link.quantity, allocatedAmount: link.allocatedAmount });
      else
        tx.create(WbsCbsLink, {
          wbsItemId: link.wbsItemId,
          cbsItemId: link.cbsItemId,
          orgId: project.orgId,
          projectId: project.id,
          quantity: link.quantity,
          allocatedAmount: link.allocatedAmount,
        });
    }
    return removedWbs.map((row) => row.id);
  }
}

/** بودجهٔ برگ CBS (برای خواندن). */
export const budgetOfNode = (node: CbsNode): bigint => cbsLeafBudget(node);
