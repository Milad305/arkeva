import type { ProjectRoleCode } from '@projeyar/shared';

// ویزارد ساخت پروژه (F02 ۵؛ W37، W47، W48، W38) — شکل پیش‌نویس و مانع‌های «ساخت پروژه». همان
// ProjectWizardDraft فرانت؛ قواعد خالص، بی پایگاه داده.

export type WizardStep = 1 | 2 | 3 | 4;
export type StructureMode = 'empty' | 'msp' | 'template';

export interface WizardMember {
  readonly userId: string | null;
  readonly fullName: string;
  readonly avatarTone: string;
  readonly inviteTarget: string | null;
  readonly roles: readonly ProjectRoleCode[];
  readonly note: string | null;
}

export interface WizardState {
  readonly step: WizardStep;
  readonly basic: {
    readonly name: string;
    readonly code: string;
    readonly clientName: string;
    readonly projectTypeId: string | null;
    readonly location: string;
    readonly imageName: string | null;
  };
  readonly schedule: {
    readonly plannedStart: string | null;
    readonly plannedFinish: string | null;
    readonly calendarPresetId: string;
    readonly currency: 'rial' | 'toman';
    readonly plannedTotalBudget: string | null;
    readonly contingencyPct: number | null;
    readonly milestones: readonly { readonly key: string; readonly title: string; readonly date: string | null }[];
  };
  readonly team: {
    readonly managerUserId: string | null;
    readonly managerDisplay: { readonly fullName: string; readonly avatarTone: string; readonly contact: string } | null;
    readonly members: readonly WizardMember[];
  };
  readonly structure: { readonly mode: StructureMode; readonly templateId: string | null };
  readonly sendInvites: boolean;
}

export interface Blocker {
  readonly step: WizardStep;
  readonly message: string;
}

export interface ScheduleErrors {
  dates?: string;
  budget?: string;
  contingency?: string;
}

/** خطاهای مرحلهٔ ۲ (F02 ۵.۲): پایان پس از شروع، بودجهٔ مثبت، ذخیره ۰ تا ۲۰. */
export function scheduleErrors(schedule: WizardState['schedule']): ScheduleErrors {
  const errors: ScheduleErrors = {};
  const { plannedStart: start, plannedFinish: finish } = schedule;
  if (start && finish && finish < start) errors.dates = 'تاریخ پایان باید بعد از تاریخ شروع باشد.';
  if (schedule.plannedTotalBudget !== null && !/^[1-9]\d{0,18}$/.test(schedule.plannedTotalBudget)) {
    errors.budget = 'بودجهٔ کل را به عدد مثبت ریال بنویسید.';
  }
  const pct = schedule.contingencyPct;
  if (pct !== null && (!Number.isFinite(pct) || pct < 0 || pct > 20 || Math.round(pct * 10_000) !== pct * 10_000)) {
    errors.contingency = 'ذخیرهٔ احتیاطی بین ۰ تا ۲۰ درصد است.';
  }
  return errors;
}

export interface WizardFacts {
  /** نتیجهٔ بررسی یکتایی کد در دفتر کدها. */
  readonly code: { readonly available: boolean; readonly message: string };
  readonly projectTypeKnown: boolean;
  /** کاربران فعال سازمان در میان مدیر و اعضا. */
  readonly activeUserIds: ReadonlySet<string>;
}

/** مانع‌های «ساخت پروژه» به ترتیب مرحله (F02 ۵.۴؛ تصمیم‌های کاربر 1405/08/22 برای قالب و دعوت). */
export function wizardBlockers(state: WizardState, facts: WizardFacts): Blocker[] {
  const blockers: Blocker[] = [];
  const { basic, schedule, team, structure } = state;

  if (basic.name.trim().length < 3) blockers.push({ step: 1, message: 'نام پروژه را بنویسید.' });
  if (!basic.clientName.trim()) blockers.push({ step: 1, message: 'کارفرما را بنویسید.' });
  if (!basic.projectTypeId || !facts.projectTypeKnown) blockers.push({ step: 1, message: 'نوع پروژه را انتخاب کنید.' });
  if (!facts.code.available) blockers.push({ step: 1, message: facts.code.message });

  const errors = scheduleErrors(schedule);
  if (!schedule.plannedStart || !schedule.plannedFinish) blockers.push({ step: 2, message: 'تاریخ شروع و پایان برنامه‌ای را بدهید.' });
  if (errors.dates) blockers.push({ step: 2, message: errors.dates });
  if (!schedule.plannedTotalBudget) blockers.push({ step: 2, message: 'بودجهٔ کل را بنویسید.' });
  if (errors.budget) blockers.push({ step: 2, message: errors.budget });
  if (errors.contingency) blockers.push({ step: 2, message: errors.contingency });
  if (schedule.milestones.some((milestone) => !milestone.title.trim() || !milestone.date)) {
    blockers.push({ step: 2, message: 'نام و تاریخ همهٔ نقاط عطف را کامل کنید.' });
  }

  if (!team.managerUserId) blockers.push({ step: 3, message: 'مدیر پروژه را انتخاب کنید.' });
  else if (!facts.activeUserIds.has(team.managerUserId)) blockers.push({ step: 3, message: 'مدیر پروژه کاربر فعال سازمان نیست؛ دوباره انتخابش کنید.' });
  // دعوت همیشه با شمارهٔ همراه است (تصمیم کاربر 1405/08/22)؛ ایمیل را بعد در «کاربران» افزود
  if (team.members.some((member) => !member.userId && !inviteMobile(member.inviteTarget))) {
    blockers.push({ step: 3, message: 'دعوت با شمارهٔ همراه است (مثل 09121234567)؛ ایمیل را پس از ساخت در «کاربران سازمان» بیفزایید.' });
  }
  const invited = team.members.flatMap((member) => (member.userId ? [] : [inviteMobile(member.inviteTarget)]));
  if (new Set(invited).size !== invited.length) blockers.push({ step: 3, message: 'یک شماره دو بار دعوت شده است؛ یکی را حذف کنید.' });
  if (team.members.some((member) => member.userId && !facts.activeUserIds.has(member.userId))) {
    blockers.push({ step: 3, message: 'یکی از اعضا کاربر فعال سازمان نیست؛ از فهرست دوباره انتخابش کنید.' });
  }
  if (team.members.some((member) => member.roles.length === 0)) blockers.push({ step: 3, message: 'برای هر عضو دست‌کم یک نقش انتخاب کنید.' });

  // ساخت از قالب (F16 ۵.۳)؛ منتشرشده بودن قالب را ساخت پروژه با درگاه ProjectTemplates می‌سنجد
  if (structure.mode === 'template' && !structure.templateId) {
    blockers.push({ step: 4, message: 'قالبی انتخاب نشده است. یکی از قالب‌ها را انتخاب کنید یا «شروع از صفر» را بزنید.' });
  }
  return blockers;
}

/** شمارهٔ همراه دعوت ویزارد («۰۹۱۲ ۳۴۵ ۶۷۸۹» هم)، یا null. */
export function inviteMobile(target: string | null | undefined): string | null {
  if (!target) return null;
  const digits = target.replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[\s\-()]/g, '');
  const local = digits.replace(/^(\+98|0098)/, '0');
  return /^09\d{9}$/.test(local) ? local : null;
}
