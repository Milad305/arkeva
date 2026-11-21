import type { PersonRef } from '../../identity/index.js';
import type { ProjectSettings } from '../domain/project-settings.entity.js';
import type { Project } from '../domain/project.entity.js';

// شکل خروجی و ورودی هر بخش تنظیمات — همان GeneralSettingsDto، ProgressSettingsDto، FieldRulesDto و
// WorkflowSettingsDto فرانت. عددهای مشتق (پیش‌بینی، تأخیر، بودجهٔ واقعی، EAC، میانگین تأیید) تا ماژول
// محاسبات و CBS تهی‌اند؛ سرور عدد نمی‌سازد (D07).

export type SettingsSection = 'general' | 'progress' | 'field' | 'workflow';

export interface GeneralPatch {
  readonly name?: string;
  readonly clientName?: string;
  readonly projectTypeId?: string;
  readonly description?: string;
  readonly plannedStart?: string;
  readonly plannedFinish?: string | null;
  readonly currency?: 'rial' | 'toman';
  readonly location?: string;
  readonly siteLat?: number | null;
  readonly siteLng?: number | null;
  /** تصویر با ذخیره‌سازی فایل F20 ۷ می‌آید (تصمیم کاربر 1405/08/22)؛ تا آن وقت نادیده. */
  readonly imageName?: string | null;
}

export interface ProgressPatch {
  readonly weightGenerator?: ProjectSettings['weightGenerator'];
  readonly showFinancialProgress?: boolean;
  readonly warningThreshold?: number;
  readonly criticalThreshold?: number;
  readonly eacMethod?: ProjectSettings['eacMethod'];
  readonly pvReferenceVersionId?: string | null;
}

export interface FieldPatch {
  readonly minPhotos?: number;
  readonly maxJumpPct?: number;
  readonly allowDecrease?: boolean;
  readonly offlineEnabled?: boolean;
  readonly lateAfterHours?: number;
  readonly dailyReminderEnabled?: boolean;
  readonly dailyReminderTime?: string;
  readonly gpsMode?: ProjectSettings['gpsMode'];
  readonly gpsRadiusM?: number;
}

export interface WorkflowPatch {
  readonly approvalMode?: ProjectSettings['approvalMode'];
  readonly stage2OnCritical?: boolean;
  readonly stage2OnJump?: boolean;
  readonly stage2OnGpsOut?: boolean;
  readonly stage2OnCriticalPath?: boolean;
  readonly reviewDeadlineHours?: number;
  readonly onDeadline?: ProjectSettings['onDeadline'];
  readonly autoApproveEnabled?: boolean;
  readonly autoApproveMaxDelta?: number;
}

export function generalView(project: Project, manager: PersonRef, canViewAmounts: boolean) {
  return {
    code: project.code,
    name: project.name,
    clientName: project.clientName,
    projectTypeId: project.projectType,
    description: project.description ?? '',
    status: project.status,
    manager,
    plannedStart: project.plannedStart ?? null,
    plannedFinish: project.plannedFinish ?? null,
    forecastFinish: null,
    delayWorkingDays: null,
    mspLinked: project.mspLinked,
    // مبلغ بی cbs.view_amounts تهی (D11؛ همان ماک)
    plannedTotalBudget: canViewAmounts ? (project.plannedTotalBudget ?? null) : null,
    actualTotalBudget: null,
    budgetMismatchPercent: null,
    currency: project.displayCurrencyUnit,
    location: project.location ?? '',
    siteLat: project.siteLat ?? null,
    siteLng: project.siteLng ?? null,
    gpsRadiusM: project.gpsRadiusM,
    imageName: null,
  };
}

const EAC_LABELS = [
  { method: 'cpi', label: 'روند هزینه', formula: 'BAC ÷ CPI' },
  { method: 'remaining', label: 'بودجهٔ باقی‌مانده', formula: 'AC + (BAC − EV)' },
  { method: 'composite', label: 'ترکیبی', formula: 'AC + (BAC − EV) ÷ (CPI × SPI)' },
] as const;

/** `eac`: عدد سه روش از محاسبات (ProgressReads.eacByMethod)؛ بی محاسبه یا بی `cbs.view_amounts` تهی. */
export function progressView(settings: ProjectSettings, eac: Readonly<Record<'cpi' | 'remaining' | 'composite', string | null>> | null = null) {
  return {
    weightGenerator: settings.weightGenerator,
    showFinancialProgress: settings.showFinancialProgress,
    warningThreshold: settings.warningThreshold,
    criticalThreshold: settings.criticalThreshold,
    eacMethod: settings.eacMethod,
    eacPreview: EAC_LABELS.map((entry) => ({ ...entry, value: eac?.[entry.method] ?? null })),
    pvReferenceVersionId: null,
    versions: [],
  };
}

export function fieldView(project: Project, settings: ProjectSettings) {
  return {
    minPhotos: settings.minPhotos,
    maxJumpPct: settings.maxJumpPct,
    allowDecrease: settings.allowDecrease,
    offlineEnabled: settings.offlineEnabled,
    lateAfterHours: settings.lateAfterHours,
    dailyReminderEnabled: settings.dailyReminderEnabled,
    dailyReminderTime: settings.dailyReminderTime,
    gpsMode: settings.gpsMode,
    gpsRadiusM: project.gpsRadiusM,
  };
}

export function workflowView(project: Project, settings: ProjectSettings) {
  return {
    approvalMode: settings.approvalMode,
    stage2OnCritical: settings.stage2OnCritical,
    stage2OnJump: settings.stage2OnJump,
    stage2OnGpsOut: settings.stage2OnGpsOut,
    stage2OnCriticalPath: settings.stage2OnCriticalPath,
    reviewDeadlineHours: settings.reviewDeadlineHours,
    onDeadline: settings.onDeadline,
    autoApproveEnabled: settings.autoApproveEnabled,
    autoApproveMaxDelta: settings.autoApproveMaxDelta,
    avgApprovalHours: null,
    mspLinked: project.mspLinked,
  };
}
