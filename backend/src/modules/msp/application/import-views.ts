import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { toFaDigits } from '../../../platform/http/fa.js';
import { IdentityService } from '../../identity/index.js';
import type { PlanNode } from '../../planning/index.js';
import { ProjectBasicsCatalog } from '../../projects/index.js';
import { TeamService } from '../../team/index.js';
import { blockingOf, fileSpan, leavesOf } from '../domain/checks.js';
import { buildPlan, type BuiltPlan } from '../domain/build.js';
import { FieldMappingTemplate, type MspImportSession } from '../domain/msp.entities.js';

// شکل پاسخ‌های ورود (ImportSessionDto، ImportPreviewDto فرانت؛ W34، W35، W49).

export const DEFAULT_TEMPLATE_NAME = 'MSP استاندارد شرکت';
const fa = (value: number | string) => toFaDigits(value);
const initialsOf = (fullName: string) =>
  fullName
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('.');

let previewSeq = 0;
/** شناسهٔ موقت پیش‌نمایش (پایدار نیست؛ ساخت واقعی شناسهٔ تازه می‌گیرد). */
const previewId = () => `p${++previewSeq}`;

export interface PreviewNode {
  id: string;
  code: string;
  title: string;
  weightInParent: number;
  isMilestone: boolean;
  isLeaf: boolean;
  budget: string;
  start: string;
  finish: string;
  supervisorName: string | null;
  childCount: number;
  unit: string | null;
  quantity: number | null;
  children?: PreviewNode[];
}

export interface OpeningRow {
  id: string;
  code: string;
  title: string;
  filePercent: number;
  percent: number;
  selected: boolean;
  method: string;
}

@Injectable()
export class ImportViews {
  constructor(
    private readonly em: EntityManager,
    private readonly identity: IdentityService,
    private readonly catalog: ProjectBasicsCatalog,
    private readonly team: TeamService,
  ) {}

  /** سرپرستان فعال پروژه (تصمیم کاربر 1405/08/26: فقط همین‌ها نگاشت‌پذیرند). */
  async supervisors(projectId: string) {
    const ids = (await this.team.membersWithRoles([projectId], ['supervisor'])).map((row) => row.userId);
    const people = await this.identity.personRefs(ids);
    return ids.flatMap((id) => {
      const person = people.get(id);
      return person ? [{ id, fullName: person.fullName, initials: initialsOf(person.fullName), avatarTone: person.avatarTone }] : [];
    });
  }

  async templateName(): Promise<string> {
    return (await this.em.findOne(FieldMappingTemplate, { isDefault: true }))?.name ?? DEFAULT_TEMPLATE_NAME;
  }

  plan(session: MspImportSession, newId: () => string = previewId): BuiltPlan {
    return buildPlan(
      session.analysis,
      {
        checks: session.checks,
        mapping: session.mapping,
        buildCbs: session.options.buildCbs,
        weightGenerator: session.weightGenerator,
        resources: session.resourceMapping.map((row) => ({ name: row.name, userId: row.action === 'match' ? row.userId : null })),
      },
      newId,
    );
  }

  /** پیشرفت اولیه (OD-16): برگ‌های کاری دارای درصد؛ نقطهٔ عطف گزارش نمی‌گیرد. */
  openingRows(session: MspImportSession, plan: BuiltPlan): OpeningRow[] {
    if (!session.options.importProgress) return [];
    return leavesOf(session.analysis).flatMap((task) => {
      const leaf = plan.leaves.get(task.wbs);
      if (!leaf || leaf.isMilestone || task.percentComplete <= 0) return [];
      return [
        {
          id: task.wbs,
          code: task.wbs,
          title: task.name,
          filePercent: task.percentComplete,
          percent: Math.min(100, task.percentComplete),
          selected: true,
          method: leaf.measurementMethod === 'quantity' ? 'مقداری' : 'درصدی',
        },
      ];
    });
  }

  async session(session: MspImportSession) {
    const file = session.analysis;
    const leaves = leavesOf(file);
    const span = fileSpan(file);
    const months = span.start && span.finish ? Math.round((Date.parse(span.finish) - Date.parse(span.start)) / (30 * 86_400_000)) : 0;
    const block = blockingOf(session.checks);
    const [[card], supervisors, templateName] = await Promise.all([
      this.catalog.cards([session.projectId]),
      this.supervisors(session.projectId),
      this.templateName(),
    ]);
    const byId = new Map(supervisors.map((person) => [person.id, person]));
    return {
      id: session.id,
      projectId: session.projectId,
      projectName: card?.name ?? '',
      projectCode: card?.code ?? '',
      fileName: session.fileName,
      fileSizeLabel: `${fa((session.fileSize / 1_048_576).toFixed(1))} مگابایت`,
      source: 'xml' as const,
      sourceNote: null,
      uploadedAt: session.createdAt.toISOString(),
      stats: {
        phases: file.tasks.filter((task) => task.outlineLevel === 1).length,
        tasks: file.tasks.length,
        leaves: leaves.length,
        milestones: leaves.filter((task) => task.isMilestone).length,
        levels: Math.max(...file.tasks.map((task) => task.outlineLevel), 1),
        resources: file.resources.length,
        spanLabel: months > 0 ? `${fa(months)} ماه` : '—',
        totalCost: String(leaves.reduce((sum, task) => sum + task.cost, 0)),
        statusDate: file.statusDate,
        tasksWithProgress: leaves.filter((task) => task.percentComplete > 0).length,
      },
      checks: session.checks,
      options: session.options,
      mapping: session.mapping,
      resources: session.resourceMapping.map((row) => {
        const person = row.userId ? byId.get(row.userId) : undefined;
        return {
          id: row.id,
          name: row.name,
          taskCount: row.taskCount,
          userId: person ? row.userId : null,
          userName: person?.fullName ?? null,
          initials: person?.initials ?? null,
          avatarTone: person?.avatarTone ?? null,
          action: row.action,
        };
      }),
      weightGenerator: session.weightGenerator,
      saveTemplate: session.saveTemplate,
      templateName,
      canContinue: block.canContinue && session.status === 'validated',
      blockingReason: session.status === 'built' ? 'این ورود ساخته شده است.' : block.reason,
      builtAt: session.status === 'built' ? (session.builtAt?.toISOString() ?? null) : null,
      rollbackUntil: session.status === 'built' ? (session.rollbackDeadline?.toISOString() ?? null) : null,
    };
  }

  async preview(session: MspImportSession) {
    const plan = this.plan(session);
    const opening = this.openingRows(session, plan);
    const budget = new Map<string, bigint>();
    for (const link of plan.links) budget.set(link.wbsItemId, (budget.get(link.wbsItemId) ?? 0n) + BigInt(link.allocatedAmount ?? '0'));
    const names = new Map((await this.supervisors(session.projectId)).map((person) => [person.id, person.fullName]));
    const toNode = (node: PlanNode): PreviewNode => {
      const children = plan.wbs.filter((entry) => entry.parentId === node.id).map(toNode);
      const supervisor = plan.supervisors.get(node.id);
      return {
        id: node.id,
        code: node.code,
        title: node.title,
        weightInParent: Number(node.weightInParent),
        isMilestone: node.isMilestone,
        isLeaf: node.isLeaf,
        budget: (children.length > 0 ? children.reduce((sum, child) => sum + BigInt(child.budget), 0n) : (budget.get(node.id) ?? 0n)).toString(),
        start: node.plannedStart ?? '',
        finish: node.plannedFinish ?? '',
        supervisorName: supervisor ? (names.get(supervisor) ?? null) : null,
        childCount: children.length,
        unit: node.unit,
        quantity: node.totalQuantity === null ? null : Number(node.totalQuantity),
        ...(children.length > 0 ? { children } : {}),
      };
    };
    const tree = plan.wbs.filter((node) => node.parentId === null).map(toNode);
    const leafCount = plan.leaves.size;
    const cbsItems = plan.cbs.filter((node) => node.isLeaf).length;
    const unmatched = session.resourceMapping.filter((row) => !row.userId || row.action !== 'match').length;
    const checks: { severity: 'ok' | 'warning' | 'error'; text: string; link: { label: string; to: string } | null }[] = [
      { severity: 'ok', text: `جمع وزن فرزندان هر ${fa(plan.groupCount)} گروه ۱۰۰٪ است`, link: null },
    ];
    if (cbsItems > 0)
      checks.push({ severity: 'ok', text: `${fa(cbsItems)} قلم CBS از هزینه‌های فایل ساخته می‌شود · ${fa(plan.links.length)} اتصال`, link: null });
    if (plan.withoutSupervisor > 0) {
      checks.push({
        severity: 'warning',
        text: `${fa(plan.withoutSupervisor)} فعالیت بدون سرپرست می‌ماند${unmatched > 0 ? `؛ ${fa(unmatched)} منبع فایل به سرپرست این پروژه نگاشت نشد` : ''}`,
        link: { label: 'تخصیص پس از ساخت', to: `/projects/${session.projectId}/assignment` },
      });
    }
    for (const check of session.checks)
      if (check.severity !== 'ok' && check.resolution !== 'reupload') checks.push({ severity: check.severity, text: check.title, link: null });
    return {
      sessionId: session.id,
      summary: [
        {
          label: 'فاز (سطح ۱)',
          value: fa(tree.length),
          hint: `از ${fa(session.analysis.tasks.filter((task) => task.outlineLevel === 1).length)} فعالیت سطح اول`,
        },
        { label: 'گروه', value: fa(plan.groupCount), hint: 'جمع وزن هر گروه ۱۰۰٪' },
        { label: 'فعالیت قابل گزارش', value: fa(leafCount), hint: `شامل ${fa([...plan.leaves.values()].filter((leaf) => leaf.isMilestone).length)} نقطهٔ عطف` },
        { label: 'اقلام CBS', value: fa(cbsItems), hint: `${fa(plan.links.length)} اتصال WBS ↔ CBS` },
        { label: 'بودجهٔ کل', value: fa(plan.totalBudget.toString()), hint: 'ریال' },
      ],
      tree,
      checks,
      openingProgress: opening,
      statusDate: session.analysis.statusDate,
      withoutSupervisor: plan.withoutSupervisor,
      totalBudget: plan.totalBudget.toString(),
      cbsItemCount: cbsItems,
      linkCount: plan.links.length,
    };
  }
}
