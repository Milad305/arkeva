import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { stepPercents } from '../../computation/index.js';
import { Clock } from '../../../platform/clock/clock.js';
import { entriesOf, FieldRecords, type ItemRecord, type ReportRecord } from '../../field/index.js';
import type { CurrentItem } from '../../planning/index.js';
import type { ProjectRules } from '../../projects/index.js';
import { flagMessage } from '../domain/evaluate.js';
import type { Loaded } from './report-views.js';
import { ReviewAccess } from './review-access.js';

// یک آیتم گزارش برای W40 (FieldItemDto فرانت): مقادیر و پرچم‌ها، عکس‌ها، تاریخچهٔ بررسی، مهلت، «نزد چه کسی است» و
// اقدام‌های مجاز کاربر جاری.

@Injectable()
export class ItemViews {
  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly records: FieldRecords,
    private readonly access: ReviewAccess,
  ) {}

  async build(
    item: ItemRecord,
    report: ReportRecord,
    loaded: Loaded,
    leaf: CurrentItem | undefined,
    decidable: boolean,
    firstApprover: string | null,
    rules: Awaited<ReturnType<ProjectRules['of']>>,
  ) {
    const userId = this.access.actorId();
    const reviews = loaded.reviews.filter((review) => review.itemId === item.id);
    const open = reviews.find((review) => review.decidedAt === null) ?? null;
    const now = this.clock.now();
    const person = (id: string | null | undefined) => (id ? (loaded.people.get(id) ?? null) : null);
    let stepsProgress: { key: string; title: string; weight: number; fromPercent: number; toPercent: number }[] | null = null;
    if (item.method === 'steps' && leaf?.steps) {
      const approvedItems = (await this.records.items(this.em, { projectId: item.projectId, wbsItemIds: [item.wbsItemId], statuses: ['approved'] })).filter(
        (entry) => entry.id !== item.id,
      );
      const before = stepPercents(
        entriesOf(approvedItems, await this.records.reports(this.em, { ids: [...new Set(approvedItems.map((entry) => entry.reportId))] })),
      );
      stepsProgress = leaf.steps.map((step) => ({
        key: step.key,
        title: step.title,
        weight: step.weight,
        fromPercent: before.get(step.key) ?? 0,
        toPercent: item.stepsProgress?.[step.key] ?? before.get(step.key) ?? 0,
      }));
    }
    const autoDeadline = (item.approvedAt?.getTime() ?? 0) + rules.reviewDeadlineHours * 3_600_000;
    const notAuthor = report.authorUserId !== userId;
    const ownsApproved = (code: 'report.approve.stage1' | 'report.correct') =>
      notAuthor && (this.access.scope(item.projectId, code) === 'all' || (!!this.access.scope(item.projectId, code) && firstApprover === userId));
    const superseding = loaded.items.find((entry) => entry.supersedesItemId === item.id);
    return {
      id: item.id,
      reportId: item.reportId,
      projectId: item.projectId,
      wbsItemId: item.wbsItemId,
      wbsCode: leaf?.code ?? '',
      wbsTitle: leaf?.title ?? '(فعالیت حذف‌شده)',
      method: item.method,
      unit: leaf?.unit ?? null,
      totalQuantity: leaf?.totalQuantity == null ? null : Number(leaf.totalQuantity),
      quantityToday: item.quantityToday ?? null,
      reportedQuantityInfo: item.reportedQuantityInfo ?? null,
      stepsProgress,
      lastApprovedPercent: item.lastApprovedPercent,
      computedPercent: item.computedPercent,
      deltaPercent: item.deltaPercent,
      plannedPercentAtDate: item.plannedPercentAtDate,
      deviationAfter: item.computedPercent - item.plannedPercentAtDate,
      status: item.status,
      currentStage: (item.currentStage ?? null) as 1 | 2 | null,
      requiresStage2: item.requiresStage2,
      autoApproved: item.autoApproved,
      flags: item.flags,
      flagMessages: item.flags.map((flag) =>
        flagMessage(flag, { deltaPercent: item.deltaPercent, distanceFromSiteM: report.distanceFromSiteM ?? null, settings: rules.workflow }),
      ),
      revisionCount: item.revisionCount,
      supersedesItemId: item.supersedesItemId ?? null,
      supersededBy: superseding?.id ?? null,
      crewCount: item.crewCount ?? null,
      note: item.note ?? null,
      approvedAt: item.approvedAt?.toISOString() ?? null,
      photos: loaded.photos
        .filter((photo) => photo.reportId === report.id && (photo.itemId === item.id || photo.itemId === null))
        .map((photo) => ({
          id: photo.id,
          takenAt: photo.takenAt.toISOString(),
          caption: photo.caption ?? null,
          distanceM: photo.distanceM ?? null,
          uploadStatus: photo.uploadStatus,
          markedUnsuitable: photo.markedUnsuitable,
        })),
      reviews: reviews.map((review) => ({
        id: review.id,
        stage: review.stage as 1 | 2,
        decision: review.decision ?? null,
        reviewer: person(review.reviewerUserId),
        assignee: person(review.assigneeUserId),
        note: review.note ?? null,
        requiredActions: review.requiredActions ?? null,
        dueAt: review.dueAt.toISOString(),
        decidedAt: review.decidedAt?.toISOString() ?? null,
        escalatedTo: person(review.escalatedToUserId),
      })),
      dueAt: open?.dueAt.toISOString() ?? null,
      overdue: !!open && open.dueAt.getTime() < now.getTime(),
      heldBy: open && open.assigneeUserId !== userId ? person(open.assigneeUserId) : null,
      resolution: item.resolution ?? null,
      can: {
        decide: decidable && (item.status === 'stage1' || item.status === 'stage2'),
        revokeAuto: item.status === 'approved' && item.autoApproved && now.getTime() <= autoDeadline && ownsApproved('report.approve.stage1'),
        correct: item.status === 'approved' && ownsApproved('report.correct'),
        resolve: decidable && item.status === 'needs_resolution',
      },
    };
  }
}
