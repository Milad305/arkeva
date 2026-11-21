import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { newId } from '../../../platform/database/ids.js';
import { ConflictError, DomainError, NotFoundError, UnauthorizedError } from '../../../platform/http/errors.js';
import { toFaDigits } from '../../../platform/http/fa.js';
import { Outbox } from '../../../platform/outbox/outbox.js';
import { ProgressReads } from '../../computation/reads.js';
import { IdentityService } from '../../identity/index.js';
import { Notifier } from '../../notifications/index.js';
import { assignableReason, imbalanced, round1, type TeamPlanItem } from '../domain/routing.js';
import { WbsAssignmentHistory } from '../domain/team.entities.js';
import { rosterOf } from './roster.js';
import { type TeamProjectContext, TeamPlanPort, TeamProjectPort } from './team-ports.js';

// تخصیص برگ‌های WBS به سرپرست (W17؛ team-assignment.md ۵). عملیاتی و بی نسخه (D05). هر تغییر یک ردیف تاریخچه را
// می‌بندد و یکی باز می‌کند، یک AssignmentChanged منتشر می‌کند و NT-ASG-01 به سرپرست قبلی و تازه می‌رود (AC-TM-08).
// بار کاری = برگ‌های تخصیص‌یافتهٔ تمام‌نشده؛ «تمام‌شده» با پیشرفت F10 (برش ۶) — تا آن موقع همهٔ برگ‌های تخصیص‌یافته.

export interface ReassignResult {
  readonly changed: number;
  readonly notified: string[];
}

const readOnly = (project: TeamProjectContext) => project.status === 'completed' || project.status === 'archived';

@Injectable()
export class Assignments {
  constructor(
    private readonly em: EntityManager,
    private readonly context: AppContext,
    private readonly clock: Clock,
    private readonly outbox: Outbox,
    private readonly notifier: Notifier,
    private readonly identity: IdentityService,
    private readonly projects: TeamProjectPort,
    private readonly plan: TeamPlanPort,
    private readonly progress: ProgressReads,
  ) {}

  /** `GET /projects/:pid/assignments` */
  async view(projectId: string) {
    await this.projects.context(projectId);
    const [items, supervisors, progress] = await Promise.all([this.plan.items(projectId), this.supervisors(projectId), this.progress.items(projectId)]);
    const people = await this.identity.personRefs([...supervisors, ...items.flatMap((item) => (item.supervisorUserId ? [item.supervisorUserId] : []))]);
    const loads = this.loads(items, supervisors);
    return {
      supervisors: supervisors.map((userId) => ({
        userId,
        fullName: people.get(userId)?.fullName ?? '',
        avatarTone: people.get(userId)?.avatarTone ?? 'a1',
        note: sectionOf(items, userId) ?? 'بدون تخصیص',
        workload: loads.get(userId) ?? 0,
      })),
      items: items.map((item) => {
        const reason = assignableReason(item);
        const supervisor = item.isLeaf && item.supervisorUserId ? people.get(item.supervisorUserId) : undefined;
        return {
          id: item.id,
          parentId: item.parentId,
          code: item.code,
          title: item.title,
          sortOrder: item.sortOrder,
          isLeaf: item.isLeaf,
          assignable: reason === null,
          notAssignableReason: reason,
          supervisorUserId: supervisor?.id ?? null,
          supervisorName: supervisor?.fullName ?? null,
          supervisorTone: supervisor?.avatarTone ?? null,
          actualPercent: progress.get(item.id)?.actualPercent ?? null,
        };
      }),
      unassignedCount: items.filter((item) => !assignableReason(item) && !item.supervisorUserId).length,
      averageWorkload: average(loads),
    };
  }

  /** `GET /projects/:pid/assignments/preview` — بار پس از تخصیص و انتقال‌ها، بی نوشتن (۵.۳). */
  async preview(projectId: string, input: { readonly wbsItemIds: readonly string[]; readonly supervisorUserId: string | null }) {
    await this.projects.context(projectId);
    const [items, supervisors] = await Promise.all([this.plan.items(projectId), this.supervisors(projectId)]);
    const byId = new Map(items.map((item) => [item.id, item]));
    const people = await this.identity.personRefs(items.flatMap((item) => (item.supervisorUserId ? [item.supervisorUserId] : [])));
    const loads = this.loads(items, supervisors);
    const rejected: { wbsItemId: string; title: string; reason: string }[] = [];
    const transfers: { wbsItemId: string; title: string; fromName: string }[] = [];
    let assignCount = 0;
    for (const id of new Set(input.wbsItemIds)) {
      const item = byId.get(id);
      if (!item) continue;
      const reason = assignableReason(item);
      if (reason) {
        rejected.push({ wbsItemId: id, title: item.title, reason });
        continue;
      }
      if (item.supervisorUserId === input.supervisorUserId) continue;
      assignCount += 1;
      if (item.supervisorUserId) {
        transfers.push({ wbsItemId: id, title: item.title, fromName: people.get(item.supervisorUserId)?.fullName ?? '' });
        loads.set(item.supervisorUserId, (loads.get(item.supervisorUserId) ?? 0) - 1);
      }
      if (input.supervisorUserId) loads.set(input.supervisorUserId, (loads.get(input.supervisorUserId) ?? 0) + 1);
    }
    const workloadAfter = input.supervisorUserId ? (loads.get(input.supervisorUserId) ?? 0) : 0;
    const averageAfter = average(loads);
    return { workloadAfter, averageAfter, imbalanced: imbalanced(workloadAfter, averageAfter), transfers, rejected, assignCount };
  }

  /** `POST /projects/:pid/assignments {wbsItemIds[], supervisorUserId | null}` (۵.۱؛ AC-TM-01). */
  async assign(projectId: string, input: { readonly wbsItemIds: readonly string[]; readonly supervisorUserId: string | null }): Promise<ReassignResult> {
    if (input.wbsItemIds.length === 0) throw new DomainError('ASSIGNMENT_INVALID', 422, { reason: 'دست‌کم یک فعالیت برگ انتخاب کنید.' });
    return this.em.transactional(async (tx) => {
      const project = await this.projects.context(projectId, tx);
      if (readOnly(project)) throw new ConflictError('PROJECT_READ_ONLY', { status: project.status });
      if (input.supervisorUserId) await this.assertSupervisor(projectId, input.supervisorUserId);
      const items = await this.plan.items(projectId, tx);
      const byId = new Map(items.map((item) => [item.id, item]));
      for (const id of input.wbsItemIds) {
        const item = byId.get(id);
        if (!item) throw new NotFoundError('WBS_ITEM_NOT_FOUND');
        const reason = assignableReason(item);
        if (reason) throw new DomainError('ASSIGNMENT_INVALID', 422, { reason: `«${item.title}»: ${reason}` });
      }
      return this.reassign(tx, project, items, input.wbsItemIds, input.supervisorUserId);
    });
  }

  /**
   * هستهٔ تخصیص درون تراکنش فراخواننده (تخصیص W17، حذف عضو ۴.۳). برگ‌هایی که همین سرپرست را دارند تغییری نیستند.
   */
  async reassign(
    tx: EntityManager,
    project: TeamProjectContext,
    items: readonly TeamPlanItem[],
    wbsItemIds: readonly string[],
    to: string | null,
  ): Promise<ReassignResult> {
    const actor = this.context.actor?.userId ?? null;
    const now = this.clock.now();
    const wanted = new Set(wbsItemIds);
    const changes = items.filter((item) => wanted.has(item.id) && item.isLeaf && item.supervisorUserId !== to);
    if (changes.length === 0) return { changed: 0, notified: [] };

    const open = await tx.find(WbsAssignmentHistory, { projectId: project.id, wbsItemId: { $in: changes.map((item) => item.id) }, toAt: null });
    for (const row of open) row.toAt = now;
    await tx.flush();
    for (const item of changes) {
      if (to)
        tx.create(WbsAssignmentHistory, {
          id: newId(),
          orgId: project.orgId,
          projectId: project.id,
          wbsItemId: item.id,
          supervisorUserId: to,
          fromAt: now,
          toAt: null,
          assignedByUserId: actor,
        });
      await this.outbox.emit(tx, {
        type: 'AssignmentChanged',
        projectId: project.id,
        payload: { v: 1, wbsItemId: item.id, fromUserId: item.supervisorUserId, toUserId: to },
      });
    }
    await this.plan.setSupervisor(
      tx,
      project.id,
      changes.map((item) => item.id),
      to,
    );

    // NT-ASG-01: یک اعلان برای هر سرپرست درگیر در این تخصیص (قبلی‌ها «از شما گرفته شد»، تازه «به شما سپرده شد»)
    const previous = new Map<string, TeamPlanItem[]>();
    for (const item of changes) if (item.supervisorUserId) previous.set(item.supervisorUserId, [...(previous.get(item.supervisorUserId) ?? []), item]);
    const people = await this.identity.personRefs([...previous.keys(), ...(to ? [to] : [])]);
    const subject = newId();
    const label = (list: readonly TeamPlanItem[]) => (list.length === 1 ? `فعالیت ${list[0]?.code} ${list[0]?.title}` : `${toFaDigits(list.length)} فعالیت`);
    const link = `/projects/${project.id}/assignment`;
    for (const [userId, list] of previous) {
      if (userId === to) continue;
      await this.notifier.notify(tx, {
        code: 'NT-ASG-01',
        projectId: project.id,
        recipients: [userId],
        subjectId: subject,
        title: `${label(list)} از شما گرفته شد.`,
        body: project.name,
        link,
      });
    }
    if (to) {
      await this.notifier.notify(tx, {
        code: 'NT-ASG-01',
        projectId: project.id,
        recipients: [to],
        subjectId: subject,
        title: `${label(changes)} به شما سپرده شد.`,
        body: project.name,
        link,
      });
    }
    const notified = [...new Set([...previous.keys(), ...(to ? [to] : [])])].map((userId) => people.get(userId)?.fullName ?? '');
    return { changed: changes.length, notified };
  }

  /**
   * سرپرست برگ‌ها از ورود MSP یا بازگردانی آن (msp-integration.md ۷.۱ گام ۲) درون تراکنش فراخوان. فقط سرپرست فعال همین
   * پروژه (تصمیم کاربر 1405/08/26)؛ بقیه بی‌سرپرست می‌مانند (AL-STR-04). شمار برگ‌های تخصیص‌یافته.
   */
  async assignImported(tx: EntityManager, projectId: string, bySupervisor: ReadonlyMap<string, readonly string[]>): Promise<number> {
    if (bySupervisor.size === 0) return 0;
    await tx.flush();
    const project = await this.projects.context(projectId, tx);
    const roster = await rosterOf(tx, { projectId, userIds: [...bySupervisor.keys()] });
    const allowed = new Set(roster.filter((entry) => entry.roles.includes('supervisor')).map((entry) => entry.userId));
    const items = await this.plan.items(projectId, tx);
    let changed = 0;
    for (const [userId, ids] of bySupervisor) {
      if (allowed.has(userId)) changed += (await this.reassign(tx, project, items, ids, userId)).changed;
    }
    return changed;
  }

  /** سرپرستان فعال پروژه به ترتیب نام. */
  async supervisors(projectId: string): Promise<string[]> {
    const members = (await rosterOf(this.em, { projectId })).filter((entry) => entry.roles.includes('supervisor'));
    const people = await this.identity.personRefs(members.map((entry) => entry.userId));
    return members.map((entry) => entry.userId).sort((a, b) => (people.get(a)?.fullName ?? '').localeCompare(people.get(b)?.fullName ?? '', 'fa'));
  }

  /** بار کاری هر سرپرست فعال (۵.۳). */
  loads(items: readonly TeamPlanItem[], supervisors: readonly string[]): Map<string, number> {
    const loads = new Map(supervisors.map((userId) => [userId, 0]));
    for (const item of items)
      if (item.isLeaf && item.supervisorUserId && loads.has(item.supervisorUserId))
        loads.set(item.supervisorUserId, (loads.get(item.supervisorUserId) ?? 0) + 1);
    return loads;
  }

  private async assertSupervisor(projectId: string, userId: string): Promise<void> {
    const member = (await rosterOf(this.em, { projectId, userIds: [userId] }))[0];
    if (!member) throw new DomainError('ASSIGNMENT_INVALID', 422, { reason: 'این شخص عضو فعال پروژه نیست.' });
    if (!member.roles.includes('supervisor')) {
      const name = (await this.identity.personRefs([userId])).get(userId)?.fullName ?? 'این عضو';
      throw new DomainError('ASSIGNMENT_INVALID', 422, { reason: `${name} نقش سرپرست کارگاه ندارد؛ اول از «اعضا» این نقش را به او بدهید.` });
    }
  }

  actor() {
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError();
    return actor;
  }
}

function average(loads: ReadonlyMap<string, number>): number {
  return loads.size > 0 ? round1([...loads.values()].reduce((sum, value) => sum + value, 0) / loads.size) : 0;
}

/** خلاصهٔ بخش سرپرست: والد مشترک برگ‌هایش، یا «n بخش» (همان W16). */
export function sectionOf(items: readonly TeamPlanItem[], userId: string): string | null {
  const mine = items.filter((item) => item.isLeaf && item.supervisorUserId === userId);
  if (mine.length === 0) return null;
  const byId = new Map(items.map((item) => [item.id, item]));
  const parents = new Set(mine.map((item) => item.parentId).filter((id): id is string => !!id));
  if (parents.size === 1) return byId.get([...parents][0] as string)?.title ?? null;
  return parents.size === 0 ? (mine[0]?.title ?? null) : `${toFaDigits(parents.size)} بخش`;
}
