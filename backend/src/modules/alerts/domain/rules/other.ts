import { date, fa } from '../text.js';
import type { Finding, RuleDef } from '../rule-types.js';
import { param } from './progress-cost.js';

// یکپارچه‌سازی (ثبت‌شده ولی معوق تا ماژول دادهٔ خودشان؛ تصمیم 1405/08/24)، منابع و دوره (04-alert-engine ۳.۷). ریسک و AL-X-01 در risk.ts (برش ۱۳ب).

const PM = { role: 'pm' } as const;
const PLANNER = { role: 'planner' } as const;
const none = (): Finding[] => [];
const project = (facts: { projectId: string }) => ({ subjectType: 'project' as const, subjectId: facts.projectId });

const deferred = (code: string, name: string, group: string, severityText: string, until: string, canDisable = true): RuleDef => ({
  code,
  name,
  group,
  severityText,
  canDisable,
  params: [],
  deferredUntil: until,
  title: () => name,
  guidance: () => name,
  link: () => '/',
  evaluate: none,
});

export const OTHER_RULES: RuleDef[] = [
  deferred('AL-INT-01', 'خطای همگام‌سازی', 'یکپارچه‌سازی', 'بحرانی', 'integrations', false),
  {
    code: 'AL-INT-02',
    name: 'تغییرات منتظر ارسال به MSP',
    group: 'یکپارچه‌سازی',
    severityText: 'اطلاعی',
    canDisable: true,
    params: [],
    title: (v) => `${fa(v['n'], 0)} تغییر منتظر ارسال به MSP`,
    guidance: (v) =>
      `${fa(v['progress'], 0)} پیشرفت تأییدشده و ${fa(v['proposals'], 0)} پیشنهاد تغییر تاریخ هنوز به MSP نرفته‌اند. از «همگام‌سازی MSP» فایل XML به‌روز را بگیرید.`,
    link: () => '/msp/sync',
    evaluate: (facts) => {
      const pending = facts.mspPending;
      const n = pending ? pending.progress + pending.proposals : 0;
      return pending && n > 0
        ? [{ ...project(facts), severity: 'info', values: { n, progress: pending.progress, proposals: pending.proposals }, audience: [PLANNER, PM] }]
        : [];
    },
  },
  {
    code: 'AL-RES-01',
    name: 'بار نامتوازن سرپرستان',
    group: 'منابع',
    severityText: 'اطلاعی',
    canDisable: true,
    params: [param('ratio', 'بیش از × میانگین', 2, 'برابر', 1.2, 5, 0.1)],
    title: (v) => `بار زیاد ${fa(v['name'])}`,
    guidance: (v) => `${fa(v['name'])} ${fa(v['n'], 0)} فعالیت دارد، بیش از دو برابر میانگین (${fa(v['avg'])}). بازتوزیع را بررسی کنید.`,
    link: () => '/team/assignment',
    evaluate: (facts, params) => {
      const active = facts.supervisors.filter((supervisor) => supervisor.openLeafCount > 0);
      if (active.length < 3) return [];
      const avg = active.reduce((sum, supervisor) => sum + supervisor.openLeafCount, 0) / active.length;
      return active
        .filter((supervisor) => supervisor.openLeafCount > (params['ratio'] ?? 2) * avg)
        .map((supervisor) => ({
          subjectType: 'user_in_project' as const,
          subjectId: supervisor.userId,
          severity: 'info' as const,
          values: { name: supervisor.name, n: supervisor.openLeafCount, avg },
          audience: [PM],
        }));
    },
  },
  {
    code: 'AL-PER-01',
    name: 'دورهٔ بسته‌نشده',
    group: 'دوره',
    severityText: 'اطلاعی',
    canDisable: true,
    params: [param('graceDays', 'پس از پایان دوره', 3, 'روز', 0, 30)],
    title: () => 'دورهٔ گزارش بسته نشده',
    guidance: (v) => `دورهٔ ${fa(v['period'])} هنوز بسته نشده است.`,
    link: () => '/settings/workflow#periods',
    evaluate: (facts, params) => {
      const overdue = facts.openPeriods.filter((period) => period.daysSinceEnd > (params['graceDays'] ?? 3));
      const oldest = overdue[0];
      return oldest ? [{ ...project(facts), severity: 'info', values: { period: oldest.label, endDate: date(oldest.endDate) }, audience: [PM, PLANNER] }] : [];
    },
  },
];
