import { amount, date, fa } from '../text.js';
import type { Finding, ParamDef, RuleDef } from '../rule-types.js';

// قواعد پیشرفت و هزینه (04-alert-engine ۳.۱، ۳.۲). پارامترهای پیش‌فرض `[تأییدشده]`.

export const param = (key: string, label: string, value: number, unit: string, min: number, max: number, step = 1): ParamDef => ({
  key,
  label,
  default: value,
  unit,
  min,
  max,
  step,
});

const PM = { role: 'pm' } as const;
const PLANNER = { role: 'planner' } as const;
const FINANCE = { role: 'finance' } as const;

export const PROGRESS_RULES: RuleDef[] = [
  {
    code: 'AL-PRG-01',
    name: 'انحراف آیتم از برنامه',
    group: 'پیشرفت و زمان',
    severityText: 'هشدار و بحرانی از آستانه‌های پروژه',
    canDisable: true,
    params: [],
    title: (v) => `${String(v['code'])} ${fa(v['title'])} عقب از برنامه`,
    guidance: (v) =>
      `${String(v['code'])} ${fa(v['title'])} ${fa(Math.abs(Number(v['d'])))}٪ از برنامه عقب است. با سرپرست (${fa(v['supervisor'])}) صحبت کنید یا ریسک و اقدام اصلاحی ثبت کنید.`,
    link: (v) => `/wbs/${String(v['id'])}`,
    // فقط برگ (فرض ۲)؛ برگ زمانی، تمام‌شده و برنامه‌ای ۰ مستثنی
    evaluate: (facts) =>
      facts.leaves.flatMap((leaf): Finding[] => {
        const d = leaf.actual - leaf.planned;
        if (leaf.method === 'time_based' || leaf.actual >= 100 || leaf.planned === 0 || d > -facts.thresholds.warning) return [];
        const critical = d <= -facts.thresholds.critical;
        return [
          {
            subjectType: 'wbs_item',
            subjectId: leaf.id,
            severity: critical ? 'critical' : 'warning',
            values: {
              id: leaf.id,
              code: leaf.code,
              title: leaf.title,
              d,
              supervisor: leaf.supervisorUserId ? (facts.supervisorNames.get(leaf.supervisorUserId) ?? null) : null,
            },
            audience: [...(leaf.supervisorUserId ? [{ userId: leaf.supervisorUserId }] : []), ...(critical ? [PM] : [])],
          },
        ];
      }),
  },
  {
    code: 'AL-PRG-02',
    name: 'انحراف کل پروژه',
    group: 'پیشرفت و زمان',
    severityText: 'هشدار و بحرانی از آستانه‌های پروژه',
    canDisable: true,
    params: [],
    title: () => 'پروژه عقب از برنامه',
    guidance: (v) => `پیشرفت پروژه ${fa(v['actual'])}٪ در برابر ${fa(v['planned'])}٪ برنامه‌ای است. بررسی کنید کدام آیتم‌ها بیشترین عقب‌ماندگی را دارند.`,
    link: () => '/charts/risk',
    evaluate: (facts) => {
      const p = facts.progress;
      if (!p) return [];
      const d = p.actual - p.planned;
      if (d > -facts.thresholds.warning) return [];
      return [
        {
          subjectType: 'project',
          subjectId: facts.projectId,
          severity: d <= -facts.thresholds.critical ? 'critical' : 'warning',
          values: { actual: p.actual, planned: p.planned, d },
          audience: [PM, PLANNER],
        },
      ];
    },
  },
  {
    code: 'AL-PRG-03',
    name: 'تأخیر پیش‌بینی‌شدهٔ پایان',
    group: 'پیشرفت و زمان',
    severityText: 'هشدار / بحرانی',
    canDisable: true,
    params: [
      param('warnDays', 'هشدار از', 7, 'روز کاری', 1, 90),
      param('critDays', 'بحرانی از', 21, 'روز کاری', 2, 180),
      param('minActual', 'فقط اگر پیشرفت واقعی ≥', 5, '٪', 0, 50),
    ],
    title: () => 'تأخیر پیش‌بینی‌شدهٔ پایان پروژه',
    guidance: (v) =>
      `پایان پروژه با روند فعلی ${date(v['forecastFinish'])} پیش‌بینی می‌شود؛ ${fa(v['delay'], 0)} روز کاری بعد از برنامه. برای جبران، بازنگری یا تخصیص مجدد را بررسی کنید.`,
    link: () => '/progress',
    evaluate: (facts, params) => {
      const p = facts.progress;
      if (!p || p.delayDays === null || p.actual < (params['minActual'] ?? 5) || p.delayDays < (params['warnDays'] ?? 7)) return [];
      return [
        {
          subjectType: 'project',
          subjectId: facts.projectId,
          severity: p.delayDays >= (params['critDays'] ?? 21) ? 'critical' : 'warning',
          values: { delay: p.delayDays, forecastFinish: p.forecastFinish },
          audience: [PM, PLANNER],
        },
      ];
    },
  },
  {
    code: 'AL-PRG-04',
    name: 'شروع‌نشدن فعالیت',
    group: 'پیشرفت و زمان',
    severityText: 'هشدار',
    canDisable: true,
    params: [param('graceDays', 'مهلت پس از شروع برنامه‌ای', 3, 'روز کاری', 0, 30)],
    title: (v) => `${String(v['code'])} شروع نشده`,
    guidance: (v) => `فعالیت ${String(v['code'])} باید از ${date(v['plannedStart'])} شروع می‌شد و هنوز گزارشی ندارد. وضعیت را از سرپرست بپرسید.`,
    link: (v) => `/wbs/${String(v['id'])}`,
    evaluate: (facts, params) =>
      facts.leaves.flatMap((leaf): Finding[] =>
        leaf.method === 'time_based' ||
        leaf.actual > 0 ||
        leaf.hasPending ||
        leaf.workDaysSinceStart === null ||
        leaf.workDaysSinceStart <= (params['graceDays'] ?? 3)
          ? []
          : [
              {
                subjectType: 'wbs_item',
                subjectId: leaf.id,
                severity: 'warning',
                values: { id: leaf.id, code: leaf.code, plannedStart: leaf.plannedStart },
                audience: [...(leaf.supervisorUserId ? [{ userId: leaf.supervisorUserId }] : []), PM],
              },
            ],
      ),
  },
];

export const COST_RULES: RuleDef[] = [
  {
    code: 'AL-CST-01',
    name: 'مصرف بودجهٔ قلم',
    group: 'هزینه',
    severityText: 'هشدار',
    canDisable: true,
    params: [param('pct', 'از مصرف', 90, '٪', 50, 100)],
    title: (v) => `مصرف بالای ${String(v['code'])}`,
    guidance: (v) => `قلم ${String(v['code'])} ${fa(v['pct'])}٪ بودجه‌اش را مصرف کرده است. سفارش‌های باقی‌مانده را بررسی کنید یا بازنگری بودجه ثبت کنید.`,
    link: (v) => `/cbs/${String(v['id'])}`,
    evaluate: (facts, params) =>
      facts.cbsLeaves.flatMap((item): Finding[] =>
        item.consumedPercent === null || item.consumedPercent < (params['pct'] ?? 90)
          ? []
          : [
              {
                subjectType: 'cbs_item',
                subjectId: item.id,
                severity: 'warning',
                values: { id: item.id, code: item.code, pct: item.consumedPercent },
                audience: [PM, FINANCE],
              },
            ],
      ),
  },
  {
    code: 'AL-CST-02',
    name: 'پیش‌بینی قلم بیش از بودجه',
    group: 'هزینه',
    severityText: 'هشدار',
    canDisable: true,
    params: [param('tolerancePct', 'تحمل', 0, '٪', 0, 30)],
    title: (v) => `پیش‌بینی ${String(v['code'])} بیش از بودجه`,
    guidance: (v, amounts) =>
      amounts
        ? `پیش‌بینی هزینهٔ ${String(v['code'])} ${amount(v['forecast'])} و بیش از بودجه (${amount(v['budget'])}) است.`
        : `پیش‌بینی هزینهٔ ${String(v['code'])} ${fa(v['overPct'])}٪ بیش از بودجه است.`,
    link: (v) => `/cbs/${String(v['id'])}`,
    // EV قلم ≥ ۱۰٪ بودجه (پیش‌بینی معتبر)؛ تلورانس ۰ (فرض ۶)
    evaluate: (facts, params) =>
      facts.cbsLeaves.flatMap((item): Finding[] => {
        if (item.budget <= 0n || item.ev * 10n < item.budget) return [];
        const limit = Number(item.budget) * (1 + (params['tolerancePct'] ?? 0) / 100);
        if (Number(item.eac) <= limit) return [];
        return [
          {
            subjectType: 'cbs_item',
            subjectId: item.id,
            severity: 'warning',
            values: {
              id: item.id,
              code: item.code,
              forecast: item.eac.toString(),
              budget: item.budget.toString(),
              overPct: ((Number(item.eac) - Number(item.budget)) * 100) / Number(item.budget),
            },
            audience: [PM, FINANCE],
          },
        ];
      }),
  },
  {
    code: 'AL-CST-03',
    name: 'شکاف مصرف و کار',
    group: 'هزینه',
    severityText: 'هشدار / بحرانی',
    canDisable: true,
    params: [param('warn', 'هشدار از', 5, 'واحد', 1, 50), param('crit', 'بحرانی از', 10, 'واحد', 2, 80)],
    title: () => 'مصرف بودجه جلوتر از پیشرفت',
    guidance: (v) => `${fa(v['acPct'])}٪ بودجه خرج شده ولی فقط ${fa(v['evPct'])}٪ کار انجام شده است.`,
    link: () => '/charts/cost',
    evaluate: (facts, params) => {
      const p = facts.progress;
      if (!p || p.bac <= 0n) return [];
      const acPct = (Number(p.ac) * 100) / Number(p.bac);
      const evPct = (Number(p.evAtCost) * 100) / Number(p.bac);
      const gap = acPct - evPct;
      if (gap < (params['warn'] ?? 5)) return [];
      return [
        {
          subjectType: 'project',
          subjectId: facts.projectId,
          severity: gap >= (params['crit'] ?? 10) ? 'critical' : 'warning',
          values: { acPct, evPct },
          audience: [PM, FINANCE],
        },
      ];
    },
  },
  {
    code: 'AL-CST-04',
    name: 'CPI پروژه',
    group: 'هزینه',
    severityText: 'هشدار / بحرانی',
    canDisable: true,
    params: [param('warn', 'هشدار زیر', 0.95, '', 0.5, 1, 0.01), param('crit', 'بحرانی زیر', 0.9, '', 0.5, 1, 0.01)],
    title: () => 'CPI پایین پروژه',
    guidance: (v) => `CPI پروژه ${fa(v['cpi'], 2)} است؛ برای هر ریال بودجه ${fa(1 / Number(v['cpi']), 2)} ریال خرج می‌شود.`,
    link: () => '/charts/cost',
    evaluate: (facts, params) => {
      const p = facts.progress;
      if (!p || p.cpi === null || p.bac <= 0n || p.evAtCost * 20n < p.bac || p.cpi >= (params['warn'] ?? 0.95)) return [];
      return [
        {
          subjectType: 'project',
          subjectId: facts.projectId,
          severity: p.cpi < (params['crit'] ?? 0.9) ? 'critical' : 'warning',
          values: { cpi: p.cpi },
          audience: [PM, FINANCE],
        },
      ];
    },
  },
  {
    code: 'AL-CST-05',
    name: 'قدیمی بودن هزینه‌ها',
    group: 'هزینه',
    severityText: 'هشدار',
    canDisable: true,
    params: [param('staleDays', 'پس از', 14, 'روز', 3, 90)],
    title: () => 'تاریخ کامل بودن هزینه‌ها قدیمی است',
    guidance: (v) => `هزینه‌ها فقط تا ${date(v['date'])} کامل اعلام شده‌اند؛ شاخص‌های هزینه روی همان تاریخ‌اند. تاریخ کامل بودن را به‌روز کنید.`,
    link: () => '/costs',
    evaluate: (facts, params) => {
      const through = facts.costsCompleteThrough;
      const stale = through
        ? (Date.parse(`${facts.today}T00:00:00Z`) - Date.parse(`${through}T00:00:00Z`)) / 86_400_000 > (params['staleDays'] ?? 14)
        : facts.daysActive !== null && facts.daysActive > 30;
      return stale ? [{ subjectType: 'project', subjectId: facts.projectId, severity: 'warning', values: { date: through }, audience: [FINANCE, PM] }] : [];
    },
  },
];
