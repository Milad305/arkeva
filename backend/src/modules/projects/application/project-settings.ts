import { Injectable } from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/postgresql';
import { Audit } from '../../../platform/audit/audit.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationFailedError } from '../../../platform/http/errors.js';
import { Outbox } from '../../../platform/outbox/outbox.js';
import { Clock } from '../../../platform/clock/clock.js';
import { tehranClock } from '../../../platform/scheduler/ticks.js';
import { PeriodReads, periodViews, ProgressReads } from '../../computation/reads.js';
import { IdentityService } from '../../identity/index.js';
import { TeamService } from '../../team/index.js';
import { ProjectAlertRules } from './plan-ports.js';
import { ProjectBackupsView, ProjectIntegrationCards, ProjectNotificationMatrix } from './settings-ports.js';
import { ProjectCalendar, ProjectSettings } from '../domain/project-settings.entity.js';
import { Project, ProjectType } from '../domain/project.entity.js';
import { calendarErrors, type CalendarInput, mergeOfficial, missingOfficialYears } from '../domain/rules/calendar.js';
import { OfficialHolidays } from './official-holidays.js';
import {
  type FieldPatch,
  fieldView,
  type GeneralPatch,
  generalView,
  type ProgressPatch,
  progressView,
  type SettingsSection,
  type WorkflowPatch,
  workflowView,
} from './project-settings.views.js';

// تنظیمات پروژه (F02 ۷؛ W28 و رکورد W29؛ تصمیم کاربر 1405/08/22). هر ذخیره: قفل ردیف، قواعد، ممیزی
// فیلدهای تغییرکرده و ProjectSettingsChanged در یک تراکنش (`02` ۳ قید؛ AC-PS-10). کد و وضعیت هرگز اینجا.

export type SettingsPatch =
  { readonly general: GeneralPatch } | { readonly progress: ProgressPatch } | { readonly field: FieldPatch } | { readonly workflow: WorkflowPatch };

/** تمام‌شده و بایگانی فقط‌خواندنی‌اند (AC-PS-11). */
const READ_ONLY = new Set(['completed', 'archived']);

interface Loaded {
  readonly project: Project;
  readonly settings: ProjectSettings;
  readonly calendar: ProjectCalendar;
}

@Injectable()
export class ProjectSettingsService {
  constructor(
    private readonly em: EntityManager,
    private readonly context: AppContext,
    private readonly audit: Audit,
    private readonly outbox: Outbox,
    private readonly identity: IdentityService,
    private readonly holidays: OfficialHolidays,
    private readonly clock: Clock,
    private readonly progressReads: ProgressReads,
    private readonly periodReads: PeriodReads,
    private readonly team: TeamService,
    private readonly alertRules: ProjectAlertRules,
    private readonly notificationMatrix: ProjectNotificationMatrix,
    private readonly integrationCards: ProjectIntegrationCards,
    private readonly backupsView: ProjectBackupsView,
  ) {}

  /** `GET /projects/:pid/settings` — بخش‌های F02 و دوره‌های گزارش (F10، خواندنی)؛ حوزه‌ها، اعلان و هشدار با ماژول خودشان. */
  async get(projectId: string) {
    const loaded = await this.load(this.em, projectId, false);
    const [eac, periods] = await Promise.all([this.eacPreview(projectId), this.periodReads.list(projectId)]);
    const closers = [...new Set(periods.flatMap((period) => (period.closedByUserId ? [period.closedByUserId] : [])))];
    const [people, members, types] = await Promise.all([
      this.identity.personRefs(closers),
      this.team.memberSummaries([loaded.project], 1000),
      this.em.find(ProjectType, {}, { orderBy: { sortOrder: 'asc' } }),
    ]);
    const [alertRules, notifications, integrations, backups] = await Promise.all([
      this.alertRules.list(projectId),
      this.notificationMatrix.matrix(projectId),
      this.integrationCards.cards(projectId, loaded.project.mspLinked),
      this.backupsView.view(projectId),
    ]);
    return {
      general: await this.general(loaded),
      calendar: this.calendarView(loaded),
      progress: progressView(loaded.settings, eac),
      field: fieldView(loaded.project, loaded.settings),
      workflow: workflowView(loaded.project, loaded.settings),
      periods: periodViews(periods, tehranClock(this.clock.now()).date, new Map([...people].map(([id, person]) => [id, person.fullName]))),
      members: (members.get(loaded.project.id)?.preview ?? []).map((person) => ({
        userId: person.id,
        fullName: person.fullName,
        avatarTone: person.avatarTone,
        isManager: person.id === loaded.project.managerUserId,
      })),
      projectTypes: types.map((type) => ({ id: type.key, name: type.name })),
      notifications,
      alertRules,
      integrations,
      backups,
    };
  }

  /** پیش‌نمایش سه روش EAC (evm.md ۵) — مبلغ، پس فقط با `cbs.view_amounts` (D11). */
  private async eacPreview(projectId: string) {
    const access = this.context.access;
    const amounts = !!access && (access.isOrgAdmin || (access.projects.get(projectId)?.has('cbs.view_amounts') ?? false));
    return amounts ? this.progressReads.eacByMethod(projectId) : null;
  }

  /** `PATCH /projects/:pid/settings` با دقیقاً یک بخش. */
  async patch(projectId: string, body: SettingsPatch) {
    const section = Object.keys(body)[0] as SettingsSection;
    const changed = await this.em.transactional(async (tx) => {
      const loaded = await this.load(tx, projectId, true);
      const diff = await this.apply(tx, loaded, body);
      await this.record(tx, loaded.project, section, diff);
      return loaded;
    });
    switch (section) {
      case 'general':
        return this.general(changed);
      case 'progress':
        return progressView(changed.settings, await this.eacPreview(projectId));
      case 'field':
        return fieldView(changed.project, changed.settings);
      case 'workflow':
        return workflowView(changed.project, changed.settings);
    }
  }

  /** `PUT /projects/:pid/calendar` (W28؛ AC-PS-10: تغییر تقویم ← ProjectSettingsChanged). */
  async putCalendar(projectId: string, input: CalendarInput) {
    const errors = calendarErrors(input);
    if (errors.length > 0) throw new ValidationFailedError(errors);
    const holidays = [...new Map(input.holidays.map((holiday) => [holiday.date, { ...holiday, title: holiday.title.trim() }])).values()].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    return this.writeCalendar(projectId, { ...input, holidays });
  }

  /** «افزودن تعطیلات رسمی <سال>» (F02 ۶). */
  async addOfficialYear(projectId: string, year: number) {
    const official = await this.holidays.forYear(year);
    const current = (await this.load(this.em, projectId, false)).calendar;
    return this.writeCalendar(projectId, {
      workWeek: current.workWeek,
      dayStart: current.dayStart,
      dayEnd: current.dayEnd,
      halfDayEnd: current.halfDayEnd,
      holidays: mergeOfficial(current.holidays, official),
    });
  }

  private async writeCalendar(projectId: string, input: CalendarInput) {
    const saved = await this.em.transactional(async (tx) => {
      const loaded = await this.load(tx, projectId, true);
      const { calendar } = loaded;
      const before = {
        workWeek: calendar.workWeek,
        dayStart: calendar.dayStart,
        dayEnd: calendar.dayEnd,
        halfDayEnd: calendar.halfDayEnd,
        holidays: calendar.holidays,
      };
      const after = {
        workWeek: [...input.workWeek],
        dayStart: input.dayStart,
        dayEnd: input.dayEnd,
        halfDayEnd: input.halfDayEnd,
        holidays: [...input.holidays],
      };
      const diff = diffOf(before, after);
      Object.assign(calendar, after);
      await this.record(tx, loaded.project, 'calendar', diff);
      return loaded;
    });
    return this.calendarView(saved);
  }

  private async apply(tx: EntityManager, { project, settings }: Loaded, body: SettingsPatch): Promise<Diff> {
    if ('general' in body) return this.applyGeneral(tx, project, body.general);
    if ('progress' in body) {
      const input = body.progress;
      if (input.pvReferenceVersionId) {
        throw new ValidationFailedError([{ field: 'pvReferenceVersionId', message: 'مرجع PV با نسخه‌های برنامه (F04) فعال می‌شود.' }]);
      }
      const warning = input.warningThreshold ?? settings.warningThreshold;
      const critical = input.criticalThreshold ?? settings.criticalThreshold;
      if (!(warning > 0 && critical > warning && critical <= 100)) {
        throw new ValidationFailedError([{ field: 'warningThreshold', message: 'آستانهٔ هشدار باید بیشتر از صفر و کمتر از آستانهٔ بحرانی باشد.' }]);
      }
      return assign(settings, {
        weightGenerator: input.weightGenerator,
        showFinancialProgress: input.showFinancialProgress,
        warningThreshold: input.warningThreshold,
        criticalThreshold: input.criticalThreshold,
        eacMethod: input.eacMethod,
      });
    }
    if ('field' in body) {
      const { gpsRadiusM, ...fields } = body.field;
      const diff = assign(settings, fields);
      if (gpsRadiusM !== undefined) Object.assign(diff, assign(project, { gpsRadiusM }));
      return diff;
    }
    const input = body.workflow;
    if (input.stage2OnCriticalPath && !project.mspLinked) {
      throw new ValidationFailedError([{ field: 'stage2OnCriticalPath', message: 'شرط «مسیر بحرانی» فقط برای پروژهٔ متصل به MSP است.' }]);
    }
    return assign(settings, input);
  }

  private async applyGeneral(tx: EntityManager, project: Project, input: GeneralPatch): Promise<Diff> {
    const errors: { field: string; message: string }[] = [];
    if (input.projectTypeId !== undefined && (await tx.count(ProjectType, { key: input.projectTypeId })) === 0) {
      errors.push({ field: 'projectTypeId', message: 'نوع پروژه را از فهرست انتخاب کنید.' });
    }
    const datesChanged =
      (input.plannedStart !== undefined && input.plannedStart !== project.plannedStart) ||
      (input.plannedFinish !== undefined && input.plannedFinish !== project.plannedFinish);
    if (datesChanged && project.mspLinked) throw new ConflictError('PROJECT_DATES_FROM_MSP');
    const start = input.plannedStart ?? project.plannedStart;
    const finish = input.plannedFinish === undefined ? project.plannedFinish : input.plannedFinish;
    if (start && finish && finish < start) errors.push({ field: 'plannedFinish', message: 'تاریخ پایان باید بعد از تاریخ شروع باشد.' });
    const lat = input.siteLat === undefined ? project.siteLat : input.siteLat;
    const lng = input.siteLng === undefined ? project.siteLng : input.siteLng;
    if ((lat == null) !== (lng == null) || (lat != null && lng != null && (lat < 24 || lat > 40 || lng < 44 || lng > 64))) {
      errors.push({ field: 'siteLat', message: 'مختصات کارگاه را مثل «35.7448, 51.2032» در محدودهٔ ایران بنویسید.' });
    }
    if (errors.length > 0) throw new ValidationFailedError(errors);

    return assign(project, {
      name: input.name?.trim(),
      clientName: input.clientName?.trim(),
      projectType: input.projectTypeId,
      description: input.description === undefined ? undefined : input.description.trim() || null,
      plannedStart: input.plannedStart,
      plannedFinish: input.plannedFinish,
      displayCurrencyUnit: input.currency,
      location: input.location === undefined ? undefined : input.location.trim() || null,
      siteLat: input.siteLat,
      siteLng: input.siteLng,
    });
  }

  private async record(tx: EntityManager, project: Project, section: SettingsSection | 'calendar', diff: Diff): Promise<void> {
    const fields = Object.keys(diff.after);
    if (fields.length === 0) return;
    this.audit.record(tx, {
      action: section === 'calendar' ? 'project.calendar_changed' : 'project.settings_changed',
      entityType: 'Project',
      entityId: project.id,
      projectId: project.id,
      before: { section, ...diff.before },
      after: { section, ...diff.after },
    });
    await this.outbox.emit(tx, { type: 'ProjectSettingsChanged', projectId: project.id, payload: { v: 1, section, fields } });
  }

  private async load(em: EntityManager, projectId: string, forWrite: boolean): Promise<Loaded> {
    const lock = forWrite ? { lockMode: LockMode.PESSIMISTIC_WRITE } : {};
    const project = await em.findOne(Project, { id: projectId, deletionRequestedAt: null }, lock);
    if (!project) throw new NotFoundError('PROJECT_NOT_FOUND');
    if (forWrite && READ_ONLY.has(project.status)) throw new ConflictError('PROJECT_READ_ONLY', { status: project.status });
    const [settings, calendar] = await Promise.all([em.findOneOrFail(ProjectSettings, { projectId }), em.findOneOrFail(ProjectCalendar, { projectId })]);
    return { project, settings, calendar };
  }

  private async general({ project }: Loaded) {
    const access = this.context.access;
    if (!access) throw new UnauthorizedError();
    const canViewAmounts = access.isOrgAdmin || (access.projects.get(project.id)?.has('cbs.view_amounts') ?? false);
    const manager = (await this.identity.personRefs([project.managerUserId])).get(project.managerUserId);
    return generalView(project, manager ?? { id: project.managerUserId, fullName: '—', avatarTone: 'a1' }, canViewAmounts);
  }

  private calendarView({ project, calendar }: Loaded) {
    return {
      workWeek: calendar.workWeek,
      dayStart: calendar.dayStart,
      dayEnd: calendar.dayEnd,
      halfDayEnd: calendar.halfDayEnd,
      holidays: calendar.holidays,
      missingOfficialYears: missingOfficialYears(calendar.holidays, project.plannedStart ?? null, project.plannedFinish ?? null),
    };
  }
}

interface Diff {
  readonly before: Record<string, unknown>;
  readonly after: Record<string, unknown>;
}

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

function diffOf(before: Record<string, unknown>, after: Record<string, unknown>): Diff {
  const diff: Diff = { before: {}, after: {} };
  for (const key of Object.keys(after)) {
    if (!same(before[key], after[key])) {
      diff.before[key] = before[key] ?? null;
      diff.after[key] = after[key] ?? null;
    }
  }
  return diff;
}

/** مقدارهای تعریف‌شده را روی هدف می‌نشاند و فقط تغییرها را برمی‌گرداند (فهرست سفید = همین کلیدها). */
function assign<T extends object>(target: T, values: Partial<Record<keyof T, unknown>>): Diff {
  const record = target as Record<string, unknown>;
  const defined = Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
  const diff = diffOf(record, defined);
  Object.assign(target, defined);
  return diff;
}
