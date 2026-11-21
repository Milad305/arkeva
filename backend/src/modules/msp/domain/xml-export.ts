// فایل XML به‌روزشده برای MSP (msp-integration.md ۷.۴؛ AC-MS-09). متن آخرین فایل بارگذاری‌شده فقط در جای لازم عوض
// می‌شود تا بقیهٔ فایل دست‌نخورده بماند: درصد و تاریخ‌های واقعی هر UID، و با تیک، تقویم پایهٔ پروژه.

export interface ProgressRow {
  readonly percent: number;
  readonly actualStart: string | null;
  readonly actualFinish: string | null;
}

export interface CalendarSpec {
  readonly name: string;
  /** هفت روز از شنبه. */
  readonly weekModes: readonly ('full' | 'half' | 'off')[];
  readonly dayStart: string;
  readonly dayEnd: string;
  readonly halfDayEnd: string;
  readonly holidays: readonly { readonly date: string; readonly title: string }[];
}

const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** مقدار عنصر ساده درون بلوک: جایگزینی، یا درج پس از نخستین عنصر موجود از `after`، یا پیش از پایان بلوک. */
function setElement(block: string, name: string, value: string, after: readonly string[], closing: string): string {
  const existing = new RegExp(`<${name}>[^<]*</${name}>|<${name}\\s*/>`);
  const element = `<${name}>${value}</${name}>`;
  if (existing.test(block)) return block.replace(existing, element);
  for (const anchor of after) {
    const match = new RegExp(`</${anchor}>`).exec(block);
    if (match) return `${block.slice(0, match.index + match[0].length)}${element}${block.slice(match.index + match[0].length)}`;
  }
  return block.replace(closing, `${element}${closing}`);
}

const PERCENT_AFTER = ['FixedCostAccrual', 'Finish', 'Start'];
const ACTUAL_START_AFTER = ['OvertimeWork', 'OvertimeCost', 'Cost', 'PercentWorkComplete', 'PercentComplete'];

/** درصد، ActualStart و ActualFinish برای UIDهای داده‌شده؛ شمار فعالیت‌های به‌روزشده. */
export function patchProgress(xml: string, rows: ReadonlyMap<number, ProgressRow>): { xml: string; updated: number } {
  let updated = 0;
  const result = xml.replace(/<Task>[\s\S]*?<\/Task>/g, (block) => {
    const uid = Number(/<UID>\s*(\d+)\s*<\/UID>/.exec(block)?.[1]);
    const row = rows.get(uid);
    if (!row) return block;
    updated += 1;
    let next = setElement(block, 'PercentComplete', String(Math.round(row.percent)), PERCENT_AFTER, '</Task>');
    if (row.actualStart) next = setElement(next, 'ActualStart', `${row.actualStart}T08:00:00`, ACTUAL_START_AFTER, '</Task>');
    if (row.actualFinish) next = setElement(next, 'ActualFinish', `${row.actualFinish}T17:00:00`, ['ActualStart'], '</Task>');
    return next;
  });
  return { xml: result, updated };
}

/** شنبه تا جمعه ← DayType MSPDI (۱ = یکشنبه … ۷ = شنبه). */
const DAY_TYPES = [7, 1, 2, 3, 4, 5, 6];

export function calendarXml(uid: number, spec: CalendarSpec): string {
  const weekDays = spec.weekModes
    .map((mode, index) => {
      const working = mode !== 'off';
      const times = working
        ? `<WorkingTimes><WorkingTime><FromTime>${spec.dayStart}:00</FromTime><ToTime>${mode === 'half' ? spec.halfDayEnd : spec.dayEnd}:00</ToTime></WorkingTime></WorkingTimes>`
        : '';
      return `<WeekDay><DayType>${DAY_TYPES[index]}</DayType><DayWorking>${working ? 1 : 0}</DayWorking>${times}</WeekDay>`;
    })
    .join('');
  const exceptions = spec.holidays
    .map(
      (holiday) =>
        `<Exception><EnteredByOccurrences>0</EnteredByOccurrences><TimePeriod><FromDate>${holiday.date}T00:00:00</FromDate><ToDate>${holiday.date}T23:59:00</ToDate></TimePeriod><Occurrences>1</Occurrences><Name>${escape(holiday.title)}</Name><Type>1</Type><DayWorking>0</DayWorking></Exception>`,
    )
    .join('');
  return `<Calendar><UID>${uid}</UID><Name>${escape(spec.name)}</Name><IsBaseCalendar>1</IsBaseCalendar><IsBaselineCalendar>0</IsBaselineCalendar><BaseCalendarUID>-1</BaseCalendarUID><WeekDays>${weekDays}</WeekDays>${exceptions ? `<Exceptions>${exceptions}</Exceptions>` : ''}</Calendar>`;
}

/** تقویم پایهٔ پروژه (`CalendarUID` ریشه) با تقویم پروژه‌یار جایگزین می‌شود؛ نبود آن ← تقویم تازه و ارجاع ریشه. */
export function replaceCalendar(xml: string, spec: CalendarSpec): string {
  const tasksAt = xml.indexOf('<Tasks>');
  const head = tasksAt >= 0 ? xml.slice(0, tasksAt) : xml;
  const uid = Number(/<CalendarUID>\s*(-?\d+)\s*<\/CalendarUID>/.exec(head.replace(/<Calendars>[\s\S]*<\/Calendars>/, ''))?.[1] ?? Number.NaN);
  let replaced = false;
  let next = xml.replace(/<Calendar>[\s\S]*?<\/Calendar>/g, (block) => {
    const own = Number(/<UID>\s*(-?\d+)\s*<\/UID>/.exec(block)?.[1]);
    if (replaced || own !== uid) return block;
    replaced = true;
    return calendarXml(uid, spec);
  });
  if (replaced) return next;
  const used = [...xml.matchAll(/<Calendar>[\s\S]*?<UID>\s*(\d+)\s*<\/UID>/g)].map((match) => Number(match[1]));
  const fresh = Math.max(0, ...used) + 1;
  next = next.includes('</Calendars>')
    ? next.replace('</Calendars>', `${calendarXml(fresh, spec)}</Calendars>`)
    : next.replace('<Tasks>', `<Calendars>${calendarXml(fresh, spec)}</Calendars><Tasks>`);
  const rootRef = /<CalendarUID>\s*-?\d+\s*<\/CalendarUID>/;
  const before = next.indexOf('<Calendars>');
  if (before >= 0 && rootRef.test(next.slice(0, before)))
    return next.slice(0, before).replace(rootRef, `<CalendarUID>${fresh}</CalendarUID>`) + next.slice(before);
  return next.replace('<Calendars>', `<CalendarUID>${fresh}</CalendarUID><Calendars>`);
}
