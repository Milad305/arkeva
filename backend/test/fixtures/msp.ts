// فایل MSPDI نمونه برای تست‌های F15 (msp-integration.md ۱۳). سه سطح: فاز ← گروه ← برگ، با هزینه، منبع، درصد و وابستگی.

export interface SampleTask {
  readonly uid: number;
  readonly wbs: string;
  readonly name: string;
  readonly level: number;
  readonly start: string;
  readonly finish: string;
  readonly days: number;
  readonly summary?: boolean;
  readonly milestone?: boolean;
  readonly percent?: number;
  /** ریال؛ در فایل ×۱۰۰ نوشته می‌شود. */
  readonly cost?: number;
  readonly resource?: string;
  readonly predecessors?: readonly number[];
  readonly unit?: string;
  readonly quantity?: number;
  readonly critical?: boolean;
  readonly active?: boolean;
}

const addDays = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const esc = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function leafTask(uid: number, p: number, g: number, l: number, groupStart: string): SampleTask {
  const start = addDays(groupStart, (l - 1) * 2);
  const days = 4 + l;
  return {
    uid,
    wbs: `${p}.${g}.${l}`,
    name: `فعالیت ${p}.${g}.${l}`,
    level: 3,
    start,
    finish: addDays(start, days - 1),
    days,
    cost: 1_000_000 * l,
    resource: p % 2 === 1 ? 'Ali Mohammadi' : 'Unknown Crew',
    predecessors: l > 1 ? [uid - 1] : [],
    ...(g === 1 ? { unit: 'مترمکعب', quantity: 100 * l } : {}),
    critical: g === 1,
  };
}

/** فاز × گروه × برگ؛ پیش‌فرض ۶ × ۵ × ۵ = ۱۸۶ فعالیت (۶ + ۳۰ + ۱۵۰). */
export function sampleTasks(input: { phases?: number; groups?: number; leaves?: number; start?: string } = {}): SampleTask[] {
  const phases = input.phases ?? 6;
  const groups = input.groups ?? 5;
  const leaves = input.leaves ?? 5;
  const tasks: SampleTask[] = [];
  let uid = 1;
  let cursor = input.start ?? '2026-03-01';
  for (let p = 1; p <= phases; p++) {
    const phaseIndex = tasks.length;
    tasks.push({ uid: uid++, wbs: `${p}`, name: `فاز ${p}`, level: 1, start: cursor, finish: cursor, days: 0, summary: true });
    let phaseFinish = cursor;
    for (let g = 1; g <= groups; g++) {
      const groupIndex = tasks.length;
      const groupStart = addDays(cursor, (g - 1) * 3);
      tasks.push({ uid: uid++, wbs: `${p}.${g}`, name: `گروه ${p}.${g}`, level: 2, start: groupStart, finish: groupStart, days: 0, summary: true });
      let groupFinish = groupStart;
      const group = Array.from({ length: leaves }, (_, index) => leafTask(uid + index, p, g, index + 1, groupStart));
      uid += leaves;
      tasks.push(...group);
      groupFinish = group.reduce((value, leaf) => (leaf.finish > value ? leaf.finish : value), groupFinish);
      tasks[groupIndex] = { ...(tasks[groupIndex] as SampleTask), finish: groupFinish, days: 10 };
      if (groupFinish > phaseFinish) phaseFinish = groupFinish;
    }
    tasks[phaseIndex] = { ...(tasks[phaseIndex] as SampleTask), finish: phaseFinish, days: 20 };
    cursor = addDays(phaseFinish, 1);
  }
  return tasks;
}

export function sampleMspdi(tasks: readonly SampleTask[], options: { statusDate?: string; name?: string } = {}): string {
  const resources = [...new Set(tasks.flatMap((task) => (task.resource ? [task.resource] : [])))];
  const resourceUid = (name: string) => resources.indexOf(name) + 1;
  const body = tasks
    .map((task) =>
      [
        '<Task>',
        `<UID>${task.uid}</UID>`,
        `<Name>${esc(task.name)}</Name>`,
        `<WBS>${task.wbs}</WBS>`,
        `<OutlineLevel>${task.level}</OutlineLevel>`,
        `<Start>${task.start}T08:00:00</Start>`,
        `<Finish>${task.finish}T17:00:00</Finish>`,
        `<Duration>PT${task.days * 8}H0M0S</Duration>`,
        `<Milestone>${task.milestone ? 1 : 0}</Milestone>`,
        `<Summary>${task.summary ? 1 : 0}</Summary>`,
        `<Critical>${task.critical ? 1 : 0}</Critical>`,
        `<Active>${task.active === false ? 0 : 1}</Active>`,
        `<PercentComplete>${task.percent ?? 0}</PercentComplete>`,
        `<Cost>${(task.cost ?? 0) * 100}</Cost>`,
        ...(task.predecessors ?? []).map((uid) => `<PredecessorLink><PredecessorUID>${uid}</PredecessorUID><Type>1</Type></PredecessorLink>`),
        ...(task.unit ? [`<ExtendedAttribute><FieldID>188743731</FieldID><Value>${esc(task.unit)}</Value></ExtendedAttribute>`] : []),
        ...(task.quantity ? [`<ExtendedAttribute><FieldID>188743734</FieldID><Value>${task.quantity}</Value></ExtendedAttribute>`] : []),
        '</Task>',
      ].join(''),
    )
    .join('\n    ');
  const assignments = tasks
    .filter((task) => task.resource)
    .map(
      (task, index) =>
        `<Assignment><UID>${index + 1}</UID><TaskUID>${task.uid}</TaskUID><ResourceUID>${resourceUid(task.resource as string)}</ResourceUID></Assignment>`,
    )
    .join('\n    ');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <Name>${esc(options.name ?? 'پروژهٔ نمونه.xml')}</Name>
  <Title>${esc(options.name ?? 'پروژهٔ نمونه')}</Title>
  ${options.statusDate ? `<StatusDate>${options.statusDate}T00:00:00</StatusDate>` : ''}
  <Tasks>
    <Task><UID>0</UID><Name>پروژه</Name><OutlineLevel>0</OutlineLevel></Task>
    ${body}
  </Tasks>
  <Resources>
    ${resources.map((name) => `<Resource><UID>${resourceUid(name)}</UID><Name>${esc(name)}</Name></Resource>`).join('\n    ')}
  </Resources>
  <Assignments>
    ${assignments}
  </Assignments>
</Project>
`;
}
