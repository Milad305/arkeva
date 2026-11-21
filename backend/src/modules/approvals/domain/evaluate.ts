import { approvedQuantity, type LeafShape, leafPercent, type ProgressEntry, stepPercents } from '../../computation/index.js';

// مقادیر، پرچم‌ها، مرحلهٔ دوم و تأیید خودکار یک آیتم (approval-workflow.md ۳–۴). تابع خالص؛ هنگام دریافت و دوباره
// هنگام هر تأیید (۳.۳) صدا زده می‌شود.

export const DEVICE_FLAGS = ['mock_location', 'clock_skew', 'photo_time_mismatch'] as const;

export interface WorkflowSettings {
  readonly minPhotos: number;
  readonly maxJumpPct: number;
  readonly allowDecrease: boolean;
  readonly lateAfterHours: number;
  readonly gpsMode: 'flag_only' | 'block';
  readonly gpsRadiusM: number;
  readonly approvalMode: 'single_stage' | 'two_stage';
  readonly criticalThreshold: number;
  readonly stage2OnCritical: boolean;
  readonly stage2OnJump: boolean;
  readonly stage2OnGpsOut: boolean;
  readonly stage2OnCriticalPath: boolean;
  readonly autoApproveEnabled: boolean;
  readonly autoApproveMaxDelta: number;
  readonly mspLinked: boolean;
}

export interface EvaluateInput {
  readonly leaf: LeafShape & { readonly isCritical: boolean };
  /** آیتم‌های تأییدشدهٔ دیگر همین برگ. */
  readonly approved: readonly ProgressEntry[];
  readonly item: ProgressEntry & { readonly reportedQuantityInfo?: number | null };
  readonly source: 'app' | 'web_manual' | 'import_opening' | 'correction';
  readonly photos: { readonly count: number; readonly pending: number };
  readonly distanceFromSiteM: number | null;
  /** ثبت در گوشی تا دریافت در سرور، به ساعت. */
  readonly delayHours: number;
  readonly deviceFlags: readonly string[];
  readonly plannedPercentAtDate: number;
  readonly settings: WorkflowSettings;
}

export interface Evaluation {
  readonly lastApprovedPercent: number;
  readonly computedPercent: number;
  readonly deltaPercent: number;
  readonly plannedPercentAtDate: number;
  readonly flags: string[];
  readonly requiresStage2: boolean;
  readonly autoApprove: boolean;
  /** `gpsMode = block` و بیرون از محدوده ← رد خودکار با یادداشت سیستمی (۳.۲). */
  readonly gpsBlocked: boolean;
}

export function evaluateItem(input: EvaluateInput): Evaluation {
  const { leaf, settings } = input;
  const lastApprovedPercent = leafPercent(leaf, input.approved);
  let computedPercent: number;
  let deltaPercent: number;
  let overTotal = false;
  if (leaf.method === 'quantity') {
    const total = leaf.totalQuantity ?? 0;
    const cumulative = approvedQuantity(input.approved) + (input.item.quantityToday ?? 0);
    computedPercent = total > 0 ? Math.min(100, (cumulative * 100) / total) : 0;
    deltaPercent = total > 0 ? ((input.item.quantityToday ?? 0) * 100) / total : 0;
    overTotal = total > 0 && cumulative > total;
  } else if (leaf.method === 'percent') {
    computedPercent = Math.min(100, Math.max(0, input.item.reportedPercent ?? 0));
    deltaPercent = computedPercent - lastApprovedPercent;
  } else {
    const approvedSteps = stepPercents(input.approved);
    const reported = input.item.stepsProgress ?? {};
    computedPercent = (leaf.steps ?? []).reduce((sum, step) => sum + (step.weight * (reported[step.key] ?? approvedSteps.get(step.key) ?? 0)) / 100, 0);
    deltaPercent = computedPercent - lastApprovedPercent;
  }

  const fromApp = input.source === 'app';
  const flags: string[] = [];
  if (fromApp && input.photos.count < settings.minPhotos) flags.push('insufficient_photos');
  if (input.photos.pending > 0) flags.push('photos_pending');
  if (deltaPercent > settings.maxJumpPct) flags.push('abnormal_jump');
  const gpsOut = input.distanceFromSiteM !== null && input.distanceFromSiteM > settings.gpsRadiusM;
  if (gpsOut) flags.push('gps_out_of_range');
  if (fromApp && input.delayHours > settings.lateAfterHours) flags.push('late_submission');
  if (deltaPercent < 0 && !settings.allowDecrease) flags.push('decrease');
  if (overTotal) flags.push('over_total_quantity');
  for (const flag of input.deviceFlags) if ((DEVICE_FLAGS as readonly string[]).includes(flag) && !flags.includes(flag)) flags.push(flag);

  const requiresStage2 =
    settings.approvalMode === 'two_stage' &&
    ((settings.stage2OnCritical && deltaPercent > settings.criticalThreshold) ||
      (settings.stage2OnJump && flags.includes('abnormal_jump')) ||
      (settings.stage2OnGpsOut && gpsOut) ||
      (settings.stage2OnCriticalPath && leaf.isCritical && settings.mspLinked));
  // تأیید خودکار (۴.۱): همهٔ شرط‌ها؛ ثبت دستی وب هرگز
  const autoApprove =
    settings.autoApproveEnabled &&
    fromApp &&
    Math.abs(deltaPercent) < settings.autoApproveMaxDelta &&
    input.photos.count >= settings.minPhotos &&
    flags.length === 0;
  return {
    lastApprovedPercent,
    computedPercent,
    deltaPercent,
    plannedPercentAtDate: input.plannedPercentAtDate,
    flags,
    requiresStage2,
    autoApprove,
    gpsBlocked: gpsOut && settings.gpsMode === 'block',
  };
}

const fa = (value: number): string => {
  const rounded = Math.round(value * 10) / 10;
  return String(Math.abs(rounded))
    .replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)] as string)
    .replace('.', '٫');
};

/** شرح هر پرچم برای W40 (FieldItemDto.flagMessages). */
export function flagMessage(
  flag: string,
  context: { readonly deltaPercent: number; readonly distanceFromSiteM: number | null; readonly settings: WorkflowSettings },
): string {
  const { settings } = context;
  switch (flag) {
    case 'abnormal_jump':
      return `جهش غیرعادی: ${context.deltaPercent >= 0 ? '+' : '−'}${fa(context.deltaPercent)}٪ در یک گزارش (سقف ${fa(settings.maxJumpPct)}٪).`;
    case 'insufficient_photos':
      return `عکس ناکافی: کمتر از ${fa(settings.minPhotos)} عکس.`;
    case 'photos_pending':
      return 'عکس‌ها هنوز کامل بارگذاری نشده‌اند.';
    case 'gps_out_of_range':
      return `خارج از محدوده: ${fa(context.distanceFromSiteM ?? 0)} متر از مرکز کارگاه (شعاع ${fa(settings.gpsRadiusM)} متر).`;
    case 'late_submission':
      return `ثبت با تأخیر: بیش از ${fa(settings.lateAfterHours)} ساعت پس از کار به سرور رسید.`;
    case 'decrease':
      return `کاهش درصد: ${fa(context.deltaPercent)}٪ کمتر از آخرین مقدار تأییدشده.`;
    case 'over_total_quantity':
      return 'مقدار تجمعی از مقدار کل فعالیت بیشتر شد؛ درصد برگ روی ۱۰۰ می‌ماند.';
    case 'mock_location':
      return 'گوشی مکان جعلی گزارش کرده است.';
    case 'clock_skew':
      return 'ساعت گوشی با ساعت سرور نمی‌خواند.';
    case 'photo_time_mismatch':
      return 'زمان عکس با زمان گزارش نمی‌خواند.';
    case 'needs_resolution':
      return 'برگ حذف شده یا به سرپرست دیگری سپرده شده است؛ تعیین تکلیف لازم است.';
    default:
      return flag;
  }
}
