import { child, childrenNamed, childText, parseXml, XmlError } from './xml.js';

// فایل MSP خوانده‌شده (msp-integration.md ۴؛ تصمیم 1405/08/21 بند ۱): فقط XML استاندارد MSPDI؛ MPP رد می‌شود (تصمیم کاربر
// 1405/08/26). فقط فیلدهای نگاشت‌پذیر نگه داشته می‌شوند (۱۱).

export const MAX_FILE_BYTES = 20 * 1024 * 1024;

export interface MspTask {
  uid: number;
  name: string;
  /** کد ساختار فایل (`WBS`). */
  wbs: string;
  outlineLevel: number;
  /** تاریخ میلادی؛ خالی یعنی فایل تاریخ نداشت. */
  start: string;
  finish: string;
  durationDays: number;
  isMilestone: boolean;
  isSummary: boolean;
  percentComplete: number;
  /** ریال. */
  cost: number;
  resourceNames: string[];
  predecessors: number[];
  unit: string | null;
  quantity: number | null;
  critical: boolean;
  totalSlackDays: number | null;
  active: boolean;
  notes: string | null;
}

export interface MspFile {
  fileName: string;
  sizeBytes: number;
  projectName: string;
  statusDate: string | null;
  tasks: MspTask[];
  resources: string[];
}

export class MspFileError extends Error {}

const dateOf = (value: string | null): string | null => {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim()) : null;
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
};

/** `PT40H0M0S` یا `P5D` ← روز (۸ ساعت = یک روز). */
export function durationDays(value: string | null): number {
  if (!value) return 0;
  const days = /P(\d+(?:\.\d+)?)D/.exec(value);
  if (days) return Math.round(Number(days[1]));
  const hours = /PT(\d+(?:\.\d+)?)H/.exec(value);
  if (hours) return Math.max(0, Math.round(Number(hours[1]) / 8));
  return 0;
}

/** شناسهٔ فیلدهای سفارشی پیش‌فرض الگو: Text1 ← واحد، Number1 ← مقدار کل (۷.۱ گام ۲). */
const TEXT1 = '188743731';
const NUMBER1 = '188743734';

export function parseMspdi(fileName: string, sizeBytes: number, xml: string): MspFile {
  let root;
  try {
    root = parseXml(xml);
  } catch (error) {
    if (error instanceof XmlError) throw new MspFileError(`فایل XML خراب است (${error.message}). فایل را دوباره از MS Project با «Save As ← XML» ذخیره کنید.`);
    throw error;
  }
  if (root.name !== 'Project') throw new MspFileError('این XML فایل MS Project (MSPDI) نیست. در MS Project از «Save As ← XML Format» استفاده کنید.');

  const resourceNames = new Map<number, string>();
  for (const resource of childrenNamed(child(root, 'Resources') ?? { name: '', children: [], text: '' }, 'Resource')) {
    const uid = Number(childText(resource, 'UID'));
    const name = childText(resource, 'Name');
    if (Number.isFinite(uid) && name) resourceNames.set(uid, name);
  }
  const assignments = new Map<number, string[]>();
  for (const assignment of childrenNamed(child(root, 'Assignments') ?? { name: '', children: [], text: '' }, 'Assignment')) {
    const taskUid = Number(childText(assignment, 'TaskUID'));
    const name = resourceNames.get(Number(childText(assignment, 'ResourceUID')));
    if (!Number.isFinite(taskUid) || !name) continue;
    const list = assignments.get(taskUid) ?? [];
    if (!list.includes(name)) list.push(name);
    assignments.set(taskUid, list);
  }

  const tasks: MspTask[] = [];
  for (const element of childrenNamed(child(root, 'Tasks') ?? { name: '', children: [], text: '' }, 'Task')) {
    const uid = Number(childText(element, 'UID'));
    const name = childText(element, 'Name');
    // ردیف صفر فایل خود پروژه است، نه فعالیت
    if (!Number.isInteger(uid) || uid === 0 || !name) continue;
    const extended = childrenNamed(element, 'ExtendedAttribute');
    const extendedValue = (fieldId: string) => {
      const found = extended.find((entry) => childText(entry, 'FieldID') === fieldId);
      return found ? childText(found, 'Value') : null;
    };
    const start = dateOf(childText(element, 'Start'));
    const slack = childText(element, 'TotalSlack');
    const quantity = Number(extendedValue(NUMBER1));
    tasks.push({
      uid,
      name,
      wbs: childText(element, 'WBS') || String(uid),
      outlineLevel: Number(childText(element, 'OutlineLevel') ?? '1') || 1,
      start: start ?? '',
      finish: dateOf(childText(element, 'Finish')) ?? start ?? '',
      durationDays: durationDays(childText(element, 'Duration')),
      isMilestone: childText(element, 'Milestone') === '1',
      isSummary: childText(element, 'Summary') === '1',
      percentComplete: Number(childText(element, 'PercentComplete') ?? '0') || 0,
      // MSPDI هزینه را در صدم واحد پول ذخیره می‌کند
      cost: Math.max(0, Math.round((Number(childText(element, 'Cost') ?? '0') || 0) / 100)),
      resourceNames: assignments.get(uid) ?? [],
      predecessors: childrenNamed(element, 'PredecessorLink')
        .map((link) => Number(childText(link, 'PredecessorUID')))
        .filter((value) => Number.isInteger(value)),
      unit: extendedValue(TEXT1) || null,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : null,
      critical: childText(element, 'Critical') === '1',
      // TotalSlack به دقیقهٔ دهم؛ ۴۸۰۰ = یک روز ۸ ساعته
      totalSlackDays: slack !== null && Number.isFinite(Number(slack)) ? Math.round(Number(slack) / 4800) : null,
      active: childText(element, 'Active') !== '0',
      notes: childText(element, 'Notes') || null,
    });
  }
  if (tasks.length === 0) throw new MspFileError('در این فایل هیچ فعالیتی پیدا نشد. فایل را از MS Project دوباره با قالب XML ذخیره کنید.');
  return {
    fileName,
    sizeBytes,
    projectName: childText(root, 'Name') || childText(root, 'Title') || fileName,
    statusDate: dateOf(childText(root, 'StatusDate')),
    tasks,
    resources: [...new Set(tasks.flatMap((task) => task.resourceNames))],
  };
}

/** فایل بارگذاری‌شده ← MspFile؛ MPP و حجم زیاد با راهنما رد می‌شوند. */
export function readMspUpload(file: { readonly originalname: string; readonly size: number; readonly buffer: Buffer }): MspFile {
  if (/\.mpp$/i.test(file.originalname)) {
    throw new MspFileError(
      'فایل MPP مستقیم خوانده نمی‌شود. در MS Project از «File ← Save As» قالب «XML Format (*.xml)» را انتخاب کنید و همان فایل را بارگذاری کنید.',
    );
  }
  if (!/\.xml$/i.test(file.originalname)) throw new MspFileError('فقط فایل XML خروجی MS Project (MSPDI) پذیرفته می‌شود.');
  if (file.size > MAX_FILE_BYTES) throw new MspFileError('حجم فایل بیش از ۲۰ مگابایت است. فایل را در MS Project فشرده‌تر ذخیره کنید.');
  return parseMspdi(file.originalname, file.size, file.buffer.toString('utf8'));
}
