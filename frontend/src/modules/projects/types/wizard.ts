import type { SystemRole } from '@/config/constants';
import type { EntityId, IsoDate, IsoInstant, RialAmount } from '@/shared/types/api';
import type { IconName } from '@/shared/components/ui/Icon';

// ویزارد ساخت پروژه (F02 ۵: W37، W47، W48، W38). مدت، روز کاری، ذخیره، سهم CBS، کد
// بعدی و یکتایی کد را سرور می‌سازد (D07)؛ صفحه فقط ورودی می‌گیرد و نتیجه را نشان می‌دهد.

export type WizardStep = 1 | 2 | 3 | 4;
export type StructureMode = 'empty' | 'msp' | 'template';

export interface WizardMilestone {
  key: string;
  title: string;
  date: IsoDate | null;
}

export interface WizardMember {
  /** کاربر سازمان؛ یا `null` برای دعوت با شماره/ایمیل. */
  userId: EntityId | null;
  fullName: string;
  avatarTone: string;
  /** شماره یا ایمیل برای دعوت. */
  inviteTarget: string | null;
  roles: SystemRole[];
  note: string | null;
}

export interface ProjectWizardDraft {
  id: EntityId;
  step: WizardStep;
  basic: {
    name: string;
    code: string;
    clientName: string;
    projectTypeId: EntityId | null;
    location: string;
    imageName: string | null;
  };
  schedule: {
    plannedStart: IsoDate | null;
    plannedFinish: IsoDate | null;
    calendarPresetId: EntityId;
    currency: 'rial' | 'toman';
    /** بودجهٔ کل به ریال (C02). */
    plannedTotalBudget: RialAmount | null;
    contingencyPct: number | null;
    milestones: WizardMilestone[];
  };
  team: {
    managerUserId: EntityId | null;
    /** نام و تماس مدیر برای نمایش پس از بازگشت به پیش‌نویس. */
    managerDisplay: { fullName: string; avatarTone: string; contact: string } | null;
    members: WizardMember[];
  };
  structure: {
    mode: StructureMode;
    templateId: EntityId | null;
  };
  sendInvites: boolean;
  updatedAt: IsoInstant;
}

export interface WizardOptionsDto {
  projectTypes: Array<{ id: EntityId; name: string; icon: IconName }>;
  calendarPresets: Array<{ id: EntityId; name: string; isDefault: boolean }>;
  /** پیشنهاد کد: `PRJ-<سال>-<NNN>` (C05). */
  suggestedCode: string;
  /** کاربر جاری برای پیش‌فرض مدیر پروژه (۵.۳). */
  me: { userId: EntityId; fullName: string; avatarTone: string; isProjectManagerRole: boolean };
}

export interface CodeAvailabilityDto {
  code: string;
  available: boolean;
  /** پیشنهاد بعدی وقتی گرفته شده است. */
  suggestion: string | null;
  message: string;
}

/** `POST /projects/drafts/schedule-preview` `[پیش‌فرض فنی]` — مدت و ذخیره از سرور. */
export interface SchedulePreviewDto {
  calendarDays: number | null;
  months: number | null;
  workDays: number | null;
  holidays: number | null;
  calendarName: string;
  startWeekday: string | null;
  finishWeekday: string | null;
  contingencyReserve: RialAmount | null;
  cbsShare: RialAmount | null;
  errors: { dates?: string; budget?: string; contingency?: string };
}

export interface WizardTemplateDto {
  id: EntityId;
  title: string;
  icon: IconName;
  version: string;
  wbsCount: number;
  cbsCount: number;
  usedIn: number;
  recommended: boolean;
  /** آنچه با این قالب کپی می‌شود. */
  copies: string[];
}

export interface WizardTeamCheckDto {
  composition: Array<{ role: SystemRole; count: number }>;
  /** AL-STR-06 پیش‌نمایش: «برای گزارش‌های تأسیسات هنوز ناظری تعیین نشده…». */
  warnings: string[];
  suggestions: Array<{ userId: EntityId; fullName: string; avatarTone: string; role: SystemRole; note: string }>;
}

export interface WizardSummaryDto {
  rows: Array<{ label: string; value: string }>;
  inviteCount: number;
  appSmsNames: string[];
  blockers: Array<{ step: WizardStep; message: string }>;
}

export interface OrgDirectoryUserDto {
  userId: EntityId;
  fullName: string;
  avatarTone: string;
  contact: string;
  note: string;
}

export interface CreateProjectResultDto {
  projectId: EntityId;
  /** برای «ورود از MSP» مسیر W34. */
  next: 'overview' | 'msp_import';
}
