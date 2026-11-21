import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { newId } from '../../../platform/database/ids.js';
import { DomainError, ForbiddenError, NotFoundError } from '../../../platform/http/errors.js';
import { ProjectBasicsCatalog, ProjectRules } from '../../projects/index.js';
import { type Format, hasAmounts, type TemplateDef } from '../domain/catalog.js';
import { type Frequency, type GeneratedReport, ReportSchedule } from '../domain/report.entities.js';
import { frequencyLabel, nextRunAt, nextRunLabel } from '../domain/schedule-time.js';
import { fa } from '../domain/format.js';
import { ReportAccess } from './report-access.js';
import { ReportGeneration } from './report-generation.js';
import { ReportLibrary } from './report-library.js';
import { ReportOutputs } from './report-outputs.js';
import { ReportRanges } from './report-ranges.js';
import { type RecipientRef, ReportRecipients } from './report-recipients.js';

// زمان‌بندی گزارش (W25؛ management-reports.md ۶، ۷.۳، ۷.۴؛ AC-MR-05، AC-MR-06): `reports.schedule` (مالی:
// `reports.schedule_financial` برای قالب مالی)؛ گیرندهٔ بیرونی با `reports.send_external`؛ ویرایش با سازنده، مدیر پروژه یا مدیر سازمان.

export interface ScheduleInput {
  readonly id: string | null;
  readonly templateId: string;
  readonly projectId: string | null;
  readonly format: Format;
  readonly frequency: Frequency;
  readonly weekday: number | null;
  readonly dayOfMonth: number | null;
  readonly timeOfDay: string;
  readonly workingDaysOnly: boolean;
  readonly recipients: readonly RecipientRef[];
  readonly enabled: boolean;
}

const invalid = (reason: string) => new DomainError('REPORT_INVALID', 422, { reason });
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

@Injectable()
export class ReportSchedules {
  constructor(
    private readonly em: EntityManager,
    private readonly clock: Clock,
    private readonly audit: Audit,
    private readonly access: ReportAccess,
    private readonly library: ReportLibrary,
    private readonly recipients: ReportRecipients,
    private readonly ranges: ReportRanges,
    private readonly generation: ReportGeneration,
    private readonly outputs: ReportOutputs,
    private readonly rules: ProjectRules,
    private readonly catalog: ProjectBasicsCatalog,
  ) {}

  /** روز کاری با تقویم پروژه؛ سطح سازمان: جز جمعه. */
  private async workingDay(projectId: string | null): Promise<(date: string) => boolean> {
    if (!projectId) return (date) => new Date(`${date}T00:00:00Z`).getUTCDay() !== 5;
    const { calendar } = await this.rules.of(projectId);
    return (date) => {
      const index = (new Date(`${date}T00:00:00Z`).getUTCDay() + 1) % 7;
      return calendar.weekModes[index] !== 'off' && !calendar.holidays.has(date);
    };
  }

  private async next(schedule: Pick<ReportSchedule, 'frequency' | 'weekday' | 'dayOfMonth' | 'timeOfDay' | 'workingDaysOnly' | 'projectId'>, after: Date) {
    return nextRunAt(schedule, after, await this.workingDay(schedule.projectId ?? null));
  }

  async dtos(rows: readonly ReportSchedule[]) {
    const cards = new Map((await this.catalog.cards(rows.flatMap((row) => (row.projectId ? [row.projectId] : [])))).map((card) => [card.id, card]));
    const result = [];
    for (const row of rows) {
      const template = await this.library.template(row.templateId).catch(() => null);
      const recipients = await this.recipients.views(row.projectId ?? null, row.recipients);
      const external = recipients.filter((entry) => entry.external).length;
      const roles = recipients.filter((entry) => entry.kind === 'role');
      const users = recipients.filter((entry) => entry.kind === 'user').length;
      const withAmounts = recipients.filter((entry) => entry.canViewAmounts).length;
      const summary = [
        ...(roles.length > 0 ? [roles.map((entry) => entry.label).join('، ')] : []),
        ...(external > 0 ? [`بیرونی · ${fa(external)} نشانی`] : []),
        ...(users > 0 ? [`${fa(users)} نفر`] : []),
      ].join(' · ');
      result.push({
        id: row.id,
        templateId: row.templateId,
        templateName: template?.name ?? 'قالب حذف‌شده',
        scopeLabel: row.projectId ? (cards.get(row.projectId)?.name ?? '') : 'همهٔ پروژه‌ها',
        projectId: row.projectId ?? null,
        format: row.format,
        frequency: row.frequency,
        frequencyLabel: frequencyLabel(row),
        weekday: row.weekday ?? null,
        dayOfMonth: row.dayOfMonth ?? null,
        timeOfDay: row.timeOfDay,
        timezone: row.timezone,
        workingDaysOnly: row.workingDaysOnly,
        recipients,
        recipientSummary: summary,
        enabled: row.enabled,
        nextRunAt: row.enabled ? (row.nextRunAt?.toISOString() ?? null) : null,
        nextRunLabel: nextRunLabel(row.nextRunAt ?? null, row.enabled, row.frequency),
        lastRunAt: row.lastRunAt?.toISOString() ?? null,
        lastRunStatus: row.enabled ? row.lastRunStatus : 'paused',
        note: row.note ?? (row.frequency === 'on_period_close' ? { text: 'با بستن هر دوره، گزارش رسمی دوره ساخته می‌شود.', tone: 'inf', icon: 'info' } : null),
        splitAmounts: !!template && hasAmounts(template.sections, template.audience) && withAmounts > 0 && withAmounts < recipients.length,
      });
    }
    return result;
  }

  /** `GET /report-schedules` — زمان‌بندی‌های پروژه‌های دیدنی؛ سطح سازمان: خودِ کاربر (مدیر سازمان: همه). */
  async list() {
    const { actor, access } = this.access.actor();
    const projectIds = await this.access.projects('reports.view');
    const rows = await this.em.find(
      ReportSchedule,
      { $or: [{ projectId: { $in: projectIds } }, access.isOrgAdmin ? { projectId: null } : { projectId: null, createdByUserId: actor.userId }] },
      { orderBy: { createdAt: 'asc' } },
    );
    return this.dtos(rows);
  }

  private async manageable(id: string, em: EntityManager = this.em): Promise<ReportSchedule> {
    const { actor, access } = this.access.actor();
    const row = await em.findOne(ReportSchedule, { id });
    if (
      !row ||
      (row.projectId && !this.access.has(row.projectId, 'reports.view')) ||
      (!row.projectId && !access.isOrgAdmin && row.createdByUserId !== actor.userId)
    ) {
      throw new NotFoundError('REPORT_NOT_FOUND');
    }
    const manager = row.projectId ? (await this.rules.of(row.projectId)).managerUserId : null;
    if (!access.isOrgAdmin && row.createdByUserId !== actor.userId && manager !== actor.userId) {
      throw new ForbiddenError('PERMISSION_DENIED', {
        requiredPermission: 'reports.schedule',
        reason: 'فقط سازندهٔ زمان‌بندی یا مدیر پروژه آن را تغییر می‌دهد.',
      });
    }
    return row;
  }

  private check(template: TemplateDef, input: ScheduleInput, projectId: string | null): void {
    if (!this.access.canSchedule(projectId, template.category === 'financial')) {
      throw new ForbiddenError('PERMISSION_DENIED', {
        requiredPermission: template.category === 'financial' ? 'reports.schedule_financial' : 'reports.schedule',
      });
    }
    if (!template.formats.includes(input.format)) throw invalid(`این قالب فقط ${template.formats.map((format) => format.toUpperCase()).join(' و ')} می‌دهد.`);
    if (!TIME.test(input.timeOfDay)) throw invalid('ساعت اجرا را به شکل ۰۸:۰۰ بنویسید.');
    if (input.frequency === 'weekly' && (input.weekday === null || input.weekday < 0 || input.weekday > 6)) throw invalid('روز هفته را انتخاب کنید.');
    if (input.frequency === 'monthly' && (input.dayOfMonth === null || input.dayOfMonth < 1 || input.dayOfMonth > 31))
      throw invalid('روز ماه باید از ۱ تا ۳۱ باشد.');
    if (input.frequency === 'on_period_close' && !projectId) throw invalid('«با بستن دوره» فقط برای گزارش یک پروژه است.');
  }

  /** `POST /report-schedules` و `PATCH /report-schedules/:id` (ورودی کامل). */
  async save(input: ScheduleInput) {
    const { actor } = this.access.actor();
    const template = await this.library.template(input.templateId);
    const projectId = template.scope === 'portfolio' ? null : input.projectId ? this.access.scope(input.projectId, 'reports.view') : null;
    if (template.scope === 'project' && !projectId) throw invalid('پروژه را انتخاب کنید.');
    this.check(template, input, projectId);
    const recipients = this.recipients.validate(input.recipients);
    if (recipients.some((entry) => entry.kind === 'email') && !this.access.canSendExternal(projectId)) {
      throw new ForbiddenError('PERMISSION_DENIED', {
        requiredPermission: 'reports.send_external',
        reason: 'ارسال به نشانی بیرون از سازمان دسترسی «ارسال به گیرندهٔ بیرونی» می‌خواهد. گیرندهٔ بیرونی را بردارید یا از مدیر پروژه بخواهید بفرستد.',
      });
    }
    const now = this.clock.now();
    const fields = {
      templateId: template.id,
      projectId,
      format: input.format,
      frequency: input.frequency,
      weekday: input.frequency === 'weekly' ? input.weekday : null,
      dayOfMonth: input.frequency === 'monthly' ? input.dayOfMonth : null,
      timeOfDay: input.timeOfDay,
      workingDaysOnly: input.workingDaysOnly,
      recipients,
      enabled: input.enabled,
      updatedAt: now,
    };
    const nextAt = await this.next(fields, now);
    const row = await this.em.transactional(async (tx) => {
      const existing = input.id ? await this.manageable(input.id, tx) : null;
      const saved = existing
        ? Object.assign(existing, fields, { nextRunAt: nextAt, note: null })
        : tx.create(ReportSchedule, {
            id: newId(),
            orgId: actor.orgId,
            ...fields,
            timezone: 'Asia/Tehran',
            nextRunAt: nextAt,
            lastRunAt: null,
            lastRunStatus: 'never',
            note: null,
            createdByUserId: actor.userId,
            createdAt: now,
          });
      this.audit.record(tx, {
        action: existing ? 'report_schedule.updated' : 'report_schedule.created',
        entityType: 'ReportSchedule',
        entityId: saved.id,
        projectId,
        after: { templateId: template.id, frequency: input.frequency, recipients: recipients.length },
      });
      return saved;
    });
    return (await this.dtos([row]))[0];
  }

  /** `PATCH /report-schedules/:id {enabled}` */
  async toggle(id: string, enabled: boolean) {
    const row = await this.em.transactional(async (tx) => {
      const schedule = await this.manageable(id, tx);
      schedule.enabled = enabled;
      schedule.note = enabled ? null : { text: 'زمان‌بندی تا فعال‌سازی دوباره متوقف است.', tone: 'wrn', icon: 'pause-circle' };
      schedule.nextRunAt = enabled ? await this.next(schedule, this.clock.now()) : null;
      schedule.updatedAt = this.clock.now();
      return schedule;
    });
    return (await this.dtos([row]))[0];
  }

  /** `DELETE /report-schedules/:id` */
  async remove(id: string) {
    await this.em.transactional(async (tx) => {
      const schedule = await this.manageable(id, tx);
      this.audit.record(tx, {
        action: 'report_schedule.deleted',
        entityType: 'ReportSchedule',
        entityId: id,
        projectId: schedule.projectId ?? null,
        before: { templateId: schedule.templateId },
      });
      tx.remove(schedule);
    });
    return { id };
  }

  /** `POST /report-schedules/:id/run-now` — همان بازه و گیرندگان اجرای زمان‌بندی. */
  async runNow(id: string) {
    const { actor } = this.access.actor();
    const schedule = await this.manageable(id);
    const rows = await this.em.transactional((tx) => this.execute(tx, schedule, null, actor.userId));
    if (rows.length === 0) throw invalid('هیچ گیرندهٔ فعالی پیدا نشد؛ گیرندگان را بررسی کنید.');
    return (await this.outputs.dtos(rows))[0];
  }

  /**
   * یک اجرا درون تراکنش فراخوان (تیک، بستن دوره، «اجرا»): نسخه‌ها به ازای گیرندگان (۷.۳) و نوبت بعد. بی زمینهٔ درخواست کار می‌کند؛
   * فرستنده همان سازندهٔ زمان‌بندی است.
   */
  async execute(tx: EntityManager, schedule: ReportSchedule, periodId: string | null, requestedBy: string | null, advance = false): Promise<GeneratedReport[]> {
    const template = await this.library.template(schedule.templateId);
    const projectId = schedule.projectId ?? null;
    const range = await this.ranges.forRun(schedule.frequency, projectId, periodId);
    const versions = await this.recipients.versions({
      orgId: schedule.orgId,
      projectId,
      template,
      senderUserId: schedule.createdByUserId,
      recipients: schedule.recipients,
    });
    const scopeLabel = projectId ? ((await this.catalog.cards([projectId]))[0]?.name ?? '') : 'همهٔ پروژه‌های فعال';
    const projectIds = projectId ? [projectId] : (await this.catalog.list()).filter((project) => project.status === 'active').map((project) => project.id);
    const rows: GeneratedReport[] = [];
    for (const version of versions) {
      rows.push(
        await this.generation.enqueue(tx, {
          orgId: schedule.orgId,
          projectId,
          template,
          range,
          format: schedule.format,
          disabled: [],
          amounts: version.amounts,
          projectIds,
          scopeLabel,
          requestedByUserId: requestedBy,
          scheduleId: schedule.id,
          deliveries: version,
        }),
      );
    }
    // «اجرای همین حالا» نوبت منظم را جابه‌جا نمی‌کند
    if (advance) {
      const locked = await tx.findOneOrFail(ReportSchedule, { id: schedule.id });
      locked.nextRunAt = locked.enabled ? await this.next(locked, this.clock.now()) : null;
      locked.updatedAt = this.clock.now();
    }
    return rows;
  }
}
