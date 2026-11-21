import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { type ProjectRoleCode, SYSTEM_ROLES } from '@projeyar/shared';
import { Clock } from '../../../platform/clock/clock.js';
import { AppContext } from '../../../platform/context/app-context.js';
import { toFaDigits } from '../../../platform/http/fa.js';
import { UnauthorizedError } from '../../../platform/http/errors.js';
import { formatJalali, jalaliYear } from '../../../platform/time/jalali.js';
import { cbsShare, contingencyReserve, scheduleSpan } from '../../computation/index.js';
import { IdentityService } from '../../identity/index.js';
import { TeamService } from '../../team/index.js';
import { Project, ProjectCodeRegister, ProjectType } from '../domain/project.entity.js';
import { CALENDAR_PRESETS, presetOf, yearsBetween } from '../domain/rules/calendar.js';
import { nextCode, normalizeCode, PROJECT_CODE } from '../domain/rules/project-code.js';
import { type Blocker, type ScheduleErrors, scheduleErrors, type WizardFacts, type WizardState, wizardBlockers } from '../domain/rules/wizard.js';
import { OfficialHolidays } from './official-holidays.js';

// کمک‌های ویزارد (F02 ۵؛ ۱۲ «کمکی»): گزینه‌ها، کد، پیش‌نمایش زمان و بودجه، ترکیب تیم، خلاصه و مانع‌ها.
// هر عدد از ماژول محاسبات می‌آید (D07)؛ صفحه فقط نشان می‌دهد.

/** نماد نوع پروژه در کارت W37 `[پیش‌فرض فنی]`؛ همان فرانت. */
const TYPE_ICONS: Readonly<Record<string, string>> = {
  residential: 'building-2',
  commercial: 'store',
  road_bridge: 'route',
  tunnel: 'mountain',
  energy: 'zap',
  healthcare: 'hospital',
  parking: 'car',
  heritage: 'landmark',
};

const ROLE_ORDER: readonly ProjectRoleCode[] = ['project_manager', 'planner', 'reviewer', 'supervisor', 'client_reviewer', 'finance'];

const faWeekday = new Intl.DateTimeFormat('fa-IR', { weekday: 'long', timeZone: 'UTC' });

export interface SchedulePreview {
  readonly calendarDays: number | null;
  readonly months: number | null;
  readonly workDays: number | null;
  readonly holidays: number | null;
  readonly calendarName: string;
  readonly startWeekday: string | null;
  readonly finishWeekday: string | null;
  readonly contingencyReserve: string | null;
  readonly cbsShare: string | null;
  readonly errors: ScheduleErrors;
}

export interface CodeAvailability {
  readonly code: string;
  readonly available: boolean;
  readonly suggestion: string | null;
  readonly message: string;
}

/** درصد عددی ورودی ← رشتهٔ دهدهی برای فرمول (C04). */
const pctString = (pct: number): string => pct.toFixed(4);

@Injectable()
export class WizardPreview {
  constructor(
    private readonly em: EntityManager,
    private readonly context: AppContext,
    private readonly clock: Clock,
    private readonly identity: IdentityService,
    private readonly team: TeamService,
    private readonly holidays: OfficialHolidays,
  ) {}

  async options() {
    const actor = this.context.actor;
    if (!actor) throw new UnauthorizedError();
    const [types, people, isManager, suggestedCode] = await Promise.all([
      this.em.find(ProjectType, {}, { orderBy: { sortOrder: 'asc' } }),
      this.identity.personRefs([actor.userId]),
      this.team.hasRoleAnywhere(actor.userId, 'project_manager'),
      this.suggestCode(),
    ]);
    const me = people.get(actor.userId);
    return {
      projectTypes: types.map((type) => ({ id: type.key, name: type.name, icon: TYPE_ICONS[type.key] ?? 'folder' })),
      calendarPresets: CALENDAR_PRESETS.map(({ id, name, isDefault }) => ({ id, name, isDefault })),
      suggestedCode,
      me: { userId: actor.userId, fullName: me?.fullName ?? '—', avatarTone: me?.avatarTone ?? 'a1', isProjectManagerRole: isManager },
    };
  }

  /** `GET /projects/code-available` (AC-PS-03؛ C05). کد حذف‌شده هم گرفته است (۸.۴). */
  async codeAvailability(raw: string): Promise<CodeAvailability> {
    const code = normalizeCode(raw);
    if (!PROJECT_CODE.test(code)) {
      return { code, available: false, suggestion: await this.suggestCode(), message: 'کد باید مثل PRJ-1405-001 باشد.' };
    }
    const taken = (await this.em.count(ProjectCodeRegister, { code })) > 0;
    return taken
      ? { code, available: false, suggestion: await this.suggestCode(), message: 'این کد گرفته شده است.' }
      : { code, available: true, suggestion: null, message: 'کد در دسترس است' };
  }

  /** پیشنهاد کد سال شمسی جاری (C05). */
  async suggestCode(): Promise<string> {
    const year = jalaliYear(this.clock.now().toISOString().slice(0, 10));
    const codes = await this.em.find(ProjectCodeRegister, { code: { $like: `PRJ-${year}-%` } }, { fields: ['code'] });
    return nextCode(
      year,
      codes.map((row) => row.code),
    );
  }

  /** مدت، روز کاری، ذخیره و سهم CBS (F02 ۵.۲؛ AC-PS-01، AC-PS-02). */
  async schedulePreview(schedule: WizardState['schedule']): Promise<SchedulePreview> {
    const preset = presetOf(schedule.calendarPresetId);
    const errors = scheduleErrors(schedule);
    const { plannedStart: start, plannedFinish: finish } = schedule;
    let span = null;
    if (start && finish && !errors.dates) {
      const official = await this.holidays.forYears(yearsBetween(start, finish));
      span = scheduleSpan(start, finish, { weekModes: preset.modes, holidays: new Set(official.map((holiday) => holiday.date)) });
    }
    const budget = schedule.plannedTotalBudget && !errors.budget ? BigInt(schedule.plannedTotalBudget) : null;
    const reserve =
      budget === null ? null : schedule.contingencyPct !== null && !errors.contingency ? contingencyReserve(budget, pctString(schedule.contingencyPct)) : 0n;
    return {
      calendarDays: span?.calendarDays ?? null,
      months: span?.months ?? null,
      workDays: span?.workDays ?? null,
      holidays: span?.holidays ?? null,
      calendarName: preset.name,
      startWeekday: start ? faWeekday.format(new Date(`${start}T12:00:00Z`)) : null,
      finishWeekday: finish ? faWeekday.format(new Date(`${finish}T12:00:00Z`)) : null,
      contingencyReserve: reserve?.toString() ?? null,
      cbsShare: budget !== null && reserve !== null ? cbsShare(budget, reserve).toString() : null,
      errors,
    };
  }

  /** ترکیب تیم، هشدارها و پیشنهاد از پروژه‌های هم‌نوع (F02 ۵.۳). */
  async teamCheck(state: Pick<WizardState, 'team' | 'basic'>) {
    const roles: ProjectRoleCode[] = [];
    if (state.team.managerUserId) roles.push('project_manager');
    for (const member of state.team.members) roles.push(...member.roles);
    const composition = ROLE_ORDER.map((role) => ({ role, count: roles.filter((entry) => entry === role).length })).filter((entry) => entry.count > 0);

    const managerName = state.team.managerDisplay?.fullName ?? 'مدیر پروژه';
    const warnings: string[] = [];
    if (!roles.includes('reviewer')) warnings.push(`هنوز ناظری تعیین نشده است؛ تا آن زمان همهٔ گزارش‌ها به ${managerName} می‌رسند.`);
    if (!roles.includes('supervisor')) warnings.push('سرپرست کارگاهی نیست؛ گزارش روزانه پس از تخصیص سرپرست در W17 شروع می‌شود.');

    const chosen = new Set([state.team.managerUserId, ...state.team.members.map((member) => member.userId)]);
    const similar = state.basic.projectTypeId
      ? await this.em.find(Project, { projectType: state.basic.projectTypeId, deletionRequestedAt: null }, { fields: ['id'], limit: 20 })
      : [];
    const candidates = (
      await this.team.membersWithRoles(
        similar.map((project) => project.id),
        ['reviewer', 'supervisor'],
      )
    )
      .filter((entry) => !chosen.has(entry.userId))
      .slice(0, 2);
    const people = await this.identity.personRefs(candidates.map((entry) => entry.userId));
    const suggestions = candidates.flatMap((entry) => {
      const person = people.get(entry.userId);
      return person
        ? [
            {
              userId: person.id,
              fullName: person.fullName,
              avatarTone: person.avatarTone,
              role: entry.role,
              note: `${SYSTEM_ROLES[entry.role]} در پروژهٔ هم‌نوع`,
            },
          ]
        : [];
    });
    return { composition, warnings, suggestions };
  }

  /** واقعیت‌های لازم برای مانع‌ها (کد، نوع، کاربران فعال). */
  async facts(state: WizardState): Promise<WizardFacts & { readonly code: CodeAvailability }> {
    const userIds = [state.team.managerUserId, ...state.team.members.map((member) => member.userId)].filter((id): id is string => !!id);
    const [code, typeCount, active] = await Promise.all([
      this.codeAvailability(state.basic.code),
      state.basic.projectTypeId ? this.em.count(ProjectType, { key: state.basic.projectTypeId }) : Promise.resolve(0),
      this.identity.activeUserIds(userIds),
    ]);
    return { code, projectTypeKnown: typeCount > 0, activeUserIds: active };
  }

  async blockers(state: WizardState): Promise<Blocker[]> {
    return wizardBlockers(state, await this.facts(state));
  }

  /** خلاصهٔ مرحلهٔ ۴ و مانع‌های «ساخت پروژه». */
  async summary(state: WizardState) {
    const [preview, blockers] = await Promise.all([this.schedulePreview(state.schedule), this.blockers(state)]);
    const { plannedStart: start, plannedFinish: finish } = state.schedule;
    const billions = (value: string) =>
      `${toFaDigits((Number(BigInt(value) / 100_000_000n) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 }))
        .replace(/,/g, '٬')
        .replace('.', '٫')} میلیارد ریال`;
    const reserve = preview.contingencyReserve && preview.contingencyReserve !== '0' ? ` · ذخیره ${billions(preview.contingencyReserve)}` : '';
    const others = state.team.members.length;
    const modeLabel = { empty: 'شروع از صفر', msp: 'ورود از فایل MSP', template: 'از قالب' }[state.structure.mode];
    return {
      rows: [
        { label: 'کارفرما', value: state.basic.clientName.trim() || '—' },
        {
          label: 'شروع تا پایان',
          value:
            start && finish
              ? `${toFaDigits(formatJalali(start))} تا ${toFaDigits(formatJalali(finish))}${preview.calendarDays ? ` (${toFaDigits(preview.calendarDays)} روز)` : ''}`
              : '—',
        },
        {
          label: 'بودجهٔ کل',
          value: state.schedule.plannedTotalBudget && !preview.errors.budget ? `${billions(state.schedule.plannedTotalBudget)}${reserve}` : '—',
        },
        {
          label: 'تیم',
          value: state.team.managerDisplay ? `${state.team.managerDisplay.fullName}${others ? ` و ${toFaDigits(others)} عضو دیگر` : ''}` : '—',
        },
        { label: 'ساختار', value: modeLabel },
      ],
      inviteCount: state.team.members.filter((member) => !member.userId && member.inviteTarget).length,
      appSmsNames: state.team.members.filter((member) => member.roles.includes('supervisor')).map((member) => member.fullName),
      blockers,
    };
  }
}
