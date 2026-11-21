import { Injectable } from '@nestjs/common';
import { EntityManager, UniqueConstraintViolationException } from '@mikro-orm/postgresql';
import type { ProjectRoleCode } from '@projeyar/shared';
import { Audit } from '../../../platform/audit/audit.js';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { newId } from '../../../platform/database/ids.js';
import { ConflictError, DomainError, UnauthorizedError } from '../../../platform/http/errors.js';
import { Outbox } from '../../../platform/outbox/outbox.js';
import { jalaliYear } from '../../../platform/time/jalali.js';
import { contingencyReserve, scheduleSpan } from '../../computation/index.js';
import { addDays } from '../../../platform/scheduler/ticks.js';
import { Invitations } from '../../identity/index.js';
import { ApprovalRoutes, TeamService } from '../../team/index.js';
import { ProjectCalendar, ProjectSettings } from '../domain/project-settings.entity.js';
import { Project, ProjectCodeRegister } from '../domain/project.entity.js';
import { mergeOfficial, presetOf, workWeekOf } from '../domain/rules/calendar.js';
import { normalizeCode, PROJECT_CODE } from '../domain/rules/project-code.js';
import { inviteMobile, type WizardState, wizardBlockers } from '../domain/rules/wizard.js';
import { OfficialHolidays } from './official-holidays.js';
import { PlanBootstrap } from './plan-ports.js';
import { ProjectTemplates } from './settings-ports.js';
import { WizardDrafts } from './wizard-drafts.js';
import { WizardPreview } from './wizard-preview.js';

// «ساخت پروژه» از پیش‌نویس ویزارد (F02 ۵.۴). یک تراکنش: دفتر کد، Project(draft)، ProjectSettings،
// ProjectCalendar، تیم اولیه، حذف پیش‌نویس، ممیزی و ProjectCreated. نسخهٔ پیش‌نویس برنامه با F04 و ساختار با
// F03 می‌آیند؛ دعوت‌ها با F01 (تصمیم‌های کاربر 1405/08/22).

export interface CreateProjectResult {
  readonly projectId: string;
  readonly next: 'overview' | 'msp_import';
}

@Injectable()
export class ProjectCreation {
  constructor(
    private readonly em: EntityManager,
    private readonly context: AppContext,
    private readonly drafts: WizardDrafts,
    private readonly preview: WizardPreview,
    private readonly holidays: OfficialHolidays,
    private readonly team: TeamService,
    private readonly audit: Audit,
    private readonly outbox: Outbox,
    private readonly clock: Clock,
    private readonly invitations: Invitations,
    private readonly plans: PlanBootstrap,
    private readonly templates: ProjectTemplates,
    private readonly routes: ApprovalRoutes,
  ) {}

  async create(draftId: string): Promise<CreateProjectResult> {
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError();
    const draft = await this.drafts.load(draftId);
    const state = draft.state as unknown as WizardState;

    const facts = await this.preview.facts(state);
    // کد خوش‌شکل ولی گرفته‌شده: ۴۰۹ با پیشنهاد کد بعدی (F02 ۵.۵)، پیش از بقیهٔ مانع‌ها
    if (!facts.code.available && PROJECT_CODE.test(facts.code.code)) {
      throw new ConflictError('PROJECT_CODE_TAKEN', { suggestion: facts.code.suggestion });
    }
    const blockers = wizardBlockers(state, facts);
    if (blockers.length > 0) throw new DomainError('PROJECT_WIZARD_BLOCKED', 422, { blockers });

    const { basic, schedule, team, structure } = state;
    const start = schedule.plannedStart as string;
    const finish = schedule.plannedFinish as string;
    const budget = BigInt(schedule.plannedTotalBudget as string);
    const reserve = schedule.contingencyPct === null ? 0n : contingencyReserve(budget, schedule.contingencyPct.toFixed(4));
    const managerId = team.managerUserId as string;
    const preset = presetOf(schedule.calendarPresetId);
    // سال اول همراه پروژه؛ سال‌های بعد با «افزودن تعطیلات رسمی» در W28 (همان ماک)
    const official = await this.holidays.forYears([jalaliYear(start)]);
    const code = normalizeCode(basic.code);
    const projectId = newId();
    // ساخت از قالب (templates.md ۵.۳): روزهای کاری پروژه با تقویم همین پروژه و بودجهٔ CBS = بودجهٔ کل − ذخیره
    const workWeek = workWeekOf(preset.modes);
    const holidays = mergeOfficial([], official);
    const calendar = {
      weekModes: workWeek.map((day) => day.mode),
      holidays: new Set(holidays.filter((holiday) => holiday.enabled).map((holiday) => holiday.date)),
    };
    const workDays: string[] = [];
    for (let date = start; date <= finish; date = addDays(date, 1)) if ((scheduleSpan(date, date, calendar)?.workDays ?? 0) > 0) workDays.push(date);
    const template =
      structure.mode === 'template' && structure.templateId
        ? await this.templates.prepare(structure.templateId, { workDays, cbsBudget: budget - reserve })
        : null;
    const invites = team.members.flatMap((member) => {
      const mobile = member.userId ? null : inviteMobile(member.inviteTarget);
      return mobile ? [{ mobile, fullName: member.fullName.trim() || mobile, roles: [...member.roles] }] : [];
    });
    /** شماره ← کد دعوت اپ برای پیامک پس از commit (OD-20). */
    const inviteCodes = new Map<string, string>();

    try {
      await this.em.transactional(async (tx) => {
        tx.create(ProjectCodeRegister, { orgId: actor.orgId, code, projectId });
        const project = tx.create(Project, {
          id: projectId,
          orgId: actor.orgId,
          code,
          name: basic.name.trim(),
          clientName: basic.clientName.trim(),
          projectType: basic.projectTypeId as string,
          description: null,
          status: 'draft',
          managerUserId: managerId,
          plannedStart: start,
          plannedFinish: finish,
          mspLinked: false,
          activatedAt: null,
          contingencyReserve: reserve.toString(),
          displayCurrencyUnit: schedule.currency,
          location: basic.location.trim() || null,
          imageKey: null,
          plannedTotalBudget: budget.toString(),
          contingencyPct: schedule.contingencyPct,
          siteLat: null,
          siteLng: null,
          gpsRadiusM: 300,
          keyMilestones: schedule.milestones.map((milestone) => ({ title: milestone.title.trim(), date: milestone.date as string })),
          templateId: template?.templateId ?? null,
          templateVersion: template?.version ?? null,
          createdByUserId: actor.userId,
        });
        // جدول‌های وابسته کلید خارجی پایگاه داده دارند نه رابطهٔ ORM؛ پروژه باید پیش از آن‌ها درج شود
        await tx.flush();
        // تنظیمات همراه قالب (۵.۵) جز آنچه ویزارد خودش تعیین کرده (جایگزین تأیید)
        tx.create(ProjectSettings, { ...(template?.settings ?? {}), projectId, orgId: actor.orgId, alternateReviewerUserId: managerId });
        tx.create(ProjectCalendar, {
          projectId,
          orgId: actor.orgId,
          workWeek,
          holidays,
        });
        await this.team.addInitialMembers(tx, { orgId: actor.orgId, projectId, members: this.initialTeam(state, actor.userId) });
        // دعوت با شماره (§۷.۱.۲۹ ردیف ۲ پس از برش ۱): کاربر invited و دعوت ۷روزه؛ ظرفیت و یکتایی در همین تراکنش
        for (const invite of invites) {
          const created = await this.invitations.createWithin(
            tx,
            { orgId: actor.orgId, actorUserId: actor.userId, projectId, fullName: invite.fullName, mobile: invite.mobile, email: null, roles: invite.roles },
            this.clock.now(),
          );
          inviteCodes.set(invite.mobile, created.inviteCode);
        }
        // مبنای کاری (F04 ۳): نسخهٔ ۰ با منبع wizard و گروه «نقاط عطف کلیدی» با وزن ۰ (project-setup.md ۵.۲)
        await this.plans.createBaseline(tx, {
          orgId: actor.orgId,
          projectId,
          actorUserId: actor.userId,
          milestones: project.keyMilestones,
          ...(template ? { content: template.content } : {}),
        });
        // حوزه‌های قالب بی ناظر (۵.۳ گام ۵؛ AC-TP-09)؛ ناظر در W48 یا W29 تعیین می‌شود
        if (template && template.areas.length > 0) await this.routes.createUnassigned(tx, { orgId: actor.orgId, projectId, areas: template.areas });
        tx.remove(draft);
        this.audit.record(tx, {
          action: 'project.created',
          entityType: 'Project',
          entityId: projectId,
          projectId,
          after: { code, name: project.name, managerUserId: managerId, structure: structure.mode },
        });
        await this.outbox.emit(tx, { type: 'ProjectCreated', projectId, payload: { v: 1, structure: structure.mode } });
      });
    } catch (error) {
      // دو نفر هم‌زمان یک کد (F02 ۱۳): دومی «کد گرفته شد» با پیشنهاد بعدی
      if (error instanceof UniqueConstraintViolationException) {
        throw new ConflictError('PROJECT_CODE_TAKEN', { suggestion: await this.preview.suggestCode() });
      }
      throw error;
    }
    for (const invite of invites) await this.invitations.notify(invite.mobile, basic.name.trim(), inviteCodes.get(invite.mobile) ?? '');
    return { projectId, next: structure.mode === 'msp' ? 'msp_import' : 'overview' };
  }

  /** مدیر با نقش مدیر پروژه؛ سازنده‌ای که مدیر نیست برنامه‌ریز (F02 ۵.۳)؛ اعضا با نقش‌های خودشان. */
  private initialTeam(state: WizardState, creatorId: string): { userId: string; roles: ProjectRoleCode[] }[] {
    const managerId = state.team.managerUserId as string;
    const members = state.team.members.filter((member): member is typeof member & { userId: string } => !!member.userId);
    const team = [
      { userId: managerId, roles: ['project_manager' as ProjectRoleCode] },
      ...members.map((member) => ({ userId: member.userId, roles: [...member.roles] })),
    ];
    if (creatorId !== managerId && !members.some((member) => member.userId === creatorId)) team.push({ userId: creatorId, roles: ['planner'] });
    return team;
  }
}
