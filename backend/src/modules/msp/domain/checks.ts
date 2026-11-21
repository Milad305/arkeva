import { toFaDigits } from '../../../platform/http/fa.js';
import { formatJalali } from '../../../platform/time/jalali.js';
import type { MspFile, MspTask } from './mspdi.js';

// اعتبارسنجی فایل ورود (msp-integration.md ۷.۱ گام ۱؛ AC-MS-03): سالم، هشدار (ادامه ممکن)، خطا (باید تعیین تکلیف شود).

export const MAX_TASKS = 5_000;

export interface ImportCheck {
  id: string;
  severity: 'ok' | 'warning' | 'error';
  title: string;
  detail: string | null;
  items: string[];
  /** `blocks` = با این انتخاب هم ادامه ممکن نیست (فقط بارگذاری دوباره). */
  resolutions: { id: string; label: string; blocks: boolean }[];
  resolution: string | null;
}

const fa = (value: number) => toFaDigits(value);
const date = (iso: string) => toFaDigits(formatJalali(iso));
const REUPLOAD = { id: 'reupload', label: 'اصلاح فایل و بارگذاری دوباره', blocks: true };

export const leavesOf = (file: MspFile) => file.tasks.filter((task) => !task.isSummary);
export const fileSpan = (file: MspFile) => {
  const dated = file.tasks.filter((task) => task.start && task.finish);
  return {
    start: dated.reduce((value, task) => (value === '' || task.start < value ? task.start : value), ''),
    finish: dated.reduce((value, task) => (task.finish > value ? task.finish : value), ''),
  };
};

/** حلقه در درخت کدها: کدی که پیشوند خودش را از راه والد ناموجود می‌سازد ممکن نیست؛ اینجا حلقهٔ وابستگی بررسی می‌شود. */
function dependencyCycles(tasks: readonly MspTask[]): string[] {
  const byUid = new Map(tasks.map((task) => [task.uid, task]));
  const state = new Map<number, 1 | 2>();
  const found: string[] = [];
  const visit = (task: MspTask, path: MspTask[]) => {
    state.set(task.uid, 1);
    for (const uid of task.predecessors) {
      const next = byUid.get(uid);
      if (!next) continue;
      if (state.get(uid) === 1) {
        const from = path.findIndex((entry) => entry.uid === uid);
        found.push([...path.slice(from), task].map((entry) => entry.wbs).join(' ← '));
      } else if (!state.has(uid)) visit(next, [...path, task]);
    }
    state.set(task.uid, 2);
  };
  for (const task of tasks) if (!state.has(task.uid)) visit(task, []);
  return found;
}

export function buildChecks(file: MspFile): ImportCheck[] {
  const checks: ImportCheck[] = [];
  const push = (check: Omit<ImportCheck, 'items' | 'resolutions' | 'resolution' | 'detail'> & Partial<ImportCheck>) =>
    checks.push({ detail: null, items: [], resolutions: [], resolution: null, ...check });
  const tasks = file.tasks;
  const leaves = leavesOf(file);
  const levels = Math.max(...tasks.map((task) => task.outlineLevel), 1);
  push({ id: 'tree', severity: 'ok', title: `ساختار درختی ${fa(levels)} سطحی خوانده شد` });
  const span = fileSpan(file);
  if (span.start && span.finish)
    push({ id: 'dates', severity: 'ok', title: 'تاریخ‌ها به تقویم شمسی تبدیل شد', detail: `شروع ${date(span.start)} و پایان ${date(span.finish)}` });
  const costed = leaves.filter((task) => task.cost > 0);
  if (costed.length > 0) {
    const total = costed.reduce((sum, task) => sum + task.cost, 0);
    push({
      id: 'cost',
      severity: 'ok',
      title: `${fa(costed.length)} فعالیت دارای هزینه است`,
      detail: `جمع ${fa(total)} ریال — برای ساخت اقلام CBS استفاده می‌شود`,
    });
  }
  if (file.resources.length > 0) {
    push({
      id: 'resources',
      severity: 'ok',
      title: `${fa(file.resources.length)} منبع در فایل هست`,
      detail: 'ستون Resource Names در مرحلهٔ بعد به سرپرست کارگاه نگاشت می‌شود',
    });
  }

  // ── هشدارها ──
  const zero = leaves.filter((task) => task.durationDays === 0 && !task.isMilestone && task.start);
  if (zero.length > 0) {
    push({
      id: 'zero_duration',
      severity: 'warning',
      title: `${fa(zero.length)} فعالیت بدون مدت`,
      detail: 'با مدت صفر به‌عنوان نقطهٔ عطف وارد می‌شوند',
      items: zero.slice(0, 8).map((task) => task.wbs),
    });
  }
  const milestones = leaves.filter((task) => task.isMilestone);
  if (milestones.length > 0) {
    push({
      id: 'milestones',
      severity: 'warning',
      title: `${fa(milestones.length)} نقطهٔ عطف بدون مدت وارد می‌شود`,
      detail: 'نقطهٔ عطف وزن صفر می‌گیرد و گزارش پیشرفت نمی‌گیرد',
      items: milestones.slice(0, 8).map((task) => task.wbs),
    });
  }
  const inactive = tasks.filter((task) => !task.active);
  if (inactive.length > 0) {
    push({
      id: 'inactive',
      severity: 'warning',
      title: `${fa(inactive.length)} فعالیت غیرفعال (Active = 0)`,
      detail: 'این فعالیت‌ها وارد نمی‌شوند',
      items: inactive.slice(0, 8).map((task) => task.wbs),
    });
  }
  const uids = new Set(tasks.map((task) => task.uid));
  const dangling = tasks.filter((task) => task.predecessors.some((uid) => !uids.has(uid)));
  if (dangling.length > 0) {
    push({
      id: 'dangling',
      severity: 'warning',
      title: `${fa(dangling.length)} وابستگی به فعالیت ناموجود`,
      detail: 'این وابستگی‌ها نادیده گرفته می‌شوند',
      items: dangling.slice(0, 8).map((task) => task.wbs),
    });
  }

  // ── خطاها ──
  const seenUid = new Set<number>();
  const duplicateUid = tasks.filter((task) => (seenUid.has(task.uid) ? true : (seenUid.add(task.uid), false)));
  if (duplicateUid.length > 0) {
    push({
      id: 'duplicate_uid',
      severity: 'error',
      title: `${fa(duplicateUid.length)} فعالیت با UID تکراری`,
      detail: 'UID کلید تطبیق همگام‌سازی است و باید یکتا باشد. فایل را در MS Project دوباره ذخیره کنید.',
      items: duplicateUid.slice(0, 8).map((task) => task.wbs),
      resolutions: [REUPLOAD],
    });
  }
  const seenCode = new Set<string>();
  const duplicateCode = tasks.filter((task) => task.active && (seenCode.has(task.wbs) ? true : (seenCode.add(task.wbs), false)));
  if (duplicateCode.length > 0) {
    push({
      id: 'duplicate_wbs',
      severity: 'error',
      title: `${fa(duplicateCode.length)} کد WBS تکراری`,
      detail: 'ساختار درخت از کد WBS ساخته می‌شود و کد باید یکتا باشد.',
      items: duplicateCode.slice(0, 8).map((task) => task.wbs),
      resolutions: [REUPLOAD],
    });
  }
  const orphan = tasks.filter((task) => task.active && task.wbs.includes('.') && !seenCode.has(task.wbs.split('.').slice(0, -1).join('.')));
  if (orphan.length > 0) {
    push({
      id: 'orphan',
      severity: 'error',
      title: `${fa(orphan.length)} فعالیت بی والد در درخت`,
      detail: 'کد WBS والد این فعالیت‌ها در فایل نیست.',
      items: orphan.slice(0, 8).map((task) => task.wbs),
      resolutions: [{ id: 'skip', label: 'وارد نکردن این فعالیت‌ها', blocks: false }, REUPLOAD],
    });
  }
  const noDate = tasks.filter((task) => task.active && (!task.start || !task.finish));
  if (noDate.length > 0) {
    push({
      id: 'no_date',
      severity: 'error',
      title: `${fa(noDate.length)} فعالیت بدون تاریخ`,
      detail: 'هر فعالیت باید شروع و پایان داشته باشد.',
      items: noDate.slice(0, 8).map((task) => task.wbs),
      resolutions: [{ id: 'skip', label: 'وارد نکردن این فعالیت‌ها', blocks: false }, REUPLOAD],
    });
  }
  const badPercent = tasks.filter((task) => task.percentComplete < 0 || task.percentComplete > 100);
  if (badPercent.length > 0) {
    push({
      id: 'bad_percent',
      severity: 'error',
      title: `${fa(badPercent.length)} فعالیت با درصد پیشرفت نامعتبر`,
      detail: 'درصد پیشرفت باید بین ۰ و ۱۰۰ باشد.',
      items: badPercent.slice(0, 8).map((task) => task.wbs),
      resolutions: [REUPLOAD],
    });
  }
  if (tasks.length > MAX_TASKS) {
    push({
      id: 'too_many',
      severity: 'error',
      title: `فایل ${fa(tasks.length)} فعالیت دارد؛ بیشتر از ${fa(MAX_TASKS)}`,
      detail: 'فایل را به چند پروژه بشکنید یا سطح‌های پایین را جمع کنید.',
      resolutions: [REUPLOAD],
    });
  }
  const cycles = dependencyCycles(tasks);
  if (cycles.length > 0) {
    push({
      id: 'cycle',
      severity: 'error',
      title: `وابستگی چرخه‌ای در ${fa(cycles.length)} زنجیره`,
      detail: 'وابستگی‌ها فقط برای نمایش نگه داشته می‌شوند و در محاسبهٔ پیشرفت اثری ندارند.',
      items: cycles.slice(0, 8),
      resolutions: [{ id: 'ignore', label: 'نادیده گرفتن این وابستگی‌ها', blocks: false }, REUPLOAD],
    });
  }
  return checks;
}

/** خطای تعیین‌تکلیف‌نشده یا انتخاب «بارگذاری دوباره» ادامه را می‌بندد (AC-MS-03). */
export function blockingOf(checks: readonly ImportCheck[]): { canContinue: boolean; reason: string | null } {
  const unresolved = checks.filter((check) => check.severity === 'error' && check.resolution === null);
  if (unresolved.length > 0) return { canContinue: false, reason: `${fa(unresolved.length)} خطا باید تعیین تکلیف شود.` };
  const blocking = checks.find((check) => check.resolution !== null && check.resolutions.find((entry) => entry.id === check.resolution)?.blocks);
  if (blocking) return { canContinue: false, reason: 'فایل را اصلاح و دوباره بارگذاری کنید.' };
  return { canContinue: true, reason: null };
}

/** کدهایی که با انتخاب «وارد نکردن» کنار می‌روند. */
export function skippedCodes(file: MspFile, checks: readonly ImportCheck[]): Set<string> {
  const skipped = new Set<string>();
  const resolved = (id: string) => checks.find((check) => check.id === id)?.resolution === 'skip';
  for (const task of file.tasks) {
    if (resolved('no_date') && (!task.start || !task.finish)) skipped.add(task.wbs);
    if (resolved('orphan') && task.wbs.includes('.') && !file.tasks.some((other) => other.active && other.wbs === task.wbs.split('.').slice(0, -1).join('.'))) {
      skipped.add(task.wbs);
    }
  }
  return skipped;
}
