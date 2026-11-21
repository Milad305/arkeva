import { defineEntity, p } from '@mikro-orm/postgresql';
import { createdAtColumn, versionedColumns } from '../../../platform/database/base-properties.js';

// ProjectSettings و ProjectCalendar (`02` ۳؛ F02 ۶–۷). یک ردیف برای هر پروژه، کلید = projectId.
// مالک: F02؛ ماژول‌های تأیید، کارگاه و محاسبات فقط از سرویس عمومی projects می‌خوانند.

export const WEIGHT_GENERATORS = ['manual', 'cost', 'duration', 'equal'] as const;
export const EAC_METHODS = ['cpi', 'remaining', 'composite'] as const;
export const GPS_MODES = ['flag_only', 'block'] as const;
export const APPROVAL_MODES = ['single_stage', 'two_stage'] as const;
export const DEADLINE_ACTIONS = ['remind_only', 'escalate'] as const;

const ProjectSettingsSchema = defineEntity({
  name: 'ProjectSettings',
  tableName: 'project_settings',
  properties: {
    projectId: p.uuid().primary(),
    orgId: p.uuid(),
    warningThreshold: p.decimal('number').default(5),
    criticalThreshold: p.decimal('number').default(15),
    weightGenerator: p.enum(WEIGHT_GENERATORS).default('manual'),
    showFinancialProgress: p.boolean().default(false),
    eacMethod: p.enum(EAC_METHODS).default('cpi'),
    minPhotos: p.integer().default(2),
    maxJumpPct: p.decimal('number').default(20),
    allowDecrease: p.boolean().default(false),
    offlineEnabled: p.boolean().default(true),
    lateAfterHours: p.integer().default(72),
    dailyReminderEnabled: p.boolean().default(true),
    dailyReminderTime: p.string().default('17:00'),
    gpsMode: p.enum(GPS_MODES).default('flag_only'),
    approvalMode: p.enum(APPROVAL_MODES).default('two_stage'),
    stage2OnCritical: p.boolean().default(true).fieldName('stage2_on_critical'),
    stage2OnJump: p.boolean().default(true).fieldName('stage2_on_jump'),
    stage2OnGpsOut: p.boolean().default(true).fieldName('stage2_on_gps_out'),
    // راهبرد نام‌گذاری «stage2On» را stage2on می‌کرد؛ نام ستون صریح
    stage2OnCriticalPath: p.boolean().default(false).fieldName('stage2_on_critical_path'),
    reviewDeadlineHours: p.integer().default(24),
    onDeadline: p.enum(DEADLINE_ACTIONS).default('escalate'),
    /** پیش‌فرض مدیر پروژه (`02` ۳). */
    alternateReviewerUserId: p.uuid().nullable(),
    autoApproveEnabled: p.boolean().default(true),
    autoApproveMaxDelta: p.decimal('number').default(2),
    ...versionedColumns(),
  },
});

export class ProjectSettings extends ProjectSettingsSchema.class {}
ProjectSettingsSchema.setClass(ProjectSettings);

export const WEEKDAY_KEYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] as const;
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];
export type DayModeKey = 'full' | 'half' | 'off';

export interface WorkWeekDay {
  readonly day: WeekdayKey;
  readonly mode: DayModeKey;
}

export interface CalendarHoliday {
  readonly date: string;
  readonly title: string;
  readonly type: 'official' | 'manual';
  readonly enabled: boolean;
}

const ProjectCalendarSchema = defineEntity({
  name: 'ProjectCalendar',
  tableName: 'project_calendar',
  properties: {
    projectId: p.uuid().primary(),
    orgId: p.uuid(),
    /** W28: حالت هر روز هفته؛ ساعت‌ها مشترک (روز کامل تا dayEnd، نیم‌روز تا halfDayEnd). */
    workWeek: p.json<WorkWeekDay[]>(),
    dayStart: p.string().default('07:00'),
    dayEnd: p.string().default('16:00'),
    halfDayEnd: p.string().default('12:00'),
    holidays: p.json<CalendarHoliday[]>(),
    ...versionedColumns(),
  },
});

export class ProjectCalendar extends ProjectCalendarSchema.class {}
ProjectCalendarSchema.setClass(ProjectCalendar);

/** تعطیلی رسمی افزودهٔ سازمان (قمری یا ناگهانی؛ تصمیم کاربر 1405/08/22). */
const OrgOfficialHolidaySchema = defineEntity({
  name: 'OrgOfficialHoliday',
  tableName: 'org_official_holiday',
  properties: {
    id: p.uuid().primary(),
    orgId: p.uuid(),
    date: p.date(),
    title: p.string(),
    createdByUserId: p.uuid(),
    createdAt: createdAtColumn(),
  },
});

export class OrgOfficialHoliday extends OrgOfficialHolidaySchema.class {}
OrgOfficialHolidaySchema.setClass(OrgOfficialHoliday);

/** پیش‌نویس ویزارد (F02 ۵.۵): فقط برای سازنده؛ پروژه نیست و کد رزرو نمی‌کند. */
const ProjectWizardDraftSchema = defineEntity({
  name: 'ProjectWizardDraft',
  tableName: 'project_wizard_draft',
  properties: {
    id: p.uuid().primary(),
    orgId: p.uuid(),
    createdByUserId: p.uuid(),
    state: p.json<Record<string, unknown>>(),
    ...versionedColumns(),
  },
});

export class ProjectWizardDraft extends ProjectWizardDraftSchema.class {}
ProjectWizardDraftSchema.setClass(ProjectWizardDraft);
