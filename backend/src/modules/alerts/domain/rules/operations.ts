import { amount, fa } from '../text.js';
import type { Finding, RuleDef } from '../rule-types.js';
import { param } from './progress-cost.js';

// قواعد ساختار، گزارش کارگاه، تأیید، ریسک، یکپارچه‌سازی، منابع و دوره (04-alert-engine ۳.۳–۳.۷). قواعد ریسک، AL-X-01 و
// یکپارچه‌سازی ثبت‌اند ولی تا ماژول دادهٔ خودشان چیزی برنمی‌گردانند (تصمیم 1405/08/24).

const PM = { role: 'pm' } as const;
const PLANNER = { role: 'planner' } as const;
const FINANCE = { role: 'finance' } as const;
const project = (facts: { projectId: string }) => ({ subjectType: 'project' as const, subjectId: facts.projectId });
const users = (ids: readonly string[]) => ids.map((userId) => ({ userId }));

export const STRUCTURE_RULES: RuleDef[] = [
  {
    code: 'AL-STR-01',
    name: 'فعالیت بدون CBS',
    group: 'ساختار و پیکربندی',
    severityText: 'هشدار',
    canDisable: true,
    params: [],
    title: () => 'فعالیت بدون اتصال CBS',
    guidance: (v) => `${fa(v['n'], 0)} فعالیت به CBS وصل نیست؛ بودجه و ارزش کسب‌شدهٔ آن‌ها حساب نمی‌شود.`,
    link: () => '/cbs/links?filter=unlinked',
    evaluate: (facts) => {
      const n = facts.leaves.filter((leaf) => !leaf.isMilestone && !leaf.linked).length;
      return n > 0 ? [{ ...project(facts), severity: 'warning', values: { n }, audience: [PLANNER, PM] }] : [];
    },
  },
  {
    code: 'AL-STR-02',
    name: 'بودجهٔ تخصیص‌نیافته',
    group: 'ساختار و پیکربندی',
    severityText: 'هشدار',
    canDisable: true,
    params: [],
    title: () => 'بودجهٔ CBS تخصیص‌نیافته',
    guidance: (v, amounts) =>
      amounts
        ? `${amount(v['amount'])} از بودجهٔ CBS به هیچ فعالیتی تخصیص نیافته و در BAC نیست.`
        : 'بخشی از بودجهٔ CBS به هیچ فعالیتی تخصیص نیافته و در BAC نیست.',
    link: () => '/cbs?filter=unallocated',
    evaluate: (facts) =>
      facts.progress && facts.progress.unallocatedBudget > 0n
        ? [{ ...project(facts), severity: 'warning', values: { amount: facts.progress.unallocatedBudget.toString() }, audience: [PLANNER, FINANCE] }]
        : [],
  },
  {
    code: 'AL-STR-03',
    name: 'ناهمخوانی وزن و بودجه',
    group: 'ساختار و پیکربندی',
    severityText: 'اطلاعی',
    canDisable: true,
    params: [],
    title: () => 'وزن و بودجه نمی‌خوانند',
    guidance: (v) => `وزن ${fa(v['n'], 0)} آیتم با سهم بودجه‌شان نمی‌خواند؛ پیشرفت فیزیکی و ریالی کمی فرق می‌کند.`,
    link: () => '/cbs/links',
    // اختلاف بیش از ۰٫۰۵ واحد کسری (ب14)؛ فقط وقتی وزن‌دهی «از هزینه» نیست
    evaluate: (facts) => {
      if (facts.weightGenerator === 'cost') return [];
      const n = facts.leaves.filter((leaf) => leaf.budgetShare !== null && Math.abs(leaf.weightShare - leaf.budgetShare) > 0.05).length;
      return n > 0 ? [{ ...project(facts), severity: 'info', values: { n }, audience: [PLANNER] }] : [];
    },
  },
  {
    code: 'AL-STR-04',
    name: 'فعالیت بدون سرپرست',
    group: 'ساختار و پیکربندی',
    severityText: 'هشدار',
    canDisable: true,
    params: [],
    title: () => 'فعالیت بدون سرپرست',
    guidance: (v) => `${fa(v['n'], 0)} فعالیت سرپرست ندارد و در اپ دیده نمی‌شود.`,
    link: () => '/team/assignment?filter=unassigned',
    evaluate: (facts) => {
      if (facts.daysActive === null) return [];
      const n = facts.leaves.filter((leaf) => leaf.method !== 'time_based' && !leaf.isMilestone && leaf.actual < 100 && !leaf.supervisorUserId).length;
      return n > 0 ? [{ ...project(facts), severity: 'warning', values: { n }, audience: [PM, PLANNER] }] : [];
    },
  },
  {
    code: 'AL-STR-05',
    name: 'سرپرست بدون تخصیص',
    group: 'ساختار و پیکربندی',
    severityText: 'اطلاعی',
    canDisable: true,
    params: [],
    title: (v) => `${fa(v['name'])} فعالیتی ندارد`,
    guidance: (v) => `${fa(v['name'])} فعالیتی ندارد؛ تخصیص بدهید یا از پروژه خارجش کنید.`,
    link: () => '/team/assignment',
    evaluate: (facts) =>
      facts.supervisors
        .filter((supervisor) => supervisor.openLeafCount === 0)
        .map((supervisor) => ({
          subjectType: 'user_in_project' as const,
          subjectId: supervisor.userId,
          severity: 'info' as const,
          values: { name: supervisor.name },
          audience: [PM],
        })),
  },
  {
    code: 'AL-STR-06',
    name: 'فعالیت بدون حوزهٔ تأیید',
    group: 'ساختار و پیکربندی',
    severityText: 'هشدار',
    canDisable: false,
    params: [],
    title: () => 'فعالیت بدون ناظر حوزه',
    guidance: (v) => `گزارش‌های ${fa(v['n'], 0)} فعالیت ناظر حوزه ندارند و به ${fa(v['fallback'])} می‌رسند.`,
    link: () => '/settings/workflow#routes',
    evaluate: (facts) => {
      const n = facts.leaves.filter((leaf) => leaf.method !== 'time_based' && !leaf.routed).length;
      return n > 0 ? [{ ...project(facts), severity: 'warning', values: { n, fallback: facts.fallbackApproverName }, audience: [PM] }] : [];
    },
  },
];

export const FIELD_RULES: RuleDef[] = [
  {
    code: 'AL-FLD-01',
    name: 'سرپرست بدون گزارش',
    group: 'گزارش کارگاه',
    severityText: 'هشدار / بحرانی',
    canDisable: true,
    params: [param('days', 'هشدار پس از', 2, 'روز کاری', 1, 10), param('critDays', 'بحرانی پس از', 5, 'روز کاری', 2, 20)],
    title: (v) => `${fa(v['name'])} گزارش نداده`,
    guidance: (v) => `${fa(v['name'])} ${fa(v['n'], 0)} روز کاری است گزارشی ثبت نکرده. دلیل را بپرسید.`,
    link: () => '/charts/resources',
    evaluate: (facts, params) =>
      facts.supervisors.flatMap((supervisor): Finding[] =>
        supervisor.openLeafCount === 0 || supervisor.workDaysSinceReport < (params['days'] ?? 2)
          ? []
          : [
              {
                subjectType: 'user_in_project',
                subjectId: supervisor.userId,
                severity: supervisor.workDaysSinceReport >= (params['critDays'] ?? 5) ? 'critical' : 'warning',
                values: { name: supervisor.name, n: supervisor.workDaysSinceReport },
                audience: [PM, ...users(supervisor.approvers)],
              },
            ],
      ),
  },
  {
    code: 'AL-FLD-02',
    name: 'گزارش کم‌عکس',
    group: 'گزارش کارگاه',
    severityText: 'اطلاعی',
    canDisable: true,
    params: [param('pct', 'بیش از', 30, '٪', 10, 100)],
    title: (v) => `گزارش‌های کم‌عکس ${fa(v['name'])}`,
    guidance: (v) => `${fa(v['pct'], 0)}٪ گزارش‌های ${fa(v['name'])} کمتر از حداقل عکس دارند.`,
    link: (v) => `/field-reports?supervisor=${String(v['id'])}`,
    evaluate: (facts, params) =>
      facts.supervisors.flatMap((supervisor): Finding[] => {
        const recent = supervisor.recentFlags;
        if (recent.length === 0) return [];
        const pct = (recent.filter((flags) => flags.includes('insufficient_photos')).length * 100) / recent.length;
        return pct > (params['pct'] ?? 30)
          ? [
              {
                subjectType: 'user_in_project',
                subjectId: supervisor.userId,
                severity: 'info',
                values: { id: supervisor.userId, name: supervisor.name, pct },
                audience: users(supervisor.approvers),
              },
            ]
          : [];
      }),
  },
  {
    code: 'AL-FLD-03',
    name: 'گزارش خارج از محدوده',
    group: 'گزارش کارگاه',
    severityText: 'هشدار',
    canDisable: true,
    params: [param('count', 'از ۱۰ گزارش اخیر', 3, 'مورد', 1, 10)],
    title: (v) => `گزارش‌های بیرون از کارگاه ${fa(v['name'])}`,
    guidance: (v) => `چند گزارش ${fa(v['name'])} خارج از محدودهٔ کارگاه ثبت شده است.`,
    link: () => '/field-reports?flag=gps',
    evaluate: (facts, params) =>
      facts.supervisors.flatMap((supervisor): Finding[] =>
        supervisor.recentFlags.filter((flags) => flags.includes('gps_out_of_range')).length >= (params['count'] ?? 3)
          ? [
              {
                subjectType: 'user_in_project',
                subjectId: supervisor.userId,
                severity: 'warning',
                values: { name: supervisor.name },
                audience: [PM, ...users(supervisor.approvers)],
              },
            ]
          : [],
      ),
  },
  {
    code: 'AL-FLD-04',
    name: 'گزارش ماندگار در گوشی',
    group: 'گزارش کارگاه',
    severityText: 'هشدار',
    canDisable: true,
    params: [param('hours', 'قدیمی‌تر از', 24, 'ساعت', 2, 168)],
    title: (v) => `صف گوشی ${fa(v['name'])}`,
    guidance: (v) => `${fa(v['n'], 0)} گزارش ${fa(v['name'])} در گوشی مانده؛ احتمالاً اینترنت ندارد.`,
    link: () => '/charts/resources',
    evaluate: (facts, params) =>
      facts.supervisors.flatMap((supervisor): Finding[] =>
        supervisor.queue && supervisor.queue.queuedReports > 0 && supervisor.queue.hoursOldest > (params['hours'] ?? 24)
          ? [
              {
                subjectType: 'user_in_project',
                subjectId: supervisor.userId,
                severity: 'warning',
                values: { name: supervisor.name, n: supervisor.queue.queuedReports },
                audience: [PM, ...users(supervisor.approvers)],
              },
            ]
          : [],
      ),
  },
];

export const APPROVAL_RULES: RuleDef[] = [
  {
    code: 'AL-APR-01',
    name: 'تأخیر تأیید',
    group: 'تأیید',
    severityText: 'هشدار / بحرانی (مهلت از گردش‌کار)',
    canDisable: true,
    params: [],
    title: (v) => `گزارش‌های معوق ${fa(v['name'])}`,
    guidance: (v) => `${fa(v['n'], 0)} گزارش بیش از ${fa(v['hours'], 0)} ساعت منتظر شماست؛ قدیمی‌ترین ${fa(v['oldest'], 0)} ساعت.`,
    link: () => '/field-reports?stage=mine&overdue=1',
    evaluate: (facts) =>
      facts.approvers.flatMap((approver): Finding[] => {
        if (approver.overdueCount === 0) return [];
        const critical = approver.oldestOverdueHours > 2 * facts.reviewDeadlineHours;
        return [
          {
            subjectType: 'user_in_project',
            subjectId: approver.userId,
            severity: critical ? 'critical' : 'warning',
            values: { name: approver.name, n: approver.overdueCount, hours: facts.reviewDeadlineHours, oldest: approver.oldestOverdueHours },
            audience: [{ userId: approver.userId }, ...(critical ? [PM] : [])],
          },
        ];
      }),
  },
  {
    code: 'AL-APR-02',
    name: 'گلوگاه تأیید',
    group: 'تأیید',
    severityText: 'اطلاعی / هشدار',
    canDisable: true,
    params: [],
    title: (v) => `زمان تأیید ${fa(v['name'])}`,
    guidance: (v) => `میانگین زمان تأیید ${fa(v['name'])} ${fa(v['avg'], 0)} ساعت است. یادآوری بفرستید یا حوزه را واگذار کنید.`,
    link: () => '/charts/resources',
    evaluate: (facts) =>
      facts.approvers.flatMap((approver): Finding[] => {
        if (approver.decisions14d < 5 || approver.avgDecisionHours === null || approver.avgDecisionHours <= facts.reviewDeadlineHours) return [];
        return [
          {
            subjectType: 'user_in_project',
            subjectId: approver.userId,
            severity: approver.avgDecisionHours > 1.5 * facts.reviewDeadlineHours ? 'warning' : 'info',
            values: { name: approver.name, avg: approver.avgDecisionHours },
            audience: [PM],
          },
        ];
      }),
  },
  {
    code: 'AL-APR-03',
    name: 'نیاز به تعیین تکلیف',
    group: 'تأیید',
    severityText: 'هشدار',
    canDisable: true,
    params: [],
    title: () => 'گزارش نیازمند تعیین تکلیف',
    guidance: (v) => `${fa(v['n'], 0)} گزارش برای فعالیتی ثبت شده که دیگر مال آن سرپرست نیست؛ تعیین تکلیف کنید.`,
    link: () => '/field-reports?status=needs_resolution',
    evaluate: (facts) =>
      facts.needsResolution > 0
        ? [
            {
              ...project(facts),
              severity: 'warning',
              values: { n: facts.needsResolution },
              audience: [PM, ...users(facts.approvers.map((entry) => entry.userId))],
            },
          ]
        : [],
  },
];
